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
import { totalesDe } from "@/lib/plataforma/inicio";
import type { ConteoDia } from "@/lib/plataforma/tipos";
import { almacen, exigirEnAlcaldia, idSesion } from "@/lib/plataforma/sesion";

export const metadata: Metadata = { title: "Editar noticia" };

/*
 * El id va en la consulta (?id=), no en la ruta: en Netlify, una ruta [id] con un id que no se
 * generó al compilar (los UUID de plataforma-api) respondía 500 y dejaba la pantalla en blanco.
 */

export default function EditarNoticiaPage({
  searchParams,
}: PageProps<"/contenido/noticias/editar">) {
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
    `/contenido/noticias/editar?id=${encodeURIComponent(id)}`,
  );
  // La lista depende de la hora (las programadas vencidas se publican al leer).
  await connection();
  const r = usaApi()
    ? await obtenerNoticiaApi(id)
    : obtenerNoticia(almacen(), await idSesion(), id);
  if (r.estado !== "OK") notFound();
  const categorias = await valoresActivos("categoriasNoticias", ctx.alcaldia.id);
  // Vistas y reacciones: con la API vienen en la noticia; en la simulación, del almacén.
  const totales: ConteoDia | undefined = usaApi()
    ? (r.noticia as { totales?: ConteoDia }).totales
    : totalesDe(almacen(), `noticia:${r.noticia.id}`);
  return (
    <EditorNoticia
      noticia={{ ...r.noticia, totales }}
      categorias={conActual(categorias, r.noticia.categoria)}
    />
  );
}
