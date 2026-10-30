import { enmascararDocumento } from "./participaciones";
import { type Permiso } from "./permisos";
import {
  contextoDe,
  emitirToken,
  HORAS_INVITACION,
  nombreCompleto,
  nuevoId,
  registrar,
} from "./servicio";
import {
  ESTADOS_SIGUIENTE,
  type Almacen,
  type Ciudadano,
  type EventoBitacora,
  type FaseProceso,
  type RolAlcaldia,
  type TipoCatalogo,
  type UsuarioInterno,
} from "./tipos";

/*
 * Capa del Admin de alcaldía sobre la API simulada (backlog 2.8, 2.11, 2.12 y 2.13): equipo,
 * ciudadanos, catálogos, proceso y bitácora. Lógica pura: se prueba con Vitest. Cada
 * cambio queda en la bitácora encadenada.
 */

type Error = "SIN_SESION" | "SIN_PERMISO";

/** Sesión con alcaldía en uso y el permiso pedido. */
function autorizado(alm: Almacen, sesion: string | undefined, permiso: Permiso) {
  const c = contextoDe(alm, sesion);
  if (!c) return { error: "SIN_SESION" as Error };
  if (!c.alcaldia || !c.permisos.has(permiso)) return { error: "SIN_PERMISO" as Error };
  return { c: { ...c, alcaldia: c.alcaldia } };
}

const plano = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

const celda = (v: string) => `"${v.replace(/"/g, '""')}"`;
const csv = (filas: string[][]) => `﻿${filas.map((f) => f.map(celda).join(";")).join("\r\n")}\r\n`;

/* ---------- Equipo (2.8) ---------- */

export type EstadoMiembro = "ACTIVO" | "INVITADO" | "DESACTIVADO";
export const ROLES_INVITABLES = ["OPERADOR", "REVISOR"] as const satisfies readonly RolAlcaldia[];

export type Miembro = {
  id: string;
  nombre: string;
  correo: string;
  roles: RolAlcaldia[];
  estado: EstadoMiembro;
  esYo: boolean;
  /* Con plataforma-api (guía R13). */
  /** Id de la invitación pendiente: con él se reenvía. */
  invitacionId?: string;
  invitacionVencida?: boolean;
  ultimoAcceso?: string;
};

function estadoMiembro(u: UsuarioInterno): EstadoMiembro {
  if (!u.hash) return "INVITADO";
  return u.activo ? "ACTIVO" : "DESACTIVADO";
}

