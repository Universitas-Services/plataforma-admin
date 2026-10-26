"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Aviso, useAviso } from "@/components/ui/aviso";
import { Dialogo } from "@/components/ui/dialogo";
import { Selector } from "@/components/ui/selector";
import {
  crearItemMarcoAccion,
  eliminarItemMarcoAccion,
  guardarItemMarcoAccion,
  ordenarMarcoAccion,
} from "@/lib/plataforma/acciones-contenido";
import { MensajeError, claseEntrada } from "./campos-medios";
import { VistaPreviaMarco } from "./vista-previa-marco";

type TipoDestino = "NOTICIA" | "DOCUMENTO";

export type ItemEditor = {
  id: string;
  titulo: string;
  descripcion: string;
  activo: boolean;
  boton?: { texto: string; destino: { tipo: TipoDestino; id: string } };
  botonDisponible: boolean;
  destinoTitulo?: string;
  ejemplo?: boolean;
};

export type DestinoOpcion = { id: string; titulo: string };

const MAX_ACTIVOS = 10;
const TEXTO_POR_DEFECTO: Record<TipoDestino, string> = {
  NOTICIA: "Leer la noticia",
  DOCUMENTO: "Ver el documento",
};

const claseSecundario =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-linea px-4 font-semibold text-tinta hover:border-tenue disabled:cursor-not-allowed disabled:text-tenue";
const clasePrimario =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-marca bg-marca px-5 font-semibold text-sobre-marca hover:brightness-110 disabled:cursor-not-allowed disabled:border-linea disabled:bg-superficie disabled:text-tenue";
const claseIcono =
  "grid size-10 place-items-center rounded-control text-tinta hover:bg-superficie aria-disabled:text-tenue";

/**
 * Marco legal de Conoce el PDUL: ítems con título, descripción y un botón opcional a una noticia
 * o a un documento. Solo los activos (10 como máximo) se muestran en el portal, en el orden de
 * esta lista. Antes de guardar se puede ver cómo quedará la sección.
 */
