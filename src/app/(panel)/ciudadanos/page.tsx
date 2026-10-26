import { Building2, Download, Search, UserRound, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FiltrosPlegables } from "@/components/panel/filtros-plegables";
import { EsqueletoTabla } from "@/components/ui/esqueletos";
import { EncabezadoPagina, EstadoVacio, InsigniaEstado } from "@/components/ui/piezas";
import { Selector } from "@/components/ui/selector";
import { ciudadanosDe, enmascarar, filtrosCiudadanos } from "@/lib/plataforma/alcaldia";
import { almacen, exigirEnAlcaldia } from "@/lib/plataforma/sesion";

export const metadata: Metadata = { title: "Ciudadanos" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function CiudadanosPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<EsqueletoTabla filas={8} columnas={5} />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

/** Backlog 2.11: personas y organizaciones registradas en el portal de la alcaldía. */
async function Contenido({ searchParams }: { searchParams: SearchParams }) {
  const c = await exigirEnAlcaldia("ciudadanos.ver", "/ciudadanos");
  const sp = await searchParams;
  const f = filtrosCiudadanos((k) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined));
  const lista = ciudadanosDe(almacen(), c.alcaldia.id, f);
  const filtrando = !!(f.q || f.tipo || f.perfil || f.membresia);
  const consulta = new URLSearchParams(
    Object.entries(f).filter((e): e is [string, string] => !!e[1]),
  ).toString();

  return (
    <>
      <EncabezadoPagina
        titulo="Ciudadanos"
        bajada="Personas y organizaciones registradas en el portal de tu alcaldía."
        acciones={
          lista.length ? (
            <a
              href={`/ciudadanos/exportar${consulta ? `?${consulta}` : ""}`}
              download
              className="inline-flex min-h-10 items-center gap-2 rounded-control border border-linea bg-papel px-4 text-sm font-semibold text-tinta hover:border-tenue"
            >
              <Download size={16} aria-hidden="true" />
              Exportar CSV
            </a>
          ) : undefined
        }
      />

      <form
        role="search"
        action="/ciudadanos"
        className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]"
      >
        <div className="relative min-w-0 sm:col-span-2 xl:col-span-1">
          <span aria-hidden="true" className="mb-1.5 hidden text-sm font-bold text-tinta sm:block">
            Buscar
          </span>
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute bottom-3.5 left-3 text-gris"
          />
          <input
            name="q"
            type="search"
            defaultValue={f.q}
            maxLength={80}
            placeholder="Nombre, correo o cédula"
            aria-label="Buscar por nombre, correo o cédula"
            className="h-11 w-full rounded-control border border-linea bg-papel pr-3 pl-9 text-tinta outline-none placeholder:text-tenue hover:border-tenue focus-visible:border-marca-texto"
          />
        </div>
        <FiltrosPlegables activos={[f.tipo, f.perfil, f.membresia].filter(Boolean).length}>
          <Selector
            id="tipo"
            etiqueta="Tipo"
            opciones={[
              { valor: "NATURAL", texto: "Persona natural" },
              { valor: "ORGANIZACION", texto: "Organización" },
            ]}
            valorInicial={f.tipo}
            permitirVacio
            vacio="Todos"
          />
          <Selector
            id="perfil"
            etiqueta="Perfil"
            opciones={[
              { valor: "COMPLETO", texto: "Completo" },
              { valor: "INCOMPLETO", texto: "Incompleto" },
            ]}
            valorInicial={f.perfil}
            permitirVacio
            vacio="Todos"
          />
          <Selector
            id="membresia"
            etiqueta="Membresía"
            opciones={[
              { valor: "ACTIVA", texto: "Activa" },
              { valor: "SUSPENDIDA", texto: "Suspendida" },
            ]}
            valorInicial={f.membresia}
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

      {lista.length ? (
        <>
          <p className="mb-2 text-sm text-gris" aria-live="polite">
            {lista.length === 1 ? "1 registro" : `${lista.length} registros`}
          </p>
          <div
            role="region"
            aria-label="Ciudadanos registrados"
            tabIndex={0}
            className="relative overflow-x-auto rounded-lg border border-linea"
          >
            <table className="w-full border-collapse text-left text-[0.9375rem]">
              <caption className="sr-only">Ciudadanos registrados</caption>
              <thead className="bg-cabecera text-xs font-semibold tracking-wide text-gris uppercase">
                <tr>
                  <th scope="col" className="px-3 py-2.5">
                    Nombre
                  </th>
                  <th scope="col" className="hidden px-3 py-2.5 sm:table-cell">
                    Documento
                  </th>
                  <th scope="col" className="hidden px-3 py-2.5 lg:table-cell">
                    Perfil
                  </th>
                  <th scope="col" className="px-3 py-2.5">
                    Membresía
                  </th>
                </tr>
              </thead>
              <tbody>
                {lista.map((x) => {
                  const Icono = x.tipo === "ORGANIZACION" ? Building2 : UserRound;
                  return (
                    <tr key={x.id} className="border-t border-fila">
                      <td className="w-full max-w-0 px-3 py-3">
                        <Link
                          href={`/ciudadanos/${x.id}`}
                          className="flex items-center gap-2 font-semibold text-marca-texto hover:underline"
                        >
                          <Icono size={16} aria-hidden="true" className="shrink-0 text-gris" />
                          <span className="truncate">{x.nombre}</span>
                        </Link>
                        <span className="block truncate pl-6 text-sm text-gris">{x.correo}</span>
                        <span className="block pl-6 text-sm text-gris tabular-nums sm:hidden">
                          {enmascarar(x.cedula ?? x.rif)}
                        </span>
                      </td>
                      <td className="hidden px-3 py-3 whitespace-nowrap tabular-nums sm:table-cell">
                        {enmascarar(x.cedula ?? x.rif)}
                      </td>
                      <td className="hidden px-3 py-3 lg:table-cell">
                        {x.perfilCompleto ? (
                          "Completo"
                        ) : (
                          <span className="text-ambar-texto">Incompleto</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <InsigniaEstado estado={x.membresia.estado} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gris">
            Registros de ejemplo. La cédula completa solo se ve en el detalle.
          </p>
        </>
      ) : (
        <EstadoVacio
          Icono={Users}
          titulo={filtrando ? "Nadie coincide con la búsqueda" : "Aún no hay ciudadanos"}
          accion={
            filtrando ? (
              <Link
                href="/ciudadanos"
                className="inline-flex min-h-10 items-center rounded-control border border-linea px-4 text-sm font-semibold text-tinta hover:border-tenue"
              >
                Quitar los filtros
              </Link>
            ) : undefined
          }
        >
          {filtrando
            ? "Prueba con otro filtro o busca por al menos 4 dígitos de la cédula."
            : "Aparecerán cuando las personas se registren en el portal."}
        </EstadoVacio>
      )}
    </>
  );
}