export function equipoDe(
  alm: Almacen,
  alcaldiaId: string,
  yoId?: string,
  f: { rol?: RolAlcaldia; estado?: EstadoMiembro; q?: string } = {},
): Miembro[] {
  const q = f.q ? plano(f.q) : "";
  return (
    [...alm.usuarios.values()]
      // El Super Admin no es parte del equipo de la alcaldía.
      .filter((u) => !u.rolPlataforma)
      .map((u) => ({
        id: u.id,
        nombre: nombreCompleto(u) || u.correo,
        correo: u.correo,
        roles: [...u.roles],
        estado: estadoMiembro(u),
        esYo: u.id === yoId,
      }))
      .filter(
        (m) =>
          (!f.rol || m.roles.includes(f.rol)) &&
          (!f.estado || m.estado === f.estado) &&
          (!q || plano(`${m.nombre} ${m.correo}`).includes(q)),
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
  );
}

export type ResultadoEquipo =
  | { estado: "OK"; token?: string }
  | { estado: Error | "YA_ES_MIEMBRO" | "SIN_ROLES" | "NO_EXISTE" | "A_TI_MISMO" | "ES_ADMIN" };

const rolesValidos = (roles: string[]) =>
  [...new Set(roles)].filter((r): r is (typeof ROLES_INVITABLES)[number] =>
    (ROLES_INVITABLES as readonly string[]).includes(r),
  );

/** Invita a alguien con los roles Operador o Revisor (al menos uno): invitación de 72 h. */
export function invitarMiembro(
  alm: Almacen,
  sesion: string | undefined,
  correo: string,
  roles: string[],
  ahora = Date.now(),
): ResultadoEquipo {
  const r = autorizado(alm, sesion, "equipo.gestionar");
  if ("error" in r) return { estado: r.error! };
  const validos = rolesValidos(roles);
  if (!validos.length) return { estado: "SIN_ROLES" };
  const alcaldiaId = r.c.alcaldia.id;
  const limpio = correo.trim().toLowerCase();
  // Una cuenta por persona en esta alcaldía (su propia base de datos).
  if ([...alm.usuarios.values()].some((u) => u.correo === limpio))
    return { estado: "YA_ES_MIEMBRO" };

  const usuarioId = `u-${nuevoId().slice(0, 10)}`;
  alm.usuarios.set(usuarioId, {
    id: usuarioId,
    correo: limpio,
    hash: "",
    nombres: "",
    apellidos: "",
    activo: false,
    roles: validos,
    intentosFallidos: 0,
  });
  const token = emitirToken(alm, usuarioId, "INVITACION", HORAS_INVITACION, ahora);
  registrar(
    alm,
    {
      actorId: r.c.usuario.id,
      alcaldiaId,
      accion: "MIEMBRO_INVITADO",
      entidad: `usuario:${usuarioId}`,
      despues: { correo: limpio, roles: validos },
    },
    ahora,
  );
  return { estado: "OK", token };
}

function miembroEditable(alm: Almacen, sesion: string | undefined, usuarioId: string) {
  const r = autorizado(alm, sesion, "equipo.gestionar");
  if ("error" in r) return { estado: r.error! };
  const u = alm.usuarios.get(usuarioId);
  if (!u || u.rolPlataforma) return { estado: "NO_EXISTE" as const };
  if (u.id === r.c.usuario.id) return { estado: "A_TI_MISMO" as const };
  if (u.roles.includes("ADMIN")) return { estado: "ES_ADMIN" as const };
  return { estado: "OK" as const, c: r.c, u };
}

export function editarRoles(
  alm: Almacen,
  sesion: string | undefined,
  usuarioId: string,
  roles: string[],
  ahora = Date.now(),
): ResultadoEquipo {
  const e = miembroEditable(alm, sesion, usuarioId);
  if (e.estado !== "OK") return { estado: e.estado };
  const validos = rolesValidos(roles);
  if (!validos.length) return { estado: "SIN_ROLES" };
  const antes = [...e.u.roles];
  e.u.roles = validos;
  registrar(
    alm,
    {
      actorId: e.c.usuario.id,
      alcaldiaId: e.c.alcaldia.id,
      accion: "MIEMBRO_ROLES",
      entidad: `usuario:${usuarioId}`,
      antes: { roles: antes },
      despues: { roles: validos },
    },
    ahora,
  );
  return { estado: "OK" };
}

/** Activa o desactiva a alguien del equipo (desactivar cierra sus sesiones). */
export function cambiarActivoMiembro(
  alm: Almacen,
  sesion: string | undefined,
  usuarioId: string,
  activo: boolean,
  ahora = Date.now(),
): ResultadoEquipo {
  const e = miembroEditable(alm, sesion, usuarioId);
  if (e.estado !== "OK") return { estado: e.estado };
  // Una cuenta sin contraseña sigue invitada: activarla no la deja entrar.
  e.u.activo = activo && Boolean(e.u.hash);
  if (!activo) e.u.sesionesDesde = ahora;
  registrar(
    alm,
    {
      actorId: e.c.usuario.id,
      alcaldiaId: e.c.alcaldia.id,
      accion: activo ? "MIEMBRO_ACTIVADO" : "MIEMBRO_DESACTIVADO",
      entidad: `usuario:${usuarioId}`,
    },
    ahora,
  );
  return { estado: "OK" };
}

export function reenviarInvitacionMiembro(
  alm: Almacen,
  sesion: string | undefined,
  usuarioId: string,
  ahora = Date.now(),
): ResultadoEquipo {
  const e = miembroEditable(alm, sesion, usuarioId);
  if (e.estado !== "OK") return { estado: e.estado };
  if (e.u.hash) return { estado: "NO_EXISTE" };
  const token = emitirToken(alm, usuarioId, "INVITACION", HORAS_INVITACION, ahora);
  registrar(
    alm,
    {
      actorId: e.c.usuario.id,
      alcaldiaId: e.c.alcaldia.id,
      accion: "INVITACION_REENVIADA",
      entidad: `usuario:${usuarioId}`,
    },
    ahora,
  );
  return { estado: "OK", token };
}

/* ---------- Ciudadanos (2.11) ---------- */

/**
 * «V-12345678» → «V-12.***.678», como la API: la cédula completa solo se ve en el detalle.
 */
export const enmascarar = (documento?: string) => enmascararDocumento(documento);

export const ORDENES_CIUDADANOS = {
  recientes: "Más recientes",
  antiguos: "Más antiguos",
  nombre: "Por nombre",
} as const;

export type FiltrosCiudadanos = {
  tipo?: "NATURAL" | "ORGANIZACION";
  perfil?: "COMPLETO" | "INCOMPLETO";
  membresia?: "ACTIVA" | "SUSPENDIDA";
  /** Bajas pedidas (por atender) o ya anonimizadas. */
  baja?: "solicitada" | "anonimizada";
  q?: string;
  orden?: keyof typeof ORDENES_CIUDADANOS;
};

/** Lee los filtros de la URL; los usa también la exportación a CSV. */
export function filtrosCiudadanos(leer: (k: string) => string | undefined): FiltrosCiudadanos {
  const orden = leer("orden");
  return {
    tipo: (["NATURAL", "ORGANIZACION"] as const).find((t) => t === leer("tipo")),
    perfil: (["COMPLETO", "INCOMPLETO"] as const).find((p) => p === leer("perfil")),
    membresia: (["ACTIVA", "SUSPENDIDA"] as const).find((m) => m === leer("membresia")),
    baja: (["solicitada", "anonimizada"] as const).find((b) => b === leer("baja")),
    q: leer("q")?.trim().slice(0, 80) || undefined,
    // «Más recientes» es el orden de siempre: no hace falta en la URL.
    orden:
      orden && orden !== "recientes" && Object.hasOwn(ORDENES_CIUDADANOS, orden)
        ? (orden as keyof typeof ORDENES_CIUDADANOS)
        : undefined,
  };
}

export function ciudadanosDe(alm: Almacen, alcaldiaId: string, f: FiltrosCiudadanos = {}) {
  const q = f.q ? plano(f.q) : "";
  const digitos = q.replace(/\D/g, "");
  return [...alm.ciudadanos.values()]
    .filter(
      (c) =>
        c.alcaldiaId === alcaldiaId &&
        (!f.tipo || c.tipo === f.tipo) &&
        (!f.perfil || c.perfilCompleto === (f.perfil === "COMPLETO")) &&
        (!f.membresia || c.membresia.estado === f.membresia) &&
        (!f.baja ||
          (f.baja === "solicitada"
            ? !!c.bajaSolicitadaEl && !c.anonimizadoEl
            : !!c.anonimizadoEl)) &&
        (!q ||
          plano(`${c.nombre} ${c.correo}`).includes(q) ||
          (digitos.length >= 4 && (c.cedula ?? c.rif ?? "").replace(/\D/g, "").includes(digitos))),
    )
    .sort((a, b) =>
      f.orden === "nombre"
        ? a.nombre.localeCompare(b.nombre, "es")
        : f.orden === "antiguos"
          ? a.registradoEl.localeCompare(b.registradoEl)
          : b.registradoEl.localeCompare(a.registradoEl),
    );
}

export function ciudadanoDe(alm: Almacen, alcaldiaId: string, id: string) {
  const c = alm.ciudadanos.get(id);
  return c && c.alcaldiaId === alcaldiaId ? c : undefined;
}

/** Aportes del ciudadano en esta alcaldía (por su correo). */
export const aportesDe = (alm: Almacen, c: Ciudadano) =>
  [...alm.participaciones.values()]
    .filter((p) => p.alcaldiaId === c.alcaldiaId && p.autor.correo === c.correo)
    .sort((a, b) => b.recibidaEl.localeCompare(a.recibidaEl));

export const MOTIVO_MIN = 10;

export function cambiarMembresia(
  alm: Almacen,
  sesion: string | undefined,
  id: string,
  estado: "ACTIVA" | "SUSPENDIDA",
  motivo?: string,
  ahora = Date.now(),
): { estado: "OK" | Error | "NO_EXISTE" | "SIN_MOTIVO" | "ANONIMIZADA" } {
  const r = autorizado(alm, sesion, "ciudadanos.suspender");
  if ("error" in r) return { estado: r.error! };
  const c = ciudadanoDe(alm, r.c.alcaldia.id, id);
  if (!c) return { estado: "NO_EXISTE" };
  if (c.anonimizadoEl) return { estado: "ANONIMIZADA" };
  const texto = motivo?.trim() ?? "";
  // Como la API: el motivo es obligatorio al suspender; al reactivar, opcional.
  if (estado === "SUSPENDIDA" ? texto.length < MOTIVO_MIN : texto && texto.length < MOTIVO_MIN)
    return { estado: "SIN_MOTIVO" };
  const antes = { ...c.membresia };
  c.membresia = {
    estado,
    desde: new Date(ahora).toISOString(),
    ...(texto ? { motivo: texto.slice(0, 500) } : {}),
  };
  registrar(
    alm,
    {
      actorId: r.c.usuario.id,
      alcaldiaId: c.alcaldiaId,
      accion: estado === "SUSPENDIDA" ? "MEMBRESIA_SUSPENDIDA" : "MEMBRESIA_REACTIVADA",
      entidad: `ciudadano:${c.id}`,
      antes,
      despues: c.membresia,
    },
    ahora,
  );
  return { estado: "OK" };
}

/**
 * Atiende la baja que pidió el ciudadano: borra sus datos personales y sus documentos. Sus
 * aportes se conservan con su folio. Solo si la pidió, como en la API.
 */
export function anonimizarCiudadano(
  alm: Almacen,
  sesion: string | undefined,
  id: string,
  ahora = Date.now(),
): { estado: "OK" | Error | "NO_EXISTE" | "SIN_BAJA" | "ANONIMIZADA" } {
  const r = autorizado(alm, sesion, "ciudadanos.suspender");
  if ("error" in r) return { estado: r.error! };
  const c = ciudadanoDe(alm, r.c.alcaldia.id, id);
  if (!c) return { estado: "NO_EXISTE" };
  if (c.anonimizadoEl) return { estado: "ANONIMIZADA" };
  if (!c.bajaSolicitadaEl) return { estado: "SIN_BAJA" };
  Object.assign(c, {
    nombre: "Cuenta anonimizada",
    correo: "",
    cedula: undefined,
    rif: undefined,
    telefono: undefined,
    ocupacion: undefined,
    representante: undefined,
    documentos: [],
    anonimizadoEl: new Date(ahora).toISOString(),
  });
  registrar(
    alm,
    {
      actorId: r.c.usuario.id,
      alcaldiaId: c.alcaldiaId,
      accion: "CUENTA_ANONIMIZADA",
      entidad: `ciudadano:${c.id}`,
    },
    ahora,
  );
  return { estado: "OK" };
}

export function csvCiudadanos(lista: Ciudadano[]) {
  return csv([
    ["Nombre", "Tipo", "Documento", "Correo", "Teléfono", "Perfil", "Cuenta", "Registrado"],
    ...lista.map((c) => [
      c.nombre,
      c.tipo === "NATURAL" ? "Persona natural" : "Organización",
      enmascarar(c.cedula ?? c.rif),
      c.correo,
      c.telefono ?? "",
      c.perfilCompleto ? "Completo" : "Incompleto",
      c.membresia.estado === "ACTIVA" ? "Activa" : "Suspendida",
      c.registradoEl.slice(0, 10),
    ]),
  ]);
}

/* ---------- Catálogos (2.12) ---------- */

/** Catálogos fijos por despliegue (seed de la base de datos): el panel solo los lee. */
export const catalogosDe = (alm: Almacen, alcaldiaId: string) => alm.catalogos.get(alcaldiaId);

/** Cuántos registros vivos usan cada valor, como `usos` de la API (guía R16 §2). */
function usosDe(alm: Almacen, alcaldiaId: string, tipo: TipoCatalogo): Map<string, number> {
  const m = new Map<string, number>();
  const sumar = (v?: string) => v && m.set(v, (m.get(v) ?? 0) + 1);
  const deAlc = <T extends { alcaldiaId: string }>(x: Iterable<T>) =>
    [...x].filter((y) => y.alcaldiaId === alcaldiaId);
  switch (tipo) {
    case "parroquias":
      for (const p of deAlc(alm.participaciones.values())) sumar(p.parroquia);
      break;
    case "categoriasTecnicas":
      for (const p of deAlc(alm.participaciones.values())) sumar(p.categoriaTecnica);
      break;
    case "categoriasNoticias":
      for (const n of deAlc(alm.noticias.values())) if (!n.eliminadaEl) sumar(n.categoria);
      break;
    case "categoriasDocumentos":
      for (const d of deAlc(alm.documentos.values())) if (!d.eliminadoEl) sumar(d.categoria);
      break;
    case "ocupaciones":
      for (const c of deAlc(alm.ciudadanos.values())) if (!c.anonimizadoEl) sumar(c.ocupacion);
      break;
    case "tiposOrganizacion":
      for (const c of deAlc(alm.ciudadanos.values())) sumar(c.tipoEntidad);
      break;
  }
  return m;
}

/** Los catálogos con los usos de cada valor (lo que muestra Configuración en la simulación). */
export function catalogosConUsos(alm: Almacen, alcaldiaId: string) {
  const cat = alm.catalogos.get(alcaldiaId);
  if (!cat) return cat;
  return Object.fromEntries(
    (Object.keys(cat) as TipoCatalogo[]).map((tipo) => {
      const usos = usosDe(alm, alcaldiaId, tipo);
      return [tipo, cat[tipo].map((i) => ({ ...i, usos: usos.get(i.nombre) ?? 0 }))];
    }),
  ) as typeof cat;
}

/*
 * Edición de los desplegables del portal (R16): solo el Administrador (catalogos.editar). Los
 * valores no se borran: se desactivan, así lo ya guardado conserva su valor y los formularios
 * nuevos ofrecen solo los activos. El orden de la lista es el orden en que se ofrecen.
 */

export type ResultadoCatalogo = {
  estado: "OK" | Error | "VACIO" | "REPETIDO" | "NO_EXISTE" | "ORDEN_INVALIDO";
  /** Con REPETIDO: el valor que ya existe (si está inactivo, se puede activar). */
  existente?: { id: string; nombre: string; activo: boolean };
};

/** Largo máximo de un valor de catálogo. */
export const NOMBRE_CATALOGO_MAX = 80;

function itemsDe(alm: Almacen, alcaldiaId: string, tipo: TipoCatalogo) {
  let cat = alm.catalogos.get(alcaldiaId);
  if (!cat) {
    cat = {
      parroquias: [],
      categoriasTecnicas: [],
      categoriasNoticias: [],
      categoriasDocumentos: [],
      ocupaciones: [],
      tiposOrganizacion: [],
    };
    alm.catalogos.set(alcaldiaId, cat);
  }
  return cat[tipo];
}

/** Crea (sin id, al final) o renombra un valor. No se repiten nombres, sin importar tildes. */
export function guardarItem(
  alm: Almacen,
  sesion: string | undefined,
  tipo: TipoCatalogo,
  nombre: string,
  id?: string,
  ahora = Date.now(),
): ResultadoCatalogo {
  const r = autorizado(alm, sesion, "catalogos.editar");
  if ("error" in r) return { estado: r.error! };
  const limpio = nombre.trim().replace(/\s+/g, " ").slice(0, NOMBRE_CATALOGO_MAX);
  if (!limpio) return { estado: "VACIO" };
  const items = itemsDe(alm, r.c.alcaldia.id, tipo);
  const repetido = items.find((i) => i.id !== id && plano(i.nombre) === plano(limpio));
  if (repetido)
    return {
      estado: "REPETIDO",
      existente: { id: repetido.id, nombre: repetido.nombre, activo: repetido.activo },
    };
  let antes: string | undefined;
  if (id) {
    const item = items.find((i) => i.id === id);
    if (!item) return { estado: "NO_EXISTE" };
    antes = item.nombre;
    item.nombre = limpio;
  } else {
    items.push({ id: `${tipo}-${nuevoId().slice(0, 8)}`, nombre: limpio, activo: true });
  }
  registrar(
    alm,
    {
      actorId: r.c.usuario.id,
      alcaldiaId: r.c.alcaldia.id,
      accion: id ? "CATALOGO_EDITADO" : "CATALOGO_CREADO",
      entidad: `catalogo:${tipo}`,
      antes: antes ? { nombre: antes } : undefined,
      despues: { nombre: limpio },
    },
    ahora,
  );
  return { estado: "OK" };
}

/** Activa o desactiva un valor: desactivado, el portal deja de ofrecerlo. */
export function cambiarActivoItem(
  alm: Almacen,
  sesion: string | undefined,
  tipo: TipoCatalogo,
  id: string,
  activo: boolean,
  ahora = Date.now(),
): ResultadoCatalogo {
  const r = autorizado(alm, sesion, "catalogos.editar");
  if ("error" in r) return { estado: r.error! };
  const item = itemsDe(alm, r.c.alcaldia.id, tipo).find((i) => i.id === id);
  if (!item) return { estado: "NO_EXISTE" };
  item.activo = activo;
  registrar(
    alm,
    {
      actorId: r.c.usuario.id,
      alcaldiaId: r.c.alcaldia.id,
      accion: activo ? "CATALOGO_ACTIVADO" : "CATALOGO_DESACTIVADO",
      entidad: `catalogo:${tipo}`,
      despues: { nombre: item.nombre },
    },
    ahora,
  );
  return { estado: "OK" };
}

/** Sube (-1) o baja (+1) un valor en la lista. */
export function moverItem(
  alm: Almacen,
  sesion: string | undefined,
  tipo: TipoCatalogo,
  id: string,
  direccion: -1 | 1,
  ahora = Date.now(),
): ResultadoCatalogo {
  const r = autorizado(alm, sesion, "catalogos.editar");
  if ("error" in r) return { estado: r.error! };
  const items = itemsDe(alm, r.c.alcaldia.id, tipo);
  const i = items.findIndex((x) => x.id === id);
  const j = i + direccion;
  if (i < 0 || j < 0 || j >= items.length) return { estado: "NO_EXISTE" };
  [items[i], items[j]] = [items[j]!, items[i]!];
  registrar(
    alm,
    {
      actorId: r.c.usuario.id,
      alcaldiaId: r.c.alcaldia.id,
      accion: "CATALOGO_REORDENADO",
      entidad: `catalogo:${tipo}`,
      despues: { orden: items.map((x) => x.nombre) },
    },
    ahora,
  );
  return { estado: "OK" };
}

/* ---------- Proceso: fases y fase actual (2.12) ---------- */

export const procesoDe = (alm: Almacen, alcaldiaId: string) => alm.procesos.get(alcaldiaId);

export type ResultadoProceso = {
  estado: "OK" | Error | "NO_EXISTE" | "VACIO" | "FECHAS" | "LIMITE" | "FASE_ACTUAL";
};

const fechaValida = (v?: string) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v);

