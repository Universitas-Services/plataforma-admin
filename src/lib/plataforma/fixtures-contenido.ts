import type { Adjunto, Documento, Imagen, Noticia } from "@/lib/contenido/tipos";
import type { Almacen, Interaccion } from "./tipos";

/*
 * Noticias de demostración (backlog 2.9). Son contenido de EJEMPLO, no textos oficiales: llevan
 * `ejemplo: true` y el aviso en el cuerpo. Las fotos son de Wikimedia Commons bajo CC BY-SA,
 * copiadas del portal con su crédito (public/ejemplos/CREDITOS.md).
 */

const DIA = 86_400_000;
const NOTA = "<p><em>Contenido de ejemplo para el panel de demostración.</em></p>";

const FOTOS = {
  catedral: {
    src: "/ejemplos/catedral-metropolitana.jpg",
    alt: "Catedral Metropolitana de Barquisimeto, con su torre blanca y techo de cristal",
    ancho: 2400,
    alto: 1613,
    credito: {
      autor: "Rube96pinto",
      licencia: "CC BY-SA 4.0",
      fuente:
        "https://commons.wikimedia.org/wiki/File:Santa_Iglesia_Catedral_Metropolitana,_Catedral_de_Barquisimeto.jpg",
    },
    ilustrativa: true,
  },
  teatro: {
    src: "/ejemplos/teatro-juares.jpg",
    alt: "Fachada del Teatro Juares en el centro de Barquisimeto",
    ancho: 1600,
    alto: 1045,
    credito: {
      autor: "Wilfredor",
      licencia: "CC BY-SA 3.0",
      fuente: "https://commons.wikimedia.org/wiki/File:Teatro_Juares.jpg",
    },
  },
  obelisco: {
    src: "/ejemplos/obelisco-2005.jpg",
    alt: "El Obelisco de Barquisimeto iluminado al anochecer, con la ciudad de fondo",
    ancho: 1600,
    alto: 1200,
    credito: {
      autor: "Andres Mendez",
      licencia: "CC BY-SA 2.0",
      fuente: "https://commons.wikimedia.org/wiki/File:Obelisco_de_Barquisimeto,_2005.jpg",
    },
  },
  skyline: {
    src: "/ejemplos/skyline-oeste.jpg",
    alt: "Edificios de Barquisimeto con las montañas al fondo",
    ancho: 1600,
    alto: 1067,
    credito: {
      autor: "Lacamaradefran",
      licencia: "CC BY-SA 4.0",
      fuente:
        "https://commons.wikimedia.org/wiki/File:Digitaliza_Tu_Ciudad_Barquisimeto_2025-8.jpg",
    },
  },
  poster: {
    src: "/ejemplos/recorrido-ciudad-poster.jpg",
    alt: "La Catedral Metropolitana de Barquisimeto, portada del video",
    ancho: 960,
    alto: 540,
    credito: {
      autor: "Rube96pinto",
      licencia: "CC BY-SA 4.0",
      fuente:
        "https://commons.wikimedia.org/wiki/File:Santa_Iglesia_Catedral_Metropolitana,_Catedral_de_Barquisimeto.jpg",
    },
  },
} satisfies Record<string, Imagen>;

type Semilla = Omit<
  Noticia,
  "alcaldiaId" | "creadoEl" | "actualizadoEl" | "publicadoEl" | "publicarEl" | "imagenes"
> & {
  imagenes?: Imagen[];
  /** Días relativos a hoy: negativos en el pasado. */
  hace: number;
  publicarEn?: number;
};

const iso = (ahora: number, dias: number) => new Date(ahora + dias * DIA).toISOString();

