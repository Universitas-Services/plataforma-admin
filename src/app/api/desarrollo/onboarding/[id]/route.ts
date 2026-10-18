import { reiniciarOnboarding } from "@/lib/plataforma/fixtures";
import { almacen, esDesarrollo } from "@/lib/plataforma/sesion";

/*
 * Solo en desarrollo: DELETE devuelve una alcaldía de demostración a «onboarding pendiente»,
 * para repetir las pruebas del asistente. En producción responde 404.
 */
export async function DELETE(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!esDesarrollo) return new Response(null, { status: 404 });
  const { id } = await params;
  return new Response(null, { status: reiniciarOnboarding(almacen(), id) ? 204 : 404 });
}
