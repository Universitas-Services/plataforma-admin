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
import { MAX_EN_PORTAL, listarBanners } from "@/lib/plataforma/banners";
import { VistaPreviaTarjeta } from "@/components/contenido/vista-previa-tarjeta";
import { almacen, exigirEnAlcaldia, idSesion, leerAviso } from "@/lib/plataforma/sesion";
import { usaApi } from "@/lib/api/cliente";
import { listarBannersApi } from "@/lib/api/banners";

export const metadata: Metadata = { title: "Tarjeta de transiciones" };

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
  const r = usaApi()
    ? await listarBannersApi(filtro)
    : listarBanners(almacen(), await idSesion(), filtro);
  if (r.estado !== "OK") return null;
  const aviso = await leerAviso();

  return (
    <>
      <EncabezadoPagina
        titulo="Contenido"
        bajada="Lo que tu alcaldía publica en el portal ciudadano."
        acciones={
          <BotonEnlace href="/contenido/banners/nuevo" variante="primario" Icono={Plus}>
            Nueva diapositiva
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
      <section aria-labelledby="titulo-tarjeta" className="mb-8">
        <h2 id="titulo-tarjeta" className="text-lg font-bold">
          Así se ve hoy en el Inicio del portal
        </h2>
        <p className="mt-1 mb-4 text-sm text-gris">
          La tarjeta con transiciones, bajo el termómetro. Muestra hasta {MAX_EN_PORTAL}{" "}
          diapositivas vigentes, en el orden de la lista.
          {r.conteos.VIGENTE > MAX_EN_PORTAL &&
            ` Hay ${r.conteos.VIGENTE} vigentes: las que pasan del puesto ${MAX_EN_PORTAL} no se ven.`}
        </p>
        <div className="max-w-2xl">
          <VistaPreviaTarjeta
            diapositivas={r.enPortal.map((b) => ({
              id: b.id,
              titulo: b.titulo,
              texto: b.texto,
              etiqueta: b.enlace.etiqueta,
              tono: b.tono,
              imagen: b.imagen ? { src: b.imagen.src, alt: b.imagen.alt } : undefined,
            }))}
          />
        </div>
      </section>
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
          titulo={filtro ? "Ninguna diapositiva en este estado" : "Todavía no hay diapositivas"}
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
            : "Las diapositivas pasan en la tarjeta con transiciones del Inicio, bajo el termómetro. Crea la primera con «Nueva diapositiva»."}
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
