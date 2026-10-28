"use client";

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  FileText,
  GripVertical,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import Cropper from "react-easy-crop";
import type { Adjunto, Imagen, Video } from "@/lib/contenido/tipos";
import { enlaceVideo, idYoutube } from "@/lib/contenido/video";
import { medidas, recortar, type AreaRecorte } from "@/lib/imagen";
import { pesoLegible, revisarArchivo, subirMedio } from "./subir";
import { ZonaArchivo } from "./zona-archivo";

/*
 * Campos de medios del editor de noticias: portada con recorte, galería, documento y video.
 * Cada archivo sube en cuanto se elige (con su progreso) y el formulario guarda solo la URL.
 */

export const claseEntrada = (error?: string) =>
  `h-11 w-full rounded-control border bg-papel px-3 text-tinta outline-none placeholder:text-tenue focus-visible:border-marca-texto ${
    error ? "border-peligro" : "border-linea hover:border-tenue"
  }`;

const claseBotonSecundario =
  "inline-flex min-h-10 items-center gap-1.5 rounded-control border border-linea bg-papel px-3 text-sm font-semibold text-tinta hover:border-tenue";

export function MensajeError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-sm text-peligro">
      <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
      {error}
    </p>
  );
}

/* ---------- Texto alternativo, crédito e «ilustrativa» ---------- */

export function DatosImagen({
  id,
  imagen,
  onCambio,
  errorAlt,
  conIlustrativa = true,
}: {
  id: string;
  imagen: Imagen;
  onCambio: (i: Imagen) => void;
  errorAlt?: string;
  conIlustrativa?: boolean;
}) {
  const [conCredito, setConCredito] = useState(Boolean(imagen.credito));
  const credito = imagen.credito ?? { autor: "", licencia: "", fuente: "" };
  const cambiarCredito = (k: keyof typeof credito, v: string) =>
    onCambio({ ...imagen, credito: { ...credito, [k]: v } });

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={`${id}-alt`} className="mb-1.5 block text-sm font-bold text-tinta">
          Texto alternativo
        </label>
        <input
          id={`${id}-alt`}
          value={imagen.alt}
          maxLength={250}
          onChange={(e) => onCambio({ ...imagen, alt: e.target.value })}
          aria-invalid={errorAlt ? true : undefined}
          aria-describedby={`${id}-alt-ayuda${errorAlt ? ` ${id}-alt-error` : ""}`}
          className={claseEntrada(errorAlt)}
        />
        <p id={`${id}-alt-ayuda`} className="mt-1.5 text-sm text-gris">
          Qué muestra la imagen, para quien no puede verla. Obligatorio.
        </p>
        <MensajeError id={`${id}-alt`} error={errorAlt} />
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2.5 text-sm text-cuerpo">
          <input
            type="checkbox"
            checked={conCredito}
            onChange={(e) => {
              setConCredito(e.target.checked);
              if (!e.target.checked) onCambio({ ...imagen, credito: undefined });
            }}
            className="size-5 accent-[var(--marca)]"
          />
          La foto no es de la alcaldía (dar el crédito)
        </label>
        {conIlustrativa && (
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2.5 text-sm text-cuerpo">
            <input
              type="checkbox"
              checked={Boolean(imagen.ilustrativa)}
              onChange={(e) => onCambio({ ...imagen, ilustrativa: e.target.checked || undefined })}
              className="size-5 accent-[var(--marca)]"
            />
            Foto ilustrativa (no es del hecho narrado)
          </label>
        )}
      </div>
      {conCredito && (
        <fieldset className="grid gap-3 rounded-lg bg-superficie p-3 sm:grid-cols-3">
          <legend className="sr-only">Crédito de la foto</legend>
          {(
            [
              ["autor", "Autor", "Nombre o usuario"],
              ["licencia", "Licencia", "CC BY-SA 4.0"],
              ["fuente", "Fuente", "https://"],
            ] as const
          ).map(([k, etiqueta, ejemplo]) => (
            <div key={k} className="min-w-0">
              <label htmlFor={`${id}-${k}`} className="mb-1.5 block text-sm font-bold text-tinta">
                {etiqueta}
              </label>
              <input
                id={`${id}-${k}`}
                value={credito[k]}
                placeholder={ejemplo}
                maxLength={k === "fuente" ? 500 : 120}
                onChange={(e) => cambiarCredito(k, e.target.value)}
                className={claseEntrada()}
              />
            </div>
          ))}
        </fieldset>
      )}
    </div>
  );
}

