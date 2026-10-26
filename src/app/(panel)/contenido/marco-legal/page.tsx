import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { EditorMarcoLegal } from "@/components/contenido/editor-marco-legal";
import { PestanasContenido } from "@/components/contenido/pestanas";
import { EsqueletoFormulario } from "@/components/ui/esqueletos";
import { EncabezadoPagina } from "@/components/ui/piezas";
import { marcoLegalDe } from "@/lib/plataforma/marco-legal";
import { almacen, exigirEnAlcaldia, idSesion } from "@/lib/plataforma/sesion";

export const metadata: Metadata = { title: "Marco legal" };

export default function MarcoLegalPage() {
  return (
    <Suspense fallback={<EsqueletoFormulario campos={4} />}>
      <Contenido />
    </Suspense>
  );
}

/** Marco legal de Conoce el PDUL (anexo de la fase 7, 26-10-2026). */
async function Contenido() {
  await exigirEnAlcaldia("contenido.editar", "/contenido/marco-legal");
  await connection();
  const r = marcoLegalDe(almacen(), await idSesion());
  if (r.estado !== "OK") return null;

  return (
    <>
      <EncabezadoPagina
        titulo="Contenido"
        bajada="Lo que tu alcaldía publica en el portal ciudadano."
      />
      <PestanasContenido />
      <p className="mb-6 max-w-3xl text-cuerpo">
        La sección «Naturaleza jurídica y marco legal del PDUL» de Conoce el PDUL. Puedes guardar
        todos los ítems que quieras; el portal muestra solo los activos, hasta 10, en el orden de
        esta lista. La introducción de la sección es fija.
      </p>
      <EditorMarcoLegal
        items={r.items.map((i) => ({
          id: i.id,
          titulo: i.titulo,
          descripcion: i.descripcion,
          activo: i.activo,
          boton: i.boton,
          botonDisponible: i.botonDisponible,
          destinoTitulo: i.destinoTitulo,
          ejemplo: i.ejemplo,
        }))}
        noticias={r.noticias.map((d) => ({ id: d.id, titulo: d.titulo }))}
        documentos={r.documentos.map((d) => ({ id: d.id, titulo: d.titulo }))}
      />
    </>
  );
}
