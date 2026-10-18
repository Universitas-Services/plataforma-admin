"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PESTANAS = [
  { href: "/contenido/noticias", texto: "Noticias" },
  { href: "/contenido/banners", texto: "Banners" },
  { href: "/contenido/documentos", texto: "Documentos" },
] as const;

/** Secciones de Contenido: noticias, banners del Inicio y repositorio de documentos. */
export function PestanasContenido() {
  const ruta = usePathname();
  return (
    <nav aria-label="Secciones de contenido" className="mb-6 border-b border-linea">
      <ul className="-mb-px flex [scrollbar-width:none] gap-1 overflow-x-auto">
        {PESTANAS.map((p) => {
          const activa = ruta.startsWith(p.href);
          return (
            <li key={p.href} className="shrink-0">
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
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
