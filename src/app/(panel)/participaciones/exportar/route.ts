import { mensajeDeError } from "@/lib/api/errores";
import { usaApi } from "@/lib/api/cliente";
import { exportarCsvApi } from "@/lib/api/participaciones";
import { bandeja, csvBandeja } from "@/lib/plataforma/participaciones";
import { filtrosDeBandeja } from "@/lib/plataforma/filtros-bandeja";
import { almacen, getContexto } from "@/lib/plataforma/sesion";

/**
 * CSV de la bandeja con los filtros de la URL (backlog 2.10). Solo con permiso de evaluar. Con
 * plataforma-api se reenvía export.csv tal cual (ya enmascarado y en la bitácora).
 */
export async function GET(request: Request) {
  const c = await getContexto();
  if (!c?.alcaldia || !c.permisos.has("participaciones.evaluar"))
    return new Response("Sin permiso", { status: 403 });
  const { filtros } = filtrosDeBandeja(Object.fromEntries(new URL(request.url).searchParams));
  let csv: string;
  if (usaApi()) {
    try {
      const r = await exportarCsvApi(filtros);
      if (r.estado !== "OK") return new Response("Sin permiso", { status: 403 });
      csv = r.csv;
    } catch (e) {
      return new Response(mensajeDeError(e), { status: 502 });
    }
  } else csv = csvBandeja(bandeja(almacen(), c.alcaldia.id, filtros));
  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="participaciones-${c.alcaldia.sigla.toLowerCase()}-${fecha}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
