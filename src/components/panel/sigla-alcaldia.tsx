import { ALCALDIA } from "@/config/alcaldia";

/** Rótulo de la línea: la sigla de la alcaldía sobre el rojo de la marca, como en el metro. */
export function SiglaAlcaldia({ tamano = "md" }: { tamano?: "sm" | "md" }) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-md bg-marca font-bold tracking-wider text-sobre-marca ${
        tamano === "md" ? "h-10 w-12 text-xs" : "h-6 px-1.5 text-xs"
      }`}
    >
      {ALCALDIA.sigla}
    </span>
  );
}
