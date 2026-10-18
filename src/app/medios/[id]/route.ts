import { medioDe } from "@/lib/plataforma/contenido";
import { almacen, idSesion } from "@/lib/plataforma/sesion";

/*
 * Archivos subidos desde el editor de contenido, solo para quien opera en su alcaldía. El id
 * no cambia nunca, así que la respuesta puede guardarse. Atiende `Range` para que el video se
 * pueda adelantar sin descargarlo entero.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = medioDe(almacen(), await idSesion(), id);
  if (!m) return new Response(null, { status: 404 });

  const cabeceras = {
    "Content-Type": m.tipo,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(m.nombre)}`,
  };
  const total = m.bytes.length;
  const rango = request.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (rango && (rango[1] || rango[2])) {
    const inicio = rango[1] ? Number(rango[1]) : Math.max(0, total - Number(rango[2]));
    const fin = rango[1] && rango[2] ? Math.min(Number(rango[2]), total - 1) : total - 1;
    if (inicio > fin || inicio >= total)
      return new Response(null, {
        status: 416,
        headers: { ...cabeceras, "Content-Range": `bytes */${total}` },
      });
    return new Response(new Blob([m.bytes.slice(inicio, fin + 1)]), {
      status: 206,
      headers: { ...cabeceras, "Content-Range": `bytes ${inicio}-${fin}/${total}` },
    });
  }
  return new Response(new Blob([new Uint8Array(m.bytes)]), { headers: cabeceras });
}
