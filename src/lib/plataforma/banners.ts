import { editor, medioPropio } from "./contenido";
import { idSecuencial, registrar } from "./servicio";
import type { Almacen } from "./tipos";
import type { Banner, CamposBanner, Vigencia } from "@/lib/contenido/tipos";
import { instante, vigenciaDe } from "@/lib/contenido/vigencia";

/*
 * Diapositivas de la tarjeta con transiciones del Inicio, bajo el termómetro (antes «banners»,
 * backlog 1.14 y 2.9): vigencia, orden por arrastre y bitácora. El portal muestra las primeras
 * 6 vigentes en su orden. Misma regla de vigencia que el portal (portal-iribarren/src/lib/banners.ts).
 */

/** Diapositivas que la tarjeta muestra a la vez. */
export const MAX_EN_PORTAL = 6;

export { instante, vigenciaDe };

const activosDe = (alm: Almacen, alcaldiaId: string) =>
  [...alm.banners.values()]
    .filter((b) => b.alcaldiaId === alcaldiaId && !b.eliminadoEl)
    .sort((a, b) => a.orden - b.orden);

export type FilaBanner = Banner & { estadoVigencia: Vigencia };

export type ResultadoBanners =
  | {
      estado: "OK";
      items: FilaBanner[];
      conteos: Record<Vigencia, number>;
      total: number;
      /** Lo que el portal muestra hoy: las primeras 6 vigentes, en su orden. */
      enPortal: FilaBanner[];
    }
  | { estado: "SIN_SESION" | "SIN_PERMISO" };

export function listarBanners(
  alm: Almacen,
  sesion: string | undefined,
  filtro?: Vigencia,
  ahora = Date.now(),
): ResultadoBanners {
  const c = editor(alm, sesion);
  if (c.estado !== "OK") return c;
  const todos = activosDe(alm, c.alcaldia.id).map((b) => ({
    ...b,
    estadoVigencia: vigenciaDe(b, ahora),
  }));
  const conteos = { VIGENTE: 0, FUTURO: 0, VENCIDO: 0 };
  for (const b of todos) conteos[b.estadoVigencia]++;
  return {
    estado: "OK",
    items: filtro ? todos.filter((b) => b.estadoVigencia === filtro) : todos,
    conteos,
    total: todos.length,
    enPortal: todos.filter((b) => b.estadoVigencia === "VIGENTE").slice(0, MAX_EN_PORTAL),
  };
}

export type ResultadoBanner =
  { estado: "OK"; banner: Banner } | { estado: "SIN_SESION" | "SIN_PERMISO" | "NO_EXISTE" };

export function obtenerBanner(
  alm: Almacen,
  sesion: string | undefined,
  id: string,
): ResultadoBanner {
  const c = editor(alm, sesion);
  if (c.estado !== "OK") return c;
  const b = alm.banners.get(id);
  if (!b || b.alcaldiaId !== c.alcaldia.id || b.eliminadoEl) return { estado: "NO_EXISTE" };
  return { estado: "OK", banner: b };
}

export type ResultadoGuardarBanner =
  | { estado: "OK"; banner: Banner }
  | { estado: "SIN_SESION" | "SIN_PERMISO" | "NO_EXISTE" | "MEDIO_AJENO" | "FECHAS" };

