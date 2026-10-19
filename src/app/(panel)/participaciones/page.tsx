import { ClipboardList, Download, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EsqueletoBandeja } from "@/components/ui/esqueletos";
import { ChipsEstado, ESTADOS_CHIP, type EstadoChip } from "@/components/panel/chips-estado";
import { FiltrosPlegables } from "@/components/panel/filtros-plegables";
import { LeyendaRecorrido } from "@/components/panel/recorrido";
import { TablaCola } from "@/components/panel/tabla-cola";
import { EncabezadoPagina, EstadoVacio } from "@/components/ui/piezas";
import { Selector } from "@/components/ui/selector";
import {
  bandeja,
  conteosParticipaciones,
  deAlcaldia,
  fila,
} from "@/lib/plataforma/participaciones";
import { almacen, exigirEnAlcaldia } from "@/lib/plataforma/sesion";
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
  const sp = await searchParams;
  const estado = ESTADOS_CHIP.find(([e]) => e === sp.estado)?.[0] as EstadoChip | undefined;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const filtro = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const [tipo, parroquia, categoria] = [filtro("tipo"), filtro("parroquia"), filtro("categoria")];

  const alm = almacen();
  const todas = deAlcaldia(alm, c.alcaldia.id);
  const conteos = conteosParticipaciones(alm, c.alcaldia.id);
  const opciones = (k: "parroquia" | "categoriaTecnica") =>
    [...new Set(todas.map((p) => p[k]))].sort((x, y) => x.localeCompare(y, "es"));
  const tipoValido = tipo in TIPOS_PARTICIPACION ? (tipo as TipoParticipacion) : undefined;
  const filtros = {
    estado,
    tipo: tipoValido,
    parroquia: parroquia || undefined,
    categoria: categoria || undefined,
    q: q || undefined,
  };
  const lista = bandeja(alm, c.alcaldia.id, filtros);
  const cola = lista.map((p) => fila(p));
  const filtrando = !!(estado || q || tipo || parroquia || categoria);
  const qs = new URLSearchParams(
    Object.entries({ estado, q, tipo, parroquia, categoria }).filter(([, v]) => v) as [
      string,
      string,
    ][],
  ).toString();

  return (
    <>
      <EncabezadoPagina
        titulo="Participaciones"
        bajada="Primero lo que espera evaluación, del aporte más antiguo al más reciente."
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
          conteos={conteos}
          activo={estado}
          q={q || undefined}
          conservar={{ tipo, parroquia, categoria }}
        />
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
              placeholder="Folio, autor o cédula"
              aria-label="Buscar por folio, autor o cédula"
              className="h-11 w-full rounded-control border border-linea bg-papel pr-3 pl-9 text-tinta outline-none placeholder:text-tenue hover:border-tenue focus-visible:border-marca-texto"
            />
          </div>
          <FiltrosPlegables activos={[tipo, parroquia, categoria].filter(Boolean).length}>
            <Selector
              id="tipo"
              etiqueta="Tipo"
              opciones={Object.entries(TIPOS_PARTICIPACION).map(([valor, texto]) => ({
                valor,
                texto,
              }))}
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
          <TablaCola cola={cola} titulo="Participaciones" ordenada={false} />
          <div className="mt-3 space-y-3">
            <LeyendaRecorrido />
            <p className="text-sm text-gris">
              {cola.length} {cola.length === 1 ? "participación" : "participaciones"} en esta vista.
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
            ? "Prueba con otro estado, otro filtro o con parte del folio o del nombre."
            : "Cuando la ciudadanía envíe opiniones o propuestas desde el portal, aparecerán aquí con su folio y su recorrido."}
        </EstadoVacio>
      )}
    </>
  );
}
