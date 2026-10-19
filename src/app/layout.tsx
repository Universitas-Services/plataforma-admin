import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { esDemo } from "@/lib/plataforma/sesion";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Plataforma de Participación Ciudadana", template: "%s · Panel" },
  description: "Panel interno de la Plataforma de Participación Ciudadana.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#1F3864" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${archivo.variable} h-full antialiased`}>
      <body className="min-h-full">
        {esDemo && (
          <aside
            aria-label="Entorno de demostración"
            className="border-b border-linea bg-cabecera px-4 py-1.5 text-center text-xs font-medium text-ambar-texto"
          >
            Entorno de demostración: los datos de ejemplo se reinician de vez en cuando.
          </aside>
        )}
        {children}
      </body>
    </html>
  );
}
