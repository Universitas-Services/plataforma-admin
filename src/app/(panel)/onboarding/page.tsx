import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  ConfirmarOnboarding,
  PasoColores,
  PasoLema,
  PasoLogo,
} from "@/components/onboarding/formularios";
import { LineaPasos, PASOS, type Paso } from "@/components/onboarding/pasos";
import { VistaPreviaMarca } from "@/components/onboarding/vista-previa";
import { EsqueletoAsistente } from "@/components/ui/esqueletos";
import { EncabezadoPagina } from "@/components/ui/piezas";
import { faltanteOnboarding, urlLogo } from "@/lib/plataforma/servicio";
import { exigirSesion } from "@/lib/plataforma/sesion";

export const metadata: Metadata = { title: "Configura tu alcaldía" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function OnboardingPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<EsqueletoAsistente />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

const TITULOS: Record<Paso, { titulo: string; bajada: string }> = {
  logo: {
    titulo: "Sube el logo de la alcaldía",
    bajada: "Aparecerá en el panel junto al nombre de la alcaldía.",
  },
  colores: {
    titulo: "Elige los colores",
    bajada: "Comprobamos que el texto y la línea del panel se vean bien con el color que elijas.",
  },
  lema: { titulo: "Escribe el lema", bajada: "Es opcional; puedes cambiarlo más adelante." },
  resumen: {
    titulo: "Revisa y confirma",
    bajada: "Al confirmar, todo el equipo de la alcaldía verá el panel con esta marca.",
  },
};

/** Asistente obligatorio del primer ingreso (backlog 2.6): logo → colores → lema → resumen. */
async function Contenido({ searchParams }: { searchParams: SearchParams }) {
  const c = await exigirSesion("/onboarding");
  const a = c.alcaldia;
  if (!a || a.estado !== "ONBOARDING_PENDIENTE") redirect("/");
  if (!c.roles.includes("ADMIN") && !c.usuario.rolPlataforma) redirect("/alcaldia?pendiente=1");

  const { paso: pedido } = await searchParams;
  const b = a.borradorMarca ?? {};
  const falta = faltanteOnboarding(a);
  let paso: Paso = PASOS.some((p) => p.clave === pedido) ? (pedido as Paso) : (falta ?? "logo");
  // No se salta un paso obligatorio: sin logo no hay colores, sin ambos no hay resumen.
  if (paso === "colores" && !b.logo) paso = "logo";
  if ((paso === "lema" || paso === "resumen") && falta) paso = falta;
  if (paso !== pedido) redirect(`/onboarding?paso=${paso}`);

  const hechos: Paso[] = [];
  if (b.logo) hechos.push("logo");
  if (b.primario) hechos.push("colores");
  if (b.primario && b.lema !== undefined) hechos.push("lema");
  const id = { nombre: a.nombre, sigla: a.sigla };
  const logo = b.logo ? urlLogo(a.id, b.logo.version, true) : undefined;

  return (
    <div className="max-w-5xl">
      <EncabezadoPagina titulo={TITULOS[paso].titulo} bajada={TITULOS[paso].bajada} />
      <LineaPasos actual={paso} hechos={hechos} />

      {paso === "logo" && <PasoLogo {...id} actual={logo} />}
      {paso === "colores" && (
        <PasoColores
          {...id}
          primario={b.primario}
          secundario={b.secundario}
          logo={logo}
          lema={b.lema}
        />
      )}
      {paso === "lema" && <PasoLema {...id} lema={b.lema} primario={b.primario} logo={logo} />}
      {paso === "resumen" && (
        <>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <dl className="divide-y divide-fila rounded-lg border border-linea">
              <div className="flex items-center gap-4 px-4 py-4">
                <dt className="w-28 shrink-0 text-sm text-gris">Logo</dt>
                <dd>
                  {logo && (
                    // eslint-disable-next-line @next/next/no-img-element -- logo del borrador servido por /logos
                    <img
                      src={logo}
                      alt={`Logo de ${a.nombre}`}
                      className="size-16 rounded-md object-contain"
                    />
                  )}
                </dd>
              </div>
              <div className="flex items-center gap-4 px-4 py-4">
                <dt className="w-28 shrink-0 text-sm text-gris">Colores</dt>
                <dd className="flex flex-wrap items-center gap-3 font-semibold text-tinta">
                  {[b.primario, b.secundario].filter(Boolean).map((col) => (
                    <span key={col} className="inline-flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="size-6 rounded-md ring-1 ring-linea"
                        style={{ background: col }}
                      />
                      {col}
                    </span>
                  ))}
                </dd>
              </div>
              <div className="flex items-center gap-4 px-4 py-4">
                <dt className="w-28 shrink-0 text-sm text-gris">Lema</dt>
                <dd className="text-tinta">
                  {b.lema || <span className="text-gris">Sin lema</span>}
                </dd>
              </div>
            </dl>
            <VistaPreviaMarca
              {...id}
              primario={b.primario}
              secundario={b.secundario}
              logo={logo}
              lema={b.lema}
            />
          </div>
          <ConfirmarOnboarding />
        </>
      )}
    </div>
  );
}
