import { bandeja, csvBandeja } from "@/lib/plataforma/participaciones";
import { almacen, getContexto } from "@/lib/plataforma/sesion";
import { ESTADOS_PARTICIPACION, TIPOS_PARTICIPACION } from "@/lib/plataforma/tipos";

/** CSV de la bandeja con los filtros de la URL (backlog 2.10). Solo con permiso de evaluar. */
export async function GET(request: Request) {
  const c = await getContexto();
  if (!c?.alcaldia || !c.permisos.has("participaciones.evaluar"))
    return new Response("Sin permiso", { status: 403 });
  const sp = new URL(request.url).searchParams;
  const estado = ESTADOS_PARTICIPACION.find((e) => e === sp.get("estado"));
  const tipo = Object.keys(TIPOS_PARTICIPACION).find((t) => t === sp.get("tipo")) as
    keyof typeof TIPOS_PARTICIPACION | undefined;
  const lista = bandeja(almacen(), c.alcaldia.id, {
    estado,
    tipo,
    parroquia: sp.get("parroquia") || undefined,
    categoria: sp.get("categoria") || undefined,
    q: sp.get("q")?.slice(0, 80) || undefined,
  });
  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(csvBandeja(lista), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="participaciones-${c.alcaldia.sigla.toLowerCase()}-${fecha}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
