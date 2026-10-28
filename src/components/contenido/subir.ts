import { LIMITES_MEDIO, type ClaseMedio, type TipoMedio } from "@/lib/contenido/tipos";
import { destinoSubidaAccion } from "@/lib/plataforma/acciones-medios";

/*
 * Subida de medios con XMLHttpRequest: fetch todavía no informa el progreso de lo que se envía,
 * y para un video de 30 MB la barra hace falta. El destino lo decide el servidor: con
 * plataforma-api, un ticket de un solo uso para subir directo a la API (guía R6), sin cookies;
 * sin ella, el route simulado /api/medios. Los dos responden la misma forma.
 */

/** Lo que responde la subida (la API y el route simulado, con la misma forma). */
export type MedioSubido = {
  id: string;
  url: string;
  tipo: TipoMedio;
  nombre: string;
  pesoBytes: number;
  /** Medidas de la imagen, si la API las calculó. */
  ancho?: number;
  alto?: number;
};

export type ResultadoSubida = ({ ok: true } & MedioSubido) | { ok: false; error: string };

const MB = 1024 * 1024;
export const pesoLegible = (b: number) =>
  b >= MB
    ? `${(b / MB).toLocaleString("es-VE", { maximumFractionDigits: 1 })} MB`
    : `${Math.max(1, Math.round(b / 1024))} KB`;

const EXTENSIONES: Record<ClaseMedio, string> = {
  imagen: "JPG, PNG o WebP",
  pdf: "PDF",
  video: "MP4 o WebM",
  subtitulos: "WebVTT (.vtt)",
};

/** Ayuda para la zona de archivos: formatos y peso máximo de cada clase. */
export const ayudaClase = (c: ClaseMedio) =>
  `${EXTENSIONES[c]} de hasta ${pesoLegible(LIMITES_MEDIO[c].max)}.`;

/** Comprobación previa en el navegador (el servidor vuelve a mirar la firma del archivo). */
export function revisarArchivo(f: File, clase: ClaseMedio): string | undefined {
  const { tipos, max } = LIMITES_MEDIO[clase];
  // Algunos sistemas no informan el tipo de un .vtt.
  const tipo = f.type || (f.name.toLowerCase().endsWith(".vtt") ? "text/vtt" : "");
  if (!tipos.includes(tipo as TipoMedio)) return `«${f.name}» no es ${EXTENSIONES[clase]}.`;
  if (f.size > max)
    return `«${f.name}» pesa ${pesoLegible(f.size)}: el máximo es ${pesoLegible(max)}.`;
  return undefined;
}

/** Mensaje de un error del formato único { code, message, details }. */
function mensajeSubida(status: number, r: { code?: string; message?: string } | null) {
  switch (r?.code) {
    case "FILE_TOO_LARGE":
      return "El archivo supera el peso máximo.";
    case "INVALID_FILE":
      return r.message || "El archivo no es válido.";
    case "TOKEN_EXPIRED":
    case "INVALID_TOKEN":
      return "El permiso de subida venció. Vuelve a elegir el archivo.";
    case "FORBIDDEN":
      return "Tu rol no puede subir contenido.";
    case "UNAUTHORIZED":
      return "Tu sesión terminó. Vuelve a iniciar sesión.";
  }
  return status >= 500 || !r?.message ? "No se pudo subir el archivo." : r.message;
}

export async function subirMedio(
  archivo: File,
  clase: ClaseMedio,
  onProgreso?: (fraccion: number) => void,
): Promise<ResultadoSubida> {
  const destino = await destinoSubidaAccion(clase, archivo.name, archivo.size).catch(() => ({
    ok: false as const,
    error: "No pudimos conectar con el servidor.",
  }));
  if (!destino.ok) return destino;
  return new Promise((resolver) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", destino.url);
    xhr.responseType = "json";
    // El ticket de la API va sin cookies ni Authorization: el enlace ya autoriza la subida.
    xhr.withCredentials = false;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgreso?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      const r = xhr.response as (MedioSubido & { code?: string; message?: string }) | null;
      if (xhr.status === 201 && r?.url) resolver({ ok: true, ...r });
      else resolver({ ok: false, error: mensajeSubida(xhr.status, r) });
    };
    xhr.onerror = () =>
      resolver({ ok: false, error: "Se cortó la conexión mientras subía el archivo." });
    const datos = new FormData();
    if (!destino.api) datos.set("clase", clase);
    datos.set("file", archivo);
    xhr.send(datos);
  });
}
