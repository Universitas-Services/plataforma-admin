import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { EditorTextoLegal } from "@/components/configuracion/editor-texto-legal";
import { EsqueletoEditor } from "@/components/ui/esqueletos";
import { EncabezadoPagina } from "@/components/ui/piezas";
import { usaApi } from "@/lib/api/cliente";
import { historialTextoApi } from "@/lib/api/textos-legales";
import { almacen, exigirEnAlcaldia, idSesion } from "@/lib/plataforma/sesion";
import { historialTexto } from "@/lib/plataforma/textos-legales";
import { TITULO_TEXTO_LEGAL } from "@/lib/plataforma/tipos";
import { SLUG_TEXTO, tipoDeSlug } from "./slugs";

export const metadata: Metadata = { title: "Texto legal" };

export function generateStaticParams() {
  return Object.values(SLUG_TEXTO).map((tipo) => ({ tipo }));
}

export default function TextoLegalPage({
  params,
}: PageProps<"/configuracion/textos-legales/[tipo]">) {
  return (
    <Suspense fallback={<EsqueletoEditor />}>
      <Contenido params={params} />
    </Suspense>
  );
}

async function Contenido({ params }: { params: Promise<{ tipo: string }> }) {
  const { tipo: slug } = await params;
  const tipo = tipoDeSlug(slug);
  if (!tipo) notFound();
  await exigirEnAlcaldia("legal.editar", `/configuracion/textos-legales/${slug}`);
  await connection();
  const r = usaApi()
    ? await historialTextoApi(tipo)
    : historialTexto(almacen(), await idSesion(), tipo);
  if (r.estado !== "OK") notFound();

  return (
    <>
      <EncabezadoPagina
        titulo={TITULO_TEXTO_LEGAL[tipo]}
        bajada="Edita el texto y publícalo como una versión nueva."
        acciones={
          <Link
            href="/configuracion/textos-legales"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-control px-2 text-sm font-semibold text-marca-texto hover:underline"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Textos legales
          </Link>
        }
      />
      <EditorTextoLegal tipo={tipo} versiones={r.versiones} />
    </>
  );
}
