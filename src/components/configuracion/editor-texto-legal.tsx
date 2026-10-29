"use client";

import { Eye, Loader2, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { claseBoton, claseCampo, ErrorCampo, Etiqueta } from "@/components/alcaldia/comunes";
import { EditorTexto } from "@/components/contenido/editor-texto";
import { formatearFecha } from "@/components/contenido/estado-noticia";
import { Aviso, useAviso } from "@/components/ui/aviso";
import { Dialogo } from "@/components/ui/dialogo";
import { publicarTextoLegalAccion } from "@/lib/plataforma/acciones-textos-legales";
import type { VersionVista } from "@/lib/plataforma/textos-legales";
import { TITULO_TEXTO_LEGAL, type TipoTextoLegal } from "@/lib/plataforma/tipos";

const NOTA_MAX = 500;

/**
 * Editor de un texto legal (R15): parte del texto vigente; al publicar se crea la versión
 * siguiente, con la nota de qué cambió. El historial deja leer cada versión anterior.
 */
export function EditorTextoLegal({
  tipo,
  versiones,
}: {
  tipo: TipoTextoLegal;
  versiones: VersionVista[];
}) {
  const vigente = versiones[0];
  const [html, setHtml] = useState(vigente?.html ?? "");
  const [nota, setNota] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [confirmar, setConfirmar] = useState(false);
  const [viendo, setViendo] = useState<VersionVista>();
  const [pendiente, iniciar] = useTransition();
  const { aviso, mostrar, cerrar } = useAviso();

  function revisar() {
    const e: Record<string, string> = {};
    if (!html.replace(/<[^>]*>/g, "").trim()) e.texto = "Escribe el texto.";
    if (!nota.trim()) e.nota = "Cuenta qué cambió: lo leerán las personas al aceptarlo.";
    setErrores(e);
    if (Object.keys(e).length === 0) setConfirmar(true);
  }

  function publicar() {
    iniciar(async () => {
      const r = await publicarTextoLegalAccion(tipo, { html, nota });
      mostrar({ tipo: r.ok ? "exito" : "error", texto: r.mensaje });
      setErrores(r.errores ?? {});
      setConfirmar(false);
      if (r.ok) setNota("");
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
      <section aria-labelledby="editar-titulo" className="min-w-0">
        <h2 id="editar-titulo" className="sr-only">
          Editar el texto
        </h2>
        <p id="texto-etiqueta" className="mb-1.5 text-sm font-bold text-tinta">
          Texto
        </p>
        <p id="texto-ayuda" className="mb-2 text-sm text-gris">
          {vigente
            ? `Parte de la versión ${vigente.version}, la vigente. Los cambios no se ven en el portal hasta publicarlos.`
            : "Todavía no hay una versión publicada."}
        </p>
        <EditorTexto
          id="texto"
          etiquetaId="texto-etiqueta"
          ayudaId="texto-ayuda"
          valor={html}
          onCambio={setHtml}
          error={errores.texto}
          sinImagenes
        />
        <ErrorCampo id="texto-error" error={errores.texto} />

        <div className="mt-5">
          <Etiqueta htmlFor="nota">Qué cambió</Etiqueta>
          <textarea
            id="nota"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            maxLength={NOTA_MAX}
            rows={3}
            aria-describedby={errores.nota ? "nota-ayuda nota-error" : "nota-ayuda"}
            aria-invalid={errores.nota ? true : undefined}
            className={claseCampo(errores.nota)}
          />
          <p id="nota-ayuda" className="mt-1 text-sm text-gris">
            Un resumen claro para las personas registradas: lo verán al aceptar la versión nueva.
          </p>
          <ErrorCampo id="nota-error" error={errores.nota} />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={revisar} className={claseBoton.primario}>
            <Send size={16} aria-hidden="true" />
            Publicar la versión {(vigente?.version ?? 0) + 1}
          </button>
        </div>
      </section>

      <section aria-labelledby="historial-titulo">
        <h2 id="historial-titulo" className="text-base font-bold text-tinta">
          Versiones publicadas
        </h2>
        {versiones.length === 0 ? (
          <p className="mt-2 text-sm text-gris">Ninguna todavía.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {versiones.map((v, i) => (
              <li key={v.id} className="rounded-lg border border-linea bg-papel p-3 text-sm">
                <p className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-tinta">
                    Versión {v.version}
                    {i === 0 && (
                      <span className="ml-2 rounded-full bg-turquesa/10 px-2 py-0.5 text-xs font-semibold text-turquesa-texto">
                        Vigente
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setViendo(v)}
                    className={claseBoton.enlace}
                    aria-label={`Ver la versión ${v.version}`}
                  >
                    <Eye size={15} aria-hidden="true" />
                    Ver
                  </button>
                </p>
                <p className="text-gris">
                  {formatearFecha(v.publicadoEl)} · {v.autor}
                </p>
                <p className="mt-1 text-tinta">{v.nota}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <Dialogo
        abierto={confirmar}
        onCerrar={() => setConfirmar(false)}
        titulo={`¿Publicar la versión ${(vigente?.version ?? 0) + 1}?`}
        descripcion={`Al publicar, todas las personas registradas en el portal tendrán que aceptar los ${TITULO_TEXTO_LEGAL[tipo].toLowerCase()} de nuevo al entrar. Las versiones publicadas no se editan.`}
      >
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            autoFocus
            onClick={() => setConfirmar(false)}
            className={claseBoton.secundario}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pendiente}
            onClick={publicar}
            className={claseBoton.primario}
          >
            {pendiente && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
            Publicar
          </button>
        </div>
      </Dialogo>

      <Dialogo
        abierto={!!viendo}
        onCerrar={() => setViendo(undefined)}
        titulo={viendo ? `Versión ${viendo.version}` : ""}
        descripcion={viendo && `${formatearFecha(viendo.publicadoEl)} · ${viendo.autor}`}
        ancho="max-w-2xl"
      >
        {viendo && (
          <div
            className="cuerpo-noticia mt-4 max-h-[60dvh] overflow-y-auto"
            tabIndex={0}
            // HTML saneado al publicar (sanearHtml en el panel; la API lo sanea también).
            dangerouslySetInnerHTML={{ __html: viendo.html }}
          />
        )}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => setViendo(undefined)}
            className={claseBoton.secundario}
          >
            Cerrar
          </button>
        </div>
      </Dialogo>

      <Aviso aviso={aviso} onCerrar={cerrar} />
    </div>
  );
}
