"use client";

import { ArrowLeft, ArrowRight, FileText, Megaphone, MessageSquareText } from "lucide-react";
import { useState } from "react";
import type { TonoBanner } from "@/lib/contenido/tipos";

export type DiapositivaPrevia = {
  id: string;
  titulo: string;
  texto: string;
  etiqueta: string;
  tono: TonoBanner;
  imagen?: { src: string; alt: string };
};

/** Los mismos tonos que la tarjeta del portal (`banner-carousel.tsx`). */
const TONO = {
  rojo: {
    panel: "bg-rojo-oscuro text-papel",
    texto: "text-papel/90",
    boton: "bg-papel text-rojo-oscuro",
    Icon: Megaphone,
    icono: "text-naranja/40",
    controles: "text-papel",
  },
  calido: {
    panel: "bg-amarillo text-noche",
    texto: "text-noche/85",
    boton: "bg-noche text-papel",
    Icon: MessageSquareText,
    icono: "text-papel/45",
    controles: "text-noche",
  },
  tinta: {
    panel: "bg-noche text-papel",
    texto: "text-papel/85",
    boton: "bg-amarillo text-noche",
    Icon: FileText,
    icono: "text-papel/10",
    controles: "text-papel",
  },
} as const;

/**
 * Réplica de la tarjeta con transiciones del Inicio del portal, bajo el termómetro
 * (`portal-iribarren/src/components/home/banner-carousel.tsx`): foto con velo morado o color
 * del tono con su ícono, título, texto, botón, puntos y flechas. Se recorre a mano; no rota sola.
 */
export function VistaPreviaTarjeta({
  diapositivas,
  alto = "min-h-[22rem]",
}: {
  diapositivas: DiapositivaPrevia[];
  alto?: string;
}) {
  const [actual, setActual] = useState(0);
  if (!diapositivas.length)
    return (
      <p className="rounded-[1.25rem] border border-dashed border-linea p-6 text-sm text-gris">
        Sin diapositivas vigentes: la tarjeta no se muestra en el Inicio.
      </p>
    );
  const i = Math.min(actual, diapositivas.length - 1);
  const d = diapositivas[i]!;
  const t = TONO[d.tono];
  const mover = (paso: number) => setActual((i + paso + diapositivas.length) % diapositivas.length);
  return (
    <div
      className={`relative flex ${alto} flex-col justify-end overflow-hidden rounded-[1.25rem] px-6 pt-8 pb-20 ${
        d.imagen ? "bg-noche text-papel" : t.panel
      }`}
    >
      {d.imagen ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- medio del propio panel */}
          <img
            src={d.imagen.src}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 size-full object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(0deg,rgb(46_19_77/0.95)_0%,rgb(46_19_77/0.75)_45%,rgb(46_19_77/0.25)_100%)]"
          />
        </>
      ) : (
        <t.Icon
          aria-hidden="true"
          strokeWidth={1}
          className={`pointer-events-none absolute -top-10 -right-12 size-72 ${t.icono}`}
        />
      )}
      <p className="relative max-w-lg font-display text-2xl leading-[1.1] font-extrabold sm:text-[1.75rem]">
        {d.titulo || "Sin título"}
      </p>
      <p
        className={`relative mt-3 max-w-md leading-relaxed ${d.imagen ? "text-papel/85" : t.texto}`}
      >
        {d.texto || "Sin texto"}
      </p>
      <span
        className={`relative mt-5 inline-flex min-h-11 items-center gap-2 self-start rounded-xl px-4 font-display text-sm font-bold ${
          d.imagen ? TONO.tinta.boton : t.boton
        }`}
      >
        {d.etiqueta || "Texto del botón"}
        <ArrowRight size={16} aria-hidden="true" />
      </span>
      <div
        className={`absolute inset-x-0 bottom-0 flex items-center justify-between px-4 pb-3 ${
          d.imagen ? "text-papel" : t.controles
        }`}
      >
        <div className="flex items-center">
          {diapositivas.map((x, k) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setActual(k)}
              aria-label={`Ver la diapositiva ${k + 1}: «${x.titulo}»`}
              aria-pressed={k === i}
              className="grid h-10 w-7 place-items-center"
            >
              <span
                className={`block h-1.5 rounded-full bg-current ${k === i ? "w-6" : "w-2.5 opacity-45"}`}
              />
            </button>
          ))}
        </div>
        {diapositivas.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => mover(-1)}
              aria-label="Diapositiva anterior"
              className="grid size-10 place-items-center rounded-full hover:bg-current/10"
            >
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => mover(1)}
              aria-label="Diapositiva siguiente"
              className="grid size-10 place-items-center rounded-full hover:bg-current/10"
            >
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
