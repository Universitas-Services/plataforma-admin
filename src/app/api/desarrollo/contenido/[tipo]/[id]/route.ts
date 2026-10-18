import { borrarContenidoDePrueba } from "@/lib/plataforma/fixtures";
import { almacen, esDesarrollo } from "@/lib/plataforma/sesion";

/*
 * Solo en desarrollo: DELETE /api/desarrollo/contenido/{banners|documentos}/{id} borra del todo
 * lo que creó una prueba E2E (los ejemplos no se pueden borrar). En producción responde 404.
 */
export async function DELETE(
  _r: Request,
  { params }: { params: Promise<{ tipo: string; id: string }> },
) {
  if (!esDesarrollo) return new Response(null, { status: 404 });
  const { tipo, id } = await params;
  return new Response(null, { status: borrarContenidoDePrueba(almacen(), tipo, id) ? 204 : 404 });
}
