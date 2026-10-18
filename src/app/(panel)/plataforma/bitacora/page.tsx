import type { Metadata } from "next";
import { Suspense } from "react";
import { PendienteDeBloque } from "@/components/panel/pendiente-bloque";
import { exigirPermiso } from "@/lib/plataforma/sesion";

export const metadata: Metadata = { title: "Bitácora global" };

export default function BitacoraGlobalPage() {
  return (
    <Suspense fallback={<div className="skeleton h-80 rounded-lg" />}>
      <Contenido />
    </Suspense>
  );
}

// Backlog 2.13 (feat/bitacora-tablero).
async function Contenido() {
  await exigirPermiso("bitacora.global", "/plataforma/bitacora");
  return (
    <PendienteDeBloque
      titulo="Bitácora global"
      bajada="Lo que pasó en todas las alcaldías, con verificación de integridad."
      incluye={[
        "Filtros por alcaldía, actor, acción y fechas",
        "Diferencias antes y después",
        "Verificar integridad de la cadena",
        "Exportar a CSV",
      ]}
    />
  );
}
