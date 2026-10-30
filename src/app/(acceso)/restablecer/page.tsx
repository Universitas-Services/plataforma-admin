import { usaApi } from "@/lib/api/cliente";
import { estadoRestablecerApi } from "@/lib/api/acceso";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EsqueletoFormulario } from "@/components/ui/esqueletos";
import { FormRestablecer } from "@/components/acceso/formularios";
import { MarcoAcceso } from "@/components/acceso/marco-acceso";
import { estadoRestablecer } from "@/lib/plataforma/servicio";
import { almacen } from "@/lib/plataforma/sesion";

export const metadata: Metadata = { title: "Crear contraseña nueva" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function RestablecerPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <MarcoAcceso
      titulo="Crea tu contraseña nueva"
      bajada="Al guardarla, cerramos tus sesiones abiertas."
    >
      <Suspense fallback={<EsqueletoFormulario campos={2} />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </MarcoAcceso>
  );
}

const MOTIVO = {
  VENCIDO: "El enlace venció: dura 1 hora.",
  USADO: "Este enlace ya se usó.",
  INVALIDO: "El enlace no es válido.",
};

async function Contenido({ searchParams }: { searchParams: SearchParams }) {
  const { token } = await searchParams;
  const t = typeof token === "string" ? token : "";
  // El enlace vence con la hora: se revisa en cada visita, no al prerenderizar.
  await connection();
  const estado = usaApi() ? await estadoRestablecerApi(t) : estadoRestablecer(almacen(), t);
  if (estado !== "OK")
    return (
      <div
        role="alert"
        className="rounded-lg bg-peligro-suave p-5 text-tinta ring-1 ring-peligro/30 ring-inset"
      >
        <p className="font-semibold">{MOTIVO[estado]}</p>
        <Link
          href="/recuperar"
          className="mt-3 inline-block font-semibold text-marca-texto hover:underline"
        >
          Pedir un enlace nuevo
        </Link>
      </div>
    );
  return <FormRestablecer token={t} />;
}
