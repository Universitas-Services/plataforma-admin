"use server";

import { refresh, revalidatePath } from "next/cache";
import { usaApi } from "@/lib/api/cliente";
import { guardarActoresApi, guardarEncabezadoApi, guardarSitioApi } from "@/lib/api/sitio";
import { almacen, idSesion } from "./sesion";
import {
  actoresSchema,
  encabezadoSchema,
  erroresDe,
  guardarActores,
  guardarEncabezado,
  guardarSitio,
  sitioSchema,
  type ResultadoSitio,
} from "./sitio";

/*
 * Acciones de R17: Datos del sitio (Configuración) y el encabezado y el Registro de actores del
 * Inicio (Contenido → Inicio). Se validan aquí con los mismos esquemas en los dos modos; con
 * plataforma-api la API vuelve a validar.
 */

export type RespuestaSitio = { ok: boolean; mensaje: string; errores?: Record<string, string> };

const ERRORES: Record<Exclude<ResultadoSitio["estado"], "OK" | "INVALIDO">, RespuestaSitio> = {
  SIN_SESION: { ok: false, mensaje: "Tu sesión terminó. Vuelve a iniciar sesión." },
  SIN_PERMISO: { ok: false, mensaje: "Tu rol no puede hacer este cambio en esta alcaldía." },
};

function respuesta(r: ResultadoSitio, hecho: string, ruta: string): RespuestaSitio {
  if (r.estado === "INVALIDO")
    return { ok: false, mensaje: "Revisa los campos marcados.", errores: r.errores };
  if (r.estado !== "OK") return ERRORES[r.estado];
  revalidatePath(ruta);
  revalidatePath("/bitacora");
  refresh();
  return { ok: true, mensaje: hecho };
}

export async function guardarSitioAccion(datos: unknown): Promise<RespuestaSitio> {
  const p = sitioSchema.safeParse(datos);
  if (!p.success)
    return respuesta(
      { estado: "INVALIDO", errores: erroresDe(p.error) },
      "",
      "/configuracion/sitio",
    );
  const r = usaApi()
    ? await guardarSitioApi(p.data)
    : guardarSitio(almacen(), await idSesion(), p.data);
  return respuesta(
    r,
    "Datos del sitio guardados: el portal ya los muestra.",
    "/configuracion/sitio",
  );
}

export async function guardarEncabezadoAccion(datos: unknown): Promise<RespuestaSitio> {
  const p = encabezadoSchema.safeParse(datos);
  if (!p.success)
    return respuesta({ estado: "INVALIDO", errores: erroresDe(p.error) }, "", "/contenido/inicio");
  const r = usaApi()
    ? await guardarEncabezadoApi(p.data)
    : guardarEncabezado(almacen(), await idSesion(), p.data);
  return respuesta(
    r,
    "Encabezado guardado: el Inicio del portal ya lo muestra.",
    "/contenido/inicio",
  );
}

export async function guardarActoresAccion(datos: unknown): Promise<RespuestaSitio> {
  const p = actoresSchema.safeParse(datos);
  if (!p.success)
    return respuesta({ estado: "INVALIDO", errores: erroresDe(p.error) }, "", "/contenido/inicio");
  const r = usaApi()
    ? await guardarActoresApi(p.data)
    : guardarActores(almacen(), await idSesion(), p.data);
  return respuesta(
    r,
    "Registro de actores guardado: el Inicio del portal ya lo muestra.",
    "/contenido/inicio",
  );
}
