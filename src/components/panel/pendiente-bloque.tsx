import { Construction } from "lucide-react";
import { EncabezadoPagina, EstadoVacio } from "@/components/ui/piezas";

/**
 * Sección cuyo contenido llega en un bloque posterior del backlog (cada página lo anota en un
 * comentario). La ruta ya existe y ya está protegida por permiso;
 * aquí se dice qué traerá, en palabras del personal, para que nadie la confunda con un error.
 */
export function PendienteDeBloque({
  titulo,
  bajada,
  incluye,
}: {
  titulo: string;
  bajada: string;
  incluye: string[];
}) {
  return (
    <>
      <EncabezadoPagina titulo={titulo} bajada={bajada} />
      <EstadoVacio Icono={Construction} titulo="Esta sección está en preparación">
        <p>Muy pronto podrás trabajar aquí. Incluirá:</p>
        <ul className="mt-3 inline-block list-disc space-y-1 pl-5 text-left">
          {incluye.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </EstadoVacio>
    </>
  );
}
