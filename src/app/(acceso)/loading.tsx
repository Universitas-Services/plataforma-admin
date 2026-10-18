import { MarcoAcceso } from "@/components/acceso/marco-acceso";
import { EsqueletoFormulario, EstadoCarga } from "@/components/ui/esqueletos";

export default function Cargando() {
  return (
    <MarcoAcceso titulo="Un momento…">
      <EstadoCarga />
      <EsqueletoFormulario campos={2} />
    </MarcoAcceso>
  );
}