function procesoEditable(alm: Almacen, sesion: string | undefined) {
  const r = autorizado(alm, sesion, "proceso.editar");
  if ("error" in r) return { error: r.error! };
  let p = alm.procesos.get(r.c.alcaldia.id);
  if (!p) {
    p = { fases: [], actual: 0 };
    alm.procesos.set(r.c.alcaldia.id, p);
  }
  return { c: r.c, p };
}

export function guardarFase(
  alm: Almacen,
  sesion: string | undefined,
  datos: Omit<FaseProceso, "id"> & { id?: string },
  ahora = Date.now(),
): ResultadoProceso {
  const e = procesoEditable(alm, sesion);
  if ("error" in e) return { estado: e.error! };
  const nombre = datos.nombre.trim().slice(0, 80);
  if (!nombre) return { estado: "VACIO" };
  const inicio = datos.inicio || undefined;
  const fin = datos.fin || undefined;
  if (!fechaValida(inicio) || !fechaValida(fin) || (inicio && fin && fin < inicio))
    return { estado: "FECHAS" };
  const limpio = {
    nombre,
    descripcion: datos.descripcion.trim().slice(0, 240),
    inicio,
    fin,
    estadoSiguiente: ESTADOS_SIGUIENTE.find((s) => s === datos.estadoSiguiente) ?? "PENDIENTE",
  };
  if (datos.id) {
    const f = e.p.fases.find((x) => x.id === datos.id);
    if (!f) return { estado: "NO_EXISTE" };
    Object.assign(f, limpio);
  } else {
    if (e.p.fases.length >= 12) return { estado: "LIMITE" };
    e.p.fases.push({ id: `fase-${nuevoId().slice(0, 8)}`, ...limpio });
  }
  registrar(
    alm,
    {
      actorId: e.c.usuario.id,
      alcaldiaId: e.c.alcaldia.id,
      accion: datos.id ? "FASE_EDITADA" : "FASE_CREADA",
      entidad: "proceso",
      despues: limpio,
    },
    ahora,
  );
  return { estado: "OK" };
}

