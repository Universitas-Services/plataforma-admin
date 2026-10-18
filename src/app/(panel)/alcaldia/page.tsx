import type { Metadata } from "next";
import { Suspense } from "react";
import { EsqueletoEncabezado, EsqueletoLista } from "@/components/ui/esqueletos";
import { BotonEntrar } from "@/components/panel/boton-entrar";
import { SiglaAlcaldia } from "@/components/panel/sigla-alcaldia";
import { EncabezadoPagina, InsigniaEstado } from "@/components/ui/piezas";
import { rolesEn } from "@/lib/plataforma/permisos";
import { exigirSesion } from "@/lib/plataforma/sesion";
import { NOMBRE_ROL } from "@/lib/plataforma/tipos";

export const metadata: Metadata = { title: "Elegir alcaldía" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function AlcaldiaPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense
      fallback={
        <>
          <EsqueletoEncabezado />
          <EsqueletoLista />
        </>
      }
    >
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

async function Contenido({ searchParams }: { searchParams: SearchParams }) {
  const c = await exigirSesion("/alcaldia");
  const { pendiente, error } = await searchParams;
  const plataforma = !!c.usuario.rolPlataforma;

  return (
    <div className="max-w-3xl">
      <EncabezadoPagina
        titulo="¿En qué alcaldía vas a trabajar?"
        bajada={
          plataforma
            ? "Como parte del equipo de la plataforma puedes operar en cualquiera; cada entrada queda en la bitácora."
            : "Tienes acceso a más de una alcaldía. Puedes cambiar cuando quieras desde la franja superior."
        }
      />
      {pendiente && (
        <p
          role="status"
          className="mb-6 rounded-lg bg-ambar/10 p-4 text-sm text-tinta ring-1 ring-ambar/40 ring-inset"
        >
          Esa alcaldía todavía está configurando su panel. Podrás entrar cuando su administrador
          termine el asistente.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mb-6 rounded-lg bg-peligro-suave p-4 text-sm text-tinta ring-1 ring-peligro/30 ring-inset"
        >
          No tienes acceso a esa alcaldía.
        </p>
      )}
      <ul className="divide-y divide-fila rounded-lg border border-linea">
        {c.alcaldias.map((a) => {
          const roles = rolesEn(c.usuario, a.id);
          const actual = c.alcaldia?.id === a.id;
          return (
            <li
              key={a.id}
              className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 px-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]"
            >
              <SiglaAlcaldia alcaldia={a} />
              <div className="min-w-0">
                <p className="font-semibold text-tinta">
                  {a.nombre}
                  {actual && <span className="ml-2 text-sm font-normal text-gris">(en uso)</span>}
                </p>
                <p className="text-sm text-gris">
                  {plataforma
                    ? "Acceso de plataforma"
                    : roles.map((r) => NOMBRE_ROL[r]).join(" y ")}
                </p>
              </div>
              <div className="col-span-2 flex flex-wrap items-center justify-between gap-3 sm:col-span-1 sm:contents">
                {a.estado !== "ACTIVA" ? <InsigniaEstado estado={a.estado} /> : <span />}
                <BotonEntrar
                  alcaldia={a.id}
                  nombre={a.nombre}
                  texto={actual ? "Seguir aquí" : "Entrar"}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
