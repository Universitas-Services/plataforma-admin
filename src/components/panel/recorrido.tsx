/*
 * La firma de «Línea y estación»: el recorrido de estados de un aporte dibujado como una línea
 * de metro. Pendiente → En revisión → Aprobada/Rechazada → Publicada.
 *   - Tramo completado: trazo lleno. Tramo en espera: discontinuo (el estado se lee por forma,
 *     no solo por color, con cualquier marca de alcaldía).
 *   - La antigüedad es la longitud del tramo en espera: lo más viejo se ve más largo.
 *   - Más de 4 días esperando: el tramo pasa a ámbar.
 */

const ESTACIONES = ["Pendiente", "En revisión", "Resultado", "Publicada"];
const ORDEN = { PENDIENTE: 0, EN_REVISION: 1 } as const;
const PASO = 20;
export const DIAS_ALERTA = 4;

export function Recorrido({ estado, dias }: { estado: keyof typeof ORDEN; dias: number }) {
  const actual = ORDEN[estado];
  const espera = Math.min(14 + dias * 10, 84);
  const tarde = dias > DIAS_ALERTA;
  // x de cada estación: las cumplidas a PASO; tras la actual, el tramo en espera.
  const xs = ESTACIONES.map((_, i) =>
    i <= actual ? 10 + i * (PASO + 4) : 10 + actual * (PASO + 4) + espera + (i - actual - 1) * PASO,
  );
  const ancho = (xs.at(-1) ?? 0) + 8;
  const etiqueta = `${ESTACIONES[actual]} desde ${dias === 0 ? "hoy" : dias === 1 ? "ayer" : `hace ${dias} días`}`;

  return (
    <svg
      width={ancho}
      height={24}
      viewBox={`0 0 ${ancho} 24`}
      role="img"
      aria-label={etiqueta}
      className="block overflow-visible"
    >
      {actual > 0 && (
        <path
          d={`M${xs[0]} 12H${xs[actual]! - 6}`}
          className="stroke-tinta"
          strokeWidth={3}
          fill="none"
        />
      )}
      <path
        d={`M${xs[actual]! + 6} 12H${xs[actual + 1]! - 4}`}
        className={`tramo-espera ${tarde ? "stroke-ambar" : "stroke-tinta"}`}
        strokeWidth={3}
        fill="none"
      />
      <path
        d={`M${xs[actual + 1]! + 4} 12H${xs.at(-1)}`}
        className="stroke-linea"
        strokeWidth={1.5}
        fill="none"
      />
      {xs.map((x, i) =>
        i < actual ? (
          <circle key={i} cx={x} cy={12} r={4.5} className="fill-tinta" />
        ) : i === actual ? (
          <circle
            key={i}
            cx={x}
            cy={12}
            r={6}
            className="fill-papel stroke-tinta"
            strokeWidth={3}
          />
        ) : (
          <circle
            key={i}
            cx={x}
            cy={12}
            r={3.5}
            className="fill-papel stroke-tenue"
            strokeWidth={1.5}
          />
        ),
      )}
    </svg>
  );
}

/** Leyenda del recorrido, al pie de las tablas que lo usan. */
export function LeyendaRecorrido() {
  return (
    <ul
      aria-label="Leyenda del recorrido"
      className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.8125rem] text-gris"
    >
      <li className="inline-flex items-center gap-1.5">
        <svg width="24" height="10" aria-hidden="true">
          <path d="M2 5H22" className="stroke-tinta" strokeWidth={3} />
        </svg>
        Completado
      </li>
      <li className="inline-flex items-center gap-1.5">
        <svg width="24" height="10" aria-hidden="true">
          <path d="M2 5H22" className="tramo-espera stroke-tinta" strokeWidth={3} />
        </svg>
        En espera (más largo, más antiguo)
      </li>
      <li className="inline-flex items-center gap-1.5">
        <svg width="24" height="10" aria-hidden="true">
          <path d="M2 5H22" className="tramo-espera stroke-ambar" strokeWidth={3} />
        </svg>
        Más de {DIAS_ALERTA} días
      </li>
      <li className="inline-flex items-center gap-1.5">
        <svg width="14" height="14" aria-hidden="true">
          <circle cx="7" cy="7" r="5" className="fill-papel stroke-tinta" strokeWidth={3} />
        </svg>
        Estación actual
      </li>
    </ul>
  );
}
