"use client";

import { Check, CircleHelp, Loader2, ShieldCheck, ShieldX } from "lucide-react";
import { useState, useTransition } from "react";
import { Aviso, type DatosAviso } from "@/components/ui/aviso";
import { Dialogo } from "@/components/ui/dialogo";
import { Selector } from "@/components/ui/selector";
import {
  agregarNotaAccion,
  cambiarEstadoAccion,
  cotejarIdentidadAccion,
  type RespuestaRevisor,
} from "@/lib/plataforma/acciones-revisor";
import { MOTIVOS_RECHAZO, type EstadoParticipacion } from "@/lib/plataforma/tipos";

const TEXTO_MIN = 20;

const ETIQUETA: Record<EstadoParticipacion, string> = {
  PENDIENTE: "Devolver a pendiente",
  EN_REVISION: "Tomar en revisión",
  APROBADA: "Aprobar",
  RECHAZADA: "Rechazar",
  PUBLICADA: "Publicar en el portal",
};

const claseBoton = {
  primario:
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-marca bg-marca px-4 text-sm font-semibold text-sobre-marca hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50",
  secundario:
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-linea bg-papel px-4 text-sm font-semibold text-tinta hover:border-tenue disabled:cursor-not-allowed disabled:opacity-50",
  peligro:
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-peligro/40 bg-papel px-4 text-sm font-semibold text-peligro hover:bg-peligro-suave disabled:cursor-not-allowed disabled:opacity-50",
};

const claseCampo =
  "w-full rounded-control border border-linea bg-papel px-3 py-2 text-[0.9375rem] text-tinta outline-none placeholder:text-tenue hover:border-tenue focus-visible:border-marca-texto";

type Props = {
  folio: string;
  estado: EstadoParticipacion;
  transiciones: EstadoParticipacion[];
  mostrarNombre: boolean;
  identidad?: "CONFIRMADA" | "NO_CONFIRMADA";
};

