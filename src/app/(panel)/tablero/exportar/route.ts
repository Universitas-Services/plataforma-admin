import { usaApi } from "@/lib/api/cliente";
import { mensajeDeError } from "@/lib/api/errores";
import { exportarMetricasApi } from "@/lib/api/metricas";
import { csvMetricas, esRango, indicadoresDe, rangoDe } from "@/lib/plataforma/metricas";
import { almacen, getContexto, contenidoAlDia } from "@/lib/plataforma/sesion";

/**
 * CSV de los indicadores del rango, solo con las secciones que el rol puede ver. Con
 * plataforma-api se reenvía export.csv (guía R14), que queda en la bitácora.
 */
export async function GET(request: Request) {
  const c = await getContexto();
  if (!c?.alcaldia || !c.permisos.has("tablero.ver"))
    return new Response("Sin permiso", { status: 403 });
  const pedido = new URL(request.url).searchParams.get("rango");
  const r = rangoDe(esRango(pedido) ? pedido : "30d");
  let csv: string;
  if (usaApi()) {
    try {
      const e = await exportarMetricasApi(r.clave);
      if (e.estado !== "OK") return new Response("Sin permiso", { status: 403 });
      csv = e.csv;
    } catch (e) {
      return new Response(mensajeDeError(e), { status: 502 });
    }
  } else {
    await contenidoAlDia();
    csv = csvMetricas(r, indicadoresDe(almacen(), c.alcaldia.id, c.permisos, r));
  }
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="indicadores-${c.alcaldia.sigla.toLowerCase()}-${r.desde}-a-${r.hasta}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
