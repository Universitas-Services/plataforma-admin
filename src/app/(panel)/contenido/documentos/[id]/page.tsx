import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EditarDocumento, NuevoDocumento } from "@/components/contenido/formulario-documento";
import { conActual, valoresActivos } from "@/lib/plataforma/catalogos-activos";
import { EsqueletoEditor } from "@/components/ui/esqueletos";
import { usaApi } from "@/lib/api/cliente";
import { obtenerDocumentoApi } from "@/lib/api/documentos";
import { obtenerDocumento } from "@/lib/plataforma/documentos";
import { idsPrerender } from "@/lib/plataforma/servicio";
import { almacen, exigirEnAlcaldia, idSesion, leerAviso } from "@/lib/plataforma/sesion";
import { AvisoInicial } from "@/components/ui/aviso";
import { documentosDemo } from "@/lib/plataforma/fixtures-contenido";

export const metadata: Metadata = { title: "Documento" };

/*
 * Todos los ids de ejemplo: en Netlify, un id que no se generó al compilar devuelve 500 (el
 * adaptador aún no sirve el App Shell de los parámetros no listados de Next 16.3+).
 */
export function generateStaticParams() {
  return [
    { id: "nuevo" },
    ...documentosDemo(0).map(({ id }) => ({ id })),
    ...idsPrerender("d").map((id) => ({ id })),
  ];
}

export default function DocumentoPage({ params }: PageProps<"/contenido/documentos/[id]">) {
  return (
    <Suspense fallback={<EsqueletoEditor />}>
      <Contenido params={params} />
    </Suspense>
  );
}

async function Contenido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await exigirEnAlcaldia("contenido.editar", `/contenido/documentos/${id}`);
  const categorias = await valoresActivos("categoriasDocumentos", ctx.alcaldia.id);
  if (id === "nuevo") return <NuevoDocumento categorias={categorias} />;
  const r = usaApi()
    ? await obtenerDocumentoApi(id)
    : obtenerDocumento(almacen(), await idSesion(), id);
  if (r.estado !== "OK") notFound();
  const aviso = await leerAviso();
  return (
    <>
      <EditarDocumento
        documento={r.documento}
        categorias={conActual(categorias, r.documento.categoria)}
      />
      <AvisoInicial texto={aviso} />
    </>
  );
}
