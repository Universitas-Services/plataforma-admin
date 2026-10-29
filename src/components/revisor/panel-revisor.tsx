"use client";

import { Check, CircleHelp, Globe, Loader2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Aviso, type DatosAviso } from "@/components/ui/aviso";
import { Dialogo } from "@/components/ui/dialogo";
import { Selector } from "@/components/ui/selector";
import {
  agregarNotaAccion,
  cambiarEstadoAccion,
  type RespuestaRevisor,
} from "@/lib/plataforma/acciones-revisor";
import {
  AUTOR_ANONIMO,
  MOTIVOS_RECHAZO,
  type EstadoParticipacion,
  type TipoParticipacion,
} from "@/lib/plataforma/tipos";

const TEXTO_MIN = 20;

const ETIQUETA: Record<EstadoParticipacion, string> = {
  PENDIENTE: "Devolver a pendiente",
  EN_REVISION: "Tomar en revisión",
  APROBADA: "Marcar como verificada",
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
  tipo: TipoParticipacion;
  estado: EstadoParticipacion;
  transiciones: EstadoParticipacion[];
  mostrarNombre: boolean;
};

/** Por qué una acción no aplica en el estado actual (se muestra bajo los botones). */
function motivoInactivo(
  accion: "APROBADA" | "RECHAZADA" | "PUBLICADA",
  estado: EstadoParticipacion,
) {
  if (accion === "APROBADA")
    return estado === "RECHAZADA" ? "Ya fue rechazada." : "Ya está verificada.";
  if (accion === "RECHAZADA")
    return estado === "RECHAZADA" ? "Ya fue rechazada." : "Para rechazarla, primero despublícala.";
  if (estado === "PUBLICADA") return "Ya está publicada en el portal.";
  if (estado === "RECHAZADA") return "Un aporte rechazado no se publica.";
  return "Primero márcala como verificada.";
}

/**
 * Acciones de estado: «Marcar como verificada», «Rechazar» y «Publicar en el portal» siempre
 * visibles; las que no aplican quedan desactivadas con el motivo. Cada una se confirma.
 */
export function AccionesEstado(props: Props) {
  return props.tipo === "PROPUESTA_FORMAL" ? (
    <AccionesPropuesta {...props} />
  ) : (
    <AccionesOpinion {...props} />
  );
}

/** Cómo aparecerá el autor en el portal: lo decidió al enviar el aporte (Sí/No obligatorio). */
const comoAparece = (mostrarNombre: boolean) =>
  mostrarNombre
    ? "con el nombre del autor"
    : `como «${AUTOR_ANONIMO}»: el autor no quiso mostrar su nombre`;

/**
 * Opinión (general o sobre una noticia): sin seguimiento. Solo se publica en el portal o se
 * despublica, y vuelve a «Recibida».
 */
function AccionesOpinion({ folio, estado, transiciones, mostrarNombre }: Props) {
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<DatosAviso>();
  const [abierto, setAbierto] = useState(false);
  const publicada = estado === "PUBLICADA";
  const destino: EstadoParticipacion = publicada ? "PENDIENTE" : "PUBLICADA";
  const puede = transiciones.includes(destino);

  return (
    <div>
      <button
        type="button"
        disabled={!puede}
        onClick={() => setAbierto(true)}
        className={publicada ? claseBoton.secundario : claseBoton.primario}
      >
        {!publicada && <Globe size={16} aria-hidden="true" />}
        {publicada ? "Despublicar" : ETIQUETA.PUBLICADA}
      </button>
      {!puede && !publicada && (
        <p className="mt-3 flex items-start gap-1.5 text-sm text-gris">
          <CircleHelp size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
          Publicar: {motivoInactivo("PUBLICADA", estado)}
        </p>
      )}
      <Dialogo
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo={publicada ? `¿Despublicar ${folio}?` : `¿Publicar ${folio} en el portal?`}
        descripcion={
          publicada
            ? "Dejará de verse en el portal; el ciudadano la verá de nuevo como «Recibida»."
            : `Se mostrará en «La gente opina» del portal, ${comoAparece(mostrarNombre)}.`
        }
      >
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            autoFocus
            onClick={() => setAbierto(false)}
            className={claseBoton.secundario}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pendiente}
            onClick={() =>
              iniciar(async () => {
                const r = await cambiarEstadoAccion(folio, destino, {}, publicada);
                setAviso({ tipo: r.ok ? "exito" : "error", texto: r.mensaje });
                if (r.ok) setAbierto(false);
              })
            }
            className={claseBoton.primario}
          >
            {pendiente && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
            Confirmar
          </button>
        </div>
      </Dialogo>
      <Aviso aviso={aviso} onCerrar={() => setAviso(undefined)} />
    </div>
  );
}

/** Propuesta formal: verificar, rechazar con motivo, publicar o despublicar. */
function AccionesPropuesta({ folio, estado, transiciones, mostrarNombre }: Props) {
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

  const puedeVerificar = transiciones.includes("APROBADA") && estado !== "PUBLICADA";
  const puedeRechazar = transiciones.includes("RECHAZADA");
  const puedePublicar = transiciones.includes("PUBLICADA");
  const inactivos = [
    !puedeVerificar && `Verificar: ${motivoInactivo("APROBADA", estado)}`,
    !puedeRechazar && `Rechazar: ${motivoInactivo("RECHAZADA", estado)}`,
    !puedePublicar && `Publicar: ${motivoInactivo("PUBLICADA", estado)}`,
  ].filter(Boolean) as string[];

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!puedeVerificar}
          onClick={() => setConfirmar("APROBADA")}
          className={claseBoton.primario}
        >
          <Check size={16} aria-hidden="true" />
          {ETIQUETA.APROBADA}
        </button>
        <button
          type="button"
          disabled={!puedeRechazar}
          onClick={() => {
            setMotivo("");
            setErrores({});
            setRechazo(true);
          }}
          className={claseBoton.peligro}
        >
          <X size={16} aria-hidden="true" />
          {ETIQUETA.RECHAZADA}
        </button>
        <button
          type="button"
          disabled={!puedePublicar}
          onClick={() => setConfirmar("PUBLICADA")}
          className={claseBoton.primario}
        >
          <Globe size={16} aria-hidden="true" />
          {ETIQUETA.PUBLICADA}
        </button>
        {estado === "PUBLICADA" && (
          <button
            type="button"
            onClick={() => setConfirmar("APROBADA")}
            className={claseBoton.secundario}
          >
            Despublicar
          </button>
        )}
        {estado === "PENDIENTE" && transiciones.includes("EN_REVISION") && (
          <button
            type="button"
            onClick={() => setConfirmar("EN_REVISION")}
            className={claseBoton.secundario}
          >
            {ETIQUETA.EN_REVISION}
          </button>
        )}
      </div>
      {inactivos.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-gris">
          {inactivos.map((t) => (
            <li key={t} className="flex items-start gap-1.5">
              <CircleHelp size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
              {t}
            </li>
          ))}
        </ul>
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
            ? `Se mostrará en «Propuestas publicadas» del portal, ${comoAparece(mostrarNombre)}.`
            : confirmar === "APROBADA" && estado === "PUBLICADA"
              ? "Dejará de verse en el portal; sigue verificada."
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
