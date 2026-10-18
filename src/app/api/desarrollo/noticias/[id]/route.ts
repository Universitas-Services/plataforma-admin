import { borrarNoticiaDePrueba } from "@/lib/plataforma/fixtures";
import { almacen, esDesarrollo } from "@/lib/plataforma/sesion";

/*
 * Solo en desarrollo: DELETE borra del todo una noticia creada por una prueba E2E, para que el
 * `pnpm dev` compartido quede con las noticias de demostración. En producción responde 404.
 */
export async function DELETE(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!esDesarrollo) return new Response(null, { status: 404 });
  const { id } = await params;
  return new Response(null, { status: borrarNoticiaDePrueba(almacen(), id) ? 204 : 404 });
}
