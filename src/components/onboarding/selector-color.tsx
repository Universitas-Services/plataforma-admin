"use client";

import { AlertCircle } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { HexColorPicker } from "react-colorful";

export const esHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);

/**
 * Selector de color: un espectro (saturación y brillo) con la barra de tono debajo, para elegir
 * con el dedo o el ratón donde se posa el clic, y el campo hexadecimal para quien ya sabe el
 * código. Los dos van sincronizados. Ambos deslizadores funcionan también con las flechas.
 */
export function SelectorColor({
  id,
  etiqueta,
  valor,
  onCambio,
  ayuda,
  error,
  opcional,
  porDefecto = "#1F3864",
  extra,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  ayuda: string;
  error?: string;
  opcional?: boolean;
  porDefecto?: string;
  extra?: ReactNode;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const color = esHex(valor) ? valor : porDefecto;

  // react-colorful trae sus etiquetas en inglés y fijas: se traducen después de cada render.
  useEffect(() => {
    const deslizadores = caja.current?.querySelectorAll<HTMLElement>('[role="slider"]');
    if (!deslizadores) return;
    const [area, tono] = deslizadores;
    if (area) {
      area.setAttribute("aria-label", `${etiqueta}: saturación y brillo`);
      const texto = area.getAttribute("aria-valuetext") ?? "";
      area.setAttribute(
        "aria-valuetext",
        texto.replace("Saturation", "Saturación").replace("Brightness", "brillo"),
      );
    }
    if (tono) {
      tono.setAttribute("aria-label", `${etiqueta}: tono`);
      tono.setAttribute("aria-valuetext", `${tono.getAttribute("aria-valuenow") ?? 0} grados`);
    }
  });

  return (
    <fieldset aria-describedby={`${id}-ayuda${error ? ` ${id}-error` : ""}`}>
      <legend className="mb-1.5 text-sm font-bold text-tinta">
        {etiqueta}
        {opcional && <span className="font-normal text-gris"> (opcional)</span>}
      </legend>
      <div ref={caja} className="selector-color">
        <HexColorPicker color={color} onChange={(v) => onCambio(v.toUpperCase())} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span
          aria-hidden="true"
          className="size-11 shrink-0 rounded-control border border-linea"
          style={{ background: color }}
        />
        <label htmlFor={id} className="sr-only">
          {etiqueta} en hexadecimal
        </label>
        <input
          id={id}
          name={id}
          value={valor}
          maxLength={7}
          placeholder={porDefecto}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            const v = e.target.value.toUpperCase();
            onCambio(v && !v.startsWith("#") ? `#${v}` : v);
          }}
          aria-invalid={error ? true : undefined}
          className={`h-11 w-full min-w-0 rounded-control border bg-papel px-3 font-semibold text-tinta uppercase tabular-nums outline-none focus-visible:border-marca-texto ${
            error ? "border-peligro" : "border-linea hover:border-tenue"
          }`}
        />
        {extra}
      </div>
      <p id={`${id}-ayuda`} className="mt-1.5 text-sm text-gris">
        {ayuda}
      </p>
      {error && (
        <p id={`${id}-error`} className="mt-2 flex items-start gap-1.5 text-sm text-peligro">
          <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </fieldset>
  );
}
