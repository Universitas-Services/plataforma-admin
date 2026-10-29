import {
  ArrowLeft,
  Building2,
  ExternalLink,
  FileText,
  Lock,
  Newspaper,
  UserRound,
  Video,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { Alcance } from "@/components/contenido/alcance";
import { MapaUbicacion } from "@/components/revisor/mapa-ubicacion";
import { AccionesEstado, NuevaNota } from "@/components/revisor/panel-revisor";
import { EsqueletoEditor } from "@/components/ui/esqueletos";
import { EstadoVacio, InsigniaEstado } from "@/components/ui/piezas";
import { usaApi } from "@/lib/api/cliente";
import { totalesDe } from "@/lib/plataforma/inicio";
import { tieneSeguimiento, transicionesValidas } from "@/lib/plataforma/participaciones";
import { leerParticipacion } from "@/lib/plataforma/participaciones-datos";
import { almacen, exigirEnAlcaldia } from "@/lib/plataforma/sesion";
import {
  AUTOR_ANONIMO,
  MOTIVOS_RECHAZO,
  TIPOS_PARTICIPACION,
  type Participacion,
} from "@/lib/plataforma/tipos";
import { participacionesDemo } from "@/lib/plataforma/fixtures-participaciones";

export const metadata: Metadata = { title: "Detalle del aporte" };

/** Folios secuenciales por año (IRI-2026-0001…), como los da plataforma-api. */
const folios = (anio: number, cuantos: number) =>
  Array.from({ length: cuantos }, (_, i) => `IRI-${anio}-${String(i + 1).padStart(4, "0")}`);

/*
 * Los folios de ejemplo y los primeros reales de 2026 y 2027 (los mismos que precompila el
 * portal): en Netlify, un folio que no se generó al compilar devuelve 500 (el adaptador aún no
 * sirve el App Shell de los parámetros no listados de Next 16.3+).
 */
export function generateStaticParams() {
  const todos = new Set([
    ...participacionesDemo(0).map(({ folio }) => folio),
    ...folios(2026, 600),
    ...folios(2027, 300),
  ]);
  return [...todos].map((folio) => ({ folio }));
}

/** La ruta que pide la URL firmada de un archivo del aporte y redirige a ella (con la API). */
const rutaArchivo = (folio: string, id: string, tipo: "adjunto" | "documento") =>
  `/participaciones/${encodeURIComponent(folio)}/archivo/${encodeURIComponent(id)}?tipo=${tipo}`;

const fechaHora = new Intl.DateTimeFormat("es-VE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Caracas",
});
const fecha = (iso: string) => fechaHora.format(new Date(iso));
const peso = (b: number) =>
  b >= 1_048_576
    ? `${(b / 1_048_576).toFixed(1).replace(".", ",")} MB`
    : `${Math.round(b / 1024)} KB`;

const DOCUMENTO = {
  IDENTIDAD: "Documento de identidad",
  REPRESENTACION: "Acreditación del representante",
  ENTIDAD: "Documento de la organización",
};

export default function DetalleAportePage({ params }: PageProps<"/participaciones/[folio]">) {
  return (
    <Suspense fallback={<EsqueletoEditor />}>
      <Contenido params={params} />
    </Suspense>
  );
}

