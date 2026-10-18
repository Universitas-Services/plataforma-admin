/*
 * Utilidades de imagen del navegador (recorte con react-easy-crop y medidas). Solo cliente.
 */

export type AreaRecorte = { x: number; y: number; width: number; height: number };

/**
 * Dibuja el área elegida en un lienzo de `ancho` px (el alto sale de la proporción del área)
 * y la devuelve como archivo. JPEG para fotos (pesa menos), PNG si hay que conservar transparencia.
 */
export async function recortar(
  url: string,
  area: AreaRecorte,
  {
    ancho,
    tipo = "image/jpeg",
    nombre = "imagen",
  }: { ancho: number; tipo?: string; nombre?: string },
): Promise<{ archivo: File; ancho: number; alto: number }> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const destinoAncho = Math.min(ancho, Math.round(area.width));
  const destinoAlto = Math.round((destinoAncho * area.height) / area.width);
  const lienzo = document.createElement("canvas");
  lienzo.width = destinoAncho;
  lienzo.height = destinoAlto;
  const ctx = lienzo.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, destinoAncho, destinoAlto);
  const blob = await new Promise<Blob | null>((r) => lienzo.toBlob(r, tipo, 0.86));
  if (!blob) throw new Error("No se pudo recortar la imagen.");
  const ext = tipo === "image/png" ? "png" : "jpg";
  return {
    archivo: new File([blob], `${nombre.replace(/\.[^.]+$/, "")}.${ext}`, { type: tipo }),
    ancho: destinoAncho,
    alto: destinoAlto,
  };
}

/** Ancho y alto reales de una imagen. */
export async function medidas(url: string) {
  const img = new Image();
  img.src = url;
  await img.decode();
  return { ancho: img.naturalWidth, alto: img.naturalHeight };
}
