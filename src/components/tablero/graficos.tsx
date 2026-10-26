"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { Fila, Punto } from "@/lib/plataforma/metricas";

/*
 * Gráficos del tablero en SVG propio (sin librería), con la guía de dataviz: una sola serie en el
 * rojo de la marca (validado: contraste ≥ 3:1 sobre blanco), columnas de ≤ 24 px con la punta
 * redondeada de 4 px y la base recta, rejilla de 1 px recesiva, tooltip con el puntero y con las
 * flechas del teclado, y siempre la tabla con los mismos datos.
 */

const cifra = (n: number) => n.toLocaleString("es-VE");
const fechaCorta = new Intl.DateTimeFormat("es-VE", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const dia = (d: string) => fechaCorta.format(new Date(`${d}T12:00:00Z`));
export const tramo = (p: Punto) =>
  p.desde === p.hasta ? dia(p.desde) : `${dia(p.desde)} al ${dia(p.hasta)}`;

/** Tope «redondo» del eje (múltiplo de 1, 2, 2,5, 3, 4, 5, 6 u 8 × 10ⁿ). */
function tope(max: number) {
  if (max <= 4) return Math.max(max, 1);
  const base = 10 ** Math.floor(Math.log10(max));
  return [1, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * base).find((v) => v >= max)!;
}

/** Columna con la punta redondeada (4 px) y la base recta sobre el eje. */
function columna(x: number, y: number, ancho: number, alto: number) {
  if (alto <= 0) return "";
  const r = Math.min(4, ancho / 2, alto);
  return `M${x},${y + alto}V${y + r}Q${x},${y} ${x + r},${y}H${x + ancho - r}Q${x + ancho},${y} ${x + ancho},${y + r}V${y + alto}Z`;
}

const ALTO = 180;
const MARGEN = { arriba: 12, abajo: 26, izq: 36, der: 8 };

export function Columnas({
  titulo,
  puntos,
  unidad,
}: {
  titulo: string;
  puntos: Punto[];
  /** «aportes», «vistas»… para el tooltip y la tabla. */
  unidad: string;
}) {
  const id = useId();
  const marco = useRef<SVGSVGElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const [activo, setActivo] = useState<number>();
  // Se dibuja al ancho real del contenedor: los rótulos quedan en 11 px en cualquier pantalla.
  const [ancho, setAncho] = useState(640);
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setAncho(Math.max(240, Math.round(e!.contentRect.width))),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const max = tope(Math.max(0, ...puntos.map((p) => p.valor)));
  const total = puntos.reduce((s, p) => s + p.valor, 0);
  const banda = (ancho - MARGEN.izq - MARGEN.der) / Math.max(1, puntos.length);
  const grosor = Math.min(24, Math.max(2, banda - 2));
  const alto = ALTO - MARGEN.arriba - MARGEN.abajo;
  const y = (v: number) => MARGEN.arriba + alto - (v / max) * alto;
  const marcas = [0, max / 2, max].filter((v, i, a) => a.indexOf(v) === i && Number.isInteger(v));
  // Rótulos del eje X repartidos: uno cada ~80 px.
  const cada = Math.ceil(puntos.length / Math.max(2, Math.floor(ancho / 80)));

  function elegir(e: PointerEvent<SVGSVGElement>) {
    const borde = marco.current!.getBoundingClientRect();
    const x = ((e.clientX - borde.left) / borde.width) * ancho - MARGEN.izq;
    setActivo(Math.min(puntos.length - 1, Math.max(0, Math.floor(x / banda))));
  }

  function teclado(e: KeyboardEvent<SVGSVGElement>) {
    const i = activo ?? -1;
    const sig =
      e.key === "ArrowRight"
        ? i + 1
        : e.key === "ArrowLeft"
          ? i - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? puntos.length - 1
              : undefined;
    if (sig === undefined) return;
    e.preventDefault();
    setActivo(Math.min(puntos.length - 1, Math.max(0, sig)));
  }

  const p = activo !== undefined ? puntos[activo] : undefined;
  const xActivo = activo !== undefined ? MARGEN.izq + activo * banda + banda / 2 : 0;

  return (
    <figure className="min-w-0">
      <div ref={caja} className="relative">
        <svg
          ref={marco}
          viewBox={`0 0 ${ancho} ${ALTO}`}
          className="block h-auto w-full touch-pan-y overflow-visible outline-none focus-visible:rounded-sm focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-marca"
          role="img"
          tabIndex={0}
          aria-label={`${titulo}: ${cifra(total)} ${unidad} en total. Usa las flechas para recorrer los valores.`}
          aria-describedby={`${id}-lectura`}
          onPointerMove={elegir}
          onPointerLeave={() => setActivo(undefined)}
          onKeyDown={teclado}
          onBlur={() => setActivo(undefined)}
        >
          {marcas.map((v) => (
            <g key={v}>
              <line
                x1={MARGEN.izq}
                x2={ancho - MARGEN.der}
                y1={y(v)}
                y2={y(v)}
                className="stroke-linea"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={MARGEN.izq - 8}
                y={y(v)}
                dy="0.32em"
                textAnchor="end"
                className="fill-gris text-[11px] tabular-nums"
              >
                {cifra(v)}
              </text>
            </g>
          ))}
          {p && (
            <line
              x1={xActivo}
              x2={xActivo}
              y1={MARGEN.arriba}
              y2={MARGEN.arriba + alto}
              className="stroke-tenue"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {puntos.map((pt, i) => {
            const x = MARGEN.izq + i * banda + (banda - grosor) / 2;
            return (
              <path
                key={pt.desde}
                d={columna(x, y(pt.valor), grosor, MARGEN.arriba + alto - y(pt.valor))}
                className={activo === undefined || activo === i ? "fill-marca" : "fill-marca/45"}
              />
            );
          })}
          {puntos.map((pt, i) =>
            i % cada === 0 ? (
              <text
                key={pt.desde}
                x={MARGEN.izq + i * banda + banda / 2}
                y={ALTO - 8}
                textAnchor="middle"
                className="fill-gris text-[11px]"
              >
                {dia(pt.desde)}
              </text>
            ) : null,
          )}
        </svg>
        {p && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-control border border-linea bg-papel px-3 py-2 text-sm whitespace-nowrap shadow-panel"
            style={{ left: `clamp(4.5rem, ${(xActivo / ancho) * 100}%, calc(100% - 4.5rem))` }}
          >
            <p className="font-bold text-tinta tabular-nums">
              {cifra(p.valor)} {unidad}
            </p>
            <p className="text-gris">{tramo(p)}</p>
          </div>
        )}
      </div>
      <p id={`${id}-lectura`} aria-live="polite" className="sr-only">
        {p ? `${tramo(p)}: ${cifra(p.valor)} ${unidad}` : ""}
      </p>
      <TablaDatos
        titulo={titulo}
        columna="Fecha"
        unidad={unidad}
        filas={puntos.map((pt) => ({ nombre: tramo(pt), valor: pt.valor }))}
      />
    </figure>
  );
}

/** La misma información en tabla, plegada (WCAG 1.1.1: alternativa al gráfico). */
export function TablaDatos({
  titulo,
  columna,
  unidad,
  filas,
}: {
  titulo: string;
  columna: string;
  unidad: string;
  filas: Fila[];
}) {
  return (
    <details className="mt-2 text-sm">
      <summary className="inline-flex min-h-10 cursor-pointer items-center font-semibold text-marca-texto hover:underline">
        Ver como tabla
      </summary>
      <div className="mt-2 max-h-64 overflow-y-auto rounded-control border border-linea">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{titulo}</caption>
          <thead className="sticky top-0 bg-cabecera text-xs font-semibold tracking-wide text-gris uppercase">
            <tr>
              <th scope="col" className="px-3 py-2">
                {columna}
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                {unidad[0]!.toUpperCase() + unidad.slice(1)}
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.nombre} className="border-t border-fila">
                <td className="px-3 py-1.5">{f.nombre}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{cifra(f.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/**
 * Barras horizontales con el valor en la punta: para rankings y repartos (pocas filas, nombres
 * largos). Todas llevan su número, así que no hace falta tooltip; el nombre enlaza si hay ficha.
 */
export function Barras({ filas, vacio }: { filas: Fila[]; vacio: string }) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  if (!filas.some((f) => f.valor)) return <p className="text-sm text-gris">{vacio}</p>;
  return (
    <ol className="space-y-2.5">
      {filas.map((f) => (
        <li key={f.nombre} className="min-w-0">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            {f.href ? (
              <Link
                href={f.href}
                className="truncate text-tinta hover:text-marca-texto hover:underline"
              >
                {f.nombre}
              </Link>
            ) : (
              <span className="truncate text-tinta">{f.nombre}</span>
            )}
            <span className="shrink-0 font-semibold text-tinta tabular-nums">{cifra(f.valor)}</span>
          </div>
          <div aria-hidden="true" className="mt-1 h-2 rounded-full bg-fila">
            {f.valor > 0 && (
              <div
                className="h-2 rounded-full bg-marca"
                style={{ width: `${Math.max(2, (f.valor / max) * 100)}%` }}
              />
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
