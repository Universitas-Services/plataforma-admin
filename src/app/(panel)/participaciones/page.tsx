import { ClipboardList, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChipsEstado, ESTADOS_CHIP, type EstadoChip } from "@/components/panel/chips-estado";
import { FiltrosPlegables } from "@/components/panel/filtros-plegables";
import { LeyendaRecorrido } from "@/components/panel/recorrido";
import { TablaCola } from "@/components/panel/tabla-cola";
import { EncabezadoPagina, EstadoVacio } from "@/components/ui/piezas";
import { Selector } from "@/components/ui/selector";
import { almacen, exigirEnAlcaldia } from "@/lib/plataforma/sesion";

export const metadata: Metadata = { title: "Participaciones" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function ParticipacionesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-lg" />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

const sinTildes = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

async function Contenido({ searchParams }: { searchParams: SearchParams }) {
  const c = await exigirEnAlcaldia("participaciones.evaluar", "/participaciones");
  const sp = await searchParams;
  const estado = ESTADOS_CHIP.find(([e]) => e === sp.estado)?.[0] as EstadoChip | undefined;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const filtro = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const [tipo, parroquia, categoria] = [filtro("tipo"), filtro("parroquia"), filtro("categoria")];

  const datos = almacen().participaciones.get(c.alcaldia.id);
  const todas = datos?.cola ?? [];
  const opciones = (k: "tipo" | "parroquia" | "categoriaTecnica") =>
    [...new Set(todas.map((p) => p[k]))].sort((a, b) => a.localeCompare(b, "es"));
  const buscado = sinTildes(q);
  const cola = todas.filter(
    (p) =>
      (!estado || p.estado === estado) &&
      (!tipo || p.tipo === tipo) &&
      (!parroquia || p.parroquia === parroquia) &&
      (!categoria || p.categoriaTecnica === categoria) &&
      (!buscado || sinTildes(`${p.folio} ${p.autor}`).includes(buscado)),
  );
  const filtrando = !!(estado || q || tipo || parroquia || categoria);

  return (
    <>
      <EncabezadoPagina
        titulo="Participaciones"
        bajada="Aportes ciudadanos por atender, del más antiguo al más reciente."
      />

      <div className="mb-5 space-y-4">
        <ChipsEstado conteos={datos?.conteos ?? {}} activo={estado} q={q || undefined} />
        <form
          role="search"
          action="/participaciones"
          className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto] xl:items-end"
        >
          {estado && <input type="hidden" name="estado" value={estado} />}
          <div className="relative min-w-0 sm:col-span-2 xl:col-span-1">
            {/* Rótulo visual alineado con los de los selectores; el nombre accesible va en aria-label. */}
            <span
              aria-hidden="true"
              className="mb-1.5 hidden text-sm font-bold text-tinta sm:block"
            >
              Buscar
            </span>
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute bottom-3.5 left-3 text-gris"
            />
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              maxLength={80}
              placeholder="Folio o autor"
              aria-label="Buscar por folio o autor"
              className="h-11 w-full rounded-control border border-linea bg-papel pr-3 pl-9 text-tinta outline-none placeholder:text-tenue hover:border-tenue focus-visible:border-marca-texto"
            />
          </div>
          <FiltrosPlegables activos={[tipo, parroquia, categoria].filter(Boolean).length}>
            <Selector
              id="tipo"
              etiqueta="Tipo"
              opciones={opciones("tipo")}
              valorInicial={tipo}
              permitirVacio
              vacio="Todos"
            />
            <Selector
              id="parroquia"
              etiqueta="Parroquia"
              opciones={opciones("parroquia")}
              valorInicial={parroquia}
              permitirVacio
              vacio="Todas"
            />
            <Selector
              id="categoria"
              etiqueta="Categoría técnica"
              opciones={opciones("categoriaTecnica")}
              valorInicial={categoria}
              permitirVacio
              vacio="Todas"
            />
            <button
              type="submit"
              className="h-11 rounded-control border border-linea bg-papel px-5 text-sm font-semibold text-tinta hover:border-tenue"
            >
              Filtrar
            </button>
          </FiltrosPlegables>
        </form>
      </div>

      {cola.length ? (
        <>
          <TablaCola cola={cola} titulo="Participaciones por atender" />
          <div className="mt-3 space-y-3">
            <LeyendaRecorrido />
            <p className="text-sm text-gris">
              {cola.length} {cola.length === 1 ? "participación" : "participaciones"} en esta vista.
              Pronto podrás abrir cada una para revisarla, aprobarla, rechazarla o publicarla.
            </p>
          </div>
        </>
      ) : (
        <EstadoVacio
          Icono={ClipboardList}
          titulo={filtrando ? "Ninguna coincide con la búsqueda" : "Nada por atender"}
          accion={
            filtrando ? (
              <Link
                href="/participaciones"
                className="inline-flex min-h-10 items-center rounded-control border border-linea px-4 text-sm font-semibold text-tinta hover:border-tenue"
              >
                Quitar los filtros
              </Link>
            ) : undefined
          }
        >
          {filtrando
            ? "Prueba con otro estado, otro filtro o con parte del folio o del nombre."
            : "Cuando la ciudadanía envíe opiniones o propuestas desde el portal, aparecerán aquí con su folio y su recorrido."}
        </EstadoVacio>
      )}
    </>
  );
}
