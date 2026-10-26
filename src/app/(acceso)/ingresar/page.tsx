import type { Metadata } from "next";
import { Suspense } from "react";
import { EsqueletoFormulario } from "@/components/ui/esqueletos";
import { FormIngreso } from "@/components/acceso/formularios";
import { AvisoEstado, MarcoAcceso } from "@/components/acceso/marco-acceso";
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
  const { volver } = await searchParams;
  const destino = typeof volver === "string" ? volver : undefined;
  await soloInvitados(destino);
  const aviso = await leerAviso();
  return (
    <>
      {aviso && <AvisoEstado tipo="exito">{aviso}</AvisoEstado>}
      <FormIngreso volver={destino} />
    </>
  );
}