export function moverFase(
  alm: Almacen,
  sesion: string | undefined,
  id: string,
  direccion: -1 | 1,
  ahora = Date.now(),
): ResultadoProceso {
  const e = procesoEditable(alm, sesion);
  if ("error" in e) return { estado: e.error! };
  const i = e.p.fases.findIndex((f) => f.id === id);
  const j = i + direccion;
  if (i < 0 || j < 0 || j >= e.p.fases.length) return { estado: "NO_EXISTE" };
  const actualId = e.p.fases[e.p.actual]?.id;
  [e.p.fases[i], e.p.fases[j]] = [e.p.fases[j]!, e.p.fases[i]!];
  // La fase en curso sigue siendo la misma aunque cambie de lugar.
  e.p.actual = Math.max(
    0,
    e.p.fases.findIndex((f) => f.id === actualId),
  );
  registrar(
    alm,
    {
      actorId: e.c.usuario.id,
      alcaldiaId: e.c.alcaldia.id,
      accion: "FASES_ORDENADAS",
      entidad: "proceso",
      despues: { orden: e.p.fases.map((f) => f.nombre) },
    },
    ahora,
  );
  return { estado: "OK" };
}

/** Elimina una fase. La actual no se borra (como la API: FASE_ACTUAL). */
export function eliminarFase(
  alm: Almacen,
  sesion: string | undefined,
  id: string,
  ahora = Date.now(),
): ResultadoProceso {
  const e = procesoEditable(alm, sesion);
  if ("error" in e) return { estado: e.error! };
  const i = e.p.fases.findIndex((f) => f.id === id);
  if (i < 0) return { estado: "NO_EXISTE" };
  if (i === e.p.actual) return { estado: "FASE_ACTUAL" };
  const [f] = e.p.fases.splice(i, 1);
  // La fase en curso sigue siendo la misma aunque se corra de lugar.
  if (i < e.p.actual) e.p.actual -= 1;
  registrar(
    alm,
    {
      actorId: e.c.usuario.id,
      alcaldiaId: e.c.alcaldia.id,
      accion: "FASE_ELIMINADA",
      entidad: "proceso",
      antes: { fase: f!.nombre },
    },
    ahora,
  );
  return { estado: "OK" };
}

