import { conteosParticipaciones } from "./participaciones";
import { catalogosDemo, procesoDemo } from "./fixtures-alcaldia";
import {
  contextoDe,
  emitirToken,
  HORAS_INVITACION,
  nombreCompleto,
  nuevoId,
  registrar,
} from "./servicio";
import type { Almacen, Alcaldia, EstadoAlcaldia } from "./tipos";

/*
 * Capa de plataforma (backlog 2.7) sobre la API simulada: alcaldías con su resumen, alta con
 * invitación al administrador, y suspender o reactivar. Lógica pura: se prueba con Vitest.
 */

type Error = "SIN_SESION" | "SIN_PERMISO";

function gestor(alm: Almacen, sesion: string | undefined) {
  const c = contextoDe(alm, sesion);
  if (!c) return { error: "SIN_SESION" as Error };
  if (!c.permisos.has("alcaldias.gestionar")) return { error: "SIN_PERMISO" as Error };
  return { c };
}

const plano = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

export type ResumenAlcaldia = {
  alcaldia: Alcaldia;
  noticias: number;
  participaciones: number;
  porAtender: number;
  ciudadanos: number;
  administradores: { nombre: string; correo: string; pendiente: boolean }[];
  equipo: number;
};

export function resumenAlcaldia(alm: Almacen, a: Alcaldia): ResumenAlcaldia {
  const d = conteosParticipaciones(alm, a.id);
  const miembros = [...alm.usuarios.values()].filter((u) =>
    u.membresias.some((m) => m.alcaldiaId === a.id),
  );
  return {
    alcaldia: a,
    noticias: [...alm.noticias.values()].filter((n) => n.alcaldiaId === a.id).length,
    participaciones: Object.values(d).reduce((s, n) => s + n, 0),
    porAtender: d.PENDIENTE + d.EN_REVISION,
    ciudadanos: [...alm.ciudadanos.values()].filter((x) => x.alcaldiaId === a.id).length,
    administradores: miembros
      .filter((u) => u.membresias.some((m) => m.alcaldiaId === a.id && m.roles.includes("ADMIN")))
      .map((u) => ({
        nombre: nombreCompleto(u) || u.correo,
        correo: u.correo,
        pendiente: !u.activo && !u.hash,
      })),
    equipo: miembros.length,
  };
}

export function alcaldiasResumen(
  alm: Almacen,
  f: { estado?: EstadoAlcaldia; q?: string } = {},
): ResumenAlcaldia[] {
  const q = f.q ? plano(f.q) : "";
  return [...alm.alcaldias.values()]
    .filter(
      (a) =>
        (!f.estado || a.estado === f.estado) && (!q || plano(`${a.nombre} ${a.sigla}`).includes(q)),
    )
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    .map((a) => resumenAlcaldia(alm, a));
}

export type DatosAlcaldia = { nombre: string; sigla: string; correoAdmin: string };

export type ResultadoAlcaldia =
  | { estado: "OK"; id: string; token?: string }
  | { estado: Error; errores?: undefined }
  | { estado: "INVALIDO"; errores: Partial<Record<keyof DatosAlcaldia, string>> };

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Id legible a partir del nombre: «Alcaldía del Municipio Andrés Eloy Blanco» → «andres-eloy-blanco». */
function idDe(alm: Almacen, nombre: string) {
  const base =
    plano(nombre.replace(/^alcald[ií]a\s+(del\s+municipio\s+)?/i, ""))
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "alcaldia";
  let id = base;
  for (let i = 2; alm.alcaldias.has(id); i++) id = `${base}-${i}`;
  return id;
}

/**
 * Alta de una alcaldía: queda en «Onboarding pendiente» con los catálogos y fases de partida, y
 * su administrador recibe una invitación de 72 h (si ya tiene cuenta, solo se le agrega el rol).
 */
