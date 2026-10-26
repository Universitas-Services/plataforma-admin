import { randomBytes } from "node:crypto";
import { contextoDe, registrar } from "./servicio";
import type { Almacen, DestinoMarco, ItemMarcoLegal } from "./tipos";

/*
 * Marco legal de Conoce el PDUL, administrable (anexo de la fase 7, 26-10-2026). Se pueden
 * crear todos los ítems que se quiera; solo los activos (10 como máximo) se muestran en el
 * portal, en el orden que fija el Operador. Cada ítem puede llevar un botón a una noticia
 * publicada o a un documento público. Lógica pura: se prueba con Vitest.
 */

export const MAX_ACTIVOS = 10;

export const TEXTO_BOTON_POR_DEFECTO: Record<DestinoMarco["tipo"], string> = {
  NOTICIA: "Leer la noticia",
  DOCUMENTO: "Ver el documento",
};

/** Lo que el panel puede elegir como destino del botón. */
export type DestinoElegible = DestinoMarco & { titulo: string; slug: string };

/** El destino existe y se ve en el portal: noticia PUBLICADO o documento público. */
export function destinoDisponible(alm: Almacen, d: DestinoMarco): DestinoElegible | undefined {
  if (d.tipo === "NOTICIA") {
    const n = alm.noticias.get(d.id);
    return n && !n.eliminadaEl && n.estado === "PUBLICADO"
      ? { ...d, titulo: n.titulo, slug: n.slug }
      : undefined;
  }
  const doc = alm.documentos.get(d.id);
  return doc && !doc.eliminadoEl && doc.publico
    ? { ...d, titulo: doc.titulo, slug: doc.slug }
    : undefined;
}

/** Título del destino aunque ya no esté publicado (para el aviso del panel). */
function tituloDestino(alm: Almacen, d: DestinoMarco) {
  return d.tipo === "NOTICIA" ? alm.noticias.get(d.id)?.titulo : alm.documentos.get(d.id)?.titulo;
}

const vivos = (alm: Almacen, alcaldiaId: string) =>
  [...alm.marcoLegal.values()].filter((i) => i.alcaldiaId === alcaldiaId && !i.eliminadoEl);

/** Activos en su orden, y después los inactivos del más reciente al más antiguo. */
export function ordenados(items: ItemMarcoLegal[]) {
  const activos = items.filter((i) => i.activo).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  const inactivos = items
    .filter((i) => !i.activo)
    .sort((a, b) => b.actualizadoEl.localeCompare(a.actualizadoEl));
  return [...activos, ...inactivos];
}

/** Vuelve a numerar los activos 0, 1, 2… en el orden actual. */
function renumerar(alm: Almacen, alcaldiaId: string) {
  ordenados(vivos(alm, alcaldiaId))
    .filter((i) => i.activo)
    .forEach((i, n) => (i.orden = n));
}

export type ItemVista = ItemMarcoLegal & {
  /** El destino del botón sigue publicado: el portal lo muestra. */
  botonDisponible: boolean;
  destinoTitulo?: string;
};

export type VistaMarco = {
  estado: "OK";
  items: ItemVista[];
  activos: number;
  noticias: DestinoElegible[];
  documentos: DestinoElegible[];
};

export function marcoLegalDe(
  alm: Almacen,
  sesion: string | undefined,
): VistaMarco | { estado: "SIN_SESION" | "SIN_PERMISO" } {
  const c = contextoDe(alm, sesion);
  if (!c) return { estado: "SIN_SESION" };
  if (!c.permisos.has("contenido.editar")) return { estado: "SIN_PERMISO" };
  const items = ordenados(vivos(alm, c.alcaldia.id)).map((i) => ({
    ...i,
    botonDisponible: !!i.boton && !!destinoDisponible(alm, i.boton.destino),
    destinoTitulo: i.boton && tituloDestino(alm, i.boton.destino),
  }));
  const deAlcaldia = <T extends { alcaldiaId: string }>(x: T) => x.alcaldiaId === c.alcaldia.id;
  return {
    estado: "OK",
    items,
    activos: items.filter((i) => i.activo).length,
    noticias: [...alm.noticias.values()]
      .filter(deAlcaldia)
      .map((n) => destinoDisponible(alm, { tipo: "NOTICIA", id: n.id }))
      .filter((d) => !!d)
      .sort((a, b) => a.titulo.localeCompare(b.titulo, "es")),
    documentos: [...alm.documentos.values()]
      .filter(deAlcaldia)
      .map((d) => destinoDisponible(alm, { tipo: "DOCUMENTO", id: d.id }))
      .filter((d) => !!d)
      .sort((a, b) => a.titulo.localeCompare(b.titulo, "es")),
  };
}

