import { NextResponse, type NextRequest } from "next/server";

/*
 * Verificación optimista: sin la cookie de sesión no tiene sentido renderizar el panel, así
 * que se va directo a «Iniciar sesión» con el regreso indicado. Solo mira si la cookie existe;
 * la sesión real, el rol y el permiso los comprueba cada página en el servidor (sesion.ts).
 * No redirige a quien tiene cookie fuera del panel: una cookie vencida haría un bucle.
 */

/** Mismo nombre que COOKIE_SESION en src/lib/plataforma/sesion.ts. */
const COOKIE_SESION = "pp_sesion";

export function proxy(request: NextRequest) {
  if (request.cookies.has(COOKIE_SESION)) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  const destino = new URL("/ingresar", request.url);
  if (pathname !== "/") destino.searchParams.set("volver", `${pathname}${search}`);
  return NextResponse.redirect(destino);
}

export const config = {
  // Todo menos las pantallas de acceso, la API de Next y los archivos estáticos.
  matcher: [
    "/((?!ingresar|invitacion|recuperar|restablecer|_next|marca/|ejemplos/|favicon|icon|apple-icon).*)",
  ],
};