export function crearAlcaldia(
  alm: Almacen,
  sesion: string | undefined,
  datos: DatosAlcaldia,
  ahora = Date.now(),
): ResultadoAlcaldia {
  const g = gestor(alm, sesion);
  if ("error" in g) return { estado: g.error! };
  const nombre = datos.nombre.trim().replace(/\s+/g, " ");
  const sigla = datos.sigla.trim().toUpperCase();
  const correo = datos.correoAdmin.trim().toLowerCase();
  const errores: Partial<Record<keyof DatosAlcaldia, string>> = {};
  if (nombre.length < 4) errores.nombre = "Escribe el nombre de la alcaldía.";
  else if ([...alm.alcaldias.values()].some((a) => plano(a.nombre) === plano(nombre)))
    errores.nombre = "Ya existe una alcaldía con ese nombre.";
  if (!/^[A-ZÑ]{2,4}$/.test(sigla)) errores.sigla = "Usa de 2 a 4 letras, por ejemplo AEB.";
  else if ([...alm.alcaldias.values()].some((a) => a.sigla === sigla))
    errores.sigla = "Esa sigla ya la usa otra alcaldía.";
  if (!CORREO.test(correo)) errores.correoAdmin = "Escribe un correo válido.";
  if (Object.keys(errores).length) return { estado: "INVALIDO", errores };

  const id = idDe(alm, nombre);
  alm.alcaldias.set(id, { id, sigla, nombre, estado: "ONBOARDING_PENDIENTE" });
  alm.catalogos.set(id, catalogosDemo(id));
  alm.procesos.set(id, procesoDemo());

  let token: string | undefined;
  const existente = [...alm.usuarios.values()].find((u) => u.correo === correo);
  if (existente) {
    existente.membresias.push({ alcaldiaId: id, roles: ["ADMIN"], activa: true });
  } else {
    const usuarioId = `u-${nuevoId().slice(0, 10)}`;
    alm.usuarios.set(usuarioId, {
      id: usuarioId,
      correo,
      hash: "",
      nombres: "",
      apellidos: "",
      activo: false,
      membresias: [{ alcaldiaId: id, roles: ["ADMIN"], activa: true }],
      intentosFallidos: 0,
    });
    token = emitirToken(alm, usuarioId, "INVITACION", HORAS_INVITACION, ahora);
  }
  registrar(
    alm,
    {
      actorId: g.c.usuario.id,
      alcaldiaId: id,
      accion: "ALCALDIA_CREADA",
      entidad: `alcaldia:${id}`,
      despues: { nombre, sigla, administrador: correo },
    },
    ahora,
  );
  return { estado: "OK", id, token };
}

export const MOTIVO_SUSPENSION_MIN = 10;

/** Suspender (con motivo) o reactivar una alcaldía. Al reactivar vuelve a su onboarding si no lo terminó. */
export function cambiarEstadoAlcaldia(
  alm: Almacen,
  sesion: string | undefined,
  id: string,
  suspender: boolean,
  motivo = "",
  ahora = Date.now(),
): { estado: "OK" | Error | "NO_EXISTE" | "SIN_MOTIVO" } {
  const g = gestor(alm, sesion);
  if ("error" in g) return { estado: g.error! };
  const a = alm.alcaldias.get(id);
  if (!a) return { estado: "NO_EXISTE" };
  const texto = motivo.trim();
  if (suspender && texto.length < MOTIVO_SUSPENSION_MIN) return { estado: "SIN_MOTIVO" };
  const antes = { estado: a.estado, motivo: a.motivoSuspension };
  if (suspender) {
    a.estado = "SUSPENDIDA";
    a.motivoSuspension = texto;
  } else {
    a.estado = a.marca ? "ACTIVA" : "ONBOARDING_PENDIENTE";
    a.motivoSuspension = undefined;
  }
  registrar(
    alm,
    {
      actorId: g.c.usuario.id,
      alcaldiaId: id,
      accion: suspender ? "ALCALDIA_SUSPENDIDA" : "ALCALDIA_REACTIVADA",
      entidad: `alcaldia:${id}`,
      antes,
      despues: { estado: a.estado, motivo: a.motivoSuspension },
    },
    ahora,
  );
  return { estado: "OK" };
}
