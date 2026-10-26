import { ArrowDown, ArrowUp, Newspaper, Plus, Search, Star } from "lucide-react";
import { Alcance } from "@/components/contenido/alcance";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ChipsEstado } from "@/components/panel/chips-estado";
import { FiltrosPlegables } from "@/components/panel/filtros-plegables";
import { PestanasContenido } from "@/components/contenido/pestanas";
import {
  EstadoNoticiaEtiqueta,
  ICONO_FORMATO,
  formatearFecha,
} from "@/components/contenido/estado-noticia";
import { AvisoInicial } from "@/components/ui/aviso";
import { EsqueletoBandeja } from "@/components/ui/esqueletos";
import { EncabezadoPagina, EstadoVacio } from "@/components/ui/piezas";
import { Selector } from "@/components/ui/selector";
import { crearNoticiaAccion } from "@/lib/plataforma/acciones-contenido";
import {
  ORDENES,
  fechaRelevante,
  listarNoticias,
  type FilaNoticia,
  type Orden,
} from "@/lib/plataforma/contenido";
import { totalesDe } from "@/lib/plataforma/inicio";
import { exigirEnAlcaldia, almacen, idSesion, leerAviso } from "@/lib/plataforma/sesion";
import type { ConteoDia } from "@/lib/plataforma/tipos";
import {
  CATEGORIAS,
  ESTADOS_NOTICIA,
  FORMATOS,
  NOMBRE_FORMATO,
  NOMBRE_TIPO,
  TIPOS_NOTICIA,
  type Categoria,
  type EstadoNoticia,
  type Formato,
  type TipoNoticia,
} from "@/lib/contenido/tipos";

