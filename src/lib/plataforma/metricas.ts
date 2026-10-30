import { NOMBRE_FORMATO, FORMATOS, type Formato, type Noticia } from "@/lib/contenido/tipos";
import { nombreCompleto } from "./servicio";
import { tieneSeguimiento } from "./participaciones";
import {
  TIPOS_PARTICIPACION,
  type Almacen,
  type Ciudadano,
  type ConteoDia,
  type Interaccion,
  type Participacion,
  type TipoParticipacion,
} from "./tipos";

/*
 * Indicadores del tablero (backlog de refactorización, KPI). Se calculan sobre el almacén para
 * un rango de fechas en hora de Venezuela; con la API llegarán de GET /admin/metricas con la
 * misma forma. Lógica pura: se prueba con Vitest.
 */

const DIA = 86_400_000;
/** Día AAAA-MM-DD en hora de Venezuela (UTC−4, sin horario de verano). */
export const diaDe = (t: number) => new Date(t - 4 * 3_600_000).toISOString().slice(0, 10);

export const RANGOS = {
  "7d": "Últimos 7 días",
  "30d": "Últimos 30 días",
  "90d": "Últimos 90 días",
  anio: "Este año",
} as const;
export type ClaveRango = keyof typeof RANGOS;
export const esRango = (v: unknown): v is ClaveRango => typeof v === "string" && v in RANGOS;

export type Rango = {
  clave: ClaveRango;
  etiqueta: string;
  desde: string;
  hasta: string;
  /** Días del rango, del más antiguo al de hoy. */
  dias: string[];
};

export function rangoDe(clave: ClaveRango, ahora = Date.now()): Rango {
  const hoy = diaDe(ahora);
  const n =
    clave === "anio"
      ? Math.round((Date.parse(hoy) - Date.parse(`${hoy.slice(0, 4)}-01-01`)) / DIA) + 1
      : Number.parseInt(clave);
  const dias = Array.from({ length: n }, (_, i) => diaDe(ahora - (n - 1 - i) * DIA));
  return { clave, etiqueta: RANGOS[clave], desde: dias[0]!, hasta: hoy, dias };
}

/** Un punto de una serie: el día (o el lunes de la semana) y su valor. */
export type Punto = { desde: string; hasta: string; valor: number };

/** Hasta 31 días, por día; más largo, por semana, para que las columnas sigan legibles. */
export function serie(rango: Rango, valorDe: (dia: string) => number): Punto[] {
  const paso = rango.dias.length > 31 ? 7 : 1;
  const puntos: Punto[] = [];
  for (let i = 0; i < rango.dias.length; i += paso) {
    const tramo = rango.dias.slice(i, i + paso);
    puntos.push({
      desde: tramo[0]!,
      hasta: tramo.at(-1)!,
      valor: tramo.reduce((s, d) => s + valorDe(d), 0),
    });
  }
  return puntos;
}

export type Fila = { nombre: string; valor: number; href?: string };

const ordenar = (m: Map<string, number>, max = Infinity): Fila[] =>
  [...m]
    .map(([nombre, valor]) => ({ nombre, valor }))
    .sort((a, b) => b.valor - a.valor || a.nombre.localeCompare(b.nombre, "es"))
    .slice(0, max);

const sumar = (m: Map<string, number>, k: string, v = 1) => m.set(k, (m.get(k) ?? 0) + v);

const mediana = (xs: number[]) => {
  if (!xs.length) return undefined;
  const o = [...xs].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m]! : (o[m - 1]! + o[m]!) / 2;
};

/** Suma de vistas y reacciones de un elemento dentro del rango. */
function enRango(i: Interaccion | undefined, r: Rango): ConteoDia {
  const t = { vistas: 0, likes: 0, dislikes: 0 };
  for (const [dia, c] of Object.entries(i?.porDia ?? {}))
    if (dia >= r.desde && dia <= r.hasta) {
      t.vistas += c.vistas;
      t.likes += c.likes;
      t.dislikes += c.dislikes;
    }
  return t;
}

