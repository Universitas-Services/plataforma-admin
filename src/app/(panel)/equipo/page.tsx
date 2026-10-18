import type { Metadata } from "next";
import { Suspense } from "react";
import { PendienteDeBloque } from "@/components/panel/pendiente-bloque";
import { exigirEnAlcaldia } from "@/lib/plataforma/sesion";

export const metadata: Metadata = { title: "Equipo" };

export default function EquipoPage() {
  return (
    <Suspense fallback={<div className="skeleton h-80 rounded-lg" />}>
      <Contenido />
    </Suspense>
  );
}

// Backlog 2.8 (feat/plataforma).
async function Contenido() {
  await exigirEnAlcaldia("equipo.gestionar", "/equipo");
  return (
    <PendienteDeBloque
      titulo="Equipo"
      bajada="Operadores y revisores de tu alcaldía."
      incluye={[
        "Invitar con los roles Operador y Revisor",
        "Editar roles, activar o desactivar",
        "Reenviar invitaciones",
      ]}
    />
  );
}
