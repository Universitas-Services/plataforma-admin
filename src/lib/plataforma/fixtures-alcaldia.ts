import { CATEGORIAS, DOC_CATEGORIAS } from "@/lib/contenido/tipos";
import type { Ciudadano, ItemCatalogo, Participacion, Proceso, TipoCatalogo } from "./tipos";

/*
 * Datos de ejemplo de la capa de alcaldía: ciudadanos (los autores de las participaciones de
 * ejemplo y algunos sin aportes), catálogos y fases del proceso. No son datos reales.
 */

const DIA = 86_400_000;

/** Catálogos iniciales de Iribarren: los mismos valores que usa el portal (Propuesta v3). */
const CATALOGO_IRIBARREN: Record<TipoCatalogo, string[]> = {
  parroquias: [
    "Concepción",
    "Catedral",
    "El Cují",
    "Tamaca",
    "Ana Soto",
    "Santa Rosa",
    "Unión",
    "Juárez",
    "Buena Vista",
    "Águedo Felipe Alvarado",
  ],
  categoriasTecnicas: [
    "Zonificación y Uso de Suelo",
    "Servicios Públicos y Redes",
    "Vialidad y Transporte",
    "Equipamiento Urbano",
    "Medio Ambiente y Riesgos",
    "Patrimonio y Renovación Urbana",
  ],
  categoriasNoticias: [...CATEGORIAS],
  categoriasDocumentos: [...DOC_CATEGORIAS],
  ocupaciones: [
    "Comerciante",
    "Profesional Independiente",
    "Estudiante",
    "Empleado Público",
    "Empleado Privado",
    "Ama de Casa",
    "Jubilado/Pensionado",
    "Otro",
  ],
  tiposOrganizacion: [
    "Cámaras empresariales",
    "Colegios profesionales / Gremios",
    "Universidades / Centros de investigación",
    "Consejos comunales / Comunas",
    "Comités de Tierras Urbanas (CTU)",
    "Asociaciones civiles / ONG / Fundaciones",
    "Empresas / Promotores inmobiliarios",
    "Otros",
  ],
};

const lista = (prefijo: string, nombres: string[]): ItemCatalogo[] =>
  nombres.map((nombre, i) => ({ id: `${prefijo}-${i + 1}`, nombre, activo: true }));

/** Catálogos de una alcaldía: Iribarren con sus valores; las demás, sin parroquias aún. */
export function catalogosDemo(alcaldiaId: string): Record<TipoCatalogo, ItemCatalogo[]> {
  const base = { ...CATALOGO_IRIBARREN };
  if (alcaldiaId !== "iribarren") base.parroquias = [];
  return Object.fromEntries(
    Object.entries(base).map(([tipo, nombres]) => [tipo, lista(`${alcaldiaId}-${tipo}`, nombres)]),
  ) as Record<TipoCatalogo, ItemCatalogo[]>;
}

/** Los 7 hitos del proceso, como el termómetro del portal. */
export function procesoDemo(): Proceso {
  return {
    actual: 1,
    fases: [
      {
        id: "decreto",
        nombre: "Decreto del alcalde",
        descripcion: "El Decreto 48-2026 abrió formalmente la formulación del nuevo PDUL.",
        inicio: "2026-09-11",
        fin: "2026-09-14",
      },
      {
        id: "plan-trabajo",
        nombre: "Aprobación del plan de trabajo",
        descripcion: "Se define la ruta técnica, los equipos y el cronograma del plan.",
        inicio: "2026-09-15",
      },
      {
        id: "diagnostico",
        nombre: "Diagnóstico",
        descripcion: "Levantaremos cómo está la ciudad hoy, parroquia por parroquia.",
      },
      {
        id: "formulacion",
        nombre: "Formulación",
        descripcion: "Las propuestas técnicas y ciudadanas se convertirán en plan.",
      },
      {
        id: "consulta",
        nombre: "Consulta pública",
        descripcion: "60 días para revisar el borrador y presentar observaciones.",
        estadoSiguiente: "PROXIMAMENTE",
      },
      {
        id: "camara",
        nombre: "Aprobación en Cámara",
        descripcion: "El Concejo Municipal discute y sanciona la ordenanza.",
      },
      {
        id: "vigencia",
        nombre: "Vigencia",
        descripcion: "El plan regirá el crecimiento de la ciudad durante 20 años, hasta 2046.",
        estadoSiguiente: "FUTURO",
      },
    ],
  };
}

