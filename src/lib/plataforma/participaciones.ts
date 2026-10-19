import { contextoDe, registrar } from "./servicio";
import {
  ESTADOS_PARTICIPACION,
  MOTIVOS_RECHAZO,
  TIPOS_PARTICIPACION,
  type Almacen,
  type EstadoParticipacion,
  type MotivoRechazo,
  type Participacion,
  type ParticipacionDemo,
  type TipoParticipacion,
} from "./tipos";

/*
 * Bandeja del Revisor (backlog 2.10) sobre la API simulada. Lógica pura: se prueba con Vitest.
 * Máquina de estados de la Propuesta v3 (5.1): Pendiente → En revisión → Aprobada o Rechazada;
 * Aprobada → Publicada solo si el autor autorizó mostrar su nombre; Publicada → Aprobada al
 * despublicar.
 */

const DIA = 86_400_000;
export const TEXTO_RECHAZO_MIN = 20;

/** Días desde que la participación entró en su estado actual. */
export function diasEnEstado(p: Participacion, ahora = Date.now()) {
  const desde = Date.parse(p.historial.at(-1)?.fecha ?? p.recibidaEl);
  return Math.max(0, Math.floor((ahora - desde) / DIA));
}

const horaVe = new Intl.DateTimeFormat("es-VE", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Caracas",
});
const fechaVe = new Intl.DateTimeFormat("es-VE", {
  day: "numeric",
  month: "short",
  timeZone: "America/Caracas",
});
const diaVe = (t: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas" }).format(t);

/** «hoy 9:14», «ayer», «hace 3 días» o la fecha corta, en hora de Venezuela. */
export function cuandoRecibida(iso: string, ahora = Date.now()) {
  const t = Date.parse(iso);
  if (diaVe(t) === diaVe(ahora)) return `hoy ${horaVe.format(t)}`;
  if (diaVe(t) === diaVe(ahora - DIA)) return "ayer";
  const dias = Math.floor((ahora - t) / DIA);
  return dias < 7 ? `hace ${dias} días` : fechaVe.format(t);
}

export function fila(p: Participacion, ahora = Date.now()): ParticipacionDemo {
  return {
    folio: p.folio,
    tipo: TIPOS_PARTICIPACION[p.tipo],
    autor: p.autor.nombre,
    parroquia: p.parroquia,
    categoriaTecnica: p.categoriaTecnica,
    dias: diasEnEstado(p, ahora),
    recibida: cuandoRecibida(p.recibidaEl, ahora),
    estado: p.estado,
  };
}

export const deAlcaldia = (alm: Almacen, alcaldiaId: string) =>
  [...alm.participaciones.values()].filter((p) => p.alcaldiaId === alcaldiaId);

/** Conteos por estado (no depende de la hora: sirve en el marco del panel). */
export function conteosParticipaciones(alm: Almacen, alcaldiaId: string) {
  const todas = deAlcaldia(alm, alcaldiaId);
  return Object.fromEntries(
    ESTADOS_PARTICIPACION.map((e) => [e, todas.filter((p) => p.estado === e).length]),
  ) as Record<EstadoParticipacion, number>;
}

/** Conteos por estado y la cola por atender (pendientes y en revisión, la más antigua primero). */
export function resumenParticipaciones(alm: Almacen, alcaldiaId: string, ahora = Date.now()) {
  const todas = deAlcaldia(alm, alcaldiaId);
  const conteos = Object.fromEntries(
    ESTADOS_PARTICIPACION.map((e) => [e, todas.filter((p) => p.estado === e).length]),
  ) as Record<EstadoParticipacion, number>;
  const cola = todas
    .filter((p) => p.estado === "PENDIENTE" || p.estado === "EN_REVISION")
    .sort((a, b) => a.recibidaEl.localeCompare(b.recibidaEl))
    .map((p) => fila(p, ahora));
  return { conteos, cola };
}

const plano = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export type FiltrosBandeja = {
  estado?: EstadoParticipacion;
  tipo?: TipoParticipacion;
  parroquia?: string;
  categoria?: string;
  /** Folio, autor o cédula. */
  q?: string;
};

/** La bandeja: por atender primero (de la más antigua), luego el resto (de la más reciente). */
export function bandeja(alm: Almacen, alcaldiaId: string, f: FiltrosBandeja = {}) {
  const q = f.q ? plano(f.q.trim()) : "";
  const digitos = q.replace(/\D/g, "");
  const atender = (p: Participacion) => p.estado === "PENDIENTE" || p.estado === "EN_REVISION";
  return deAlcaldia(alm, alcaldiaId)
    .filter(
      (p) =>
        (!f.estado || p.estado === f.estado) &&
        (!f.tipo || p.tipo === f.tipo) &&
        (!f.parroquia || p.parroquia === f.parroquia) &&
        (!f.categoria || p.categoriaTecnica === f.categoria) &&
        (!q ||
          plano(`${p.folio} ${p.autor.nombre}`).includes(q) ||
          (digitos.length >= 4 &&
            (p.autor.cedula ?? p.autor.rif ?? "").replace(/\D/g, "").includes(digitos))),
    )
    .sort((a, b) =>
      atender(a) !== atender(b)
        ? Number(atender(b)) - Number(atender(a))
        : atender(a)
          ? a.recibidaEl.localeCompare(b.recibidaEl)
          : b.recibidaEl.localeCompare(a.recibidaEl),
    );
}

/** Transiciones que el Revisor puede ejecutar desde el estado actual. */
export function transicionesValidas(p: Participacion): EstadoParticipacion[] {
  switch (p.estado) {
    case "PENDIENTE":
      return ["EN_REVISION"];
    case "EN_REVISION":
      return ["APROBADA", "RECHAZADA"];
    case "APROBADA":
      return ["PUBLICADA"];
    case "PUBLICADA":
      return ["APROBADA"];
    default:
      return [];
  }
}

export type ResultadoRevisor =
  | "OK"
  | "SIN_SESION"
  | "SIN_PERMISO"
  | "NO_EXISTE"
  | "TRANSICION_INVALIDA"
  | "SIN_MOTIVO"
  | "TEXTO_CORTO"
  | "SIN_AUTORIZACION_NOMBRE"
  | "NOTA_VACIA";

type Evaluable =
  | { error: "SIN_SESION" | "SIN_PERMISO" | "NO_EXISTE" }
  | { c: NonNullable<ReturnType<typeof contextoDe>>; p: Participacion };

/** Sesión con permiso de evaluar y la participación de su alcaldía en uso. */
function evaluable(alm: Almacen, sesion: string | undefined, folio: string): Evaluable {
  const c = contextoDe(alm, sesion);
  if (!c) return { error: "SIN_SESION" as const };
  if (!c.alcaldia || !c.permisos.has("participaciones.evaluar"))
    return { error: "SIN_PERMISO" as const };
  const p = alm.participaciones.get(folio);
  if (!p || p.alcaldiaId !== c.alcaldia.id) return { error: "NO_EXISTE" as const };
  return { c, p };
}

export function participacionDe(alm: Almacen, alcaldiaId: string, folio: string) {
  const p = alm.participaciones.get(folio.toUpperCase());
  return p && p.alcaldiaId === alcaldiaId ? p : undefined;
}

export function cambiarEstado(
  alm: Almacen,
  sesion: string | undefined,
  folio: string,
  destino: EstadoParticipacion,
  datos: { motivo?: string; texto?: string; comentario?: string } = {},
  ahora = Date.now(),
): ResultadoRevisor {
  const r = evaluable(alm, sesion, folio);
  if ("error" in r) return r.error;
  const { c, p } = r;
  if (!transicionesValidas(p).includes(destino)) return "TRANSICION_INVALIDA";

  let comentario = datos.comentario?.trim() || undefined;
  let motivo: MotivoRechazo | undefined;
  if (destino === "RECHAZADA") {
    if (!datos.motivo || !(datos.motivo in MOTIVOS_RECHAZO)) return "SIN_MOTIVO";
    const texto = datos.texto?.trim() ?? "";
    if (texto.length < TEXTO_RECHAZO_MIN) return "TEXTO_CORTO";
    motivo = datos.motivo as MotivoRechazo;
    comentario = texto;
  }
  if (destino === "PUBLICADA" && !p.mostrarNombre) return "SIN_AUTORIZACION_NOMBRE";

  const antes = p.estado;
  p.estado = destino;
  p.historial.push({
    estado: destino,
    fecha: new Date(ahora).toISOString(),
    por: c.usuario.id,
    comentario,
    motivo,
  });
  registrar(
    alm,
    {
      actorId: c.usuario.id,
      alcaldiaId: p.alcaldiaId,
      accion: `PARTICIPACION_${destino}`,
      entidad: `participacion:${p.folio}`,
      antes: { estado: antes },
      despues: { estado: destino, motivo },
    },
    ahora,
  );
  return "OK";
}

/** Cotejo de identidad al evaluar el aporte (el perfil se verifica solo al completarse). */
export function cotejarIdentidad(
  alm: Almacen,
  sesion: string | undefined,
  folio: string,
  resultado: "CONFIRMADA" | "NO_CONFIRMADA",
  nota?: string,
  ahora = Date.now(),
): ResultadoRevisor {
  const r = evaluable(alm, sesion, folio);
  if ("error" in r) return r.error;
  const { c, p } = r;
  p.identidad = {
    resultado,
    nota: nota?.trim() || undefined,
    por: c.usuario.id,
    fecha: new Date(ahora).toISOString(),
  };
  registrar(
    alm,
    {
      actorId: c.usuario.id,
      alcaldiaId: p.alcaldiaId,
      accion: resultado === "CONFIRMADA" ? "IDENTIDAD_CONFIRMADA" : "IDENTIDAD_NO_CONFIRMADA",
      entidad: `participacion:${p.folio}`,
    },
    ahora,
  );
  return "OK";
}

export function agregarNota(
  alm: Almacen,
  sesion: string | undefined,
  folio: string,
  texto: string,
  ahora = Date.now(),
): ResultadoRevisor {
  const r = evaluable(alm, sesion, folio);
  if ("error" in r) return r.error;
  const limpio = texto.trim().slice(0, 1000);
  if (!limpio) return "NOTA_VACIA";
  r.p.notas.push({
    id: `${r.p.folio}-n${r.p.notas.length + 1}`,
    por: r.c.usuario.id,
    texto: limpio,
    fecha: new Date(ahora).toISOString(),
  });
  registrar(
    alm,
    {
      actorId: r.c.usuario.id,
      alcaldiaId: r.p.alcaldiaId,
      accion: "NOTA_INTERNA",
      entidad: `participacion:${r.p.folio}`,
    },
    ahora,
  );
  return "OK";
}

const celda = (v: string) => `"${v.replace(/"/g, '""')}"`;

/** CSV de la bandeja con los filtros activos (separador «;» para Excel en español). */
export function csvBandeja(lista: Participacion[]) {
  const cabecera = [
    "Folio",
    "Tipo",
    "Estado",
    "Recibida",
    "Parroquia",
    "Sector",
    "Categoría técnica",
    "Autor",
    "Cédula o RIF",
    "Nombre público autorizado",
  ];
  const filas = lista.map((p) => [
    p.folio,
    TIPOS_PARTICIPACION[p.tipo],
    p.estado,
    p.recibidaEl,
    p.parroquia,
    p.sector,
    p.categoriaTecnica,
    p.autor.nombre,
    p.autor.cedula ?? p.autor.rif ?? "",
    p.mostrarNombre ? "Sí" : "No",
  ]);
  return `﻿${[cabecera, ...filas].map((f) => f.map(celda).join(";")).join("\r\n")}\r\n`;
}
