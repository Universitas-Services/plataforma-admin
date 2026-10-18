import {
  ClipboardList,
  FileText,
  Image as ImagenIcono,
  Megaphone,
  Palette,
  ScrollText,
  UserRound,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChipsEstado } from "@/components/panel/chips-estado";
import { LeyendaRecorrido } from "@/components/panel/recorrido";
import { TablaCola } from "@/components/panel/tabla-cola";
import { EncabezadoPagina } from "@/components/ui/piezas";
import { almacen, exigirEnAlcaldia } from "@/lib/plataforma/sesion";

export const metadata: Metadata = { title: "Tablero" };

export default function TableroPage() {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-lg" />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  const c = await exigirEnAlcaldia("tablero.ver", "/tablero");
  const datos = almacen().participaciones.get(c.alcaldia.id);
  const evalua = c.permisos.has("participaciones.evaluar");
  const accesos = [
    evalua && {
      href: "/participaciones",
      texto: "Bandeja de participaciones",
      Icono: ClipboardList,
    },
    c.permisos.has("contenido.editar") && {
      href: "/contenido",
      texto: "Nueva noticia",
      Icono: Megaphone,
    },
    c.permisos.has("contenido.editar") && {
      href: "/contenido",
      texto: "Banners del inicio",
      Icono: ImagenIcono,
    },
    c.permisos.has("contenido.editar") && {
      href: "/contenido",
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
    c.permisos.has("marca.configurar") && {
      href: "/configuracion",
      texto: "Marca y catálogos",
      Icono: Palette,
    },
    c.permisos.has("bitacora.ver") && { href: "/bitacora", texto: "Bitácora", Icono: ScrollText },
  ].filter(Boolean) as { href: string; texto: string; Icono: typeof ClipboardList }[];

  return (
    <>
      <EncabezadoPagina
        titulo="Tablero"
        bajada={`${c.alcaldia.nombre}${c.alcaldia.marca?.lema ? ` · ${c.alcaldia.marca.lema}` : ""}`}
      />

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
              Publicas el contenido del portal: noticias, banners y documentos. Empieza por los
              accesos de la derecha.
            </p>
          </section>
        )}

        <nav aria-labelledby="accesos">
          <h2 id="accesos" className="mb-3 text-lg font-bold">
            Accesos rápidos
          </h2>
          <ul className="divide-y divide-fila rounded-lg border border-linea">
            {accesos.map(({ href, texto, Icono }) => (
              <li key={texto}>
                <Link
                  href={href}
                  className="flex min-h-12 items-center gap-3 px-4 font-medium text-tinta hover:bg-superficie"
                >
                  <Icono size={18} aria-hidden="true" className="text-marca-texto" />
                  {texto}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}
