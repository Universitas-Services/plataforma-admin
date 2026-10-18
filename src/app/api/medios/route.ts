import { guardarMedio } from "@/lib/plataforma/contenido";
import { almacen, idSesion } from "@/lib/plataforma/sesion";
import { CLASES_MEDIO, LIMITES_MEDIO, type ClaseMedio } from "@/lib/contenido/tipos";

/*
 * Subida de medios del editor (backlog 1.13 y 1.17: POST /admin/media). Va por route handler y
 * no por Server Action para que el navegador muestre el progreso (XMLHttpRequest.upload).
 * Responde JSON con la URL del medio o el motivo del rechazo, ya en español.
 */

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
  const archivo = datos?.get("archivo");
  const clase = datos?.get("clase");
  if (!(archivo instanceof File) || !CLASES_MEDIO.includes(clase as ClaseMedio))
    return Response.json({ error: "No llegó el archivo. Vuelve a intentarlo." }, { status: 400 });

  const c = clase as ClaseMedio;
  const r = guardarMedio(
    almacen(),
    await idSesion(),
    c,
    archivo.name,
    new Uint8Array(await archivo.arrayBuffer()),
  );
  switch (r.estado) {
    case "OK":
      return Response.json(r, { status: 201 });
    case "SIN_SESION":
      return Response.json(
        { error: "Tu sesión terminó. Vuelve a iniciar sesión." },
        { status: 401 },
      );
    case "SIN_PERMISO":
      return Response.json({ error: "Tu rol no puede subir contenido." }, { status: 403 });
    case "VACIO":
      return Response.json({ error: "El archivo está vacío." }, { status: 422 });
    case "MUY_GRANDE":
      return Response.json(
        { error: `El archivo supera ${enMb(LIMITES_MEDIO[c].max)}.` },
        { status: 413 },
      );
    case "FORMATO":
      return Response.json({ error: `El archivo no es ${NOMBRE_CLASE[c]}.` }, { status: 415 });
  }
}
