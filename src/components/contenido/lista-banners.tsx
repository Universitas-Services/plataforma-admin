"use client";

import { ArrowDown, ArrowUp, GripVertical, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Aviso, useAviso } from "@/components/ui/aviso";
import { NOMBRE_TONO } from "@/lib/contenido/tipos";
import { ordenarBannersAccion } from "@/lib/plataforma/acciones-contenido";
import type { FilaBanner } from "@/lib/plataforma/banners";
import { EtiquetaVigencia, VistaBanner } from "./banner-piezas";

/**
 * Banners en el orden del carrusel. Se reordenan arrastrando la tarjeta o con «Subir» y
 * «Bajar» (teclado y lector de pantalla); cada cambio se guarda al momento y lo confirma un
 * aviso. Con un filtro activo no se ordena: el orden es el del carrusel completo.
 */
export function ListaBanners({ items, ordenable }: { items: FilaBanner[]; ordenable: boolean }) {
  const [lista, setLista] = useState(items);
  const [arrastrado, setArrastrado] = useState<number>();
  const [destino, setDestino] = useState<number>();
  const [guardando, setGuardando] = useState(false);
  const [anuncio, setAnuncio] = useState("");
  const { aviso, mostrar, cerrar } = useAviso();

  async function mover(desde: number, hasta: number) {
    if (hasta < 0 || hasta >= lista.length || desde === hasta || guardando) return;
    const previa = lista;
    const nueva = [...lista];
    const [b] = nueva.splice(desde, 1);
    nueva.splice(hasta, 0, b!);
    setLista(nueva);
    setAnuncio(`«${b!.titulo}» pasó a la posición ${hasta + 1} de ${nueva.length}.`);
    setGuardando(true);
    const r = await ordenarBannersAccion(nueva.map((x) => x.id)).catch(() => ({
      ok: false,
      mensaje: "No se pudo guardar el orden: revisa tu conexión.",
    }));
    setGuardando(false);
    if (!r.ok) setLista(previa);
    mostrar({ tipo: r.ok ? "exito" : "error", texto: r.mensaje });
  }

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {anuncio}
      </p>
      <ol aria-label="Banners del carrusel, en orden" className="space-y-3">
        {lista.map((b, i) => (
          <li
            key={b.id}
            draggable={ordenable}
            onDragStart={(e) => {
              setArrastrado(i);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              if (arrastrado === undefined) return;
              e.preventDefault();
              setDestino(i);
            }}
            onDragEnd={() => {
              setArrastrado(undefined);
              setDestino(undefined);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (arrastrado !== undefined) void mover(arrastrado, i);
              setArrastrado(undefined);
              setDestino(undefined);
            }}
            className={`grid gap-4 rounded-lg border bg-papel p-3 transition-[border-color,opacity] duration-150 sm:grid-cols-[auto_minmax(0,14rem)_minmax(0,1fr)_auto] sm:items-center ${
              arrastrado === i
                ? "border-marca-texto opacity-60"
                : destino === i
                  ? "border-marca-texto"
                  : "border-linea"
            }`}
          >
            <div className="flex items-center gap-1 sm:flex-col">
              {ordenable && (
                <GripVertical
                  size={20}
                  aria-hidden="true"
                  className="hidden cursor-grab text-tenue sm:block"
                />
              )}
              <span
                className={`grid size-8 place-items-center rounded-full text-sm font-bold tabular-nums ${b.estadoVigencia === "VIGENTE" ? "bg-superficie text-tinta" : "border-2 border-tenue bg-papel text-gris"}`}
              >
                <span className="sr-only">Posición </span>
                {ordenable ? i + 1 : b.orden}
              </span>
              {ordenable && (
                <>
                  <button
                    type="button"
                    onClick={() => void mover(i, i - 1)}
                    aria-disabled={i === 0 || guardando}
                    aria-label={`Subir «${b.titulo}»`}
                    className="grid size-10 place-items-center rounded-control text-tinta hover:bg-superficie aria-disabled:cursor-not-allowed aria-disabled:text-tenue aria-disabled:hover:bg-transparent"
                  >
                    <ArrowUp size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void mover(i, i + 1)}
                    aria-disabled={i === lista.length - 1 || guardando}
                    aria-label={`Bajar «${b.titulo}»`}
                    className="grid size-10 place-items-center rounded-control text-tinta hover:bg-superficie aria-disabled:cursor-not-allowed aria-disabled:text-tenue aria-disabled:hover:bg-transparent"
                  >
                    <ArrowDown size={18} aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
            {/* En el teléfono, miniatura al lado del texto; desde 640 px, columnas propias. */}
            <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-3 sm:contents">
              <div className={b.estadoVigencia === "VIGENTE" ? "" : "grayscale"}>
                <VistaBanner banner={b} compacta />
              </div>
              <div className="min-w-0">
                <h2 className="text-base leading-snug font-bold">{b.titulo}</h2>
                <p className="mt-0.5 line-clamp-2 text-sm text-gris">{b.texto}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <EtiquetaVigencia estado={b.estadoVigencia} vigencia={b.vigencia} />
                  <span className="text-sm text-gris">
                    {b.imagen ? "Con foto" : NOMBRE_TONO[b.tono]} · {b.enlace.etiqueta}
                  </span>
                </div>
              </div>
            </div>
            <Link
              href={`/contenido/banners/${b.id}`}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control border border-linea px-3 text-sm font-semibold text-tinta hover:border-tenue"
            >
              <Pencil size={16} aria-hidden="true" />
              Editar
              <span className="sr-only"> «{b.titulo}»</span>
            </Link>
          </li>
        ))}
      </ol>
      <Aviso aviso={aviso} onCerrar={cerrar} />
    </>
  );
}
