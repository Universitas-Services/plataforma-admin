import type { Adjunto, Banner, Documento, Imagen, Noticia } from "@/lib/contenido/tipos";
import type { Almacen, Interaccion, ItemMarcoLegal, VersionTextoLegal } from "./tipos";

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

/**
 * Marco legal de Conoce el PDUL con los 7 ítems que hoy muestra el portal (texto del cliente, en
 * `portal-iribarren/src/lib/conoce/contenido.ts`), activos y en su orden, más un ítem inactivo
 * de ejemplo. El botón del decreto apunta al documento de ejemplo del repositorio; el de la
 * sentencia no se incluye porque el panel de demostración no tiene esa noticia.
 */
export function marcoLegalDemo(ahora: number): ItemMarcoLegal[] {
  const fecha = new Date(ahora - 20 * DIA).toISOString();
  const base = { alcaldiaId: "iribarren", creadoEl: fecha, actualizadoEl: fecha };
  const activos: Omit<
    ItemMarcoLegal,
    "id" | "alcaldiaId" | "creadoEl" | "actualizadoEl" | "activo"
  >[] = [
    {
      titulo: "Constitución de la República Bolivariana de Venezuela (CRBV, arts. 168 y 178)",
      descripcion:
        "Consagra el gobierno local y otorga la competencia exclusiva e intangible a los municipios para regular la ordenación urbanística y el uso del suelo.",
    },
    {
      titulo: "Agenda Hábitat III y ODS",
      descripcion:
        "Alineado con los Objetivos de Desarrollo Sostenible (Agenda 2030) y ONU-Hábitat para una Barquisimeto compacta, verde, accesible y resiliente al cambio climático.",
    },
    {
      titulo: "Ley Orgánica de Ordenación Urbanística (LOOU, 1987, arts. 10 y 34)",
      descripcion:
        "Delimita el contenido obligatorio del PDUL y la potestad del Concejo Municipal para sancionar mediante Ordenanza.",
    },
    {
      titulo: "Ley Orgánica del Poder Público Municipal (LOPPM, 2010, art. 54)",
      descripcion:
        "Define a las Ordenanzas como leyes locales de aplicación general y obligatorio cumplimiento.",
    },
    {
      titulo: "Sentencia N° 928/2018 de la Sala Constitucional del TSJ",
      descripcion:
        "Hito jurisprudencial que constató el vencimiento del plazo de vigencia del plan de 2003 (previsto en su artículo 150) y decretó cautelarmente su ultractividad para evitar que Barquisimeto quedara en un vacío normativo, ordenando a las autoridades municipales la formulación del nuevo texto legal.",
    },
    {
      titulo: "Guía metodológica MINFRA (Resolución N° 139 / G.O. N° 37.888)",
      descripcion:
        "Marco técnico oficial que fija las etapas de elaboración y la estructura exigida para el expediente urbano.",
    },
    {
      titulo:
        "Decreto Municipal N° 48-2026 (Gaceta Municipal Extraordinaria N° 5256 del 14-09-2026)",
      descripcion:
        "Acto administrativo dictado por el Alcalde del Municipio Iribarren, Yanys Enrique Agüero, mediante el cual se declara formalmente el inicio del procedimiento técnico, administrativo y participativo para la elaboración del nuevo PDUL, instruyendo a la Dirección de Planificación y Control Urbano (DPCU) la apertura del registro de actores y de esta plataforma tecnológica de participación ciudadana.",
      boton: {
        texto: "Ver en el repositorio",
        destino: { tipo: "DOCUMENTO", id: "d-ejemplo-decreto" },
      },
    },
  ];
  return [
    ...activos.map((a, n) => ({ ...base, ...a, id: `m-${n + 1}`, activo: true, orden: n })),
    {
      ...base,
      id: "m-ejemplo-inactivo",
      titulo: "Ejemplo: ítem guardado sin mostrar",
      descripcion:
        "Ítem de ejemplo inactivo: queda guardado en el panel y no aparece en el portal hasta que se active.",
      activo: false,
      ejemplo: true,
    },
  ];
}