const SEMILLAS: Record<string, Semilla[]> = {
  iribarren: [
    {
      id: "n-ejemplo-alcalde",
      slug: "ejemplo-mensaje-del-alcalde",
      tipo: "INFORMACION",
      formato: "TEXTO",
      titulo: "Ejemplo: mensaje del alcalde para el Inicio",
      resumen:
        "Noticia de texto de ejemplo elegida para la tarjeta del mensaje del alcalde en el Inicio.",
      categoria: "Mensaje institucional",
      cuerpo: `<p>Texto de ejemplo: aquí irá el mensaje que la alcaldía quiera destacar en el Inicio.</p>${NOTA}`,
      destacada: false,
      estado: "PUBLICADO",
      autorId: "u-operador-iri",
      hace: -1,
      ejemplo: true,
    },
    {
      id: "n-ejemplo-mesas",
      slug: "ejemplo-mesas-tecnicas-por-parroquia",
      tipo: "NOTICIA",
      formato: "IMAGEN",
      titulo: "Ejemplo: así funcionan las mesas técnicas por parroquia",
      resumen: "Una noticia de ejemplo con imagen de portada, destacada en el inicio del portal.",
      categoria: "Mesas de trabajo",
      parroquia: "Catedral",
      portada: FOTOS.catedral,
      cuerpo: `<p>Texto de ejemplo para mostrar una noticia con imagen de portada.</p><h2>Qué verás aquí</h2><ul><li>La portada con su crédito.</li><li>El cuerpo con títulos y listas.</li></ul>${NOTA}`,
      destacada: true,
      estado: "PUBLICADO",
      autorId: "u-operador-iri",
      hace: -3,
      ejemplo: true,
    },
    {
      id: "n-ejemplo-galeria",
      slug: "ejemplo-recorrido-centro-historico",
      tipo: "NOTICIA",
      formato: "GALERIA",
      titulo: "Ejemplo: recorrido fotográfico por el centro",
      resumen: "Galería de ejemplo con tres fotos de Wikimedia Commons y su crédito.",
      categoria: "Despliegue territorial",
      portada: FOTOS.teatro,
      imagenes: [FOTOS.teatro, FOTOS.obelisco, FOTOS.skyline],
      cuerpo: `<p>Galería de ejemplo.</p>${NOTA}`,
      destacada: false,
      estado: "PUBLICADO",
      autorId: "u-admin-iri",
      hace: -6,
      ejemplo: true,
    },
    {
      id: "n-ejemplo-video",
      slug: "ejemplo-recorrido-en-video",
      tipo: "NOTICIA",
      formato: "VIDEO",
      titulo: "Ejemplo: un recorrido por la ciudad en video",
      resumen: "Video de ejemplo de veinte segundos, con portada y subtítulos.",
      categoria: "Despliegue territorial",
      video: {
        fuente: "ARCHIVO",
        url: "/ejemplos/recorrido-ciudad-ejemplo.webm",
        subtitulos: "/ejemplos/recorrido-ciudad-ejemplo.es.vtt",
        duracionSeg: 20,
        portada: FOTOS.poster,
      },
      cuerpo: `<p>Video de ejemplo armado con fotos CC BY-SA.</p>${NOTA}`,
      destacada: false,
      estado: "PUBLICADO",
      autorId: "u-operador-iri",
      hace: -10,
      ejemplo: true,
    },
    {
      id: "n-ejemplo-documento",
      slug: "ejemplo-plan-de-trabajo",
      tipo: "INFORMACION",
      formato: "DOCUMENTO",
      titulo: "Ejemplo: documento adjunto para descargar",
      resumen: "Información de ejemplo con un PDF adjunto, programada para publicarse en dos días.",
      categoria: "Decretos y normativas",
      adjunto: {
        nombre: "Plan de trabajo (ejemplo).pdf",
        url: "/ejemplos/plan-de-trabajo-pdul-ejemplo.pdf",
        tipo: "application/pdf",
        pesoBytes: 4346,
      },
      cuerpo: `<p>Información de ejemplo con un documento adjunto.</p>${NOTA}`,
      destacada: false,
      estado: "PROGRAMADO",
      autorId: "u-operador-iri",
      hace: -1,
      publicarEn: 2,
      ejemplo: true,
    },
    {
      id: "n-ejemplo-puntos",
      slug: "ejemplo-puntos-de-analisis",
      tipo: "NOTICIA",
      formato: "TEXTO",
      titulo: "Ejemplo: puntos de análisis y botón al final",
      resumen: "Borrador de ejemplo con puntos de análisis y un botón opcional.",
      categoria: "Análisis institucional",
      cuerpo: `<p>Borrador de ejemplo.</p>${NOTA}`,
      puntos: {
        titulo: "Puntos de análisis (ejemplo)",
        items: [
          { titulo: "Primer punto", texto: "Explicación breve del primer punto de ejemplo." },
          { titulo: "Segundo punto", texto: "Explicación breve del segundo punto de ejemplo." },
        ],
      },
      boton: { texto: "Ver el documento", href: "/documentos" },
      destacada: false,
      estado: "BORRADOR",
      autorId: "u-operador-iri",
      hace: -0.2,
      ejemplo: true,
    },
    {
      id: "n-ejemplo-incompleta",
      slug: "ejemplo-borrador-sin-portada",
      tipo: "NOTICIA",
      formato: "IMAGEN",
      titulo: "Ejemplo: borrador al que le falta la portada",
      resumen: "",
      cuerpo: "",
      destacada: false,
      estado: "BORRADOR",
      autorId: "u-admin-iri",
      hace: -2,
      ejemplo: true,
    },
    {
      id: "n-ejemplo-despublicada",
      slug: "ejemplo-aviso-retirado",
      tipo: "INFORMACION",
      formato: "TEXTO",
      titulo: "Ejemplo: aviso que se retiró del portal",
      resumen: "Información de ejemplo que estuvo publicada y se despublicó.",
      categoria: "Mensaje institucional",
      cuerpo: `<p>Aviso de ejemplo ya retirado.</p>${NOTA}`,
      destacada: false,
      estado: "DESPUBLICADO",
      autorId: "u-admin-iri",
      hace: -20,
      ejemplo: true,
    },
  ],
};