export const metadata: Metadata = { title: "Noticias" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const CHIPS = [
  ["BORRADOR", "Borradores"],
  ["PROGRAMADO", "Programadas"],
  ["PUBLICADO", "Publicadas"],
  ["DESPUBLICADO", "Despublicadas"],
] as const satisfies readonly (readonly [EstadoNoticia, string])[];

const FECHA_DE: Record<EstadoNoticia, string> = {
  BORRADOR: "Editada",
  PROGRAMADO: "Sale",
  PUBLICADO: "Publicada",
  DESPUBLICADO: "Publicada",
};

export default function NoticiasPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<EsqueletoBandeja />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

const fechaValida = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

async function Contenido({ searchParams }: { searchParams: SearchParams }) {
  await exigirEnAlcaldia("contenido.editar", "/contenido/noticias");
  const sp = await searchParams;
  const texto = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const de = <T extends string>(lista: readonly T[], k: string) =>
    lista.find((v) => v === texto(k));

  const estado = de(ESTADOS_NOTICIA, "estado");
  const tipo = de(TIPOS_NOTICIA, "tipo") as TipoNoticia | undefined;
  const formato = de(FORMATOS, "formato") as Formato | undefined;
  const categoria = de(CATEGORIAS, "categoria") as Categoria | undefined;
  const orden = de(ORDENES, "orden") ?? "recientes";
  const q = texto("q").slice(0, 80);
  const [desde, hasta] = [fechaValida(texto("desde")), fechaValida(texto("hasta"))];

  // La lista depende de la hora (las programadas vencidas se publican al leer).
  await connection();
  const alm = almacen();
  const r = listarNoticias(alm, await idSesion(), {
    estado,
    tipo,
    formato,
    categoria,
    q,
    desde: desde || undefined,
    hasta: hasta || undefined,
    orden,
  });
  if (r.estado !== "OK") return null; // exigirEnAlcaldia ya cubrió sesión y permiso.
  const totales = new Map(r.items.map((n) => [n.id, totalesDe(alm, `noticia:${n.id}`)]));
  const aviso = await leerAviso();
  const activos = [tipo, formato, categoria, desde, hasta].filter(Boolean).length;
  const filtrando = Boolean(estado || q || activos);
  const conservar = {
    tipo,
    formato,
    categoria,
    desde: desde || undefined,
    hasta: hasta || undefined,
    orden: orden !== "recientes" ? orden : undefined,
  };

  return (
    <>
      <EncabezadoPagina
        titulo="Contenido"
        bajada="Lo que tu alcaldía publica en el portal ciudadano."
        acciones={
          <form action={crearNoticiaAccion}>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center gap-2 rounded-control border border-marca bg-marca px-4 font-semibold text-sobre-marca transition-[filter] duration-150 hover:brightness-110"
            >
              <Plus size={18} aria-hidden="true" />
              Nueva noticia
            </button>
          </form>
        }
      />
      <PestanasContenido />

      <div className="mb-5 space-y-4">
        <ChipsEstado
          conteos={r.conteos}
          activo={estado}
          q={q || undefined}
          estados={CHIPS}
          ruta="/contenido/noticias"
          conservar={conservar}
          final="PUBLICADO"
        />
        <form
          role="search"
          action="/contenido/noticias"
          className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(0,2fr)_repeat(5,minmax(0,1fr))_auto]"
        >
          {estado && <input type="hidden" name="estado" value={estado} />}
          {orden !== "recientes" && <input type="hidden" name="orden" value={orden} />}
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
              placeholder="Título de la noticia"
              aria-label="Buscar por título"
              className="h-11 w-full rounded-control border border-linea bg-papel pr-3 pl-9 text-tinta outline-none placeholder:text-tenue hover:border-tenue focus-visible:border-marca-texto"
            />
          </div>
          <FiltrosPlegables activos={activos}>
            <Selector
              id="tipo"
              etiqueta="Tipo"
              opciones={TIPOS_NOTICIA.map((t) => ({ valor: t, texto: NOMBRE_TIPO[t] }))}
              valorInicial={tipo ?? ""}
              permitirVacio
              vacio="Todos"
            />
            <Selector
              id="formato"
              etiqueta="Formato"
              opciones={FORMATOS.map((f) => ({ valor: f, texto: NOMBRE_FORMATO[f] }))}
              valorInicial={formato ?? ""}
              permitirVacio
              vacio="Todos"
            />
            <Selector
              id="categoria"
              etiqueta="Categoría"
              opciones={CATEGORIAS}
              valorInicial={categoria ?? ""}
              permitirVacio
              vacio="Todas"
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
          <ListaNoticias
            items={r.items}
            totales={totales}
            orden={orden}
            hrefOrden={(() => {
              const p = new URLSearchParams();
              for (const [k, v] of Object.entries({ estado, q, ...conservar }))
                if (v && k !== "orden") p.set(k, v);
              if (orden !== "antiguas") p.set("orden", "antiguas");
              const t = p.toString();
              return `/contenido/noticias${t ? `?${t}` : ""}`;
            })()}
          />
          <p className="mt-3 text-sm text-gris">
            {r.items.length} {r.items.length === 1 ? "noticia" : "noticias"} en esta vista
            {filtrando && ` de ${r.total} en total`}.
          </p>
        </>
      ) : (
        <EstadoVacio
          Icono={Newspaper}
          titulo={filtrando ? "Ninguna noticia coincide" : "Todavía no hay noticias"}
          accion={
            filtrando ? (
              <Link
                href="/contenido/noticias"
                className="inline-flex min-h-10 items-center rounded-control border border-linea px-4 text-sm font-semibold text-tinta hover:border-tenue"
              >
                Quitar los filtros
              </Link>
            ) : undefined
          }
        >
          {filtrando
            ? "Prueba con otro estado, otro filtro o con otra parte del título."
            : "Crea la primera con «Nueva noticia». Se guarda como borrador hasta que la publiques o la programes."}
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

/** Tabla en pantallas medianas y grandes; lista apilada en el teléfono (mismo patrón que la cola). */
function ListaNoticias({
  items,
  totales,
  orden,
  hrefOrden,
}: {
  items: FilaNoticia[];
  /** Vistas y reacciones en el portal (desde la publicación). */
  totales: Map<string, ConteoDia>;
  orden: Orden;
  /** Enlace que invierte el orden por fecha. */
  hrefOrden: string;
}) {
  const porFecha = orden !== "titulo";
  const Flecha = orden === "antiguas" ? ArrowUp : ArrowDown;
  const titulo = (n: FilaNoticia) => n.titulo || "Sin título";
  return (
    <>
      <ul
        aria-label="Noticias"
        className="divide-y divide-fila rounded-lg border border-linea md:hidden"
      >
        {items.map((n) => {
          const Icono = ICONO_FORMATO[n.formato];
          return (
            <li key={n.id} className="relative px-4 py-3 hover:bg-superficie">
              <Link
                href={`/contenido/noticias/${n.id}`}
                className="font-semibold text-tinta after:absolute after:inset-0 after:content-['']"
              >
                {n.destacada && (
                  <Star
                    size={14}
                    aria-label="Destacada"
                    className="mr-1 inline -translate-y-px fill-tinta text-tinta"
                  />
                )}
                {titulo(n)}
              </Link>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gris">
                <Icono size={14} aria-hidden="true" className="shrink-0" />
                {NOMBRE_FORMATO[n.formato]} · {n.categoria ?? "Sin categoría"}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <EstadoNoticiaEtiqueta estado={n.estado} publicarEl={n.publicarEl} />
                {n.estado !== "PROGRAMADO" && (
                  <span className="text-sm text-gris">
                    {FECHA_DE[n.estado]} {formatearFecha(fechaRelevante(n))}
                  </span>
                )}
              </div>
              <Alcance totales={totales.get(n.id)} className="mt-1.5 flex w-fit" />
            </li>
          );
        })}
      </ul>

      {/* Con scroll horizontal, el teclado tiene que poder entrar a desplazarla (WCAG 2.1.1). */}
      <div
        role="region"
        aria-label="Tabla de noticias"
        tabIndex={0}
        className="relative hidden overflow-x-auto rounded-lg border border-linea md:block"
      >
        <table className="w-full border-collapse text-left text-[0.9375rem]">
          <caption className="sr-only">Noticias</caption>
          <thead className="bg-cabecera text-xs font-semibold tracking-wide text-gris uppercase">
            <tr>
              <th scope="col" className="px-3 py-2.5">
                Título
              </th>
              <th scope="col" className="hidden px-3 py-2.5 xl:table-cell">
                Categoría
              </th>
              <th scope="col" className="px-3 py-2.5">
                Estado
              </th>
              <th
                scope="col"
                aria-sort={porFecha ? (orden === "antiguas" ? "ascending" : "descending") : "none"}
                className="px-3 py-2.5"
              >
                <Link
                  href={hrefOrden}
                  className="inline-flex items-center gap-1 text-tinta uppercase hover:underline"
                >
                  Fecha
                  {porFecha && <Flecha size={13} aria-hidden="true" />}
                  <span className="sr-only">
                    {orden === "antiguas"
                      ? ", de la más antigua a la más reciente. Cambiar el orden"
                      : ", de la más reciente a la más antigua. Cambiar el orden"}
                  </span>
                </Link>
              </th>
              <th scope="col" className="px-3 py-2.5">
                En el portal
              </th>
              <th scope="col" className="hidden px-3 py-2.5 lg:table-cell">
                Autor
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((n) => {
              const Icono = ICONO_FORMATO[n.formato];
              return (
                <tr key={n.id} className="relative border-t border-fila hover:bg-superficie">
                  <td className="max-w-[28rem] px-3 py-3.5">
                    <Link
                      href={`/contenido/noticias/${n.id}`}
                      className="font-semibold text-tinta after:absolute after:inset-0 after:content-['']"
                    >
                      {n.destacada && (
                        <Star
                          size={14}
                          aria-label="Destacada"
                          className="mr-1 inline -translate-y-px fill-tinta text-tinta"
                        />
                      )}
                      {titulo(n)}
                    </Link>
                    <span className="mt-0.5 flex items-center gap-1.5 text-sm text-gris">
                      <Icono size={14} aria-hidden="true" className="shrink-0" />
                      {NOMBRE_FORMATO[n.formato]} · {NOMBRE_TIPO[n.tipo]}
                    </span>
                  </td>
                  <td className="hidden px-3 py-3.5 whitespace-nowrap xl:table-cell">
                    {n.categoria ?? <span className="text-gris">Sin categoría</span>}
                  </td>
                  <td className="px-3 py-3.5">
                    <EstadoNoticiaEtiqueta estado={n.estado} />
                  </td>
                  <td className="px-3 py-3.5 whitespace-nowrap text-gris">
                    {FECHA_DE[n.estado]}{" "}
                    {formatearFecha(fechaRelevante(n), n.estado === "PROGRAMADO")}
                  </td>
                  <td className="px-3 py-3.5 whitespace-nowrap">
                    <Alcance totales={totales.get(n.id)} />
                  </td>
                  <td className="hidden max-w-48 truncate px-3 py-3.5 text-gris lg:table-cell">
                    {n.autor}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
