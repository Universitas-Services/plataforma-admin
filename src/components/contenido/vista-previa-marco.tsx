import { ArrowRight } from "lucide-react";

export type ItemPrevia = {
  titulo: string;
  descripcion: string;
  /** Solo si el destino sigue publicado: el portal no muestra botones rotos. */
  boton?: { texto: string };
};

/**
 * Aproximación de la sección «Naturaleza jurídica y marco legal del PDUL» de Conoce el PDUL:
 * mismos números, línea, tarjetas y botón que el portal, con la tipografía del panel.
 */
export function VistaPreviaMarco({ items }: { items: ItemPrevia[] }) {
  if (!items.length)
    return (
      <p className="mt-4 rounded-lg border border-dashed border-linea p-4 text-sm text-gris">
        No hay ítems activos: la sección se vería solo con su introducción.
      </p>
    );
  return (
    <ol className="mt-4 max-h-[65dvh] overflow-y-auto rounded-lg border border-linea p-4 sm:p-6">
      {items.map((it, i) => (
        <li key={`${i}-${it.titulo}`} className="relative pb-4 pl-14 last:pb-0">
          {i < items.length - 1 && (
            <span
              aria-hidden="true"
              className="absolute top-12 bottom-0 left-[1.2rem] w-0.5 bg-gradient-to-b from-rojo to-rojo/20"
            />
          )}
          <span
            aria-hidden="true"
            className="absolute top-0 left-0 grid size-10 place-items-center rounded-full bg-rojo font-display font-extrabold text-papel"
          >
            {i + 1}
          </span>
          <div className="rounded-2xl border border-linea p-5">
            <h3 className="font-display text-lg font-extrabold text-noche">
              {it.titulo || "Sin título"}
            </h3>
            <p className="mt-1.5 leading-relaxed whitespace-pre-line text-tinta">
              {it.descripcion || "Sin descripción"}
            </p>
            {it.boton && (
              <span className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rojo/10 px-4 font-display text-sm font-bold text-rojo-oscuro">
                {it.boton.texto}
                <ArrowRight size={16} aria-hidden="true" />
              </span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
