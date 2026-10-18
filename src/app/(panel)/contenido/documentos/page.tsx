import { FileText, Search, Upload } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChipsEstado } from "@/components/panel/chips-estado";
import { FiltrosPlegables } from "@/components/panel/filtros-plegables";
import { PestanasContenido } from "@/components/contenido/pestanas";
import { EstadoDocumento, Visibilidad } from "@/components/contenido/documento-piezas";
import { formatearFecha } from "@/components/contenido/estado-noticia";
import { pesoLegible } from "@/components/contenido/subir";
import { AvisoInicial } from "@/components/ui/aviso";
import { EsqueletoBandeja } from "@/components/ui/esqueletos";
import { BotonEnlace, EncabezadoPagina, EstadoVacio } from "@/components/ui/piezas";
import { Selector } from "@/components/ui/selector";
import { DOC_CATEGORIAS, DOC_ESTADOS, type Documento } from "@/lib/contenido/tipos";
import { VISIBILIDADES, listarDocumentos } from "@/lib/plataforma/documentos";
import { almacen, exigirEnAlcaldia, idSesion, leerAviso } from "@/lib/plataforma/sesion";

export const metadata: Metadata = { title: "Documentos" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const CHIPS = [
  ["BORRADOR", "Borradores de trabajo"],
  ["OFICIAL", "Oficiales"],
] as const;

export default function DocumentosPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<EsqueletoBandeja />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

const fechaValida = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

async function Contenido({ searchParams }: { searchParams: SearchParams }) {
  await exigirEnAlcaldia("contenido.editar", "/contenido/documentos");
  const sp = await searchParams;
  const texto = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const de = <T extends string>(lista: readonly T[], k: string) =>
    lista.find((v) => v === texto(k));
  const estado = de(DOC_ESTADOS, "estado");
  const categoria = de(DOC_CATEGORIAS, "categoria");
  const visibilidad = de(VISIBILIDADES, "visibilidad");
  const q = texto("q").slice(0, 80);
  const [desde, hasta] = [fechaValida(texto("desde")), fechaValida(texto("hasta"))];

  const r = listarDocumentos(almacen(), await idSesion(), {
    estado,
    categoria,
    visibilidad,
    q,
    desde: desde || undefined,
    hasta: hasta || undefined,
  });
  if (r.estado !== "OK") return null;
  const aviso = await leerAviso();
  const activos = [categoria, visibilidad, desde, hasta].filter(Boolean).length;
  const filtrando = Boolean(estado || q || activos);

  return (
    <>
      <EncabezadoPagina
        titulo="Contenido"
        bajada="Lo que tu alcaldía publica en el portal ciudadano."
        acciones={
          <BotonEnlace href="/contenido/documentos/nuevo" variante="primario" Icono={Upload}>
            Subir documento
          </BotonEnlace>
        }
      />
      <PestanasContenido />

      <div className="mb-5 space-y-4">
        <ChipsEstado
          conteos={r.conteos}
          activo={estado}
          q={q || undefined}
          estados={CHIPS}
          ruta="/contenido/documentos"
          conservar={{
            categoria,
            visibilidad,
            desde: desde || undefined,
            hasta: hasta || undefined,
          }}
          final="OFICIAL"
        />
        <form
          role="search"
          action="/contenido/documentos"
          className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto]"
        >
          {estado && <input type="hidden" name="estado" value={estado} />}
          <div className="relative min-w-0 sm:col-span-2 lg:col-span-3 xl:col-span-1">
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
              placeholder="Título o descripción"
              aria-label="Buscar por título o descripción"
              className="h-11 w-full rounded-control border border-linea bg-papel pr-3 pl-9 text-tinta outline-none placeholder:text-tenue hover:border-tenue focus-visible:border-marca-texto"
            />
          </div>
          <FiltrosPlegables activos={activos}>
            <Selector
              id="categoria"
              etiqueta="Categoría"
              opciones={DOC_CATEGORIAS}
              valorInicial={categoria ?? ""}
              permitirVacio
              vacio="Todas"
            />
            <Selector
              id="visibilidad"
              etiqueta="Visibilidad"
              opciones={[
                { valor: "publico", texto: "En el portal" },
                { valor: "oculto", texto: "Ocultos" },
              ]}
              valorInicial={visibilidad ?? ""}
              permitirVacio
              vacio="Todos"
            />
            <CampoFecha id="desde" etiqueta="Desde" valor={desde} />
            <CampoFecha id="hasta" etiqueta="Hasta" valor={hasta} />
            <button
              type="submit"
              className="h-11 rounded-control border border-linea bg-papel px-5 text-sm font-semibold text-tinta hover:border-tenue"
            >
              Filtrar
            </button>
          </FiltrosPlegables>
        </form>
      </div>

      {r.items.length ? (
        <>
          <ListaDocumentos items={r.items} />
          <p className="mt-3 text-sm text-gris">
            {r.items.length} {r.items.length === 1 ? "documento" : "documentos"} en esta vista
            {filtrando && ` de ${r.total} en total`}.
          </p>
        </>
      ) : (
        <EstadoVacio
          Icono={FileText}
          titulo={filtrando ? "Ningún documento coincide" : "Todavía no hay documentos"}
          accion={
            filtrando ? (
              <Link
                href="/contenido/documentos"
                className="inline-flex min-h-10 items-center rounded-control border border-linea px-4 text-sm font-semibold text-tinta hover:border-tenue"
              >
                Quitar los filtros
              </Link>
            ) : undefined
          }
        >
          {filtrando
            ? "Prueba con otro estado, otro filtro o con otra parte del título."
            : "Sube el primero con «Subir documento»: PDF, con categoría, estado y versiones."}
        </EstadoVacio>
      )}
      <AvisoInicial texto={aviso} />
    </>
  );
}

