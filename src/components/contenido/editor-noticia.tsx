"use client";

import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  Eye,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
  Undo2,
  EyeOff,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Selector } from "@/components/ui/selector";
import { SelectorFecha } from "@/components/ui/selector-fecha";
import { Dialogo } from "@/components/ui/dialogo";
import { Aviso, useAviso } from "@/components/ui/aviso";
import {
  cambiarEstadoAccion,
  guardarNoticiaAccion,
  type RespuestaEditor,
} from "@/lib/plataforma/acciones-contenido";
import {
  CATEGORIAS,
  FORMATOS,
  NOMBRE_FORMATO,
  NOMBRE_TIPO,
  TIPOS_NOTICIA,
  type CamposNoticia,
  type EstadoNoticia,
  type Noticia,
} from "@/lib/contenido/tipos";
import type { CambioEstado } from "@/lib/plataforma/contenido";
import {
  CampoDocumento,
  CampoGaleria,
  CampoImagenRecortada,
  CampoVideo,
  MensajeError,
  claseEntrada,
} from "./campos-medios";
import { EditorTexto } from "./editor-texto";
import { EstadoNoticiaEtiqueta, ICONO_FORMATO, formatearFecha } from "./estado-noticia";
import { VistaPreviaNoticia } from "./vista-previa-noticia";

/*
 * Editor de una noticia (backlog 2.9). Un borrador se guarda solo cada 30 s y al salir de un
 * campo; una noticia publicada o programada se guarda a mano («Guardar cambios») porque lo que
 * se guarda ya es lo que ve la ciudadanía. Publicar y programar piden confirmación.
 */

const AUTOGUARDADO_MS = 30_000;
const MAX_TITULO = 160;
const MAX_RESUMEN = 300;

const ETIQUETA_CAMPO: Record<string, string> = {
  titulo: "Título",
  resumen: "Resumen",
  categoria: "Categoría",
  portada: "Portada",
  cuerpo: "Cuerpo",
  imagenes: "Imágenes de la galería",
  adjunto: "Documento",
  video: "Video",
  boton: "Botón",
  puntos: "Puntos de análisis",
  publicarEl: "Fecha de publicación",
};

/** Ancla de cada campo para los enlaces del resumen de errores. */
const ANCLA: Record<string, string> = {
  portada: "portada",
  cuerpo: "cuerpo",
  imagenes: "imagenes",
  adjunto: "adjunto",
  video: "video",
  boton: "boton-texto",
  puntos: "puntos-titulo",
};

const camposDe = (n: Noticia): CamposNoticia => ({
  tipo: n.tipo,
  formato: n.formato,
  titulo: n.titulo,
  resumen: n.resumen,
  categoria: n.categoria,
  parroquia: n.parroquia,
  portada: n.portada,
  cuerpo: n.cuerpo,
  imagenes: n.imagenes,
  adjunto: n.adjunto,
  video: n.video,
  puntos: n.puntos,
  boton: n.boton,
  destacada: n.destacada,
});

/** La fecha y hora del campo se interpretan en Venezuela (UTC−4, sin horario de verano). */
const aIsoCaracas = (local: string) => `${local}:00-04:00`;
const ahoraLocalCaracas = (masMin = 0) =>
  new Date(Date.now() - 4 * 3_600_000 + masMin * 60_000).toISOString().slice(0, 16);

