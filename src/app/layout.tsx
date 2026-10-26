import type { Metadata, Viewport } from "next";
import { Montserrat, Roboto } from "next/font/google";
import { ALCALDIA } from "@/config/alcaldia";
import { esDemo } from "@/lib/plataforma/sesion";
import "./globals.css";

// Las mismas fuentes del portal ciudadano: Montserrat para títulos y Roboto para el texto.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
      <body className="min-h-full">
        {esDemo && (
          <aside
            aria-label="Entorno de demostración"
            className="border-b border-linea bg-noche px-4 py-1.5 text-center text-xs font-medium text-papel"
          >
            Entorno de demostración: los datos de ejemplo se reinician de vez en cuando.
          </aside>
        )}
        {children}
      </body>
    </html>
  );
}
