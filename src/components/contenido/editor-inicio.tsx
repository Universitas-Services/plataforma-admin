"use client";

import { ArrowDown, ArrowUp, GripVertical, Loader2, Megaphone, Plus, Save, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Aviso, useAviso } from "@/components/ui/aviso";
import { Selector } from "@/components/ui/selector";
import { guardarInicioAccion } from "@/lib/plataforma/acciones-contenido";
import { formatearFecha } from "./estado-noticia";

export type NoticiaElegible = {
  id: string;
  titulo: string;
  resumen: string;
  formato: string;
  publicadoEl: string;
  portada?: { src: string; alt: string };
};

const MAX_ANUNCIOS = 6;

/**
 * Lo que el Inicio del portal muestra elegido por la alcaldía: la tarjeta del mensaje del
 * alcalde (una noticia de Texto) y la tarjeta de anuncios, que pasa por las noticias elegidas en
 * el orden de la lista. El resto del Inicio es fijo o sale de los rankings.
 */
export function EditorInicio({
  mensajeInicial,
  anunciosIniciales,
  candidatosMensaje,
  candidatosAnuncios,
}: {
  mensajeInicial?: string;
  anunciosIniciales: string[];
  candidatosMensaje: NoticiaElegible[];
  candidatosAnuncios: NoticiaElegible[];
}) {
  const [mensaje, setMensaje] = useState(mensajeInicial ?? "");
  const [anuncios, setAnuncios] = useState(anunciosIniciales);
  const [agregar, setAgregar] = useState("");
  const [arrastrado, setArrastrado] = useState<number>();
  const [anuncio, setAnuncio] = useState("");
  const [guardando, setGuardando] = useState(false);
  const { aviso, mostrar, cerrar } = useAviso();

  const porId = useMemo(
    () => new Map(candidatosAnuncios.map((n) => [n.id, n])),
    [candidatosAnuncios],
  );
  const elegidaMensaje = candidatosMensaje.find((n) => n.id === mensaje);
  const disponibles = candidatosAnuncios.filter((n) => !anuncios.includes(n.id));
  const sinCambios =
    mensaje === (mensajeInicial ?? "") && anuncios.join() === anunciosIniciales.join();

  function mover(desde: number, hasta: number) {
    if (hasta < 0 || hasta >= anuncios.length || desde === hasta) return;
    const lista = [...anuncios];
    const [x] = lista.splice(desde, 1);
    lista.splice(hasta, 0, x!);
    setAnuncios(lista);
    setAnuncio(`«${porId.get(x!)?.titulo}» pasó a la posición ${hasta + 1} de ${lista.length}.`);
  }

  async function guardar() {
    setGuardando(true);
    const r = await guardarInicioAccion({ mensajeAlcalde: mensaje || null, anuncios }).catch(
      () => ({ ok: false, mensaje: "No se pudo guardar: revisa tu conexión." }),
    );
    setGuardando(false);
    mostrar({ tipo: r.ok ? "exito" : "error", texto: r.mensaje });
  }

  return (
    <div className="pb-24 lg:pb-0">
      <p aria-live="polite" className="sr-only">
        {anuncio}
      </p>
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
              vacio="Sin mensaje (la tarjeta no se muestra)"
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
        </section>

        <section aria-labelledby="titulo-anuncios" className="min-w-0">
          <h2 id="titulo-anuncios" className="text-lg font-bold">
            Anuncios
          </h2>
          <p className="mt-1 text-sm text-gris">
            La tarjeta con transiciones del Inicio: pasa por estas noticias en este orden. Hasta{" "}
            {MAX_ANUNCIOS}.
          </p>

          {anuncios.length ? (
            <ol aria-label="Noticias de anuncios, en orden" className="mt-4 space-y-2">
              {anuncios.map((id, i) => {
                const n = porId.get(id);
                if (!n) return null;
                return (
                  <li
                    key={id}
                    draggable
                    onDragStart={() => setArrastrado(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (arrastrado !== undefined) mover(arrastrado, i);
                      setArrastrado(undefined);
                    }}
                    onDragEnd={() => setArrastrado(undefined)}
                    className={`flex items-center gap-3 rounded-lg border bg-papel p-2 pr-1 ${
                      arrastrado === i ? "border-marca-texto opacity-60" : "border-linea"
                    }`}
                  >
                    <GripVertical
                      size={18}
                      aria-hidden="true"
                      className="hidden shrink-0 cursor-grab text-tenue sm:block"
                    />
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-superficie text-sm font-bold text-tinta tabular-nums">
                      <span className="sr-only">Posición </span>
                      {i + 1}
                    </span>
                    {n.portada ? (
                      // eslint-disable-next-line @next/next/no-img-element -- medio del propio panel
                      <img
                        src={n.portada.src}
                        alt=""
                        aria-hidden="true"
                        className="hidden h-12 w-20 shrink-0 rounded-md object-cover sm:block"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="hidden h-12 w-20 shrink-0 place-items-center rounded-md bg-noche text-papel sm:grid"
                      >
                        <Megaphone size={18} />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-semibold text-tinta">
                        {n.titulo}
                      </span>
                    </span>
                    <span className="flex shrink-0">
                      <button
                        type="button"
                        onClick={() => mover(i, i - 1)}
                        aria-disabled={i === 0}
                        aria-label={`Subir «${n.titulo}»`}
                        className="grid size-10 place-items-center rounded-control text-tinta hover:bg-superficie aria-disabled:text-tenue"
                      >
                        <ArrowUp size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => mover(i, i + 1)}
                        aria-disabled={i === anuncios.length - 1}
                        aria-label={`Bajar «${n.titulo}»`}
                        className="grid size-10 place-items-center rounded-control text-tinta hover:bg-superficie aria-disabled:text-tenue"
                      >
                        <ArrowDown size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnuncios(anuncios.filter((x) => x !== id))}
                        aria-label={`Quitar «${n.titulo}» de anuncios`}
                        className="grid size-10 place-items-center rounded-control text-tinta hover:bg-superficie"
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-linea p-4 text-sm text-gris">
              Sin anuncios: la tarjeta no se muestra en el Inicio.
            </p>
          )}

          {anuncios.length < MAX_ANUNCIOS && disponibles.length > 0 && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Selector
                  id="agregarAnuncio"
                  etiqueta="Agregar una noticia publicada"
                  opciones={disponibles.map((n) => ({
                    valor: n.id,
                    texto: n.titulo,
                    detalle: `Publicada el ${formatearFecha(n.publicadoEl)}`,
                  }))}
                  valor={agregar}
                  onCambio={setAgregar}
                  vacio="Elige una noticia"
                />
              </div>
              <button
                type="button"
                disabled={!agregar}
                onClick={() => {
                  setAnuncios([...anuncios, agregar]);
                  setAgregar("");
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-linea px-4 font-semibold text-tinta hover:border-tenue disabled:cursor-not-allowed disabled:text-tenue"
              >
                <Plus size={16} aria-hidden="true" />
                Agregar
              </button>
            </div>
          )}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-papel/95 px-4 py-3 backdrop-blur lg:static lg:mt-8 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 lg:mx-0 lg:max-w-none lg:justify-end">
          <p className="text-sm text-gris lg:hidden">
            {sinCambios ? "Sin cambios" : "Cambios sin guardar"}
          </p>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando || sinCambios}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-marca bg-marca px-5 font-semibold text-sobre-marca hover:brightness-110 disabled:cursor-not-allowed disabled:border-linea disabled:bg-superficie disabled:text-tenue"
          >
            {guardando ? (
              <Loader2 size={18} aria-hidden="true" className="animate-spin" />
            ) : (
              <Save size={18} aria-hidden="true" />
            )}
            Guardar el Inicio
          </button>
        </div>
      </div>
      <Aviso aviso={aviso} onCerrar={cerrar} posicion="bottom-24 sm:bottom-24 lg:bottom-6" />
    </div>
  );
}