/**
 * Ciudadanos: cada autor de las participaciones de ejemplo (por correo) más algunos registrados
 * sin aportes, con el perfil incompleto o la membresía suspendida.
 */
export function ciudadanosDemo(participaciones: Participacion[], ahora: number): Ciudadano[] {
  const vistos = new Map<string, Ciudadano>();
  for (const p of participaciones) {
    const clave = `${p.alcaldiaId}:${p.autor.correo}`;
    if (vistos.has(clave)) continue;
    const a = p.autor;
    vistos.set(clave, {
      id: `c-${vistos.size + 1}`,
      alcaldiaId: p.alcaldiaId,
      tipo: a.tipo,
      nombre: a.nombre,
      correo: a.correo,
      cedula: a.cedula,
      rif: a.rif,
      tipoEntidad: a.tipoEntidad,
      telefono: a.telefono,
      ocupacion: a.ocupacion,
      representante: a.representante,
      perfilCompleto: true,
      documentos: a.documentos,
      membresia: {
        estado: "ACTIVA",
        desde: new Date(Date.parse(p.recibidaEl) - 3 * DIA).toISOString(),
      },
      registradoEl: new Date(Date.parse(p.recibidaEl) - 3 * DIA).toISOString(),
      ejemplo: true,
    });
  }
  const extra: Omit<Ciudadano, "id">[] = [
    {
      alcaldiaId: "iribarren",
      tipo: "NATURAL",
      nombre: "Gabriel Torrealba",
      correo: "gabriel@ejemplo.com",
      cedula: "V-21345678",
      perfilCompleto: false,
      documentos: [],
      membresia: { estado: "ACTIVA", desde: new Date(ahora - 2 * DIA).toISOString() },
      registradoEl: new Date(ahora - 2 * DIA).toISOString(),
      ejemplo: true,
    },
    {
      alcaldiaId: "iribarren",
      tipo: "ORGANIZACION",
      nombre: "Cámara de Comercio de Lara",
      correo: "contacto@camaralara.org",
      rif: "J-07013380-5",
      tipoEntidad: "Cámaras empresariales",
      telefono: "0251-5550001",
      perfilCompleto: false,
      documentos: [{ tipo: "ENTIDAD", nombre: "acta-constitutiva.pdf", version: 1 }],
      membresia: { estado: "ACTIVA", desde: new Date(ahora - 9 * DIA).toISOString() },
      registradoEl: new Date(ahora - 9 * DIA).toISOString(),
      ejemplo: true,
    },
    {
      alcaldiaId: "iribarren",
      tipo: "NATURAL",
      nombre: "Ricardo Montes",
      correo: "ricardo@ejemplo.com",
      cedula: "V-16222111",
      telefono: "0414-5551212",
      perfilCompleto: true,
      documentos: [{ tipo: "IDENTIDAD", nombre: "cedula.jpg", version: 2 }],
      membresia: {
        estado: "SUSPENDIDA",
        desde: new Date(ahora - 4 * DIA).toISOString(),
        motivo: "Envió aportes con lenguaje ofensivo de forma reiterada (ejemplo).",
      },
      registradoEl: new Date(ahora - 30 * DIA).toISOString(),
      ejemplo: true,
    },
  ];
  return [...vistos.values(), ...extra.map((c, i) => ({ ...c, id: `c-${vistos.size + i + 1}` }))];
}
