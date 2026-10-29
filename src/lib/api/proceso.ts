import "server-only";
import { ErrorApi, pedirApi } from "./cliente";
import { tokensDeCookie } from "./sesion-api";
import type { EstadoSiguiente, FaseProceso, Proceso } from "@/lib/plataforma/tipos";

/*
 * Proceso y termómetro contra plataforma-api (guía R10: /admin/process, permiso proceso.editar).
 * Devuelve el mismo `Proceso` del almacén ({fases, actual}) y los mismos códigos (FECHAS, LIMITE,
 * FASE_ACTUAL), así el editor de fases no cambia. D3: la API calcula el estado que se ve; el
 * Operador fija `estadoSiguiente`, lo que muestra la fase mientras no le toque.
 */

type FaseApi = {
  id: string;
  nombre: string;
  descripcion: string;
  orden: number;
  estadoSiguiente: EstadoSiguiente;
  actual: boolean;
  inicio?: string;
  fin?: string;
};
type ProcesoApi = { fases: FaseApi[]; faseActual: number };

const deApi = (p: ProcesoApi): Proceso => ({
  actual: p.faseActual,
  fases: p.fases.map((f): FaseProceso => ({
    id: f.id,
    nombre: f.nombre,
    descripcion: f.descripcion ?? "",
    inicio: f.inicio || undefined,
    fin: f.fin || undefined,
    estadoSiguiente: f.estadoSiguiente,
  })),
});

type Fallo =
  "SIN_SESION" | "SIN_PERMISO" | "NO_EXISTE" | "VACIO" | "FECHAS" | "LIMITE" | "FASE_ACTUAL";

function fallo(e: unknown): { estado: Fallo } {
  if (e instanceof ErrorApi) {
    if (e.code === "FECHAS" || e.code === "LIMITE" || e.code === "FASE_ACTUAL")
      return { estado: e.code };
    // Una lista de orden vieja: alguien cambió las fases mientras se editaban.
    if (e.code === "ORDEN_INVALIDO") return { estado: "NO_EXISTE" };
    if (e.code === "VALIDATION_ERROR") return { estado: "VACIO" };
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

export async function procesoApi(): Promise<Proceso | null> {
  const t = await token();
  if (!t) return null;
  return deApi(await pedirApi<ProcesoApi>("/admin/process", { token: t }));
}

type DatosFase = Omit<FaseProceso, "id"> & { id?: string };

/** Crea (sin id) o edita una fase. Al editar, una fecha vacía se quita (null). */
export async function guardarFaseApi(datos: DatosFase) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  const nombre = datos.nombre.trim();
  if (!nombre) return { estado: "VACIO" as const };
  const fecha = (v?: string) => v || (datos.id ? null : undefined);
  try {
    await pedirApi(
      datos.id ? `/admin/process/phases/${encodeURIComponent(datos.id)}` : "/admin/process/phases",
      {
        metodo: datos.id ? "PATCH" : "POST",
        token: t,
        cuerpo: {
          nombre,
          descripcion: datos.descripcion.trim(),
          inicio: fecha(datos.inicio),
          fin: fecha(datos.fin),
          estado: datos.estadoSiguiente ?? "PENDIENTE",
        },
      },
    );
    return { estado: "OK" as const };
  } catch (e) {
    return fallo(e);
  }
}

/** Sube o baja una fase: la API recibe la lista completa de ids en el orden nuevo. */
export async function moverFaseApi(id: string, direccion: -1 | 1) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    const p = await pedirApi<ProcesoApi>("/admin/process", { token: t });
    const ids = p.fases.map((f) => f.id);
    const i = ids.indexOf(id);
    const j = i + direccion;
    if (i < 0 || j < 0 || j >= ids.length) return { estado: "NO_EXISTE" as const };
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    await pedirApi("/admin/process/order", { metodo: "PATCH", token: t, cuerpo: { ids } });
    return { estado: "OK" as const };
  } catch (e) {
    return fallo(e);
  }
}

export async function faseActualApi(id: string) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    await pedirApi("/admin/process/current", { metodo: "PATCH", token: t, cuerpo: { faseId: id } });
    return { estado: "OK" as const };
  } catch (e) {
    return fallo(e);
  }
}

/** La fase actual no se borra: FASE_ACTUAL. */
export async function eliminarFaseApi(id: string) {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" as const };
  try {
    await pedirApi(`/admin/process/phases/${encodeURIComponent(id)}`, {
      metodo: "DELETE",
      token: t,
    });
    return { estado: "OK" as const };
  } catch (e) {
    return fallo(e);
  }
}
