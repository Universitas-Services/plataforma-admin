"use client";

import { ArrowDown, ArrowUp, Flag, Loader2, Pencil, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { Aviso } from "@/components/ui/aviso";
import { Dialogo } from "@/components/ui/dialogo";
import { SelectorFecha } from "@/components/ui/selector-fecha";
import {
  faseActualAccion,
  guardarFaseAccion,
  moverFaseAccion,
} from "@/lib/plataforma/acciones-alcaldia";
import type { FaseProceso } from "@/lib/plataforma/tipos";
import {
  claseBoton,
  claseCampo,
  ErrorCampo,
  Etiqueta,
  useRespuesta,
} from "@/components/alcaldia/comunes";

/* ---------- Marca ---------- */

const fechaCorta = new Intl.DateTimeFormat("es-VE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const fecha = (d?: string) => (d ? fechaCorta.format(new Date(`${d}T00:00:00Z`)) : undefined);

function DialogoFase({
  fase,
  onCerrar,
  aplicar,
  errores,
}: {
  fase?: FaseProceso;
  onCerrar: () => void;
  aplicar: ReturnType<typeof useRespuesta>["aplicar"];
  errores: Record<string, string>;
}) {
  const [datos, setDatos] = useState({
    nombre: fase?.nombre ?? "",
    descripcion: fase?.descripcion ?? "",
    inicio: fase?.inicio ?? "",
    fin: fase?.fin ?? "",
  });
  const [pendiente, iniciar] = useTransition();
  const campo = (k: keyof typeof datos) => ({
    id: `fase-${k}`,
    value: datos[k],
    onChange: (ev: { target: { value: string } }) => setDatos({ ...datos, [k]: ev.target.value }),
    "aria-invalid": errores[k] ? true : undefined,
    "aria-describedby": errores[k] ? `fase-${k}-error` : undefined,
  });

  return (
    <Dialogo abierto onCerrar={onCerrar} titulo={fase ? `Editar «${fase.nombre}»` : "Agregar fase"}>
      <form
        className="mt-4 space-y-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          iniciar(async () => {
            const r = await guardarFaseAccion({
              id: fase?.id,
              nombre: datos.nombre,
              descripcion: datos.descripcion,
              inicio: datos.inicio || undefined,
              fin: datos.fin || undefined,
            });
            if (aplicar(r)) onCerrar();
          });
        }}
      >
        <div>
          <Etiqueta htmlFor="fase-nombre">Nombre</Etiqueta>
          <input
            {...campo("nombre")}
            maxLength={60}
            className={`${claseCampo(errores.nombre)} h-11`}
          />
          <ErrorCampo id="fase-nombre-error" error={errores.nombre} />
        </div>
        <div>
          <Etiqueta htmlFor="fase-descripcion" opcional>
            Descripción
          </Etiqueta>
          <textarea {...campo("descripcion")} rows={3} maxLength={300} className={claseCampo()} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Etiqueta htmlFor="fase-inicio" opcional>
              Inicio
            </Etiqueta>
            <SelectorFecha
              id="fase-inicio"
              valor={datos.inicio}
              onCambio={(dia) => setDatos({ ...datos, inicio: dia })}
              max={datos.fin || undefined}
              vacio="Sin fecha"
            />
          </div>
          <div>
            <Etiqueta htmlFor="fase-fin" opcional>
              Cierre
            </Etiqueta>
            <SelectorFecha
              id="fase-fin"
              valor={datos.fin}
              onCambio={(dia) => setDatos({ ...datos, fin: dia })}
              min={datos.inicio || undefined}
              vacio="Sin fecha"
              invalido={!!errores.fin}
              describe={errores.fin ? "fase-fin-error" : undefined}
            />
          </div>
        </div>
        <ErrorCampo id="fase-fin-error" error={errores.fin} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCerrar} className={claseBoton.secundario}>
            Cancelar
          </button>
          <button type="submit" disabled={pendiente} className={claseBoton.primario}>
            {pendiente && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
            Guardar
          </button>
        </div>
      </form>
    </Dialogo>
  );
}

