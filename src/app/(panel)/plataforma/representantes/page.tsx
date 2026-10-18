import type { Metadata } from "next";
import { Suspense } from "react";
import { EsqueletoSeccion } from "@/components/ui/esqueletos";
import { PendienteDeBloque } from "@/components/panel/pendiente-bloque";
import { exigirPermiso } from "@/lib/plataforma/sesion";

export const metadata: Metadata = { title: "Representantes" };

export default function RepresentantesPage() {
  return (
    <Suspense fallback={<EsqueletoSeccion />}>
      <Contenido />
    </Suspense>
  );
}

// Backlog 2.7 (feat/plataforma).
async function Contenido() {
  await exigirPermiso("plataforma.reservado", "/plataforma/representantes");
  return (
    <PendienteDeBloque
      titulo="Representantes"
      bajada="Cuentas de AVIPRI y Universitas. Solo el Super Admin las gestiona."
      incluye={[
        "Invitar representantes y asociarlos a su entidad",
        "Activar o desactivar con motivo",
        "Entidades",
      ]}
    />
  );
}
