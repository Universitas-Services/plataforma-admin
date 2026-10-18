import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EsqueletoPlataforma } from "@/components/ui/esqueletos";
import { BotonEntrar } from "@/components/panel/boton-entrar";
import { SiglaAlcaldia } from "@/components/panel/sigla-alcaldia";
import { EncabezadoPagina, InsigniaEstado } from "@/components/ui/piezas";
import { nombreCompleto } from "@/lib/plataforma/servicio";
import { almacen, exigirPermiso } from "@/lib/plataforma/sesion";

export const metadata: Metadata = { title: "Plataforma" };

export default function PlataformaPage() {
  return (
    <Suspense fallback={<EsqueletoPlataforma />}>
      <Contenido />
    </Suspense>
  );
}

const ACCION: Record<string, string> = {
  INICIO_SESION: "inició sesión",
  OPERAR_EN_ALCALDIA: "entró a operar en",
  ALCALDIA_CREADA: "creó la alcaldía",
  CUENTA_BLOQUEADA: "quedó bloqueada por intentos fallidos",
  CAMBIO_CONTRASENA: "cambió su contraseña",
  CERRAR_TODAS_SESIONES: "cerró todas sus sesiones",
  RESTABLECER_CONTRASENA: "restableció su contraseña",
  INVITACION_ACEPTADA: "aceptó su invitación",
};

const fecha = new Intl.DateTimeFormat("es-VE", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Caracas",
});

const corto = (nombre: string) => nombre.replace("Alcaldía del Municipio ", "");

async function Contenido() {
  const c = await exigirPermiso("plataforma.ver", "/plataforma");
  const alm = almacen();
  const alcaldias = [...alm.alcaldias.values()];
  const eventos = alm.bitacora.slice(-6).reverse();
  const activas = alcaldias.filter((a) => a.estado === "ACTIVA").length;

  return (
    <>
      <EncabezadoPagina
        titulo="Plataforma"
        bajada={`${alcaldias.length} alcaldías · ${activas} activas`}
      />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="alcaldias" className="min-w-0">
          <h2 id="alcaldias" className="mb-3 text-lg font-bold">
            Alcaldías
          </h2>
          <ul className="divide-y divide-fila rounded-lg border border-linea">
            {alcaldias.map((a) => {
              const d = alm.participaciones.get(a.id);
              const espera = d ? (d.conteos.PENDIENTE ?? 0) + (d.conteos.EN_REVISION ?? 0) : 0;
              return (
                <li
                  key={a.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 px-4 py-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]"
                >
                  <SiglaAlcaldia alcaldia={a} />
                  <div className="min-w-0">
                    <p className="font-semibold text-tinta">{a.nombre}</p>
                    <p className="text-sm text-gris">
                      {a.estado === "SUSPENDIDA"
                        ? a.motivoSuspension
                        : `${espera} participaciones por atender`}
                    </p>
                  </div>
                  <div className="col-span-2 flex flex-wrap items-center justify-between gap-3 sm:col-span-1 sm:contents">
                    <InsigniaEstado estado={a.estado} />
                    <BotonEntrar alcaldia={a.id} nombre={a.nombre} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
        <section aria-labelledby="actividad">
          <h2 id="actividad" className="mb-3 text-lg font-bold">
            Actividad reciente
          </h2>
          <ol className="space-y-3 border-l-2 border-linea pl-4">
            {eventos.map((e) => {
              const actor = alm.usuarios.get(e.actorId);
              const alc = e.alcaldiaId ? alm.alcaldias.get(e.alcaldiaId)?.nombre : undefined;
              return (
                <li key={e.id} className="text-sm">
                  <p className="text-tinta">
                    <strong className="font-semibold">
                      {actor ? nombreCompleto(actor) : "Alguien"}
                    </strong>{" "}
                    {ACCION[e.accion] ?? e.accion.toLowerCase()}
                    {alc && <> {corto(alc)}</>}
                  </p>
                  <time dateTime={e.fecha} className="text-gris">
                    {fecha.format(new Date(e.fecha))}
                  </time>
                </li>
              );
            })}
          </ol>
          {c.permisos.has("bitacora.global") && (
            <Link
              href="/plataforma/bitacora"
              className="mt-4 inline-block text-sm font-semibold text-marca-texto hover:underline"
            >
              Ver la bitácora global
            </Link>
          )}
        </section>
      </div>
    </>
  );
}
