import { randomBytes } from "node:crypto";
import { sanearHtml, textoDe } from "@/lib/contenido/sanear";
import { contextoDe, nombreCompleto, registrar } from "./servicio";
import type { Almacen, TipoTextoLegal, VersionTextoLegal } from "./tipos";

/*
 * Términos de uso y política de tratamiento de datos del portal (R15). Solo el Administrador los
 * publica (permiso legal.editar). No se editan: cada cambio es una versión nueva y, al
 * publicarla, las personas registradas deben aceptarla otra vez antes de seguir usando su
 * cuenta. Lógica pura: se prueba con Vitest.
 */

export const NOTA_MAX = 500;

export type VersionVista = VersionTextoLegal & { autor: string };

type Fallo = { estado: "SIN_SESION" | "SIN_PERMISO" };

function permitido(alm: Almacen, sesion: string | undefined) {
  const c = contextoDe(alm, sesion);
  if (!c) return { estado: "SIN_SESION" as const };
  if (!c.permisos.has("legal.editar")) return { estado: "SIN_PERMISO" as const };
  return c;
}

const vista = (alm: Almacen, v: VersionTextoLegal): VersionVista => {
  const u = alm.usuarios.get(v.publicadoPorId);
  return { ...v, autor: u ? nombreCompleto(u) : "Equipo técnico" };
};

/** Versiones de un tipo, de la más nueva a la más antigua. */
const versionesDe = (alm: Almacen, alcaldiaId: string, tipo: TipoTextoLegal) =>
  alm.textosLegales
    .filter((v) => v.alcaldiaId === alcaldiaId && v.tipo === tipo)
    .sort((a, b) => b.version - a.version);

export type ResumenTexto = { vigente?: VersionVista; versiones: number };

/** La versión vigente de cada texto y cuántas se han publicado. */
export function textosLegalesDe(
  alm: Almacen,
  sesion: string | undefined,
): { estado: "OK"; textos: Record<TipoTextoLegal, ResumenTexto> } | Fallo {
  const c = permitido(alm, sesion);
  if ("estado" in c) return c;
  const resumen = (tipo: TipoTextoLegal): ResumenTexto => {
    const lista = versionesDe(alm, c.alcaldia.id, tipo);
    return { vigente: lista[0] && vista(alm, lista[0]), versiones: lista.length };
  };
  return {
    estado: "OK",
    textos: { TERMINOS: resumen("TERMINOS"), POLITICA_DATOS: resumen("POLITICA_DATOS") },
  };
}

/** Todas las versiones de un texto, de la más nueva a la más antigua. */
export function historialTexto(
  alm: Almacen,
  sesion: string | undefined,
  tipo: TipoTextoLegal,
): { estado: "OK"; versiones: VersionVista[] } | Fallo {
  const c = permitido(alm, sesion);
  if ("estado" in c) return c;
  return {
    estado: "OK",
    versiones: versionesDe(alm, c.alcaldia.id, tipo).map((v) => vista(alm, v)),
  };
}

/** El HTML del editor, saneado y sin imágenes (un texto legal no las lleva). */
export const limpiarTextoLegal = (html: string) =>
  sanearHtml(html)
    .replace(/<img\b[^>]*>/gi, "")
    .trim();

export type ResultadoPublicar =
  | { estado: "OK"; version: VersionVista }
  | Fallo
  | { estado: "VACIO" }
  | { estado: "SIN_NOTA" }
  | { estado: "SIN_CAMBIOS" };

/**
 * Publica una versión nueva. Exige texto y una nota de qué cambió; si el texto es igual al
 * vigente no publica nada (pediría aceptar de nuevo sin motivo).
 */
export function publicarTexto(
  alm: Almacen,
  sesion: string | undefined,
  tipo: TipoTextoLegal,
  datos: { html: string; nota: string },
  ahora = Date.now(),
): ResultadoPublicar {
  const c = permitido(alm, sesion);
  if ("estado" in c) return c;
  const html = limpiarTextoLegal(datos.html);
  if (!textoDe(html).trim()) return { estado: "VACIO" };
  const nota = datos.nota.trim().slice(0, NOTA_MAX);
  if (!nota) return { estado: "SIN_NOTA" };
  const vigente = versionesDe(alm, c.alcaldia.id, tipo)[0];
  if (vigente && vigente.html === html) return { estado: "SIN_CAMBIOS" };

  const nueva: VersionTextoLegal = {
    id: `texto-${randomBytes(6).toString("hex")}`,
    alcaldiaId: c.alcaldia.id,
    tipo,
    version: (vigente?.version ?? 0) + 1,
    html,
    nota,
    publicadoPorId: c.usuario.id,
    publicadoEl: new Date(ahora).toISOString(),
  };
  alm.textosLegales.push(nueva);
  registrar(
    alm,
    {
      actorId: c.usuario.id,
      alcaldiaId: c.alcaldia.id,
      accion: "TEXTO_LEGAL_PUBLICADO",
      entidad: `texto-legal:${tipo}`,
      antes: vigente && { version: vigente.version },
      despues: { version: nueva.version, nota },
    },
    ahora,
  );
  return { estado: "OK", version: vista(alm, nueva) };
}
