import type { Metadata } from "next";
import Link from "next/link";
import { FormRecuperar } from "@/components/acceso/formularios";
import { MarcoAcceso } from "@/components/acceso/marco-acceso";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <MarcoAcceso
      titulo="¿Olvidaste tu contraseña?"
      bajada="Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva."
    >
      <FormRecuperar />
      <p className="mt-8 border-t border-linea pt-6 text-sm">
        <Link href="/ingresar" className="font-semibold text-marca-texto hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </MarcoAcceso>
  );
}
