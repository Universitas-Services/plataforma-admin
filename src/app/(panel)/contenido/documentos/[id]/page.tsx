import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EditarDocumento, NuevoDocumento } from "@/components/contenido/formulario-documento";
import { EsqueletoEditor } from "@/components/ui/esqueletos";
import { obtenerDocumento } from "@/lib/plataforma/documentos";
import { almacen, exigirEnAlcaldia, idSesion, leerAviso } from "@/lib/plataforma/sesion";
import { AvisoInicial } from "@/components/ui/aviso";

export const metadata: Metadata = { title: "Documento" };

/** Con Cache Components, una ruta dinámica necesita al menos un parámetro conocido. */
export function generateStaticParams() {
  return [{ id: "nuevo" }];
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
  await exigirEnAlcaldia("contenido.editar", `/contenido/documentos/${id}`);
  if (id === "nuevo") return <NuevoDocumento />;
  const r = obtenerDocumento(almacen(), await idSesion(), id);
  if (r.estado !== "OK") notFound();
  const aviso = await leerAviso();
  return (
    <>
      <EditarDocumento documento={r.documento} />
      <AvisoInicial texto={aviso} />
    </>
  );
}