/** Termómetro del portal: fases cumplidas, la actual resaltada y las que vienen. */
function Termometro({ fases, actual }: { fases: FaseProceso[]; actual: number }) {
  return (
    <ol className="flex gap-1" aria-label="Vista previa del termómetro del portal">
      {fases.map((f, i) => (
        <li key={f.id} className="min-w-0 flex-1">
          <span
            aria-hidden="true"
            className={`block h-2 rounded-full ${
              i < actual ? "bg-marca" : i === actual ? "bg-ambar" : "bg-linea"
            }`}
          />
          <span
            className={`mt-1.5 hidden truncate text-xs md:block ${
              i === actual ? "font-bold text-tinta" : "text-gris"
            }`}
          >
            {f.nombre}
          </span>
          <span className="sr-only">
            {i < actual ? "cumplida" : i === actual ? "fase actual" : "por venir"}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function EditorFases({ fases, actual }: { fases: FaseProceso[]; actual: number }) {
  const [editando, setEditando] = useState<FaseProceso | "nueva">();
  const [pendiente, iniciar] = useTransition();
  const r = useRespuesta();
  const correr = (accion: () => ReturnType<typeof moverFaseAccion>) =>
    iniciar(async () => {
      r.aplicar(await accion());
    });

  return (
    <div className="space-y-5">
      {fases.length > 0 && (
        <div className="rounded-lg border border-linea bg-papel p-4">
          <p className="mb-3 text-sm font-bold text-tinta">
            Así se ve en el portal: fase {actual + 1} de {fases.length},{" "}
            <span className="text-marca-texto">{fases[actual]?.nombre}</span>
          </p>
          <Termometro fases={fases} actual={actual} />
        </div>
      )}
      <ol className="space-y-2">
        {fases.map((f, i) => (
          <li
            key={f.id}
            className={`rounded-lg border bg-papel p-4 ${
              i === actual ? "border-marca-texto" : "border-linea"
            }`}
          >
            <div className="flex flex-wrap items-start gap-3">
              <span
                aria-hidden="true"
                className="grid size-8 shrink-0 place-items-center rounded-full bg-cabecera text-sm font-bold tabular-nums"
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1 basis-48">
                <p className="font-bold text-tinta">
                  {f.nombre}
                  {i === actual && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-ambar/50 px-2 py-0.5 align-middle text-xs font-semibold text-ambar-texto">
                      <Flag size={12} aria-hidden="true" />
                      Fase actual
                    </span>
                  )}
                </p>
                {f.descripcion && <p className="mt-0.5 text-sm text-cuerpo">{f.descripcion}</p>}
                {(f.inicio || f.fin) && (
                  <p className="mt-1 text-sm text-gris tabular-nums">
                    {fecha(f.inicio) ?? "Sin fecha"} → {fecha(f.fin) ?? "sin fecha"}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  disabled={pendiente || i === 0}
                  onClick={() => correr(() => moverFaseAccion(f.id, -1))}
                  className={claseBoton.enlace}
                  aria-label={`Subir «${f.nombre}»`}
                >
                  <ArrowUp size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={pendiente || i === fases.length - 1}
                  onClick={() => correr(() => moverFaseAccion(f.id, 1))}
                  className={claseBoton.enlace}
                  aria-label={`Bajar «${f.nombre}»`}
                >
                  <ArrowDown size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    r.setErrores({});
                    setEditando(f);
                  }}
                  className={claseBoton.enlace}
                >
                  <Pencil size={14} aria-hidden="true" />
                  Editar<span className="sr-only"> «{f.nombre}»</span>
                </button>
                {i !== actual && (
                  <button
                    type="button"
                    disabled={pendiente}
                    onClick={() => correr(() => faseActualAccion(f.id))}
                    className={claseBoton.enlace}
                  >
                    <Flag size={14} aria-hidden="true" />
                    Marcar actual<span className="sr-only"> «{f.nombre}»</span>
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        disabled={fases.length >= 12}
        onClick={() => {
          r.setErrores({});
          setEditando("nueva");
        }}
        className={claseBoton.secundario}
      >
        <Plus size={16} aria-hidden="true" />
        Agregar fase
      </button>
      {editando && (
        <DialogoFase
          key={editando === "nueva" ? "nueva" : editando.id}
          fase={editando === "nueva" ? undefined : editando}
          onCerrar={() => setEditando(undefined)}
          aplicar={r.aplicar}
          errores={r.errores}
        />
      )}
      <Aviso aviso={r.aviso} onCerrar={() => r.setAviso(undefined)} />
    </div>
  );
}
