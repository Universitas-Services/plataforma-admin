"use client";

import { ArrowRight, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Aviso, useAviso } from "@/components/ui/aviso";
import { Selector } from "@/components/ui/selector";
import { guardarInicioAccion } from "@/lib/plataforma/acciones-contenido";
import { formatearFecha } from "./estado-noticia";
import { VistaPreviaTarjeta, type DiapositivaPrevia } from "./vista-previa-tarjeta";

export type NoticiaElegible = {
  id: string;
  titulo: string;
  resumen: string;
  formato: string;
  publicadoEl: string;
  portada?: { src: string; alt: string };
};

/**
 * Lo que el Inicio del portal muestra elegido por la alcaldía: la tarjeta del mensaje del
 * alcalde (una noticia de Texto) y, aparte, la tarjeta con transiciones bajo el termómetro, que
 * tiene sus propias diapositivas. Las dos con su vista previa.
 */
export function EditorInicio({
  mensajeInicial,
  candidatosMensaje,
  diapositivas,
}: {
  mensajeInicial?: string;
  candidatosMensaje: NoticiaElegible[];
  /** Lo que la tarjeta con transiciones muestra hoy en el portal. */
  diapositivas: DiapositivaPrevia[];
}) {
  const [mensaje, setMensaje] = useState(mensajeInicial ?? "");
  const [guardando, setGuardando] = useState(false);
  const { aviso, mostrar, cerrar } = useAviso();

  const elegidaMensaje = candidatosMensaje.find((n) => n.id === mensaje);
  const sinCambios = mensaje === (mensajeInicial ?? "");

  async function guardar() {
    setGuardando(true);
    const r = await guardarInicioAccion({ mensajeAlcalde: mensaje || null }).catch(() => ({
      ok: false,
      mensaje: "No se pudo guardar: revisa tu conexión.",
    }));
    setGuardando(false);
    mostrar({ tipo: r.ok ? "exito" : "error", texto: r.mensaje });
  }

  return (
    <div className="pb-24 lg:pb-0">
      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="titulo-mensaje" className="min-w-0">
          <h2 id="titulo-mensaje" className="text-lg font-bold">
            Mensaje del alcalde
          </h2>
          <p className="mt-1 text-sm text-gris">
            La tarjeta de texto del Inicio. Solo admite noticias de formato Texto ya publicadas.
          </p>
          <div className="mt-4">
            <Selector
              id="mensajeAlcalde"
              etiqueta="Noticia del mensaje"
              opciones={candidatosMensaje.map((n) => ({
                valor: n.id,
                texto: n.titulo,
                detalle: `Publicada el ${formatearFecha(n.publicadoEl)}`,
              }))}
              valor={mensaje}
              onCambio={setMensaje}
              permitirVacio
              vacio="Sin mensaje (se muestra el texto provisional)"
            />
          </div>
          {/* Aproximación de la tarjeta del portal. */}
          <figure className="mt-4">
            <div className="patron-urbano rounded-[1.25rem] p-6 text-papel">
              {elegidaMensaje ? (
                <>
                  <p className="text-xs font-semibold tracking-wider text-papel/80 uppercase">
                    Mensaje del alcalde
                  </p>
                  <p className="mt-2 font-display text-xl leading-snug font-bold">
                    {elegidaMensaje.titulo}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm text-papel/90">
                    {elegidaMensaje.resumen}
                  </p>
                </>
              ) : (
                <p className="text-sm text-papel/85">Sin mensaje elegido.</p>
              )}
            </div>
            <figcaption className="mt-2 text-sm text-gris">
              Aproximación de la tarjeta en el Inicio del portal.
            </figcaption>
          </figure>
          <div className="mt-6 hidden justify-end lg:flex">
            <BotonGuardar guardando={guardando} sinCambios={sinCambios} onGuardar={guardar} />
          </div>
        </section>

        <section aria-labelledby="titulo-tarjeta" className="min-w-0">
          <h2 id="titulo-tarjeta" className="text-lg font-bold">
            Tarjeta con transiciones
          </h2>
          <p className="mt-1 text-sm text-gris">
            La tarjeta grande bajo el termómetro. Pasa por sus propias diapositivas (hasta 6
            vigentes), cada una con título, texto, botón, color o foto.
          </p>
          <div className="mt-4">
            <VistaPreviaTarjeta diapositivas={diapositivas} />
          </div>
          <Link
            href="/contenido/banners"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-control border border-linea px-4 font-semibold text-tinta hover:border-tenue"
          >
            Editar las diapositivas
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-papel/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <p className="text-sm text-gris">{sinCambios ? "Sin cambios" : "Cambios sin guardar"}</p>
          <BotonGuardar guardando={guardando} sinCambios={sinCambios} onGuardar={guardar} />
        </div>
      </div>
      <Aviso aviso={aviso} onCerrar={cerrar} posicion="bottom-24 sm:bottom-24 lg:bottom-6" />
    </div>
  );
}

function BotonGuardar({
  guardando,
  sinCambios,
  onGuardar,
}: {
  guardando: boolean;
  sinCambios: boolean;
  onGuardar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onGuardar}
      disabled={guardando || sinCambios}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-marca bg-marca px-5 font-semibold text-sobre-marca hover:brightness-110 disabled:cursor-not-allowed disabled:border-linea disabled:bg-superficie disabled:text-tenue"
    >
      {guardando ? (
        <Loader2 size={18} aria-hidden="true" className="animate-spin" />
      ) : (
        <Save size={18} aria-hidden="true" />
      )}
      Guardar el mensaje
    </button>
  );
}
