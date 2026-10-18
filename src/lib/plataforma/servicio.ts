import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { permisosDe, rolesEn, seccionesDe } from "./permisos";
import type {
  Alcaldia,
  Almacen,
  EventoBitacora,
  RolAlcaldia,
  TipoToken,
  UsuarioInterno,
} from "./tipos";

/*
 * API simulada del panel interno: reproduce las reglas de /auth/* y del contexto multi-alcaldía
 * (backlog 1.2, 1.3 y 1.19) sobre un almacén en memoria. Lógica pura: no lee cookies ni
 * variables de entorno, así que se prueba con Vitest.
 */

const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;
export const MAX_INTENTOS = 5;
export const MINUTOS_BLOQUEO = 15;
export const HORAS_INVITACION = 72;

export const crearAlmacen = (): Almacen => ({
  usuarios: new Map(),
  alcaldias: new Map(),
  tokens: new Map(),
  sesiones: new Map(),
  bitacora: [],
  participaciones: new Map(),
});

/* ---------- Contraseñas (scrypt con sal, comparación en tiempo constante) ---------- */

export function cifrar(contrasena: string) {
  const sal = randomBytes(16).toString("hex");
  return `${sal}:${scryptSync(contrasena, sal, 32).toString("hex")}`;
}

function coincide(contrasena: string, hash: string) {
  const [sal, esperado] = hash.split(":");
  if (!sal || !esperado) return false;
  const calculado = scryptSync(contrasena, sal, 32);
  const guardado = Buffer.from(esperado, "hex");
  return guardado.length === calculado.length && timingSafeEqual(guardado, calculado);
}

const nuevoId = () => randomBytes(18).toString("base64url");

const porCorreo = (alm: Almacen, correo: string) =>
  [...alm.usuarios.values()].find((u) => u.correo === correo.trim().toLowerCase());

export const nombreCompleto = (u: UsuarioInterno) => `${u.nombres} ${u.apellidos}`.trim();

/* ---------- Bitácora encadenada (solo inserción) ---------- */

const huella = (e: Omit<EventoBitacora, "hash">) =>
  createHash("sha256")
    .update(
      JSON.stringify([
        e.id,
        e.fecha,
        e.actorId,
        e.alcaldiaId,
        e.accion,
        e.entidad,
        e.antes,
        e.despues,
        e.hashPrevio,
      ]),
    )
    .digest("hex");

export function registrar(
  alm: Almacen,
  e: Pick<EventoBitacora, "actorId" | "accion" | "entidad" | "alcaldiaId" | "antes" | "despues">,
  ahora = Date.now(),
) {
  const previo = alm.bitacora.at(-1);
  const base = {
    ...e,
    id: (previo?.id ?? 0) + 1,
    fecha: new Date(ahora).toISOString(),
    hashPrevio: previo?.hash ?? "0".repeat(64),
  };
  const evento: EventoBitacora = { ...base, hash: huella(base) };
  alm.bitacora.push(evento);
  return evento;
}

/** «Verificar integridad»: recalcula la cadena y señala el primer evento alterado. */
export function verificarIntegridad(alm: Almacen): { ok: true } | { ok: false; eventoId: number } {
  let previo = "0".repeat(64);
  for (const e of alm.bitacora) {
    const { hash, ...resto } = e;
    if (e.hashPrevio !== previo || huella(resto) !== hash) return { ok: false, eventoId: e.id };
    previo = hash;
  }
  return { ok: true };
}

/* ---------- Inicio de sesión ---------- */

export type ResultadoIngreso =
  | { estado: "CREDENCIALES" }
  | { estado: "BLOQUEADA"; minutos: number }
  | { estado: "DESACTIVADA" }
  | { estado: "OK"; sesion: string; destino: string };

/**
 * Credenciales con bloqueo temporal: 5 intentos fallidos seguidos bloquean 15 minutos
 * (RF-AUT-06). El mensaje de credenciales es el mismo exista o no el correo.
 */
