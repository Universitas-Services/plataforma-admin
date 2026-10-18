import Link from "next/link";

export const ESTADOS_CHIP = [
  ["PENDIENTE", "Pendientes"],
  ["EN_REVISION", "En revisión"],
  ["APROBADA", "Aprobadas"],
  ["RECHAZADA", "Rechazadas"],
  ["PUBLICADA", "Publicadas"],
] as const;

export type EstadoChip = (typeof ESTADOS_CHIP)[number][0];

/**
 * Conteos por estado como filtros de una lista (participaciones, noticias…). Son enlaces con
 * `?estado=` que conservan los demás filtros: el activo se marca con aria-current y relleno;
 * sin filtro, ninguno aparece presionado. `final` es el estado que lleva el punto turquesa.
 */
export function ChipsEstado<E extends string = EstadoChip>({
  conteos,
  activo,
  q,
  estados = ESTADOS_CHIP as unknown as readonly (readonly [E, string])[],
  ruta = "/participaciones",
  conservar = {},
  final = "PUBLICADA",
  parametro = "estado",
}: {
  conteos: Record<string, number>;
  activo?: E;
  q?: string;
  estados?: readonly (readonly [E, string])[];
  ruta?: string;
  /** Otros filtros de la URL que se mantienen al cambiar de estado. */
  conservar?: Record<string, string | undefined>;
  final?: string;
  /** Nombre del parámetro de la URL (banners usan «vigencia»). */
  parametro?: string;
}) {
  const href = (e: E) => {
    const p = new URLSearchParams();
    if (e !== activo) p.set(parametro, e);
    if (q) p.set("q", q);
    for (const [k, v] of Object.entries(conservar)) if (v) p.set(k, v);
    const s = p.toString();
    return `${ruta}${s ? `?${s}` : ""}`;
  };
  return (
    <ul
      aria-label="Filtrar por estado"
      className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden"
    >
      {estados.map(([clave, texto]) => {
        const on = clave === activo;
        return (
          <li key={clave} className="shrink-0">
            <Link
              href={href(clave)}
              aria-current={on ? "true" : undefined}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-[0.9375rem] font-medium whitespace-nowrap transition-colors duration-150 ${
                on
                  ? "border-tinta bg-tinta text-papel hover:bg-cuerpo"
                  : "border-linea text-tinta hover:border-tenue"
              }`}
            >
              {clave === final && (
                <span aria-hidden="true" className="size-2 rounded-full bg-turquesa" />
              )}
              {texto} <strong className="font-bold">{conteos[clave] ?? 0}</strong>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
