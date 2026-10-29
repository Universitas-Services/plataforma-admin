import { ChevronLeft, ChevronRight, ClipboardList, Download, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EsqueletoBandeja } from "@/components/ui/esqueletos";
import { ChipsEstado } from "@/components/panel/chips-estado";
import { FiltrosPlegables } from "@/components/panel/filtros-plegables";
import { LeyendaRecorrido } from "@/components/panel/recorrido";
import { TablaCola } from "@/components/panel/tabla-cola";
import { EncabezadoPagina, EstadoVacio } from "@/components/ui/piezas";
import { Selector } from "@/components/ui/selector";
import { SelectorFecha } from "@/components/ui/selector-fecha";
import { conActual, valoresActivos } from "@/lib/plataforma/catalogos-activos";
import { filtrosDeBandeja } from "@/lib/plataforma/filtros-bandeja";
import { ORDENES_BANDEJA } from "@/lib/plataforma/participaciones";
import { leerBandeja } from "@/lib/plataforma/participaciones-datos";
import { exigirEnAlcaldia } from "@/lib/plataforma/sesion";
import { TIPOS_PARTICIPACION, type TipoParticipacion } from "@/lib/plataforma/tipos";

export const metadata: Metadata = { title: "Participaciones" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function ParticipacionesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<EsqueletoBandeja />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

async function Contenido({ searchParams }: { searchParams: SearchParams }) {
  const c = await exigirEnAlcaldia("participaciones.evaluar", "/participaciones");
  // La antigüedad de cada aporte depende de la hora: se calcula al pedir la página.
  await connection();
  const { filtros, pagina, qs } = filtrosDeBandeja(await searchParams);
  const {
    estado,
    q = "",
    tipo = "",
    parroquia = "",
    categoria = "",
    desde = "",
    hasta = "",
  } = filtros;
  const [datos, parroquias, categorias] = await Promise.all([
    leerBandeja(c.alcaldia.id, filtros, pagina),
    valoresActivos("parroquias", c.alcaldia.id),
    valoresActivos("categoriasTecnicas", c.alcaldia.id),
  ]);
  const cola = datos.filas;
  const filtrando = !!(estado || q || tipo || parroquia || categoria || desde || hasta);
  /** Enlace a otra página con los mismos filtros. */
  const aPagina = (n: number) => {
    const p = new URLSearchParams(qs);
    if (n > 1) p.set("pagina", String(n));
    const t = p.toString();
    return `/participaciones${t ? `?${t}` : ""}`;
  };

  return (
    <>
      <EncabezadoPagina
        titulo="Participaciones"
        bajada={
          filtros.orden === "recientes"
            ? "Del aporte más reciente al más antiguo."
            : filtros.orden === "antiguas"
              ? "Del aporte más antiguo al más reciente."
              : "Primero lo que espera evaluación, del aporte más antiguo al más reciente."
        }
        acciones={
          <a
            href={`/participaciones/exportar${qs ? `?${qs}` : ""}`}
            className="inline-flex min-h-10 items-center gap-2 rounded-control border border-linea bg-papel px-4 text-sm font-semibold text-tinta hover:border-tenue"
          >
            <Download size={16} aria-hidden="true" />
            Exportar CSV
          </a>
        }
      />

      <div className="mb-5 space-y-4">
        <ChipsEstado
          conteos={datos.conteos.estado}
          activo={estado}
          q={q || undefined}
          conservar={{ tipo, parroquia, categoria, desde, hasta, orden: filtros.orden }}
        />
        <form
          role="search"
          action="/participaciones"
          className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]"
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
              placeholder="Folio, autor o cédula"
              aria-label="Buscar por folio, autor o cédula"
              className="h-11 w-full rounded-control border border-linea bg-papel pr-3 pl-9 text-tinta outline-none placeholder:text-tenue hover:border-tenue focus-visible:border-marca-texto"
            />
          </div>
          <FiltrosPlegables
            activos={
              [tipo, parroquia, categoria, desde, hasta, filtros.orden].filter(Boolean).length
            }
          >
            <Selector
              id="tipo"
              etiqueta="Tipo"
              opciones={Object.entries(TIPOS_PARTICIPACION).map(([valor, texto]) => ({
                valor,
                texto: `${texto} (${datos.conteos.tipo[valor as TipoParticipacion] ?? 0})`,
              }))}
              valorInicial={tipo}
              permitirVacio
              vacio="Todos"
            />
            <Selector
              id="parroquia"
              etiqueta="Parroquia"
              opciones={conActual(parroquias, parroquia)}
              valorInicial={parroquia}
              permitirVacio
              vacio="Todas"
            />
            <Selector
              id="categoria"
              etiqueta="Categoría técnica"
              opciones={conActual(categorias, categoria)}
              valorInicial={categoria}
              permitirVacio
              vacio="Todas"
            />
            <Selector
              id="orden"
              etiqueta="Orden"
              opciones={Object.entries(ORDENES_BANDEJA).map(([valor, texto]) => ({ valor, texto }))}
              valorInicial={filtros.orden ?? "atender"}
            />
            <SelectorFecha
              id="desde"
              name="desde"
              etiqueta="Recibidas desde"
              valorInicial={desde}
              vacio="Elegir"
            />
            <SelectorFecha
              id="hasta"
              name="hasta"
              etiqueta="Hasta"
              valorInicial={hasta}
              vacio="Elegir"
            />
            <button
              type="submit"
              className="h-11 rounded-control border border-linea bg-papel px-5 text-sm font-semibold text-tinta hover:border-tenue xl:justify-self-start"
            >
              Filtrar
            </button>
          </FiltrosPlegables>
        </form>
      </div>

      {cola.length ? (
        <>
          <TablaCola cola={cola} titulo="Participaciones" ordenada={false} />
          {datos.paginas > 1 && (
            <nav
              aria-label="Páginas de la bandeja"
              className="mt-4 flex flex-wrap items-center justify-between gap-3"
            >
              <p className="text-sm text-gris">
                Página {datos.pagina} de {datos.paginas}
              </p>
              <div className="flex gap-2">
                {datos.pagina > 1 && (
                  <Link
                    href={aPagina(datos.pagina - 1)}
                    className="inline-flex min-h-10 items-center gap-1 rounded-control border border-linea px-4 text-sm font-semibold text-tinta hover:border-tenue"
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                    Anterior
                  </Link>
                )}
                {datos.pagina < datos.paginas && (
                  <Link
                    href={aPagina(datos.pagina + 1)}
                    className="inline-flex min-h-10 items-center gap-1 rounded-control border border-linea px-4 text-sm font-semibold text-tinta hover:border-tenue"
                  >
                    Siguiente
                    <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                )}
              </div>
            </nav>
          )}
          <div className="mt-3 space-y-3">
            <LeyendaRecorrido />
            <p className="text-sm text-gris">
              {datos.total} {datos.total === 1 ? "participación" : "participaciones"} en esta vista.
              Abre el folio para revisarla, aprobarla, rechazarla o publicarla.
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
            ? "Prueba con otro estado, otro filtro, otras fechas o con parte del folio o del nombre."
            : "Cuando la ciudadanía envíe opiniones o propuestas desde el portal, aparecerán aquí con su folio y su recorrido."}
        </EstadoVacio>
      )}
    </>
  );
}