export function iniciarSesion(
  alm: Almacen,
  correo: string,
  contrasena: string,
  ahora = Date.now(),
): ResultadoIngreso {
  const u = porCorreo(alm, correo);
  if (!u || !u.hash) return { estado: "CREDENCIALES" };
  if (u.bloqueadoHasta && u.bloqueadoHasta > ahora)
    return { estado: "BLOQUEADA", minutos: Math.ceil((u.bloqueadoHasta - ahora) / MINUTO) };
  if (!coincide(contrasena, u.hash)) {
    u.intentosFallidos += 1;
    if (u.intentosFallidos >= MAX_INTENTOS) {
      u.intentosFallidos = 0;
      u.bloqueadoHasta = ahora + MINUTOS_BLOQUEO * MINUTO;
      registrar(alm, { actorId: u.id, accion: "CUENTA_BLOQUEADA", entidad: "usuario" }, ahora);
      return { estado: "BLOQUEADA", minutos: MINUTOS_BLOQUEO };
    }
    return { estado: "CREDENCIALES" };
  }
  if (!u.activo) return { estado: "DESACTIVADA" };
  u.intentosFallidos = 0;
  u.bloqueadoHasta = undefined;

  const sesion = nuevoId();
  // Con una sola alcaldía, se entra directo a ella; con varias, se elige.
  const propias = alcaldiasDe(alm, u);
  const unica = !u.rolPlataforma && propias.length === 1 ? propias[0] : undefined;
  alm.sesiones.set(sesion, { usuarioId: u.id, alcaldiaId: unica?.id });
  registrar(alm, { actorId: u.id, accion: "INICIO_SESION", entidad: "sesion" }, ahora);
  return { estado: "OK", sesion, destino: destinoDe(u, unica) };
}

/** A dónde va cada quien al entrar o al cambiar de alcaldía (backlog 2.3). */
function destinoDe(u: UsuarioInterno, alcaldia?: Alcaldia) {
  if (!alcaldia) return u.rolPlataforma ? "/plataforma" : "/alcaldia";
  const configura = !!u.rolPlataforma || rolesEn(u, alcaldia.id).includes("ADMIN");
  return alcaldia.estado === "ONBOARDING_PENDIENTE" && configura ? "/onboarding" : "/tablero";
}

export function cerrarSesion(alm: Almacen, sesion?: string) {
  if (sesion) alm.sesiones.delete(sesion);
}

/** «Cerrar todas las sesiones»: revoca las de la cuenta, incluida la actual. */
export function cerrarTodas(alm: Almacen, sesion?: string) {
  const s = sesion ? alm.sesiones.get(sesion) : undefined;
  if (!s) return 0;
  let n = 0;
  for (const [id, x] of alm.sesiones)
    if (x.usuarioId === s.usuarioId) {
      alm.sesiones.delete(id);
      n += 1;
    }
  registrar(alm, { actorId: s.usuarioId, accion: "CERRAR_TODAS_SESIONES", entidad: "sesion" });
  return n;
}

/* ---------- Contexto de la sesión ---------- */

/** Alcaldías a las que puede entrar: todas para la plataforma, sus membresías activas si no. */
export function alcaldiasDe(alm: Almacen, u: UsuarioInterno): Alcaldia[] {
  const todas = [...alm.alcaldias.values()];
  if (u.rolPlataforma) return todas;
  const ids = new Set(u.membresias.filter((m) => m.activa).map((m) => m.alcaldiaId));
  return todas.filter((a) => ids.has(a.id) && a.estado !== "SUSPENDIDA");
}

export function contextoDe(alm: Almacen, sesion?: string) {
  const s = sesion ? alm.sesiones.get(sesion) : undefined;
  const u = s ? alm.usuarios.get(s.usuarioId) : undefined;
  if (!s || !u || !u.activo) return null;
  const alcaldia = s.alcaldiaId ? alm.alcaldias.get(s.alcaldiaId) : undefined;
  return {
    usuario: u,
    alcaldia,
    roles: rolesEn(u, alcaldia?.id),
    permisos: permisosDe(u, alcaldia?.id),
    secciones: seccionesDe(u, alcaldia?.id),
    alcaldias: alcaldiasDe(alm, u),
  };
}

