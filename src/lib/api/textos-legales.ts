import "server-only";
import { ErrorApi, pedirApi } from "./cliente";
import { tokensDeCookie } from "./sesion-api";
import { ALCALDIA } from "@/config/alcaldia";
import type {
  ResultadoPublicar,
  ResumenTexto,
  VersionVista,
} from "@/lib/plataforma/textos-legales";
import type { TipoTextoLegal } from "@/lib/plataforma/tipos";

/*
 * Textos legales del portal contra plataforma-api (R15, pedido a backend: /admin/legal-texts,
 * permiso legal.editar). Devuelven las mismas formas y códigos que textos-legales.ts (VACIO,
 * SIN_NOTA, SIN_CAMBIOS), así las acciones no cambian.
 */

type VersionApi = {
  version: number;
  html: string;
  nota: string;
  publicadoAt: string;
  publicadoPor: { id: string; nombre: string } | null;
};

const deApi = (tipo: TipoTextoLegal, v: VersionApi): VersionVista => ({
  id: `${tipo}-${v.version}`,
  alcaldiaId: ALCALDIA.id,
  tipo,
  version: v.version,
  html: v.html,
  nota: v.nota,
  publicadoPorId: v.publicadoPor?.id ?? "",
  publicadoEl: v.publicadoAt,
  autor: v.publicadoPor?.nombre ?? "Equipo técnico",
});

type Fallo = "SIN_SESION" | "SIN_PERMISO" | "VACIO" | "SIN_NOTA" | "SIN_CAMBIOS";

function fallo(e: unknown): { estado: Fallo } {
  if (e instanceof ErrorApi) {
    if (e.code === "SIN_CAMBIOS") return { estado: "SIN_CAMBIOS" };
    if (e.code === "VALIDATION_ERROR") {
      const textos = (Array.isArray(e.details) ? e.details : [e.message]).join(" ").toLowerCase();
      return { estado: textos.includes("nota") ? "SIN_NOTA" : "VACIO" };
    }
    if (e.status === 401) return { estado: "SIN_SESION" };
    if (e.status === 403) return { estado: "SIN_PERMISO" };
  }
  throw e;
}

async function token() {
  const t = await tokensDeCookie();
  return t && t.x > Date.now() ? t.a : undefined;
}

type ListaApi = {
  data: { tipo: TipoTextoLegal; vigente: VersionApi | null; versiones: number }[];
};

/** GET /admin/legal-texts: la vigente de cada texto y cuántas versiones tiene. */
export async function textosLegalesApi(): Promise<
  { estado: "OK"; textos: Record<TipoTextoLegal, ResumenTexto> } | { estado: Fallo }
> {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" };
  try {
    const r = await pedirApi<ListaApi>("/admin/legal-texts", { token: t });
    const textos: Record<TipoTextoLegal, ResumenTexto> = {
      TERMINOS: { versiones: 0 },
      POLITICA_DATOS: { versiones: 0 },
    };
    for (const x of r.data)
      textos[x.tipo] = {
        vigente: x.vigente ? deApi(x.tipo, x.vigente) : undefined,
        versiones: x.versiones,
      };
    return { estado: "OK", textos };
  } catch (e) {
    return fallo(e);
  }
}

/** GET /admin/legal-texts/{tipo}/versions: de la más nueva a la más antigua. */
export async function historialTextoApi(
  tipo: TipoTextoLegal,
): Promise<{ estado: "OK"; versiones: VersionVista[] } | { estado: Fallo }> {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" };
  try {
    const r = await pedirApi<{ data: VersionApi[] }>(`/admin/legal-texts/${tipo}/versions`, {
      token: t,
    });
    return { estado: "OK", versiones: r.data.map((v) => deApi(tipo, v)) };
  } catch (e) {
    return fallo(e);
  }
}

/** POST /admin/legal-texts/{tipo}/versions: la API sanea el HTML y crea la versión siguiente. */
export async function publicarTextoApi(
  tipo: TipoTextoLegal,
  datos: { html: string; nota: string },
): Promise<ResultadoPublicar> {
  const t = await token();
  if (!t) return { estado: "SIN_SESION" };
  try {
    const v = await pedirApi<VersionApi>(`/admin/legal-texts/${tipo}/versions`, {
      metodo: "POST",
      token: t,
      cuerpo: datos,
    });
    return { estado: "OK", version: deApi(tipo, v) };
  } catch (e) {
    return fallo(e);
  }
}
