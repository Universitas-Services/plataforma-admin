import type { ArchivoAporte, Participacion, PasoParticipacion } from "./tipos";

/*
 * Participaciones de ejemplo (no son reales) para la bandeja del Revisor. Los autores, los
 * textos y los puntos del mapa son ficticios (puntos aproximados dentro de Iribarren); las fotos
 * son de Wikimedia Commons (créditos en public/ejemplos).
 */

const HORA = 3_600_000;

const foto = (archivo: string, credito: string, tamano: number): ArchivoAporte => ({
  nombre: archivo,
  mime: "image/jpeg",
  tamano,
  url: `/ejemplos/${archivo}`,
  credito,
});

const PDF_EJEMPLO: ArchivoAporte = {
  nombre: "soporte-propuesta-ejemplo.pdf",
  mime: "application/pdf",
  tamano: 3355,
  url: "/ejemplos/minuta-mesa-tecnica-catedral-ejemplo.pdf",
};

const natural = (nombre: string, cedula: string, correo: string, telefono: string) => ({
  tipo: "NATURAL" as const,
  nombre,
  cedula,
  correo,
  telefono,
  documentos: [{ tipo: "IDENTIDAD" as const, nombre: "cedula.pdf", version: 1 }],
});

/** La revisora de los ejemplos (revisor@iribarren.test). */
const REVISORA = { id: "u-revisor-iri", nombre: "María Fernández" };

/** Historial a partir de pasos «hace N horas». */
function pasos(ahora: number, lista: [PasoParticipacion["estado"], number, string?][]) {
  return lista.map(([estado, horasAtras, comentario]) => ({
    estado,
    fecha: new Date(ahora - horasAtras * HORA).toISOString(),
    por: estado === "PENDIENTE" ? undefined : REVISORA,
    comentario,
  }));
}

type Base = Omit<Participacion, "estado" | "recibidaEl" | "notas" | "historial"> & {
  historial: PasoParticipacion[];
};

function armar(b: Base): Participacion {
  return {
    ...b,
    estado: b.historial.at(-1)!.estado,
    recibidaEl: b.historial[0]!.fecha,
    notas: [],
    ejemplo: true,
  };
}

