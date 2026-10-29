"use client";

import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Power } from "lucide-react";
import { useState, useTransition } from "react";
import {
  claseBoton,
  claseCampo,
  ErrorCampo,
  Etiqueta,
  useRespuesta,
} from "@/components/alcaldia/comunes";
import { Aviso } from "@/components/ui/aviso";
import { Dialogo } from "@/components/ui/dialogo";
import {
  activarItemAccion,
  guardarItemAccion,
  moverItemAccion,
} from "@/lib/plataforma/acciones-alcaldia";
import type { ItemCatalogo, TipoCatalogo } from "@/lib/plataforma/tipos";

/*
 * Un desplegable del portal (R16): el Administrador agrega, renombra, ordena y activa o
 * desactiva valores. No se borran: desactivado, el portal deja de ofrecerlo, pero lo ya
 * guardado lo conserva.
 */

const NOMBRE_MAX = 80;

function DialogoItem({
  tipo,
  titulo,
  item,
  onCerrar,
  aplicar,
  errores,
}: {
  tipo: TipoCatalogo;
  titulo: string;
  item?: ItemCatalogo;
  onCerrar: () => void;
  aplicar: ReturnType<typeof useRespuesta>["aplicar"];
  errores: Record<string, string>;
}) {
  const [nombre, setNombre] = useState(item?.nombre ?? "");
  const [pendiente, iniciar] = useTransition();
  const id = `item-${tipo}-${item?.id ?? "nuevo"}`;
  return (
    <Dialogo
      abierto
      onCerrar={onCerrar}
      titulo={item ? `Renombrar «${item.nombre}»` : `Agregar a ${titulo}`}
      descripcion={
        item
          ? "Lo ya guardado con este valor se verá con el nombre nuevo."
          : "El portal lo ofrece en cuanto lo guardes."
      }
    >
      <form
        className="mt-4 space-y-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          iniciar(async () => {
            if (aplicar(await guardarItemAccion(tipo, nombre, item?.id))) onCerrar();
          });
        }}
      >
        <div>
          <Etiqueta htmlFor={id}>Nombre</Etiqueta>
          <input
            id={id}
            value={nombre}
            maxLength={NOMBRE_MAX}
            autoFocus
            onChange={(ev) => setNombre(ev.target.value)}
            aria-invalid={errores.nombre ? true : undefined}
            aria-describedby={errores.nombre ? `${id}-error` : undefined}
            className={`${claseCampo(errores.nombre)} h-11`}
          />
          <ErrorCampo id={`${id}-error`} error={errores.nombre} />
        </div>
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

export function EditorCatalogo({
  tipo,
  titulo,
  items,
}: {
  tipo: TipoCatalogo;
  titulo: string;
  items: ItemCatalogo[];
}) {
  const [editando, setEditando] = useState<ItemCatalogo | "nuevo">();
  const [pendiente, iniciar] = useTransition();
  const r = useRespuesta();
  const activos = items.filter((i) => i.activo).length;
  const abrir = (x: ItemCatalogo | "nuevo") => {
    r.setErrores({});
    setEditando(x);
  };

  return (
    <section aria-labelledby={`cat-${tipo}`} className="rounded-lg border border-linea bg-papel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-fila px-4 py-3">
        <h2 id={`cat-${tipo}`} className="text-base font-bold text-tinta">
          {titulo}{" "}
          <span className="text-sm font-normal text-gris tabular-nums">
            ({activos} de {items.length} activos)
          </span>
        </h2>
        <button type="button" onClick={() => abrir("nuevo")} className={claseBoton.secundario}>
          <Plus size={16} aria-hidden="true" />
          Agregar<span className="sr-only"> a {titulo}</span>
        </button>
      </div>
      {items.length ? (
        <ul className="divide-y divide-fila">
          {items.map((i, n) => (
            <li key={i.id} className="flex flex-wrap items-center gap-1 px-4 py-1.5">
              <span
                className={`min-w-0 flex-1 py-1.5 ${i.activo ? "text-tinta" : "text-gris line-through"}`}
              >
                {i.nombre}
                {!i.activo && (
                  <span className="ml-2 rounded-full bg-cabecera px-2 py-0.5 text-xs font-semibold text-gris no-underline">
                    Inactivo
                  </span>
                )}
              </span>
              <button
                type="button"
                disabled={pendiente || n === 0}
                onClick={() =>
                  iniciar(async () => void r.aplicar(await moverItemAccion(tipo, i.id, -1)))
                }
                aria-label={`Subir «${i.nombre}»`}
                className={claseBoton.enlace}
              >
                <ArrowUp size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                disabled={pendiente || n === items.length - 1}
                onClick={() =>
                  iniciar(async () => void r.aplicar(await moverItemAccion(tipo, i.id, 1)))
                }
                aria-label={`Bajar «${i.nombre}»`}
                className={claseBoton.enlace}
              >
                <ArrowDown size={14} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => abrir(i)} className={claseBoton.enlace}>
                <Pencil size={14} aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Renombrar</span>
                <span className="sr-only"> «{i.nombre}»</span>
              </button>
              <button
                type="button"
                disabled={pendiente}
                onClick={() =>
                  iniciar(
                    async () => void r.aplicar(await activarItemAccion(tipo, i.id, !i.activo)),
                  )
                }
                className={claseBoton.enlace}
              >
                <Power size={14} aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">
                  {i.activo ? "Desactivar" : "Activar"}
                </span>
                <span className="sr-only"> «{i.nombre}»</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-4 text-sm text-gris">
          Sin valores todavía. Agrega el primero para que el portal pueda ofrecerlo.
        </p>
      )}
      {editando && (
        <DialogoItem
          key={editando === "nuevo" ? "nuevo" : editando.id}
          tipo={tipo}
          titulo={titulo}
          item={editando === "nuevo" ? undefined : editando}
          onCerrar={() => setEditando(undefined)}
          aplicar={r.aplicar}
          errores={r.errores}
        />
      )}
      <Aviso aviso={r.aviso} onCerrar={() => r.setAviso(undefined)} />
    </section>
  );
}
