import { usaApi } from "@/lib/api/cliente";
import { exportarBitacoraApi } from "@/lib/api/bitacora";
import { mensajeDeError } from "@/lib/api/errores";
import { csvBitacora, eventosDe, filtrosBitacora } from "@/lib/plataforma/alcaldia";
import { almacen, getContexto } from "@/lib/plataforma/sesion";

/**
 * CSV de la bitácora con los filtros de la URL (backlog 2.13). Con plataforma-api se reenvía
 * export.csv tal cual (la exportación queda, a su vez, en la bitácora).
 */
export async function GET(request: Request) {
  const c = await getContexto();
  if (!c?.alcaldia || !c.permisos.has("bitacora.ver"))
    return new Response("Sin permiso", { status: 403 });
  const sp = new URL(request.url).searchParams;
  const f = filtrosBitacora((k) => sp.get(k) ?? undefined);
  let csv: string;
  if (usaApi()) {
    try {
      const r = await exportarBitacoraApi(f);
      if (r.estado !== "OK") return new Response("Sin permiso", { status: 403 });
      csv = r.csv;
    } catch (e) {
      return new Response(mensajeDeError(e), { status: 502 });
    }
  } else {
    const alm = almacen();
    csv = csvBitacora(alm, eventosDe(alm, c.alcaldia.id, f));
  }
  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bitacora-${c.alcaldia.sigla.toLowerCase()}-${fecha}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