/** Vistas (o descargas) por día de todos los elementos con ese prefijo. */
function porDia(mapa: Map<string, Interaccion>, prefijo: string, campo: keyof ConteoDia) {
  const dias = new Map<string, number>();
  for (const [clave, i] of mapa)
    if (clave.startsWith(prefijo))
      for (const [dia, c] of Object.entries(i.porDia)) sumar(dias, dia, c[campo]);
  return dias;
}

/* ---------- Participación (Revisor y Admin) ---------- */

export type MetricasParticipacion = {
  recibidas: number;
  porTipo: Fila[];
  porParroquia: Fila[];
  porCategoria: Fila[];
  serie: Punto[];
  /** Por atender hoy (no depende del rango), por antigüedad desde que llegó. */
  pendientes: { total: number; hasta2: number; de3a7: number; mas7: number };
  /** Propuestas formales decididas en el rango. */
  decisiones: { aprobadas: number; rechazadas: number; tasaAprobacion?: number };
  /** Mediana de días entre la llegada y la decisión de las propuestas decididas en el rango. */
  diasRespuesta?: number;
  /**
   * Con plataforma-api, las cifras salen de la bandeja, que no trae el historial: las decisiones
   * se cuentan por el estado actual de lo recibido en el rango y no hay tiempo de respuesta.
   * Los indicadores completos llegan con R13.
   */
  sinHistorial?: boolean;
  opiniones: { recibidas: number; publicadas: number };
  /** Vistas y reacciones de los aportes publicados (en el portal), en el rango. */
  alcance: ConteoDia;
  masReacciones: Fila[];
};

