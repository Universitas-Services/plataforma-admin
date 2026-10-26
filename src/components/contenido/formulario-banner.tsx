"use client";

import { AlertCircle, ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Dialogo } from "@/components/ui/dialogo";
import { Aviso, useAviso } from "@/components/ui/aviso";
import { NOMBRE_TONO, TONOS_BANNER, type CamposBanner } from "@/lib/contenido/tipos";
import {
  eliminarBannerAccion,
  guardarBannerAccion,
  type Respuesta,
} from "@/lib/plataforma/acciones-contenido";
import { CampoImagenRecortada, MensajeError, claseEntrada } from "./campos-medios";
import { EtiquetaVigencia, VistaBanner } from "./banner-piezas";
import { vigenciaDe } from "@/lib/contenido/vigencia";

const VACIO: CamposBanner = {
  titulo: "",
  texto: "",
  enlace: { href: "", etiqueta: "" },
  tono: "rojo",
};

const ETIQUETA: Record<string, string> = {
  titulo: "Título",
  texto: "Texto",
  "enlace-etiqueta": "Texto del botón",
  "enlace-href": "Enlace del botón",
  vigencia: "Vigencia",
  imagen: "Foto de fondo",
  "imagen-alt": "Texto alternativo de la foto",
};

const MUESTRA: Record<CamposBanner["tono"], string> = {
  rojo: "bg-marca",
  tinta: "bg-noche",
  calido: "bg-amarillo",
};

/**
 * Crear o editar un banner del carrusel (backlog 2.9): título, texto, botón, tono o foto y
 * vigencia, con la vista previa en vivo al lado. Al guardar vuelve a la lista.
 */