function CampoFecha({ id, etiqueta, valor }: { id: string; etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-tinta">
        {etiqueta}
      </label>
      <input
        id={id}
        name={id}
        type="date"
        defaultValue={valor}
        className="h-11 w-full rounded-control border border-linea bg-papel px-3 text-tinta outline-none hover:border-tenue focus-visible:border-marca-texto"
      />
    </div>
  );
}

function ListaDocumentos({ items }: { items: Documento[] }) {
  return (
    <>
      <ul
        aria-label="Documentos"
        className="divide-y divide-fila rounded-lg border border-linea md:hidden"
      >
        {items.map((d) => (
          <li key={d.id} className="relative px-4 py-3 hover:bg-superficie">
            <Link
              href={`/contenido/documentos/${d.id}`}
              className="font-semibold text-tinta after:absolute after:inset-0 after:content-['']"
            >
              {d.titulo}
            </Link>
            <p className="mt-0.5 text-sm text-gris">
              {d.categoria} · versión {d.version} · {pesoLegible(d.archivo.pesoBytes)}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <EstadoDocumento estado={d.estado} />
              <Visibilidad publico={d.publico} />
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-lg border border-linea md:block">
        <table className="w-full border-collapse text-left text-[0.9375rem]">
          <caption className="sr-only">Documentos, del más reciente al más antiguo</caption>
          <thead className="bg-cabecera text-xs font-semibold tracking-wide text-gris uppercase">
            <tr>
              <th scope="col" className="px-3 py-2.5">
                Documento
              </th>
              <th scope="col" className="hidden px-3 py-2.5 xl:table-cell">
                Categoría
              </th>
              <th scope="col" className="px-3 py-2.5">
                Estado
              </th>
              <th scope="col" className="px-3 py-2.5">
                Versión
              </th>
              <th scope="col" className="hidden px-3 py-2.5 lg:table-cell">
                Visibilidad
              </th>
              <th scope="col" aria-sort="descending" className="px-3 py-2.5 text-tinta">
                Actualizado
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((d) => (
              <tr key={d.id} className="relative border-t border-fila hover:bg-superficie">
                <td className="max-w-[26rem] px-3 py-3.5">
                  <Link
                    href={`/contenido/documentos/${d.id}`}
                    className="font-semibold text-tinta after:absolute after:inset-0 after:content-['']"
                  >
                    {d.titulo}
                  </Link>
                  <span className="mt-0.5 block truncate text-sm text-gris">{d.descripcion}</span>
                </td>
                <td className="hidden px-3 py-3.5 whitespace-nowrap xl:table-cell">
                  {d.categoria}
                </td>
                <td className="px-3 py-3.5">
                  <EstadoDocumento estado={d.estado} />
                </td>
                <td className="px-3 py-3.5 whitespace-nowrap tabular-nums">
                  {d.version}
                  <span className="block text-sm text-gris">
                    {pesoLegible(d.archivo.pesoBytes)}
                  </span>
                </td>
                <td className="hidden px-3 py-3.5 lg:table-cell">
                  <Visibilidad publico={d.publico} />
                </td>
                <td className="px-3 py-3.5 whitespace-nowrap text-gris">
                  {formatearFecha(d.actualizadoEl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
