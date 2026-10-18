import { GalleryHorizontal, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ChipsEstado } from "@/components/panel/chips-estado";
import { ListaBanners } from "@/components/contenido/lista-banners";
import { PestanasContenido } from "@/components/contenido/pestanas";
import { AvisoInicial } from "@/components/ui/aviso";
import { EsqueletoBandeja } from "@/components/ui/esqueletos";
import { BotonEnlace, EncabezadoPagina, EstadoVacio } from "@/components/ui/piezas";
import { VIGENCIAS, type Vigencia } from "@/lib/contenido/tipos";
import { listarBanners } from "@/lib/plataforma/banners";
import { almacen, exigirEnAlcaldia, idSesion, leerAviso } from "@/lib/plataforma/sesion";

export const metadata: Metadata = { title: "Banners" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const CHIPS = [
  ["VIGENTE", "Vigentes"],
  ["FUTURO", "Programados"],
  ["VENCIDO", "Vencidos"],
] as const satisfies readonly (readonly [Vigencia, string])[];

export default function BannersPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<EsqueletoBandeja />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

async function Contenido({ searchParams }: { searchParams: SearchParams }) {
  await exigirEnAlcaldia("contenido.editar", "/contenido/banners");
  const sp = await searchParams;
  const filtro = VIGENCIAS.find((v) => v === sp.vigencia);
  // La vigencia depende del día de hoy.
  await connection();
  const r = listarBanners(almacen(), await idSesion(), filtro);
  if (r.estado !== "OK") return null;
  const aviso = await leerAviso();

  return (
    <>
      <EncabezadoPagina
        titulo="Contenido"
        bajada="Lo que tu alcaldía publica en el portal ciudadano."
        acciones={
          <BotonEnlace href="/contenido/banners/nuevo" variante="primario" Icono={Plus}>
            Nuevo banner
          </BotonEnlace>
        }
      />
      <PestanasContenido />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Los chips usan ?vigencia= en lugar de ?estado=. */}
        <ChipsVigencia conteos={r.conteos} activo={filtro} />
        <p className="text-sm text-gris">
          {filtro
            ? "Muestra todos para cambiar el orden."
            : "Arrastra o usa las flechas para cambiar el orden. Los programados y vencidos conservan su lugar, pero no se muestran."}
        </p>
      </div>
      {r.items.length ? (
        <ListaBanners
          // Next conserva el estado de las rutas ya visitadas: si la lista cambió en el
          // servidor (alta, edición, baja), la clave nueva la vuelve a montar con los datos.
          key={`${filtro ?? "todos"}:${r.items.map((b) => `${b.id}.${b.actualizadoEl}`).join()}`}
          items={r.items}
          ordenable={!filtro}
        />
      ) : (
        <EstadoVacio
          Icono={GalleryHorizontal}
          titulo={filtro ? "Ningún banner en este estado" : "Todavía no hay banners"}
          accion={
            filtro ? (
              <Link
                href="/contenido/banners"
                className="inline-flex min-h-10 items-center rounded-control border border-linea px-4 text-sm font-semibold text-tinta hover:border-tenue"
              >
                Ver todos
              </Link>
            ) : undefined
          }
        >
          {filtro
            ? "Prueba con otro filtro."
            : "Los banners rotan en el Inicio del portal. Crea el primero con «Nuevo banner»."}
        </EstadoVacio>
      )}
      <AvisoInicial texto={aviso} />
    </>
  );
}

function ChipsVigencia({
  conteos,
  activo,
}: {
  conteos: Record<Vigencia, number>;
  activo?: Vigencia;
}) {
  return (
    <ChipsEstado
      conteos={conteos}
      activo={activo}
      estados={CHIPS}
      ruta="/contenido/banners"
      final="VIGENTE"
      parametro="vigencia"
    />
  );
}
