import Link from "next/link";
import { Suspense } from "react";
import {
  PaginaError,
  claseAccionError,
  claseAccionErrorPrimaria,
} from "@/components/ui/pagina-error";
import { getContexto } from "@/lib/plataforma/sesion";

/** 404 dentro del panel: «Estación fuera de servicio», con las estaciones del usuario. */
export default function NoEncontradaPanel() {
  return (
    <PaginaError
      codigo="404"
      titulo="Esta estación no existe"
      conLogo={false}
      acciones={
        <Suspense
          fallback={
            <Link href="/" className={claseAccionErrorPrimaria}>
              Ir a mi inicio
            </Link>
          }
        >
          <Sugerencias />
        </Suspense>
      }
    >
      La dirección que buscaste no lleva a ninguna sección del panel. Puede que el enlace esté
      incompleto o que la página se haya movido. Desde aquí puedes seguir:
    </PaginaError>
  );
}

async function Sugerencias() {
  const c = await getContexto();
  // Con el onboarding pendiente, o sin alcaldía elegida, la única estación en servicio es esa.
  const estaciones =
    c?.alcaldia?.estado === "ONBOARDING_PENDIENTE"
      ? [{ href: "/onboarding", etiqueta: "Configuración inicial" }]
      : c && !c.alcaldia && !c.usuario.rolPlataforma
        ? [{ href: "/alcaldia", etiqueta: "Elegir alcaldía" }]
        : (c?.secciones ?? []).slice(0, 4);
  if (!estaciones.length)
    return (
      <Link href="/" className={claseAccionErrorPrimaria}>
        Ir a mi inicio
      </Link>
    );
  return (
    <ul className="flex flex-wrap gap-3">
      {estaciones.map((s, i) => (
        <li key={s.href}>
          <Link href={s.href} className={i === 0 ? claseAccionErrorPrimaria : claseAccionError}>
            {s.etiqueta}
          </Link>
        </li>
      ))}
    </ul>
  );
}
