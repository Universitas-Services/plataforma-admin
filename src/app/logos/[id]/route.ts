import { logoDe } from "@/lib/plataforma/servicio";
import { almacen, getContexto } from "@/lib/plataforma/sesion";

/*
 * Logo de una alcaldía desde la API simulada. `?borrador=1` sirve el del asistente de
 * onboarding y solo a quien lo está configurando. Los SVG van con una CSP que bloquea scripts:
 * la sanitización real la hará plataforma-api.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const borrador = new URL(request.url).searchParams.has("borrador");
  const c = await getContexto();
  if (!c || (borrador && c.alcaldia?.id !== id)) return new Response(null, { status: 404 });

  const logo = logoDe(almacen(), id, borrador);
  if (!logo) return new Response(null, { status: 404 });
  return new Response(new Blob([new Uint8Array(logo.bytes)]), {
    headers: {
      "Content-Type": logo.meta.tipo,
      "X-Content-Type-Options": "nosniff",
      // La URL lleva la versión (?v=), así que puede guardarse; el borrador nunca.
      "Cache-Control": borrador ? "no-store" : "private, max-age=31536000, immutable",
      ...(logo.meta.tipo === "image/svg+xml" && {
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      }),
    },
  });
}
