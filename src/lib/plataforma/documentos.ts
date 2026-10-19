import { editor, medioPropio, sinTildes, slugDe } from "./contenido";
import { idSecuencial, registrar } from "./servicio";
import type { Almacen } from "./tipos";
import { siguienteVersion } from "@/lib/contenido/version";
import type { Adjunto, CamposDocumento, DocEstado, Documento } from "@/lib/contenido/tipos";

/*
 * Repositorio de documentos (backlog 1.15 y 2.9): PDF con categoría, estado (borrador de
 * trabajo u oficial), visibilidad en el portal y versiones con su historial.
 */

export const VISIBILIDADES = ["publico", "oculto"] as const;
export type Visibilidad = (typeof VISIBILIDADES)[number];

export type FiltrosDocumentos = {
  q?: string;
  categoria?: string;
  estado?: DocEstado;
  visibilidad?: Visibilidad;
  /** AAAA-MM-DD sobre la última actualización, ambos incluidos. */
  desde?: string;
  hasta?: string;
};

const activosDe = (alm: Almacen, alcaldiaId: string) =>
  [...alm.documentos.values()].filter((d) => d.alcaldiaId === alcaldiaId && !d.eliminadoEl);

export type ResultadoDocumentos =
  | { estado: "OK"; items: Documento[]; conteos: Record<DocEstado, number>; total: number }
  | { estado: "SIN_SESION" | "SIN_PERMISO" };

export function listarDocumentos(
  alm: Almacen,
  sesion: string | undefined,
  f: FiltrosDocumentos = {},
): ResultadoDocumentos {
  const c = editor(alm, sesion);
  if (c.estado !== "OK") return c;
  const todos = activosDe(alm, c.alcaldia.id);
  const q = f.q ? sinTildes(f.q).toLowerCase().trim() : "";
  const desde = f.desde ? Date.parse(`${f.desde}T00:00:00-04:00`) : undefined;
  const hasta = f.hasta ? Date.parse(`${f.hasta}T23:59:59.999-04:00`) : undefined;
  const sinEstado = todos.filter((d) => {
    const fecha = Date.parse(d.actualizadoEl);
    return (
      (!f.categoria || d.categoria === f.categoria) &&
      (!f.visibilidad || d.publico === (f.visibilidad === "publico")) &&
      (!q || sinTildes(`${d.titulo} ${d.descripcion}`).toLowerCase().includes(q)) &&
      (desde === undefined || fecha >= desde) &&
      (hasta === undefined || fecha <= hasta)
    );
  });
  const conteos = { BORRADOR: 0, OFICIAL: 0 };
  for (const d of sinEstado) conteos[d.estado]++;
  const items = sinEstado
    .filter((d) => !f.estado || d.estado === f.estado)
    .sort((a, b) => Date.parse(b.actualizadoEl) - Date.parse(a.actualizadoEl));
  return { estado: "OK", items, conteos, total: todos.length };
}

export type ResultadoDocumento =
  { estado: "OK"; documento: Documento } | { estado: "SIN_SESION" | "SIN_PERMISO" | "NO_EXISTE" };

export function obtenerDocumento(
  alm: Almacen,
  sesion: string | undefined,
  id: string,
): ResultadoDocumento {
  const c = editor(alm, sesion);
  if (c.estado !== "OK") return c;
  const d = alm.documentos.get(id);
  if (!d || d.alcaldiaId !== c.alcaldia.id || d.eliminadoEl) return { estado: "NO_EXISTE" };
  return { estado: "OK", documento: d };
}

/** Un PDF del propio panel: subido por esta alcaldía o de los ejemplos. */
const pdfPropio = (alm: Almacen, alcaldiaId: string, a: Adjunto) =>
  a.tipo === "application/pdf" && medioPropio(alm, alcaldiaId, a.url);

function slugUnico(alm: Almacen, alcaldiaId: string, titulo: string, propioId: string) {
  const base = slugDe(titulo);
  const usados = new Set(
    activosDe(alm, alcaldiaId)
      .filter((d) => d.id !== propioId)
      .map((d) => d.slug),
  );
  let slug = base;
  for (let i = 2; usados.has(slug); i++) slug = `${base}-${i}`;
  return slug;
}

const limpiar = (c: CamposDocumento): CamposDocumento => ({
  ...c,
  titulo: c.titulo.trim(),
  descripcion: c.descripcion.trim(),
});

export type ResultadoGuardarDocumento =
  | { estado: "OK"; documento: Documento }
  | { estado: "SIN_SESION" | "SIN_PERMISO" | "NO_EXISTE" | "MEDIO_AJENO" };

