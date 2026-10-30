import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EditarDocumento, NuevoDocumento } from "@/components/contenido/formulario-documento";
import { conActual, valoresActivos } from "@/lib/plataforma/catalogos-activos";
import { EsqueletoEditor } from "@/components/ui/esqueletos";
import { usaApi } from "@/lib/api/cliente";
import { obtenerDocumentoApi } from "@/lib/api/documentos";
import { obtenerDocumento } from "@/lib/plataforma/documentos";
import { almacen, exigirEnAlcaldia, idSesion, leerAviso } from "@/lib/plataforma/sesion";
import { AvisoInicial } from "@/components/ui/aviso";

export const metadata: Metadata = { title: "Documento" };

/*
 * El id va en la consulta (?id=), no en la ruta: en Netlify, una ruta [id] con un id que no se
 * generó al compilar (los UUID de plataforma-api) respondía 500 y dejaba la pantalla en blanco.
 */

export default function DocumentoPage({ searchParams }: PageProps<"/contenido/documentos/editar">) {
  return (
    <Suspense fallback={<EsqueletoEditor />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

async function Contenido({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id: valor } = await searchParams;
  const id = typeof valor === "string" ? valor : "";
  const ctx = await exigirEnAlcaldia(
    "contenido.editar",
    `/contenido/documentos/editar?id=${encodeURIComponent(id)}`,
  );
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
