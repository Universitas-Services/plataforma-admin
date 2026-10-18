"use client";

import Image from "@tiptap/extension-image";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Redo2,
  Undo2,
  Unlink,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { Dialogo } from "@/components/ui/dialogo";
import { enlaceSeguro } from "@/lib/contenido/sanear";
import { revisarArchivo, subirMedio } from "./subir";
import { ZonaArchivo } from "./zona-archivo";

/*
 * Cuerpo de la noticia con Tiptap (backlog 2.9): párrafos, títulos 2 y 3, negrita, cursiva,
 * listas, cita, enlaces e imágenes. Solo lo que el portal sabe mostrar; el servidor sanea el
 * HTML igual (sanear.ts). La barra sigue el patrón «toolbar» de WAI-ARIA: un solo tabulador
 * entra en ella y las flechas recorren los botones.
 */

type Boton = {
  clave: string;
  etiqueta: string;
  Icono: LucideIcon;
  activo?: (e: Editor) => boolean;
  accion: (e: Editor) => void;
};

const BOTONES: (Boton | "separador")[] = [
  {
    clave: "parrafo",
    etiqueta: "Párrafo",
    Icono: Pilcrow,
    activo: (e) => e.isActive("paragraph"),
    accion: (e) => e.chain().focus().setParagraph().run(),
  },
  {
    clave: "h2",
    etiqueta: "Encabezado",
    Icono: Heading2,
    activo: (e) => e.isActive("heading", { level: 2 }),
    accion: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    clave: "h3",
    etiqueta: "Subencabezado",
    Icono: Heading3,
    activo: (e) => e.isActive("heading", { level: 3 }),
    accion: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  "separador",
  {
    clave: "negrita",
    etiqueta: "Negrita",
    Icono: Bold,
    activo: (e) => e.isActive("bold"),
    accion: (e) => e.chain().focus().toggleBold().run(),
  },
  {
    clave: "cursiva",
    etiqueta: "Cursiva",
    Icono: Italic,
    activo: (e) => e.isActive("italic"),
    accion: (e) => e.chain().focus().toggleItalic().run(),
  },
  "separador",
  {
    clave: "lista",
    etiqueta: "Lista con viñetas",
    Icono: List,
    activo: (e) => e.isActive("bulletList"),
    accion: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    clave: "numerada",
    etiqueta: "Lista numerada",
    Icono: ListOrdered,
    activo: (e) => e.isActive("orderedList"),
    accion: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    clave: "cita",
    etiqueta: "Cita",
    Icono: Quote,
    activo: (e) => e.isActive("blockquote"),
    accion: (e) => e.chain().focus().toggleBlockquote().run(),
  },
];

export function EditorTexto({
  id,
  etiquetaId,
  ayudaId,
  valor,
  onCambio,
  error,
}: {
  id: string;
  etiquetaId: string;
  ayudaId?: string;
  valor: string;
  onCambio: (html: string) => void;
  error?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        strike: false,
        underline: false,
        horizontalRule: false,
        link: {
          openOnClick: false,
          autolink: true,
          protocols: ["http", "https", "mailto"],
          HTMLAttributes: { rel: "noopener noreferrer", target: null },
        },
      }),
      Image.configure({ inline: false }),
    ],
    content: valor,
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": etiquetaId,
        ...(ayudaId || error
          ? { "aria-describedby": [ayudaId, error && `${id}-error`].filter(Boolean).join(" ") }
          : {}),
        ...(error ? { "aria-invalid": "true" } : {}),
        class: "cuerpo-noticia min-h-64 px-4 py-3 outline-none",
      },
    },
    onUpdate: ({ editor }) => onCambio(editor.isEmpty ? "" : editor.getHTML()),
  });

  const estado = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            activos: Object.fromEntries(
              BOTONES.filter((b) => b !== "separador").map((b) => [
                b.clave,
                b.activo?.(e) ?? false,
              ]),
            ),
            enlace: e.isActive("link"),
            deshacer: e.can().undo(),
            rehacer: e.can().redo(),
          }
        : undefined,
  });

  const [dialogo, setDialogo] = useState<"enlace" | "imagen">();
  const barra = useRef<HTMLDivElement>(null);
  const [foco, setFoco] = useState(0);

  // Flechas, Inicio y Fin dentro de la barra (tabindex itinerante).
  function teclas(e: KeyboardEvent) {
    const botones = [...(barra.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    const i = botones.indexOf(document.activeElement as HTMLButtonElement);
    const siguiente =
      e.key === "ArrowRight"
        ? (i + 1) % botones.length
        : e.key === "ArrowLeft"
          ? (i - 1 + botones.length) % botones.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? botones.length - 1
              : -1;
    if (siguiente < 0) return;
    e.preventDefault();
    setFoco(siguiente);
    botones[siguiente]?.focus();
  }

  let n = -1;
  const boton = (b: Boton) => {
    n++;
    const indice = n;
    const activo = estado?.activos[b.clave];
    return (
      <button
        key={b.clave}
        type="button"
        tabIndex={foco === indice ? 0 : -1}
        aria-pressed={b.activo ? Boolean(activo) : undefined}
        aria-label={b.etiqueta}
        title={b.etiqueta}
        disabled={!editor}
        onClick={() => {
          setFoco(indice);
          if (editor) b.accion(editor);
        }}
        className={`grid size-10 shrink-0 place-items-center rounded-control transition-colors ${
          activo ? "bg-tinta text-papel" : "text-tinta hover:bg-papel"
        }`}
      >
        <b.Icono size={18} aria-hidden="true" />
      </button>
    );
  };

  return (
    <div
      className={`overflow-hidden rounded-control border bg-papel focus-within:border-marca-texto ${
        error ? "border-peligro" : "border-linea"
      }`}
    >
      <div
        ref={barra}
        role="toolbar"
        aria-label="Formato del texto"
        aria-controls={id}
        onKeyDown={teclas}
        className="flex flex-wrap items-center gap-0.5 border-b border-linea bg-superficie p-1"
      >
        {BOTONES.map((b, i) =>
          b === "separador" ? (
            <span key={`s${i}`} aria-hidden="true" className="mx-1 h-6 w-px bg-linea" />
          ) : (
            boton(b)
          ),
        )}
        <span aria-hidden="true" className="mx-1 h-6 w-px bg-linea" />
        {boton({
          clave: "enlace",
          etiqueta: estado?.enlace ? "Editar el enlace" : "Enlace",
          Icono: Link2,
          activo: (e) => e.isActive("link"),
          accion: () => setDialogo("enlace"),
        })}
        {estado?.enlace &&
          boton({
            clave: "quitarEnlace",
            etiqueta: "Quitar el enlace",
            Icono: Unlink,
            accion: (e) => e.chain().focus().extendMarkRange("link").unsetLink().run(),
          })}
        {boton({
          clave: "imagen",
          etiqueta: "Insertar imagen",
          Icono: ImagePlus,
          accion: () => setDialogo("imagen"),
        })}
        <span aria-hidden="true" className="mx-1 h-6 w-px bg-linea" />
        {boton({
          clave: "deshacer",
          etiqueta: "Deshacer",
          Icono: Undo2,
          accion: (e) => e.chain().focus().undo().run(),
        })}
        {boton({
          clave: "rehacer",
          etiqueta: "Rehacer",
          Icono: Redo2,
          accion: (e) => e.chain().focus().redo().run(),
        })}
      </div>
      {editor ? (
        <EditorContent editor={editor} />
      ) : (
        <div aria-hidden="true" className="min-h-64 px-4 py-3">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton mt-3 h-4 w-2/3 rounded" />
        </div>
      )}
      {editor && (
        <>
          <DialogoEnlace
            abierto={dialogo === "enlace"}
            onCerrar={() => setDialogo(undefined)}
            editor={editor}
          />
          <DialogoImagen
            abierto={dialogo === "imagen"}
            onCerrar={() => setDialogo(undefined)}
            editor={editor}
          />
        </>
      )}
    </div>
  );
}

const claseEntrada =
  "h-11 w-full rounded-control border border-linea bg-papel px-3 text-tinta outline-none hover:border-tenue focus-visible:border-marca-texto";

function BotonesDialogo({ onCancelar, texto }: { onCancelar: () => void; texto: string }) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancelar}
        className="min-h-11 rounded-control border border-linea px-4 font-semibold text-tinta hover:border-tenue"
      >
        Cancelar
      </button>
      <button
        type="submit"
        className="min-h-11 rounded-control border border-marca bg-marca px-4 font-semibold text-sobre-marca hover:brightness-110"
      >
        {texto}
      </button>
    </div>
  );
}