export function metricasParticipacion(
  alm: Almacen,
  alcaldiaId: string,
  r: Rango,
  ahora = Date.now(),
  /** Con plataforma-api: las filas de la bandeja (sin historial). */
  lista?: Participacion[],
): MetricasParticipacion {
  const todas =
    lista ?? [...alm.participaciones.values()].filter((p) => p.alcaldiaId === alcaldiaId);
  const dentro = (iso: string) => {
    const d = diaDe(Date.parse(iso));
    return d >= r.desde && d <= r.hasta;
  };
  const recibidas = todas.filter((p) => dentro(p.recibidaEl));

  const porTipo = new Map<string, number>();
  const porParroquia = new Map<string, number>();
  const porCategoria = new Map<string, number>();
  const porDiaRecibidas = new Map<string, number>();
  for (const p of recibidas) {
    sumar(porTipo, TIPOS_PARTICIPACION[p.tipo]);
    sumar(porParroquia, p.parroquia);
    sumar(porCategoria, p.categoriaTecnica);
    sumar(porDiaRecibidas, diaDe(Date.parse(p.recibidaEl)));
  }

  const pendientes = { total: 0, hasta2: 0, de3a7: 0, mas7: 0 };
  for (const p of todas) {
    const espera = tieneSeguimiento(p.tipo)
      ? p.estado === "PENDIENTE" || p.estado === "EN_REVISION"
      : p.estado === "PENDIENTE";
    if (!espera) continue;
    const dias = Math.floor((ahora - Date.parse(p.recibidaEl)) / DIA);
    pendientes.total++;
    if (dias <= 2) pendientes.hasta2++;
    else if (dias <= 7) pendientes.de3a7++;
    else pendientes.mas7++;
  }

  let aprobadas = 0;
  let rechazadas = 0;
  const tiempos: number[] = [];
  for (const p of todas.filter((x) => tieneSeguimiento(x.tipo))) {
    if (lista) {
      // Sin historial: lo recibido en el rango, por su estado actual.
      if (!dentro(p.recibidaEl)) continue;
      if (p.estado === "APROBADA" || p.estado === "PUBLICADA") aprobadas++;
      else if (p.estado === "RECHAZADA") rechazadas++;
      continue;
    }
    const decision = p.historial.find((h) => h.estado === "APROBADA" || h.estado === "RECHAZADA");
    if (!decision || !dentro(decision.fecha)) continue;
    if (decision.estado === "APROBADA") aprobadas++;
    else rechazadas++;
    tiempos.push((Date.parse(decision.fecha) - Date.parse(p.recibidaEl)) / DIA);
  }
  const decididas = aprobadas + rechazadas;
  const dr = mediana(tiempos);

  const opiniones = recibidas.filter((p) => !tieneSeguimiento(p.tipo));
  const alcance = { vistas: 0, likes: 0, dislikes: 0 };
  const reacciones = new Map<string, number>();
  for (const p of todas) {
    const t = enRango(alm.interacciones.get(`aporte:${p.folio}`), r);
    alcance.vistas += t.vistas;
    alcance.likes += t.likes;
    alcance.dislikes += t.dislikes;
    if (t.likes + t.dislikes) reacciones.set(p.folio, t.likes + t.dislikes);
  }

  return {
    recibidas: recibidas.length,
    porTipo: (Object.keys(TIPOS_PARTICIPACION) as TipoParticipacion[]).map((t) => ({
      nombre: TIPOS_PARTICIPACION[t],
      valor: porTipo.get(TIPOS_PARTICIPACION[t]) ?? 0,
    })),
    porParroquia: ordenar(porParroquia, 8),
    porCategoria: ordenar(porCategoria, 8),
    serie: serie(r, (d) => porDiaRecibidas.get(d) ?? 0),
    pendientes,
    decisiones: {
      aprobadas,
      rechazadas,
      tasaAprobacion: decididas ? aprobadas / decididas : undefined,
    },
    diasRespuesta: dr === undefined ? undefined : Math.round(dr * 10) / 10,
    sinHistorial: lista ? true : undefined,
    opiniones: {
      recibidas: opiniones.length,
      publicadas: opiniones.filter((p) => p.estado === "PUBLICADA").length,
    },
    alcance,
    masReacciones: ordenar(reacciones, 5).map((f) => ({
      ...f,
      href: `/participaciones/${f.nombre}`,
    })),
  };
}

/* ---------- Contenido (Operador y Admin) ---------- */

export type MetricasContenido = {
  alcance: ConteoDia;
  serieVistas: Punto[];
  masVistas: Fila[];
  masValoradas: Fila[];
  /** Noticias publicadas hoy en el portal, por formato. */
  porFormato: Fila[];
  publicadasEnRango: number;
  descargas: number;
  masDescargados: Fila[];
  /**
   * Con plataforma-api: las vistas y reacciones son totales acumulados (sin rango), y la serie
   * diaria y las descargas llegan con R14.
   */
  sinRango?: boolean;
};

/** Una noticia de la API con sus totales, para las métricas (guía R12). */
export type NoticiaMetrica = Pick<
  Noticia,
  "id" | "titulo" | "estado" | "formato" | "publicadoEl"
> & { totales?: ConteoDia };

