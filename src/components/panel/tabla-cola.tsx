import { ArrowUp } from "lucide-react";
import type { ParticipacionDemo } from "@/lib/plataforma/tipos";
import { InsigniaEstado } from "@/components/ui/piezas";
import { DIAS_ALERTA, Recorrido } from "./recorrido";

const claseRecibida = (p: ParticipacionDemo) =>
  p.dias > DIAS_ALERTA ? "font-semibold text-ambar-texto" : "text-gris";

/**
 * Participaciones por atender, de la más antigua a la más reciente, con su recorrido. Folio,
 * estado y recorrido nunca se ocultan: en la columna angosta del tablero (`compacta`) se
 * esconden los datos secundarios, y en el teléfono la tabla pasa a lista apilada.
 */
export function TablaCola({
  cola,
  titulo,
  compacta = false,
}: {
  cola: ParticipacionDemo[];
  titulo: string;
  compacta?: boolean;
}) {
  const ver = compacta
    ? { tipo: "hidden 2xl:table-cell", autor: "hidden", parroquia: "hidden", categoria: "hidden" }
    : {
        tipo: "hidden md:table-cell",
        autor: "hidden lg:table-cell",
        parroquia: "hidden xl:table-cell",
        categoria: "hidden 2xl:table-cell",
      };

  return (
    <>
      <ul
        aria-label={titulo}
        className="divide-y divide-fila rounded-lg border border-linea sm:hidden"
      >
        {cola.map((p) => (
          <li key={p.folio} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-tinta">{p.folio}</span>
              <InsigniaEstado estado={p.estado} />
            </div>
            <p className="mt-0.5 truncate text-sm text-gris">
              {p.tipo} · {p.parroquia}
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className={`text-sm ${claseRecibida(p)}`}>{p.recibida}</span>
              <Recorrido estado={p.estado} dias={p.dias} />
            </div>
          </li>
        ))}
      </ul>

      {/* Con scroll horizontal, el teclado tiene que poder entrar a desplazarla (WCAG 2.1.1). */}
      <div
        role="region"
        aria-label={titulo}
        tabIndex={0}
        className="hidden overflow-x-auto rounded-lg border border-linea sm:block"
      >
        <table className="w-full border-collapse text-left text-[0.9375rem]">
          <caption className="sr-only">{titulo}</caption>
          <thead className="bg-cabecera text-xs font-semibold tracking-wide text-gris uppercase">
            <tr>
              <th scope="col" className="px-3 py-2.5">
                Folio
              </th>
              <th scope="col" className={`px-3 py-2.5 ${ver.tipo}`}>
                Tipo
              </th>
              <th scope="col" className={`px-3 py-2.5 ${ver.autor}`}>
                Autor
              </th>
              <th scope="col" className={`px-3 py-2.5 ${ver.parroquia}`}>
                Parroquia
              </th>
              <th scope="col" className={`px-3 py-2.5 ${ver.categoria}`}>
                Categoría técnica
              </th>
              <th scope="col" aria-sort="ascending" className="px-3 py-2.5 text-tinta">
                <span className="inline-flex items-center gap-1">
                  Recibida <ArrowUp size={13} aria-hidden="true" />
                </span>
              </th>
              <th scope="col" className="px-3 py-2.5">
                Estado
              </th>
              <th scope="col" className="px-3 py-2.5">
                Recorrido
              </th>
            </tr>
          </thead>
          <tbody>
            {cola.map((p) => (
              <tr key={p.folio} className="border-t border-fila">
                <td className="px-3 py-3.5 font-semibold whitespace-nowrap text-tinta">
                  {p.folio}
                </td>
                <td className={`px-3 py-3.5 whitespace-nowrap ${ver.tipo}`}>{p.tipo}</td>
                <td className={`max-w-48 truncate px-3 py-3.5 ${ver.autor}`}>{p.autor}</td>
                <td className={`px-3 py-3.5 whitespace-nowrap ${ver.parroquia}`}>{p.parroquia}</td>
                <td className={`px-3 py-3.5 whitespace-nowrap ${ver.categoria}`}>
                  {p.categoriaTecnica}
                </td>
                <td className={`px-3 py-3.5 whitespace-nowrap ${claseRecibida(p)}`}>
                  {p.recibida}
                </td>
                <td className="px-3 py-3.5">
                  <InsigniaEstado estado={p.estado} />
                </td>
                <td className="px-3 py-3.5">
                  <Recorrido estado={p.estado} dias={p.dias} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