export type Contexto = NonNullable<ReturnType<typeof contextoDe>>;

export type ResultadoElegir =
  { estado: "OK"; destino: string } | { estado: "SIN_ACCESO" } | { estado: "SIN_SESION" };

/**
 * Entrar a operar en una alcaldía. Para Super Admin y Representantes queda en la bitácora
 * (RF-PLA-07): es la cabecera X-Tenant-Id de la API.
 */
export function elegirAlcaldia(
  alm: Almacen,
  sesion: string | undefined,
  alcaldiaId: string,
  ahora = Date.now(),
): ResultadoElegir {
  const s = sesion ? alm.sesiones.get(sesion) : undefined;
  const u = s ? alm.usuarios.get(s.usuarioId) : undefined;
  if (!s || !u) return { estado: "SIN_SESION" };
  const a = alcaldiasDe(alm, u).find((x) => x.id === alcaldiaId);
  if (!a) return { estado: "SIN_ACCESO" };
  s.alcaldiaId = a.id;
  if (u.rolPlataforma)
    registrar(
      alm,
      { actorId: u.id, alcaldiaId: a.id, accion: "OPERAR_EN_ALCALDIA", entidad: "alcaldia" },
      ahora,
    );
  return { estado: "OK", destino: destinoDe(u, a) };
}

/** Vuelve a la vista de plataforma (solo roles de plataforma). */
export function salirDeAlcaldia(alm: Almacen, sesion?: string) {
  const s = sesion ? alm.sesiones.get(sesion) : undefined;
  if (s) s.alcaldiaId = undefined;
}

/* ---------- Contraseña ---------- */

export type ResultadoCambio = "OK" | "SIN_SESION" | "ACTUAL_INCORRECTA" | "IGUAL_A_LA_ACTUAL";

/** Cambiar la contraseña con la sesión abierta: exige la actual y cierra las demás sesiones. */
export function cambiarContrasena(
  alm: Almacen,
  sesion: string | undefined,
  actual: string,
  nueva: string,
): ResultadoCambio {
  const s = sesion ? alm.sesiones.get(sesion) : undefined;
  const u = s ? alm.usuarios.get(s.usuarioId) : undefined;
  if (!s || !u) return "SIN_SESION";
  if (!coincide(actual, u.hash)) return "ACTUAL_INCORRECTA";
  if (actual === nueva) return "IGUAL_A_LA_ACTUAL";
  u.hash = cifrar(nueva);
  for (const [id, x] of alm.sesiones)
    if (x.usuarioId === u.id && id !== sesion) alm.sesiones.delete(id);
  registrar(alm, { actorId: u.id, accion: "CAMBIO_CONTRASENA", entidad: "usuario" });
  return "OK";
}

/* ---------- Enlaces de un uso: invitación y restablecimiento ---------- */

export type EstadoEnlace = "OK" | "VENCIDO" | "USADO" | "INVALIDO";

export function emitirToken(
  alm: Almacen,
  usuarioId: string,
  tipo: TipoToken,
  horas: number,
  ahora = Date.now(),
) {
  // Un enlace nuevo invalida los anteriores del mismo tipo.
  for (const t of alm.tokens.values())
    if (t.usuarioId === usuarioId && t.tipo === tipo) t.usado = true;
  const token = nuevoId();
  alm.tokens.set(token, { usuarioId, tipo, expira: ahora + horas * HORA, usado: false });
  return token;
}

function revisar(alm: Almacen, token: string, tipo: TipoToken, ahora: number) {
  const t = alm.tokens.get(token);
  if (!t || t.tipo !== tipo) return { estado: "INVALIDO" as const };
  if (t.usado) return { estado: "USADO" as const, t };
  if (t.expira < ahora) return { estado: "VENCIDO" as const, t };
  return { estado: "OK" as const, t };
}

