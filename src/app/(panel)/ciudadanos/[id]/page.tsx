import { ArrowLeft, Building2, ExternalLink, FileText, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { AnonimizarCuenta } from "@/components/alcaldia/anonimizar";
import { CambiarMembresia } from "@/components/alcaldia/membresia";
import { EsqueletoEditor } from "@/components/ui/esqueletos";
import { EstadoVacio, InsigniaEstado } from "@/components/ui/piezas";
import { leerCiudadano } from "@/lib/plataforma/ciudadanos-datos";
import { exigirEnAlcaldia } from "@/lib/plataforma/sesion";
import { TIPOS_PARTICIPACION } from "@/lib/plataforma/tipos";
import { ciudadanosDemo } from "@/lib/plataforma/fixtures-alcaldia";
import { participacionesDemo } from "@/lib/plataforma/fixtures-participaciones";

export const metadata: Metadata = { title: "Ficha del ciudadano" };

/*
 * Todos los ids de ejemplo: en Netlify, un id que no se generó al compilar devuelve 500 (el
 * adaptador aún no sirve el App Shell de los parámetros no listados de Next 16.3+). Con
 * plataforma-api los ids son UUID, como en las noticias: revisar en el deploy que abrir una ficha
 * real no dé 500.
 */
export function generateStaticParams() {
  return ciudadanosDemo(participacionesDemo(0), 0).map(({ id }) => ({ id }));
}

const fechaCorta = new Intl.DateTimeFormat("es-VE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Caracas",
});
const fecha = (iso: string) => fechaCorta.format(new Date(iso));

const DOCUMENTO = {
  IDENTIDAD: "Documento de identidad",
  REPRESENTACION: "Acreditación del representante",
  ENTIDAD: "Documento de la organización",
};

