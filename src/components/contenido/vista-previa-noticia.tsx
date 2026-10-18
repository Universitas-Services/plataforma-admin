import { FileText, PlaySquare } from "lucide-react";
import { sanearHtml } from "@/lib/contenido/sanear";
import type { CamposNoticia, Imagen } from "@/lib/contenido/tipos";
import { enlaceVideo, idYoutube } from "@/lib/contenido/video";
import { pesoLegible } from "./subir";

/**
 * Aproximación de la noticia en el portal ciudadano: mismo orden de piezas (categoría, título,
 * resumen, medio, cuerpo, puntos y botón), con la tipografía del panel. No es el portal real.
 */
export function VistaPreviaNoticia({ campos: c }: { campos: CamposNoticia }) {
  const video = c.video;
  const enlace = video && video.fuente !== "ARCHIVO" ? enlaceVideo(video.url) : undefined;
  return (
    <article className="mt-4 max-h-[65dvh] overflow-y-auto rounded-lg border border-linea p-4 sm:p-6">
      <p className="text-xs font-bold tracking-wider text-marca-texto uppercase">
        {c.categoria ?? "Sin categoría"}
        {c.parroquia && <span className="font-medium text-gris"> · {c.parroquia}</span>}
      </p>
      <h3 className="mt-2 text-2xl leading-tight font-bold">{c.titulo || "Sin título"}</h3>
      {c.resumen && <p className="mt-2 text-lg text-gris">{c.resumen}</p>}

      {c.formato !== "GALERIA" && c.portada && <Foto imagen={c.portada} />}
      {c.formato === "GALERIA" && c.imagenes.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {c.imagenes.map((i) => (
            // eslint-disable-next-line @next/next/no-img-element -- medio del propio panel
            <img
              key={i.src}
              src={i.src}
              alt={i.alt}
              className="aspect-[4/3] w-full rounded-md object-cover"
            />
          ))}
        </div>
      )}
      {c.formato === "DOCUMENTO" && c.adjunto && (
        <p className="mt-5 flex items-center gap-3 rounded-lg bg-superficie p-3">
          <FileText size={24} aria-hidden="true" className="shrink-0 text-marca-texto" />
          <span>
            <span className="block font-semibold text-tinta">{c.adjunto.nombre}</span>
            <span className="text-sm text-gris">PDF · {pesoLegible(c.adjunto.pesoBytes)}</span>
          </span>
        </p>
      )}
      {c.formato === "VIDEO" && video && (
        <div className="mt-5">
          {video.fuente === "ARCHIVO" ? (
            <video
              src={video.url}
              controls
              preload="metadata"
              poster={video.portada?.src}
              className="aspect-video w-full rounded-md bg-tinta"
            >
              {video.subtitulos && (
                <track
                  kind="captions"
                  src={video.subtitulos}
                  srcLang="es"
                  label="Español"
                  default
                />
              )}
            </video>
          ) : (
            <p className="flex aspect-video items-center justify-center gap-2 rounded-md bg-tinta px-4 text-center text-papel">
              <PlaySquare size={22} aria-hidden="true" />
              {enlace?.fuente === "YOUTUBE"
                ? `Video de YouTube (${idYoutube(enlace.url)}): el portal lo carga al pulsar reproducir.`
                : enlace
                  ? "Publicación de Instagram: el portal la abre en otra pestaña."
                  : "Enlace de video no válido."}
            </p>
          )}
        </div>
      )}

      {c.cuerpo && (
        <div
          className="cuerpo-noticia mt-6"
          // El HTML pasa por la misma lista blanca que usa el servidor.
          dangerouslySetInnerHTML={{ __html: sanearHtml(c.cuerpo) }}
        />
      )}

      {c.puntos && c.puntos.items.some((p) => p.titulo || p.texto) && (
        <section className="mt-6 rounded-lg bg-superficie p-4">
          {c.puntos.titulo && <h4 className="font-bold">{c.puntos.titulo}</h4>}
          <dl className="mt-2 space-y-2">
            {c.puntos.items.map((p, i) => (
              <div key={i}>
                <dt className="font-semibold text-tinta">{p.titulo}</dt>
                <dd className="text-cuerpo">{p.texto}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {c.boton?.texto && (
        <p className="mt-6">
          <span className="inline-flex min-h-11 items-center rounded-control bg-marca px-5 font-semibold text-sobre-marca">
            {c.boton.texto}
          </span>
        </p>
      )}
    </article>
  );
}

function Foto({ imagen }: { imagen: Imagen }) {
  return (
    <figure className="mt-5">
      {/* eslint-disable-next-line @next/next/no-img-element -- medio del propio panel */}
      <img
        src={imagen.src}
        alt={imagen.alt}
        className="aspect-video w-full rounded-md object-cover"
      />
      {(imagen.credito?.autor || imagen.ilustrativa) && (
        <figcaption className="mt-1.5 text-xs text-gris">
          {imagen.ilustrativa && "Foto ilustrativa. "}
          {imagen.credito?.autor &&
            `Foto: ${imagen.credito.autor}${imagen.credito.licencia ? ` (${imagen.credito.licencia})` : ""}.`}
        </figcaption>
      )}
    </figure>
  );
}
