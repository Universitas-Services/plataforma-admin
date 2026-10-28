import "server-only";
import { ErrorApi, pedirApi } from "./cliente";
import { tokensDeCookie } from "./sesion-api";
import { ALCALDIA } from "@/config/alcaldia";
import type {
  DatosItem,
  DestinoElegible,
  ItemVista,
  VistaMarco,
} from "@/lib/plataforma/marco-legal";

/*
 * Marco legal de Conoce el PDUL contra plataforma-api (guía R9: /admin/legal-framework, permiso
 * contenido.editar). La API aplica las mismas reglas que marco-legal.ts (10 activos, orden
 * manual, botón a una noticia publicada o a un documento público) y responde los mismos códigos,
 * así respuestaMarco() de las acciones no cambia.
 */

type ItemApi = Omit<ItemVista, "alcaldiaId">;
type DestinoApi = { id: string; titulo: string; slug: string };

const deApi = (i: ItemApi): ItemVista => ({ ...i, alcaldiaId: ALCALDIA.id });

type Fallo =
  | "SIN_SESION"
  | "SIN_PERMISO"
  | "NO_EXISTE"
  | "DEMASIADOS_ACTIVOS"
  | "DESTINO_NO_DISPONIBLE"
  | "ORDEN_INVALIDO";

const PROPIOS = new Set(["DEMASIADOS_ACTIVOS", "DESTINO_NO_DISPONIBLE", "ORDEN_INVALIDO"]);

/** El campo del editor al que apunta un texto de validación de la API. */
function campoDe(texto: string) {
  const t = texto.toLowerCase();
  if (t.includes("botón") || t.includes("boton")) return "boton-texto";
  if (t.includes("descripción") || t.includes("html")) return "descripcion";
  return "titulo";
}

/** Errores de la API → el estado que traduce respuestaMarco() (o los campos a marcar). */
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

const ruta = (id: string) => `/admin/legal-framework/${encodeURIComponent(id)}`;

/** La vista del editor: los ítems (activos en orden, luego inactivos) y los destinos elegibles. */
export async function marcoLegalApi(): Promise<VistaMarco | ReturnType<typeof fallo>> {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" };
  try {
    const [lista, destinos] = await Promise.all([
      pedirApi<{ data: ItemApi[]; meta: { activos: number } }>("/admin/legal-framework", {
        token: t,
      }),
      pedirApi<{ noticias: DestinoApi[]; documentos: DestinoApi[] }>(
        "/admin/legal-framework/destinos",
        { token: t },
      ),
    ]);
    const conTipo = (tipo: DestinoElegible["tipo"]) => (d: DestinoApi) => ({ ...d, tipo });
    return {
      estado: "OK",
      items: lista.data.map(deApi),
      activos: lista.meta.activos,
      noticias: destinos.noticias.map(conTipo("NOTICIA")),
      documentos: destinos.documentos.map(conTipo("DOCUMENTO")),
    };
  } catch (e) {
    return fallo(e);
  }
}

export async function crearItemMarcoApi(datos: DatosItem) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    const item = await pedirApi<ItemApi>("/admin/legal-framework", { token: t, cuerpo: datos });
    return { estado: "OK" as const, item: deApi(item) };
  } catch (e) {
    return fallo(e);
  }
}

/** El editor manda el ítem completo; `boton: null` quita el botón. */
export async function guardarItemMarcoApi(id: string, datos: DatosItem) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    const item = await pedirApi<ItemApi>(ruta(id), {
      metodo: "PATCH",
      token: t,
      cuerpo: { ...datos, boton: datos.boton ?? null },
    });
    return { estado: "OK" as const, item: deApi(item) };
  } catch (e) {
    return fallo(e);
  }
}

/** `ids`: todos los activos, en el orden nuevo. */
export async function ordenarMarcoApi(ids: string[]) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    await pedirApi("/admin/legal-framework/order", { metodo: "PUT", token: t, cuerpo: { ids } });
    return { estado: "OK" as const };
  } catch (e) {
    return fallo(e);
  }
}

export async function eliminarItemMarcoApi(id: string) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    await pedirApi(ruta(id), { metodo: "DELETE", token: t });
    return { estado: "OK" as const };
  } catch (e) {
    return fallo(e);
  }
}