export type DatosItem = {
  titulo: string;
  descripcion: string;
  activo: boolean;
  boton?: { texto: string; destino: DestinoMarco } | null;
};

export type ResultadoMarco =
  | { estado: "OK"; item: ItemMarcoLegal }
  | {
      estado:
        "SIN_SESION" | "SIN_PERMISO" | "NO_EXISTE" | "DEMASIADOS_ACTIVOS" | "DESTINO_NO_DISPONIBLE";
    };

const instantanea = (i: ItemMarcoLegal) => ({
  titulo: i.titulo,
  activo: i.activo,
  orden: i.orden,
  boton: i.boton && { texto: i.boton.texto, destino: i.boton.destino },
});

function validarBoton(alm: Almacen, boton: DatosItem["boton"]) {
  return !boton || !!destinoDisponible(alm, boton.destino);
}

/** POST /admin/legal-framework: si nace activo, queda al final de los activos. */
export function crearItemMarco(
  alm: Almacen,
  sesion: string | undefined,
  datos: DatosItem,
  ahora = Date.now(),
): ResultadoMarco {
  const c = contextoDe(alm, sesion);
  if (!c) return { estado: "SIN_SESION" };
  if (!c.permisos.has("contenido.editar")) return { estado: "SIN_PERMISO" };
  const activos = vivos(alm, c.alcaldia.id).filter((i) => i.activo);
  if (datos.activo && activos.length >= MAX_ACTIVOS) return { estado: "DEMASIADOS_ACTIVOS" };
  if (!validarBoton(alm, datos.boton)) return { estado: "DESTINO_NO_DISPONIBLE" };
  const fecha = new Date(ahora).toISOString();
  const item: ItemMarcoLegal = {
    id: `m-${randomBytes(6).toString("hex")}`,
    alcaldiaId: c.alcaldia.id,
    titulo: datos.titulo,
    descripcion: datos.descripcion,
    activo: datos.activo,
    orden: datos.activo ? activos.length : undefined,
    boton: datos.boton ?? undefined,
    creadoEl: fecha,
    actualizadoEl: fecha,
  };
  alm.marcoLegal.set(item.id, item);
  registrar(
    alm,
    {
      actorId: c.usuario.id,
      alcaldiaId: c.alcaldia.id,
      accion: "MARCO_LEGAL_CREADO",
      entidad: "marco_legal",
      despues: instantanea(item),
    },
    ahora,
  );
  return { estado: "OK", item };
}

/** PATCH /admin/legal-framework/:id: activar lo pone al final; desactivar lo saca del orden. */
export function guardarItemMarco(
  alm: Almacen,
  sesion: string | undefined,
  id: string,
  datos: DatosItem,
  ahora = Date.now(),
): ResultadoMarco {
  const c = contextoDe(alm, sesion);
  if (!c) return { estado: "SIN_SESION" };
  if (!c.permisos.has("contenido.editar")) return { estado: "SIN_PERMISO" };
  const item = alm.marcoLegal.get(id);
  if (!item || item.eliminadoEl || item.alcaldiaId !== c.alcaldia.id)
    return { estado: "NO_EXISTE" };
  const activos = vivos(alm, c.alcaldia.id).filter((i) => i.activo);
  if (datos.activo && !item.activo && activos.length >= MAX_ACTIVOS)
    return { estado: "DEMASIADOS_ACTIVOS" };
  // Un botón que ya existía puede quedarse aunque su destino se haya despublicado; uno nuevo o
  // cambiado tiene que apuntar a algo publicado.
  const mismoDestino =
    datos.boton &&
    item.boton &&
    datos.boton.destino.tipo === item.boton.destino.tipo &&
    datos.boton.destino.id === item.boton.destino.id;
  if (!mismoDestino && !validarBoton(alm, datos.boton)) return { estado: "DESTINO_NO_DISPONIBLE" };

  const antes = instantanea(item);
  const seActiva = datos.activo && !item.activo;
  item.titulo = datos.titulo;
  item.descripcion = datos.descripcion;
  item.boton = datos.boton ?? undefined;
  item.activo = datos.activo;
  item.orden = !datos.activo ? undefined : seActiva ? activos.length : item.orden;
  item.actualizadoEl = new Date(ahora).toISOString();
  renumerar(alm, c.alcaldia.id);
  registrar(
    alm,
    {
      actorId: c.usuario.id,
      alcaldiaId: c.alcaldia.id,
      accion:
        antes.activo === item.activo
          ? "MARCO_LEGAL_ACTUALIZADO"
          : item.activo
            ? "MARCO_LEGAL_ACTIVADO"
            : "MARCO_LEGAL_DESACTIVADO",
      entidad: "marco_legal",
      antes,
      despues: instantanea(item),
    },
    ahora,
  );
  return { estado: "OK", item };
}

