import { csvBitacora, eventosDe, filtrosBitacora } from "@/lib/plataforma/alcaldia";
import { almacen, getContexto } from "@/lib/plataforma/sesion";

/** CSV de la bitácora con los filtros de la URL (backlog 2.13). */
export async function GET(request: Request) {
  const c = await getContexto();
  if (!c?.alcaldia || !c.permisos.has("bitacora.ver"))
    return new Response("Sin permiso", { status: 403 });
  const sp = new URL(request.url).searchParams;
  const alm = almacen();
  const eventos = eventosDe(
    alm,
    c.alcaldia.id,
    filtrosBitacora((k) => sp.get(k) ?? undefined),
  );
  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(csvBitacora(alm, eventos), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bitacora-${c.alcaldia.sigla.toLowerCase()}-${fecha}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
