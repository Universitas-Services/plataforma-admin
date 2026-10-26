import { Search, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GestionarMiembro, InvitarMiembro } from "@/components/alcaldia/equipo";
import { FiltrosPlegables } from "@/components/panel/filtros-plegables";
import { EsqueletoTabla } from "@/components/ui/esqueletos";
import { EncabezadoPagina, EstadoVacio } from "@/components/ui/piezas";
import { Selector } from "@/components/ui/selector";
import { equipoDe, type EstadoMiembro } from "@/lib/plataforma/alcaldia";
import { almacen, exigirEnAlcaldia } from "@/lib/plataforma/sesion";
import { NOMBRE_ROL, type RolAlcaldia } from "@/lib/plataforma/tipos";

export const metadata: Metadata = { title: "Equipo" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function EquipoPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<EsqueletoTabla filas={6} columnas={4} />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

const ESTADO: Record<EstadoMiembro, { texto: string; clase: string; relleno: boolean }> = {
  ACTIVO: { texto: "Activo", clase: "border-turquesa/40 text-turquesa-texto", relleno: true },
  INVITADO: {
    texto: "Invitación pendiente",
    clase: "border-ambar/50 text-ambar-texto",
    relleno: false,
  },
  DESACTIVADO: { texto: "Desactivado", clase: "border-tenue text-gris", relleno: false },
};

function InsigniaMiembro({ estado }: { estado: EstadoMiembro }) {
  const e = ESTADO[estado];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.8125rem] font-semibold whitespace-nowrap ${e.clase}`}
    >
      <span
        aria-hidden="true"
        className={`size-2 rounded-full border-2 border-current ${e.relleno ? "bg-current" : ""}`}
      />
      {e.texto}
    </span>
  );
}

/** Backlog 2.8: Operadores y Revisores de la alcaldía. */
async function Contenido({ searchParams }: { searchParams: SearchParams }) {
  const c = await exigirEnAlcaldia("equipo.gestionar", "/equipo");
  const sp = await searchParams;
  const texto = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = texto("q").trim().slice(0, 80);
  const rol = (["ADMIN", "OPERADOR", "REVISOR"] as const).find((r) => r === texto("rol"));
  const estado = (["ACTIVO", "INVITADO", "DESACTIVADO"] as const).find(
    (e) => e === texto("estado"),
  );
  const miembros = equipoDe(almacen(), c.alcaldia.id, c.usuario.id, { rol, estado, q });
  const filtrando = !!(q || rol || estado);

  return (
    <>
      <EncabezadoPagina
        titulo="Equipo"
        bajada="Quién trabaja en el panel de tu alcaldía y con qué rol."
        acciones={<InvitarMiembro />}
      />

      <form
        role="search"
        action="/equipo"
        className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))_auto]"
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
            defaultValue={q}
            maxLength={80}
            placeholder="Nombre o correo"
            aria-label="Buscar por nombre o correo"
            className="h-11 w-full rounded-control border border-linea bg-papel pr-3 pl-9 text-tinta outline-none placeholder:text-tenue hover:border-tenue focus-visible:border-marca-texto"
          />
        </div>
        <FiltrosPlegables activos={[rol, estado].filter(Boolean).length}>
          <Selector
            id="rol"
            etiqueta="Rol"
            opciones={(["ADMIN", "OPERADOR", "REVISOR"] as RolAlcaldia[]).map((r) => ({
              valor: r,
              texto: NOMBRE_ROL[r],
            }))}
            valorInicial={rol}
            permitirVacio
            vacio="Todos"
          />
          <Selector
            id="estado"
            etiqueta="Estado"
            opciones={Object.entries(ESTADO).map(([valor, e]) => ({ valor, texto: e.texto }))}
            valorInicial={estado}
            permitirVacio
            vacio="Todos"
          />
          <button
            type="submit"
            className="h-11 rounded-control border border-linea bg-papel px-5 text-sm font-semibold text-tinta hover:border-tenue"
          >
            Filtrar
          </button>
        </FiltrosPlegables>
      </form>

      {miembros.length ? (
        <div
          role="region"
          aria-label="Miembros del equipo"
          tabIndex={0}
          className="relative overflow-x-auto rounded-lg border border-linea"
        >
          <table className="w-full border-collapse text-left text-[0.9375rem]">
            <caption className="sr-only">Miembros del equipo</caption>
            <thead className="bg-cabecera text-xs font-semibold tracking-wide text-gris uppercase">
              <tr>
                <th scope="col" className="px-3 py-2.5">
                  Persona
                </th>
                <th scope="col" className="hidden px-3 py-2.5 md:table-cell">
                  Roles
                </th>
                <th scope="col" className="hidden px-3 py-2.5 sm:table-cell">
                  Estado
                </th>
                <th scope="col" className="px-3 py-2.5">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {miembros.map((m) => (
                <tr key={m.id} className="border-t border-fila">
                  <td className="w-full max-w-0 px-3 py-3">
                    <span className="block truncate font-semibold text-tinta">
                      {m.nombre}
                      {m.esYo && <span className="font-normal text-gris"> (tú)</span>}
                    </span>
                    <span className="block truncate text-sm text-gris">{m.correo}</span>
                    <span className="mt-1 block text-sm text-cuerpo md:hidden">
                      {m.roles.map((r) => NOMBRE_ROL[r]).join(" · ")}
                    </span>
                    <span className="mt-2 block sm:hidden">
                      <InsigniaMiembro estado={m.estado} />
                    </span>
                  </td>
                  <td className="hidden px-3 py-3 whitespace-nowrap md:table-cell">
                    {m.roles.map((r) => NOMBRE_ROL[r]).join(" · ")}
                  </td>
                  <td className="hidden px-3 py-3 sm:table-cell">
                    <InsigniaMiembro estado={m.estado} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    {!m.esYo && !m.roles.includes("ADMIN") && (
                      <GestionarMiembro
                        id={m.id}
                        nombre={m.nombre}
                        roles={m.roles}
                        estado={m.estado}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EstadoVacio
          Icono={Users}
          titulo={filtrando ? "Nadie coincide con la búsqueda" : "Aún no hay equipo"}
          accion={
            filtrando ? (
              <Link
                href="/equipo"
                className="inline-flex min-h-10 items-center rounded-control border border-linea px-4 text-sm font-semibold text-tinta hover:border-tenue"
              >
                Quitar los filtros
              </Link>
            ) : undefined
          }
        >
          {filtrando ? "Prueba con otro rol, estado o nombre." : "Invita a operadores y revisores."}
        </EstadoVacio>
      )}
    </>
  );
}
