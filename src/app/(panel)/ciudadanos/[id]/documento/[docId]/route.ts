import { mensajeDeError } from "@/lib/api/errores";
import { usaApi } from "@/lib/api/cliente";
import { urlDocumentoCiudadanoApi } from "@/lib/api/ciudadanos";
import { getContexto } from "@/lib/plataforma/sesion";

/**
 * Abre un documento del ciudadano: pide a plataforma-api la URL firmada de 5 minutos y redirige
 * a ella. Así la URL no queda en el HTML y cada consulta queda en la bitácora (quién vio qué
 * documento). Solo con permiso de ver ciudadanos.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/ciudadanos/[id]/documento/[docId]">,
) {
  const c = await getContexto();
  if (!c?.alcaldia || !c.permisos.has("ciudadanos.ver"))
    return new Response("Sin permiso", { status: 403 });
  // Sin la API, los documentos de ejemplo no tienen archivo.
  if (!usaApi()) return new Response("No encontrado", { status: 404 });
  const { id, docId } = await ctx.params;
  try {
    const r = await urlDocumentoCiudadanoApi(id, docId);
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
