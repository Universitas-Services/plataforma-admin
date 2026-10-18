import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormularioBanner } from "@/components/contenido/formulario-banner";
import { EsqueletoEditor } from "@/components/ui/esqueletos";
import { obtenerBanner } from "@/lib/plataforma/banners";
import { almacen, exigirEnAlcaldia, idSesion } from "@/lib/plataforma/sesion";

export const metadata: Metadata = { title: "Banner" };

/** Con Cache Components, una ruta dinámica necesita al menos un parámetro conocido. */
export function generateStaticParams() {
  return [{ id: "nuevo" }];
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
  const r = obtenerBanner(almacen(), await idSesion(), id);
  if (r.estado !== "OK") notFound();
  const { titulo, texto, enlace, tono, imagen, vigencia } = r.banner;
  return <FormularioBanner id={id} inicial={{ titulo, texto, enlace, tono, imagen, vigencia }} />;
}
