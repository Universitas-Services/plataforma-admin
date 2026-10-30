import { ChevronRight, FileText, Globe } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EsqueletoFormulario } from "@/components/ui/esqueletos";
import { EncabezadoPagina } from "@/components/ui/piezas";
import { EditorCatalogo } from "@/components/configuracion/editor-catalogo";
import { usaApi } from "@/lib/api/cliente";
import { catalogosApi } from "@/lib/api/catalogos";
import { catalogosConUsos } from "@/lib/plataforma/alcaldia";
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
 * Catálogos de la alcaldía: los desplegables del portal. El Administrador los edita (R16).
 * Las fases del proceso se editan en Contenido → Proceso.
 */
async function Contenido() {
  const c = await exigirEnAlcaldia("configuracion.ver", "/configuracion");
  await connection();
  const catalogos = usaApi() ? await catalogosApi() : catalogosConUsos(almacen(), c.alcaldia.id);
  const editable = c.permisos.has("catalogos.editar");

  return (
    <>
      <EncabezadoPagina
        titulo="Configuración"
        bajada="Los desplegables que el portal ciudadano ofrece al registrarse y al participar."
      />
      {c.permisos.has("sitio.editar") && (
        <Link
          href="/configuracion/sitio"
          className="mb-3 flex max-w-3xl items-center justify-between gap-4 rounded-lg border border-linea bg-papel p-4 hover:border-tenue"
        >
          <span>
            <span className="flex items-center gap-2 font-bold text-tinta">
              <Globe size={18} aria-hidden="true" className="text-marca-texto" />
              Datos del sitio
            </span>
            <span className="mt-0.5 block text-sm text-gris">
              Alcalde, contacto, redes y enlaces del pie de página del portal.
            </span>
          </span>
          <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-gris" />
        </Link>
      )}
      {c.permisos.has("legal.editar") && (
        <Link
          href="/configuracion/textos-legales"
          className="mb-6 flex max-w-3xl items-center justify-between gap-4 rounded-lg border border-linea bg-papel p-4 hover:border-tenue"
        >
          <span>
            <span className="flex items-center gap-2 font-bold text-tinta">
              <FileText size={18} aria-hidden="true" className="text-marca-texto" />
              Textos legales del portal
            </span>
            <span className="mt-0.5 block text-sm text-gris">
              Términos de uso y política de tratamiento de datos: publica versiones nuevas.
            </span>
          </span>
          <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-gris" />
        </Link>
      )}
      <p className="mb-4 max-w-3xl text-cuerpo">
        {editable
          ? "Agrega, renombra u ordena los valores. Los valores no se borran: desactivado, el portal deja de ofrecerlo, pero lo ya guardado lo conserva."
          : "Los administra el Administrador de la alcaldía."}{" "}
        Las fases del proceso se editan en Contenido → Proceso.
      </p>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        {(Object.keys(TIPOS_CATALOGO) as TipoCatalogo[]).map((t) => {
          if (editable)
            return (
              <EditorCatalogo
                key={t}
                tipo={t}
                titulo={TIPOS_CATALOGO[t]}
                items={catalogos?.[t] ?? []}
              />
            );
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
