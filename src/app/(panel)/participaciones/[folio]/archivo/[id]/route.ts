import { mensajeDeError } from "@/lib/api/errores";
import { usaApi } from "@/lib/api/cliente";
import { urlArchivoApi } from "@/lib/api/participaciones";
import { getContexto } from "@/lib/plataforma/sesion";

/**
 * Abre una foto, el soporte (`?tipo=adjunto`) o un documento del autor (`?tipo=documento`) de un
 * aporte: pide a plataforma-api la URL firmada de 5 minutos y redirige a ella. Así la URL no
 * queda en el HTML y cada vista queda en la bitácora. Solo con permiso de evaluar.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/participaciones/[folio]/archivo/[id]">,
) {
  const c = await getContexto();
  if (!c?.alcaldia || !c.permisos.has("participaciones.evaluar"))
    return new Response("Sin permiso", { status: 403 });
  // Sin la API, los archivos de ejemplo traen su URL pública en el detalle.
  if (!usaApi()) return new Response("No encontrado", { status: 404 });
  const { folio, id } = await ctx.params;
  const tipo =
    new URL(request.url).searchParams.get("tipo") === "documento" ? "documento" : "adjunto";
  try {
    const r = await urlArchivoApi(folio, id, tipo);
    if (r.estado === "OK")
      return new Response(null, {
        status: 302,
        headers: { Location: r.url, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
      });
    return new Response(r.estado === "NO_EXISTE" ? "No encontrado" : "Sin permiso", {
      status: r.estado === "NO_EXISTE" ? 404 : 403,
    });
  } catch (e) {
    return new Response(mensajeDeError(e), { status: 502 });
  }
}
