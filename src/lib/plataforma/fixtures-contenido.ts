import type { Imagen, Noticia } from "@/lib/contenido/tipos";

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
  jimenez: [
    {
      id: "n-ejemplo-jimenez",
      slug: "ejemplo-primera-noticia",
      tipo: "NOTICIA",
      formato: "TEXTO",
      titulo: "Ejemplo: primera noticia de la alcaldía",
      resumen: "Noticia de ejemplo de otra alcaldía: no aparece en Iribarren.",
      categoria: "Mensaje institucional",
      cuerpo: `<p>Noticia de ejemplo.</p>${NOTA}`,
      destacada: false,
      estado: "PUBLICADO",
      autorId: "u-multi",
      hace: -4,
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
