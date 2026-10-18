import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { variablesMarca } from "@/lib/marca";
import { salirDeAlcaldiaAccion } from "@/lib/plataforma/acciones";
import { nombreCompleto } from "@/lib/plataforma/servicio";
import { almacen, getContexto } from "@/lib/plataforma/sesion";
import { NOMBRE_ROL } from "@/lib/plataforma/tipos";
import { Linea } from "./linea";
import { MenuUsuario } from "./menu-usuario";
import { NavegacionMovil } from "./navegacion-movil";
import { SiglaAlcaldia, nombreCorto } from "./sigla-alcaldia";

/**
 * Marco del panel: la línea (sidebar) y la franja «Operando en». Toma la marca de la alcaldía
 * en uso si ya completó el onboarding; si no, la neutra de la plataforma.
 */
export async function MarcoPanel({ children }: { children: ReactNode }) {
  const c = await getContexto();
  if (!c) redirect("/ingresar");
  const { usuario: u, alcaldia: a } = c;

  const conMarca = a && a.estado !== "ONBOARDING_PENDIENTE" ? a.marca : undefined;
  const estilo = variablesMarca(conMarca?.primario) as CSSProperties;
  // La estación de Participaciones muestra cuántas esperan (pendientes y en revisión).
  const datos = a ? almacen().participaciones.get(a.id) : undefined;
  const porAtender = datos ? (datos.conteos.PENDIENTE ?? 0) + (datos.conteos.EN_REVISION ?? 0) : 0;
  const pendiente = a?.estado === "ONBOARDING_PENDIENTE";
  const secciones = c.secciones.map((s) => ({
    href: s.href,
    etiqueta: s.etiqueta,
    contador: s.href === "/participaciones" && porAtender > 0 ? porAtender : undefined,
    // Mientras la alcaldía no termina su configuración, las demás estaciones no prestan servicio.
    deshabilitada: pendiente,
  }));
  const estaciones = pendiente
    ? [{ href: "/onboarding", etiqueta: "Configuración inicial" }, ...secciones]
    : !a && !u.rolPlataforma
      ? [{ href: "/alcaldia", etiqueta: "Elegir alcaldía" }]
      : secciones;
  const sigla = a ? a.sigla : "PPC";
  const nombreLinea = a ? `Línea ${nombreCorto(a.nombre)}` : "Línea Plataforma";
  const rol = u.rolPlataforma
    ? `${NOMBRE_ROL[u.rolPlataforma]}${u.entidad ? ` · ${u.entidad === "AVIPRI" ? "AVIPRI" : "Universitas"}` : ""}`
    : c.roles.map((r) => NOMBRE_ROL[r]).join(" y ");

  return (
    <div style={estilo} className="min-h-dvh lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh overflow-y-auto border-r border-linea bg-superficie lg:block">
        <Linea estaciones={estaciones} sigla={sigla} nombreLinea={nombreLinea} />
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-linea bg-papel/95 pr-3 pl-2 backdrop-blur-sm sm:pr-6 lg:pl-8">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-marca" />
          <NavegacionMovil estaciones={estaciones} sigla={sigla} nombreLinea={nombreLinea} />
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm sm:gap-3">
            {a ? (
              <>
                <span className="hidden text-gris sm:inline">Operando en:</span>
                <span className="sm:hidden">
                  <SiglaAlcaldia alcaldia={a} tamano="sm" />
                </span>
                <strong className="truncate font-semibold text-tinta">
                  <span className="sm:hidden">{nombreCorto(a.nombre)}</span>
                  <span className="hidden sm:inline">{a.nombre}</span>
                </strong>
                <Link
                  href="/alcaldia"
                  className="shrink-0 rounded-control border border-linea px-2.5 py-1 text-[0.8125rem] font-semibold text-tinta hover:border-tenue"
                >
                  Cambiar
                </Link>
                {u.rolPlataforma && (
                  <form action={salirDeAlcaldiaAccion} className="hidden md:block">
                    <button
                      type="submit"
                      className="text-[0.8125rem] font-semibold text-marca-texto hover:underline"
                    >
                      Volver a la plataforma
                    </button>
                  </form>
                )}
              </>
            ) : (
              <>
                <strong className="truncate font-semibold text-tinta">
                  {u.rolPlataforma ? "Plataforma" : "Sin alcaldía elegida"}
                </strong>
                <Link
                  href="/alcaldia"
                  className="shrink-0 rounded-control border border-linea px-2.5 py-1 text-[0.8125rem] font-semibold text-tinta hover:border-tenue"
                >
                  <span className="sm:hidden">Alcaldías</span>
                  <span className="hidden sm:inline">Entrar a una alcaldía</span>
                </Link>
              </>
            )}
          </div>
          <MenuUsuario nombre={nombreCompleto(u)} rol={rol} correo={u.correo} />
        </header>
        <main id="contenido" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

/** Esqueleto del marco mientras se lee la sesión. */
export function MarcoPanelEsqueleto() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]" aria-busy="true">
      <aside className="hidden border-r border-linea bg-superficie lg:block" />
      <div>
        <div className="h-14 border-b border-linea" />
        <div className="space-y-4 px-4 py-8 sm:px-6 lg:px-8">
          <div className="skeleton h-8 w-64 rounded" />
          <div className="skeleton h-4 w-96 max-w-full rounded" />
          <div className="skeleton mt-8 h-72 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
