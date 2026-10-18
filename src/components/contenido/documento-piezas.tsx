import { BadgeCheck, Eye, EyeOff, PencilLine } from "lucide-react";
import { NOMBRE_DOC_ESTADO, type DocEstado } from "@/lib/contenido/tipos";

/** Oficial (sello lleno) o borrador de trabajo (contorno discontinuo): se lee por la forma. */
export function EstadoDocumento({ estado }: { estado: DocEstado }) {
  return estado === "OFICIAL" ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-turquesa/10 px-2.5 py-0.5 text-[0.8125rem] font-semibold whitespace-nowrap text-turquesa-texto">
      <BadgeCheck size={15} aria-hidden="true" />
      {NOMBRE_DOC_ESTADO.OFICIAL}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-tenue px-2.5 py-0.5 text-[0.8125rem] font-semibold whitespace-nowrap text-tinta">
      <PencilLine size={15} aria-hidden="true" />
      {NOMBRE_DOC_ESTADO.BORRADOR}
    </span>
  );
}

export function Visibilidad({ publico }: { publico: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap text-gris">
      {publico ? <Eye size={15} aria-hidden="true" /> : <EyeOff size={15} aria-hidden="true" />}
      {publico ? "En el portal" : "Oculto"}
    </span>
  );
}
