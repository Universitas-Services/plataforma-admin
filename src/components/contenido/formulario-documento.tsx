"use client";

import {
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  FilePlus2,
  FileText,
  Loader2,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Aviso, useAviso } from "@/components/ui/aviso";
import { Dialogo } from "@/components/ui/dialogo";
import { Selector } from "@/components/ui/selector";
import {
  DOC_CATEGORIAS,
  NOMBRE_DOC_ESTADO,
  DOC_ESTADOS,
  type Adjunto,
  type CamposDocumento,
  type Documento,
} from "@/lib/contenido/tipos";
import { siguienteVersion } from "@/lib/contenido/version";
import {
  crearDocumentoAccion,
  eliminarDocumentoAccion,
  guardarDocumentoAccion,
  nuevaVersionAccion,
  type Respuesta,
} from "@/lib/plataforma/acciones-contenido";
import { MensajeError, claseEntrada } from "./campos-medios";
import { EstadoDocumento, Visibilidad } from "./documento-piezas";
import { formatearFecha } from "./estado-noticia";
import { pesoLegible, revisarArchivo, subirMedio } from "./subir";
import { ZonaArchivo } from "./zona-archivo";

/*
 * Repositorio de documentos (backlog 2.9): subir un PDF con su ficha, editar la ficha, subir
 * una versión nueva (con nota y salto menor o mayor) y consultar el historial.
 */

const ETIQUETA: Record<string, string> = {
  titulo: "Título",
  descripcion: "Descripción",
  categoria: "Categoría",
  archivo: "Archivo PDF",
  nota: "Nota de la versión",
};

const fallo = (mensaje = "No se pudo guardar: revisa tu conexión."): Respuesta => ({
  ok: false,
  mensaje,
});

