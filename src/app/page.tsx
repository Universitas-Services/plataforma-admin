import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getContexto } from "@/lib/plataforma/sesion";

/** La raíz solo decide a dónde ir: al tablero con sesión, a ingresar sin ella. */
export default function Inicio() {
  return (
    <Suspense>
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
