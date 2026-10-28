import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { EditorInicio, type NoticiaElegible } from "@/components/contenido/editor-inicio";
import { PestanasContenido } from "@/components/contenido/pestanas";
import { EsqueletoFormulario } from "@/components/ui/esqueletos";
import { EncabezadoPagina } from "@/components/ui/piezas";
import type { Noticia } from "@/lib/contenido/tipos";
import { listarBanners } from "@/lib/plataforma/banners";
import { inicioDe } from "@/lib/plataforma/inicio";
import { almacen, exigirEnAlcaldia, idSesion, contenidoAlDia } from "@/lib/plataforma/sesion";

export const metadata: Metadata = { title: "Inicio del portal" };

export default function InicioPortalPage() {
  return (
    <Suspense fallback={<EsqueletoFormulario campos={3} />}>
      <Contenido />
    </Suspense>
  );
}

const elegible = (n: Noticia): NoticiaElegible => ({
  id: n.id,
  titulo: n.titulo,
  resumen: n.resumen,
  formato: n.formato,
  publicadoEl: n.publicadoEl!,
  portada: n.portada ? { src: n.portada.src, alt: n.portada.alt } : undefined,
});

/** Lo que el Inicio del portal muestra elegido por la alcaldía (backlog de refactorización 4.5). */
async function Contenido() {
  await exigirEnAlcaldia("inicio.editar", "/contenido/inicio");
  await connection();
  const sesion = await idSesion();
  await contenidoAlDia();
  const r = inicioDe(almacen(), sesion);
  if (r.estado !== "OK") return null;
  const b = listarBanners(almacen(), sesion);

  return (
    <>
      <EncabezadoPagina
        titulo="Contenido"
        bajada="Lo que tu alcaldía publica en el portal ciudadano."
      />
      <PestanasContenido />
      <p className="mb-6 max-w-3xl text-cuerpo">
        El Inicio del portal es fijo, salvo el termómetro (en Proceso), el mensaje del alcalde y la
        tarjeta con transiciones bajo el termómetro. «Noticias y novedades» y «La gente opina» se
        llenan solas con lo más reciente, lo más visto y lo más valorado.
      </p>
      {r.retiradas.length > 0 && (
        <p
          role="status"
          className="mb-6 flex items-start gap-3 rounded-lg bg-ambar/10 p-4 text-sm text-tinta ring-1 ring-ambar/40 ring-inset"
        >
          <AlertTriangle
            size={18}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-ambar-texto"
          />
          <span>
            Salieron de la selección porque ya no están publicadas:{" "}
            {r.retiradas.map((t) => `«${t}»`).join(", ")}.
          </span>
        </p>
      )}
      <EditorInicio
        mensajeInicial={r.mensajeAlcalde?.id}
        candidatosMensaje={r.candidatosMensaje.map(elegible)}
        diapositivas={
          b.estado === "OK"
            ? b.enPortal.map((x) => ({
                id: x.id,
                titulo: x.titulo,
                texto: x.texto,
                etiqueta: x.enlace.etiqueta,
                tono: x.tono,
                imagen: x.imagen ? { src: x.imagen.src, alt: x.imagen.alt } : undefined,
              }))
            : []
        }
      />
    </>
  );
}