export function participacionesDemo(ahora: number): Participacion[] {
  const lista: Base[] = [
    {
      folio: "IRI-2026-0031",
      alcaldiaId: "iribarren",
      tipo: "PROPUESTA_FORMAL",
      ubicacion: { lat: 10.0661, lng: -69.3209 },
      parroquia: "Catedral",
      sector: "Centro histórico, avenida 20",
      categoriaTecnica: "Vialidad y Transporte",
      descripcion:
        "Propongo semaforizar el cruce de la avenida 20 con la calle 30 y ampliar las aceras del tramo: en hora pico los peatones cruzan sin protección. Adjunto un croquis con la ubicación propuesta. (Ejemplo)",
      imagenes: [foto("catedral-metropolitana.jpg", "Rube96pinto, CC BY-SA 4.0", 420_000)],
      soporte: PDF_EJEMPLO,
      mostrarNombre: true,
      autor: {
        ...natural("Ana María Pérez", "V-12345678", "ana@ejemplo.com", "0414-1234567"),
        ocupacion: "Profesional Independiente",
      },
      historial: pasos(ahora, [["PENDIENTE", 6 * 24 + 3]]),
    },
    {
      folio: "IRI-2026-0033",
      alcaldiaId: "iribarren",
      tipo: "OPINION_GENERAL",
      parroquia: "El Cují",
      sector: "Urb. La Rosaleda",
      categoriaTecnica: "Servicios Públicos y Redes",
      descripcion:
        "Los cortes de agua son frecuentes los fines de semana. Antes de autorizar nuevos conjuntos residenciales en la zona, el diagnóstico debería revisar la capacidad del acueducto. (Ejemplo)",
      imagenes: [],
      mostrarNombre: false,
      autor: natural("José Rodríguez", "V-14567890", "jose@ejemplo.com", "0424-5550101"),
      historial: pasos(ahora, [["PENDIENTE", 5 * 24 + 1]]),
    },
    {
      folio: "IRI-2026-0036",
      alcaldiaId: "iribarren",
      tipo: "OPINION_NOTICIA",
      noticia: {
        slug: "primera-mesa-tecnica-concejo-alcaldia",
        titulo:
          "Concejo Municipal y Alcaldía instalan primera mesa técnica para avanzar en el nuevo PDUL de Iribarren",
      },
      parroquia: "Juárez",
      sector: "Los Cardones",
      categoriaTecnica: "Equipamiento Urbano",
      descripcion:
        "Celebramos la mesa técnica. Pedimos que se incluya a los consejos comunales de Juárez en las próximas sesiones: el terreno baldío de la calle 3 puede ser una plaza con cancha. (Ejemplo)",
      imagenes: [
        foto("skyline-oeste.jpg", "Lacamaradefran, CC BY-SA 4.0", 510_000),
        foto("obelisco-2005.jpg", "Andres Mendez, CC BY-SA 2.0", 380_000),
      ],
      mostrarNombre: true,
      autor: {
        tipo: "ORGANIZACION",
        nombre: "Consejo Comunal Los Cardones",
        correo: "contacto@cardones.org",
        rif: "C-29876543-7",
        tipoEntidad: "Consejos comunales / Comunas",
        telefono: "0251-2345678",
        representante: {
          nombre: "José Luis Colmenárez",
          cedula: "V-11222333",
          condicion: "Vocero o vocera oficial",
        },
        documentos: [
          { tipo: "ENTIDAD", nombre: "registro-consejo-comunal.pdf", version: 1 },
          { tipo: "REPRESENTACION", nombre: "acta-asamblea-voceros.pdf", version: 1 },
        ],
      },
      historial: pasos(ahora, [
        ["PENDIENTE", 6 * 24],
        ["PUBLICADA", 4 * 24 + 2],
      ]),
    },
    {
      folio: "IRI-2026-0040",
      alcaldiaId: "iribarren",
      tipo: "PROPUESTA_FORMAL",
      ubicacion: { lat: 10.0716, lng: -69.2868 },
      parroquia: "Concepción",
      sector: "Avenida Lara",
      categoriaTecnica: "Zonificación y Uso de Suelo",
      descripcion:
        "Propuesta de uso mixto para el eje de la avenida Lara: comercio en planta baja y vivienda en altura, con retiros que permitan arborizar las aceras. El documento de soporte detalla el tramo. (Ejemplo)",
      imagenes: [],
      soporte: PDF_EJEMPLO,
      mostrarNombre: true,
      autor: natural("Luis Mendoza", "V-23456789", "luis@ejemplo.com", "0416-5550202"),
      historial: pasos(ahora, [["PENDIENTE", 2 * 24 + 5]]),
    },
    {
      folio: "IRI-2026-0042",
      alcaldiaId: "iribarren",
      tipo: "OPINION_GENERAL",
      parroquia: "Santa Rosa",
      sector: "Santa Rosa centro",
      categoriaTecnica: "Medio Ambiente y Riesgos",
      descripcion:
        "En época de lluvia la quebrada se desborda y afecta varias calles. El estudio de riesgos debería priorizar esta zona y prever drenajes. (Ejemplo)",
      imagenes: [foto("teatro-juares.jpg", "Wilfredor, CC BY-SA 3.0", 350_000)],
      video: { fuente: "INSTAGRAM", url: "https://www.instagram.com/p/DdS3mOfFocQ/" },
      mostrarNombre: true,
      autor: natural("Rosa Gutiérrez", "E-81234567", "rosa@ejemplo.com", "0412-5550303"),
      historial: pasos(ahora, [["PENDIENTE", 2 * 24]]),
    },
    {
      folio: "IRI-2026-0045",
      alcaldiaId: "iribarren",
      tipo: "OPINION_GENERAL",
      parroquia: "Tamaca",
      sector: "Tamaca, casco central",
      categoriaTecnica: "Patrimonio y Renovación Urbana",
      descripcion:
        "Las fachadas del casco de Tamaca se están perdiendo. El plan debería proteger su imagen y apoyar a los propietarios para restaurarlas. (Ejemplo)",
      imagenes: [],
      mostrarNombre: true,
      autor: natural("Carla Torres", "V-34567890", "carla@ejemplo.com", "0414-5550404"),
      historial: pasos(ahora, [["PENDIENTE", 2]]),
    },
    {
      folio: "IRI-2026-0021",
      alcaldiaId: "iribarren",
      tipo: "PROPUESTA_FORMAL",
      ubicacion: { lat: 10.0843, lng: -69.3355 },
      parroquia: "Unión",
      sector: "Barrio El Garabatal",
      categoriaTecnica: "Equipamiento Urbano",
      descripcion:
        "La plaza del sector no tiene iluminación ni bancos. Proponemos su rehabilitación con alumbrado LED, mobiliario y una cancha múltiple. (Ejemplo)",
      imagenes: [foto("obelisco-2005.jpg", "Andres Mendez, CC BY-SA 2.0", 380_000)],
      soporte: PDF_EJEMPLO,
      mostrarNombre: true,
      autor: natural("María Fernanda Silva", "V-17654321", "mafer@ejemplo.com", "0424-5550505"),
      historial: pasos(ahora, [
        ["PENDIENTE", 12 * 24],
        ["EN_REVISION", 10 * 24],
        [
          "APROBADA",
          7 * 24,
          "Se incorpora al inventario de espacios públicos de la parroquia Unión.",
        ],
      ]),
    },
    {
      folio: "IRI-2026-0018",
      alcaldiaId: "iribarren",
      tipo: "OPINION_GENERAL",
      parroquia: "Ana Soto",
      sector: "Urb. Bararida",
      categoriaTecnica: "Vialidad y Transporte",
      descripcion:
        "Las rutas de transporte no llegan a la parte alta de la urbanización después de las 7 de la noche. (Ejemplo)",
      imagenes: [],
      mostrarNombre: false,
      autor: natural("Pedro Álvarez", "V-15555444", "pedro@ejemplo.com", "0414-5550606"),
      historial: pasos(ahora, [["PENDIENTE", 14 * 24]]),
    },
    {
      folio: "IRI-2026-0015",
      alcaldiaId: "iribarren",
      tipo: "PROPUESTA_FORMAL",
      ubicacion: { lat: 10.1418, lng: -69.3731 },
      parroquia: "Buena Vista",
      sector: "Vía a Duaca",
      categoriaTecnica: "Zonificación y Uso de Suelo",
      descripcion:
        "Proponemos reservar suelo para un centro de servicios parroquial sobre la vía a Duaca, donde hoy los vecinos deben viajar al centro para trámites y salud. (Ejemplo)",
      imagenes: [foto("skyline-oeste.jpg", "Lacamaradefran, CC BY-SA 4.0", 510_000)],
      soporte: PDF_EJEMPLO,
      mostrarNombre: true,
      autor: natural("Daniela Pérez", "V-19876543", "daniela@ejemplo.com", "0416-5550707"),
      historial: pasos(ahora, [
        ["PENDIENTE", 18 * 24],
        ["EN_REVISION", 16 * 24],
        ["APROBADA", 13 * 24, "Insumo para las mesas de concertación de la Fase II."],
        ["PUBLICADA", 12 * 24],
      ]),
    },
    {
      folio: "IRI-2026-0012",
      alcaldiaId: "iribarren",
      tipo: "PROPUESTA_FORMAL",
      ubicacion: { lat: 10.0352, lng: -69.3168 },
      parroquia: "Águedo Felipe Alvarado",
      sector: "Sector Las Tunas",
      categoriaTecnica: "Patrimonio y Renovación Urbana",
      descripcion:
        "Pido que se definan ya las alturas máximas de los edificios del sector para frenar las construcciones. (Ejemplo)",
      imagenes: [],
      mostrarNombre: true,
      autor: natural("Andrés Colmenárez", "V-20111222", "andres@ejemplo.com", "0424-5550808"),
      historial: [
        ...pasos(ahora, [
          ["PENDIENTE", 20 * 24],
          ["EN_REVISION", 19 * 24],
        ]),
        {
          estado: "RECHAZADA",
          fecha: new Date(ahora - 17 * 24 * HORA).toISOString(),
          por: REVISORA,
          motivo: "FUERA_DE_ALCANCE",
          comentario:
            "La definición de alturas corresponde a la Fase III (construcción del plan). Te invitamos a enviarla de nuevo cuando se abra esa fase.",
        },
      ],
    },
  ];
  return lista.map(armar);
}
