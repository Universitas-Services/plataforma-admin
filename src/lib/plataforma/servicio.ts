import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { ALCALDIA } from "@/config/alcaldia";
import { permisosDe, rolesDe, seccionesDe } from "./permisos";
import {
  type Alcaldia,
  type Almacen,
  type EventoBitacora,
  type RolAlcaldia,
  type TipoToken,
  type UsuarioInterno,
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
  noticias: new Map(),
  medios: new Map(),
  inicio: {},
  interacciones: new Map(),
  descargas: new Map(),
  documentos: new Map(),
  ciudadanos: new Map(),
  catalogos: new Map(),
  procesos: new Map(),
  marcoLegal: new Map(),
  banners: new Map(),
  textosLegales: [],
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

export const nuevoId = () => randomBytes(18).toString("base64url");

/** Cuántos ids secuenciales de cada tipo se generan al compilar (ver `idsPrerender`). */
export const IDS_PRERENDER = 200;

/**
 * Id secuencial legible (`n-0001`, `d-0001`, `b-0001`) para lo que tiene página de edición. En
 * Netlify, un id que no se generó al compilar devuelve 500: con ids secuenciales, las rutas
 * `[id]` pueden generar el rango de antemano. Con plataforma-api, el id lo da la API.
 */
export function idSecuencial(existentes: Iterable<string>, prefijo: string) {
  let mayor = 0;
  for (const id of existentes) {
    if (!id.startsWith(`${prefijo}-`)) continue;
    const n = Number(id.slice(prefijo.length + 1));
    if (Number.isInteger(n)) mayor = Math.max(mayor, n);
  }
  return `${prefijo}-${String(mayor + 1).padStart(4, "0")}`;
}

export const idsPrerender = (prefijo: string) =>
  Array.from({ length: IDS_PRERENDER }, (_, i) => `${prefijo}-${String(i + 1).padStart(4, "0")}`);

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
  alm.sesiones.set(sesion, { usuarioId: u.id });
  registrar(
    alm,
    {
      actorId: u.id,
      // El Super Admin entra a operar la alcaldía: queda a la vista en la bitácora.
      accion: u.rolPlataforma ? "OPERAR_COMO_SUPER_ADMIN" : "INICIO_SESION",
      entidad: "sesion",
    },
    ahora,
  );
  return { estado: "OK", sesion, destino: "/tablero" };
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
  const u = alm.usuarios.get(s.usuarioId);
  if (u) u.sesionesDesde = Date.now();
  registrar(alm, { actorId: s.usuarioId, accion: "CERRAR_TODAS_SESIONES", entidad: "sesion" });
  return n;
}

/* ---------- Contexto de la sesión ---------- */

/** La alcaldía de este despliegue (una sola: una API y una base de datos por alcaldía). */
export const alcaldiaDe = (alm: Almacen): Alcaldia =>
  alm.alcaldias.get(ALCALDIA.id) ?? {
    id: ALCALDIA.id,
    sigla: ALCALDIA.sigla,
    nombre: ALCALDIA.nombre,
  };

export function contextoDe(alm: Almacen, sesion?: string) {
  const s = sesion ? alm.sesiones.get(sesion) : undefined;
  const u = s ? alm.usuarios.get(s.usuarioId) : undefined;
  if (!s || !u || !u.activo) return null;
  return {
    usuario: u,
    alcaldia: alcaldiaDe(alm),
    roles: rolesDe(u),
    permisos: permisosDe(u),
    secciones: seccionesDe(u),
  };
}

export type Contexto = NonNullable<ReturnType<typeof contextoDe>>;

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
  // Los tokens anteriores dejan de valer; la sesión actual se vuelve a firmar al terminar.
  u.sesionesDesde = Date.now();
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
  // Un enlace «usado» de una cuenta aún sin activar fue reemplazado por otro más nuevo.
  const estado = r.estado === "USADO" && !u.hash ? ("REEMPLAZADA" as const) : r.estado;
  return {
    estado,
    correo: u.correo,
    alcaldia: alcaldiaDe(alm).nombre,
    roles: u.roles as RolAlcaldia[],
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
  u.sesionesDesde = ahora;
  registrar(alm, { actorId: u.id, accion: "RESTABLECER_CONTRASENA", entidad: "usuario" }, ahora);
  return "OK";
}