/** Con plataforma-api: totales acumulados de cada noticia, sin rango de fechas (R14). */
function contenidoDeApi(noticias: NoticiaMetrica[], r: Rango): MetricasContenido {
  const alcance = { vistas: 0, likes: 0, dislikes: 0 };
  const vistas = new Map<string, number>();
  const likes = new Map<string, number>();
  const href = new Map<string, string>();
  const porFormato = new Map<Formato, number>();
  for (const n of noticias) {
    const t = n.totales ?? { vistas: 0, likes: 0, dislikes: 0 };
    alcance.vistas += t.vistas;
    alcance.likes += t.likes;
    alcance.dislikes += t.dislikes;
    const titulo = n.titulo || "Sin título";
    href.set(titulo, `/contenido/noticias/${n.id}`);
    if (t.vistas) vistas.set(titulo, t.vistas);
    if (t.likes) likes.set(titulo, t.likes);
    if (n.estado === "PUBLICADO") porFormato.set(n.formato, (porFormato.get(n.formato) ?? 0) + 1);
  }
  const conHref = (f: Fila) => ({ ...f, href: href.get(f.nombre) });
  return {
    alcance,
    serieVistas: [],
    masVistas: ordenar(vistas, 5).map(conHref),
    masValoradas: ordenar(likes, 5).map(conHref),
    porFormato: FORMATOS.map((f) => ({ nombre: NOMBRE_FORMATO[f], valor: porFormato.get(f) ?? 0 })),
    publicadasEnRango: noticias.filter((n) => {
      if (!n.publicadoEl) return false;
      const d = diaDe(Date.parse(n.publicadoEl));
      return d >= r.desde && d <= r.hasta;
    }).length,
    descargas: 0,
    masDescargados: [],
    sinRango: true,
  };
}

export function metricasContenido(
  alm: Almacen,
  alcaldiaId: string,
  r: Rango,
  /** Con plataforma-api: las noticias con sus totales. */
  lista?: NoticiaMetrica[],
): MetricasContenido {
  if (lista) return contenidoDeApi(lista, r);
  const noticias = [...alm.noticias.values()].filter(
    (n) => n.alcaldiaId === alcaldiaId && !n.eliminadaEl,
  );
  const alcance = { vistas: 0, likes: 0, dislikes: 0 };
  const vistas = new Map<string, number>();
  const likes = new Map<string, number>();
  const href = new Map<string, string>();
  for (const n of noticias) {
    const t = enRango(alm.interacciones.get(`noticia:${n.id}`), r);
    alcance.vistas += t.vistas;
    alcance.likes += t.likes;
    alcance.dislikes += t.dislikes;
    const titulo = n.titulo || "Sin título";
    href.set(titulo, `/contenido/noticias/${n.id}`);
    if (t.vistas) vistas.set(titulo, t.vistas);
    if (t.likes) likes.set(titulo, t.likes);
  }
  const conHref = (f: Fila) => ({ ...f, href: href.get(f.nombre) });

  const porFormato = new Map<Formato, number>();
  for (const n of noticias)
    if (n.estado === "PUBLICADO") porFormato.set(n.formato, (porFormato.get(n.formato) ?? 0) + 1);

  const docs = [...alm.documentos.values()].filter((d) => d.alcaldiaId === alcaldiaId);
  const descargas = new Map<string, number>();
  for (const d of docs) {
    const t = enRango(alm.descargas.get(`documento:${d.id}`), r).vistas;
    if (t) descargas.set(d.titulo, t);
  }
  const hrefDoc = new Map(docs.map((d) => [d.titulo, `/contenido/documentos/${d.id}`]));
  const vistasDia = porDia(alm.interacciones, "noticia:", "vistas");

  return {
    alcance,
    serieVistas: serie(r, (d) => vistasDia.get(d) ?? 0),
    masVistas: ordenar(vistas, 5).map(conHref),
    masValoradas: ordenar(likes, 5).map(conHref),
    porFormato: FORMATOS.map((f) => ({ nombre: NOMBRE_FORMATO[f], valor: porFormato.get(f) ?? 0 })),
    publicadasEnRango: noticias.filter((n) => {
      if (!n.publicadoEl) return false;
      const d = diaDe(Date.parse(n.publicadoEl));
      return d >= r.desde && d <= r.hasta;
    }).length,
    descargas: [...descargas.values()].reduce((s, v) => s + v, 0),
    masDescargados: ordenar(descargas, 5).map((f) => ({ ...f, href: hrefDoc.get(f.nombre) })),
  };
}

/* ---------- Ciudadanía (Revisor y Admin) ---------- */

