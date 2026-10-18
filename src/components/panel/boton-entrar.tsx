"use client";

import { useFormStatus } from "react-dom";
import { elegirAlcaldiaAccion } from "@/lib/plataforma/acciones";

function Enviar({ nombre, texto }: { nombre: string; texto: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-10 shrink-0 rounded-control border border-linea px-4 text-sm font-semibold text-tinta hover:border-tenue disabled:opacity-60"
    >
      {pending ? "Entrando…" : texto}
      <span className="sr-only"> a {nombre}</span>
    </button>
  );
}

/** Entrar a operar en una alcaldía (queda en la bitácora para los roles de plataforma). */
export function BotonEntrar({
  alcaldia,
  nombre,
  texto = "Entrar",
}: {
  alcaldia: string;
  nombre: string;
  texto?: string;
}) {
  return (
    <form action={elegirAlcaldiaAccion}>
      <input type="hidden" name="alcaldia" value={alcaldia} />
      <Enviar nombre={nombre} texto={texto} />
    </form>
  );
}
