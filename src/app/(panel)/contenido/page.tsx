import type { Metadata } from "next";
import { Suspense } from "react";
import { PendienteDeBloque } from "@/components/panel/pendiente-bloque";
import { exigirEnAlcaldia } from "@/lib/plataforma/sesion";

export const metadata: Metadata = { title: "Contenido" };

export default function ContenidoPage() {
  return (
    <Suspense fallback={<div className="skeleton h-80 rounded-lg" />}>
      <Contenido />
    </Suspense>
  );
}

// Backlog 2.9 (feat/contenido-operador).
async function Contenido() {
  await exigirEnAlcaldia("contenido.editar", "/contenido");
  return (
    <PendienteDeBloque
      titulo="Contenido"
      bajada="Noticias, banners y documentos del portal de tu alcaldía."
      incluye={[
        "Noticias en 5 formatos: texto, imagen, galería, documento y video (archivo, YouTube o Instagram)",
        "Puntos de análisis, botón opcional, destacada y texto alternativo obligatorio",
        "Banners con vigencia y orden",
        "Documentos con versiones, borrador u oficial",
      ]}
    />
  );
}
