import { ArrowUp } from "lucide-react";
import Link from "next/link";
import type { ParticipacionDemo } from "@/lib/plataforma/tipos";
import { InsigniaEstado } from "@/components/ui/piezas";
import { DIAS_ALERTA, Recorrido } from "./recorrido";

const porAtender = (p: ParticipacionDemo) => p.estado === "PENDIENTE" || p.estado === "EN_REVISION";

const claseRecibida = (p: ParticipacionDemo) =>
  porAtender(p) && p.dias > DIAS_ALERTA ? "font-semibold text-ambar-texto" : "text-gris";

/** Recorrido solo mientras espera; en los estados finales no hay tramo por recorrer. */
function RecorridoFila({ p }: { p: ParticipacionDemo }) {
  if (p.estado === "PENDIENTE" || p.estado === "EN_REVISION")
    return <Recorrido estado={p.estado} dias={p.dias} />;
  return <span className="text-sm text-tenue">—</span>;
}

/** El folio enlaza al detalle del aporte. */
function Folio({ folio }: { folio: string }) {
  return (
    <Link
      href={`/participaciones/${folio}`}
      className="font-semibold text-tinta underline-offset-2 hover:text-marca-texto hover:underline"
    >
      {folio}
    </Link>
  );
}

/** Botón visible al detalle, donde se verifica, rechaza o publica. */
function Revisar({ folio }: { folio: string }) {
  return (
    <Link
      href={`/participaciones/${folio}`}
      className="inline-flex min-h-9 items-center rounded-control border border-linea bg-papel px-3 text-sm font-semibold whitespace-nowrap text-marca-texto hover:border-tenue"
    >
      Revisar<span className="sr-only"> {folio}</span>
    </Link>
  );
}

/**
 * Participaciones por atender, de la más antigua a la más reciente, con su recorrido. Folio,
 * estado y recorrido nunca se ocultan: en la columna angosta del tablero (`compacta`) se
 * esconden los datos secundarios, y en el teléfono la tabla pasa a lista apilada.
 */
export function TablaCola({
  cola,
  titulo,
  compacta = false,
  ordenada = true,
}: {
  cola: ParticipacionDemo[];
  titulo: string;
  compacta?: boolean;
  /** La cola va de la más antigua a la más reciente; la bandeja completa mezcla órdenes. */
  ordenada?: boolean;
}) {
  const ver = compacta
    ? {
        tipo: "hidden 2xl:table-cell",
        autor: "hidden",
        parroquia: "hidden",
        categoria: "hidden",
        recorrido: "",
      }
    : {
        tipo: "hidden md:table-cell",
        autor: "hidden lg:table-cell",
        parroquia: "hidden 2xl:table-cell",
        categoria: "hidden 2xl:table-cell",
        // En la bandeja completa, «Revisar» no debe quedar fuera de la vista.
        recorrido: "hidden 2xl:table-cell",
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
              <Folio folio={p.folio} />
              <InsigniaEstado estado={p.estado} tipo={p.tipo} />
            </div>
            <p className="mt-0.5 truncate text-sm text-gris">
              {p.tipo} · {p.parroquia}
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className={`text-sm ${claseRecibida(p)}`}>{p.recibida}</span>
              <RecorridoFila p={p} />
            </div>
            <div className="mt-2">
              <Revisar folio={p.folio} />
            </div>
          </li>
        ))}
      </ul>

      {/* Con scroll horizontal, el teclado tiene que poder entrar a desplazarla (WCAG 2.1.1). */}
      <div
        role="region"
        aria-label={titulo}
        tabIndex={0}
        className="relative hidden overflow-x-auto rounded-lg border border-linea sm:block"
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
              <th
                scope="col"
                aria-sort={ordenada ? "ascending" : undefined}
                className={`px-3 py-2.5 ${ordenada ? "text-tinta" : ""}`}
              >
                <span className="inline-flex items-center gap-1">
                  Recibida {ordenada && <ArrowUp size={13} aria-hidden="true" />}
                </span>
              </th>
              <th scope="col" className="px-3 py-2.5">
                Estado
              </th>
              <th scope="col" className={`px-3 py-2.5 ${ver.recorrido}`}>
                Recorrido
              </th>
              <th scope="col" className="px-3 py-2.5">
                <span className="sr-only">Acción</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {cola.map((p) => (
              <tr key={p.folio} className="border-t border-fila">
                <td className="px-3 py-3.5 whitespace-nowrap">
                  <Folio folio={p.folio} />
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
                  <InsigniaEstado estado={p.estado} tipo={p.tipo} />
                </td>
                <td className={`px-3 py-3.5 ${ver.recorrido}`}>
                  <RecorridoFila p={p} />
                </td>
                <td className="px-3 py-3.5 text-right">
                  <Revisar folio={p.folio} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