export function FormularioBanner({ id, inicial }: { id?: string; inicial?: CamposBanner }) {
  const [c, setC] = useState<CamposBanner>(inicial ?? VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const { aviso, mostrar, cerrar } = useAviso();
  const resumen = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (Object.keys(errores).length) resumen.current?.focus();
  }, [errores]);

  const poner = <K extends keyof CamposBanner>(k: K, v: CamposBanner[K]) =>
    setC((x) => ({ ...x, [k]: v }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const r: Respuesta = await guardarBannerAccion(id ?? null, c).catch(() => ({
      ok: false,
      mensaje: "No se pudo guardar: revisa tu conexión.",
    }));
    // Si guardó, la acción redirige; aquí solo llegan los errores.
    setEnviando(false);
    if (r.errores) setErrores(r.errores);
    else if (!r.ok) mostrar({ tipo: "error", texto: r.mensaje });
  }

  const lista = Object.entries(errores);
  const conFoto = Boolean(c.imagen?.src);
  const vigencia = vigenciaDe(c);
  const err = (k: string) => errores[k];

  return (
    <form onSubmit={enviar} noValidate className="pb-24 lg:pb-8">
      <Link
        href="/contenido/banners"
        className="mb-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-marca-texto hover:underline"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Tarjeta de transiciones
      </Link>
      <h1 className="text-[1.75rem] leading-tight font-bold">
        {id ? "Editar diapositiva" : "Nueva diapositiva"}
      </h1>
      <p className="mt-2 mb-6">
        <EtiquetaVigencia estado={vigencia} vigencia={c.vigencia} />
      </p>

      {lista.length > 0 && (
        <div
          ref={resumen}
          tabIndex={-1}
          role="alert"
          className="mb-6 flex gap-3 rounded-lg bg-peligro-suave p-4 text-sm text-tinta ring-1 ring-peligro/30 outline-none ring-inset"
        >
          <AlertCircle size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-peligro" />
          <div>
            <p className="font-semibold">
              Revisa {lista.length === 1 ? "este dato" : "estos datos"}:
            </p>
            <ul className="mt-1 list-disc pl-5">
              {lista.map(([k, t]) => (
                <li key={k}>
                  <a href={`#${k === "vigencia" ? "vigencia-desde" : k}`} className="underline">
                    {ETIQUETA[k] ?? k}
                  </a>
                  : {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="min-w-0 space-y-5">
          <Texto
            id="titulo"
            etiqueta="Título"
            max={80}
            valor={c.titulo}
            error={err("titulo")}
            onCambio={(v) => poner("titulo", v)}
          />
          <Texto
            id="texto"
            etiqueta="Texto"
            max={200}
            multilinea
            valor={c.texto}
            error={err("texto")}
            onCambio={(v) => poner("texto", v)}
          />
          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <Texto
              id="enlace-etiqueta"
              etiqueta="Texto del botón"
              max={40}
              valor={c.enlace.etiqueta}
              error={err("enlace-etiqueta")}
              onCambio={(v) => poner("enlace", { ...c.enlace, etiqueta: v })}
            />
            <div>
              <label htmlFor="enlace-href" className="mb-1.5 block text-sm font-bold text-tinta">
                Enlace del botón
              </label>
              <input
                id="enlace-href"
                type="url"
                inputMode="url"
                value={c.enlace.href}
                maxLength={500}
                placeholder="/participa o https://"
                onChange={(e) => poner("enlace", { ...c.enlace, href: e.target.value })}
                aria-invalid={err("enlace-href") ? true : undefined}
                aria-describedby={`enlace-href-ayuda${err("enlace-href") ? " enlace-href-error" : ""}`}
                className={claseEntrada(err("enlace-href"))}
              />
              <p id="enlace-href-ayuda" className="mt-1.5 text-sm text-gris">
                Una página del portal (empieza por /) o una dirección completa.
              </p>
              <MensajeError id="enlace-href" error={err("enlace-href")} />
            </div>
          </div>

          <fieldset disabled={conFoto} className="disabled:opacity-60">
            <legend className="mb-1.5 text-sm font-bold text-tinta">Tono</legend>
            <div className="flex flex-wrap gap-2">
              {TONOS_BANNER.map((t) => (
                <label
                  key={t}
                  className={`inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-control border-2 px-3 text-sm font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--marca-texto)] ${
                    c.tono === t
                      ? "border-marca text-tinta"
                      : "border-linea text-gris hover:border-tenue"
                  }`}
                >
                  <input
                    type="radio"
                    name="tono"
                    value={t}
                    checked={c.tono === t}
                    onChange={() => poner("tono", t)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`size-5 rounded-full ring-1 ring-linea ${MUESTRA[t]}`}
                  />
                  {NOMBRE_TONO[t]}
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-sm text-gris">
              {conFoto
                ? "Con foto, la diapositiva lleva el velo morado y el tono no se usa."
                : "Sin foto, la diapositiva se pinta con este tono."}
            </p>
          </fieldset>

          <CampoImagenRecortada
            id="imagen"
            etiqueta="Foto de fondo (opcional)"
            valor={c.imagen}
            onCambio={(v) => poner("imagen", v)}
            aspecto={16 / 7}
            conIlustrativa={false}
            error={err("imagen")}
            errorAlt={err("imagen-alt")}
          />

          <fieldset aria-describedby="vigencia-ayuda">
            <legend className="mb-1.5 text-sm font-bold text-tinta">Vigencia</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["desde", "hasta"] as const).map((k) => (
                <div key={k}>
                  <label
                    htmlFor={`vigencia-${k}`}
                    className="mb-1.5 block text-sm font-semibold text-tinta"
                  >
                    {k === "desde" ? "Desde" : "Hasta"}
                  </label>
                  <input
                    id={`vigencia-${k}`}
                    type="date"
                    value={c.vigencia?.[k] ?? ""}
                    onChange={(e) => {
                      poner("vigencia", { ...c.vigencia, [k]: e.target.value || undefined });
                      setErrores(({ vigencia: _, ...resto }) => resto);
                    }}
                    aria-invalid={err("vigencia") ? true : undefined}
                    className={claseEntrada(err("vigencia"))}
                  />
                </div>
              ))}
            </div>
            <p id="vigencia-ayuda" className="mt-1.5 text-sm text-gris">
              Días completos, en hora de Venezuela. Sin fechas, se muestra siempre.
            </p>
            <MensajeError id="vigencia" error={err("vigencia")} />
          </fieldset>
        </div>

        <aside aria-label="Vista previa" className="lg:sticky lg:top-20 lg:self-start">
          <p className="mb-2 text-sm font-bold text-tinta">Vista previa</p>
          <VistaBanner banner={c} />
          <p className="mt-2 text-sm text-gris">
            Así se verá en la tarjeta con transiciones del Inicio del portal.
          </p>
        </aside>
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-linea pt-6 sm:flex-row sm:items-center sm:justify-between">
        {id ? (
          <button
            type="button"
            onClick={() => setConfirmar(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 font-semibold text-tinta hover:bg-superficie"
          >
            <Trash2 size={18} aria-hidden="true" />
            Eliminar banner
          </button>
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Link
            href="/contenido/banners"
            className="inline-flex min-h-11 items-center justify-center rounded-control border border-linea px-4 font-semibold text-tinta hover:border-tenue"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={enviando}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-marca bg-marca px-5 font-semibold text-sobre-marca hover:brightness-110 disabled:opacity-70"
          >
            {enviando ? (
              <Loader2 size={18} aria-hidden="true" className="animate-spin" />
            ) : (
              <Save size={18} aria-hidden="true" />
            )}
            {id ? "Guardar cambios" : "Crear diapositiva"}
          </button>
        </div>
      </div>

      {id && (
        <Dialogo
          abierto={confirmar}
          onCerrar={() => setConfirmar(false)}
          titulo="¿Eliminar esta diapositiva?"
          descripcion={`«${c.titulo}» deja de verse en el carrusel y sale de la lista.`}
        >
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setConfirmar(false)}
              className="min-h-11 rounded-control border border-linea px-4 font-semibold text-tinta hover:border-tenue"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={async () => {
                setEnviando(true);
                const r = await eliminarBannerAccion(id);
                setEnviando(false);
                setConfirmar(false);
                if (!r.ok) mostrar({ tipo: "error", texto: r.mensaje });
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-peligro bg-peligro px-4 font-semibold text-papel hover:brightness-110 disabled:opacity-70"
            >
              Eliminar
            </button>
          </div>
        </Dialogo>
      )}
      {/* Teléfono y tableta: guardar siempre a mano, como en el editor de noticias. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-papel/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <EtiquetaVigencia estado={vigencia} vigencia={c.vigencia} />
          <button
            type="submit"
            disabled={enviando}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-control border border-marca bg-marca px-4 font-semibold text-sobre-marca hover:brightness-110 disabled:opacity-70"
          >
            <Save size={18} aria-hidden="true" />
            {id ? "Guardar" : "Crear"}
          </button>
        </div>
      </div>
      <Aviso aviso={aviso} onCerrar={cerrar} posicion="bottom-24 sm:bottom-24 lg:bottom-6" />
    </form>
  );
}

function Texto({
  id,
  etiqueta,
  max,
  valor,
  onCambio,
  error,
  multilinea,
}: {
  id: string;
  etiqueta: string;
  max: number;
  valor: string;
  onCambio: (v: string) => void;
  error?: string;
  multilinea?: boolean;
}) {
  const props = {
    id,
    value: valor,
    maxLength: max,
    onChange: (e: { target: { value: string } }) => onCambio(e.target.value),
    "aria-invalid": error ? true : undefined,
    "aria-describedby": `${id}-contador${error ? ` ${id}-error` : ""}`,
  };
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-bold text-tinta">
          {etiqueta}
        </label>
        <span id={`${id}-contador`} className="text-sm text-gris tabular-nums">
          {valor.length} / {max}
        </span>
      </div>
      {multilinea ? (
        <textarea
          {...props}
          rows={3}
          className={`${claseEntrada(error)} h-auto py-2.5 leading-relaxed`}
        />
      ) : (
        <input {...props} className={claseEntrada(error)} />
      )}
      <MensajeError id={id} error={error} />
    </div>
  );
}
