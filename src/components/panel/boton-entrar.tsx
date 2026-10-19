"use client";

import { useFormStatus } from "react-dom";
import { elegirAlcaldiaAccion } from "@/lib/plataforma/acciones";

const CLASE = {
  secundario:
    "min-h-10 shrink-0 rounded-control border border-linea bg-papel px-4 text-sm font-semibold text-tinta hover:border-tenue disabled:opacity-60",
  primario:
    "min-h-10 shrink-0 rounded-control border border-marca bg-marca px-4 text-sm font-semibold text-sobre-marca hover:brightness-110 disabled:opacity-60",
};

function Enviar({
  nombre,
  texto,
  variante,
}: {
  nombre: string;
  texto: string;
  variante: keyof typeof CLASE;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={CLASE[variante]}>
      {pending ? "Entrando…" : texto}
      <span className="sr-only"> a {nombre}</span>
    </button>
  );
}

/**
 * Entrar a operar en una alcaldía (queda en la bitácora para los roles de plataforma). Con
 * `destino`, abre directo esa sección (noticias, participaciones…) en lugar del tablero.
 */
export function BotonEntrar({
  alcaldia,
  nombre,
  texto = "Entrar",
  destino,
  variante = "secundario",
}: {
  alcaldia: string;
  nombre: string;
  texto?: string;
  destino?: string;
  variante?: keyof typeof CLASE;
}) {
  return (
    <form action={elegirAlcaldiaAccion}>
      <input type="hidden" name="alcaldia" value={alcaldia} />
      {destino && <input type="hidden" name="destino" value={destino} />}
      <Enviar nombre={nombre} texto={texto} variante={variante} />
    </form>
  );
}
