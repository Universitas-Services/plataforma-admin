import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getContexto } from "@/lib/plataforma/sesion";

/** La raíz solo decide a dónde ir según la sesión y la alcaldía en uso. */
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
  if (c.alcaldia) redirect("/tablero");
  redirect(c.usuario.rolPlataforma ? "/plataforma" : "/alcaldia");
  return null;
}