export function EditorMarcoLegal({
  items,
  noticias,
  documentos,
}: {
  items: ItemEditor[];
  noticias: DestinoOpcion[];
  documentos: DestinoOpcion[];
}) {
  const activosIniciales = items.filter((i) => i.activo).map((i) => i.id);
  const [orden, setOrden] = useState(activosIniciales);
  const [editando, setEditando] = useState<ItemEditor | "nuevo">();
  const [eliminando, setEliminando] = useState<ItemEditor>();
  const [previa, setPrevia] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [anuncio, setAnuncio] = useState("");
  const { aviso, mostrar, cerrar } = useAviso();

  // La lista del servidor manda: si cambia (se guardó algo), el orden local vuelve a ella.
  const [base, setBase] = useState(activosIniciales.join());
  if (base !== activosIniciales.join()) {
    setBase(activosIniciales.join());
    setOrden(activosIniciales);
  }

  const porId = new Map(items.map((i) => [i.id, i]));
  const activos = orden.map((id) => porId.get(id)).filter((i) => !!i);
  const inactivos = items.filter((i) => !i.activo);
  const ordenCambiado = orden.join() !== activosIniciales.join();

  function mover(desde: number, hasta: number) {
    if (hasta < 0 || hasta >= orden.length) return;
    const lista = [...orden];
    const [x] = lista.splice(desde, 1);
    lista.splice(hasta, 0, x!);
    setOrden(lista);
    setAnuncio(`«${porId.get(x!)?.titulo}» pasó a la posición ${hasta + 1} de ${lista.length}.`);
  }

  async function ejecutar(accion: () => Promise<{ ok: boolean; mensaje: string }>) {
    setOcupado(true);
    const r = await accion().catch(() => ({
      ok: false,
      mensaje: "No se pudo guardar: revisa tu conexión.",
    }));
    setOcupado(false);
    mostrar({ tipo: r.ok ? "exito" : "error", texto: r.mensaje });
    return r.ok;
  }

  const alternar = (it: ItemEditor) =>
    ejecutar(() =>
      guardarItemMarcoAccion(it.id, {
        titulo: it.titulo,
        descripcion: it.descripcion,
        activo: !it.activo,
        boton: it.boton ?? null,
      }),
    );

  const previaItems = activos.map((i) => ({
    titulo: i.titulo,
    descripcion: i.descripcion,
    boton: i.boton && i.botonDisponible ? { texto: i.boton.texto } : undefined,
  }));

  return (
    <div className="pb-24 lg:pb-0">
      <p aria-live="polite" className="sr-only">
        {anuncio}
      </p>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gris">
          <strong className="text-tinta tabular-nums">
            {activos.length} de {MAX_ACTIVOS}
          </strong>{" "}
          ítems en el portal · {inactivos.length} guardados sin mostrar
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setPrevia(true)} className={claseSecundario}>
            <Eye size={18} aria-hidden="true" />
            Vista previa
          </button>
          <button type="button" onClick={() => setEditando("nuevo")} className={clasePrimario}>
            <Plus size={18} aria-hidden="true" />
            Nuevo ítem
          </button>
        </div>
      </div>

      <section aria-labelledby="titulo-activos">
        <h2 id="titulo-activos" className="text-lg font-bold">
          En el portal, en este orden
        </h2>
        {activos.length ? (
          <ol className="mt-4 space-y-2">
            {activos.map((it, i) => (
              <Fila
                key={it.id}
                item={it}
                posicion={i + 1}
                ocupado={ocupado}
                onEditar={() => setEditando(it)}
                onAlternar={() => alternar(it)}
                onEliminar={() => setEliminando(it)}
              >
                <button
                  type="button"
                  onClick={() => mover(i, i - 1)}
                  aria-disabled={i === 0}
                  aria-label={`Subir «${it.titulo}»`}
                  className={claseIcono}
                >
                  <ArrowUp size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => mover(i, i + 1)}
                  aria-disabled={i === activos.length - 1}
                  aria-label={`Bajar «${it.titulo}»`}
                  className={claseIcono}
                >
                  <ArrowDown size={16} aria-hidden="true" />
                </button>
              </Fila>
            ))}
          </ol>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-linea p-4 text-sm text-gris">
            Ningún ítem activo: el portal muestra solo la introducción de la sección.
          </p>
        )}
        {ordenCambiado && (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            <p className="text-sm text-gris">El orden cambió y aún no se guarda.</p>
            <button
              type="button"
              onClick={() => setOrden(activosIniciales)}
              className={claseSecundario}
            >
              Deshacer
            </button>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => ejecutar(() => ordenarMarcoAccion(orden))}
              className={clasePrimario}
            >
              {ocupado ? (
                <Loader2 size={18} aria-hidden="true" className="animate-spin" />
              ) : (
                <Save size={18} aria-hidden="true" />
              )}
              Guardar el orden
            </button>
          </div>
        )}
      </section>

      {inactivos.length > 0 && (
        <section aria-labelledby="titulo-inactivos" className="mt-10">
          <h2 id="titulo-inactivos" className="text-lg font-bold">
            Guardados sin mostrar
          </h2>
          <ul className="mt-4 space-y-2">
            {inactivos.map((it) => (
              <Fila
                key={it.id}
                item={it}
                ocupado={ocupado}
                lleno={activos.length >= MAX_ACTIVOS}
                onEditar={() => setEditando(it)}
                onAlternar={() => alternar(it)}
                onEliminar={() => setEliminando(it)}
              />
            ))}
          </ul>
        </section>
      )}

      <Dialogo
        abierto={previa}
        onCerrar={() => setPrevia(false)}
        titulo="Vista previa del Marco legal"
        descripcion="Aproximación de la sección en Conoce el PDUL, con los ítems activos en el orden de la lista (incluido el orden sin guardar)."
        ancho="max-w-3xl"
      >
        <VistaPreviaMarco items={previaItems} />
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={() => setPrevia(false)} className={claseSecundario}>
            Cerrar
          </button>
        </div>
      </Dialogo>

      {editando && (
        <FormularioItem
          key={editando === "nuevo" ? "nuevo" : editando.id}
          item={editando === "nuevo" ? undefined : editando}
          lleno={activos.length >= MAX_ACTIVOS}
          noticias={noticias}
          documentos={documentos}
          onCerrar={() => setEditando(undefined)}
          onGuardado={(texto) => {
            setEditando(undefined);
            mostrar({ tipo: "exito", texto });
          }}
        />
      )}

      <Dialogo
        abierto={!!eliminando}
        onCerrar={() => setEliminando(undefined)}
        titulo="¿Eliminar este ítem?"
        descripcion={
          eliminando
            ? `«${eliminando.titulo}» sale del panel y, si estaba activo, del portal.`
            : undefined
        }
      >
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEliminando(undefined)}
            className={claseSecundario}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={ocupado}
            onClick={async () => {
              const it = eliminando!;
              if (await ejecutar(() => eliminarItemMarcoAccion(it.id))) setEliminando(undefined);
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-control bg-peligro px-4 font-semibold text-papel hover:brightness-110"
          >
            <Trash2 size={18} aria-hidden="true" />
            Eliminar
          </button>
        </div>
      </Dialogo>

      <Aviso aviso={aviso} onCerrar={cerrar} />
    </div>
  );
}

