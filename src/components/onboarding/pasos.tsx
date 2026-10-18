import Link from "next/link";

export const PASOS = [
  { clave: "logo", titulo: "Logo" },
  { clave: "colores", titulo: "Colores" },
  { clave: "lema", titulo: "Lema" },
  { clave: "resumen", titulo: "Resumen" },
] as const;

export type Paso = (typeof PASOS)[number]["clave"];

/**
 * Los pasos del asistente como una línea con cuatro estaciones: las hechas se pueden volver a
 * visitar, la actual es el círculo de correspondencia y las siguientes esperan.
 */
export function LineaPasos({ actual, hechos }: { actual: Paso; hechos: Paso[] }) {
  const i = PASOS.findIndex((p) => p.clave === actual);
  return (
    <nav aria-label="Pasos de la configuración" className="mb-8">
      <ol className="relative grid grid-cols-4">
        <span
          aria-hidden="true"
          className="absolute top-[0.6875rem] right-[12.5%] left-[12.5%] h-0 border-t-4 border-dashed border-tenue"
        />
        <span
          aria-hidden="true"
          className="absolute top-[0.6875rem] left-[12.5%] h-1 bg-marca transition-[width] duration-200 ease-[var(--ease-salida)]"
          style={{ width: `${(i / (PASOS.length - 1)) * 75}%` }}
        />
        {PASOS.map((p, n) => {
          const esActual = p.clave === actual;
          const hecho = hechos.includes(p.clave);
          // Todas las estaciones en una caja de la misma altura: las etiquetas quedan alineadas.
          const circulo = (
            <span
              aria-hidden="true"
              className="relative z-10 flex h-[1.625rem] items-center justify-center"
            >
              <span
                className={`block rounded-full ${
                  esActual
                    ? "size-[1.625rem] border-[3px] border-papel bg-marca shadow-[0_0_0_2px_var(--marca)]"
                    : hecho || n < i
                      ? "size-5 border-[3px] border-marca bg-marca"
                      : "size-5 border-[3px] border-tenue bg-papel"
                }`}
              />
            </span>
          );
          const texto = (
            <span
              className={`mt-2 block text-center text-[0.8125rem] sm:text-sm ${esActual ? "font-bold text-tinta" : "font-medium text-gris"}`}
            >
              <span className="sr-only">Paso {n + 1}: </span>
              {p.titulo}
              {hecho && !esActual && <span className="sr-only"> (hecho)</span>}
            </span>
          );
          return (
            <li key={p.clave} aria-current={esActual ? "step" : undefined}>
              {hecho && !esActual ? (
                <Link
                  href={`/onboarding?paso=${p.clave}`}
                  className="block rounded-md hover:bg-superficie"
                >
                  {circulo}
                  {texto}
                </Link>
              ) : (
                <div>
                  {circulo}
                  {texto}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
