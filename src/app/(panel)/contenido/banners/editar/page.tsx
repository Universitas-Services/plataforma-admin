import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormularioBanner } from "@/components/contenido/formulario-banner";
import { EsqueletoEditor } from "@/components/ui/esqueletos";
import { obtenerBanner } from "@/lib/plataforma/banners";
import { almacen, exigirEnAlcaldia, idSesion } from "@/lib/plataforma/sesion";
import { usaApi } from "@/lib/api/cliente";
import { obtenerBannerApi } from "@/lib/api/banners";

export const metadata: Metadata = { title: "Diapositiva" };

/*
 * El id va en la consulta (?id=), no en la ruta: en Netlify, una ruta [id] con un id que no se
 * generó al compilar (los UUID de plataforma-api) respondía 500 y dejaba la pantalla en blanco.
 */

export default function BannerPage({ searchParams }: PageProps<"/contenido/banners/editar">) {
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
  await exigirEnAlcaldia(
    "contenido.editar",
    `/contenido/banners/editar?id=${encodeURIComponent(id)}`,
  );
  if (id === "nuevo") return <FormularioBanner />;
  const r = usaApi() ? await obtenerBannerApi(id) : obtenerBanner(almacen(), await idSesion(), id);
  if (r.estado !== "OK") notFound();
  const { titulo, texto, enlace, tono, imagen, vigencia } = r.banner;
  return <FormularioBanner id={id} inicial={{ titulo, texto, enlace, tono, imagen, vigencia }} />;
}
