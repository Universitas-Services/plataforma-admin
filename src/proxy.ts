import { NextResponse, type NextRequest } from "next/server";
import { ErrorApi, refrescarTokens, usaApi } from "@/lib/api/cliente";
import {
  abrirSello,
  COOKIE_API,
  DURACION_COOKIE_S,
  secretoSesion,
  sellar,
  tokensDeRespuesta,
} from "@/lib/api/sello";

/*
 * Dos tareas antes de renderizar:
 *
 * 1. Con plataforma-api (API_URL definida): si el access token vence en menos de un minuto, lo
 *    renueva con el refresh token y reescribe la cookie, en la petición (para que la página lo
 *    use ya) y en la respuesta. Se hace aquí porque durante el render no se pueden escribir
 *    cookies, y el refresh token rota: usarlo sin guardar el nuevo cerraría la sesión.
 *
 * 2. Verificación optimista: sin la cookie de sesión no tiene sentido renderizar el panel, así
 *    que se va directo a «Iniciar sesión» con el regreso indicado. Solo mira si la cookie
 *    existe; la sesión real, el rol y el permiso los comprueba cada página en el servidor
 *    (sesion.ts). No redirige a quien tiene cookie fuera del panel: una cookie vencida haría un
 *    bucle.
 */

/** Mismo nombre que COOKIE_SESION en src/lib/plataforma/sesion.ts. */
const COOKIE_SESION = "pp_sesion";
const MARGEN_MS = 60_000;

const opciones = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: DURACION_COOKIE_S,
};

async function renovar(request: NextRequest): Promise<{ valor: string | null } | undefined> {
  const actual = request.cookies.get(COOKIE_API)?.value;
  if (!actual) return undefined;
  const tokens = abrirSello(actual, secretoSesion());
  if (!tokens) return { valor: null };
  if (tokens.x - MARGEN_MS > Date.now()) return undefined;
  try {
    return { valor: sellar(tokensDeRespuesta(await refrescarTokens(tokens.r)), secretoSesion()) };
  } catch (e) {
    // Refresh vencido, revocado o reutilizado: la sesión terminó. Si la API no responde, se deja
    // la cookie como está y la página mostrará la sesión cerrada hasta que vuelva.
    return e instanceof ErrorApi && (e.status === 401 || e.status === 403)
      ? { valor: null }
      : undefined;
  }
}

export async function proxy(request: NextRequest) {
  const cambio = usaApi() ? await renovar(request) : undefined;
  if (cambio) {
    if (cambio.valor) request.cookies.set(COOKIE_API, cambio.valor);
    else request.cookies.delete(COOKIE_API);
  }

  let respuesta: NextResponse;
  if (request.cookies.has(usaApi() ? COOKIE_API : COOKIE_SESION)) {
    respuesta = NextResponse.next({ request: { headers: request.headers } });
  } else {
    const { pathname, search } = request.nextUrl;
    const destino = new URL("/ingresar", request.url);
    if (pathname !== "/") destino.searchParams.set("volver", `${pathname}${search}`);
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
