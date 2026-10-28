import { ErrorApi, refrescarTokens } from "./cliente";
import { abrirSello, secretoSesion, sellar, tokensDeRespuesta, type TokensApi } from "./sello";

/*
 * Lo que Proxy decide con la cookie de la API en cada petición (pura salvo la llamada a la API,
 * para probarla con Vitest):
 *
 * - **Inactividad:** sin una petición real en INACTIVIDAD_MS, la sesión termina (decisión del
 *   28-10-2026: se cierra a los 15 minutos sin usar el panel).
 * - **Prefetch:** los que el router pide solo por tener un enlace a la vista no renuevan ni
 *   cuentan como actividad.
 * - **Renovación sin carreras:** el refresh token rota y la API revoca toda la sesión si uno se
 *   usa dos veces. Al navegar salen varias peticiones a la vez con la misma cookie, así que las
 *   renovaciones se comparten: la primera llama a la API y las demás reciben sus mismos tokens.
 *   Es la misma pieza del portal (portal-iribarren/src/lib/plataforma-api/renovacion.ts).
 */

/** Minutos sin actividad que cierran la sesión (SESION_INACTIVIDAD_MIN, por defecto 15). */
export const INACTIVIDAD_MS = (Number(process.env.SESION_INACTIVIDAD_MIN) || 15) * 60_000;
/** Se renueva si al access token le queda menos que esto. */
const MARGEN_MS = 60_000;
/** La última actividad se reescribe como mucho una vez por minuto. */
const PASO_ACTIVIDAD_MS = 60_000;
/** Cuánto se recuerda una renovación para las peticiones que llegan con el refresh anterior. */
const RECUERDO_MS = 30_000;

/** Petición de prefetch del router: no es actividad de la persona. */
export const esPrefetch = (h: Headers) =>
  h.get("next-router-prefetch") === "1" ||
  /prefetch/i.test(h.get("sec-purpose") ?? h.get("purpose") ?? "");

const renovaciones = new Map<string, { tokens: Promise<TokensApi>; hasta: number }>();

/** Renueva una sola vez por refresh token, aunque lleguen varias peticiones a la vez. */
export function renovarUnaVez(
  refresh: string,
  renovar: () => Promise<TokensApi>,
  ahora = Date.now(),
): Promise<TokensApi> {
  for (const [r, e] of renovaciones) if (e.hasta < ahora) renovaciones.delete(r);
  const previa = renovaciones.get(refresh);
  if (previa) return previa.tokens;
  const tokens = renovar();
  renovaciones.set(refresh, { tokens, hasta: ahora + RECUERDO_MS });
  // Si falla, la próxima petición lo intenta de nuevo (no se recuerda el error).
  tokens.catch(() => renovaciones.delete(refresh));
  return tokens;
}

/**
 * Cambio de la cookie: `undefined` si queda igual, `{ valor: null }` si la sesión terminó (con el
 * motivo), o el nuevo valor sellado.
 */
export type CambioCookie =
  undefined | { valor: string } | { valor: null; motivo: "inactividad" | "invalida" | "rechazada" };

export async function revisarCookie(
  actual: string | undefined,
  o: { prefetch: boolean; ahora?: number; refrescar?: typeof refrescarTokens },
): Promise<CambioCookie> {
  if (!actual) return undefined;
  const ahora = o.ahora ?? Date.now();
  const tokens = abrirSello(actual, secretoSesion());
  if (!tokens) return { valor: null, motivo: "invalida" };
  // Las cookies anteriores a este cambio no traen la última actividad: cuentan desde ahora.
  const vista = tokens.v ?? ahora;
  if (ahora - vista > INACTIVIDAD_MS) return { valor: null, motivo: "inactividad" };
  if (o.prefetch) return undefined;

  let nuevos: TokensApi = tokens;
  if (tokens.x - MARGEN_MS <= ahora) {
    const refrescar = o.refrescar ?? refrescarTokens;
    try {
      nuevos = await renovarUnaVez(
        tokens.r,
        async () => tokensDeRespuesta(await refrescar(tokens.r), ahora),
        ahora,
      );
    } catch (e) {
      // Refresh vencido, revocado o reutilizado: la sesión terminó. Si la API no responde, se
      // deja la cookie como está y la página mostrará la sesión cerrada hasta que vuelva.
      return e instanceof ErrorApi && (e.status === 401 || e.status === 403)
        ? { valor: null, motivo: "rechazada" }
        : undefined;
    }
  }
  if (nuevos === tokens && ahora - vista < PASO_ACTIVIDAD_MS) return undefined;
  return { valor: sellar({ ...nuevos, v: ahora }, secretoSesion()) };
}