function ResumenErrores({ errores }: { errores: Record<string, string> }) {
  const caja = useRef<HTMLDivElement>(null);
  const lista = Object.entries(errores);
  useEffect(() => {
    if (lista.length) caja.current?.focus();
  }, [lista.length]);
  if (!lista.length) return null;
  return (
    <div
      ref={caja}
      tabIndex={-1}
      role="alert"
      className="mb-6 flex gap-3 rounded-lg bg-peligro-suave p-4 text-sm text-tinta ring-1 ring-peligro/30 outline-none ring-inset"
    >
      <AlertCircle size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-peligro" />
      <div>
        <p className="font-semibold">Revisa {lista.length === 1 ? "este dato" : "estos datos"}:</p>
        <ul className="mt-1 list-disc pl-5">
          {lista.map(([k, t]) => (
            <li key={k}>
              <a href={`#${k}`} className="underline">
                {ETIQUETA[k] ?? k}
              </a>
              : {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Ficha del documento: título, descripción, categoría, estado y visibilidad. */
function Ficha({
  c,
  poner,
  errores,
}: {
  c: CamposDocumento;
  poner: <K extends keyof CamposDocumento>(k: K, v: CamposDocumento[K]) => void;
  errores: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <label htmlFor="titulo" className="text-sm font-bold text-tinta">
            Título
          </label>
          <span id="titulo-contador" className="text-sm text-gris tabular-nums">
            {c.titulo.length} / 160
          </span>
        </div>
        <input
          id="titulo"
          value={c.titulo}
          maxLength={160}
          onChange={(e) => poner("titulo", e.target.value)}
          aria-invalid={errores.titulo ? true : undefined}
          aria-describedby={`titulo-contador${errores.titulo ? " titulo-error" : ""}`}
          className={claseEntrada(errores.titulo)}
        />
        <MensajeError id="titulo" error={errores.titulo} />
      </div>
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <label htmlFor="descripcion" className="text-sm font-bold text-tinta">
            Descripción
          </label>
          <span id="descripcion-contador" className="text-sm text-gris tabular-nums">
            {c.descripcion.length} / 500
          </span>
        </div>
        <textarea
          id="descripcion"
          value={c.descripcion}
          maxLength={500}
          rows={3}
          onChange={(e) => poner("descripcion", e.target.value)}
          aria-invalid={errores.descripcion ? true : undefined}
          aria-describedby={`descripcion-contador${errores.descripcion ? " descripcion-error" : ""}`}
          className={`${claseEntrada(errores.descripcion)} h-auto py-2.5 leading-relaxed`}
        />
        <MensajeError id="descripcion" error={errores.descripcion} />
      </div>
      <Selector
        id="categoria"
        etiqueta="Categoría"
        opciones={DOC_CATEGORIAS}
        valor={c.categoria ?? ""}
        onCambio={(v) => poner("categoria", v as CamposDocumento["categoria"])}
        error={errores.categoria}
      />
      <fieldset>
        <legend className="mb-1.5 text-sm font-bold text-tinta">Estado</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          {DOC_ESTADOS.map((e) => (
            <label key={e} className="inline-flex min-h-10 cursor-pointer items-center gap-2.5">
              <input
                type="radio"
                name="estado"
                value={e}
                checked={c.estado === e}
                onChange={() => poner("estado", e)}
                className="size-5 accent-[var(--marca)]"
              />
              {NOMBRE_DOC_ESTADO[e]}
            </label>
          ))}
        </div>
        <p className="mt-1 text-sm text-gris">
          El portal lo rotula así junto al documento. «Oficial» queda anotado en la bitácora.
        </p>
      </fieldset>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={c.publico}
          onChange={(e) => poner("publico", e.target.checked)}
          aria-describedby="publico-ayuda"
          className="mt-0.5 size-5 shrink-0 accent-[var(--marca)]"
        />
        <span>
          <span className="font-semibold text-tinta">Visible en el portal</span>
          <span id="publico-ayuda" className="block text-sm text-gris">
            Si lo desmarcas, solo lo ve el equipo.
          </span>
        </span>
      </label>
    </div>
  );
}

function TarjetaArchivo({ archivo, children }: { archivo: Adjunto; children?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-linea p-4">
      <FileText size={28} aria-hidden="true" className="shrink-0 text-marca-texto" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-tinta">{archivo.nombre}</p>
        <p className="text-sm text-gris">
          PDF · {pesoLegible(archivo.pesoBytes)} ·{" "}
          <a
            href={archivo.url}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 font-semibold text-marca-texto underline"
          >
            Abrir
            <ExternalLink size={13} aria-hidden="true" />
            <span className="sr-only">(se abre en otra pestaña)</span>
          </a>
        </p>
        {children}
      </div>
    </div>
  );
}

/** Sube un PDF con progreso y devuelve el adjunto (o el motivo del rechazo). */
function useSubidaPdf() {
  const [archivo, setArchivo] = useState<Adjunto>();
  const [progreso, setProgreso] = useState<number>();
  const [error, setError] = useState<string>();
  async function subir([f]: File[]) {
    if (!f) return;
    const motivo = revisarArchivo(f, "pdf");
    if (motivo) return setError(motivo);
    setError(undefined);
    setProgreso(0);
    const r = await subirMedio(f, "pdf", setProgreso);
    setProgreso(undefined);
    if (!r.ok) return setError(r.error);
    setArchivo({ nombre: r.nombre, url: r.url, tipo: "application/pdf", pesoBytes: r.peso });
  }
  return { archivo, setArchivo, progreso, error, subir };
}

function BotonGuardar({
  enviando,
  children,
  Icono = Save,
}: {
  enviando: boolean;
  children: ReactNode;
  Icono?: typeof Save;
}) {
  return (
    <button
      type="submit"
      disabled={enviando}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-marca bg-marca px-5 font-semibold text-sobre-marca hover:brightness-110 disabled:opacity-70"
    >
      {enviando ? (
        <Loader2 size={18} aria-hidden="true" className="animate-spin" />
      ) : (
        <Icono size={18} aria-hidden="true" />
      )}
      {children}
    </button>
  );
}

const Volver = () => (
  <Link
    href="/contenido/documentos"
    className="mb-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-marca-texto hover:underline"
  >
    <ArrowLeft size={16} aria-hidden="true" />
    Documentos
  </Link>
);

/* ---------- Subir un documento nuevo ---------- */

export function NuevoDocumento() {
  const [c, setC] = useState<CamposDocumento>({
    titulo: "",
    descripcion: "",
    categoria: undefined as unknown as CamposDocumento["categoria"],
    estado: "BORRADOR",
    publico: true,
  });
  const pdf = useSubidaPdf();
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const { aviso, mostrar, cerrar } = useAviso();
  const poner = <K extends keyof CamposDocumento>(k: K, v: CamposDocumento[K]) => {
    setC((x) => ({ ...x, [k]: v }));
    setErrores(({ [k]: _, ...resto }) => resto);
  };

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const r = await crearDocumentoAccion(c, pdf.archivo).catch(() => fallo());
    setEnviando(false);
    if (r.errores) setErrores(r.errores);
    else if (!r.ok) mostrar({ tipo: "error", texto: r.mensaje });
  }

  return (
    <form onSubmit={enviar} noValidate className="max-w-3xl pb-8">
      <Volver />
      <h1 className="mb-6 text-[1.75rem] leading-tight font-bold">Subir documento</h1>
      <ResumenErrores errores={errores} />
      <div className="space-y-6">
        <div>
          <p className="mb-1.5 text-sm font-bold text-tinta">Archivo PDF</p>
          {pdf.archivo ? (
            <TarjetaArchivo archivo={pdf.archivo}>
              <button
                type="button"
                onClick={() => pdf.setArchivo(undefined)}
                className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-control px-2 text-sm font-semibold text-tinta hover:bg-superficie"
              >
                <Trash2 size={16} aria-hidden="true" />
                Elegir otro
              </button>
            </TarjetaArchivo>
          ) : (
            <ZonaArchivo
              id="archivo"
              etiqueta="Archivo PDF"
              clase="pdf"
              onArchivos={pdf.subir}
              progreso={pdf.progreso}
              error={pdf.error ?? errores.archivo}
            />
          )}
        </div>
        <Ficha c={c} poner={poner} errores={errores} />
      </div>
      <div className="mt-8 flex flex-col-reverse gap-2 border-t border-linea pt-6 sm:flex-row sm:justify-end">
        <Link
          href="/contenido/documentos"
          className="inline-flex min-h-11 items-center justify-center rounded-control border border-linea px-4 font-semibold text-tinta hover:border-tenue"
        >
          Cancelar
        </Link>
        <BotonGuardar enviando={enviando} Icono={Upload}>
          Subir documento
        </BotonGuardar>
      </div>
      <Aviso aviso={aviso} onCerrar={cerrar} />
    </form>
  );
}

/* ---------- Ficha, versiones e historial de un documento ---------- */

export function EditarDocumento({ documento: d }: { documento: Documento }) {
  const [c, setC] = useState<CamposDocumento>({
    titulo: d.titulo,
    descripcion: d.descripcion,
    categoria: d.categoria,
    estado: d.estado,
    publico: d.publico,
  });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [dialogo, setDialogo] = useState<"version" | "eliminar">();
  const { aviso, mostrar, cerrar } = useAviso();
  const poner = <K extends keyof CamposDocumento>(k: K, v: CamposDocumento[K]) => {
    setC((x) => ({ ...x, [k]: v }));
    setErrores(({ [k]: _, ...resto }) => resto);
  };

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const r = await guardarDocumentoAccion(d.id, c).catch(() => fallo());
    setEnviando(false);
    if (r.errores) setErrores(r.errores);
    else mostrar({ tipo: r.ok ? "exito" : "error", texto: r.mensaje });
  }

  return (
    <div className="pb-8">
      <Volver />
      <h1 className="text-[1.75rem] leading-tight font-bold break-words">{d.titulo}</h1>
      <div className="mt-2 mb-6 flex flex-wrap items-center gap-x-4 gap-y-1">
        <EstadoDocumento estado={d.estado} />
        <span className="text-sm font-semibold text-tinta tabular-nums">Versión {d.version}</span>
        <Visibilidad publico={d.publico} />
      </div>
      <ResumenErrores errores={errores} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <form onSubmit={guardar} noValidate className="min-w-0">
          <h2 className="mb-4 text-lg font-bold">Ficha</h2>
          <Ficha c={c} poner={poner} errores={errores} />
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setDialogo("eliminar")}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 font-semibold text-tinta hover:bg-superficie"
            >
              <Trash2 size={18} aria-hidden="true" />
              Eliminar documento
            </button>
            <BotonGuardar enviando={enviando}>Guardar ficha</BotonGuardar>
          </div>
        </form>

        <section aria-labelledby="versiones" className="lg:sticky lg:top-20 lg:self-start">
          <div className="flex items-center justify-between gap-3">
            <h2 id="versiones" className="text-lg font-bold">
              Versiones
            </h2>
            <button
              type="button"
              onClick={() => setDialogo("version")}
              className="inline-flex min-h-10 items-center gap-2 rounded-control border border-linea px-3 text-sm font-semibold text-tinta hover:border-tenue"
            >
              <FilePlus2 size={16} aria-hidden="true" />
              Nueva versión
            </button>
          </div>
          {/* El historial como una línea: la vigente es la estación llena. */}
          <ol className="relative mt-4 space-y-4 pl-7">
            {d.versiones.map((v, i) => (
              <li key={`${v.version}-${v.fecha}`} className="relative">
                {i < d.versiones.length - 1 ? (
                  // Tramo hasta la estación anterior.
                  <span
                    aria-hidden="true"
                    className="absolute top-5 -bottom-5 -left-[1.28rem] w-[3px] bg-linea"
                  />
                ) : (
                  // La primera versión es el origen: la línea termina con su remate.
                  <span
                    aria-hidden="true"
                    className="absolute top-[1.3rem] -left-[1.28rem] h-3 w-[3px] bg-tenue after:absolute after:top-full after:-left-[0.375rem] after:h-[3px] after:w-[0.9rem] after:rounded-full after:bg-tenue"
                  />
                )}
                <span
                  aria-hidden="true"
                  className={`absolute top-1 -left-7 size-[1.125rem] rounded-full ${
                    i === 0
                      ? "border-[3px] border-papel bg-marca shadow-[0_0_0_2px_var(--marca)]"
                      : "border-[3px] border-tenue bg-papel"
                  }`}
                />
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-bold text-tinta tabular-nums">Versión {v.version}</span>
                  {i === 0 && (
                    <span className="text-sm font-semibold text-turquesa-texto">vigente</span>
                  )}
                  <span className="text-sm text-gris">{formatearFecha(v.fecha)}</span>
                </p>
                <p className="mt-0.5 text-sm text-cuerpo">{v.nota}</p>
                <a
                  href={v.archivo.url}
                  target="_blank"
                  rel="noopener"
                  className="mt-1 inline-flex min-h-8 items-center gap-1 text-sm font-semibold text-marca-texto underline"
                >
                  {v.archivo.nombre} · {pesoLegible(v.archivo.pesoBytes)}
                  <span className="sr-only">(se abre en otra pestaña)</span>
                </a>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {dialogo === "version" && (
        <DialogoVersion
          id={d.id}
          actual={d.version}
          publico={d.publico}
          onCerrar={() => setDialogo(undefined)}
          onHecho={(texto) => mostrar({ tipo: "exito", texto })}
        />
      )}
      <Dialogo
        abierto={dialogo === "eliminar"}
        onCerrar={() => setDialogo(undefined)}
        titulo="¿Eliminar este documento?"
        descripcion={`«${d.titulo}» y sus ${d.versiones.length} ${d.versiones.length === 1 ? "versión" : "versiones"} salen del repositorio y del portal.`}
      >
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setDialogo(undefined)}
            className="min-h-11 rounded-control border border-linea px-4 font-semibold text-tinta hover:border-tenue"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={enviando}
            onClick={async () => {
              setEnviando(true);
              const r = await eliminarDocumentoAccion(d.id).catch(() => fallo());
              setEnviando(false);
              setDialogo(undefined);
              if (!r.ok) mostrar({ tipo: "error", texto: r.mensaje });
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-peligro bg-peligro px-4 font-semibold text-papel hover:brightness-110 disabled:opacity-70"
          >
            Eliminar
          </button>
        </div>
      </Dialogo>
      <Aviso aviso={aviso} onCerrar={cerrar} />
    </div>
  );
}

/** Se monta al abrirse: cada vez empieza vacío. */
function DialogoVersion({
  id,
  actual,
  publico,
  onCerrar,
  onHecho,
}: {
  id: string;
  actual: string;
  publico: boolean;
  onCerrar: () => void;
  onHecho: (texto: string) => void;
}) {
  const pdf = useSubidaPdf();
  const [nota, setNota] = useState("");
  const [tipo, setTipo] = useState<"menor" | "mayor">("menor");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const r = await nuevaVersionAccion(id, pdf.archivo, { nota, tipo }).catch(() => fallo());
    setEnviando(false);
    if (r.ok) {
      onHecho(r.mensaje);
      onCerrar();
    } else setErrores(r.errores ?? { archivo: r.mensaje });
  }

  return (
    <Dialogo
      abierto
      onCerrar={onCerrar}
      titulo="Nueva versión"
      descripcion={`Reemplaza al PDF vigente (versión ${actual}); el anterior queda en el historial.`}
      ancho="max-w-lg"
    >
      <form onSubmit={enviar} noValidate className="mt-4 space-y-4">
        {pdf.archivo ? (
          <TarjetaArchivo archivo={pdf.archivo} />
        ) : (
          <ZonaArchivo
            id="archivo"
            etiqueta="PDF de la nueva versión"
            clase="pdf"
            compacta
            onArchivos={pdf.subir}
            progreso={pdf.progreso}
            error={pdf.error ?? errores.archivo}
          />
        )}
        <fieldset>
          <legend className="mb-1.5 text-sm font-bold text-tinta">Tipo de cambio</legend>
          {(["menor", "mayor"] as const).map((t) => (
            <label key={t} className="flex min-h-10 cursor-pointer items-center gap-2.5">
              <input
                type="radio"
                name="tipo"
                value={t}
                checked={tipo === t}
                onChange={() => setTipo(t)}
                className="size-5 accent-[var(--marca)]"
              />
              <span>
                {t === "menor" ? "Corrección o ajuste" : "Cambio de fondo"}{" "}
                <span className="font-semibold text-tinta tabular-nums">
                  ({actual} → {siguienteVersion(actual, t)})
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        <div>
          <label htmlFor="nota" className="mb-1.5 block text-sm font-bold text-tinta">
            Nota de la versión
          </label>
          <textarea
            id="nota"
            value={nota}
            maxLength={300}
            rows={2}
            onChange={(e) => {
              setNota(e.target.value);
              setErrores(({ nota: _, ...resto }) => resto);
            }}
            aria-invalid={errores.nota ? true : undefined}
            aria-describedby={`nota-ayuda${errores.nota ? " nota-error" : ""}`}
            className={`${claseEntrada(errores.nota)} h-auto py-2.5`}
          />
          <p id="nota-ayuda" className="mt-1.5 text-sm text-gris">
            Qué cambió, en una frase.{" "}
            {publico
              ? "Se ve en el historial del portal."
              : "Queda en el historial; solo lo ve el equipo."}
          </p>
          <MensajeError id="nota" error={errores.nota} />
        </div>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCerrar}
            className="min-h-11 rounded-control border border-linea px-4 font-semibold text-tinta hover:border-tenue"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando || pdf.progreso !== undefined}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-marca bg-marca px-4 font-semibold text-sobre-marca hover:brightness-110 disabled:opacity-70"
          >
            {enviando ? (
              <Loader2 size={18} aria-hidden="true" className="animate-spin" />
            ) : (
              <Upload size={18} aria-hidden="true" />
            )}
            {publico ? "Publicar" : "Subir"} versión {siguienteVersion(actual, tipo)}
          </button>
        </div>
      </form>
    </Dialogo>
  );
}
