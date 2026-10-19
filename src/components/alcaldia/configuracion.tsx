"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  Flag,
  Loader2,
  Pencil,
  Plus,
  Power,
  Upload,
} from "lucide-react";
import { useState, useTransition } from "react";
import { SelectorColor, esHex } from "@/components/onboarding/selector-color";
import { VistaPreviaMarca } from "@/components/onboarding/vista-previa";
import { Aviso } from "@/components/ui/aviso";
import { Dialogo } from "@/components/ui/dialogo";
import {
  activarItemAccion,
  faseActualAccion,
  guardarFaseAccion,
  guardarItemAccion,
  marcaAccion,
  moverFaseAccion,
} from "@/lib/plataforma/acciones-alcaldia";
import { evaluarMarca, explicarContraste } from "@/lib/marca";
import type { FaseProceso, ItemCatalogo, TipoCatalogo } from "@/lib/plataforma/tipos";
import { claseBoton, claseCampo, ErrorCampo, Etiqueta, useRespuesta } from "./comunes";

/* ---------- Marca ---------- */

export function FormularioMarca({
  nombre,
  sigla,
  primario: p0,
  secundario: s0,
  lema: l0,
  logo,
}: {
  nombre: string;
  sigla: string;
  primario: string;
  secundario?: string;
  lema?: string;
  logo?: string;
}) {
  const [primario, setPrimario] = useState(p0);
  const [secundario, setSecundario] = useState(s0 ?? "");
  const [lema, setLema] = useState(l0 ?? "");
  const [vistaLogo, setVistaLogo] = useState(logo);
  const [pendiente, iniciar] = useTransition();
  const r = useRespuesta();
  const valido = esHex(primario);
  const e = valido ? evaluarMarca(primario) : undefined;
  const avisoContraste = e && !e.ok ? explicarContraste(e) : undefined;

  return (
    <form
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        iniciar(async () => {
          r.aplicar(await marcaAccion(fd));
        });
      }}
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]"
    >
      <div className="space-y-6">
        <SelectorColor
          id="primario"
          etiqueta="Color primario"
          valor={primario}
          onCambio={setPrimario}
          ayuda="Pinta la línea, los marcadores y el botón principal. Debe cumplir el contraste AA."
          error={r.errores.primario ?? avisoContraste}
        />
        {e?.ok && (
          <p role="status" className="flex items-center gap-2 text-sm text-turquesa-texto">
            <Check size={16} aria-hidden="true" />
            Cumple el contraste AA
          </p>
        )}
        <SelectorColor
          id="secundario"
          etiqueta="Color secundario"
          opcional
          valor={secundario}
          onCambio={setSecundario}
          porDefecto="#F2A900"
          ayuda="Para detalles decorativos; nunca para texto."
        />
        <div>
          <Etiqueta htmlFor="lema" opcional>
            Lema
          </Etiqueta>
          <input
            id="lema"
            name="lema"
            value={lema}
            maxLength={120}
            onChange={(ev) => setLema(ev.target.value)}
            aria-invalid={r.errores.lema ? true : undefined}
            aria-describedby={r.errores.lema ? "lema-error" : undefined}
            className={`${claseCampo(r.errores.lema)} h-11`}
          />
          <ErrorCampo id="lema-error" error={r.errores.lema} />
        </div>
        <div>
          <Etiqueta htmlFor="logo" opcional>
            Cambiar el logo
          </Etiqueta>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-dashed border-linea px-3 text-sm text-cuerpo hover:border-tenue has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-marca-texto">
            <Upload size={16} aria-hidden="true" className="text-gris" />
            PNG, JPG o SVG, hasta 1 MB
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              className="sr-only"
              aria-describedby={r.errores.logo ? "logo-error" : undefined}
              onChange={(ev) => {
                const f = ev.target.files?.[0];
                if (f) setVistaLogo(URL.createObjectURL(f));
              }}
            />
          </label>
          <ErrorCampo id="logo-error" error={r.errores.logo} />
        </div>
        <button type="submit" disabled={pendiente} className={claseBoton.primario}>
          {pendiente && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
          Guardar la marca
        </button>
      </div>
      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 text-sm font-bold text-tinta">Vista previa</p>
        <VistaPreviaMarca
          nombre={nombre}
          sigla={sigla}
          primario={valido ? primario : undefined}
          secundario={esHex(secundario) ? secundario : undefined}
          lema={lema}
          logo={vistaLogo}
        />
      </div>
      <Aviso aviso={r.aviso} onCerrar={() => r.setAviso(undefined)} />
    </form>
  );
}