function Bloque({ titulo, children, id }: { titulo: string; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="rounded-lg border border-linea bg-papel p-5">
      <h2 id={id} className="mb-3 text-base font-bold text-tinta">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Dato({ k, v }: { k: string; v?: ReactNode }) {
  if (!v) return null;
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-gris uppercase">{k}</dt>
      <dd className="mt-0.5 break-words text-tinta">{v}</dd>
    </div>
  );
}

async function Contenido({ params }: { params: Promise<{ folio: string }> }) {
  const { folio } = await params;
  const c = await exigirEnAlcaldia("participaciones.evaluar", `/participaciones/${folio}`);
  await connection();
  const p = await leerParticipacion(c.alcaldia.id, decodeURIComponent(folio));

  if (!p) {
    return (
      <EstadoVacio
        Icono={FileText}
        titulo="No encontramos este aporte"
        accion={
          <Link
            href="/participaciones"
            className="inline-flex min-h-10 items-center rounded-control border border-linea px-4 text-sm font-semibold text-tinta hover:border-tenue"
          >
            Volver a la bandeja
          </Link>
        }
      >
        Puede que el folio no exista.
      </EstadoVacio>
    );
  }

  const quien = (por?: { nombre: string }) => por?.nombre ?? "Sistema";
  // Con la API, los botones y los totales vienen en el detalle; en la simulación, del almacén.
  const transiciones = p.transiciones ?? transicionesValidas(p);
  const totales = p.totales ?? (usaApi() ? undefined : totalesDe(almacen(), `aporte:${p.folio}`));
  /** URL de una foto o del soporte: la pública del ejemplo o la ruta firmada. */
  const urlDe = (f: { id?: string; url?: string }) =>
    f.url ?? (f.id ? rutaArchivo(p.folio, f.id, "adjunto") : undefined);
  const soporte = p.soporte && urlDe(p.soporte);

  return (
    <>
      <Link
        href="/participaciones"
        className="mb-4 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-marca-texto hover:underline"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Bandeja de participaciones
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-gris">
            {TIPOS_PARTICIPACION[p.tipo]} · recibido el {fecha(p.recibidaEl)}
            {p.ejemplo && " · aporte de ejemplo"}
          </p>
          <h1 className="mt-1 text-[1.75rem] leading-tight font-bold tabular-nums">{p.folio}</h1>
        </div>
        <InsigniaEstado estado={p.estado} tipo={p.tipo} />
      </div>

      <div className="mb-6 rounded-lg border border-linea bg-cabecera p-5">
        <h2 className="mb-1 text-base font-bold text-tinta">
          {tieneSeguimiento(p.tipo) ? "Decisión sobre la propuesta" : "Publicación de la opinión"}
        </h2>
        <p className="mb-4 text-sm text-gris">
          {tieneSeguimiento(p.tipo)
            ? "La propuesta formal tiene seguimiento: el ciudadano ve cada estado y el motivo si se rechaza."
            : "Las opiniones no tienen seguimiento: el ciudadano la ve «Recibida» hasta que la publiques en el portal."}
        </p>
        <AccionesEstado
          folio={p.folio}
          tipo={p.tipo}
          estado={p.estado}
          transiciones={transiciones}
          mostrarNombre={p.mostrarNombre}
        />
        {p.estado === "PUBLICADA" && totales && (
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-linea pt-4 text-sm text-gris">
            En el portal:
            <Alcance totales={totales} />
          </p>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Bloque titulo="El aporte" id="aporte">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Dato k="Parroquia" v={p.parroquia} />
              <Dato k="Sector" v={p.sector} />
              <Dato k="Categoría técnica" v={p.categoriaTecnica} />
              <Dato
                k="Nombre público"
                v={p.mostrarNombre ? "Sí, con su nombre" : `No, como «${AUTOR_ANONIMO}»`}
              />
            </dl>
            {p.noticia && (
              <p className="mt-4 flex items-start gap-2 rounded-control bg-superficie p-3 text-sm text-tinta">
                <Newspaper size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-gris" />
                <span>
                  Sobre la noticia: <strong className="font-semibold">{p.noticia.titulo}</strong>
                </span>
              </p>
            )}
            <p className="mt-4 leading-relaxed whitespace-pre-line text-cuerpo">{p.descripcion}</p>

            {p.imagenes.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-bold text-tinta">Fotos ({p.imagenes.length})</h3>
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {p.imagenes.map((f, i) => (
                    <li key={f.id ?? `${f.nombre}-${i}`}>
                      {urlDe(f) ? (
                        <a
                          href={urlDe(f)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- archivo del aporte (URL firmada) */}
                          <img
                            src={urlDe(f)}
                            alt={`Foto del aporte: ${f.nombre}`}
                            loading="lazy"
                            className="aspect-[4/3] w-full rounded-control border border-linea bg-superficie object-cover"
                          />
                          <span className="sr-only"> (se abre en otra pestaña)</span>
                        </a>
                      ) : (
                        <span className="grid aspect-[4/3] place-items-center rounded-control border border-dashed border-linea text-xs text-gris">
                          {f.nombre}
                        </span>
                      )}
                      {f.credito && <p className="mt-1 text-xs text-gris">Foto: {f.credito}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {p.video && (
              <p className="mt-5 flex items-center gap-2 text-sm">
                <Video size={16} aria-hidden="true" className="text-gris" />
                Video en {p.video.fuente === "YOUTUBE" ? "YouTube" : "Instagram"}:{" "}
                <a
                  href={p.video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold break-all text-marca-texto hover:underline"
                >
                  abrir enlace
                  <ExternalLink size={14} aria-hidden="true" />
                  <span className="sr-only"> (se abre en otra pestaña)</span>
                </a>
              </p>
            )}

            {p.soporte && (
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-bold text-tinta">Documento de soporte</h3>
                <p className="mb-2 text-sm text-gris">
                  {p.soporte.nombre} · {peso(p.soporte.tamano)}
                </p>
                {soporte && (
                  <>
                    <iframe
                      src={soporte}
                      title={`Documento de soporte de ${p.folio}`}
                      loading="lazy"
                      className="h-96 w-full rounded-control border border-linea"
                    />
                    <a
                      href={soporte}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-marca-texto hover:underline"
                    >
                      Abrir el documento
                      <ExternalLink size={14} aria-hidden="true" />
                      <span className="sr-only"> (se abre en otra pestaña)</span>
                    </a>
                  </>
                )}
              </div>
            )}
          </Bloque>

          {p.codigoVerificacion && (
            <Bloque titulo="Acuse de recibo" id="acuse">
              <p className="mb-3 text-sm text-gris">
                Lo recibió el ciudadano al enviar el aporte: con estos datos puede probar qué envió
                y cuándo.
              </p>
              <dl className="grid gap-3">
                <Dato k="Código de verificación" v={p.codigoVerificacion} />
                <Dato
                  k="Huella del contenido (SHA-256)"
                  v={
                    <span className="font-mono text-sm [overflow-wrap:anywhere]">
                      {p.hashContenido}
                    </span>
                  }
                />
              </dl>
            </Bloque>
          )}

          {p.ubicacion && (
            <Bloque titulo="Ubicación" id="ubicacion">
              <MapaUbicacion punto={p.ubicacion} />
            </Bloque>
          )}

          <Bloque titulo="Historial de estados" id="historial">
            <ol className="space-y-4">
              {p.historial.map((h, i) => (
                <li key={`${h.estado}-${i}`} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 size-2.5 shrink-0 rounded-full bg-marca"
                  />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <InsigniaEstado estado={h.estado} />
                      <span className="text-sm text-gris">
                        {fecha(h.fecha)} · {quien(h.por)}
                      </span>
                    </p>
                    {h.motivo && (
                      <p className="mt-1 text-sm font-semibold text-peligro">
                        Motivo: {MOTIVOS_RECHAZO[h.motivo]}
                      </p>
                    )}
                    {h.comentario && <p className="mt-1 text-sm text-cuerpo">{h.comentario}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Bloque>
        </div>

        <div className="min-w-0 space-y-6">
          <Bloque titulo="Datos del autor" id="autor">
            <Autor p={p} />
          </Bloque>

          <Bloque titulo="Notas internas" id="notas">
            <p className="mb-3 flex items-center gap-1.5 text-sm text-gris">
              <Lock size={14} aria-hidden="true" />
              Solo las ve el equipo de la alcaldía.
            </p>
            {p.notas.length > 0 && (
              <ul className="mb-4 space-y-3">
                {p.notas.map((n) => (
                  <li key={n.id} className="rounded-control bg-superficie p-3 text-sm">
                    <p className="text-cuerpo">{n.texto}</p>
                    <p className="mt-1 text-xs text-gris">
                      {quien(n.por)} · {fecha(n.fecha)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <NuevaNota folio={p.folio} />
          </Bloque>
        </div>
      </div>
    </>
  );
}

function Autor({ p }: { p: Participacion }) {
  const a = p.autor;
  const Icono = a.tipo === "ORGANIZACION" ? Building2 : UserRound;
  return (
    <div>
      <p className="flex items-center gap-2 font-semibold text-tinta">
        <Icono size={18} aria-hidden="true" className="text-gris" />
        {a.nombre}
      </p>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <Dato
          k="Tipo de cuenta"
          v={a.tipo === "ORGANIZACION" ? "Organización" : "Persona natural"}
        />
        <Dato k="Cédula" v={a.cedula} />
        <Dato k="RIF" v={a.rif} />
        <Dato k="Tipo de entidad" v={a.tipoEntidad} />
        <Dato k="Correo" v={a.correo} />
        <Dato k="Teléfono" v={a.telefono} />
        <Dato k="Ocupación" v={a.ocupacion} />
        {a.representante && (
          <Dato
            k="Representante"
            v={`${a.representante.nombre} · ${a.representante.cedula} · ${a.representante.condicion}`}
          />
        )}
      </dl>
      <h3 className="mt-4 mb-2 text-sm font-bold text-tinta">Documentos</h3>
      <ul className="space-y-2">
        {a.documentos.map((d) => (
          <li
            key={d.id ?? d.tipo}
            className="flex items-center gap-3 rounded-control border border-linea px-3 py-2 text-sm"
          >
            <FileText size={16} aria-hidden="true" className="shrink-0 text-gris" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-tinta">{DOCUMENTO[d.tipo]}</span>
              <span className="block truncate text-gris">
                {d.nombre} · versión {d.version}
              </span>
            </span>
            {d.id && (
              <a
                href={rutaArchivo(p.folio, d.id, "documento")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 shrink-0 items-center gap-1 font-semibold text-marca-texto hover:underline"
              >
                Ver
                <ExternalLink size={14} aria-hidden="true" />
                <span className="sr-only">
                  {" "}
                  {DOCUMENTO[d.tipo].toLowerCase()} (se abre en otra pestaña; queda en la bitácora)
                </span>
              </a>
            )}
          </li>
        ))}
      </ul>
      {a.documentos.some((d) => d.id) ? (
        <p className="mt-2 text-xs text-gris">Cada documento que abres queda en la bitácora.</p>
      ) : (
        p.ejemplo && (
          <p className="mt-2 text-xs text-gris">Archivos de ejemplo: sin vista previa.</p>
        )
      )}
    </div>
  );
}