export default function CiudadanoPage({ params }: PageProps<"/ciudadanos/[id]">) {
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

async function Contenido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await exigirEnAlcaldia("ciudadanos.ver", `/ciudadanos/${id}`);
  await connection();
  const x = await leerCiudadano(c.alcaldia.id, decodeURIComponent(id));

  if (!x) {
    return (
      <EstadoVacio
        Icono={UserRound}
        titulo="No encontramos este registro"
        accion={
          <Link
            href="/ciudadanos"
            className="inline-flex min-h-10 items-center rounded-control border border-linea px-4 text-sm font-semibold text-tinta hover:border-tenue"
          >
            Volver a Ciudadanos
          </Link>
        }
      >
        Puede que no exista o que se haya eliminado.
      </EstadoVacio>
    );
  }

  const aportes = x.participaciones ?? [];
  const anonimizada = !!x.anonimizadoEl;
  const puedeSuspender = c.permisos.has("ciudadanos.suspender");
  const puedeEvaluar = c.permisos.has("participaciones.evaluar");
  const suspendida = x.membresia.estado === "SUSPENDIDA";
  const Icono = x.tipo === "ORGANIZACION" ? Building2 : UserRound;

  return (
    <>
      <Link
        href="/ciudadanos"
        className="mb-4 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-marca-texto hover:underline"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Ciudadanos
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm text-gris">
            <Icono size={16} aria-hidden="true" />
            {x.tipo === "ORGANIZACION" ? "Organización" : "Persona natural"} · registrado el{" "}
            {fecha(x.registradoEl)}
            {x.ejemplo && " · registro de ejemplo"}
          </p>
          <h1 className="mt-1 text-[1.75rem] leading-tight font-bold break-words">{x.nombre}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {anonimizada ? (
            <span className="inline-flex items-center rounded-full border border-tenue px-2.5 py-0.5 text-[0.8125rem] font-semibold text-gris">
              Cuenta anonimizada
            </span>
          ) : (
            <InsigniaEstado estado={x.membresia.estado} />
          )}
          {puedeSuspender && !anonimizada && (
            <CambiarMembresia id={x.id} nombre={x.nombre} suspendida={suspendida} />
          )}
        </div>
      </div>

      {anonimizada && x.anonimizadoEl && (
        <p className="mb-6 rounded-control border border-linea bg-superficie p-3 text-sm text-tinta">
          <strong>Cuenta anonimizada el {fecha(x.anonimizadoEl)}</strong>, a pedido de la persona.
          Sus datos personales se borraron; sus aportes se conservan con su folio.
        </p>
      )}

      {!anonimizada && x.bajaSolicitadaEl && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-control border border-peligro/30 bg-peligro-suave p-4 text-sm text-tinta">
          <p>
            <strong>Pidió la baja el {fecha(x.bajaSolicitadaEl)}.</strong> Mientras no la atiendas,
            puede seguir entrando al portal.
          </p>
          {puedeSuspender && <AnonimizarCuenta id={x.id} nombre={x.nombre} />}
        </div>
      )}

      {suspendida && x.membresia.motivo && (
        <p className="mb-6 rounded-control border border-peligro/30 bg-peligro-suave p-3 text-sm text-tinta">
          <strong>Suspendida desde el {fecha(x.membresia.desde)}.</strong> Motivo:{" "}
          {x.membresia.motivo}
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-5">
          <Bloque titulo="Datos del perfil" id="perfil">
            {!x.perfilCompleto && !anonimizada && (
              <p className="mb-3 text-sm text-ambar-texto">
                Perfil incompleto: puede opinar, pero aún no puede enviar propuestas formales.
              </p>
            )}
            <dl className="grid gap-3 sm:grid-cols-2">
              <Dato k="Cédula" v={x.cedula} />
              <Dato k="RIF" v={x.rif} />
              <Dato k="Tipo de entidad" v={x.tipoEntidad} />
              <Dato k="Correo" v={x.correo} />
              <Dato k="Teléfono" v={x.telefono} />
              <Dato k="Ocupación" v={x.ocupacion} />
              {x.representante && (
                <Dato
                  k="Representante"
                  v={`${x.representante.nombre} · ${x.representante.cedula} · ${x.representante.condicion}`}
                />
              )}
            </dl>
          </Bloque>

          <Bloque titulo={`Aportes (${aportes.length})`} id="aportes">
            {aportes.length ? (
              <ul className="divide-y divide-fila">
                {aportes.map((p) => (
                  <li
                    key={p.folio}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <span className="min-w-0">
                      {puedeEvaluar ? (
                        <Link
                          href={`/participaciones/${p.folio}`}
                          className="font-semibold text-marca-texto tabular-nums hover:underline"
                        >
                          {p.folio}
                        </Link>
                      ) : (
                        <span className="font-semibold tabular-nums">{p.folio}</span>
                      )}
                      <span className="block text-sm text-gris">
                        {TIPOS_PARTICIPACION[p.tipo]} · {fecha(p.recibidaEl)}
                      </span>
                    </span>
                    <InsigniaEstado estado={p.estado} tipo={p.tipo} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gris">Todavía no ha enviado aportes.</p>
            )}
          </Bloque>
        </div>

        <Bloque titulo="Documentos" id="documentos">
          {x.documentos.length ? (
            <ul className="space-y-2">
              {x.documentos.map((d) => (
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
                      href={`/ciudadanos/${encodeURIComponent(x.id)}/documento/${encodeURIComponent(d.id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 shrink-0 items-center gap-1 font-semibold text-marca-texto hover:underline"
                    >
                      Ver
                      <ExternalLink size={14} aria-hidden="true" />
                      <span className="sr-only">
                        {" "}
                        {DOCUMENTO[d.tipo].toLowerCase()} (se abre en otra pestaña; queda en la
                        bitácora)
                      </span>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gris">No ha cargado documentos.</p>
          )}
          {x.documentos.some((d) => d.id) ? (
            <p className="mt-3 text-xs text-gris">Cada documento que abres queda en la bitácora.</p>
          ) : (
            x.ejemplo && (
              <p className="mt-3 text-xs text-gris">Archivos de ejemplo: sin vista previa.</p>
            )
          )}
        </Bloque>
      </div>
    </>
  );
}
