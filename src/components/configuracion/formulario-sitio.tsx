"use client";

import { Loader2, Plus, Save } from "lucide-react";
import { useState, useTransition } from "react";
import { claseBoton } from "@/components/alcaldia/comunes";
import { CampoImagenRecortada } from "@/components/contenido/campos-medios";
import { Aviso, useAviso } from "@/components/ui/aviso";
import { Selector } from "@/components/ui/selector";
import { guardarSitioAccion } from "@/lib/plataforma/acciones-sitio";
import { LIMITES_SITIO, REDES, type DatosSitio, type Red } from "@/lib/plataforma/sitio";
import { CampoTexto, FilaLista, mover } from "./campos-sitio";

/**
 * Datos del sitio (R17): lo que el portal muestra del alcalde, el contacto, las redes y los
 * enlaces oficiales del pie de página. Se guarda todo junto.
 */
export function FormularioSitio({ inicial }: { inicial: DatosSitio }) {
  const [d, setD] = useState<DatosSitio>(inicial);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [pendiente, iniciar] = useTransition();
  const { aviso, mostrar, cerrar } = useAviso();
  const e = (k: string) => errores[k];

  const alcalde = (k: "nombre" | "cargo", v: string) =>
    setD({ ...d, alcalde: { ...d.alcalde, [k]: v } });
  const contacto = (k: keyof DatosSitio["contacto"], v: string) =>
    setD({ ...d, contacto: { ...d.contacto, [k]: v } });
  const red = (i: number, k: "red" | "usuario" | "url", v: string) =>
    setD({ ...d, redes: d.redes.map((r, j) => (j === i ? { ...r, [k]: v } : r)) });
  const enlace = (i: number, k: "texto" | "url", v: string) =>
    setD({ ...d, enlaces: d.enlaces.map((x, j) => (j === i ? { ...x, [k]: v } : x)) });

  function guardar() {
    iniciar(async () => {
      const r = await guardarSitioAccion(d);
      setErrores(r.errores ?? {});
      mostrar({ tipo: r.ok ? "exito" : "error", texto: r.mensaje });
    });
  }

  return (
    <form
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        guardar();
      }}
      className="max-w-3xl space-y-8 pb-24 lg:pb-0"
    >
      <fieldset className="space-y-4">
        <legend className="mb-1 text-lg font-bold text-tinta">Alcalde o alcaldesa</legend>
        <p className="text-sm text-gris">
          Aparece en la tarjeta del mensaje del alcalde, en el Inicio del portal. Sin foto se
          muestran sus iniciales.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            id="alcalde-nombre"
            etiqueta="Nombre"
            valor={d.alcalde.nombre}
            onCambio={(v) => alcalde("nombre", v)}
            error={e("alcalde.nombre")}
            max={80}
          />
          <CampoTexto
            id="alcalde-cargo"
            etiqueta="Cargo"
            valor={d.alcalde.cargo}
            onCambio={(v) => alcalde("cargo", v)}
            error={e("alcalde.cargo")}
            max={80}
            ayuda="Por ejemplo: Alcalde de Iribarren."
          />
        </div>
        <CampoImagenRecortada
          id="alcalde-foto"
          etiqueta="Foto (opcional)"
          valor={d.alcalde.foto}
          onCambio={(foto) => setD({ ...d, alcalde: { ...d.alcalde, foto } })}
          aspecto={1}
          conIlustrativa={false}
          error={e("alcalde.foto")}
          errorAlt={e("alcalde.foto.alt")}
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-lg font-bold text-tinta">Contacto</legend>
        <p className="text-sm text-gris">
          Va en el pie de página y en los avisos que piden escribir a la alcaldía.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            id="contacto-correo"
            etiqueta="Correo"
            tipo="email"
            valor={d.contacto.correo ?? ""}
            onCambio={(v) => contacto("correo", v)}
            error={e("contacto.correo")}
            max={254}
            opcional
          />
          <CampoTexto
            id="contacto-telefono"
            etiqueta="Teléfono"
            tipo="tel"
            valor={d.contacto.telefono ?? ""}
            onCambio={(v) => contacto("telefono", v)}
            error={e("contacto.telefono")}
            max={40}
            opcional
          />
          <CampoTexto
            id="contacto-direccion"
            etiqueta="Dirección"
            valor={d.contacto.direccion}
            onCambio={(v) => contacto("direccion", v)}
            error={e("contacto.direccion")}
            max={160}
          />
          <CampoTexto
            id="contacto-horario"
            etiqueta="Horario de atención"
            valor={d.contacto.horario ?? ""}
            onCambio={(v) => contacto("horario", v)}
            error={e("contacto.horario")}
            max={120}
            opcional
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-lg font-bold text-tinta">Redes sociales</legend>
        <ul className="space-y-3">
          {d.redes.map((r, i) => (
            <FilaLista
              key={i}
              titulo="Red"
              indice={i}
              total={d.redes.length}
              onMover={(dir) => setD({ ...d, redes: mover(d.redes, i, dir) })}
              onQuitar={() => setD({ ...d, redes: d.redes.filter((_, j) => j !== i) })}
            >
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Selector
                  id={`red-${i}`}
                  etiqueta="Red"
                  opciones={Object.entries(REDES).map(([valor, texto]) => ({ valor, texto }))}
                  valorInicial={r.red}
                  onCambio={(v) => red(i, "red", v as Red)}
                  error={e(`redes.${i}.red`)}
                />
                <CampoTexto
                  id={`red-${i}-usuario`}
                  etiqueta="Usuario"
                  valor={r.usuario}
                  onCambio={(v) => red(i, "usuario", v)}
                  error={e(`redes.${i}.usuario`)}
                  max={60}
                />
              </div>
              <CampoTexto
                id={`red-${i}-url`}
                etiqueta="Enlace"
                tipo="url"
                valor={r.url}
                onCambio={(v) => red(i, "url", v)}
                error={e(`redes.${i}.url`)}
                max={300}
              />
            </FilaLista>
          ))}
        </ul>
        {d.redes.length < LIMITES_SITIO.redes && (
          <button
            type="button"
            onClick={() =>
              setD({ ...d, redes: [...d.redes, { red: "INSTAGRAM", usuario: "", url: "" }] })
            }
            className={claseBoton.secundario}
          >
            <Plus size={16} aria-hidden="true" />
            Agregar red
          </button>
        )}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-lg font-bold text-tinta">Enlaces del pie de página</legend>
        <p className="text-sm text-gris">
          Por ejemplo, el Decreto 48-2026 o la LOOU: un enlace https:// o una página del portal
          (/…).
        </p>
        <ul className="space-y-3">
          {d.enlaces.map((x, i) => (
            <FilaLista
              key={i}
              titulo="Enlace"
              indice={i}
              total={d.enlaces.length}
              onMover={(dir) => setD({ ...d, enlaces: mover(d.enlaces, i, dir) })}
              onQuitar={() => setD({ ...d, enlaces: d.enlaces.filter((_, j) => j !== i) })}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <CampoTexto
                  id={`enlace-${i}-texto`}
                  etiqueta="Texto"
                  valor={x.texto}
                  onCambio={(v) => enlace(i, "texto", v)}
                  error={e(`enlaces.${i}.texto`)}
                  max={60}
                />
                <CampoTexto
                  id={`enlace-${i}-url`}
                  etiqueta="Enlace"
                  valor={x.url}
                  onCambio={(v) => enlace(i, "url", v)}
                  error={e(`enlaces.${i}.url`)}
                  max={500}
                />
              </div>
            </FilaLista>
          ))}
        </ul>
        {d.enlaces.length < LIMITES_SITIO.enlaces && (
          <button
            type="button"
            onClick={() => setD({ ...d, enlaces: [...d.enlaces, { texto: "", url: "" }] })}
            className={claseBoton.secundario}
          >
            <Plus size={16} aria-hidden="true" />
            Agregar enlace
          </button>
        )}
      </fieldset>

      {e("formulario") && <p className="text-sm text-peligro">{e("formulario")}</p>}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-papel/95 px-4 py-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0">
        <button type="submit" disabled={pendiente} className={claseBoton.primario}>
          {pendiente ? (
            <Loader2 size={16} aria-hidden="true" className="animate-spin" />
          ) : (
            <Save size={16} aria-hidden="true" />
          )}
          Guardar datos del sitio
        </button>
      </div>
      <Aviso aviso={aviso} onCerrar={cerrar} />
    </form>
  );
}
