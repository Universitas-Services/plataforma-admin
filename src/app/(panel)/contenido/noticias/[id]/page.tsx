import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { EditorNoticia } from "@/components/contenido/editor-noticia";
import { conActual, valoresActivos } from "@/lib/plataforma/catalogos-activos";
import { EsqueletoEditor } from "@/components/ui/esqueletos";
import { usaApi } from "@/lib/api/cliente";
import { obtenerNoticiaApi } from "@/lib/api/noticias";
import { obtenerNoticia } from "@/lib/plataforma/contenido";
import { idsPrerender } from "@/lib/plataforma/servicio";
import { almacen, exigirEnAlcaldia, idSesion } from "@/lib/plataforma/sesion";
import { noticiasDemo } from "@/lib/plataforma/fixtures-contenido";

export const metadata: Metadata = { title: "Editar noticia" };

/*
 * Todos los ids de ejemplo: en Netlify, un id que no se generó al compilar devuelve 500 (el
 * adaptador aún no sirve el App Shell de los parámetros no listados de Next 16.3+). Con
 * plataforma-api los ids son UUID: revisar en el deploy que abrir una noticia nueva no dé 500.
 */
export function generateStaticParams() {
  return [...noticiasDemo(0).map(({ id }) => ({ id })), ...idsPrerender("n").map((id) => ({ id }))];
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
  const ctx = await exigirEnAlcaldia("contenido.editar", `/contenido/noticias/${id}`);
  // La lista depende de la hora (las programadas vencidas se publican al leer).
  await connection();
  const r = usaApi()
    ? await obtenerNoticiaApi(id)
    : obtenerNoticia(almacen(), await idSesion(), id);
  if (r.estado !== "OK") notFound();
  const categorias = await valoresActivos("categoriasNoticias", ctx.alcaldia.id);
  return (
    <EditorNoticia noticia={r.noticia} categorias={conActual(categorias, r.noticia.categoria)} />
  );
}
