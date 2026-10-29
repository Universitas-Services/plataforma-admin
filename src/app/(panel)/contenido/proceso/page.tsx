import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PestanasContenido } from "@/components/contenido/pestanas";
import { EditorFases } from "@/components/contenido/proceso";
import { EsqueletoFormulario } from "@/components/ui/esqueletos";
import { EncabezadoPagina } from "@/components/ui/piezas";
import { procesoDe } from "@/lib/plataforma/alcaldia";
import { almacen, exigirEnAlcaldia } from "@/lib/plataforma/sesion";
import { usaApi } from "@/lib/api/cliente";
import { procesoApi } from "@/lib/api/proceso";

export const metadata: Metadata = { title: "Proceso" };

export default function ProcesoPage() {
  return (
    <Suspense fallback={<EsqueletoFormulario campos={4} />}>
      <Contenido />
    </Suspense>
  );
}

/** Fases del PDUL y fase actual: lo que pinta el termómetro del Inicio del portal. */
async function Contenido() {
  const c = await exigirEnAlcaldia("proceso.editar", "/contenido/proceso");
  await connection();
  const proceso = (usaApi() ? await procesoApi() : procesoDe(almacen(), c.alcaldia.id)) ?? {
    fases: [],
    actual: 0,
  };
  return (
    <>
      <EncabezadoPagina
        titulo="Contenido"
        bajada="Lo que tu alcaldía publica en el portal ciudadano."
      />
      <PestanasContenido />
      <p className="mb-4 max-w-3xl text-cuerpo">
        Las etapas del Plan de Desarrollo Urbano Local. La fase actual es la que el termómetro del
        Inicio del portal muestra resaltada.
      </p>
      <EditorFases fases={proceso.fases} actual={proceso.actual} />
    </>
  );
}
