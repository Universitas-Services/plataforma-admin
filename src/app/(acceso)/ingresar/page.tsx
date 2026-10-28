import type { Metadata } from "next";
import { Suspense } from "react";
import { EsqueletoFormulario } from "@/components/ui/esqueletos";
import { FormIngreso } from "@/components/acceso/formularios";
import { AvisoEstado, MarcoAcceso } from "@/components/acceso/marco-acceso";
import { INACTIVIDAD_MS } from "@/lib/api/renovacion";
import { leerAviso, soloInvitados } from "@/lib/plataforma/sesion";

export const metadata: Metadata = { title: "Iniciar sesión" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function IngresarPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <MarcoAcceso
      titulo="Iniciar sesión"
      bajada="Panel interno del equipo de la Alcaldía de Iribarren."
    >
      <Suspense fallback={<EsqueletoFormulario campos={2} />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </MarcoAcceso>
  );
}

async function Contenido({ searchParams }: { searchParams: SearchParams }) {
  const { volver, aviso: motivo } = await searchParams;
  const destino = typeof volver === "string" ? volver : undefined;
  await soloInvitados(destino);
  const aviso = await leerAviso();
  return (
    <>
      {aviso && <AvisoEstado tipo="exito">{aviso}</AvisoEstado>}
      {motivo === "inactividad" && (
        <AvisoEstado>
          Cerramos tu sesión porque pasaron {INACTIVIDAD_MS / 60_000} minutos sin actividad. Vuelve
          a ingresar para continuar.
        </AvisoEstado>
      )}
      <FormIngreso volver={destino} />
    </>
  );
}
