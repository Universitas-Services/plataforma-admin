import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MarcoPanelEsqueleto } from "@/components/panel/marco-panel";
import { getContexto } from "@/lib/plataforma/sesion";

/*
 * La raíz solo decide a dónde ir: al tablero con sesión, a ingresar sin ella. Normalmente lo
 * resuelve el proxy antes de renderizar; si llega aquí, mientras se revisa la sesión se ve el
 * esqueleto del panel, nunca una pantalla en blanco.
 */
export default function Inicio() {
  return (
    <Suspense fallback={<MarcoPanelEsqueleto />}>
      <Destino />
    </Suspense>
  );
}

async function Destino() {
  const c = await getContexto();
  if (!c) redirect("/ingresar");
  redirect("/tablero");
  return null;
}
