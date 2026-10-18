import type { Metadata } from "next";
import { Suspense } from "react";
import { EsqueletoSeccion } from "@/components/ui/esqueletos";
import { PendienteDeBloque } from "@/components/panel/pendiente-bloque";
import { exigirEnAlcaldia } from "@/lib/plataforma/sesion";

export const metadata: Metadata = { title: "Equipo" };

export default function EquipoPage() {
  return (
    <Suspense fallback={<EsqueletoSeccion />}>
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
