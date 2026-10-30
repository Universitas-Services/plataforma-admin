"use client";

import { Loader2, Plus, Save } from "lucide-react";
import { useState, useTransition } from "react";
import { claseBoton } from "@/components/alcaldia/comunes";
import { CampoTexto, FilaLista, mover } from "@/components/configuracion/campos-sitio";
import { Aviso, useAviso } from "@/components/ui/aviso";
import { Selector } from "@/components/ui/selector";
import { guardarActoresAccion, guardarEncabezadoAccion } from "@/lib/plataforma/acciones-sitio";
import {
  ICONOS_SECTOR,
  LIMITES_SITIO,
  POSICIONES,
  type Actores,
  type Encabezado,
  type FotoEncabezado,
  type IconoSector,
} from "@/lib/plataforma/sitio";
import { CampoImagenRecortada } from "./campos-medios";

/*
 * Encabezado y Registro de actores del Inicio del portal (R17). Cada bloque se guarda por
 * separado, como el mensaje del alcalde.
 */

function useGuardar(
  accion: (
    d: unknown,
  ) => Promise<{ ok: boolean; mensaje: string; errores?: Record<string, string> }>,
) {
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [pendiente, iniciar] = useTransition();
  const { aviso, mostrar, cerrar } = useAviso();
  const guardar = (datos: unknown) =>
    iniciar(async () => {
      const r = await accion(datos);
      setErrores(r.errores ?? {});
      mostrar({ tipo: r.ok ? "exito" : "error", texto: r.mensaje });
    });
  return { errores, pendiente, aviso, cerrar, guardar };
}

function BotonGuardar({ pendiente, texto }: { pendiente: boolean; texto: string }) {
  return (
    <button type="submit" disabled={pendiente} className={claseBoton.primario}>
      {pendiente ? (
        <Loader2 size={16} aria-hidden="true" className="animate-spin" />
      ) : (
        <Save size={16} aria-hidden="true" />
      )}
      {texto}
    </button>
  );
}

export function EditorEncabezado({ inicial }: { inicial: Encabezado }) {
  const [d, setD] = useState<Encabezado>(inicial);
  const g = useGuardar(guardarEncabezadoAccion);
  const e = (k: string) => g.errores[k];
  const foto = (i: number, f?: FotoEncabezado) =>
    setD({
      ...d,
      fotos: f ? d.fotos.map((x, j) => (j === i ? f : x)) : d.fotos.filter((_, j) => j !== i),
    });

  return (
    <section aria-labelledby="titulo-encabezado" className="mt-10 max-w-3xl">
      <h2 id="titulo-encabezado" className="text-lg font-bold">
        Encabezado
      </h2>
      <p className="mt-1 mb-4 text-sm text-gris">
        El título y las fotos que se alternan en lo alto del Inicio. Las fotos de otras personas
        necesitan su crédito (autor, licencia y fuente).
      </p>
      <form
        noValidate
        onSubmit={(ev) => {
          ev.preventDefault();
          g.guardar(d);
        }}
        className="space-y-4"
      >
        <CampoTexto
          id="enc-destacado"
          etiqueta="Frase destacada"
          valor={d.destacado}
          onCambio={(v) => setD({ ...d, destacado: v })}
          error={e("destacado")}
          max={40}
          opcional
          ayuda="Va en amarillo antes del título. Por ejemplo: «Pensando en grande:»."
        />
        <CampoTexto
          id="enc-titulo"
          etiqueta="Título"
          valor={d.titulo}
          onCambio={(v) => setD({ ...d, titulo: v })}
          error={e("titulo")}
          max={120}
        />
        <CampoTexto
          id="enc-subtitulo"
          etiqueta="Subtítulo"
          valor={d.subtitulo}
          onCambio={(v) => setD({ ...d, subtitulo: v })}
          error={e("subtitulo")}
          max={240}
          multilinea
        />
        <ul className="space-y-3">
          {d.fotos.map((f, i) => (
            <FilaLista
              key={`${f.src}-${i}`}
              titulo="Foto"
              indice={i}
              total={d.fotos.length}
              onMover={(dir) => setD({ ...d, fotos: mover(d.fotos, i, dir) })}
              onQuitar={() => foto(i)}
            >
              <CampoImagenRecortada
                id={`enc-foto-${i}`}
                etiqueta="Imagen"
                valor={f}
                onCambio={(v) => (v ? foto(i, { ...v, posicion: f.posicion }) : foto(i))}
                aspecto={16 / 9}
                conIlustrativa={false}
                error={e(`fotos.${i}`)}
                errorAlt={e(`fotos.${i}.alt`)}
              />
              <Selector
                id={`enc-foto-${i}-posicion`}
                etiqueta="Dónde queda el motivo"
                opciones={Object.entries(POSICIONES).map(([valor, texto]) => ({ valor, texto }))}
                valorInicial={f.posicion && f.posicion in POSICIONES ? f.posicion : "50% 50%"}
                onCambio={(v) => foto(i, { ...f, posicion: v })}
              />
            </FilaLista>
          ))}
        </ul>
        {e("fotos") && <p className="text-sm text-peligro">{e("fotos")}</p>}
        {d.fotos.length < LIMITES_SITIO.fotos && (
          <NuevaFoto onAgregar={(f) => setD({ ...d, fotos: [...d.fotos, f] })} />
        )}
        <BotonGuardar pendiente={g.pendiente} texto="Guardar encabezado" />
      </form>
      <Aviso aviso={g.aviso} onCerrar={g.cerrar} />
    </section>
  );
}

