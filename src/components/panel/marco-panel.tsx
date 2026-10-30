import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { ALCALDIA } from "@/config/alcaldia";
import { ErrorApi } from "@/lib/api/cliente";
import { porAtender as contarPorAtender } from "@/lib/plataforma/participaciones-datos";
import { nombreCompleto } from "@/lib/plataforma/servicio";
import { getContexto } from "@/lib/plataforma/sesion";
import { NOMBRE_ROL } from "@/lib/plataforma/tipos";
import { Linea } from "./linea";
import { MenuUsuario } from "./menu-usuario";
import { NavegacionMovil } from "./navegacion-movil";
import { SiglaAlcaldia } from "./sigla-alcaldia";
import { SinConexion } from "./sin-conexion";

/**
 * Marco del panel de la alcaldía: la línea (sidebar) con las estaciones según los permisos y la
 * barra superior con el nombre de la alcaldía. Una sola alcaldía por despliegue: no hay
 * selector. El Super Admin ve una franja que recuerda que opera con todos los permisos.
 */
export async function MarcoPanel({ children }: { children: ReactNode }) {
  let c: Awaited<ReturnType<typeof getContexto>>;
  try {
    c = await getContexto();
  } catch (e) {
    // La API no respondió al revisar la sesión: un aviso con Reintentar, no un 500 en blanco.
    if (e instanceof ErrorApi && e.status >= 500) return <SinConexion />;
    throw e;
  }
  if (!c) redirect("/ingresar");
  const { usuario: u, alcaldia: a } = c;

  // La estación de Participaciones muestra cuántas esperan (pendientes y en revisión).
  const porAtender = c.permisos.has("participaciones.evaluar") ? await contarPorAtender(a.id) : 0;
  const estaciones = c.secciones.map((s) => ({
    href: s.href,
    etiqueta: s.etiqueta,
    contador: s.href === "/participaciones" && porAtender > 0 ? porAtender : undefined,
  }));
  const nombreLinea = `Línea ${ALCALDIA.nombreCorto}`;
  const rol = u.rolPlataforma
    ? NOMBRE_ROL[u.rolPlataforma]
    : c.roles.map((r) => NOMBRE_ROL[r]).join(" y ");

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh overflow-y-auto border-r border-linea bg-superficie lg:block">
        <Linea estaciones={estaciones} sigla={ALCALDIA.sigla} nombreLinea={nombreLinea} />
      </aside>
      <div className="flex min-w-0 flex-col">
        {u.rolPlataforma && (
          <p className="flex items-center justify-center gap-2 bg-noche px-4 py-1.5 text-center text-xs font-medium text-papel">
            <ShieldCheck size={14} aria-hidden="true" className="shrink-0" />
            Sesión de Super Admin: operas la {ALCALDIA.nombre} con todos los permisos y queda en la
            bitácora.
          </p>
        )}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-linea bg-papel/95 pr-3 pl-2 backdrop-blur-sm sm:pr-6 lg:pl-8">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-marca" />
          <NavegacionMovil
            estaciones={estaciones}
            sigla={ALCALDIA.sigla}
            nombreLinea={nombreLinea}
          />
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm sm:gap-3">
            <span className="sm:hidden">
              <SiglaAlcaldia tamano="sm" />
            </span>
            <strong className="truncate font-semibold text-tinta">
              <span className="sm:hidden">{ALCALDIA.nombreCorto}</span>
              <span className="hidden sm:inline">{a.nombre}</span>
            </strong>
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
      <aside aria-hidden="true" className="hidden border-r border-linea bg-superficie lg:block">
        <div className="border-b border-linea p-5">
          <div className="skeleton h-11 w-36 rounded-md" />
          <div className="skeleton mt-2 h-3 w-40 rounded" />
        </div>
        <div className="skeleton mx-5 mt-5 h-6 w-36 rounded" />
        <div className="relative mt-3 ml-[1.9375rem] w-1 bg-linea" style={{ height: "11rem" }} />
      </aside>
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
