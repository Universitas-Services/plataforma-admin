import "server-only";
import { metricasApi, type SeccionMetricas } from "@/lib/api/metricas";
import type { ClaveRango, Indicadores } from "./metricas";

/*
 * Indicadores del Tablero con plataforma-api (guía R14): solo las secciones que permiten los
 * permisos de quien lo mira (sin permiso la API responde 403). Si una sección falla, las demás se
 * muestran igual y la página avisa: el Tablero es la portada del panel y no debe caer entero.
 */

const PERMISO: Record<SeccionMetricas, string> = {
  participacion: "metricas.participacion",
  contenido: "metricas.contenido",
  ciudadania: "metricas.ciudadania",
  equipo: "metricas.equipo",
};

export async function indicadoresApi(
  permisos: ReadonlySet<string>,
  clave: ClaveRango,
): Promise<Indicadores> {
  let incompletas = false;
  const pedir = <S extends SeccionMetricas>(s: S) =>
    permisos.has(PERMISO[s])
      ? metricasApi(s, clave).catch((e: unknown) => {
          console.error(`[admin] No se pudieron leer las métricas de ${s}:`, e);
          incompletas = true;
          return undefined;
        })
      : Promise.resolve(undefined);
  const [participacion, contenido, ciudadania, equipo] = await Promise.all([
    pedir("participacion"),
    pedir("contenido"),
    pedir("ciudadania"),
    pedir("equipo"),
  ]);
  return { participacion, contenido, ciudadania, equipo, incompletas };
}
