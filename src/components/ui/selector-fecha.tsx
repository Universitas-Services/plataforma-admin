"use client";

import { AlertCircle, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";

/*
 * Selector de fecha del panel: reemplaza al <input type="date"> nativo, que cada navegador
 * dibuja a su manera, con el estilo de los demás campos (mismo campo y panel que `Selector`).
 * Sigue el patrón «diálogo de selección de fecha» de WAI-ARIA: el campo es un botón que abre
 * un calendario en cuadrícula; el foco entra al día elegido (o a hoy) y se mueve con las
 * flechas (días y semanas), Inicio/Fin (semana), RePág/AvPág (mes; con Mayús, año), Enter
 * para elegir y Esc para cerrar. En escritorio el panel flota bajo el campo (o encima si no
 * cabe) con posición fija, así no lo recortan las tablas ni los diálogos; en teléfono es una
 * hoja desde abajo. Las fechas son días «AAAA-MM-DD», sin hora ni zona: el valor viaja en un
 * <input type="hidden"> para que el formulario lo envíe igual que el campo nativo.
 */

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const MESES_CORTOS = MESES.map((m) => (m.length > 4 ? `${m.slice(0, 3)}.` : m));
/** La semana empieza el domingo, como el calendario de Venezuela. */
const DIAS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
const DIAS_LARGOS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const dos = (n: number) => String(n).padStart(2, "0");
const deUtc = (t: Date) =>
  `${t.getUTCFullYear()}-${dos(t.getUTCMonth() + 1)}-${dos(t.getUTCDate())}`;
const aUtc = (dia: string) => {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a!, m! - 1, d!));
};

/** ¿Es un día real con la forma AAAA-MM-DD? (descarta «2026-02-31»). */
export const esDia = (v?: string): v is string =>
  !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && deUtc(aUtc(v)) === v;

const sumarDias = (dia: string, n: number) => {
  const t = aUtc(dia);
  t.setUTCDate(t.getUTCDate() + n);
  return deUtc(t);
};

/** Mismo día en otro mes; si no existe (31 de febrero), el último día de ese mes. */
const sumarMeses = (dia: string, n: number) => {
  const [a, m, d] = dia.split("-").map(Number);
  const ultimo = new Date(Date.UTC(a!, m! - 1 + n + 1, 0)).getUTCDate();
  return deUtc(new Date(Date.UTC(a!, m! - 1 + n, Math.min(d!, ultimo))));
};

/** Hoy en Venezuela, sin depender de la zona del equipo. */
export const hoyCaracas = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas" }).format(new Date());

/** «28 oct. 2026». */
export const fechaCorta = (dia: string) => {
  const [a, m, d] = dia.split("-").map(Number);
  return `${d} ${MESES_CORTOS[m! - 1]} ${a}`;
};

/** «miércoles, 28 de octubre de 2026», para lectores de pantalla. */
const fechaLarga = (dia: string) => {
  const [a, m, d] = dia.split("-").map(Number);
  return `${DIAS_LARGOS[aUtc(dia).getUTCDay()]}, ${d} de ${MESES[m! - 1]} de ${a}`;
};

/** Los 42 días (6 semanas) que muestra la cuadrícula del mes. */
function semanasDe(anio: number, mes: number) {
  const primero = deUtc(new Date(Date.UTC(anio, mes, 1)));
  const inicio = sumarDias(primero, -aUtc(primero).getUTCDay());
  return Array.from({ length: 6 }, (_, s) =>
    Array.from({ length: 7 }, (_, d) => sumarDias(inicio, s * 7 + d)),
  );
}

const ANCHO_PANEL = 320;

