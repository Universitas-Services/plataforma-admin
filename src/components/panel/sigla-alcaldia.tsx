import { variablesMarca } from "@/lib/marca";
import type { Alcaldia } from "@/lib/plataforma/tipos";

/**
 * Identidad de línea de una alcaldía: su sigla sobre su color, como el rótulo de cada línea
 * de metro. Sin onboarding completo, en el gris neutro de la plataforma.
 */
export function SiglaAlcaldia({
  alcaldia,
  tamano = "md",
}: {
  alcaldia: Alcaldia;
  tamano?: "sm" | "md";
}) {
  const conMarca = alcaldia.estado !== "ONBOARDING_PENDIENTE" && alcaldia.marca;
  const v = conMarca ? variablesMarca(alcaldia.marca!.primario) : undefined;
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-md font-bold tracking-wider ${
        tamano === "md" ? "h-10 w-12 text-xs" : "h-6 px-1.5 text-xs"
      }`}
      style={
        v
          ? { background: v["--marca"], color: v["--sobre-marca"] }
          : { background: "#EEF1F5", color: "#4B5B7C", boxShadow: "inset 0 0 0 1px #DCE1E9" }
      }
    >
      {alcaldia.sigla}
    </span>
  );
}

/** «Alcaldía del Municipio Iribarren» → «Iribarren». */
export const nombreCorto = (nombre: string) => nombre.replace(/^Alcaldía del Municipio /, "");