/** Lo que muestra la pantalla de invitación (GET /auth/invitations/:token). */
export function verInvitacion(alm: Almacen, token: string, ahora = Date.now()) {
  const r = revisar(alm, token, "INVITACION", ahora);
  if (r.estado === "INVALIDO") return { estado: r.estado };
  const u = alm.usuarios.get(r.t.usuarioId);
  if (!u) return { estado: "INVALIDO" as const };
  const m = u.membresias[0];
  // Un enlace «usado» de una cuenta aún sin activar fue reemplazado por otro más nuevo.
  const estado = r.estado === "USADO" && !u.hash ? ("REEMPLAZADA" as const) : r.estado;
  return {
    estado,
    correo: u.correo,
    alcaldia: m ? alm.alcaldias.get(m.alcaldiaId)?.nombre : undefined,
    roles: (m?.roles ?? []) as RolAlcaldia[],
    rolPlataforma: u.rolPlataforma,
  };
}

export function aceptarInvitacion(
  alm: Almacen,
  token: string,
  datos: { nombres: string; apellidos: string; cedula: string; contrasena: string },
  ahora = Date.now(),
): EstadoEnlace | "CEDULA_EN_USO" {
  const r = revisar(alm, token, "INVITACION", ahora);
  if (r.estado !== "OK") return r.estado;
  const u = alm.usuarios.get(r.t.usuarioId);
  if (!u) return "INVALIDO";
  if ([...alm.usuarios.values()].some((x) => x.id !== u.id && x.cedula === datos.cedula))
    return "CEDULA_EN_USO";
  r.t.usado = true;
  Object.assign(u, {
    nombres: datos.nombres,
    apellidos: datos.apellidos,
    cedula: datos.cedula,
    hash: cifrar(datos.contrasena),
    activo: true,
  });
  registrar(alm, { actorId: u.id, accion: "INVITACION_ACEPTADA", entidad: "usuario" }, ahora);
  return "OK";
}

/** Reenvía una invitación vencida o usada sin aceptar: nuevo enlace de 72 h. */
export function reenviarInvitacion(alm: Almacen, token: string, ahora = Date.now()) {
  const t = alm.tokens.get(token);
  const u = t ? alm.usuarios.get(t.usuarioId) : undefined;
  if (!t || !u || u.hash) return undefined;
  return emitirToken(alm, u.id, "INVITACION", HORAS_INVITACION, ahora);
}

/** «Olvidé mi contraseña»: siempre neutro; solo emite enlace si la cuenta existe y está activa. */
export function recuperar(alm: Almacen, correo: string, ahora = Date.now()) {
  const u = porCorreo(alm, correo);
  return {
    tokenDesarrollo:
      u?.hash && u.activo ? emitirToken(alm, u.id, "RESTABLECER", 1, ahora) : undefined,
  };
}

export const estadoRestablecer = (alm: Almacen, token: string, ahora = Date.now()) =>
  revisar(alm, token, "RESTABLECER", ahora).estado;

/** Restablece la contraseña y cierra todas las sesiones de la cuenta. */
export function restablecer(
  alm: Almacen,
  token: string,
  contrasena: string,
  ahora = Date.now(),
): EstadoEnlace {
  const r = revisar(alm, token, "RESTABLECER", ahora);
  if (r.estado !== "OK") return r.estado;
  const u = alm.usuarios.get(r.t.usuarioId);
  if (!u) return "INVALIDO";
  r.t.usado = true;
  u.hash = cifrar(contrasena);
  u.intentosFallidos = 0;
  u.bloqueadoHasta = undefined;
  for (const [id, x] of alm.sesiones) if (x.usuarioId === u.id) alm.sesiones.delete(id);
  registrar(alm, { actorId: u.id, accion: "RESTABLECER_CONTRASENA", entidad: "usuario" }, ahora);
  return "OK";
}