/* ---------- Imagen con recorte (portada) ---------- */

/**
 * Portada: se elige, se encuadra en 16:9 (arrastre, rueda o flechas, con «Acercar») y se sube
 * recortada a 1600 px. Después pide el texto alternativo y, si hace falta, el crédito.
 */
export function CampoImagenRecortada({
  id,
  etiqueta,
  valor,
  onCambio,
  error,
  errorAlt,
  aspecto = 16 / 9,
  conIlustrativa = true,
}: {
  id: string;
  etiqueta: string;
  valor?: Imagen;
  onCambio: (i?: Imagen) => void;
  error?: string;
  errorAlt?: string;
  aspecto?: number;
  /** «Foto ilustrativa» solo tiene sentido en noticias. */
  conIlustrativa?: boolean;
}) {
  const [archivo, setArchivo] = useState<{ file: File; url: string }>();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<AreaRecorte>();
  const [progreso, setProgreso] = useState<number>();
  const [falla, setFalla] = useState<string>();

  useEffect(() => () => (archivo ? URL.revokeObjectURL(archivo.url) : undefined), [archivo]);

  function tomar([f]: File[]) {
    if (!f) return;
    const motivo = revisarArchivo(f, "imagen");
    if (motivo) return setFalla(motivo);
    setFalla(undefined);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setArchivo({ file: f, url: URL.createObjectURL(f) });
  }

  async function usarEncuadre() {
    if (!archivo || !area) return;
    setProgreso(0);
    try {
      const r = await recortar(archivo.url, area, { ancho: 1600, nombre: archivo.file.name });
      const s = await subirMedio(r.archivo, "imagen", setProgreso);
      if (!s.ok) return setFalla(s.error);
      onCambio({
        src: s.url,
        ancho: s.ancho ?? r.ancho,
        alto: s.alto ?? r.alto,
        alt: valor?.alt ?? "",
        credito: valor?.credito,
        ilustrativa: valor?.ilustrativa,
      });
      setArchivo(undefined);
    } catch {
      setFalla("No se pudo recortar esta imagen. Prueba con otra.");
    } finally {
      setProgreso(undefined);
    }
  }

  const mostrado = falla ?? error;

  return (
    <div>
      <p id={`${id}-etiqueta`} className="mb-1.5 text-sm font-bold text-tinta">
        {etiqueta}
      </p>
      {archivo ? (
        <div>
          <div className="relative aspect-video overflow-hidden rounded-lg bg-superficie ring-1 ring-linea">
            <Cropper
              image={archivo.url}
              crop={crop}
              zoom={zoom}
              aspect={aspecto}
              showGrid={false}
              keyboardStep={8}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_a, px) => setArea(px)}
              mediaProps={{ alt: `${etiqueta} para encuadrar` }}
              style={{ cropAreaStyle: { color: "rgb(31 56 100 / 0.45)" } }}
            />
          </div>
          <p className="mt-2 text-sm text-gris">
            Arrastra la imagen (o usa las flechas) para elegir el encuadre.
          </p>
          <label htmlFor={`${id}-zoom`} className="mt-3 block text-sm font-bold text-tinta">
            Acercar
          </label>
          <input
            id={`${id}-zoom`}
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="mt-1 w-full accent-[var(--marca)]"
          />
          {progreso !== undefined && (
            <div
              role="progressbar"
              aria-label={`Subiendo: ${etiqueta}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progreso * 100)}
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-superficie"
            >
              <div className="h-full bg-marca" style={{ width: `${progreso * 100}%` }} />
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={usarEncuadre}
              disabled={progreso !== undefined}
              className="inline-flex min-h-11 items-center gap-2 rounded-control border border-marca bg-marca px-4 font-semibold text-sobre-marca hover:brightness-110 disabled:opacity-70"
            >
              <Check size={18} aria-hidden="true" />
              Usar este encuadre
            </button>
            <button
              type="button"
              onClick={() => setArchivo(undefined)}
              className={claseBotonSecundario}
            >
              Cancelar
            </button>
          </div>
          <MensajeError id={id} error={mostrado} />
        </div>
      ) : valor ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,16rem)_1fr] sm:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element -- medio del propio panel */}
            <img
              src={valor.src}
              alt={valor.alt || `${etiqueta} sin describir`}
              className="aspect-video w-full rounded-lg object-cover ring-1 ring-linea"
            />
            <div className="flex flex-wrap gap-2">
              <label
                htmlFor={`${id}-otra`}
                className={`${claseBotonSecundario} cursor-pointer has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-[var(--marca-texto)]`}
              >
                <RefreshCw size={16} aria-hidden="true" />
                Cambiar
                <input
                  id={`${id}-otra`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    tomar([...(e.target.files ?? [])]);
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => onCambio(undefined)}
                className={claseBotonSecundario}
              >
                <Trash2 size={16} aria-hidden="true" />
                Quitar
              </button>
            </div>
          </div>
          <DatosImagen
            id={id}
            imagen={valor}
            onCambio={onCambio}
            errorAlt={errorAlt}
            conIlustrativa={conIlustrativa}
          />
          <MensajeError id={id} error={falla} />
        </div>
      ) : (
        <ZonaArchivo
          id={id}
          etiqueta={etiqueta}
          clase="imagen"
          onArchivos={tomar}
          error={mostrado}
        />
      )}
    </div>
  );
}

/* ---------- Galería ---------- */

export function CampoGaleria({
  imagenes,
  onCambio,
  error,
}: {
  imagenes: Imagen[];
  onCambio: (i: Imagen[]) => void;
  error?: string;
}) {
  const [progreso, setProgreso] = useState<number>();
  const [falla, setFalla] = useState<string>();
  const [arrastrada, setArrastrada] = useState<number>();
  const [anuncio, setAnuncio] = useState("");

  async function subir(archivos: File[]) {
    const nuevas: Imagen[] = [];
    const fallas: string[] = [];
    for (const [i, f] of archivos.entries()) {
      const motivo = revisarArchivo(f, "imagen");
      if (motivo) {
        fallas.push(motivo);
        continue;
      }
      setProgreso(i / archivos.length);
      const url = URL.createObjectURL(f);
      const { ancho, alto } = await medidas(url).catch(() => ({ ancho: 1600, alto: 1067 }));
      URL.revokeObjectURL(url);
      const r = await subirMedio(f, "imagen", (p) => setProgreso((i + p) / archivos.length));
      if (r.ok) nuevas.push({ src: r.url, ancho: r.ancho ?? ancho, alto: r.alto ?? alto, alt: "" });
      else fallas.push(`«${f.name}»: ${r.error}`);
    }
    setProgreso(undefined);
    setFalla(fallas.join(" ") || undefined);
    if (nuevas.length) onCambio([...imagenes, ...nuevas]);
  }

  function mover(desde: number, hasta: number) {
    if (hasta < 0 || hasta >= imagenes.length || desde === hasta) return;
    const lista = [...imagenes];
    const [i] = lista.splice(desde, 1);
    lista.splice(hasta, 0, i!);
    onCambio(lista);
    setAnuncio(`Imagen movida a la posición ${hasta + 1} de ${lista.length}.`);
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-bold text-tinta">Imágenes de la galería</p>
      <p aria-live="polite" className="sr-only">
        {anuncio}
      </p>
      {imagenes.length > 0 && (
        <ol aria-label="Imágenes de la galería" className="mb-4 space-y-3">
          {imagenes.map((img, i) => (
            <li
              key={img.src}
              draggable
              onDragStart={() => setArrastrada(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (arrastrada !== undefined) mover(arrastrada, i);
                setArrastrada(undefined);
              }}
              className={`rounded-lg border bg-papel p-3 ${
                arrastrada === i ? "border-marca-texto opacity-60" : "border-linea"
              }`}
            >
              <div className="grid gap-3 sm:grid-cols-[auto_8rem_minmax(0,1fr)]">
                <div className="flex items-center gap-1 sm:flex-col sm:justify-center">
                  <GripVertical
                    size={18}
                    aria-hidden="true"
                    className="hidden cursor-grab text-tenue sm:block"
                  />
                  <span className="text-sm font-bold text-tinta tabular-nums sm:hidden">
                    {i + 1}.
                  </span>
                  <button
                    type="button"
                    onClick={() => mover(i, i - 1)}
                    disabled={i === 0}
                    aria-label={`Subir la imagen ${i + 1}`}
                    className="grid size-10 place-items-center rounded-control text-tinta hover:bg-superficie disabled:text-tenue"
                  >
                    <ArrowUp size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(i, i + 1)}
                    disabled={i === imagenes.length - 1}
                    aria-label={`Bajar la imagen ${i + 1}`}
                    className="grid size-10 place-items-center rounded-control text-tinta hover:bg-superficie disabled:text-tenue"
                  >
                    <ArrowDown size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onCambio(imagenes.filter((_, j) => j !== i))}
                    aria-label={`Quitar la imagen ${i + 1}`}
                    className="ml-auto grid size-10 place-items-center rounded-control text-tinta hover:bg-superficie sm:ml-0"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element -- medio del propio panel */}
                <img
                  src={img.src}
                  alt={img.alt || `Imagen ${i + 1} sin describir`}
                  className="aspect-[4/3] w-full rounded-md object-cover ring-1 ring-linea"
                />
                <DatosImagen
                  id={`galeria-${i}`}
                  imagen={img}
                  conIlustrativa={false}
                  onCambio={(nueva) => onCambio(imagenes.map((x, j) => (j === i ? nueva : x)))}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
      <ZonaArchivo
        id="imagenes"
        etiqueta="Añadir imágenes"
        clase="imagen"
        multiple
        compacta={imagenes.length > 0}
        onArchivos={subir}
        progreso={progreso}
        error={falla ?? error}
      />
      <p className="mt-1.5 text-sm text-gris">
        Mínimo 2 imágenes. El orden de la lista es el del portal; arrastra o usa las flechas.
      </p>
    </div>
  );
}

/* ---------- Documento ---------- */

export function CampoDocumento({
  valor,
  onCambio,
  error,
}: {
  valor?: Adjunto;
  onCambio: (a?: Adjunto) => void;
  error?: string;
}) {
  const [progreso, setProgreso] = useState<number>();
  const [falla, setFalla] = useState<string>();

  async function subir([f]: File[]) {
    if (!f) return;
    const motivo = revisarArchivo(f, "pdf");
    if (motivo) return setFalla(motivo);
    setFalla(undefined);
    setProgreso(0);
    const r = await subirMedio(f, "pdf", setProgreso);
    setProgreso(undefined);
    if (!r.ok) return setFalla(r.error);
    onCambio({ nombre: r.nombre, url: r.url, tipo: "application/pdf", pesoBytes: r.pesoBytes });
  }

  if (!valor)
    return (
      <ZonaArchivo
        id="adjunto"
        etiqueta="Documento en PDF"
        clase="pdf"
        onArchivos={subir}
        progreso={progreso}
        error={falla ?? error}
      />
    );

  return (
    <div className="rounded-lg border border-linea p-4">
      <div className="flex items-start gap-3">
        <FileText size={28} aria-hidden="true" className="shrink-0 text-marca-texto" />
        <div className="min-w-0 flex-1">
          <label htmlFor="adjunto-nombre" className="mb-1.5 block text-sm font-bold text-tinta">
            Nombre del documento
          </label>
          <input
            id="adjunto-nombre"
            value={valor.nombre}
            maxLength={160}
            onChange={(e) => onCambio({ ...valor, nombre: e.target.value })}
            className={claseEntrada()}
          />
          <p className="mt-1.5 text-sm text-gris">
            PDF · {pesoLegible(valor.pesoBytes)} ·{" "}
            <a
              href={valor.url}
              target="_blank"
              rel="noopener"
              className="font-semibold text-marca-texto underline"
            >
              Abrir
            </a>
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => onCambio(undefined)} className={claseBotonSecundario}>
          <Trash2 size={16} aria-hidden="true" />
          Quitar el documento
        </button>
      </div>
    </div>
  );
}

/* ---------- Video ---------- */

export function CampoVideo({
  valor,
  onCambio,
  error,
}: {
  valor?: Video;
  onCambio: (v?: Video) => void;
  error?: string;
}) {
  const [modo, setModo] = useState<"enlace" | "archivo">(
    valor?.fuente === "ARCHIVO" ? "archivo" : "enlace",
  );
  const [enlace, setEnlace] = useState(valor && valor.fuente !== "ARCHIVO" ? valor.url : "");
  const [progreso, setProgreso] = useState<number>();
  const [progresoVtt, setProgresoVtt] = useState<number>();
  const [falla, setFalla] = useState<string>();
  const grupo = useId();
  const detectado = enlace.trim() ? enlaceVideo(enlace) : undefined;

  async function subirVideo([f]: File[]) {
    if (!f) return;
    const motivo = revisarArchivo(f, "video");
    if (motivo) return setFalla(motivo);
    setFalla(undefined);
    setProgreso(0);
    const duracion = await duracionDe(f);
    const r = await subirMedio(f, "video", setProgreso);
    setProgreso(undefined);
    if (!r.ok) return setFalla(r.error);
    onCambio({ fuente: "ARCHIVO", url: r.url, duracionSeg: duracion, portada: valor?.portada });
  }

  async function subirVtt([f]: File[]) {
    if (!f || !valor) return;
    const motivo = revisarArchivo(f, "subtitulos");
    if (motivo) return setFalla(motivo);
    setFalla(undefined);
    setProgresoVtt(0);
    const r = await subirMedio(f, "subtitulos", setProgresoVtt);
    setProgresoVtt(undefined);
    if (!r.ok) return setFalla(r.error);
    onCambio({ ...valor, subtitulos: r.url });
  }

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-labelledby={`${grupo}-t`}>
        <p id={`${grupo}-t`} className="mb-1.5 text-sm font-bold text-tinta">
          Origen del video
        </p>
        <div className="inline-flex rounded-control border border-linea bg-superficie p-1">
          {(
            [
              ["enlace", "Enlace"],
              ["archivo", "Archivo"],
            ] as const
          ).map(([m, texto]) => (
            <label
              key={m}
              className={`inline-flex min-h-10 cursor-pointer items-center rounded-[calc(var(--radius-control)-2px)] px-3 text-sm font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-[var(--marca-texto)] ${
                modo === m
                  ? "bg-papel text-tinta shadow-sm ring-1 ring-linea"
                  : "text-gris hover:text-tinta"
              }`}
            >
              <input
                type="radio"
                name={`${grupo}-modo`}
                value={m}
                checked={modo === m}
                onChange={() => setModo(m)}
                className="sr-only"
              />
              {texto}
            </label>
          ))}
        </div>
      </div>

      {modo === "enlace" ? (
        <div>
          <label htmlFor="video" className="mb-1.5 block text-sm font-bold text-tinta">
            Enlace del video
          </label>
          <input
            id="video"
            type="url"
            inputMode="url"
            value={enlace}
            placeholder="https://www.youtube.com/watch?v=…"
            onChange={(e) => {
              const v = e.target.value;
              setEnlace(v);
              const ok = enlaceVideo(v);
              onCambio(
                v.trim()
                  ? { fuente: ok?.fuente ?? "YOUTUBE", url: ok?.url ?? v.trim() }
                  : undefined,
              );
            }}
            aria-invalid={(enlace.trim() && !detectado) || error ? true : undefined}
            aria-describedby="video-ayuda video-error"
            className={claseEntrada(enlace.trim() && !detectado ? "x" : error)}
          />
          <p id="video-ayuda" aria-live="polite" className="mt-1.5 text-sm text-gris">
            {detectado ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-turquesa-texto">
                <Check size={16} aria-hidden="true" />
                {detectado.fuente === "YOUTUBE"
                  ? `Video de YouTube (${idYoutube(detectado.url)})`
                  : "Publicación de Instagram"}
              </span>
            ) : (
              "YouTube (watch, youtu.be o shorts) o una publicación de Instagram (p, reel o tv)."
            )}
          </p>
          <MensajeError
            id="video"
            error={
              enlace.trim() && !detectado
                ? "Ese enlace no es de YouTube ni de una publicación de Instagram."
                : error
            }
          />
        </div>
      ) : valor?.fuente === "ARCHIVO" ? (
        <div className="space-y-4 rounded-lg border border-linea p-4">
          <video
            src={valor.url}
            controls
            preload="metadata"
            poster={valor.portada?.src}
            className="aspect-video w-full rounded-md bg-tinta"
          >
            {valor.subtitulos && (
              <track kind="captions" src={valor.subtitulos} srcLang="es" label="Español" default />
            )}
          </video>
          <p className="text-sm text-gris">
            {valor.duracionSeg ? `Dura ${Math.round(valor.duracionSeg)} s. ` : ""}
            <button
              type="button"
              onClick={() => onCambio(undefined)}
              className="font-semibold text-tinta underline"
            >
              Quitar el video
            </button>
          </p>
          <CampoImagenRecortada
            id="video-portada"
            etiqueta="Portada del video (opcional, también es la de la tarjeta)"
            valor={valor.portada}
            onCambio={(portada) => onCambio({ ...valor, portada })}
          />
          {valor.subtitulos ? (
            <p className="text-sm text-cuerpo">
              Subtítulos cargados.{" "}
              <button
                type="button"
                onClick={() => onCambio({ ...valor, subtitulos: undefined })}
                className="font-semibold text-tinta underline"
              >
                Quitar
              </button>
            </p>
          ) : (
            <ZonaArchivo
              id="video-subtitulos"
              etiqueta="Subtítulos (opcional)"
              clase="subtitulos"
              compacta
              onArchivos={subirVtt}
              progreso={progresoVtt}
            />
          )}
          <MensajeError id="video-archivo" error={falla} />
        </div>
      ) : (
        <ZonaArchivo
          id="video-archivo"
          etiqueta="Archivo de video"
          clase="video"
          onArchivos={subirVideo}
          progreso={progreso}
          error={falla ?? error}
        />
      )}
    </div>
  );
}

/** Duración en segundos leyendo los metadatos en el navegador (sin subir nada). */
function duracionDe(f: File): Promise<number | undefined> {
  return new Promise((resolver) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(f);
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolver(Number.isFinite(v.duration) ? Math.round(v.duration) : undefined);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolver(undefined);
    };
    v.src = url;
  });
}
