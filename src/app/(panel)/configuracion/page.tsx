import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { EsqueletoFormulario } from "@/components/ui/esqueletos";
import { EncabezadoPagina } from "@/components/ui/piezas";
import { catalogosDe } from "@/lib/plataforma/alcaldia";
import { almacen, exigirEnAlcaldia } from "@/lib/plataforma/sesion";
import { TIPOS_CATALOGO, type TipoCatalogo } from "@/lib/plataforma/tipos";

export const metadata: Metadata = { title: "Configuración" };

export default function ConfiguracionPage() {
  return (
    <Suspense fallback={<EsqueletoFormulario campos={4} />}>
      <Contenido />
    </Suspense>
  );
}

/**
 * Catálogos de la alcaldía: solo lectura, fijos por despliegue (los carga el equipo técnico).
 * Las fases del proceso se editan en Contenido → Proceso.
 */
async function Contenido() {
  const c = await exigirEnAlcaldia("configuracion.ver", "/configuracion");
  await connection();
  const catalogos = catalogosDe(almacen(), c.alcaldia.id);

  return (
    <>
      <EncabezadoPagina
        titulo="Configuración"
        bajada="Las listas que el portal ciudadano ofrece al registrarse y al participar."
      />
      <p className="mb-4 max-w-3xl text-cuerpo">
        Las define el equipo técnico al desplegar el panel de la alcaldía; si hace falta un cambio,
        pídelo por soporte. Las fases del proceso se editan en Contenido → Proceso.
      </p>
      <div className="grid gap-5 lg:grid-cols-2">
        {(Object.keys(TIPOS_CATALOGO) as TipoCatalogo[]).map((t) => {
          const items = (catalogos?.[t] ?? []).filter((i) => i.activo);
          return (
            <section
              key={t}
              aria-labelledby={`cat-${t}`}
              className="rounded-lg border border-linea bg-papel p-4"
            >
              <h2
                id={`cat-${t}`}
                className="flex items-baseline justify-between gap-3 text-base font-bold"
              >
                {TIPOS_CATALOGO[t]}
                <span className="text-sm font-medium text-gris tabular-nums">{items.length}</span>
              </h2>
              {items.length ? (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {items.map((i) => (
                    <li
                      key={i.id}
                      className="rounded-full border border-linea px-3 py-1 text-sm text-tinta"
                    >
                      {i.nombre}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-gris">Sin valores cargados.</p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
