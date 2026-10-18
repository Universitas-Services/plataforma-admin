import { notFound } from "next/navigation";

/*
 * Cualquier ruta desconocida dentro del panel cae aquí para mostrar la 404 con el marco
 * (línea y franja) y las estaciones del usuario. Con Cache Components, la ruta dinámica
 * necesita al menos un parámetro en generateStaticParams.
 */
export function generateStaticParams() {
  return [{ resto: ["fuera-de-servicio"] }];
}

export default function Desconocida() {
  notFound();
}