export function crearDocumento(
  alm: Almacen,
  sesion: string | undefined,
  campos: CamposDocumento,
  archivo: Adjunto,
  ahora = Date.now(),
): ResultadoGuardarDocumento {
  const c = editor(alm, sesion);
  if (c.estado !== "OK") return c;
  const a = c.alcaldia.id;
  if (!pdfPropio(alm, a, archivo)) return { estado: "MEDIO_AJENO" };
  const fecha = new Date(ahora).toISOString();
  const id = idSecuencial(alm.documentos.keys(), "d");
  const d: Documento = {
    ...limpiar(campos),
    id,
    alcaldiaId: a,
    slug: slugUnico(alm, a, campos.titulo, id),
    version: "1.0",
    archivo,
    versiones: [{ version: "1.0", fecha, nota: "Primera versión.", archivo }],
    publicadoEl: fecha,
    actualizadoEl: fecha,
  };
  alm.documentos.set(id, d);
  registrar(
    alm,
    {
      actorId: c.usuario.id,
      alcaldiaId: a,
      accion: "DOCUMENTO_CREADO",
      entidad: "documento",
      despues: { id, titulo: d.titulo, estado: d.estado, publico: d.publico, version: d.version },
    },
    ahora,
  );
  return { estado: "OK", documento: d };
}

/** Edita los datos (no el archivo: eso es una versión nueva). */
export function guardarDocumento(
  alm: Almacen,
  sesion: string | undefined,
  id: string,
  campos: CamposDocumento,
  ahora = Date.now(),
): ResultadoGuardarDocumento {
  const r = obtenerDocumento(alm, sesion, id);
  if (r.estado !== "OK") return r;
  const c = editor(alm, sesion) as Extract<ReturnType<typeof editor>, { estado: "OK" }>;
  const d = r.documento;
  const antes = { titulo: d.titulo, estado: d.estado, publico: d.publico, categoria: d.categoria };
  Object.assign(d, limpiar(campos), { actualizadoEl: new Date(ahora).toISOString() });
  registrar(
    alm,
    {
      actorId: c.usuario.id,
      alcaldiaId: d.alcaldiaId,
      // Oficializar queda a la vista en la bitácora.
      accion:
        antes.estado !== d.estado && d.estado === "OFICIAL"
          ? "DOCUMENTO_OFICIALIZADO"
          : "DOCUMENTO_EDITADO",
      entidad: "documento",
      antes: { id, ...antes },
      despues: {
        id,
        titulo: d.titulo,
        estado: d.estado,
        publico: d.publico,
        categoria: d.categoria,
      },
    },
    ahora,
  );
  return { estado: "OK", documento: d };
}

export function nuevaVersion(
  alm: Almacen,
  sesion: string | undefined,
  id: string,
  archivo: Adjunto,
  nota: string,
  tipo: "menor" | "mayor",
  ahora = Date.now(),
): ResultadoGuardarDocumento {
  const r = obtenerDocumento(alm, sesion, id);
  if (r.estado !== "OK") return r;
  const c = editor(alm, sesion) as Extract<ReturnType<typeof editor>, { estado: "OK" }>;
  const d = r.documento;
  if (!pdfPropio(alm, d.alcaldiaId, archivo)) return { estado: "MEDIO_AJENO" };
  const fecha = new Date(ahora).toISOString();
  const anterior = d.version;
  d.version = siguienteVersion(anterior, tipo);
  d.archivo = archivo;
  d.versiones = [{ version: d.version, fecha, nota: nota.trim(), archivo }, ...d.versiones];
  d.actualizadoEl = fecha;
  registrar(
    alm,
    {
      actorId: c.usuario.id,
      alcaldiaId: d.alcaldiaId,
      accion: "DOCUMENTO_NUEVA_VERSION",
      entidad: "documento",
      antes: { id, version: anterior },
      despues: { id, version: d.version, nota: nota.trim() },
    },
    ahora,
  );
  return { estado: "OK", documento: d };
}

export function eliminarDocumento(
  alm: Almacen,
  sesion: string | undefined,
  id: string,
  ahora = Date.now(),
): { estado: "OK" } | { estado: "SIN_SESION" | "SIN_PERMISO" | "NO_EXISTE" } {
  const r = obtenerDocumento(alm, sesion, id);
  if (r.estado !== "OK") return r;
  const c = editor(alm, sesion) as Extract<ReturnType<typeof editor>, { estado: "OK" }>;
  r.documento.eliminadoEl = new Date(ahora).toISOString();
  registrar(
    alm,
    {
      actorId: c.usuario.id,
      alcaldiaId: r.documento.alcaldiaId,
      accion: "DOCUMENTO_ELIMINADO",
      entidad: "documento",
      antes: { id, titulo: r.documento.titulo, version: r.documento.version },
    },
    ahora,
  );
  return { estado: "OK" };
}
