import { contextoDe, registrar } from "./servicio";
import type { Almacen, ConteoDia } from "./tipos";
import type { Noticia } from "@/lib/contenido/tipos";

/*
 * Lo que el Inicio del portal muestra elegido por la alcaldía (backlog de refactorización 1.11):
 * la tarjeta del mensaje del alcalde (una noticia de TEXTO publicada). La tarjeta con
 * transiciones bajo el termómetro tiene sus propias diapositivas (`banners.ts`). El resto del
 * Inicio es fijo o sale de los rankings. Lógica pura: se prueba con Vitest.
 */

/** Totales de vistas y reacciones de un elemento (`noticia:<id>`, `aporte:<folio>`). */
export function totalesDe(alm: Almacen, clave: string, mapa = alm.interacciones): ConteoDia {
  const t = { vistas: 0, likes: 0, dislikes: 0 };
  for (const d of Object.values(mapa.get(clave)?.porDia ?? {})) {
    t.vistas += d.vistas;
    t.likes += d.likes;
    t.dislikes += d.dislikes;
  }
  return t;
}

const publicada = (alm: Almacen, id?: string) => {
  const n = id ? alm.noticias.get(id) : undefined;
  return n && !n.eliminadaEl && n.estado === "PUBLICADO" ? n : undefined;
};

/**
 * Saca de la selección lo que ya no está publicado (se despublicó o se eliminó) y devuelve los
 * títulos que salieron, para avisar en el panel.
 */
export function depurarInicio(alm: Almacen): string[] {
  const salen: string[] = [];
  const titulo = (id: string) => alm.noticias.get(id)?.titulo || "Una noticia";
  const m = alm.inicio.mensajeAlcalde;
  if (m && (!publicada(alm, m) || publicada(alm, m)!.formato !== "TEXTO")) {
    salen.push(titulo(m));
    alm.inicio.mensajeAlcalde = undefined;
  }
  return salen;
}

export type VistaInicio = {
  estado: "OK";
  mensajeAlcalde?: Noticia;
  /** Noticias de texto publicadas: las que pueden ir en el mensaje del alcalde. */
  candidatosMensaje: Noticia[];
  retiradas: string[];
};

export function inicioDe(
  alm: Almacen,
  sesion: string | undefined,
): VistaInicio | { estado: "SIN_SESION" | "SIN_PERMISO" } {
  const c = contextoDe(alm, sesion);
  if (!c) return { estado: "SIN_SESION" };
  if (!c.permisos.has("inicio.editar")) return { estado: "SIN_PERMISO" };
  const retiradas = depurarInicio(alm);
  const publicadas = [...alm.noticias.values()]
    .filter((n) => n.alcaldiaId === c.alcaldia.id && publicada(alm, n.id))
    .sort((a, b) => Date.parse(b.publicadoEl!) - Date.parse(a.publicadoEl!));
  return {
    estado: "OK",
    mensajeAlcalde: publicada(alm, alm.inicio.mensajeAlcalde),
    candidatosMensaje: publicadas.filter((n) => n.formato === "TEXTO"),
    retiradas,
  };
}

export type ResultadoInicio =
  { estado: "OK" } | { estado: "SIN_SESION" | "SIN_PERMISO" | "NO_PUBLICADA" | "NO_ES_TEXTO" };

/** Guarda el mensaje del alcalde (PUT /admin/home): una noticia de TEXTO publicada, o ninguna. */
export function guardarInicio(
  alm: Almacen,
  sesion: string | undefined,
  datos: { mensajeAlcalde?: string | null },
  ahora = Date.now(),
): ResultadoInicio {
  const c = contextoDe(alm, sesion);
  if (!c) return { estado: "SIN_SESION" };
  if (!c.permisos.has("inicio.editar")) return { estado: "SIN_PERMISO" };
  const mensaje = datos.mensajeAlcalde || undefined;
  if (mensaje) {
    const n = publicada(alm, mensaje);
    if (!n) return { estado: "NO_PUBLICADA" };
    if (n.formato !== "TEXTO") return { estado: "NO_ES_TEXTO" };
  }
  const titulo = (id?: string) => (id ? alm.noticias.get(id)?.titulo : undefined);
  const antes = { mensajeAlcalde: titulo(alm.inicio.mensajeAlcalde) };
  alm.inicio = { mensajeAlcalde: mensaje };
  registrar(
    alm,
    {
      actorId: c.usuario.id,
      alcaldiaId: c.alcaldia.id,
      accion: "INICIO_ACTUALIZADO",
      entidad: "inicio",
      antes,
      despues: { mensajeAlcalde: titulo(mensaje) },
    },
    ahora,
  );
  return { estado: "OK" };
}