export type MetricasCiudadania = {
  total: number;
  nuevos: number;
  serie: Punto[];
  /** Proporción de perfiles completos sobre el total (0 a 1). */
  perfilesCompletos?: number;
  personas: number;
  organizaciones: number;
  suspendidos: number;
};

export function metricasCiudadania(
  alm: Almacen,
  alcaldiaId: string,
  r: Rango,
  /** Con plataforma-api: los ciudadanos de la API. */
  lista?: Ciudadano[],
): MetricasCiudadania {
  const todos = lista ?? [...alm.ciudadanos.values()].filter((c) => c.alcaldiaId === alcaldiaId);
  const porDiaRegistro = new Map<string, number>();
  for (const c of todos) sumar(porDiaRegistro, diaDe(Date.parse(c.registradoEl)));
  const nuevos = todos.filter((c) => {
    const d = diaDe(Date.parse(c.registradoEl));
    return d >= r.desde && d <= r.hasta;
  }).length;
  return {
    total: todos.length,
    nuevos,
    serie: serie(r, (d) => porDiaRegistro.get(d) ?? 0),
    perfilesCompletos: todos.length
      ? todos.filter((c) => c.perfilCompleto).length / todos.length
      : undefined,
    personas: todos.filter((c) => c.tipo === "NATURAL").length,
    organizaciones: todos.filter((c) => c.tipo === "ORGANIZACION").length,
    suspendidos: todos.filter((c) => c.membresia.estado === "SUSPENDIDA").length,
  };
}

/* ---------- Equipo (Admin) ---------- */

/** Decisiones del equipo en el rango (cambios de estado de aportes), por persona. */
export function decisionesPorRevisor(alm: Almacen, alcaldiaId: string, r: Rango): Fila[] {
  const m = new Map<string, number>();
  for (const p of alm.participaciones.values()) {
    if (p.alcaldiaId !== alcaldiaId) continue;
    for (const h of p.historial) {
      const d = diaDe(Date.parse(h.fecha));
      if (!h.por || d < r.desde || d > r.hasta) continue;
      const u = alm.usuarios.get(h.por.id);
      sumar(m, u ? nombreCompleto(u) : h.por.nombre);
    }
  }
  return ordenar(m);
}

/* ---------- CSV ---------- */

const celda = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

