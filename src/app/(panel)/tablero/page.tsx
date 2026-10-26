import {
  CircleCheck,
  ClipboardList,
  FileText,
  Image as ImagenIcono,
  Megaphone,
  ListChecks,
  ScrollText,
  UserRound,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import { ALCALDIA } from "@/config/alcaldia";
import Link from "next/link";
import { Suspense } from "react";
import { Indicadores, SelectorRango } from "@/components/tablero/indicadores";
import { EsqueletoTablero } from "@/components/ui/esqueletos";
import { ChipsEstado } from "@/components/panel/chips-estado";
import { LeyendaRecorrido } from "@/components/panel/recorrido";
import { TablaCola } from "@/components/panel/tabla-cola";
import { EncabezadoPagina } from "@/components/ui/piezas";
import { connection } from "next/server";
import { crearNoticiaAccion } from "@/lib/plataforma/acciones-contenido";
import { esRango, indicadoresDe, rangoDe } from "@/lib/plataforma/metricas";
import { resumenParticipaciones } from "@/lib/plataforma/participaciones";
import { almacen, exigirEnAlcaldia, leerAviso } from "@/lib/plataforma/sesion";

export const metadata: Metadata = { title: "Tablero" };

export default function TableroPage({ searchParams }: PageProps<"/tablero">) {
  return (
    <Suspense fallback={<EsqueletoTablero />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

async function Contenido({ searchParams }: Pick<PageProps<"/tablero">, "searchParams">) {
  const c = await exigirEnAlcaldia("tablero.ver", "/tablero");
  const pedido = (await searchParams).rango;
  // La antigüedad de cada aporte y el rango dependen de la hora: se calculan al pedir la página.
  await connection();
  const alm = almacen();
  const datos = resumenParticipaciones(alm, c.alcaldia.id);
  const rango = rangoDe(esRango(pedido) ? pedido : "30d");
  const indicadores = indicadoresDe(alm, c.alcaldia.id, c.permisos, rango);
  const aviso = await leerAviso();
  const evalua = c.permisos.has("participaciones.evaluar");
  const accesos = [
    evalua && {
      href: "/participaciones",
      texto: "Bandeja de participaciones",
      Icono: ClipboardList,
    },
    c.permisos.has("contenido.editar") && {
      href: "/contenido/noticias",
      texto: "Nueva noticia",
      crea: true,
      Icono: Megaphone,
    },
    c.permisos.has("contenido.editar") && {
      href: "/contenido/inicio",
      texto: "Inicio del portal",
      Icono: ImagenIcono,
    },
    c.permisos.has("contenido.editar") && {
      href: "/contenido/documentos",
      texto: "Repositorio documental",
      Icono: FileText,
    },
    c.permisos.has("ciudadanos.ver") && {
      href: "/ciudadanos",
      texto: "Ciudadanos registrados",
      Icono: UserRound,
    },
    c.permisos.has("equipo.gestionar") && {
      href: "/equipo",
      texto: "Equipo de la alcaldía",
      Icono: Users,
    },
    c.permisos.has("configuracion.ver") && {
      href: "/configuracion",
      texto: "Catálogos y fases",
      Icono: ListChecks,
    },
    c.permisos.has("bitacora.ver") && { href: "/bitacora", texto: "Bitácora", Icono: ScrollText },
  ].filter(Boolean) as {
    href: string;
    texto: string;
    Icono: typeof ClipboardList;
    crea?: boolean;
  }[];

  return (
    <>
      <EncabezadoPagina titulo="Tablero" bajada={`${c.alcaldia.nombre} · ${ALCALDIA.programa}`} />

      {aviso && (
        <p
          role="status"
          className="mb-6 flex items-center gap-3 rounded-lg bg-turquesa/10 p-4 text-sm text-tinta ring-1 ring-turquesa/30 ring-inset"
        >
          <CircleCheck size={18} aria-hidden="true" className="shrink-0 text-turquesa-texto" />
          {aviso}
        </p>
      )}

      {evalua && datos && (
        <section aria-labelledby="estados" className="mb-8">
          <h2 id="estados" className="sr-only">
            Participaciones por estado
          </h2>
          <ChipsEstado conteos={datos.conteos} />
        </section>
      )}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
        {evalua && datos ? (
          <section aria-labelledby="antiguas" className="min-w-0">
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h2 id="antiguas" className="text-lg font-bold">
                Las que más esperan
              </h2>
              <Link
                href="/participaciones"
                className="text-sm font-semibold text-marca-texto hover:underline"
              >
                Ver la bandeja
              </Link>
            </div>
            {datos.cola.length ? (
              <>
                <TablaCola
                  compacta
                  cola={datos.cola.slice(0, 4)}
                  titulo="Las participaciones que más esperan"
                />
                <div className="mt-3">
                  <LeyendaRecorrido />
                </div>
              </>
            ) : (
              <p className="rounded-lg border border-dashed border-linea p-6 text-gris">
                No hay participaciones esperando. Las nuevas aparecen aquí apenas llegan del portal.
              </p>
            )}
          </section>
        ) : (
          <section className="min-w-0 rounded-lg bg-superficie p-6">
            <h2 className="text-lg font-bold">Tu trabajo en esta alcaldía</h2>
            <p className="mt-1 text-gris">
              Publicas el contenido del portal: noticias, documentos, lo que muestra el Inicio y el
              avance del proceso. Empieza por los accesos de la derecha.
            </p>
          </section>
        )}

        <nav aria-labelledby="accesos">
          <h2 id="accesos" className="mb-3 text-lg font-bold">
            Accesos rápidos
          </h2>
          <ul className="divide-y divide-fila rounded-lg border border-linea">
            {accesos.map(({ href, texto, Icono, crea }) => (
              <li key={texto}>
                {crea ? (
                  // Crea el borrador y abre el editor de una vez.
                  <form action={crearNoticiaAccion}>
                    <button
                      type="submit"
                      className="flex min-h-12 w-full items-center gap-3 px-4 text-left font-medium text-tinta hover:bg-superficie"
                    >
                      <Icono size={18} aria-hidden="true" className="text-marca-texto" />
                      {texto}
                    </button>
                  </form>
                ) : (
                  <Link
                    href={href}
                    className="flex min-h-12 items-center gap-3 px-4 font-medium text-tinta hover:bg-superficie"
                  >
                    <Icono size={18} aria-hidden="true" className="text-marca-texto" />
                    {texto}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <section aria-labelledby="indicadores" className="mt-12 border-t border-linea pt-8">
        <h2 id="indicadores" className="mb-4 text-xl font-bold">
          Indicadores
        </h2>
        <div className="mb-6">
          <SelectorRango actual={rango.clave} />
        </div>
        <Indicadores rango={rango} datos={indicadores} />
      </section>
    </>
  );
}