/** PUT /admin/legal-framework/order: todos los activos en el orden nuevo. */
export function ordenarMarco(
  alm: Almacen,
  sesion: string | undefined,
  ids: string[],
  ahora = Date.now(),
): { estado: "OK" } | { estado: "SIN_SESION" | "SIN_PERMISO" | "ORDEN_INVALIDO" } {
  const c = contextoDe(alm, sesion);
  if (!c) return { estado: "SIN_SESION" };
  if (!c.permisos.has("contenido.editar")) return { estado: "SIN_PERMISO" };
  const activos = ordenados(vivos(alm, c.alcaldia.id)).filter((i) => i.activo);
  const actuales = new Set(activos.map((i) => i.id));
  if (ids.length !== actuales.size || new Set(ids).size !== ids.length)
    return { estado: "ORDEN_INVALIDO" };
  if (!ids.every((id) => actuales.has(id))) return { estado: "ORDEN_INVALIDO" };
  const antes = activos.map((i) => i.titulo);
  ids.forEach((id, n) => (alm.marcoLegal.get(id)!.orden = n));
  registrar(
    alm,
    {
      actorId: c.usuario.id,
      alcaldiaId: c.alcaldia.id,
      accion: "MARCO_LEGAL_REORDENADO",
      entidad: "marco_legal",
      antes,
      despues: ids.map((id) => alm.marcoLegal.get(id)!.titulo),
    },
    ahora,
  );
  return { estado: "OK" };
}

/** DELETE /admin/legal-framework/:id: borrado lógico; deja de contar para el máximo. */
export function eliminarItemMarco(
  alm: Almacen,
  sesion: string | undefined,
  id: string,
  ahora = Date.now(),
): { estado: "OK" } | { estado: "SIN_SESION" | "SIN_PERMISO" | "NO_EXISTE" } {
  const c = contextoDe(alm, sesion);
  if (!c) return { estado: "SIN_SESION" };
  if (!c.permisos.has("contenido.editar")) return { estado: "SIN_PERMISO" };
  const item = alm.marcoLegal.get(id);
  if (!item || item.eliminadoEl || item.alcaldiaId !== c.alcaldia.id)
    return { estado: "NO_EXISTE" };
  const antes = instantanea(item);
  item.eliminadoEl = new Date(ahora).toISOString();
  item.activo = false;
  item.orden = undefined;
  renumerar(alm, c.alcaldia.id);
  registrar(
    alm,
    {
      actorId: c.usuario.id,
      alcaldiaId: c.alcaldia.id,
      accion: "MARCO_LEGAL_ELIMINADO",
      entidad: "marco_legal",
      antes,
    },
    ahora,
  );
  return { estado: "OK" };
}

/**
 * Lo que el portal pinta (GET /portal/legal-framework): los activos en su orden, máximo 10, con
 * el enlace del botón ya resuelto y solo si su destino sigue disponible.
 */
export function marcoPublico(alm: Almacen, alcaldiaId: string) {
  return ordenados(vivos(alm, alcaldiaId))
    .filter((i) => i.activo)
    .slice(0, MAX_ACTIVOS)
    .map((i) => {
      const d = i.boton && destinoDisponible(alm, i.boton.destino);
      return {
        titulo: i.titulo,
        descripcion: i.descripcion,
        boton:
          d && i.boton
            ? {
                texto: i.boton.texto,
                href: `/${d.tipo === "NOTICIA" ? "noticias" : "documentos"}/${d.slug}`,
              }
            : undefined,
      };
    });
}
