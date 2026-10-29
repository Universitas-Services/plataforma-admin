import { FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatearFecha } from "@/components/contenido/estado-noticia";
import { EsqueletoFormulario } from "@/components/ui/esqueletos";
import { EncabezadoPagina } from "@/components/ui/piezas";
import { usaApi } from "@/lib/api/cliente";
import { textosLegalesApi } from "@/lib/api/textos-legales";
import { almacen, exigirEnAlcaldia, idSesion } from "@/lib/plataforma/sesion";
import { textosLegalesDe } from "@/lib/plataforma/textos-legales";
import { TIPOS_TEXTO_LEGAL, TITULO_TEXTO_LEGAL } from "@/lib/plataforma/tipos";
import { SLUG_TEXTO } from "./[tipo]/slugs";

export const metadata: Metadata = { title: "Textos legales" };

export default function TextosLegalesPage() {
  return (
    <Suspense fallback={<EsqueletoFormulario campos={2} />}>
      <Contenido />
    </Suspense>
  );
}

/** Los términos de uso y la política de datos que el portal pide aceptar (R15). */
async function Contenido() {
  await exigirEnAlcaldia("legal.editar", "/configuracion/textos-legales");
  await connection();
  const r = usaApi() ? await textosLegalesApi() : textosLegalesDe(almacen(), await idSesion());

  return (
    <>
      <EncabezadoPagina
        titulo="Textos legales"
        bajada="Los términos de uso y la política de datos que se aceptan al registrarse en el portal."
      />
      <p className="mb-5 max-w-3xl text-cuerpo">
        Cada cambio se publica como una versión nueva. Al publicarla, las personas ya registradas
        tienen que aceptarla otra vez la próxima vez que entren al portal.
      </p>
      {r.estado !== "OK" ? (
        <p className="text-peligro">No se pudieron cargar los textos. Vuelve a intentarlo.</p>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {TIPOS_TEXTO_LEGAL.map((tipo) => {
            const { vigente, versiones } = r.textos[tipo];
            return (
              <li key={tipo} className="flex flex-col rounded-lg border border-linea bg-papel p-5">
                <h2 className="flex items-center gap-2 text-base font-bold text-tinta">
                  <FileText size={18} aria-hidden="true" className="text-marca-texto" />
                  {TITULO_TEXTO_LEGAL[tipo]}
                </h2>
                {vigente ? (
                  <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    <dt className="text-gris">Versión vigente</dt>
                    <dd className="font-semibold text-tinta tabular-nums">{vigente.version}</dd>
                    <dt className="text-gris">Publicada</dt>
                    <dd className="text-tinta">
                      {formatearFecha(vigente.publicadoEl)} · {vigente.autor}
                    </dd>
                    <dt className="text-gris">Versiones</dt>
                    <dd className="text-tinta tabular-nums">{versiones}</dd>
                  </dl>
                ) : (
                  <p className="mt-3 text-sm text-gris">Todavía no se ha publicado.</p>
                )}
                <Link
                  href={`/configuracion/textos-legales/${SLUG_TEXTO[tipo]}`}
                  className="mt-4 inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-control border border-marca bg-marca px-4 text-sm font-semibold text-sobre-marca hover:brightness-110"
                >
                  Ver y publicar una versión nueva
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