export function SelectorFecha({
  id,
  name,
  etiqueta,
  ocultarEtiqueta = false,
  valor,
  valorInicial = "",
  onCambio,
  min,
  max,
  vacio = "Elige una fecha",
  permitirVacio = true,
  error,
  invalido = false,
  describe,
  className = "",
}: {
  id: string;
  /** Si se pasa, el valor viaja en un campo oculto con este nombre (formularios GET). */
  name?: string;
  /** Sin etiqueta propia, el campo toma la del <label htmlFor={id}> de quien lo usa. */
  etiqueta?: string;
  ocultarEtiqueta?: boolean;
  /** Controlado. Si no se pasa, el selector guarda su propio valor. */
  valor?: string;
  valorInicial?: string;
  onCambio?: (dia: string) => void;
  /** Primer y último día elegibles (AAAA-MM-DD). */
  min?: string;
  max?: string;
  vacio?: string;
  /** Muestra «Borrar» para dejar el campo vacío (filtros y fechas opcionales). */
  permitirVacio?: boolean;
  error?: string;
  /** Marca el campo como inválido sin mensaje propio (el error lo muestra quien lo usa). */
  invalido?: boolean;
  /** Ids de ayudas o errores externos, para aria-describedby. */
  describe?: string;
  className?: string;
}) {
  const [propio, setPropio] = useState(esDia(valorInicial) ? valorInicial : "");
  const actual = valor ?? propio;
  const elegido = esDia(actual) ? actual : "";

  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<"dias" | "meses">("dias");
  const [hoy, setHoy] = useState("");
  /** Día con el foco dentro de la cuadrícula; su mes es el que se muestra. */
  const [foco, setFoco] = useState("");
  const [posicion, setPosicion] = useState<{ top: number; left: number } | null>(null);
  const campo = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const moverFoco = useRef(false);
  const base = useId();
  const idEtiqueta = `${base}-etiqueta`;
  const idValor = `${base}-valor`;
  const idTitulo = `${base}-titulo`;

  const fuera = (dia: string) => (!!min && dia < min) || (!!max && dia > max);
  const acotar = (dia: string) => (min && dia < min ? min : max && dia > max ? max : dia);

  function abrir() {
    const h = hoyCaracas();
    setHoy(h);
    setFoco(acotar(elegido || h));
    setVista("dias");
    moverFoco.current = true;
    setAbierto(true);
  }

  function cerrar(devolverFoco = true) {
    setAbierto(false);
    if (devolverFoco) campo.current?.focus();
  }

  function elegir(dia: string) {
    if (dia && fuera(dia)) return;
    if (valor === undefined) setPropio(dia);
    onCambio?.(dia);
    cerrar();
  }

  // Escritorio: el panel flota con posición fija bajo el campo, o encima si abajo no cabe.
  useLayoutEffect(() => {
    if (!abierto) return;
    const colocar = () => {
      if (window.matchMedia("(max-width: 639px)").matches) return setPosicion(null);
      const r = campo.current?.getBoundingClientRect();
      const alto = panel.current?.offsetHeight ?? 380;
      if (!r) return;
      const abajo = r.bottom + 8 + alto <= window.innerHeight - 8 || r.top - 8 - alto < 8;
      setPosicion({
        top: abajo ? r.bottom + 8 : r.top - 8 - alto,
        left: Math.max(8, Math.min(r.left, window.innerWidth - ANCHO_PANEL - 8)),
      });
    };
    colocar();
    window.addEventListener("resize", colocar);
    window.addEventListener("scroll", colocar, true);
    return () => {
      window.removeEventListener("resize", colocar);
      window.removeEventListener("scroll", colocar, true);
    };
  }, [abierto, vista]);

  // El foco sigue al día activo (y al mes elegido en la vista de meses).
  useEffect(() => {
    if (!abierto || !moverFoco.current) return;
    moverFoco.current = false;
    const destino =
      vista === "dias"
        ? panel.current?.querySelector<HTMLElement>(`[data-dia="${foco}"]`)
        : panel.current?.querySelector<HTMLElement>(`[data-mes="${foco.slice(0, 7)}"]`);
    destino?.focus();
  }, [abierto, vista, foco]);

  // Tocar fuera cierra sin elegir.
  useEffect(() => {
    if (!abierto) return;
    const alTocar = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !campo.current?.contains(t)) cerrar(false);
    };
    document.addEventListener("pointerdown", alTocar);
    return () => document.removeEventListener("pointerdown", alTocar);
  }, [abierto]);

  function irA(dia: string) {
    moverFoco.current = true;
    setFoco(acotar(dia));
  }

  function alTeclearDia(e: KeyboardEvent<HTMLButtonElement>, dia: string) {
    const salto: Record<string, () => string> = {
      ArrowLeft: () => sumarDias(dia, -1),
      ArrowRight: () => sumarDias(dia, 1),
      ArrowUp: () => sumarDias(dia, -7),
      ArrowDown: () => sumarDias(dia, 7),
      Home: () => sumarDias(dia, -aUtc(dia).getUTCDay()),
      End: () => sumarDias(dia, 6 - aUtc(dia).getUTCDay()),
      PageUp: () => sumarMeses(dia, e.shiftKey ? -12 : -1),
      PageDown: () => sumarMeses(dia, e.shiftKey ? 12 : 1),
    };
    const destino = salto[e.key]?.();
    if (!destino) return;
    e.preventDefault();
    irA(destino);
  }

  function alTeclearPanel(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Escape") return;
    // Que no cierre también el <dialog> que lo contiene.
    e.preventDefault();
    e.stopPropagation();
    if (vista === "meses") {
      moverFoco.current = true;
      setVista("dias");
    } else cerrar();
  }

  const [anio, mes] = (foco || hoyCaracas()).split("-").map(Number) as [number, number];
  const mesVisible = `${anio}-${dos(mes)}`;
  const anterior = sumarMeses(foco || `${mesVisible}-01`, vista === "dias" ? -1 : -12);
  const siguiente = sumarMeses(foco || `${mesVisible}-01`, vista === "dias" ? 1 : 12);
  // Las flechas del encabezado se apagan si todo el mes (o el año) de al lado queda fuera.
  const inicioVista = vista === "dias" ? `${mesVisible}-01` : `${anio}-01-01`;
  const finVista = vista === "dias" ? sumarMeses(inicioVista, 1) : `${anio + 1}-01-01`;
  const sinAnterior = !!min && sumarDias(inicioVista, -1) < min;
  const sinSiguiente = !!max && finVista > max;

  const describeCampo = [error && `${id}-error`, describe].filter(Boolean).join(" ");
  const claseNav =
    "grid size-9 place-items-center rounded-control text-tinta transition-colors hover:bg-superficie focus-visible:ring-2 focus-visible:ring-marca/30 disabled:pointer-events-none disabled:opacity-30 outline-none";

  return (
    <div className={`relative ${className}`}>
      {etiqueta && (
        <span
          id={idEtiqueta}
          onClick={() => campo.current?.focus()}
          className={ocultarEtiqueta ? "sr-only" : "mb-1.5 block text-sm font-bold text-tinta"}
        >
          {etiqueta}
        </span>
      )}
      <button
        ref={campo}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-labelledby={etiqueta ? `${idEtiqueta} ${idValor}` : undefined}
        aria-describedby={
          [!etiqueta && idValor, describeCampo].filter(Boolean).join(" ") || undefined
        }
        onClick={() => (abierto ? cerrar() : abrir())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !abierto) {
            e.preventDefault();
            abrir();
          }
        }}
        className={`flex h-11 w-full items-center gap-2.5 rounded-control border bg-papel px-3 text-left transition-colors outline-none focus-visible:border-marca-texto focus-visible:ring-2 focus-visible:ring-marca/20 ${
          error || invalido
            ? "border-peligro"
            : abierto
              ? "border-marca-texto"
              : "border-linea hover:border-tenue"
        }`}
      >
        <CalendarDays size={18} aria-hidden="true" className="shrink-0 text-marca-texto" />
        <span
          id={idValor}
          className={`min-w-0 flex-1 truncate ${elegido ? "font-semibold text-tinta" : "text-gris"}`}
        >
          {elegido ? fechaCorta(elegido) : vacio}
        </span>
      </button>
      {name && <input type="hidden" name={name} value={elegido} />}

      {abierto && (
        <>
          <div aria-hidden="true" className="fixed inset-0 z-40 bg-tinta/40 sm:hidden" />
          <div
            ref={panel}
            role="dialog"
            aria-modal="false"
            aria-labelledby={idTitulo}
            onKeyDown={alTeclearPanel}
            style={
              posicion ? { top: posicion.top, left: posicion.left, width: ANCHO_PANEL } : undefined
            }
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-papel px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-panel sm:inset-x-auto sm:bottom-auto sm:rounded-lg sm:p-3 sm:ring-1 sm:ring-linea"
          >
            {/* Asa de la hoja en el teléfono. */}
            <div
              aria-hidden="true"
              className="mx-auto mb-2 h-1 w-10 rounded-full bg-linea sm:hidden"
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={vista === "dias" ? "Elegir mes y año" : "Volver a los días"}
                aria-expanded={vista === "meses"}
                onClick={() => {
                  moverFoco.current = true;
                  setVista(vista === "dias" ? "meses" : "dias");
                }}
                className="mr-auto inline-flex min-h-9 items-center gap-1.5 rounded-control px-2 font-bold text-tinta transition-colors outline-none hover:bg-superficie focus-visible:ring-2 focus-visible:ring-marca/30"
              >
                <span id={idTitulo} aria-live="polite" className="first-letter:uppercase">
                  {vista === "dias" ? `${MESES[mes - 1]} de ${anio}` : String(anio)}
                </span>
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={`text-gris transition-transform duration-200 ${vista === "meses" ? "rotate-180" : ""}`}
                />
              </button>
              <button
                type="button"
                onClick={() => irA(anterior)}
                disabled={sinAnterior}
                aria-label={vista === "dias" ? "Mes anterior" : "Año anterior"}
                className={claseNav}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => irA(siguiente)}
                disabled={sinSiguiente}
                aria-label={vista === "dias" ? "Mes siguiente" : "Año siguiente"}
                className={claseNav}
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => cerrar()}
                aria-label="Cerrar el calendario"
                className={`${claseNav} sm:hidden`}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {vista === "dias" ? (
              <table role="grid" aria-labelledby={idTitulo} className="mt-2 w-full border-collapse">
                <thead>
                  <tr>
                    {DIAS.map((d, i) => (
                      <th
                        key={d}
                        scope="col"
                        abbr={DIAS_LARGOS[i]}
                        className="pb-1 text-center text-xs font-semibold text-gris"
                      >
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {semanasDe(anio, mes - 1).map((semana) => (
                    <tr key={semana[0]}>
                      {semana.map((dia) => {
                        const deEsteMes = dia.slice(0, 7) === mesVisible;
                        const esElegido = dia === elegido;
                        const esHoy = dia === hoy;
                        const bloqueado = !!fuera(dia);
                        return (
                          <td key={dia} className="p-0.5 text-center">
                            <button
                              type="button"
                              data-dia={dia}
                              tabIndex={dia === foco ? 0 : -1}
                              aria-label={`${fechaLarga(dia)}${esHoy ? ", hoy" : ""}`}
                              aria-pressed={esElegido}
                              aria-disabled={bloqueado || undefined}
                              onClick={() => (bloqueado ? undefined : elegir(dia))}
                              onKeyDown={(e) => alTeclearDia(e, dia)}
                              onFocus={() => dia !== foco && setFoco(dia)}
                              className={`mx-auto grid size-10 place-items-center rounded-full text-sm tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-marca focus-visible:ring-offset-1 sm:size-9 ${
                                esElegido
                                  ? "bg-marca font-bold text-sobre-marca"
                                  : bloqueado
                                    ? "cursor-not-allowed text-gris/40 line-through"
                                    : esHoy
                                      ? "font-bold text-marca-texto ring-1 ring-marca/40 ring-inset hover:bg-marca-suave"
                                      : deEsteMes
                                        ? "text-tinta hover:bg-marca-suave hover:text-marca-texto"
                                        : "text-gris/60 hover:bg-superficie"
                              }`}
                            >
                              {Number(dia.slice(8))}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div
                role="group"
                aria-labelledby={idTitulo}
                className="mt-2 grid grid-cols-3 gap-1.5"
              >
                {MESES_CORTOS.map((corto, i) => {
                  const clave = `${anio}-${dos(i + 1)}`;
                  const ultimoDia = sumarDias(sumarMeses(`${clave}-01`, 1), -1);
                  const bloqueado = (!!min && ultimoDia < min) || (!!max && `${clave}-01` > max);
                  const activo = clave === elegido.slice(0, 7);
                  return (
                    <button
                      key={clave}
                      type="button"
                      data-mes={clave}
                      disabled={bloqueado}
                      aria-pressed={activo}
                      aria-label={`${MESES[i]} de ${anio}`}
                      onClick={() => {
                        moverFoco.current = true;
                        setFoco(acotar(sumarMeses(foco, i + 1 - mes)));
                        setVista("dias");
                      }}
                      className={`min-h-11 rounded-control text-sm font-semibold capitalize transition-colors outline-none focus-visible:ring-2 focus-visible:ring-marca disabled:pointer-events-none disabled:opacity-30 ${
                        activo
                          ? "bg-marca text-sobre-marca"
                          : clave === mesVisible
                            ? "bg-marca-suave text-marca-texto"
                            : "text-tinta hover:bg-superficie"
                      }`}
                    >
                      {corto.replace(".", "")}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-2 flex items-center justify-between gap-2 border-t border-linea pt-2">
              {permitirVacio && elegido ? (
                <button
                  type="button"
                  onClick={() => elegir("")}
                  className="min-h-9 rounded-control px-3 text-sm font-semibold text-gris transition-colors outline-none hover:bg-superficie hover:text-tinta focus-visible:ring-2 focus-visible:ring-marca/30"
                >
                  Borrar
                </button>
              ) : (
                <span />
              )}
              {hoy && !fuera(hoy) && (
                <button
                  type="button"
                  onClick={() => elegir(hoy)}
                  className="min-h-9 rounded-control px-3 text-sm font-semibold text-marca-texto transition-colors outline-none hover:bg-marca-suave focus-visible:ring-2 focus-visible:ring-marca/30"
                >
                  Hoy
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-sm text-peligro">
          <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
