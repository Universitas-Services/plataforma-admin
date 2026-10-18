/*
 * Esqueletos de carga con la forma real de cada pantalla (no un bloque gris genérico). Todos
 * son decorativos (aria-hidden); el anuncio «Cargando…» lo da EstadoCarga una sola vez.
 * El brillo de .skeleton se apaga con movimiento reducido (globals.css).
 */

const B = ({ className = "" }: { className?: string }) => (
  <div className={`skeleton rounded ${className}`} />
);

/** Anuncio accesible de carga, una vez por pantalla. */
export function EstadoCarga({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <p role="status" className="sr-only">
      {texto}
    </p>
  );
}

export function EsqueletoEncabezado({ acciones = false }: { acciones?: boolean }) {
  return (
    <div aria-hidden="true" className="mb-6 flex items-end justify-between gap-4">
      <div className="w-full max-w-md">
        <B className="h-8 w-52" />
        <B className="mt-3 h-4 w-full max-w-sm" />
      </div>
      {acciones && <B className="hidden h-10 w-36 rounded-control sm:block" />}
    </div>
  );
}

export function EsqueletoChips({ cantidad = 5 }: { cantidad?: number }) {
  return (
    <div aria-hidden="true" className="flex gap-2 overflow-hidden">
      {Array.from({ length: cantidad }, (_, i) => (
        <B key={i} className="h-10 w-32 shrink-0 rounded-full" />
      ))}
    </div>
  );
}

/** Tabla en escritorio; lista apilada en el teléfono (como TablaCola). */
export function EsqueletoTabla({ filas = 6, columnas = 6 }: { filas?: number; columnas?: number }) {
  return (
    <div aria-hidden="true">
      <div className="divide-y divide-fila rounded-lg border border-linea sm:hidden">
        {Array.from({ length: Math.min(filas, 4) }, (_, i) => (
          <div key={i} className="space-y-2 px-4 py-3">
            <div className="flex justify-between">
              <B className="h-5 w-32" />
              <B className="h-6 w-24 rounded-full" />
            </div>
            <B className="h-4 w-48" />
            <div className="flex justify-between">
              <B className="h-4 w-20" />
              <B className="h-4 w-28" />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-lg border border-linea sm:block">
        <div className="flex gap-6 bg-cabecera px-3 py-3">
          {Array.from({ length: columnas }, (_, i) => (
            <B key={i} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: filas }, (_, i) => (
          <div key={i} className="flex items-center gap-6 border-t border-fila px-3 py-4">
            {Array.from({ length: columnas }, (_, j) => (
              <B key={j} className={`h-4 flex-1 ${j === columnas - 1 ? "max-w-28" : ""}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Filas con un identificador a la izquierda y acciones a la derecha (alcaldías, selector). */
export function EsqueletoLista({ filas = 4 }: { filas?: number }) {
  return (
    <div aria-hidden="true" className="divide-y divide-fila rounded-lg border border-linea">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <B className="h-10 w-12 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-2">
            <B className="h-4 w-56 max-w-full" />
            <B className="h-3 w-40 max-w-full" />
          </div>
          <B className="hidden h-10 w-20 rounded-control sm:block" />
        </div>
      ))}
    </div>
  );
}

export function EsqueletoFormulario({ campos = 3 }: { campos?: number }) {
  return (
    <div aria-hidden="true" className="space-y-5">
      {Array.from({ length: campos }, (_, i) => (
        <div key={i}>
          <B className="h-4 w-28" />
          <B className="mt-2 h-11 w-full rounded-control" />
        </div>
      ))}
      <B className="h-11 w-full rounded-control" />
    </div>
  );
}

/** El asistente: línea de cuatro pasos, formulario y vista previa. */
export function EsqueletoAsistente() {
  return (
    <div className="max-w-5xl">
      <EstadoCarga />
      <EsqueletoEncabezado />
      <div aria-hidden="true" className="mb-8 grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <B className="size-6 rounded-full" />
            <B className="h-3 w-14" />
          </div>
        ))}
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <B className="h-64 rounded-lg" />
        <B className="h-56 rounded-lg" />
      </div>
    </div>
  );
}

/** Pantallas de lista (participaciones, tablero sin datos aún). */
export function EsqueletoBandeja() {
  return (
    <div>
      <EstadoCarga />
      <EsqueletoEncabezado />
      <div className="mb-5 space-y-4">
        <EsqueletoChips />
        <div aria-hidden="true" className="flex gap-3">
          <B className="h-11 flex-1 rounded-control" />
          <B className="h-11 w-24 rounded-control" />
        </div>
      </div>
      <EsqueletoTabla />
    </div>
  );
}

export function EsqueletoTablero() {
  return (
    <div>
      <EstadoCarga />
      <EsqueletoEncabezado />
      <div className="mb-7">
        <EsqueletoChips />
      </div>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <EsqueletoTabla filas={4} columnas={4} />
        <div aria-hidden="true" className="space-y-2">
          <B className="h-5 w-36" />
          <B className="h-36 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function EsqueletoPlataforma() {
  return (
    <div>
      <EstadoCarga />
      <EsqueletoEncabezado />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <EsqueletoLista />
        <div aria-hidden="true" className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <B key={i} className="h-10" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Secciones en preparación: encabezado y el recuadro punteado. */
export function EsqueletoSeccion() {
  return (
    <div>
      <EstadoCarga />
      <EsqueletoEncabezado />
      <div aria-hidden="true" className="rounded-lg border border-dashed border-linea px-6 py-12">
        <B className="mx-auto size-7 rounded-full" />
        <B className="mx-auto mt-4 h-5 w-64 max-w-full" />
        <B className="mx-auto mt-3 h-4 w-80 max-w-full" />
      </div>
    </div>
  );
}