function DialogoEnlace({
  abierto,
  onCerrar,
  editor,
}: {
  abierto: boolean;
  onCerrar: () => void;
  editor: Editor;
}) {
  const [error, setError] = useState<string>();
  const actual = (editor.getAttributes("link").href as string | undefined) ?? "";
  return (
    <Dialogo
      abierto={abierto}
      onCerrar={() => {
        setError(undefined);
        onCerrar();
      }}
      titulo="Enlace"
      descripcion="Selecciona el texto antes de abrir este cuadro; si no hay selección, se usará el propio enlace como texto."
    >
      <form
        key={String(abierto)}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const v = String(new FormData(e.currentTarget).get("href") ?? "").trim();
          const href = enlaceSeguro(v);
          if (!href) return setError("Escribe un enlace que empiece por https://, mailto: o /.");
          const cadena = editor.chain().focus().extendMarkRange("link");
          if (editor.state.selection.empty && !editor.isActive("link"))
            cadena
              .insertContent({ type: "text", text: v, marks: [{ type: "link", attrs: { href } }] })
              .run();
          else cadena.setLink({ href }).run();
          setError(undefined);
          onCerrar();
        }}
        className="mt-4"
      >
        <label htmlFor="enlace-href" className="mb-1.5 block text-sm font-bold text-tinta">
          Dirección
        </label>
        <input
          id="enlace-href"
          name="href"
          type="url"
          inputMode="url"
          defaultValue={actual}
          placeholder="https://"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "enlace-href-error" : undefined}
          className={claseEntrada}
        />
        {error && (
          <p id="enlace-href-error" className="mt-1.5 text-sm text-peligro">
            {error}
          </p>
        )}
        <BotonesDialogo onCancelar={onCerrar} texto="Aplicar el enlace" />
      </form>
    </Dialogo>
  );
}

