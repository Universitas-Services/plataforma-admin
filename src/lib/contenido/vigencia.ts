import type { Banner, Vigencia } from "./tipos";

/* Vigencia de un banner, pura: la usan el servidor simulado y el formulario. */

/** Venezuela no cambia de hora: siempre UTC−4. */
const HUSO = "-04:00";

/** «AAAA-MM-DD» cuenta como el día completo en hora de Venezuela. */
export function instante(fecha: string, borde: "inicio" | "fin") {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return Date.parse(fecha);
  return Date.parse(`${fecha}T${borde === "inicio" ? "00:00:00.000" : "23:59:59.999"}${HUSO}`);
}

/** Vigente (se ve hoy), futuro (aún no empieza) o vencido. Ambos extremos incluidos. */
export function vigenciaDe(b: Pick<Banner, "vigencia">, ahora = Date.now()): Vigencia {
  const { desde, hasta } = b.vigencia ?? {};
  if (desde && ahora < instante(desde, "inicio")) return "FUTURO";
  if (hasta && ahora > instante(hasta, "fin")) return "VENCIDO";
  return "VIGENTE";
}
