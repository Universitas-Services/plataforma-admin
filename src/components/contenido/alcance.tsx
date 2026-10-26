import { Eye, ThumbsDown, ThumbsUp } from "lucide-react";
import type { ConteoDia } from "@/lib/plataforma/tipos";

const cifra = (n: number) => n.toLocaleString("es-VE");

/** Vistas y reacciones de una noticia o un aporte en el portal (resumen {vistas, likes, dislikes}). */
export function Alcance({ totales, className = "" }: { totales?: ConteoDia; className?: string }) {
  if (!totales?.vistas) return <span className={`text-sm text-gris ${className}`}>Sin vistas</span>;
  return (
    <span
      className={`inline-flex items-center gap-3 text-sm whitespace-nowrap text-cuerpo tabular-nums ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        <Eye size={14} aria-hidden="true" className="text-gris" />
        {cifra(totales.vistas)}
        <span className="sr-only">{totales.vistas === 1 ? " vista" : " vistas"},</span>
      </span>
      <span className="inline-flex items-center gap-1">
        <ThumbsUp size={14} aria-hidden="true" className="text-gris" />
        {cifra(totales.likes)}
        <span className="sr-only"> me gusta,</span>
      </span>
      <span className="inline-flex items-center gap-1">
        <ThumbsDown size={14} aria-hidden="true" className="text-gris" />
        {cifra(totales.dislikes)}
        <span className="sr-only"> no me gusta</span>
      </span>
    </span>
  );
}
