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
import { AccionesEstado, CotejoIdentidad, NuevaNota } from "@/components/revisor/panel-revisor";
import { EsqueletoEditor } from "@/components/ui/esqueletos";
import { EstadoVacio, InsigniaEstado } from "@/components/ui/piezas";
import { participacionDe, transicionesValidas } from "@/lib/plataforma/participaciones";
import { nombreCompleto } from "@/lib/plataforma/servicio";
import { almacen, exigirEnAlcaldia } from "@/lib/plataforma/sesion";
import { MOTIVOS_RECHAZO, TIPOS_PARTICIPACION, type Participacion } from "@/lib/plataforma/tipos";

export const metadata: Metadata = { title: "Detalle del aporte" };

/** Con Cache Components, una ruta dinámica necesita al menos un parámetro conocido. */
export function generateStaticParams() {
  return [{ folio: "IRI-2026-0031" }];
}

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
  const alm = almacen();
  const p = participacionDe(alm, c.alcaldia.id, decodeURIComponent(folio));

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
        Puede que el folio no exista o que sea de otra alcaldía.
      </EstadoVacio>
    );
  }

  const quien = (id?: string) => {
    const u = id ? alm.usuarios.get(id) : undefined;
    return u ? nombreCompleto(u) : "Sistema";
  };

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
        <InsigniaEstado estado={p.estado} />
      </div>

      <div className="mb-6 rounded-lg border border-linea bg-cabecera p-5">
        <h2 className="mb-3 text-base font-bold text-tinta">Acciones</h2>
        <AccionesEstado
          folio={p.folio}
          estado={p.estado}
          transiciones={transicionesValidas(p)}
          mostrarNombre={p.mostrarNombre}
          identidad={p.identidad?.resultado}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Bloque titulo="El aporte" id="aporte">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Dato k="Parroquia" v={p.parroquia} />
              <Dato k="Sector" v={p.sector} />
              <Dato k="Categoría técnica" v={p.categoriaTecnica} />
              <Dato k="Nombre público" v={p.mostrarNombre ? "Autorizado" : "No autorizado"} />
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
                  {p.imagenes.map((f) => (
                    <li key={f.nombre}>
                      {f.url ? (
                        <a href={f.url} target="_blank" rel="noopener noreferrer" className="block">
                          {/* eslint-disable-next-line @next/next/no-img-element -- archivo del aporte */}
                          <img
                            src={f.url}
                            alt={`Foto del aporte: ${f.nombre}`}
                            className="aspect-[4/3] w-full rounded-control border border-linea object-cover"
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
                {p.soporte.url && (
                  <iframe
                    src={p.soporte.url}
                    title={`Documento de soporte de ${p.folio}`}
                    className="h-96 w-full rounded-control border border-linea"
                  />
                )}
              </div>
            )}
          </Bloque>

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
          <Bloque titulo="Identidad del autor" id="identidad">
            <Autor p={p} />
            <div className="mt-5 border-t border-fila pt-4">
              <CotejoIdentidad folio={p.folio} actual={p.identidad} />
            </div>
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
      <h3 className="mt-4 mb-2 text-sm font-bold text-tinta">Documentos para cotejar</h3>
      <ul className="space-y-2">
        {a.documentos.map((d) => (
          <li
            key={d.tipo}
            className="flex items-center gap-3 rounded-control border border-linea px-3 py-2 text-sm"
          >
            <FileText size={16} aria-hidden="true" className="shrink-0 text-gris" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-tinta">{DOCUMENTO[d.tipo]}</span>
              <span className="block truncate text-gris">
                {d.nombre} · versión {d.version}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-gris">
        Archivos de ejemplo: la vista previa de los documentos llega con la API (URL firmada).
      </p>
    </div>
  );
}
