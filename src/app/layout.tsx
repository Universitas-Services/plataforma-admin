import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ALCALDIA } from "@/config/alcaldia";
import { esDemo } from "@/lib/plataforma/sesion";
import "./globals.css";

/*
 * Las mismas fuentes del portal ciudadano: Montserrat para títulos y Roboto para el texto.
 * Van en el repositorio (./fuentes, alfabeto latino, versiones variables de Google Fonts, licencia
 * OFL 1.1): con next/font/google el build dependía de lo que respondiera Google y fallaba cuando
 * servía los archivos con otra forma de dirección (31-10-2026).
 */
const montserrat = localFont({
  src: "./fuentes/montserrat-latin.woff2",
  weight: "600 800",
  variable: "--font-montserrat",
  display: "swap",
});

const roboto = localFont({
  src: "./fuentes/roboto-latin.woff2",
  weight: "400 700",
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `Panel ${ALCALDIA.programa} · ${ALCALDIA.nombreCorto}`,
    template: `%s · Panel ${ALCALDIA.programa}`,
  },
  description: `Panel interno de ${ALCALDIA.programa} para la ${ALCALDIA.nombre}.`,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#2E134D" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${montserrat.variable} ${roboto.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {esDemo && (
          <aside
            aria-label="Entorno de demostración"
            className="shrink-0 border-b border-linea bg-noche px-4 py-1.5 text-center text-xs font-medium text-papel"
          >
            Entorno de demostración: los datos de ejemplo se reinician de vez en cuando.
          </aside>
        )}
        {children}
      </body>
    </html>
  );
}
