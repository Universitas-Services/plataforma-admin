"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PESTANAS = [
  { href: "/contenido/noticias", texto: "Noticias" },
  { href: undefined, texto: "Banners" },
  { href: undefined, texto: "Documentos" },
] as const;

/**
 * Secciones de Contenido. Banners y Documentos aún no están: se muestran deshabilitadas, con
 * «pronto», para que el operador sepa que vendrán aquí.
 */
export function PestanasContenido() {
  const ruta = usePathname();
  return (
    <nav aria-label="Secciones de contenido" className="mb-6 border-b border-linea">
      <ul className="-mb-px flex [scrollbar-width:none] gap-1 overflow-x-auto">
        {PESTANAS.map((p) => {
          const activa = p.href && ruta.startsWith(p.href);
          return (
            <li key={p.texto} className="shrink-0">
              {p.href ? (
                <Link
                  href={p.href}
                  aria-current={activa ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center border-b-[3px] px-3 font-semibold ${
                    activa
                      ? "border-marca text-tinta"
                      : "border-transparent text-gris hover:text-tinta"
                  }`}
                >
                  {p.texto}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="inline-flex min-h-11 cursor-not-allowed items-center gap-1.5 border-b-[3px] border-transparent px-3 font-semibold text-tenue"
                >
                  {p.texto}
                  <span className="rounded-full border border-dashed border-tenue px-1.5 text-xs font-medium">
                    pronto
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
