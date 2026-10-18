import type { Metadata } from "next";
import { Suspense } from "react";
import { EsqueletoSeccion } from "@/components/ui/esqueletos";
import { PendienteDeBloque } from "@/components/panel/pendiente-bloque";
import { exigirEnAlcaldia } from "@/lib/plataforma/sesion";

export const metadata: Metadata = { title: "Configuración" };

export default function ConfiguracionPage() {
  return (
    <Suspense fallback={<EsqueletoSeccion />}>
      <Contenido />
    </Suspense>
  );
}

// Backlog 2.12 (feat/configuracion).
async function Contenido() {
  await exigirEnAlcaldia("marca.configurar", "/configuracion");
  return (
    <PendienteDeBloque
      titulo="Configuración"
      bajada="Marca, catálogos y fases del proceso."
      incluye={[
        "Marca: logo, colores con chequeo de contraste y lema",
        "Catálogos: parroquias, categorías y ocupaciones",
        "Fases del proceso y fase actual con vista previa del termómetro",
      ]}
    />
  );
}
