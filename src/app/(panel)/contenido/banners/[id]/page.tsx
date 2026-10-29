import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormularioBanner } from "@/components/contenido/formulario-banner";
import { EsqueletoEditor } from "@/components/ui/esqueletos";
import { obtenerBanner } from "@/lib/plataforma/banners";
import { idsPrerender } from "@/lib/plataforma/servicio";
import { almacen, exigirEnAlcaldia, idSesion } from "@/lib/plataforma/sesion";
import { usaApi } from "@/lib/api/cliente";
import { obtenerBannerApi } from "@/lib/api/banners";
import { bannersDemo } from "@/lib/plataforma/fixtures-contenido";

export const metadata: Metadata = { title: "Diapositiva" };

/*
 * Todos los ids de ejemplo: en Netlify, un id que no se generó al compilar devuelve 500 (el
 * adaptador aún no sirve el App Shell de los parámetros no listados de Next 16.3+). Con
 * plataforma-api los ids son UUID: revisar en el deploy que abrir una diapositiva no dé 500.
 */
export function generateStaticParams() {
  return [
    { id: "nuevo" },
    ...bannersDemo(0).map(({ id }) => ({ id })),
    ...idsPrerender("b").map((id) => ({ id })),
  ];
}

export default function BannerPage({ params }: PageProps<"/contenido/banners/[id]">) {
  return (
    <Suspense fallback={<EsqueletoEditor />}>
      <Contenido params={params} />
    </Suspense>
  );
}

async function Contenido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirEnAlcaldia("contenido.editar", `/contenido/banners/${id}`);
  if (id === "nuevo") return <FormularioBanner />;
  const r = usaApi() ? await obtenerBannerApi(id) : obtenerBanner(almacen(), await idSesion(), id);
  if (r.estado !== "OK") notFound();
  const { titulo, texto, enlace, tono, imagen, vigencia } = r.banner;
  return <FormularioBanner id={id} inicial={{ titulo, texto, enlace, tono, imagen, vigencia }} />;
}