/** Horas de la publicación programada, cada 30 minutos; la ya elegida se conserva aunque no caiga en punto. */
function opcionesHora(actual: string) {
  const horas = Array.from(
    { length: 48 },
    (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
  );
  if (/^\d{2}:\d{2}$/.test(actual) && !horas.includes(actual)) horas.push(actual);
  return horas.sort().map((h) => {
    const [hh, mm] = h.split(":").map(Number) as [number, number];
    return {
      valor: h,
      texto: `${hh % 12 || 12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "a. m." : "p. m."}`,
    };
  });
}

type Guardado = { estado: "guardado" | "pendiente" | "guardando" | "error"; en?: string };

export function EditorNoticia({ noticia }: { noticia: Noticia }) {
  const [campos, setCampos] = useState<CamposNoticia>(() => camposDe(noticia));
  const [estado, setEstado] = useState<EstadoNoticia>(noticia.estado);
  const [publicarEl, setPublicarEl] = useState(noticia.publicarEl);
  const [guardado, setGuardado] = useState<Guardado>({
    estado: "guardado",
    en: noticia.actualizadoEl,
  });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [dialogo, setDialogo] = useState<CambioEstado | "vista">();
  const [ocupado, setOcupado] = useState(false);
  const { aviso, mostrar, cerrar } = useAviso();
  const resumenErrores = useRef<HTMLDivElement>(null);

  // Versión de lo escrito: si cambia durante un guardado, sigue pendiente.
  const version = useRef(0);
  const guardadaVersion = useRef(0);
  const enCurso = useRef<Promise<RespuestaEditor> | null>(null);
  const ultimo = useRef(campos);
  useEffect(() => {
    ultimo.current = campos;
  }, [campos]);

  const conAutoguardado = estado === "BORRADOR" || estado === "DESPUBLICADO";
  const sucio = guardado.estado === "pendiente" || guardado.estado === "error";

  const cambiar = useCallback(<K extends keyof CamposNoticia>(k: K, v: CamposNoticia[K]) => {
    version.current++;
    setCampos((c) => ({ ...c, [k]: v }));
    setGuardado((g) => (g.estado === "guardando" ? g : { ...g, estado: "pendiente" }));
    setErrores((e) => {
      if (!e[k as string]) return e;
      const { [k as string]: _, ...resto } = e;
      return resto;
    });
  }, []);

  const guardar = useCallback(
    async (manual = false): Promise<RespuestaEditor | undefined> => {
      if (enCurso.current) await enCurso.current;
      if (guardadaVersion.current === version.current && !manual) return undefined;
      const v = version.current;
      setGuardado((g) => ({ ...g, estado: "guardando" }));
      const p = guardarNoticiaAccion(noticia.id, ultimo.current);
      enCurso.current = p;
      let r: RespuestaEditor;
      try {
        r = await p;
      } catch {
        r = { ok: false, mensaje: "No se pudo guardar: revisa tu conexión." };
      } finally {
        enCurso.current = null;
      }
      if (r.ok) {
        guardadaVersion.current = v;
        setGuardado({
          estado: version.current === v ? "guardado" : "pendiente",
          en: r.actualizadoEl,
        });
        if (manual) mostrar({ tipo: "exito", texto: "Cambios guardados." });
      } else {
        setGuardado((g) => ({ ...g, estado: "error" }));
        if (r.errores) setErrores(r.errores);
        // Con errores por campo ya habla el resumen de arriba: sin toast que lo repita.
        if (manual && !r.errores) mostrar({ tipo: "error", texto: r.mensaje });
      }
      return r;
    },
    [noticia.id, mostrar],
  );

  // Autoguardado cada 30 s mientras sea borrador.
  useEffect(() => {
    if (!conAutoguardado) return;
    const t = setInterval(() => {
      if (version.current !== guardadaVersion.current) void guardar();
    }, AUTOGUARDADO_MS);
    return () => clearInterval(t);
  }, [conAutoguardado, guardar]);

  // Aviso del navegador al salir con cambios sin guardar.
  useEffect(() => {
    if (!sucio) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sucio]);

  useEffect(() => {
    if (Object.keys(errores).length) resumenErrores.current?.focus();
  }, [errores]);

  async function cambiarEstado(cambio: CambioEstado, fecha?: string) {
    setOcupado(true);
    try {
      // Lo último escrito va primero: se publica lo que se ve en pantalla.
      if (cambio !== "eliminar" && version.current !== guardadaVersion.current) {
        const g = await guardar();
        if (g && !g.ok) return;
      }
      const r = await cambiarEstadoAccion(noticia.id, cambio, fecha);
      if (r.ok) {
        setEstado(r.estado as EstadoNoticia);
        setPublicarEl(cambio === "programar" ? fecha && new Date(fecha).toISOString() : undefined);
        setGuardado({ estado: "guardado", en: r.actualizadoEl });
        setErrores({});
        setDialogo(undefined);
        if (r.mensaje) mostrar({ tipo: "exito", texto: r.mensaje });
      } else {
        if (r.errores) setErrores(r.errores);
        if (!r.errores?.publicarEl) setDialogo(undefined);
        if (!r.errores) mostrar({ tipo: "error", texto: r.mensaje });
      }
    } finally {
      setOcupado(false);
    }
  }

  const listaErrores = Object.entries(errores).filter(([k]) => k !== "publicarEl");
  const f = campos.formato;

  return (
    <div onBlur={() => conAutoguardado && void guardar()} className="pb-24 lg:pb-0">
      <div className="mb-6">
        <Link
          href="/contenido/noticias"
          className="mb-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-marca-texto hover:underline"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Noticias
        </Link>
        <h1 className="text-[1.75rem] leading-tight font-bold break-words">
          {campos.titulo.trim() || "Noticia sin título"}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <EstadoNoticiaEtiqueta estado={estado} publicarEl={publicarEl} />
          <EstadoGuardado guardado={guardado} automatico={conAutoguardado} />
        </div>
      </div>

      {listaErrores.length > 0 && (
        <div
          ref={resumenErrores}
          tabIndex={-1}
          role="alert"
          className="mb-6 flex gap-3 rounded-lg bg-peligro-suave p-4 text-sm text-tinta ring-1 ring-peligro/30 outline-none ring-inset"
        >
          <AlertCircle size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-peligro" />
          <div>
            <p className="font-semibold">
              {estado === "PUBLICADO" || estado === "PROGRAMADO"
                ? "Para guardar, completa:"
                : "Para publicar o programar, falta:"}
            </p>
            <ul className="mt-1 list-disc pl-5">
              {listaErrores.map(([k, texto]) => (
                <li key={k}>
                  <a href={`#${ANCLA[k] ?? k}`} className="underline">
                    {ETIQUETA_CAMPO[k] ?? k}
                  </a>
                  : {texto}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-8">
          <Seccion titulo="Formato" id="sec-formato">
            <fieldset>
              <legend className="sr-only">Formato de la noticia</legend>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {FORMATOS.map((x) => {
                  const Icono = ICONO_FORMATO[x];
                  const on = f === x;
                  return (
                    <label
                      key={x}
                      className={`flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 px-2 py-2 text-sm font-semibold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--marca-texto)] ${
                        on
                          ? "border-marca bg-marca-suave text-tinta"
                          : "border-linea text-gris hover:border-tenue hover:text-tinta"
                      }`}
                    >
                      <input
                        type="radio"
                        name="formato"
                        value={x}
                        checked={on}
                        onChange={() => cambiar("formato", x)}
                        className="sr-only"
                      />
                      <Icono size={20} aria-hidden="true" />
                      {NOMBRE_FORMATO[x]}
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 text-sm text-gris">{AYUDA_FORMATO[f]}</p>
            </fieldset>
          </Seccion>

          <Seccion titulo="Datos" id="sec-datos">
            <div className="space-y-5">
              <fieldset>
                <legend className="mb-1.5 text-sm font-bold text-tinta">Tipo</legend>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  {TIPOS_NOTICIA.map((t) => (
                    <label
                      key={t}
                      className="inline-flex min-h-10 cursor-pointer items-center gap-2.5"
                    >
                      <input
                        type="radio"
                        name="tipo"
                        value={t}
                        checked={campos.tipo === t}
                        onChange={() => cambiar("tipo", t)}
                        className="size-5 accent-[var(--marca)]"
                      />
                      {NOMBRE_TIPO[t]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <CampoTexto
                id="titulo"
                etiqueta="Título"
                valor={campos.titulo}
                max={MAX_TITULO}
                onCambio={(v) => cambiar("titulo", v)}
                error={errores.titulo}
              />
              <CampoTexto
                id="resumen"
                etiqueta="Resumen"
                ayuda="Una o dos frases: es lo que se lee en el listado y al compartir."
                valor={campos.resumen}
                max={MAX_RESUMEN}
                multilinea
                onCambio={(v) => cambiar("resumen", v)}
                error={errores.resumen}
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <Selector
                  id="categoria"
                  etiqueta="Categoría"
                  opciones={CATEGORIAS}
                  valor={campos.categoria ?? ""}
                  onCambio={(v) =>
                    cambiar("categoria", (v || undefined) as CamposNoticia["categoria"])
                  }
                  error={errores.categoria}
                />
                <div>
                  <label htmlFor="parroquia" className="mb-1.5 block text-sm font-bold text-tinta">
                    Parroquia <span className="font-normal text-gris">(opcional)</span>
                  </label>
                  <input
                    id="parroquia"
                    value={campos.parroquia ?? ""}
                    maxLength={80}
                    onChange={(e) => cambiar("parroquia", e.target.value)}
                    className={claseEntrada()}
                  />
                </div>
              </div>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={campos.destacada}
                  onChange={(e) => cambiar("destacada", e.target.checked)}
                  aria-describedby="destacada-ayuda"
                  className="mt-0.5 size-5 shrink-0 accent-[var(--marca)]"
                />
                <span>
                  <span className="font-semibold text-tinta">Destacada en portada</span>
                  <span id="destacada-ayuda" className="block text-sm text-gris">
                    El inicio del portal la muestra antes que las demás.
                  </span>
                </span>
              </label>
            </div>
          </Seccion>

          {/* En video, la portada es la del propio video (también la de la tarjeta). */}
          {f !== "VIDEO" && (
            <Seccion
              titulo={f === "IMAGEN" ? "Imagen" : "Portada"}
              detalle={f === "IMAGEN" ? undefined : "Opcional: también es la imagen de la tarjeta."}
              id="sec-portada"
            >
              <CampoImagenRecortada
                id="portada"
                etiqueta={f === "IMAGEN" ? "Imagen principal" : "Imagen de portada"}
                valor={campos.portada}
                onCambio={(v) => cambiar("portada", v)}
                error={errores.portada && !campos.portada ? errores.portada : undefined}
                errorAlt={errores.portada && campos.portada ? errores.portada : undefined}
              />
            </Seccion>
          )}

          {f === "GALERIA" && (
            <Seccion titulo="Galería" id="sec-galeria">
              <CampoGaleria
                imagenes={campos.imagenes}
                onCambio={(v) => cambiar("imagenes", v)}
                error={errores.imagenes}
              />
            </Seccion>
          )}
          {f === "DOCUMENTO" && (
            <Seccion titulo="Documento" id="sec-documento">
              <CampoDocumento
                valor={campos.adjunto}
                onCambio={(v) => cambiar("adjunto", v)}
                error={errores.adjunto}
              />
            </Seccion>
          )}
          {f === "VIDEO" && (
            <Seccion titulo="Video" id="sec-video">
              <CampoVideo
                valor={campos.video}
                onCambio={(v) => cambiar("video", v)}
                error={errores.video}
              />
            </Seccion>
          )}

          <Seccion
            titulo="Cuerpo"
            detalle={f === "TEXTO" ? undefined : "Opcional en este formato."}
            id="sec-cuerpo"
          >
            <p id="cuerpo-etiqueta" className="sr-only">
              Cuerpo de la noticia
            </p>
            <EditorTexto
              id="cuerpo"
              etiquetaId="cuerpo-etiqueta"
              valor={campos.cuerpo}
              onCambio={(v) => cambiar("cuerpo", v)}
              error={errores.cuerpo}
            />
            <MensajeError id="cuerpo" error={errores.cuerpo} />
          </Seccion>

          <PuntosAnalisis valor={campos.puntos} onCambio={(v) => cambiar("puntos", v)} />
          <BotonFinal
            valor={campos.boton}
            onCambio={(v) => cambiar("boton", v)}
            error={errores.boton}
          />
        </div>

        <aside aria-label="Publicación" className="lg:sticky lg:top-20 lg:self-start">
          <PanelPublicacion
            estado={estado}
            publicarEl={publicarEl}
            noticia={noticia}
            ocupado={ocupado}
            sucio={sucio}
            guardando={guardado.estado === "guardando"}
            onGuardar={() => void guardar(true)}
            onDialogo={setDialogo}
          />
        </aside>
      </div>

      {/* Teléfono y tableta: la acción principal siempre a mano. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-papel/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <EstadoGuardado guardado={guardado} automatico={conAutoguardado} compacto />
          {estado === "PUBLICADO" ? (
            <BotonPrincipal
              onClick={() => void guardar(true)}
              disabled={!sucio || ocupado}
              Icono={Save}
            >
              Guardar cambios
            </BotonPrincipal>
          ) : (
            <BotonPrincipal onClick={() => setDialogo("publicar")} disabled={ocupado} Icono={Send}>
              Publicar
            </BotonPrincipal>
          )}
        </div>
      </div>

      <DialogosEstado
        abierto={dialogo}
        onCerrar={() => {
          setDialogo(undefined);
          setErrores(({ publicarEl: _, ...resto }) => resto);
        }}
        onConfirmar={cambiarEstado}
        ocupado={ocupado}
        errorFecha={errores.publicarEl}
        publicarEl={publicarEl}
        titulo={campos.titulo}
      />
      <Dialogo
        abierto={dialogo === "vista"}
        onCerrar={() => setDialogo(undefined)}
        titulo="Vista previa"
        descripcion="Aproximación de cómo se verá en el portal ciudadano."
        ancho="max-w-3xl"
      >
        <VistaPreviaNoticia campos={campos} />
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => setDialogo(undefined)}
            className="min-h-11 rounded-control border border-linea px-4 font-semibold text-tinta hover:border-tenue"
          >
            Cerrar
          </button>
        </div>
      </Dialogo>
      <Aviso aviso={aviso} onCerrar={cerrar} posicion="bottom-24 sm:bottom-24 lg:bottom-6" />
    </div>
  );
}

const AYUDA_FORMATO: Record<CamposNoticia["formato"], string> = {
  TEXTO: "Solo texto: título, resumen y cuerpo.",
  IMAGEN: "Una imagen principal arriba del texto.",
  GALERIA: "Varias imágenes (2 o más) con su descripción.",
  DOCUMENTO: "Un PDF para descargar, con el texto como presentación.",
  VIDEO: "Un video subido o un enlace de YouTube o Instagram.",
};

function Seccion({
  titulo,
  detalle,
  id,
  children,
}: {
  titulo: string;
  detalle?: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="border-t border-linea pt-6 first:border-t-0 first:pt-0"
    >
      <h2 id={id} className="text-lg font-bold">
        {titulo}
      </h2>
      {detalle && <p className="text-sm text-gris">{detalle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CampoTexto({
  id,
  etiqueta,
  ayuda,
  valor,
  max,
  multilinea,
  onCambio,
  error,
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
  valor: string;
  max: number;
  multilinea?: boolean;
  onCambio: (v: string) => void;
  error?: string;
}) {
  const quedan = max - valor.length;
  const cerca = quedan <= Math.round(max * 0.1);
  const describe = [`${id}-contador`, ayuda && `${id}-ayuda`, error && `${id}-error`]
    .filter(Boolean)
    .join(" ");
  const comunes = {
    id,
    value: valor,
    maxLength: max,
    onChange: (e: { target: { value: string } }) => onCambio(e.target.value),
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describe,
  };
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-bold text-tinta">
          {etiqueta}
        </label>
        <span
          id={`${id}-contador`}
          className={`text-sm tabular-nums ${cerca ? "font-semibold text-ambar-texto" : "text-gris"}`}
        >
          {valor.length} / {max}
        </span>
      </div>
      {multilinea ? (
        <textarea
          {...comunes}
          rows={3}
          className={`${claseEntrada(error)} h-auto min-h-24 py-2.5 leading-relaxed`}
        />
      ) : (
        <input {...comunes} className={claseEntrada(error)} />
      )}
      {cerca && (
        <p aria-live="polite" className="sr-only">
          {quedan === 0 ? "Llegaste al máximo de caracteres." : `Quedan ${quedan} caracteres.`}
        </p>
      )}
      {ayuda && (
        <p id={`${id}-ayuda`} className="mt-1.5 text-sm text-gris">
          {ayuda}
        </p>
      )}
      <MensajeError id={id} error={error} />
    </div>
  );
}

function PuntosAnalisis({
  valor,
  onCambio,
}: {
  valor?: CamposNoticia["puntos"];
  onCambio: (v?: CamposNoticia["puntos"]) => void;
}) {
  if (!valor)
    return (
      <Seccion
        titulo="Puntos de análisis"
        detalle="Opcional: pares título → explicación."
        id="sec-puntos"
      >
        <button
          type="button"
          onClick={() => onCambio({ items: [{ titulo: "", texto: "" }] })}
          className="inline-flex min-h-11 items-center gap-2 rounded-control border border-linea px-4 font-semibold text-tinta hover:border-tenue"
        >
          <Plus size={16} aria-hidden="true" />
          Añadir puntos de análisis
        </button>
      </Seccion>
    );
  const cambiarItem = (i: number, k: "titulo" | "texto", v: string) =>
    onCambio({ ...valor, items: valor.items.map((x, j) => (j === i ? { ...x, [k]: v } : x)) });
  return (
    <Seccion titulo="Puntos de análisis" detalle="Pares título → explicación." id="sec-puntos">
      <div className="space-y-4">
        <div>
          <label htmlFor="puntos-titulo" className="mb-1.5 block text-sm font-bold text-tinta">
            Título del bloque <span className="font-normal text-gris">(opcional)</span>
          </label>
          <input
            id="puntos-titulo"
            value={valor.titulo ?? ""}
            maxLength={120}
            onChange={(e) => onCambio({ ...valor, titulo: e.target.value || undefined })}
            className={claseEntrada()}
          />
        </div>
        <ol className="space-y-3">
          {valor.items.map((p, i) => (
            <li key={i} className="rounded-lg border border-linea p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-tinta">Punto {i + 1}</span>
                <button
                  type="button"
                  onClick={() =>
                    onCambio({ ...valor, items: valor.items.filter((_, j) => j !== i) })
                  }
                  aria-label={`Quitar el punto ${i + 1}`}
                  className="grid size-10 place-items-center rounded-control text-tinta hover:bg-superficie"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
              <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <div>
                  <label
                    htmlFor={`punto-${i}-titulo`}
                    className="mb-1.5 block text-sm font-semibold text-tinta"
                  >
                    Título
                  </label>
                  <input
                    id={`punto-${i}-titulo`}
                    value={p.titulo}
                    maxLength={120}
                    onChange={(e) => cambiarItem(i, "titulo", e.target.value)}
                    className={claseEntrada()}
                  />
                </div>
                <div>
                  <label
                    htmlFor={`punto-${i}-texto`}
                    className="mb-1.5 block text-sm font-semibold text-tinta"
                  >
                    Explicación
                  </label>
                  <textarea
                    id={`punto-${i}-texto`}
                    value={p.texto}
                    maxLength={600}
                    rows={2}
                    onChange={(e) => cambiarItem(i, "texto", e.target.value)}
                    className={`${claseEntrada()} h-auto py-2.5`}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2">
          {valor.items.length < 12 && (
            <button
              type="button"
              onClick={() =>
                onCambio({ ...valor, items: [...valor.items, { titulo: "", texto: "" }] })
              }
              className="inline-flex min-h-10 items-center gap-2 rounded-control border border-linea px-3 text-sm font-semibold text-tinta hover:border-tenue"
            >
              <Plus size={16} aria-hidden="true" />
              Otro punto
            </button>
          )}
          <button
            type="button"
            onClick={() => onCambio(undefined)}
            className="inline-flex min-h-10 items-center gap-2 rounded-control px-3 text-sm font-semibold text-tinta hover:bg-superficie"
          >
            <Trash2 size={16} aria-hidden="true" />
            Quitar el bloque
          </button>
        </div>
      </div>
    </Seccion>
  );
}

function BotonFinal({
  valor,
  onCambio,
  error,
}: {
  valor?: CamposNoticia["boton"];
  onCambio: (v?: CamposNoticia["boton"]) => void;
  error?: string;
}) {
  return (
    <Seccion
      titulo="Botón al final"
      detalle="Opcional: lleva a un documento, un formulario u otra página."
      id="sec-boton"
    >
      {valor ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div>
              <label htmlFor="boton-texto" className="mb-1.5 block text-sm font-bold text-tinta">
                Texto del botón
              </label>
              <input
                id="boton-texto"
                value={valor.texto}
                maxLength={40}
                onChange={(e) => onCambio({ ...valor, texto: e.target.value })}
                className={claseEntrada(error)}
              />
            </div>
            <div>
              <label htmlFor="boton-href" className="mb-1.5 block text-sm font-bold text-tinta">
                Enlace
              </label>
              <input
                id="boton-href"
                type="url"
                inputMode="url"
                value={valor.href}
                placeholder="https:// o /ruta-del-portal"
                maxLength={500}
                onChange={(e) => onCambio({ ...valor, href: e.target.value })}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "boton-error" : undefined}
                className={claseEntrada(error)}
              />
            </div>
          </div>
          <MensajeError id="boton" error={error} />
          <button
            type="button"
            onClick={() => onCambio(undefined)}
            className="inline-flex min-h-10 items-center gap-2 rounded-control px-3 text-sm font-semibold text-tinta hover:bg-superficie"
          >
            <Trash2 size={16} aria-hidden="true" />
            Quitar el botón
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onCambio({ texto: "", href: "" })}
          className="inline-flex min-h-11 items-center gap-2 rounded-control border border-linea px-4 font-semibold text-tinta hover:border-tenue"
        >
          <Plus size={16} aria-hidden="true" />
          Añadir un botón
        </button>
      )}
    </Seccion>
  );
}

function EstadoGuardado({
  guardado,
  automatico,
  compacto,
}: {
  guardado: Guardado;
  automatico: boolean;
  compacto?: boolean;
}) {
  const texto =
    guardado.estado === "guardando"
      ? "Guardando…"
      : guardado.estado === "error"
        ? "No se pudo guardar"
        : guardado.estado === "pendiente"
          ? automatico
            ? "Cambios sin guardar · se guardan solos"
            : "Cambios sin guardar"
          : `Guardado ${guardado.en ? formatearFecha(guardado.en, true) : ""}`;
  return (
    <p
      aria-live={compacto ? undefined : "polite"}
      className={`inline-flex items-center gap-1.5 text-sm ${
        guardado.estado === "error"
          ? "font-semibold text-peligro"
          : guardado.estado === "pendiente"
            ? "text-ambar-texto"
            : "text-gris"
      } ${compacto ? "min-w-0 truncate" : ""}`}
    >
      {guardado.estado === "guardando" && (
        <Loader2 size={14} aria-hidden="true" className="animate-spin" />
      )}
      {texto}
    </p>
  );
}

function BotonPrincipal({
  children,
  Icono,
  ancho = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { Icono: typeof Send; ancho?: string }) {
  return (
    <button
      type="button"
      {...props}
      className={`${ancho} inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-control border border-marca bg-marca px-4 font-semibold text-sobre-marca transition-[filter] duration-150 hover:brightness-110 disabled:cursor-not-allowed disabled:border-linea disabled:bg-superficie disabled:text-tenue disabled:hover:brightness-100`}
    >
      <Icono size={18} aria-hidden="true" />
      {children}
    </button>
  );
}

const claseSecundario =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-linea bg-papel px-4 font-semibold text-tinta hover:border-tenue disabled:cursor-not-allowed disabled:opacity-60";

function PanelPublicacion({
  estado,
  publicarEl,
  noticia,
  ocupado,
  sucio,
  guardando,
  onGuardar,
  onDialogo,
}: {
  estado: EstadoNoticia;
  publicarEl?: string;
  noticia: Noticia;
  ocupado: boolean;
  sucio: boolean;
  guardando: boolean;
  onGuardar: () => void;
  onDialogo: (d: CambioEstado | "vista") => void;
}) {
  const publicada = estado === "PUBLICADO";
  return (
    <div className="rounded-lg border border-linea bg-papel">
      <div className="border-b border-linea px-4 py-3">
        <h2 className="text-base font-bold">Publicación</h2>
        <p className="mt-1 text-sm text-gris">
          {estado === "BORRADOR" && "Solo lo ve el equipo. Publícala ahora o elige cuándo."}
          {estado === "PROGRAMADO" &&
            publicarEl &&
            `Se publicará sola el ${formatearFecha(publicarEl, true)}.`}
          {publicada &&
            `En el portal desde el ${formatearFecha(noticia.publicadoEl ?? noticia.actualizadoEl)}. Los cambios se ven al guardarlos.`}
          {estado === "DESPUBLICADO" && "Ya no se ve en el portal. Puedes volver a publicarla."}
        </p>
      </div>
      <div className="space-y-2 p-4">
        {publicada ? (
          <BotonPrincipal
            ancho="w-full"
            onClick={onGuardar}
            disabled={!sucio || ocupado || guardando}
            Icono={Save}
          >
            Guardar cambios
          </BotonPrincipal>
        ) : (
          <BotonPrincipal
            ancho="w-full"
            onClick={() => onDialogo("publicar")}
            disabled={ocupado}
            Icono={Send}
          >
            Publicar ahora
          </BotonPrincipal>
        )}
        {!publicada && (
          <button
            type="button"
            onClick={() => onDialogo("programar")}
            disabled={ocupado}
            className={claseSecundario}
          >
            <CalendarClock size={18} aria-hidden="true" />
            {estado === "PROGRAMADO" ? "Cambiar la fecha" : "Programar"}
          </button>
        )}
        {estado === "PROGRAMADO" && (
          <>
            <button
              type="button"
              onClick={onGuardar}
              disabled={!sucio || ocupado || guardando}
              className={claseSecundario}
            >
              <Save size={18} aria-hidden="true" />
              Guardar cambios
            </button>
            <button
              type="button"
              onClick={() => onDialogo("aBorrador")}
              disabled={ocupado}
              className={claseSecundario}
            >
              <Undo2 size={18} aria-hidden="true" />
              Volver a borrador
            </button>
          </>
        )}
        <button type="button" onClick={() => onDialogo("vista")} className={claseSecundario}>
          <Eye size={18} aria-hidden="true" />
          Vista previa
        </button>
        {publicada && (
          <button
            type="button"
            onClick={() => onDialogo("despublicar")}
            disabled={ocupado}
            className={claseSecundario}
          >
            <EyeOff size={18} aria-hidden="true" />
            Despublicar
          </button>
        )}
        {estado === "BORRADOR" && (
          <button
            type="button"
            onClick={() => onDialogo("eliminar")}
            disabled={ocupado}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control px-4 font-semibold text-tinta hover:bg-superficie"
          >
            <Trash2 size={18} aria-hidden="true" />
            Eliminar borrador
          </button>
        )}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-linea px-4 py-3 text-sm">
        <dt className="text-gris">Creada</dt>
        <dd className="text-tinta">{formatearFecha(noticia.creadoEl, true)}</dd>
        <dt className="text-gris">Dirección</dt>
        <dd className="min-w-0 truncate text-tinta">/noticias/{noticia.slug}</dd>
      </dl>
    </div>
  );
}

const CONFIRMACION: Record<
  Exclude<CambioEstado, "programar">,
  { titulo: string; descripcion: string; boton: string; peligro?: boolean }
> = {
  publicar: {
    titulo: "¿Publicar ahora?",
    descripcion: "La noticia se verá en el portal ciudadano en este momento.",
    boton: "Publicar",
  },
  aBorrador: {
    titulo: "¿Volver a borrador?",
    descripcion: "Se cancela la fecha programada: la noticia no se publicará sola.",
    boton: "Volver a borrador",
  },
  despublicar: {
    titulo: "¿Despublicar la noticia?",
    descripcion: "Deja de verse en el portal. Podrás volver a publicarla cuando quieras.",
    boton: "Despublicar",
    peligro: true,
  },
  eliminar: {
    titulo: "¿Eliminar este borrador?",
    descripcion: "Se borra para todo el equipo y no se puede recuperar desde el panel.",
    boton: "Eliminar",
    peligro: true,
  },
};

function DialogosEstado({
  abierto,
  onCerrar,
  onConfirmar,
  ocupado,
  errorFecha,
  publicarEl,
  titulo,
}: {
  abierto?: CambioEstado | "vista";
  onCerrar: () => void;
  onConfirmar: (c: CambioEstado, fecha?: string) => void;
  ocupado: boolean;
  errorFecha?: string;
  publicarEl?: string;
  titulo: string;
}) {
  const conf =
    abierto && abierto !== "vista" && abierto !== "programar" ? CONFIRMACION[abierto] : undefined;
  return (
    <>
      <Dialogo
        abierto={Boolean(conf)}
        onCerrar={onCerrar}
        titulo={conf?.titulo ?? ""}
        descripcion={
          conf ? `${titulo.trim() ? `«${titulo.trim()}». ` : ""}${conf.descripcion}` : undefined
        }
      >
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCerrar}
            className="min-h-11 rounded-control border border-linea px-4 font-semibold text-tinta hover:border-tenue"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => abierto && abierto !== "vista" && onConfirmar(abierto)}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-control border px-4 font-semibold disabled:opacity-70 ${
              conf?.peligro
                ? "border-peligro bg-peligro text-papel hover:brightness-110"
                : "border-marca bg-marca text-sobre-marca hover:brightness-110"
            }`}
          >
            {ocupado && <Loader2 size={18} aria-hidden="true" className="animate-spin" />}
            {conf?.boton}
          </button>
        </div>
      </Dialogo>

      {abierto === "programar" && (
        <DialogoProgramar
          onCerrar={onCerrar}
          onConfirmar={onConfirmar}
          ocupado={ocupado}
          errorFecha={errorFecha}
          publicarEl={publicarEl}
        />
      )}
    </>
  );
}

/** Se monta al abrirse: así la fecha propuesta se calcula una vez, al abrir. */
function DialogoProgramar({
  onCerrar,
  onConfirmar,
  ocupado,
  errorFecha,
  publicarEl,
}: {
  onCerrar: () => void;
  onConfirmar: (c: CambioEstado, fecha?: string) => void;
  ocupado: boolean;
  errorFecha?: string;
  publicarEl?: string;
}) {
  // Propuesta: la fecha ya programada, o mañana a las 8:00 (hora de Venezuela).
  const [fecha, setFecha] = useState(() =>
    publicarEl
      ? new Date(Date.parse(publicarEl) - 4 * 3_600_000).toISOString().slice(0, 16)
      : ahoraLocalCaracas(24 * 60).slice(0, 11) + "08:00",
  );
  const [errorLocal, setErrorLocal] = useState<string>();
  const error = errorLocal ?? errorFecha;
  return (
    <Dialogo
      abierto
      onCerrar={onCerrar}
      titulo="Programar la publicación"
      descripcion="La noticia se publicará sola en la fecha y hora que elijas (hora de Venezuela)."
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!fecha) return setErrorLocal("Elige la fecha y la hora.");
          const iso = aIsoCaracas(fecha);
          if (Date.parse(iso) <= Date.now() + 60_000)
            return setErrorLocal("Elige una fecha y hora futuras.");
          setErrorLocal(undefined);
          onConfirmar("programar", iso);
        }}
        className="mt-4"
      >
        <fieldset>
          <legend className="sr-only">Fecha y hora</legend>
          <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
            <SelectorFecha
              id="publicarEl"
              etiqueta="Fecha"
              valor={fecha.slice(0, 10)}
              onCambio={(dia) => {
                setFecha(`${dia}T${fecha.slice(11, 16) || "08:00"}`);
                setErrorLocal(undefined);
              }}
              min={ahoraLocalCaracas().slice(0, 10)}
              permitirVacio={false}
              invalido={!!error}
              describe={error ? "publicarEl-error" : undefined}
            />
            <Selector
              id="publicarEl-hora"
              etiqueta="Hora"
              opciones={opcionesHora(fecha.slice(11, 16))}
              valor={fecha.slice(11, 16)}
              onCambio={(hora) => {
                setFecha(`${fecha.slice(0, 10)}T${hora}`);
                setErrorLocal(undefined);
              }}
              invalido={!!error}
            />
          </div>
        </fieldset>
        <MensajeError id="publicarEl" error={error} />
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCerrar}
            className="min-h-11 rounded-control border border-linea px-4 font-semibold text-tinta hover:border-tenue"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={ocupado}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-marca bg-marca px-4 font-semibold text-sobre-marca hover:brightness-110 disabled:opacity-70"
          >
            {ocupado && <Loader2 size={18} aria-hidden="true" className="animate-spin" />}
            Programar
          </button>
        </div>
      </form>
    </Dialogo>
  );
}
