import type { Metadata } from "next";
import { Suspense } from "react";
import { EsqueletoFormulario } from "@/components/ui/esqueletos";
import { FormInvitacion, FormReenviarInvitacion } from "@/components/acceso/formularios";
import { MarcoAcceso } from "@/components/acceso/marco-acceso";
import { verInvitacion } from "@/lib/plataforma/servicio";
import { almacen } from "@/lib/plataforma/sesion";
import { NOMBRE_ROL } from "@/lib/plataforma/tipos";

export const metadata: Metadata = { title: "Aceptar invitación" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function InvitacionPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <MarcoAcceso titulo="Activa tu cuenta">
      <Suspense fallback={<EsqueletoFormulario campos={5} />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </MarcoAcceso>
  );
}

async function Contenido({ searchParams }: { searchParams: SearchParams }) {
  const { token } = await searchParams;
  const t = typeof token === "string" ? token : "";
  const inv = verInvitacion(almacen(), t);

  if (inv.estado === "INVALIDO")
    return (
      <p
        role="alert"
        className="rounded-lg bg-peligro-suave p-5 text-tinta ring-1 ring-peligro/30 ring-inset"
      >
        Este enlace de invitación no es válido. Revisa el correo o pide a quien te invitó que te
        envíe uno nuevo.
      </p>
    );

  if (inv.estado !== "OK")
    return (
      <div className="space-y-5">
        <p
          role="alert"
          className="rounded-lg bg-peligro-suave p-5 text-tinta ring-1 ring-peligro/30 ring-inset"
        >
          {inv.estado === "VENCIDO"
            ? "La invitación venció: dura 72 horas."
            : inv.estado === "REEMPLAZADA"
              ? "Este enlace fue reemplazado por uno más reciente. Usa el último correo que recibiste o pide otro."
              : "Esta invitación ya se usó. Si ya activaste tu cuenta, inicia sesión."}
        </p>
        {inv.estado !== "USADO" && <FormReenviarInvitacion token={t} />}
      </div>
    );

  const roles = inv.rolPlataforma ? [inv.rolPlataforma] : inv.roles;
  return (
    <>
      <dl className="mb-8 grid gap-3 rounded-lg bg-superficie p-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-gris">Te invitaron a</dt>
          <dd className="font-semibold text-tinta">{inv.alcaldia ?? "La plataforma"}</dd>
        </div>
        <div>
          <dt className="text-gris">Con el rol</dt>
          <dd className="font-semibold text-tinta">
            {roles.map((r) => NOMBRE_ROL[r]).join(" y ")}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-gris">Correo de la cuenta</dt>
          <dd className="font-semibold break-words text-tinta">{inv.correo}</dd>
        </div>
      </dl>
      <FormInvitacion token={t} correo={inv.correo} />
    </>
  );
}