function Fila({
  item,
  posicion,
  ocupado,
  lleno = false,
  onEditar,
  onAlternar,
  onEliminar,
  children,
}: {
  item: ItemEditor;
  posicion?: number;
  ocupado: boolean;
  /** Ya hay 10 activos: este inactivo no se puede activar. */
  lleno?: boolean;
  onEditar: () => void;
  onAlternar: () => void;
  onEliminar: () => void;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-linea bg-papel p-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {posicion ? (
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-rojo font-bold text-papel tabular-nums">
            <span className="sr-only">Posición </span>
            {posicion}
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-superficie text-gris"
          >
            <EyeOff size={16} />
          </span>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-tinta">
            {item.titulo}
            {item.ejemplo && <span className="ml-2 text-xs font-medium text-gris">(ejemplo)</span>}
          </p>
          <p className="mt-0.5 line-clamp-2 text-sm text-gris">{item.descripcion}</p>
          {item.boton &&
            (item.botonDisponible ? (
              <p className="mt-1 text-sm text-tinta">
                Botón «{item.boton.texto}» → {item.destinoTitulo}
              </p>
            ) : (
              <p className="mt-1 flex items-start gap-1.5 text-sm text-ambar-texto">
                <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                El botón apunta a contenido que ya no está publicado
                {item.destinoTitulo ? ` («${item.destinoTitulo}»)` : ""}: el portal no lo muestra.
              </p>
            ))}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1 sm:justify-end">
        {children}
        <button
          type="button"
          onClick={onAlternar}
          disabled={ocupado || (!item.activo && lleno)}
          title={!item.activo && lleno ? "Ya hay 10 ítems en el portal" : undefined}
          className={claseSecundario}
        >
          {item.activo ? (
            <EyeOff size={16} aria-hidden="true" />
          ) : (
            <Eye size={16} aria-hidden="true" />
          )}
          {item.activo ? "Quitar del portal" : "Mostrar en el portal"}
        </button>
        <button
          type="button"
          onClick={onEditar}
          aria-label={`Editar «${item.titulo}»`}
          className={claseIcono}
        >
          <Pencil size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onEliminar}
          aria-label={`Eliminar «${item.titulo}»`}
          className={claseIcono}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

/** Crear o editar un ítem, con la vista previa de cómo se verá en el portal. */
function FormularioItem({
  item,
  lleno,
  noticias,
  documentos,
  onCerrar,
  onGuardado,
}: {
  item?: ItemEditor;
  lleno: boolean;
  noticias: DestinoOpcion[];
  documentos: DestinoOpcion[];
  onCerrar: () => void;
  onGuardado: (mensaje: string) => void;
}) {
  const [titulo, setTitulo] = useState(item?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(item?.descripcion ?? "");
  const [activo, setActivo] = useState(item ? item.activo : !lleno);
  const [conBoton, setConBoton] = useState(!!item?.boton);
  const [tipo, setTipo] = useState<TipoDestino>(item?.boton?.destino.tipo ?? "NOTICIA");
  const [destino, setDestino] = useState(item?.boton?.destino.id ?? "");
  const [texto, setTexto] = useState(item?.boton?.texto ?? TEXTO_POR_DEFECTO.NOTICIA);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Sin activar este y con 10 activos, no puede pasar al portal.
  const bloqueado = lleno && !item?.activo;
  const opciones = tipo === "NOTICIA" ? noticias : documentos;
  // El destino guardado puede haberse despublicado: se sigue mostrando para no perderlo.
  const destinoGuardado =
    item?.boton && item.boton.destino.tipo === tipo && !opciones.some((o) => o.id === destino)
      ? [
          {
            id: item.boton.destino.id,
            titulo: `${item.destinoTitulo ?? "Sin título"} (no publicado)`,
          },
        ]
      : [];

  function cambiarTipo(t: TipoDestino) {
    // El texto por defecto acompaña al tipo, salvo que la persona lo haya cambiado.
    if (texto === TEXTO_POR_DEFECTO[tipo]) setTexto(TEXTO_POR_DEFECTO[t]);
    setTipo(t);
    setDestino("");
  }

  async function guardar() {
    setGuardando(true);
    const datos = {
      titulo,
      descripcion,
      activo,
      boton: conBoton ? { texto, destino: { tipo, id: destino } } : null,
    };
    const r = await (
      item ? guardarItemMarcoAccion(item.id, datos) : crearItemMarcoAccion(datos)
    ).catch(() => ({
      ok: false,
      mensaje: "No se pudo guardar: revisa tu conexión.",
      errores: undefined,
    }));
    setGuardando(false);
    if (r.ok) return onGuardado(r.mensaje);
    setErrores(r.errores ?? {});
    setMensaje(r.mensaje);
  }

  return (
    <Dialogo
      abierto
      onCerrar={onCerrar}
      titulo={item ? "Editar ítem del Marco legal" : "Nuevo ítem del Marco legal"}
      ancho="max-w-4xl"
    >
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          {mensaje && (
            <p role="alert" className="rounded-lg bg-peligro/10 p-3 text-sm text-peligro">
              {mensaje}
            </p>
          )}
          <div>
            <label htmlFor="titulo" className="mb-1.5 block text-sm font-bold text-tinta">
              Título
            </label>
            <input
              id="titulo"
              value={titulo}
              maxLength={200}
              onChange={(e) => setTitulo(e.target.value)}
              aria-invalid={errores.titulo ? true : undefined}
              aria-describedby={errores.titulo ? "titulo-error" : undefined}
              className={claseEntrada(errores.titulo)}
            />
            <MensajeError id="titulo" error={errores.titulo} />
          </div>
          <div>
            <label htmlFor="descripcion" className="mb-1.5 block text-sm font-bold text-tinta">
              Descripción
            </label>
            <textarea
              id="descripcion"
              value={descripcion}
              maxLength={1200}
              rows={5}
              onChange={(e) => setDescripcion(e.target.value)}
              aria-invalid={errores.descripcion ? true : undefined}
              aria-describedby={`descripcion-contador${errores.descripcion ? " descripcion-error" : ""}`}
              className={`${claseEntrada(errores.descripcion)} h-auto py-2.5 leading-relaxed`}
            />
            <p id="descripcion-contador" className="mt-1 text-right text-xs text-gris tabular-nums">
              {descripcion.length} / 1200
            </p>
            <MensajeError id="descripcion" error={errores.descripcion} />
          </div>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={activo}
              disabled={bloqueado}
              onChange={(e) => setActivo(e.target.checked)}
              aria-describedby="activo-ayuda"
              className="mt-0.5 size-5 shrink-0 accent-[var(--marca)]"
            />
            <span>
              <span className="font-semibold text-tinta">Mostrar en el portal</span>
              <span id="activo-ayuda" className="block text-sm text-gris">
                {bloqueado
                  ? "Ya hay 10 ítems en el portal: se guarda sin mostrarse."
                  : "Hasta 10 ítems a la vez. Si es nuevo, queda al final."}
              </span>
              <MensajeError id="activo" error={errores.activo} />
            </span>
          </label>

          <fieldset className="rounded-lg border border-linea p-4">
            <legend className="px-1 text-sm font-bold text-tinta">Botón</legend>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={conBoton}
                onChange={(e) => setConBoton(e.target.checked)}
                className="size-5 shrink-0 accent-[var(--marca)]"
              />
              <span className="font-semibold text-tinta">
                Agregar un botón a una noticia o un documento
              </span>
            </label>
            {conBoton && (
              <div className="mt-4 space-y-4">
                <div role="radiogroup" aria-label="Lleva a" className="flex gap-2">
                  {(["NOTICIA", "DOCUMENTO"] as const).map((t) => (
                    <label
                      key={t}
                      className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-control border px-3 font-semibold ${
                        tipo === t
                          ? "border-marca bg-marca-suave text-marca-texto"
                          : "border-linea text-tinta"
                      }`}
                    >
                      <input
                        type="radio"
                        name="tipoDestino"
                        checked={tipo === t}
                        onChange={() => cambiarTipo(t)}
                        className="sr-only"
                      />
                      {t === "NOTICIA" ? "Una noticia" : "Un documento"}
                    </label>
                  ))}
                </div>
                <Selector
                  id="boton-destino-id"
                  etiqueta={tipo === "NOTICIA" ? "Noticia publicada" : "Documento público"}
                  opciones={[...destinoGuardado, ...opciones].map((o) => ({
                    valor: o.id,
                    texto: o.titulo,
                  }))}
                  valor={destino}
                  onCambio={setDestino}
                  vacio={tipo === "NOTICIA" ? "Elige una noticia" : "Elige un documento"}
                  error={errores["boton-destino-id"]}
                />
                <div>
                  <label
                    htmlFor="boton-texto"
                    className="mb-1.5 block text-sm font-bold text-tinta"
                  >
                    Texto del botón
                  </label>
                  <input
                    id="boton-texto"
                    value={texto}
                    maxLength={40}
                    onChange={(e) => setTexto(e.target.value)}
                    aria-invalid={errores["boton-texto"] ? true : undefined}
                    aria-describedby={errores["boton-texto"] ? "boton-texto-error" : undefined}
                    className={claseEntrada(errores["boton-texto"])}
                  />
                  <MensajeError id="boton-texto" error={errores["boton-texto"]} />
                </div>
              </div>
            )}
          </fieldset>
        </div>

        <div className="min-w-0">
          <p className="text-sm font-bold text-tinta">Vista previa</p>
          <p className="text-sm text-gris">Así se verá este ítem en Conoce el PDUL.</p>
          <VistaPreviaMarco
            items={[
              {
                titulo,
                descripcion,
                boton: conBoton && destino ? { texto } : undefined,
              },
            ]}
          />
          {!activo && (
            <p className="mt-2 text-sm text-gris">
              Sin «Mostrar en el portal», se guarda pero no se ve.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onCerrar} className={claseSecundario}>
          Cancelar
        </button>
        <button type="button" onClick={guardar} disabled={guardando} className={clasePrimario}>
          {guardando ? (
            <Loader2 size={18} aria-hidden="true" className="animate-spin" />
          ) : (
            <Save size={18} aria-hidden="true" />
          )}
          Guardar
        </button>
      </div>
    </Dialogo>
  );
}