/* ---------- Catálogos ---------- */

function DialogoItem({
  tipo,
  item,
  abierto,
  onCerrar,
  aplicar,
  errores,
}: {
  tipo: TipoCatalogo;
  item?: ItemCatalogo;
  abierto: boolean;
  onCerrar: () => void;
  aplicar: ReturnType<typeof useRespuesta>["aplicar"];
  errores: Record<string, string>;
}) {
  const [nombre, setNombre] = useState(item?.nombre ?? "");
  const [pendiente, iniciar] = useTransition();
  return (
    <Dialogo abierto={abierto} onCerrar={onCerrar} titulo={item ? "Renombrar" : "Agregar valor"}>
      <form
        className="mt-4 space-y-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          iniciar(async () => {
            if (aplicar(await guardarItemAccion(tipo, nombre, item?.id))) {
              if (!item) setNombre("");
              onCerrar();
            }
          });
        }}
      >
        <div>
          <Etiqueta htmlFor={`item-${item?.id ?? "nuevo"}`}>Nombre</Etiqueta>
          <input
            id={`item-${item?.id ?? "nuevo"}`}
            value={nombre}
            maxLength={80}
            onChange={(ev) => setNombre(ev.target.value)}
            aria-invalid={errores.nombre ? true : undefined}
            className={`${claseCampo(errores.nombre)} h-11`}
          />
          <ErrorCampo id="item-error" error={errores.nombre} />
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

  return (
    <section aria-labelledby={`cat-${tipo}`} className="rounded-lg border border-linea bg-papel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-fila px-4 py-3">
        <h3 id={`cat-${tipo}`} className="font-bold text-tinta">
          {titulo}{" "}
          <span className="text-sm font-normal text-gris">
            ({activos} de {items.length} activos)
          </span>
        </h3>
        <button
          type="button"
          onClick={() => {
            r.setErrores({});
            setEditando("nuevo");
          }}
          className={claseBoton.secundario}
        >
          <Plus size={16} aria-hidden="true" />
          Agregar<span className="sr-only"> a {titulo}</span>
        </button>
      </div>
      {items.length ? (
        <ul className="divide-y divide-fila">
          {items.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-2 px-4 py-1.5">
              <span
                className={`min-w-0 flex-1 ${i.activo ? "text-tinta" : "text-gris line-through"}`}
              >
                {i.nombre}
                {!i.activo && <span className="sr-only"> (desactivado)</span>}
              </span>
              <button
                type="button"
                onClick={() => {
                  r.setErrores({});
                  setEditando(i);
                }}
                className={claseBoton.enlace}
              >
                <Pencil size={14} aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Renombrar</span>
                <span className="sr-only"> {i.nombre}</span>
              </button>
              <button
                type="button"
                disabled={pendiente}
                onClick={() =>
                  iniciar(async () => {
                    r.aplicar(await activarItemAccion(tipo, i.id, !i.activo));
                  })
                }
                className={claseBoton.enlace}
              >
                <Power size={14} aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">
                  {i.activo ? "Desactivar" : "Activar"}
                </span>
                <span className="sr-only"> {i.nombre}</span>
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
          item={editando === "nuevo" ? undefined : editando}
          abierto
          onCerrar={() => setEditando(undefined)}
          aplicar={r.aplicar}
          errores={r.errores}
        />
      )}
      <Aviso aviso={r.aviso} onCerrar={() => r.setAviso(undefined)} />
    </section>
  );
}

/* ---------- Fases del proceso ---------- */

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
            <input {...campo("inicio")} type="date" className={`${claseCampo()} h-11`} />
          </div>
          <div>
            <Etiqueta htmlFor="fase-fin" opcional>
              Cierre
            </Etiqueta>
            <input {...campo("fin")} type="date" className={`${claseCampo(errores.fin)} h-11`} />
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