export function fijarFaseActual(
  alm: Almacen,
  sesion: string | undefined,
  id: string,
  ahora = Date.now(),
): ResultadoProceso {
  const e = procesoEditable(alm, sesion);
  if ("error" in e) return { estado: e.error! };
  const i = e.p.fases.findIndex((f) => f.id === id);
  if (i < 0) return { estado: "NO_EXISTE" };
  const antes = e.p.fases[e.p.actual]?.nombre;
  e.p.actual = i;
  registrar(
    alm,
    {
      actorId: e.c.usuario.id,
      alcaldiaId: e.c.alcaldia.id,
      accion: "FASE_ACTUAL",
      entidad: "proceso",
      antes: { fase: antes },
      despues: { fase: e.p.fases[i]!.nombre },
    },
    ahora,
  );
  return { estado: "OK" };
}

/* ---------- Bitácora (2.13) ---------- */

export type FiltrosBitacora = {
  actor?: string;
  accion?: string;
  entidad?: string;
  desde?: string;
  hasta?: string;
};

/** Lee los filtros de la URL (página y exportación a CSV). */
export function filtrosBitacora(leer: (k: string) => string | undefined): FiltrosBitacora {
  const dia = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  return {
    actor: leer("actor")?.slice(0, 60) || undefined,
    accion: leer("accion")?.slice(0, 60) || undefined,
    entidad: leer("entidad")?.trim().slice(0, 80) || undefined,
    desde: dia(leer("desde")),
    hasta: dia(leer("hasta")),
  };
}

