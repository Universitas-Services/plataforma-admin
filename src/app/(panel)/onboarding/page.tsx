import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { EncabezadoPagina } from "@/components/ui/piezas";
import { exigirSesion } from "@/lib/plataforma/sesion";

export const metadata: Metadata = { title: "Configura tu alcaldía" };

const PASOS = [
  ["Logo", "Sube el logo de la alcaldía (PNG, JPG o SVG de hasta 1 MB) y recórtalo."],
  ["Colores", "Elige el color primario; comprobamos que el texto sobre él se lea bien."],
  ["Lema", "Opcional, hasta 120 caracteres."],
  ["Resumen", "Revisa cómo se verá el panel y confirma."],
] as const;

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="skeleton h-80 rounded-lg" />}>
      <Contenido />
    </Suspense>
  );
}

/** Asistente obligatorio del primer ingreso (backlog 2.6, rama feat/onboarding-admin). */
async function Contenido() {
  const c = await exigirSesion("/onboarding");
  const a = c.alcaldia;
  if (!a || a.estado !== "ONBOARDING_PENDIENTE") redirect("/");
  if (!c.roles.includes("ADMIN") && !c.usuario.rolPlataforma) redirect("/alcaldia?pendiente=1");

  return (
    <div className="max-w-2xl">
      <EncabezadoPagina
        titulo="Configura el panel de tu alcaldía"
        bajada={`${a.nombre}: antes de empezar, define cómo se verá el panel para todo tu equipo.`}
      />
      <ol className="relative space-y-6 border-l-4 border-marca pl-8">
        {PASOS.map(([titulo, texto], i) => (
          <li key={titulo} className="relative">
            <span
              aria-hidden="true"
              className={`absolute top-1 rounded-full ${
                i === 0
                  ? "-left-[2.75rem] size-6 border-[3px] border-papel bg-marca shadow-[0_0_0_2px_var(--marca)]"
                  : "-left-[2.5rem] size-4 border-[3px] border-marca bg-papel"
              }`}
            />
            <p className="font-semibold text-tinta">
              {i + 1}. {titulo}
            </p>
            <p className="text-gris">{texto}</p>
          </li>
        ))}
      </ol>
      <p className="mt-8 rounded-lg bg-superficie p-4 text-sm text-gris">
        El asistente estará disponible muy pronto. Mientras tanto, el resto del panel de esta
        alcaldía queda en pausa: así nadie publica con una marca a medio configurar.
      </p>
    </div>
  );
}