/** Acciones de estado del Revisor: solo las transiciones válidas, cada una confirmada. */
export function AccionesEstado({ folio, estado, transiciones, mostrarNombre, identidad }: Props) {
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<DatosAviso>();
  const [confirmar, setConfirmar] = useState<EstadoParticipacion | null>(null);
  const [rechazo, setRechazo] = useState(false);
  const [comentario, setComentario] = useState("");
  const [motivo, setMotivo] = useState("");
  const [texto, setTexto] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});

  function responder(r: RespuestaRevisor) {
    setAviso({ tipo: r.ok ? "exito" : "error", texto: r.mensaje });
    setErrores(r.errores ?? {});
    if (r.ok) {
      setConfirmar(null);
      setRechazo(false);
      setComentario("");
      setTexto("");
    }
  }

  function abrirRechazo() {
    setMotivo(identidad === "NO_CONFIRMADA" ? "IDENTIDAD_NO_ACREDITADA" : "");
    setErrores({});
    setRechazo(true);
  }

  if (!transiciones.length) {
    return (
      <>
        <p className="text-sm text-gris">
          {estado === "RECHAZADA"
            ? "Este aporte fue rechazado: su recorrido terminó."
            : "No hay acciones disponibles en este estado."}
        </p>
        <Aviso aviso={aviso} onCerrar={() => setAviso(undefined)} />
      </>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {transiciones.map((t) =>
          t === "RECHAZADA" ? (
            <button key={t} type="button" onClick={abrirRechazo} className={claseBoton.peligro}>
              {ETIQUETA[t]}
            </button>
          ) : (
            <button
              key={t}
              type="button"
              onClick={() => setConfirmar(t)}
              disabled={t === "PUBLICADA" && !mostrarNombre}
              aria-describedby={t === "PUBLICADA" && !mostrarNombre ? "sin-nombre" : undefined}
              className={
                t === "APROBADA" && estado === "PUBLICADA"
                  ? claseBoton.secundario
                  : claseBoton.primario
              }
            >
              {t === "APROBADA" && estado === "PUBLICADA" ? "Despublicar" : ETIQUETA[t]}
            </button>
          ),
        )}
      </div>
      {transiciones.includes("PUBLICADA") && !mostrarNombre && (
        <p id="sin-nombre" className="mt-2 flex items-start gap-1.5 text-sm text-gris">
          <CircleHelp size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
          No se puede publicar: el autor no autorizó mostrar su nombre. Queda aprobado para uso
          técnico interno.
        </p>
      )}

      <Dialogo
        abierto={confirmar !== null}
        onCerrar={() => setConfirmar(null)}
        titulo={
          confirmar === "APROBADA" && estado === "PUBLICADA"
            ? `¿Despublicar ${folio}?`
            : `¿${confirmar ? ETIQUETA[confirmar] : ""} ${folio}?`
        }
        descripcion={
          confirmar === "PUBLICADA"
            ? "Se mostrará en «Propuestas publicadas» del portal, con el nombre del autor."
            : confirmar === "APROBADA" && estado === "PUBLICADA"
              ? "Dejará de verse en el portal; sigue aprobado."
              : "El ciudadano verá el cambio de estado en «Mis participaciones»."
        }
      >
        {confirmar !== "PUBLICADA" && (
          <div className="mt-4">
            <label htmlFor="comentario" className="mb-1.5 block text-sm font-bold text-tinta">
              Comentario para el ciudadano <span className="font-normal text-gris">(opcional)</span>
            </label>
            <textarea
              id="comentario"
              rows={3}
              maxLength={600}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              className={claseCampo}
            />
          </div>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            autoFocus
            onClick={() => setConfirmar(null)}
            className={claseBoton.secundario}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pendiente}
            onClick={() =>
              confirmar &&
              iniciar(async () =>
                responder(
                  await cambiarEstadoAccion(
                    folio,
                    confirmar,
                    { comentario },
                    estado === "PUBLICADA",
                  ),
                ),
              )
            }
            className={claseBoton.primario}
          >
            {pendiente && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
            Confirmar
          </button>
        </div>
      </Dialogo>

      <Dialogo
        abierto={rechazo}
        onCerrar={() => setRechazo(false)}
        titulo={`Rechazar ${folio}`}
        descripcion="El motivo y el texto llegan al ciudadano por correo y en «Mis participaciones»."
        ancho="max-w-lg"
      >
        <div className="mt-4 space-y-4">
          <Selector
            id="motivo"
            etiqueta="Motivo"
            opciones={Object.entries(MOTIVOS_RECHAZO).map(([valor, t]) => ({ valor, texto: t }))}
            valor={motivo}
            onCambio={setMotivo}
            vacio="Elige un motivo"
            error={errores.motivo}
            ayuda={
              identidad === "NO_CONFIRMADA"
                ? "Preseleccionado porque la identidad no se pudo confirmar."
                : undefined
            }
          />
          <div>
            <label htmlFor="texto-rechazo" className="mb-1.5 block text-sm font-bold text-tinta">
              Explicación para el ciudadano
            </label>
            <textarea
              id="texto-rechazo"
              rows={4}
              maxLength={1000}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              aria-invalid={errores.texto ? true : undefined}
              aria-describedby="texto-rechazo-ayuda"
              className={`${claseCampo} ${errores.texto ? "border-peligro" : ""}`}
            />
            <p
              id="texto-rechazo-ayuda"
              className={`mt-1 text-sm ${errores.texto ? "text-peligro" : "text-gris"}`}
            >
              {errores.texto ??
                `${texto.trim().length} caracteres · mínimo ${TEXTO_MIN}. Sé claro y respetuoso.`}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setRechazo(false)} className={claseBoton.secundario}>
            Cancelar
          </button>
          <button
            type="button"
            disabled={pendiente || !motivo || texto.trim().length < TEXTO_MIN}
            onClick={() =>
              iniciar(async () =>
                responder(await cambiarEstadoAccion(folio, "RECHAZADA", { motivo, texto })),
              )
            }
            className={claseBoton.peligro}
          >
            {pendiente && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
            Rechazar aporte
          </button>
        </div>
      </Dialogo>

      <Aviso aviso={aviso} onCerrar={() => setAviso(undefined)} />
    </div>
  );
}

/** Cotejo de identidad: el Revisor confirma (o no) que el autor es quien dice ser. */
export function CotejoIdentidad({
  folio,
  actual,
}: {
  folio: string;
  actual?: { resultado: "CONFIRMADA" | "NO_CONFIRMADA"; nota?: string; fecha: string };
}) {
  const [pendiente, iniciar] = useTransition();
  const [nota, setNota] = useState("");
  const [aviso, setAviso] = useState<DatosAviso>();

  const enviar = (resultado: "CONFIRMADA" | "NO_CONFIRMADA") =>
    iniciar(async () => {
      const r = await cotejarIdentidadAccion(folio, resultado, nota);
      setAviso({ tipo: r.ok ? "exito" : "error", texto: r.mensaje });
      if (r.ok) setNota("");
    });

  return (
    <div>
      {actual && (
        <p
          className={`mb-3 flex items-center gap-2 text-sm font-semibold ${
            actual.resultado === "CONFIRMADA" ? "text-turquesa-texto" : "text-peligro"
          }`}
        >
          {actual.resultado === "CONFIRMADA" ? (
            <ShieldCheck size={16} aria-hidden="true" />
          ) : (
            <ShieldX size={16} aria-hidden="true" />
          )}
          {actual.resultado === "CONFIRMADA" ? "Identidad confirmada" : "Identidad no confirmada"}
          {actual.nota && <span className="font-normal text-gris">· {actual.nota}</span>}
        </p>
      )}
      <label htmlFor="nota-identidad" className="mb-1.5 block text-sm font-bold text-tinta">
        Nota del cotejo <span className="font-normal text-gris">(opcional)</span>
      </label>
      <input
        id="nota-identidad"
        value={nota}
        maxLength={300}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Por ejemplo: cédula legible y vigente"
        className={`${claseCampo} h-10`}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pendiente}
          onClick={() => enviar("CONFIRMADA")}
          className={claseBoton.secundario}
        >
          <Check size={16} aria-hidden="true" className="text-turquesa-texto" />
          Identidad confirmada
        </button>
        <button
          type="button"
          disabled={pendiente}
          onClick={() => enviar("NO_CONFIRMADA")}
          className={claseBoton.secundario}
        >
          <ShieldX size={16} aria-hidden="true" className="text-peligro" />
          No se puede confirmar
        </button>
      </div>
      <Aviso aviso={aviso} onCerrar={() => setAviso(undefined)} />
    </div>
  );
}

/** Nueva nota interna (no la ve el ciudadano). */
export function NuevaNota({ folio }: { folio: string }) {
  const [pendiente, iniciar] = useTransition();
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState<DatosAviso>();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await agregarNotaAccion(folio, texto);
          setAviso({ tipo: r.ok ? "exito" : "error", texto: r.mensaje });
          if (r.ok) setTexto("");
        });
      }}
    >
      <label htmlFor="nota-interna" className="mb-1.5 block text-sm font-bold text-tinta">
        Agregar nota interna
      </label>
      <textarea
        id="nota-interna"
        rows={2}
        maxLength={1000}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className={claseCampo}
      />
      <button
        type="submit"
        disabled={pendiente || !texto.trim()}
        className={`${claseBoton.secundario} mt-2`}
      >
        {pendiente && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
        Guardar nota
      </button>
      <Aviso aviso={aviso} onCerrar={() => setAviso(undefined)} />
    </form>
  );
}
