import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  UserRound,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FiltrosPlegables } from "@/components/panel/filtros-plegables";
import { EsqueletoTabla } from "@/components/ui/esqueletos";
import { EncabezadoPagina, EstadoVacio, InsigniaEstado } from "@/components/ui/piezas";
import { Selector } from "@/components/ui/selector";
import { usaApi } from "@/lib/api/cliente";
import { enmascarar, filtrosCiudadanos, ORDENES_CIUDADANOS } from "@/lib/plataforma/alcaldia";
import { leerCiudadanos } from "@/lib/plataforma/ciudadanos-datos";
import { exigirEnAlcaldia } from "@/lib/plataforma/sesion";

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
  const leer = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const f = filtrosCiudadanos(leer);
  const pagina = Math.max(1, Math.min(10_000, Number.parseInt(leer("pagina") ?? "", 10) || 1));
  const datos = await leerCiudadanos(c.alcaldia.id, f, pagina);
  const lista = datos.items;
  const filtrando = !!(f.q || f.tipo || f.perfil || f.membresia || f.baja);
  const consulta = new URLSearchParams(
    Object.entries(f).filter((e): e is [string, string] => !!e[1]),
  ).toString();
  /** La misma vista con otros parámetros (página, chip de bajas). */
  const con = (cambios: Record<string, string | undefined>) => {
    const p = new URLSearchParams(consulta);
    for (const [k, v] of Object.entries(cambios)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const t = p.toString();
    return `/ciudadanos${t ? `?${t}` : ""}`;
  };
  const enlaceChip =
    "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-[0.9375rem] font-medium whitespace-nowrap transition-colors duration-150";

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

      <ul aria-label="Filtrar por cuenta" className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["ACTIVA", "Activas"],
            ["SUSPENDIDA", "Suspendidas"],
          ] as const
        ).map(([clave, texto]) => (
          <li key={clave}>
            <Link
              href={con({
                membresia: f.membresia === clave ? undefined : clave,
                pagina: undefined,
              })}
              aria-current={f.membresia === clave ? "true" : undefined}
              className={`${enlaceChip} ${
                f.membresia === clave
                  ? "border-tinta bg-tinta text-papel hover:bg-cuerpo"
                  : "border-linea text-tinta hover:border-tenue"
              }`}
            >
              {texto} <strong className="font-bold">{datos.conteos[clave]}</strong>
            </Link>
          </li>
        ))}
        <li>
          <Link
            href={con({
              baja: f.baja === "solicitada" ? undefined : "solicitada",
              pagina: undefined,
            })}
            aria-current={f.baja === "solicitada" ? "true" : undefined}
            className={`${enlaceChip} ${
              f.baja === "solicitada"
                ? "border-tinta bg-tinta text-papel hover:bg-cuerpo"
                : "border-linea text-tinta hover:border-tenue"
            }`}
          >
            {datos.bajas > 0 && (
              <span aria-hidden="true" className="size-2 rounded-full bg-peligro" />
            )}
            Bajas pedidas <strong className="font-bold">{datos.bajas}</strong>
          </Link>
        </li>
      </ul>

      <form
        role="search"
        action="/ciudadanos"
        className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto]"
      >
        {f.baja && <input type="hidden" name="baja" value={f.baja} />}
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
        <FiltrosPlegables activos={[f.tipo, f.perfil, f.membresia, f.orden].filter(Boolean).length}>
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
          <Selector
            id="orden"
            etiqueta="Orden"
            opciones={Object.entries(ORDENES_CIUDADANOS).map(([valor, texto]) => ({
              valor,
              texto,
            }))}
            valorInicial={f.orden ?? "recientes"}
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
            {datos.total === 1 ? "1 registro" : `${datos.total} registros`}
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
                          {x.documento ?? enmascarar(x.cedula ?? x.rif)}
                        </span>
                        {(x.anonimizadoEl || x.bajaSolicitadaEl) && (
                          <span
                            className={`mt-1 ml-6 inline-block text-sm font-semibold ${x.anonimizadoEl ? "text-gris" : "text-peligro"}`}
                          >
                            {x.anonimizadoEl ? "Cuenta anonimizada" : "Pidió la baja"}
                          </span>
                        )}
                      </td>
                      <td className="hidden px-3 py-3 whitespace-nowrap tabular-nums sm:table-cell">
                        {x.documento ?? enmascarar(x.cedula ?? x.rif)}
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
          {datos.paginas > 1 && (
            <nav
              aria-label="Páginas de ciudadanos"
              className="mt-4 flex flex-wrap items-center justify-between gap-3"
            >
              <p className="text-sm text-gris">
                Página {datos.pagina} de {datos.paginas}
              </p>
              <div className="flex gap-2">
                {datos.pagina > 1 && (
                  <Link
                    href={con({
                      pagina: datos.pagina - 1 > 1 ? String(datos.pagina - 1) : undefined,
                    })}
                    className="inline-flex min-h-10 items-center gap-1 rounded-control border border-linea px-4 text-sm font-semibold text-tinta hover:border-tenue"
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                    Anterior
                  </Link>
                )}
                {datos.pagina < datos.paginas && (
                  <Link
                    href={con({ pagina: String(datos.pagina + 1) })}
                    className="inline-flex min-h-10 items-center gap-1 rounded-control border border-linea px-4 text-sm font-semibold text-tinta hover:border-tenue"
                  >
                    Siguiente
                    <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                )}
              </div>
            </nav>
          )}
          <p className="mt-2 text-xs text-gris">
            {usaApi() ? "" : "Registros de ejemplo. "}La cédula completa solo se ve en el detalle.
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
