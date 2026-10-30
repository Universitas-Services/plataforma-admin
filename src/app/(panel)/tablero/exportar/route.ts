import { csvMetricas, esRango, indicadoresDe, rangoDe } from "@/lib/plataforma/metricas";
import { datosApiTablero } from "@/lib/plataforma/tablero-datos";
import { almacen, getContexto, contenidoAlDia } from "@/lib/plataforma/sesion";

/** CSV de los indicadores del rango, solo con las secciones que el rol puede ver. */
export async function GET(request: Request) {
  const c = await getContexto();
  if (!c?.alcaldia || !c.permisos.has("tablero.ver"))
    return new Response("Sin permiso", { status: 403 });
  const pedido = new URL(request.url).searchParams.get("rango");
  const r = rangoDe(esRango(pedido) ? pedido : "30d");
  await contenidoAlDia();
  const api = await datosApiTablero(c.permisos);
  const csv = csvMetricas(
    r,
    indicadoresDe(almacen(), c.alcaldia.id, c.permisos, r, Date.now(), api),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="indicadores-${c.alcaldia.sigla.toLowerCase()}-${r.desde}-a-${r.hasta}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