/** Eventos de una alcaldía, del más reciente al más antiguo. Fechas AAAA-MM-DD en hora de Venezuela. */
export function eventosDe(alm: Almacen, alcaldiaId: string, f: FiltrosBitacora = {}) {
  const diaVe = (iso: string) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas" }).format(new Date(iso));
  const entidad = f.entidad ? plano(f.entidad) : "";
  return alm.bitacora
    .filter(
      (e) =>
        e.alcaldiaId === alcaldiaId &&
        (!f.actor || e.actorId === f.actor) &&
        (!f.accion || e.accion === f.accion) &&
        (!entidad || plano(e.entidad).includes(entidad)) &&
        (!f.desde || diaVe(e.fecha) >= f.desde) &&
        (!f.hasta || diaVe(e.fecha) <= f.hasta),
    )
    .reverse();
}

/** Nombres legibles (con tildes) de las acciones; las demás se derivan del código. */
const NOMBRE_ACCION: Record<string, string> = {
  ALCALDIA_CREADA: "Alcaldía creada",
  ALCALDIA_SUSPENDIDA: "Alcaldía suspendida",
  ALCALDIA_REACTIVADA: "Alcaldía reactivada",
  CAMBIO_CONTRASENA: "Cambio de contraseña",
  CATALOGO_ACTIVADO: "Valor de catálogo activado",
  CATALOGO_CREADO: "Valor de catálogo creado",
  CATALOGO_DESACTIVADO: "Valor de catálogo desactivado",
  CATALOGO_EDITADO: "Valor de catálogo renombrado",
  CATALOGO_REORDENADO: "Catálogo reordenado",
  CERRAR_TODAS_SESIONES: "Cierre de todas las sesiones",
  DOCUMENTO_NUEVA_VERSION: "Nueva versión de documento",
  FASE_ACTUAL: "Fase actual cambiada",
  FASE_ELIMINADA: "Fase eliminada",
  INICIO_SESION: "Inicio de sesión",
  INVITACION_ACEPTADA: "Invitación aceptada",
  INVITACION_REENVIADA: "Invitación reenviada",
  CUENTA_ANONIMIZADA: "Cuenta anonimizada",
  MEMBRESIA_REACTIVADA: "Membresía reactivada",
  MEMBRESIA_SUSPENDIDA: "Membresía suspendida",
  MIEMBRO_ROLES: "Roles del miembro cambiados",
  NOTICIA_PUBLICADA: "Noticia publicada",
  OPERAR_EN_ALCALDIA: "Entró a operar la alcaldía",
  PARTICIPACION_EN_REVISION: "Aporte pasado a revisión",
  PARTICIPACION_APROBADA: "Aporte verificado",
  PARTICIPACION_RECHAZADA: "Aporte rechazado",
  PARTICIPACION_PUBLICADA: "Aporte publicado",
  RESTABLECER_CONTRASENA: "Contraseña restablecida",
  TEXTO_LEGAL_PUBLICADO: "Nueva versión de texto legal publicada",
};

