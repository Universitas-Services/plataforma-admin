import type { Metadata } from "next";
import { Suspense } from "react";
import { PendienteDeBloque } from "@/components/panel/pendiente-bloque";
import { exigirPermiso } from "@/lib/plataforma/sesion";

export const metadata: Metadata = { title: "Alcaldías" };

export default function AlcaldiasPage() {
  return (
    <Suspense fallback={<div className="skeleton h-80 rounded-lg" />}>
      <Contenido />
    </Suspense>
  );
}

// Backlog 2.7 (feat/plataforma).
async function Contenido() {
  await exigirPermiso("alcaldias.gestionar", "/plataforma/alcaldias");
  return (
    <PendienteDeBloque
      titulo="Alcaldías"
      bajada="Alta, portales y estado de cada alcaldía de la plataforma."
      incluye={[
        "Tabla con filtros por estado y onboarding",
        "Crear alcaldía e invitar a su administrador",
        "Portales con el secreto mostrado una sola vez y su rotación",
        "Suspender o reactivar con motivo",
      ]}
    />
  );
}
