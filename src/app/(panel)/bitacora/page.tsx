import type { Metadata } from "next";
import { Suspense } from "react";
import { EsqueletoSeccion } from "@/components/ui/esqueletos";
import { PendienteDeBloque } from "@/components/panel/pendiente-bloque";
import { exigirEnAlcaldia } from "@/lib/plataforma/sesion";

export const metadata: Metadata = { title: "Bitácora" };

export default function BitacoraPage() {
  return (
    <Suspense fallback={<EsqueletoSeccion />}>
      <Contenido />
    </Suspense>
  );
}

// Backlog 2.13 (feat/bitacora-tablero).
async function Contenido() {
  await exigirEnAlcaldia("bitacora.ver", "/bitacora");
  return (
    <PendienteDeBloque
      titulo="Bitácora"
      bajada="Cada acción del equipo de tu alcaldía queda registrada."
      incluye={[
        "Filtros por actor, acción, entidad y fechas",
        "Diferencias antes y después",
        "Exportar a CSV",
      ]}
    />
  );
}
