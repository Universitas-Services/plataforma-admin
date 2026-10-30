import { NextResponse, type NextRequest } from "next/server";
import { usaApi } from "@/lib/api/cliente";
import { esPrefetch, revisarCookie } from "@/lib/api/renovacion";
import { COOKIE_API, DURACION_COOKIE_S } from "@/lib/api/sello";

/*
 * Dos tareas antes de renderizar:
 *
 * 1. Con plataforma-api (API_URL definida), la cookie de la sesión (renovacion.ts): se cierra
 *    tras 15 minutos sin actividad; si el access token vence en menos de un minuto, se renueva
 *    con el refresh token (una sola vez aunque lleguen varias peticiones a la vez), y se anota
 *    la actividad. La cookie se reescribe en la petición (para que la página la use ya) y en la
 *    respuesta. Se hace aquí porque durante el render no se pueden escribir cookies.
 *
 * 2. Verificación optimista: sin la cookie de sesión no tiene sentido renderizar el panel, así
 *    que se va directo a «Iniciar sesión» con el regreso indicado. Solo mira si la cookie
 *    existe; la sesión real, el rol y el permiso los comprueba cada página en el servidor
 *    (sesion.ts). No redirige a quien tiene cookie fuera del panel: una cookie vencida haría un
 *    bucle. /api/sesion (la consulta de VigiaSesion) nunca se redirige: responde JSON.
 */

/** Mismo nombre que COOKIE_SESION en src/lib/plataforma/sesion.ts. */
const COOKIE_SESION = "pp_sesion";

const opciones = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: DURACION_COOKIE_S,
};

export async function proxy(request: NextRequest) {
  const consulta = request.nextUrl.pathname === "/api/sesion";
  // La consulta de VigiaSesion no renueva el token: así no compite con la página que se está
  // cargando por el mismo refresh token (en Netlify pueden llegar a instancias distintas).
  const cambio = usaApi()
    ? await revisarCookie(request.cookies.get(COOKIE_API)?.value, {
        prefetch: consulta || esPrefetch(request.headers),
      })
    : undefined;
  if (cambio) {
    if (cambio.valor) request.cookies.set(COOKIE_API, cambio.valor);
    else request.cookies.delete(COOKIE_API);
  }

  let respuesta: NextResponse;
  const conCookie = request.cookies.has(usaApi() ? COOKIE_API : COOKIE_SESION);
  // Una Server Action sin sesión no se redirige (el cliente no sabría leer la respuesta): la
  // acción responde SIN_SESION y el panel muestra «Tu sesión terminó».
  const accion = request.method === "POST" && request.headers.has("next-action");
  if (request.nextUrl.pathname === "/" && conCookie && !accion) {
    // La raíz va directo al tablero, sin pasar por una página que espera la sesión.
    respuesta = NextResponse.redirect(new URL("/tablero", request.url));
  } else if (consulta || accion || conCookie) {
    respuesta = NextResponse.next({ request: { headers: request.headers } });
  } else {
    const { pathname, search } = request.nextUrl;
    const destino = new URL("/ingresar", request.url);
    if (pathname !== "/") destino.searchParams.set("volver", `${pathname}${search}`);
    if (cambio?.valor === null && cambio.motivo === "inactividad")
      destino.searchParams.set("aviso", "inactividad");
    respuesta = NextResponse.redirect(destino);
  }

  if (cambio?.valor) respuesta.cookies.set(COOKIE_API, cambio.valor, opciones);
  else if (cambio) respuesta.cookies.delete(COOKIE_API);
  return respuesta;
}

export const config = {
  // Todo menos las pantallas de acceso, la API de Next y los archivos estáticos.
  matcher: [
    "/((?!ingresar|invitacion|recuperar|restablecer|_next|brand/|marca/|ejemplos/|favicon|icon|apple-icon).*)",
  ],
};
