import { LIMITES_MEDIO, type ClaseMedio, type TipoMedio } from "@/lib/contenido/tipos";

/*
 * Subida de medios a /api/medios con XMLHttpRequest: fetch todavía no informa el progreso de
 * lo que se envía, y para un video de 50 MB la barra hace falta.
 */

export type MedioSubido = {
  id: string;
  url: string;
  tipo: TipoMedio;
  nombre: string;
  peso: number;
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

export function subirMedio(
  archivo: File,
  clase: ClaseMedio,
  onProgreso?: (fraccion: number) => void,
): Promise<ResultadoSubida> {
  return new Promise((resolver) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/medios");
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgreso?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      const r = xhr.response as (MedioSubido & { error?: string }) | null;
      if (xhr.status === 201 && r) resolver({ ok: true, ...r });
      else resolver({ ok: false, error: r?.error ?? "No se pudo subir el archivo." });
    };
    xhr.onerror = () =>
      resolver({ ok: false, error: "Se cortó la conexión mientras subía el archivo." });
    const datos = new FormData();
    datos.set("clase", clase);
    datos.set("archivo", archivo);
    xhr.send(datos);
  });
}
