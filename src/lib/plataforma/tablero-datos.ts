import "server-only";
import { usaApi } from "@/lib/api/cliente";
import { todosLosCiudadanosApi } from "@/lib/api/ciudadanos";
import { listarNoticiasApi } from "@/lib/api/noticias";
import type { DatosApiTablero } from "./metricas";
import { participacionesParaMetricas } from "./participaciones-datos";

/*
 * Con plataforma-api, lo que necesitan los indicadores del Tablero, según los permisos de quien
 * lo mira: la bandeja, las noticias con sus totales (R12) y los ciudadanos (R13). Lo que el rol
 * no puede leer queda vacío: nunca se mezclan cifras de ejemplo con las reales. Con R14 la API
 * dará los indicadores calculados por rango de fechas.
 */
export async function datosApiTablero(
  permisos: ReadonlySet<string>,
): Promise<DatosApiTablero | undefined> {
  if (!usaApi()) return undefined;
  const [participaciones, noticias, ciudadanos] = await Promise.all([
    permisos.has("metricas.participacion") && permisos.has("participaciones.evaluar")
      ? participacionesParaMetricas()
      : [],
    permisos.has("metricas.contenido") && permisos.has("contenido.editar")
      ? listarNoticiasApi().then((r) => (r.estado === "OK" ? r.items : []))
      : [],
    permisos.has("metricas.ciudadania") && permisos.has("ciudadanos.ver")
      ? todosLosCiudadanosApi().then((r) => (r.estado === "OK" ? r.items : []))
      : [],
  ]);
  return { participaciones: participaciones ?? [], noticias, ciudadanos };
}
