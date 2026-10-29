import "server-only";
import { ErrorApi, pedirApi } from "./cliente";
import { tokensDeCookie } from "./sesion-api";
import { ALCALDIA } from "@/config/alcaldia";
import type { Banner, CamposBanner, Vigencia } from "@/lib/contenido/tipos";
import type { FilaBanner, ResultadoBanners } from "@/lib/plataforma/banners";

/*
 * Diapositivas de la tarjeta de transiciones contra plataforma-api (guía R10: /admin/banners,
 * permiso contenido.editar). Devuelven las mismas formas que banners.ts: la lista con sus conteos
 * por vigencia y las que el portal muestra hoy (`enPortal`, que la API manda como ids). Los
 * códigos son los mismos del almacén: FECHAS, MEDIO_AJENO y ORDEN_INVALIDO.
 */

type BannerApi = Omit<Banner, "alcaldiaId"> & { estadoVigencia: Vigencia };

const deApi = (b: BannerApi): FilaBanner => ({ ...b, alcaldiaId: ALCALDIA.id });

type Fallo =
  "SIN_SESION" | "SIN_PERMISO" | "NO_EXISTE" | "FECHAS" | "MEDIO_AJENO" | "ORDEN_INVALIDO";

const PROPIOS = new Set(["FECHAS", "MEDIO_AJENO", "ORDEN_INVALIDO"]);

/** El campo del formulario al que apunta un texto de validación de la API. */
function campoDe(texto: string) {
  const t = texto.toLowerCase();
  if (t.includes("etiqueta") || t.includes("botón") || t.includes("boton"))
    return "enlace-etiqueta";
  if (t.includes("enlace") || t.includes("href")) return "enlace-href";
  if (t.includes("alt") || t.includes("imagen") || t.includes("foto")) return "imagen-alt";
  if (t.includes("texto")) return "texto";
  return "titulo";
}

function fallo(
  e: unknown,
): { estado: Fallo } | { estado: "INVALIDO"; errores: Record<string, string> } {
  if (e instanceof ErrorApi && e.code === "VALIDATION_ERROR") {
    const errores: Record<string, string> = {};
    const textos = Array.isArray(e.details) ? e.details.map(String) : [e.message];
    for (const t of textos) errores[campoDe(t)] ??= t;
    return { estado: "INVALIDO", errores };
  }
  if (e instanceof ErrorApi) {
    if (PROPIOS.has(e.code)) return { estado: e.code as Fallo };
    if (e.status === 401) return { estado: "SIN_SESION" };
    if (e.status === 403) return { estado: "SIN_PERMISO" };
    if (e.status === 404) return { estado: "NO_EXISTE" };
  }
  throw e;
}

async function token() {
  const t = await tokensDeCookie();
  return t && t.x > Date.now() ? t.a : undefined;
}

const ruta = (id: string) => `/admin/banners/${encodeURIComponent(id)}`;

type ListaApi = {
  data: BannerApi[];
  meta: { total: number; conteos: Record<Vigencia, number>; enPortal: string[] };
};

/**
 * La lista (filtrada por vigencia, si se pide) con sus conteos, y las que el portal muestra hoy.
 * Con filtro, la lista filtrada puede no traer las del portal: se pide además la completa.
 */
export async function listarBannersApi(filtro?: Vigencia): Promise<ResultadoBanners> {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" };
  try {
    const pedir = (v?: Vigencia) =>
      pedirApi<ListaApi>(`/admin/banners${v ? `?vigencia=${v}` : ""}`, { token: t });
    const [lista, completa] = await Promise.all([pedir(filtro), filtro ? pedir() : undefined]);
    const todas = (completa ?? lista).data.map(deApi);
    const porId = new Map(todas.map((b) => [b.id, b]));
    return {
      estado: "OK",
      items: lista.data.map(deApi),
      conteos: lista.meta.conteos,
      total: lista.meta.total,
      enPortal: lista.meta.enPortal.flatMap((id) => porId.get(id) ?? []),
    };
  } catch (e) {
    return fallo(e) as { estado: "SIN_SESION" | "SIN_PERMISO" };
  }
}

export async function obtenerBannerApi(id: string) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    return {
      estado: "OK" as const,
      banner: deApi(await pedirApi<BannerApi>(ruta(id), { token: t })),
    };
  } catch (e) {
    return fallo(e) as { estado: "SIN_SESION" | "SIN_PERMISO" | "NO_EXISTE" };
  }
}

/** El cuerpo completo: sin `imagen` o sin `vigencia`, la API los quita (como guardarBanner). */
function cuerpo(c: CamposBanner) {
  const { desde, hasta } = c.vigencia ?? {};
  return {
    titulo: c.titulo,
    texto: c.texto,
    enlace: c.enlace,
    tono: c.tono,
    imagen: c.imagen,
    vigencia: desde || hasta ? { desde: desde || undefined, hasta: hasta || undefined } : undefined,
  };
}

/** Crea (sin id, al final) o actualiza una diapositiva. */
export async function guardarBannerApi(id: string | undefined, campos: CamposBanner) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    const b = await pedirApi<BannerApi>(id ? ruta(id) : "/admin/banners", {
      metodo: id ? "PATCH" : "POST",
      token: t,
      cuerpo: cuerpo(campos),
    });
    return { estado: "OK" as const, banner: deApi(b) };
  } catch (e) {
    return fallo(e);
  }
}

/** `ids`: todas las diapositivas, en el orden nuevo (PUT, como el Marco legal). */
export async function ordenarBannersApi(ids: string[]) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    await pedirApi("/admin/banners/order", { metodo: "PUT", token: t, cuerpo: { ids } });
    return { estado: "OK" as const };
  } catch (e) {
    return fallo(e);
  }
}

export async function eliminarBannerApi(id: string) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    await pedirApi(ruta(id), { metodo: "DELETE", token: t });
    return { estado: "OK" as const };
  } catch (e) {
    return fallo(e);
  }
}