const dia = (ahora: number, dias: number) =>
  new Date(ahora + dias * DIA - 4 * 3_600_000).toISOString().slice(0, 10);

export function bannersDemo(ahora: number): Banner[] {
  const fecha = new Date(ahora - 5 * DIA).toISOString();
  const base = { alcaldiaId: "iribarren", creadoEl: fecha, actualizadoEl: fecha, ejemplo: true };
  return structuredClone<Banner[]>([
    {
      ...base,
      id: "b-ejemplo-propuestas",
      titulo: "Ejemplo: tu propuesta puede llegar al plan",
      texto: "Banner de ejemplo con el color de la alcaldía y un enlace a participar.",
      enlace: { href: "/participa", etiqueta: "Enviar una propuesta" },
      tono: "rojo",
      orden: 1,
      vigencia: { desde: dia(ahora, -10) },
    },
    {
      ...base,
      id: "b-ejemplo-diagnostico",
      titulo: "Ejemplo: así se prepara el diagnóstico",
      texto: "Banner de ejemplo con foto de fondo y tono oscuro.",
      enlace: { href: "/noticias", etiqueta: "Leer las noticias" },
      tono: "tinta",
      imagen: { ...FOTOS.skyline, ilustrativa: undefined },
      orden: 2,
    },
    {
      ...base,
      id: "b-ejemplo-documentos",
      titulo: "Ejemplo: consulta los documentos",
      texto: "Banner de ejemplo en tono claro, programado para empezar dentro de tres días.",
      enlace: { href: "/documentos", etiqueta: "Ver el repositorio" },
      tono: "calido",
      orden: 3,
      vigencia: { desde: dia(ahora, 3), hasta: dia(ahora, 30) },
    },
    {
      ...base,
      id: "b-ejemplo-vencido",
      titulo: "Ejemplo: jornada que ya pasó",
      texto: "Banner de ejemplo cuya vigencia terminó: ya no se muestra en el portal.",
      enlace: { href: "/noticias", etiqueta: "Ver más" },
      tono: "tinta",
      orden: 4,
      vigencia: { desde: dia(ahora, -20), hasta: dia(ahora, -2) },
    },
  ]);
}

/**
 * Versión 1 de los textos legales: el contenido provisional que hoy muestra el portal. El texto
 * definitivo lo prepara el equipo de documentación y pasa por revisión legal; no se inventa.
 */
export function textosLegalesDemo(alcaldiaId: string): VersionTextoLegal[] {
  const lista = (items: string[]) =>
    `<p>Contenido provisional: el texto definitivo está en preparación por el equipo de documentación y pasará por revisión legal antes de publicarse.</p><h2>Qué incluirá</h2><ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
  const base = {
    alcaldiaId,
    version: 1,
    nota: "Versión inicial provisional.",
    publicadoPorId: "u-admin-iri",
    publicadoEl: "2026-10-17T12:00:00.000Z",
  };
  return [
    {
      ...base,
      id: "texto-terminos-1",
      tipo: "TERMINOS",
      html: lista([
        "Qué es el portal PDUL YA y qué trámites no gestiona (son de la DPCU).",
        "Requisitos para crear una cuenta como persona natural u organización.",
        "Cómo se reciben, revisan y responden las opiniones y propuestas, y qué significa el folio.",
        "Por qué un aporte enviado no se puede editar ni eliminar.",
        "Normas de convivencia y motivos para suspender una cuenta.",
      ]),
    },
    {
      ...base,
      id: "texto-politica-1",
      tipo: "POLITICA_DATOS",
      html: lista([
        "Qué datos se piden (identidad, contacto y documentos) y para qué se usan.",
        "Quién puede ver tus documentos: solo el personal revisor de la alcaldía.",
        "Cuándo se muestra tu nombre en un aporte publicado (solo si respondes que sí).",
        "Cuánto tiempo se conservan los datos y cómo solicitar la baja de la cuenta.",
      ]),
    },
  ];
}