/** Crea (sin `id`, al final del carrusel) o actualiza un banner. */
export function guardarBanner(
  alm: Almacen,
  sesion: string | undefined,
  id: string | undefined,
  campos: CamposBanner,
  ahora = Date.now(),
): ResultadoGuardarBanner {
  const c = editor(alm, sesion);
  if (c.estado !== "OK") return c;
  const a = c.alcaldia.id;
  if (!medioPropio(alm, a, campos.imagen?.src)) return { estado: "MEDIO_AJENO" };
  const { desde, hasta } = campos.vigencia ?? {};
  if (desde && hasta && instante(hasta, "fin") < instante(desde, "inicio"))
    return { estado: "FECHAS" };

  const fecha = new Date(ahora).toISOString();
  const limpio: CamposBanner = {
    ...campos,
    titulo: campos.titulo.trim(),
    texto: campos.texto.trim(),
    enlace: { href: campos.enlace.href.trim(), etiqueta: campos.enlace.etiqueta.trim() },
    vigencia: desde || hasta ? { desde: desde || undefined, hasta: hasta || undefined } : undefined,
  };

  if (!id) {
    const b: Banner = {
      ...limpio,
      id: idSecuencial(alm.banners.keys(), "b"),
      alcaldiaId: a,
      orden: (activosDe(alm, a).at(-1)?.orden ?? 0) + 1,
      creadoEl: fecha,
      actualizadoEl: fecha,
    };
    alm.banners.set(b.id, b);
    registrar(
      alm,
      {
        actorId: c.usuario.id,
        alcaldiaId: a,
        accion: "BANNER_CREADO",
        entidad: "banner",
        despues: { id: b.id, titulo: b.titulo, vigencia: b.vigencia },
      },
      ahora,
    );
    return { estado: "OK", banner: b };
  }

  const r = obtenerBanner(alm, sesion, id);
  if (r.estado !== "OK") return r;
  const antes = { titulo: r.banner.titulo, vigencia: r.banner.vigencia };
  Object.assign(r.banner, limpio, { actualizadoEl: fecha });
  if (!limpio.imagen) r.banner.imagen = undefined;
  registrar(
    alm,
    {
      actorId: c.usuario.id,
      alcaldiaId: a,
      accion: "BANNER_ACTUALIZADO",
      entidad: "banner",
      antes: { id, ...antes },
      despues: { id, titulo: r.banner.titulo, vigencia: r.banner.vigencia },
    },
    ahora,
  );
  return { estado: "OK", banner: r.banner };
}

export function eliminarBanner(
  alm: Almacen,
  sesion: string | undefined,
  id: string,
  ahora = Date.now(),
): { estado: "OK" } | { estado: "SIN_SESION" | "SIN_PERMISO" | "NO_EXISTE" } {
  const r = obtenerBanner(alm, sesion, id);
  if (r.estado !== "OK") return r;
  const c = editor(alm, sesion) as Extract<ReturnType<typeof editor>, { estado: "OK" }>;
  r.banner.eliminadoEl = new Date(ahora).toISOString();
  registrar(
    alm,
    {
      actorId: c.usuario.id,
      alcaldiaId: r.banner.alcaldiaId,
      accion: "BANNER_ELIMINADO",
      entidad: "banner",
      antes: { id, titulo: r.banner.titulo },
    },
    ahora,
  );
  return { estado: "OK" };
}

/**
 * Nuevo orden del carrusel (PUT /admin/banners/order): la lista completa de ids, sin faltar
 * ni sobrar ninguno. El orden queda 1…n.
 */
export function ordenarBanners(
  alm: Almacen,
  sesion: string | undefined,
  ids: string[],
  ahora = Date.now(),
): { estado: "OK" } | { estado: "SIN_SESION" | "SIN_PERMISO" | "ORDEN_INVALIDO" } {
  const c = editor(alm, sesion);
  if (c.estado !== "OK") return c;
  const activos = activosDe(alm, c.alcaldia.id);
  const actuales = new Set(activos.map((b) => b.id));
  if (
    ids.length !== actuales.size ||
    new Set(ids).size !== ids.length ||
    !ids.every((i) => actuales.has(i))
  )
    return { estado: "ORDEN_INVALIDO" };
  const antes = activos.map((b) => b.id);
  ids.forEach((id, i) => {
    alm.banners.get(id)!.orden = i + 1;
  });
  registrar(
    alm,
    {
      actorId: c.usuario.id,
      alcaldiaId: c.alcaldia.id,
      accion: "BANNER_REORDENADO",
      entidad: "banner",
      antes: { orden: antes },
      despues: { orden: ids },
    },
    ahora,
  );
  return { estado: "OK" };
}