/** Subir una foto más al encabezado. */
function NuevaFoto({ onAgregar }: { onAgregar: (f: FotoEncabezado) => void }) {
  const [abierta, setAbierta] = useState(false);
  if (!abierta)
    return (
      <button type="button" onClick={() => setAbierta(true)} className={claseBoton.secundario}>
        <Plus size={16} aria-hidden="true" />
        Agregar foto
      </button>
    );
  return (
    <div className="rounded-lg border border-dashed border-linea p-4">
      <CampoImagenRecortada
        id="enc-foto-nueva"
        etiqueta="Foto nueva"
        aspecto={16 / 9}
        conIlustrativa={false}
        onCambio={(v) => {
          if (!v) return;
          onAgregar({ ...v, posicion: "50% 50%" });
          setAbierta(false);
        }}
      />
    </div>
  );
}

export function EditorActores({ inicial }: { inicial: Actores }) {
  const [d, setD] = useState<Actores>(inicial);
  const g = useGuardar(guardarActoresAccion);
  const e = (k: string) => g.errores[k];
  const sector = (i: number, k: "nombre" | "detalle" | "icono", v: string) =>
    setD({ ...d, sectores: d.sectores.map((s, j) => (j === i ? { ...s, [k]: v } : s)) });

  return (
    <section aria-labelledby="titulo-actores" className="mt-10 max-w-3xl">
      <h2 id="titulo-actores" className="text-lg font-bold">
        Registro de actores
      </h2>
      <p className="mt-1 mb-4 text-sm text-gris">
        La sección con los sectores convocados. El primero es el principal: se muestra más grande.
      </p>
      <form
        noValidate
        onSubmit={(ev) => {
          ev.preventDefault();
          g.guardar(d);
        }}
        className="space-y-4"
      >
        <CampoTexto
          id="act-titulo"
          etiqueta="Título"
          valor={d.titulo}
          onCambio={(v) => setD({ ...d, titulo: v })}
          error={e("titulo")}
          max={120}
          ayuda="La última palabra se resalta en rojo."
        />
        <CampoTexto
          id="act-texto"
          etiqueta="Texto"
          valor={d.texto}
          onCambio={(v) => setD({ ...d, texto: v })}
          error={e("texto")}
          max={400}
          multilinea
        />
        <ul className="space-y-3">
          {d.sectores.map((s, i) => (
            <FilaLista
              key={i}
              titulo="Sector"
              indice={i}
              total={d.sectores.length}
              onMover={(dir) => setD({ ...d, sectores: mover(d.sectores, i, dir) })}
              onQuitar={() => setD({ ...d, sectores: d.sectores.filter((_, j) => j !== i) })}
            >
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)]">
                <CampoTexto
                  id={`act-${i}-nombre`}
                  etiqueta="Nombre"
                  valor={s.nombre}
                  onCambio={(v) => sector(i, "nombre", v)}
                  error={e(`sectores.${i}.nombre`)}
                  max={60}
                />
                <Selector
                  id={`act-${i}-icono`}
                  etiqueta="Ícono"
                  opciones={Object.entries(ICONOS_SECTOR).map(([valor, texto]) => ({
                    valor,
                    texto,
                  }))}
                  valorInicial={s.icono}
                  onCambio={(v) => sector(i, "icono", v as IconoSector)}
                />
              </div>
              <CampoTexto
                id={`act-${i}-detalle`}
                etiqueta="Detalle"
                valor={s.detalle}
                onCambio={(v) => sector(i, "detalle", v)}
                error={e(`sectores.${i}.detalle`)}
                max={160}
              />
            </FilaLista>
          ))}
        </ul>
        {e("sectores") && <p className="text-sm text-peligro">{e("sectores")}</p>}
        {d.sectores.length < LIMITES_SITIO.sectores && (
          <button
            type="button"
            onClick={() =>
              setD({
                ...d,
                sectores: [...d.sectores, { nombre: "", detalle: "", icono: "PERSONAS" }],
              })
            }
            className={claseBoton.secundario}
          >
            <Plus size={16} aria-hidden="true" />
            Agregar sector
          </button>
        )}
        <BotonGuardar pendiente={g.pendiente} texto="Guardar registro de actores" />
      </form>
      <Aviso aviso={g.aviso} onCerrar={g.cerrar} />
    </section>
  );
}
