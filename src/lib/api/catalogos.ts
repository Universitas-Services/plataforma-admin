import "server-only";
import { ErrorApi, pedirApi } from "./cliente";
import { tokensDeCookie } from "./sesion-api";
import type { ResultadoCatalogo } from "@/lib/plataforma/alcaldia";
import {
  SLUG_CATALOGO,
  TIPOS_CATALOGO,
  type ItemCatalogo,
  type TipoCatalogo,
} from "@/lib/plataforma/tipos";

/*
 * Desplegables del portal contra plataforma-api. La lectura (GET /admin/catalogs/:tipo) ya
 * existe; crear, renombrar, activar y ordenar son de R16 (pedido a backend: POST, PATCH y PUT
 * order, permiso catalogos.editar). Devuelven los mismos códigos que alcaldia.ts.
 */

type ItemApi = { id: string; valor: string; codigo: string | null; orden: number; activo: boolean };

const deApi = (i: ItemApi): ItemCatalogo => ({ id: i.id, nombre: i.valor, activo: i.activo });

const ruta = (tipo: TipoCatalogo) => `/admin/catalogs/${SLUG_CATALOGO[tipo]}`;

async function token() {
  const t = await tokensDeCookie();
  return t && t.x > Date.now() ? t.a : undefined;
}

function fallo(e: unknown): ResultadoCatalogo {
  if (e instanceof ErrorApi) {
    if (e.code === "CATALOGO_REPETIDO" || e.status === 409) return { estado: "REPETIDO" };
    if (e.code === "VALIDATION_ERROR") return { estado: "VACIO" };
    if (e.status === 401) return { estado: "SIN_SESION" };
    if (e.status === 403) return { estado: "SIN_PERMISO" };
    if (e.status === 404) return { estado: "NO_EXISTE" };
  }
  throw e;
}

async function lista(tipo: TipoCatalogo, t: string) {
  const r = await pedirApi<{ data: ItemApi[] }>(ruta(tipo), { token: t });
  return r.data;
}

/** Los 6 catálogos, con activos e inactivos, en su orden. Null sin sesión. */
export async function catalogosApi(): Promise<Record<TipoCatalogo, ItemCatalogo[]> | null> {
  const t = await token();
  if (!t) return null;
  const tipos = Object.keys(TIPOS_CATALOGO) as TipoCatalogo[];
  const listas = await Promise.all(tipos.map((tipo) => lista(tipo, t)));
  return Object.fromEntries(tipos.map((tipo, i) => [tipo, listas[i]!.map(deApi)])) as Record<
    TipoCatalogo,
    ItemCatalogo[]
  >;
}

/** Los valores activos de un catálogo, para los formularios del panel. */
export async function activosApi(tipo: TipoCatalogo): Promise<string[] | null> {
  const t = await token();
  if (!t) return null;
  return (await lista(tipo, t)).filter((i) => i.activo).map((i) => i.valor);
}

/** Crea (sin id) o renombra un valor. */
export async function guardarItemApi(
  tipo: TipoCatalogo,
  nombre: string,
  id?: string,
): Promise<ResultadoCatalogo> {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" };
  try {
    await pedirApi(id ? `${ruta(tipo)}/${encodeURIComponent(id)}` : ruta(tipo), {
      metodo: id ? "PATCH" : "POST",
      token: t,
      cuerpo: { valor: nombre },
    });
    return { estado: "OK" };
  } catch (e) {
    return fallo(e);
  }
}

export async function activarItemApi(
  tipo: TipoCatalogo,
  id: string,
  activo: boolean,
): Promise<ResultadoCatalogo> {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" };
  try {
    await pedirApi(`${ruta(tipo)}/${encodeURIComponent(id)}`, {
      metodo: "PATCH",
      token: t,
      cuerpo: { activo },
    });
    return { estado: "OK" };
  } catch (e) {
    return fallo(e);
  }
}

/** Sube o baja un valor: la API recibe la lista completa de ids en el orden nuevo. */
export async function moverItemApi(
  tipo: TipoCatalogo,
  id: string,
  direccion: -1 | 1,
): Promise<ResultadoCatalogo> {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" };
  try {
    const ids = (await lista(tipo, t)).map((i) => i.id);
    const i = ids.indexOf(id);
    const j = i + direccion;
    if (i < 0 || j < 0 || j >= ids.length) return { estado: "NO_EXISTE" };
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    await pedirApi(`${ruta(tipo)}/order`, { metodo: "PUT", token: t, cuerpo: { ids } });
    return { estado: "OK" };
  } catch (e) {
    return fallo(e);
  }
}