/** Filas «Sección;Indicador;Valor» de lo que el rol puede ver (separador «;» para Excel). */
export function csvMetricas(
  r: Rango,
  datos: {
    participacion?: MetricasParticipacion;
    contenido?: MetricasContenido;
    ciudadania?: MetricasCiudadania;
    equipo?: Fila[];
  },
) {
  const filas: (string | number)[][] = [
    ["Sección", "Indicador", "Valor"],
    ["Rango", `${r.etiqueta} (${r.desde} a ${r.hasta})`, ""],
  ];
  const lista = (seccion: string, prefijo: string, fs: Fila[]) =>
    fs.forEach((f) => filas.push([seccion, `${prefijo}: ${f.nombre}`, f.valor]));
  const puntos = (seccion: string, nombre: string, ps: Punto[]) =>
    ps.forEach((p) =>
      filas.push([
        seccion,
        `${nombre} ${p.desde === p.hasta ? p.desde : `${p.desde} a ${p.hasta}`}`,
        p.valor,
      ]),
    );

  const p = datos.participacion;
  if (p) {
    const s = "Participación";
    filas.push(
      [s, "Aportes recibidos", p.recibidas],
      [s, "Por atender hoy", p.pendientes.total],
      [s, "Por atender con más de 7 días", p.pendientes.mas7],
      [s, "Propuestas verificadas", p.decisiones.aprobadas],
      [s, "Propuestas rechazadas", p.decisiones.rechazadas],
      [s, "Días de respuesta (mediana)", p.diasRespuesta ?? ""],
      [s, "Opiniones recibidas", p.opiniones.recibidas],
      [s, "Opiniones publicadas", p.opiniones.publicadas],
    );
    // Con la API, la bandeja no trae los totales de cada aporte: llegan con R14.
    if (!p.sinHistorial)
      filas.push(
        [s, "Vistas de aportes publicados", p.alcance.vistas],
        [s, "Me gusta en aportes", p.alcance.likes],
        [s, "No me gusta en aportes", p.alcance.dislikes],
      );
    lista(s, "Tipo", p.porTipo);
    lista(s, "Parroquia", p.porParroquia);
    lista(s, "Categoría técnica", p.porCategoria);
    puntos(s, "Recibidos", p.serie);
  }
  const c = datos.contenido;
  if (c) {
    const s = "Contenido";
    filas.push(
      [s, "Noticias publicadas en el rango", c.publicadasEnRango],
      // Con la API, totales acumulados (sin rango) hasta R14.
      [s, c.sinRango ? "Vistas de noticias (acumuladas)" : "Vistas de noticias", c.alcance.vistas],
      [
        s,
        c.sinRango ? "Me gusta en noticias (acumulados)" : "Me gusta en noticias",
        c.alcance.likes,
      ],
      [
        s,
        c.sinRango ? "No me gusta en noticias (acumulados)" : "No me gusta en noticias",
        c.alcance.dislikes,
      ],
    );
    if (!c.sinRango) filas.push([s, "Descargas de documentos", c.descargas]);
    lista(s, "Más vista", c.masVistas);
    lista(s, "Más valorada", c.masValoradas);
    lista(s, "Publicadas por formato", c.porFormato);
    lista(s, "Más descargado", c.masDescargados);
    puntos(s, "Vistas", c.serieVistas);
  }
  const ci = datos.ciudadania;
  if (ci) {
    const s = "Ciudadanía";
    filas.push(
      [s, "Registrados en total", ci.total],
      [s, "Registros nuevos", ci.nuevos],
      [
        s,
        "Perfiles completos (%)",
        ci.perfilesCompletos === undefined ? "" : Math.round(ci.perfilesCompletos * 100),
      ],
      [s, "Personas naturales", ci.personas],
      [s, "Organizaciones", ci.organizaciones],
      [s, "Cuentas suspendidas", ci.suspendidos],
    );
  }
  if (datos.equipo) lista("Equipo", "Decisiones", datos.equipo);
  return `﻿${filas.map((f) => f.map(celda).join(";")).join("\r\n")}\r\n`;
}

/** Las secciones de indicadores que puede ver cada rol (Revisor, Operador, Admin). */
export function indicadoresDe(
  alm: Almacen,
  alcaldiaId: string,
  permisos: ReadonlySet<string>,
  r: Rango,
  ahora = Date.now(),
  /** Con plataforma-api: lo que se leyó de la API (ver `DatosApiTablero`). */
  api?: DatosApiTablero,
) {
  return {
    participacion: permisos.has("metricas.participacion")
      ? metricasParticipacion(alm, alcaldiaId, r, ahora, api?.participaciones)
      : undefined,
    contenido: permisos.has("metricas.contenido")
      ? metricasContenido(alm, alcaldiaId, r, api?.noticias)
      : undefined,
    ciudadania: permisos.has("metricas.ciudadania")
      ? metricasCiudadania(alm, alcaldiaId, r, api?.ciudadanos)
      : undefined,
    // Las decisiones por revisor salen del historial completo: con la API llegan con R14.
    equipo:
      permisos.has("metricas.equipo") && !api
        ? decisionesPorRevisor(alm, alcaldiaId, r)
        : undefined,
    conApi: !!api,
  };
}

/** Con plataforma-api, los datos de la API con que se calculan los indicadores. */
export type DatosApiTablero = {
  participaciones?: Participacion[];
  noticias?: NoticiaMetrica[];
  ciudadanos?: Ciudadano[];
};
