import { ciudadanosDe, csvCiudadanos, filtrosCiudadanos } from "@/lib/plataforma/alcaldia";
import { almacen, getContexto } from "@/lib/plataforma/sesion";

/** CSV de ciudadanos con los filtros de la URL (backlog 2.11). La cédula sale enmascarada. */
export async function GET(request: Request) {
  const c = await getContexto();
  if (!c?.alcaldia || !c.permisos.has("ciudadanos.ver"))
    return new Response("Sin permiso", { status: 403 });
  const sp = new URL(request.url).searchParams;
  const lista = ciudadanosDe(
    almacen(),
    c.alcaldia.id,
    filtrosCiudadanos((k) => sp.get(k) ?? undefined),
  );
  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(csvCiudadanos(lista), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ciudadanos-${c.alcaldia.sigla.toLowerCase()}-${fecha}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
