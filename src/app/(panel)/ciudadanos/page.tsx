import type { Metadata } from "next";
import { Suspense } from "react";
import { PendienteDeBloque } from "@/components/panel/pendiente-bloque";
import { exigirEnAlcaldia } from "@/lib/plataforma/sesion";

export const metadata: Metadata = { title: "Ciudadanos" };

export default function CiudadanosPage() {
  return (
    <Suspense fallback={<div className="skeleton h-80 rounded-lg" />}>
      <Contenido />
    </Suspense>
  );
}

// Backlog 2.11 (feat/ciudadanos).
async function Contenido() {
  await exigirEnAlcaldia("ciudadanos.ver", "/ciudadanos");
  return (
    <PendienteDeBloque
      titulo="Ciudadanos"
      bajada="Personas y organizaciones registradas en el portal de tu alcaldía."
      incluye={[
        "Tabla con la cédula enmascarada",
        "Detalle con sus documentos de identidad para cotejar",
        "Suspender o reactivar la membresía con motivo",
        "Exportar a CSV",
      ]}
    />
  );
}