export function noticiasDemo(ahora: number): Noticia[] {
  return Object.entries(SEMILLAS).flatMap(([alcaldiaId, lista]) =>
    lista.map(({ hace, publicarEn, imagenes, ...n }) => {
      const fecha = iso(ahora, hace);
      return structuredClone({
        ...n,
        alcaldiaId,
        imagenes: imagenes ?? [],
        creadoEl: fecha,
        actualizadoEl: fecha,
        publicadoEl: n.estado === "PUBLICADO" || n.estado === "DESPUBLICADO" ? fecha : undefined,
        publicarEl: publicarEn ? iso(ahora, publicarEn) : undefined,
      });
    }),
  );
}

/* ---------- Inicio del portal y vistas y reacciones de ejemplo ---------- */

/** Lo que el Inicio muestra elegido por la alcaldía (ejemplo). */
export const inicioDemo = () => ({
  mensajeAlcalde: "n-ejemplo-alcalde",
  anuncios: ["n-ejemplo-mesas", "n-ejemplo-galeria"],
});

/** Número pseudoaleatorio estable a partir de un texto (los datos de ejemplo no cambian). */
function semilla(texto: string) {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h >>> 0) % 1000) / 1000;
  };
}

/**
 * Vistas, reacciones y descargas de ejemplo repartidas por día desde la publicación, para que
 * el tablero de indicadores tenga datos en la demostración. No son cifras reales.
 */
export function interaccionesDemo(alm: Almacen, ahora: number) {
  const dia = (t: number) => new Date(t - 4 * 3_600_000).toISOString().slice(0, 10);
  const repartir = (clave: string, desde: number, base: number) => {
    const azar = semilla(clave);
    const porDia: Interaccion["porDia"] = {};
    for (let t = Math.max(desde, ahora - 60 * DIA); t <= ahora; t += DIA) {
      const vistas = Math.round(base * (0.4 + azar()));
      if (!vistas) continue;
      porDia[dia(t)] = {
        vistas,
        likes: Math.round(vistas * 0.12 * azar()),
        dislikes: Math.round(vistas * 0.03 * azar()),
      };
    }
    return { porDia };
  };
  for (const n of alm.noticias.values())
    if (n.publicadoEl && n.estado === "PUBLICADO")
      alm.interacciones.set(`noticia:${n.id}`, repartir(n.id, Date.parse(n.publicadoEl), 14));
  for (const p of alm.participaciones.values())
    if (p.estado === "PUBLICADA")
      alm.interacciones.set(`aporte:${p.folio}`, repartir(p.folio, Date.parse(p.recibidaEl), 6));
  for (const d of alm.documentos.values())
    if (d.publico)
      alm.descargas.set(`documento:${d.id}`, repartir(d.id, Date.parse(d.publicadoEl), 3));
}

