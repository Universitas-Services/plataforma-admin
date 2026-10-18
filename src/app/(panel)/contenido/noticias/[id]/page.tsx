import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { EditorNoticia } from "@/components/contenido/editor-noticia";
import { EsqueletoEditor } from "@/components/ui/esqueletos";
import { obtenerNoticia } from "@/lib/plataforma/contenido";
import { almacen, exigirEnAlcaldia, idSesion } from "@/lib/plataforma/sesion";

export const metadata: Metadata = { title: "Editar noticia" };

/** Con Cache Components, una ruta dinámica necesita al menos un parámetro conocido. */
export function generateStaticParams() {
  return [{ id: "n-ejemplo-mesas" }];
}

export default function EditarNoticiaPage({ params }: PageProps<"/contenido/noticias/[id]">) {
  return (
    <Suspense fallback={<EsqueletoEditor />}>
      <Contenido params={params} />
    </Suspense>
  );
}

async function Contenido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirEnAlcaldia("contenido.editar", `/contenido/noticias/${id}`);
  // La lista depende de la hora (las programadas vencidas se publican al leer).
  await connection();
  const r = obtenerNoticia(almacen(), await idSesion(), id);
  if (r.estado !== "OK") notFound();
  return <EditorNoticia noticia={r.noticia} />;
}
