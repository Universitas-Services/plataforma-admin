import "server-only";
import { conBom, ErrorApi, pedirApi } from "./cliente";
import { tokensDeCookie } from "./sesion-api";
import type {
  ClaveRango,
  Fila,
  MetricasCiudadania,
  MetricasContenido,
  MetricasParticipacion,
} from "@/lib/plataforma/metricas";

/*
 * Indicadores del Tablero contra plataforma-api (guía R14: /admin/metrics). Las formas son las de
 * metricas.ts; lo único que cambia es `href`: la API da el folio o el id, y aquí se arma la ruta
 * del panel.
 */

export type SeccionMetricas = "participacion" | "contenido" | "ciudadania" | "equipo";

const RUTA: Record<SeccionMetricas, string> = {
  participacion: "participation",
  contenido: "content",
  ciudadania: "citizens",
  equipo: "team",
};

type Respuestas = {
  participacion: MetricasParticipacion;
  contenido: MetricasContenido;
  ciudadania: MetricasCiudadania;
  equipo: Fila[];
};

async function token() {
  const t = await tokensDeCookie();
  return t && t.x > Date.now() ? t.a : undefined;
}

/** El folio o el id de la API → la ruta del panel (los rankings llevan a su ficha). */
const conRuta = (filas: Fila[], base: string) =>
  filas.map((f) => (f.href ? { ...f, href: `${base}/${encodeURIComponent(f.href)}` } : f));

function deApi<S extends SeccionMetricas>(seccion: S, d: Respuestas[S]): Respuestas[S] {
  if (seccion === "participacion") {
    const p = d as MetricasParticipacion;
    return { ...p, masReacciones: conRuta(p.masReacciones, "/participaciones") } as Respuestas[S];
  }
  if (seccion === "contenido") {
    const c = d as MetricasContenido;
    return {
      ...c,
      masVistas: conRuta(c.masVistas, "/contenido/noticias"),
      masValoradas: conRuta(c.masValoradas, "/contenido/noticias"),
      masDescargados: conRuta(c.masDescargados, "/contenido/documentos"),
    } as Respuestas[S];
  }
  return d;
}

/** Una sección del Tablero para el rango (7d, 30d, 90d o «anio»). */
export async function metricasApi<S extends SeccionMetricas>(
  seccion: S,
  clave: ClaveRango,
): Promise<Respuestas[S]> {
  const t = await token();
  if (!t) throw new ErrorApi(401, "SIN_SESION", "Tu sesión terminó.");
  const d = await pedirApi<Respuestas[S]>(`/admin/metrics/${RUTA[seccion]}?rango=${clave}`, {
    token: t,
  });
  return deApi(seccion, d);
}

/** El CSV de la API (mismas filas que csvMetricas). La exportación queda en la bitácora. */
export async function exportarMetricasApi(clave: ClaveRango) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    const csv = await pedirApi<string>(`/admin/metrics/export.csv?rango=${clave}`, {
      token: t,
      crudo: true,
    });
    return { estado: "OK" as const, csv: conBom(csv) };
  } catch (e) {
    if (e instanceof ErrorApi && (e.status === 401 || e.status === 403))
      return { estado: "SIN_PERMISO" as const };
    throw e;
  }
}
