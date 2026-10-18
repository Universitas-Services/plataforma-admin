import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
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
      <body className="min-h-full">{children}</body>
    </html>
  );
}