const pdf = (nombre: string, archivo: string, pesoBytes: number): Adjunto => ({
  nombre,
  url: `/ejemplos/${archivo}`,
  tipo: "application/pdf",
  pesoBytes,
});

export function documentosDemo(ahora: number): Documento[] {
  const f = (dias: number) => iso(ahora, dias);
  const base = { alcaldiaId: "iribarren", ejemplo: true };
  const plan = pdf("Plan de trabajo (ejemplo).pdf", "plan-de-trabajo-pdul-ejemplo.pdf", 4346);
  const decreto = pdf("Decreto (ejemplo).pdf", "decreto-48-2026-ejemplo.pdf", 3219);
  const metodo = pdf("Metodología (ejemplo).pdf", "metodologia-diagnostico-ejemplo.pdf", 4161);
  const minuta = pdf("Minuta (ejemplo).pdf", "minuta-mesa-tecnica-catedral-ejemplo.pdf", 3355);
  return structuredClone<Documento[]>([
    {
      ...base,
      id: "d-ejemplo-plan",
      slug: "ejemplo-plan-de-trabajo",
      titulo: "Ejemplo: plan de trabajo",
      descripcion: "Documento de ejemplo con tres versiones en su historial.",
      categoria: "Plan de trabajo",
      estado: "BORRADOR",
      publico: true,
      version: "2.1",
      archivo: plan,
      versiones: [
        {
          version: "2.1",
          fecha: f(-3),
          nota: "Ejemplo: corrección del cronograma.",
          archivo: plan,
        },
        {
          version: "2.0",
          fecha: f(-12),
          nota: "Ejemplo: nueva estructura por fases.",
          archivo: plan,
        },
        { version: "1.0", fecha: f(-30), nota: "Primera versión.", archivo: plan },
      ],
      publicadoEl: f(-30),
      actualizadoEl: f(-3),
    },
    {
      ...base,
      id: "d-ejemplo-decreto",
      slug: "ejemplo-decreto",
      titulo: "Ejemplo: decreto de inicio",
      descripcion: "Documento oficial de ejemplo (no es el decreto real).",
      categoria: "Decretos y normativa",
      estado: "OFICIAL",
      publico: true,
      version: "1.0",
      archivo: decreto,
      versiones: [{ version: "1.0", fecha: f(-35), nota: "Primera versión.", archivo: decreto }],
      publicadoEl: f(-35),
      actualizadoEl: f(-35),
    },
    {
      ...base,
      id: "d-ejemplo-metodologia",
      slug: "ejemplo-metodologia",
      titulo: "Ejemplo: metodología del diagnóstico",
      descripcion: "Informe técnico de ejemplo.",
      categoria: "Informes técnicos",
      estado: "BORRADOR",
      publico: true,
      version: "1.1",
      archivo: metodo,
      versiones: [
        { version: "1.1", fecha: f(-6), nota: "Ejemplo: se añadió un anexo.", archivo: metodo },
        { version: "1.0", fecha: f(-15), nota: "Primera versión.", archivo: metodo },
      ],
      publicadoEl: f(-15),
      actualizadoEl: f(-6),
    },
    {
      ...base,
      id: "d-ejemplo-minuta",
      slug: "ejemplo-minuta",
      titulo: "Ejemplo: minuta de mesa técnica",
      descripcion: "Minuta de ejemplo aún oculta: solo la ve el equipo.",
      categoria: "Minutas",
      estado: "BORRADOR",
      publico: false,
      version: "1.0",
      archivo: minuta,
      versiones: [{ version: "1.0", fecha: f(-1), nota: "Primera versión.", archivo: minuta }],
      publicadoEl: f(-1),
      actualizadoEl: f(-1),
    },
  ]);
}