function DialogoImagen({
  abierto,
  onCerrar,
  editor,
}: {
  abierto: boolean;
  onCerrar: () => void;
  editor: Editor;
}) {
  const [subida, setSubida] = useState<{ url: string; vista: string }>();
  const [progreso, setProgreso] = useState<number>();
  const [error, setError] = useState<string>();
  const [errorAlt, setErrorAlt] = useState<string>();

  function cerrar() {
    if (subida) URL.revokeObjectURL(subida.vista);
    setSubida(undefined);
    setError(undefined);
    setErrorAlt(undefined);
    onCerrar();
  }

  async function tomar([f]: File[]) {
    if (!f) return;
    const motivo = revisarArchivo(f, "imagen");
    if (motivo) return setError(motivo);
    setError(undefined);
    setProgreso(0);
    const r = await subirMedio(f, "imagen", setProgreso);
    setProgreso(undefined);
    if (!r.ok) return setError(r.error);
    setSubida({ url: r.url, vista: URL.createObjectURL(f) });
  }

  return (
    <Dialogo
      abierto={abierto}
      onCerrar={cerrar}
      titulo="Insertar imagen"
      descripcion="La imagen queda dentro del texto, a todo el ancho."
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!subida) return setError("Elige la imagen.");
          const alt = String(new FormData(e.currentTarget).get("alt") ?? "").trim();
          if (!alt) return setErrorAlt("Describe lo que muestra la imagen.");
          editor.chain().focus().setImage({ src: subida.url, alt }).run();
          cerrar();
        }}
        className="mt-4 space-y-4"
      >
        {subida ? (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa local
          <img src={subida.vista} alt="" className="max-h-48 w-full rounded-md object-contain" />
        ) : (
          <ZonaArchivo
            id="imagen-cuerpo"
            etiqueta="Imagen"
            clase="imagen"
            compacta
            onArchivos={tomar}
            error={error}
            progreso={progreso}
          />
        )}
        <div>
          <label htmlFor="imagen-alt" className="mb-1.5 block text-sm font-bold text-tinta">
            Texto alternativo
          </label>
          <input
            id="imagen-alt"
            name="alt"
            maxLength={250}
            aria-invalid={errorAlt ? true : undefined}
            aria-describedby={`imagen-alt-ayuda${errorAlt ? " imagen-alt-error" : ""}`}
            className={claseEntrada}
            onChange={() => setErrorAlt(undefined)}
          />
          <p id="imagen-alt-ayuda" className="mt-1.5 text-sm text-gris">
            Lo que muestra la imagen, para quien no puede verla.
          </p>
          {errorAlt && (
            <p id="imagen-alt-error" className="mt-1.5 text-sm text-peligro">
              {errorAlt}
            </p>
          )}
        </div>
        <BotonesDialogo onCancelar={cerrar} texto="Insertar" />
      </form>
    </Dialogo>
  );
}
