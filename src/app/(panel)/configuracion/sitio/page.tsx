import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormularioSitio } from "@/components/configuracion/formulario-sitio";
import { EsqueletoFormulario } from "@/components/ui/esqueletos";
import { EncabezadoPagina } from "@/components/ui/piezas";
import { usaApi } from "@/lib/api/cliente";
import { sitioApi } from "@/lib/api/sitio";
import { almacen, exigirEnAlcaldia } from "@/lib/plataforma/sesion";
import { SITIO_INICIAL, sitioDe } from "@/lib/plataforma/sitio";

export const metadata: Metadata = { title: "Datos del sitio" };

export default function DatosSitioPage() {
  return (
    <Suspense fallback={<EsqueletoFormulario campos={6} />}>
      <Contenido />
    </Suspense>
  );
}

/** Alcalde, contacto, redes y enlaces del pie de página del portal (R17). */
async function Contenido() {
  await exigirEnAlcaldia("sitio.editar", "/configuracion/sitio");
  await connection();
  let sitio = sitioDe(almacen());
  if (usaApi()) {
    const r = await sitioApi();
    if (r.estado !== "OK") return null; // exigirEnAlcaldia ya cubrió sesión y permiso.
    // Sin datos guardados todavía, la API puede responder vacío: se parte de los de hoy.
    sitio = { ...SITIO_INICIAL, ...r.sitio };
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Datos del sitio"
        bajada="Lo que el portal muestra del alcalde, el contacto, las redes y los enlaces del pie de página."
      />
      <FormularioSitio inicial={sitio} />
    </>
  );
}
