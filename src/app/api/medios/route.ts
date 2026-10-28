import { guardarMedio } from "@/lib/plataforma/contenido";
import { almacen, idSesion } from "@/lib/plataforma/sesion";
import { CLASES_MEDIO, LIMITES_MEDIO, type ClaseMedio } from "@/lib/contenido/tipos";

/*
 * Subida de medios simulada (sin plataforma-api). Imita POST /admin/media de la API (guía R6):
 * campo `file` (más `clase`), respuesta { id, url, nombre, tipo, pesoBytes } y errores con el
 * formato único { statusCode, code, message }, ya en español. Va por route handler y no por
 * Server Action para que el navegador muestre el progreso (XMLHttpRequest.upload).
 */

const error = (statusCode: number, code: string, message: string) =>
  Response.json({ statusCode, code, message }, { status: statusCode });

const MB = 1024 * 1024;
const enMb = (b: number) => (b >= MB ? `${b / MB} MB` : `${Math.round(b / 1024)} KB`);

const NOMBRE_CLASE: Record<ClaseMedio, string> = {
  imagen: "una imagen JPG, PNG o WebP",
  pdf: "un PDF",
  video: "un video MP4 o WebM",
  subtitulos: "un archivo de subtítulos WebVTT (.vtt)",
};

export async function POST(request: Request) {
  const datos = await request.formData().catch(() => null);
  const archivo = datos?.get("file");
  const clase = datos?.get("clase");
  if (!(archivo instanceof File) || !CLASES_MEDIO.includes(clase as ClaseMedio))
    return error(400, "VALIDATION_ERROR", "No llegó el archivo. Vuelve a intentarlo.");

  const c = clase as ClaseMedio;
  const r = guardarMedio(
    almacen(),
    await idSesion(),
    c,
    archivo.name,
    new Uint8Array(await archivo.arrayBuffer()),
  );
  switch (r.estado) {
    case "OK": {
      const { estado: _estado, ...medio } = r;
      return Response.json(medio, { status: 201 });
    }
    case "SIN_SESION":
      return error(401, "UNAUTHORIZED", "Tu sesión terminó. Vuelve a iniciar sesión.");
    case "SIN_PERMISO":
      return error(403, "FORBIDDEN", "Tu rol no puede subir contenido.");
    case "VACIO":
      return error(400, "INVALID_FILE", "El archivo está vacío.");
    case "MUY_GRANDE":
      return error(413, "FILE_TOO_LARGE", `El archivo supera ${enMb(LIMITES_MEDIO[c].max)}.`);
    case "FORMATO":
      return error(400, "INVALID_FILE", `El archivo no es ${NOMBRE_CLASE[c]}.`);
  }
}