/** «MIEMBRO_INVITADO» → «Miembro invitado». */
export const nombreAccion = (accion: string) => {
  if (NOMBRE_ACCION[accion]) return NOMBRE_ACCION[accion];
  const t = accion.toLowerCase().replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Campos que cambiaron entre antes y después (para la vista de diferencias). */
export function diferencias(e: Pick<EventoBitacora, "antes" | "despues">) {
  const a = (e.antes ?? {}) as Record<string, unknown>;
  const d = (e.despues ?? {}) as Record<string, unknown>;
  const claves = [...new Set([...Object.keys(a), ...Object.keys(d)])];
  return claves
    .map((k) => ({ campo: k, antes: a[k], despues: d[k] }))
    .filter((x) => JSON.stringify(x.antes) !== JSON.stringify(x.despues));
}

export function csvBitacora(alm: Almacen, eventos: EventoBitacora[]) {
  const actor = (id: string) => {
    const u = alm.usuarios.get(id);
    return u ? nombreCompleto(u) || u.correo : id;
  };
  return csv([
    ["Id", "Fecha", "Actor", "Acción", "Entidad", "Antes", "Después", "Hash"],
    ...eventos.map((e) => [
      String(e.id),
      e.fecha,
      actor(e.actorId),
      nombreAccion(e.accion),
      e.entidad,
      e.antes === undefined ? "" : JSON.stringify(e.antes),
      e.despues === undefined ? "" : JSON.stringify(e.despues),
      e.hash,
    ]),
  ]);
}
