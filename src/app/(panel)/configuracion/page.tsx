import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EditorCatalogo, EditorFases, FormularioMarca } from "@/components/alcaldia/configuracion";
import { EsqueletoFormulario } from "@/components/ui/esqueletos";
import { EncabezadoPagina } from "@/components/ui/piezas";
import { catalogosDe, procesoDe } from "@/lib/plataforma/alcaldia";
import { urlLogo } from "@/lib/plataforma/servicio";
import { almacen, exigirEnAlcaldia } from "@/lib/plataforma/sesion";
import { MARCA_PLATAFORMA } from "@/lib/marca";
import { TIPOS_CATALOGO, type TipoCatalogo } from "@/lib/plataforma/tipos";

export const metadata: Metadata = { title: "Configuración" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PESTANAS = [
  { clave: "marca", texto: "Marca" },
  { clave: "catalogos", texto: "Catálogos" },
  { clave: "fases", texto: "Fases del proceso" },
] as const;

export default function ConfiguracionPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<EsqueletoFormulario campos={4} />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

/** Backlog 2.12: marca, catálogos y fases del proceso de la alcaldía. */
async function Contenido({ searchParams }: { searchParams: SearchParams }) {
  const c = await exigirEnAlcaldia("marca.configurar", "/configuracion");
  await connection();
  const sp = await searchParams;
  const pestana = PESTANAS.find((p) => p.clave === sp.pestana)?.clave ?? "marca";
  const alm = almacen();
  const a = alm.alcaldias.get(c.alcaldia.id) ?? c.alcaldia;
  const catalogos = catalogosDe(alm, a.id);
  const proceso = procesoDe(alm, a.id) ?? { fases: [], actual: 0 };

  return (
    <>
      <EncabezadoPagina
        titulo="Configuración"
        bajada="Lo que el portal ciudadano de tu alcaldía toma de aquí: marca, listas y fases."
      />

      <nav aria-label="Secciones de la configuración" className="mb-6 border-b border-linea">
        <ul className="-mb-px flex gap-1 overflow-x-auto">
          {PESTANAS.map((p) => (
            <li key={p.clave}>
              <Link
                href={`/configuracion?pestana=${p.clave}`}
                aria-current={p.clave === pestana ? "page" : undefined}
                className={`inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-semibold whitespace-nowrap ${
                  p.clave === pestana
                    ? "border-marca text-tinta"
                    : "border-transparent text-gris hover:text-tinta"
                }`}
              >
                {p.texto}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {pestana === "marca" && (
        <FormularioMarca
          nombre={a.nombre}
          sigla={a.sigla}
          primario={a.marca?.primario ?? MARCA_PLATAFORMA}
          secundario={a.marca?.secundario}
          lema={a.marca?.lema}
          logo={a.marca?.logo ? urlLogo(a.id, a.marca.logo.version) : undefined}
        />
      )}

      {pestana === "catalogos" && (
        <>
          <p className="mb-4 max-w-3xl text-cuerpo">
            Las listas que el portal ofrece al registrarse y al participar. Un valor desactivado
            deja de ofrecerse, pero los registros que ya lo usan lo conservan.
          </p>
          <div className="grid gap-5 lg:grid-cols-2">
            {(Object.keys(TIPOS_CATALOGO) as TipoCatalogo[]).map((t) => (
              <EditorCatalogo
                key={t}
                tipo={t}
                titulo={TIPOS_CATALOGO[t]}
                items={catalogos?.[t] ?? []}
              />
            ))}
          </div>
        </>
      )}

      {pestana === "fases" && (
        <>
          <p className="mb-4 max-w-3xl text-cuerpo">
            Las etapas del Plan de Desarrollo Urbano Local. La fase actual es la que el termómetro
            del portal muestra resaltada.
          </p>
          <EditorFases fases={proceso.fases} actual={proceso.actual} />
        </>
      )}
    </>
  );
}
