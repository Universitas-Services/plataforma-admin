"use client";

import { AlertCircle, Check, ImageUp, Plus, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import Cropper, { type Area } from "react-easy-crop";
import {
  completarOnboardingAccion,
  guardarColoresAccion,
  guardarLemaAccion,
  guardarLogoAccion,
  type EstadoFormulario,
} from "@/lib/plataforma/acciones";
import { evaluarMarca, explicarContraste } from "@/lib/marca";
import { ResumenErrores } from "@/components/formularios/campos";
import { esHex, SelectorColor } from "./selector-color";
import { VistaPreviaMarca } from "./vista-previa";

const inicial: EstadoFormulario = {};
const MAX_LOGO = 1024 * 1024;
const TIPOS = ["image/png", "image/jpeg", "image/svg+xml"];
const LADO = 512;

type Identidad = { nombre: string; sigla: string };

/** Pie de cada paso: «Atrás» a la izquierda y la acción principal a la derecha. */
function Acciones({ atras, children }: { atras?: string; children: ReactNode }) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-linea pt-6 sm:flex-row sm:items-center sm:justify-between">
      {atras ? (
        <Link
          href={atras}
          className="inline-flex min-h-11 items-center justify-center rounded-control border border-linea px-4 font-semibold text-tinta hover:border-tenue"
        >
          Atrás
        </Link>
      ) : (
        <span />
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row">{children}</div>
    </div>
  );
}

function Continuar({
  children = "Guardar y continuar",
  pendiente,
}: {
  children?: string;
  pendiente?: boolean;
}) {
  const { pending } = useFormStatus();
  const ocupado = pending || pendiente;
  return (
    <button
      type="submit"
      disabled={ocupado}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-marca px-5 font-semibold text-sobre-marca transition-[filter] duration-150 hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
    >
      {ocupado ? "Guardando…" : children}
    </button>
  );
}

function ErrorCampo({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={`${id}-error`} className="mt-2 flex items-start gap-1.5 text-sm text-peligro">
      <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
      {error}
    </p>
  );
}

/* ---------- Paso 1: logo ---------- */

/** Recorta el área elegida en un PNG cuadrado de 512 px (conserva la transparencia). */
async function recortar(url: string, area: Area): Promise<File> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const lienzo = document.createElement("canvas");
  lienzo.width = LADO;
  lienzo.height = LADO;
  lienzo
    .getContext("2d")!
    .drawImage(img, area.x, area.y, area.width, area.height, 0, 0, LADO, LADO);
  const blob = await new Promise<Blob | null>((r) => lienzo.toBlob(r, "image/png"));
  if (!blob) throw new Error("No se pudo recortar la imagen.");
  return new File([blob], "logo.png", { type: "image/png" });
}

export function PasoLogo({ actual, ...id }: Identidad & { actual?: string }) {
  const [estado, accion, pendiente] = useActionState(guardarLogoAccion, inicial);
  const entrada = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<{ file: File; url: string } | null>(null);
  const [error, setError] = useState<string>();
  const [encima, setEncima] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const esSvg = archivo?.file.type === "image/svg+xml";
  const mostrado = error ?? estado.errores?.logo;

  useEffect(() => () => (archivo ? URL.revokeObjectURL(archivo.url) : undefined), [archivo]);

  function tomar(f?: File) {
    if (!f) return;
    if (!TIPOS.includes(f.type)) return setError(`«${f.name}» no es PNG, JPG ni SVG.`);
    if (f.size > MAX_LOGO) return setError(`«${f.name}» pesa más de 1 MB.`);
    setError(undefined);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setArchivo({ file: f, url: URL.createObjectURL(f) });
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!archivo) return setError("Elige el logo de la alcaldía.");
    const fd = new FormData();
    fd.set("logo", esSvg || !area ? archivo.file : await recortar(archivo.url, area));
    startTransition(() => accion(fd));
  }

  const vista = archivo?.url ?? actual;

  return (
    <form onSubmit={enviar} noValidate>
      <ResumenErrores estado={estado.mensaje ? estado : {}} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div>
          <p id="logo-etiqueta" className="mb-1.5 text-sm font-bold text-tinta">
            Logo de la alcaldía
          </p>
          {archivo && !esSvg ? (
            <div>
              <div className="relative h-72 overflow-hidden rounded-lg bg-superficie ring-1 ring-linea sm:h-80">
                <Cropper
                  image={archivo.url}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  showGrid={false}
                  keyboardStep={8}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_a, px) => setArea(px)}
                  mediaProps={{ alt: "Logo para encuadrar" }}
                  style={{ cropAreaStyle: { color: "rgb(31 56 100 / 0.45)" } }}
                />
              </div>
              <p id="logo-ayuda" className="mt-2 text-sm text-gris">
                Arrastra la imagen (o usa las flechas del teclado) para encuadrarla en el cuadrado.
              </p>
              <label htmlFor="zoom" className="mt-4 block text-sm font-bold text-tinta">
                Acercar
              </label>
              <input
                id="zoom"
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="mt-1 w-full accent-[var(--marca)]"
              />
            </div>
          ) : (
            <label
              htmlFor="logo"
              onDragOver={(e) => {
                e.preventDefault();
                setEncima(true);
              }}
              onDragLeave={() => setEncima(false)}
              onDrop={(e) => {
                e.preventDefault();
                setEncima(false);
                tomar(e.dataTransfer.files[0]);
              }}
              className={`flex min-h-56 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors has-[:focus-visible]:border-marca-texto ${
                mostrado
                  ? "border-peligro bg-peligro-suave"
                  : encima
                    ? "border-marca-texto bg-marca-suave"
                    : "border-linea hover:border-tenue"
              }`}
            >
              {vista ? (
                // eslint-disable-next-line @next/next/no-img-element -- vista previa local o del borrador
                <img src={vista} alt="Logo elegido" className="size-28 rounded-md object-contain" />
              ) : (
                <ImageUp size={32} aria-hidden="true" className="text-marca-texto" />
              )}
              <span className="font-semibold text-tinta">
                {vista ? "Elige otro archivo o arrástralo aquí" : "Elige el logo o arrástralo aquí"}
              </span>
              <span className="text-sm text-gris">
                PNG, JPG o SVG de hasta 1 MB. Mejor cuadrado y con fondo transparente.
              </span>
              <input
                ref={entrada}
                id="logo"
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                aria-labelledby="logo-etiqueta"
                aria-describedby={mostrado ? "logo-error" : undefined}
                aria-invalid={mostrado ? true : undefined}
                onChange={(e) => tomar(e.target.files?.[0])}
                className="sr-only"
              />
            </label>
          )}
          {archivo && (
            <button
              type="button"
              onClick={() => {
                setArchivo(null);
                setArea(null);
                if (entrada.current) entrada.current.value = "";
              }}
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-control px-2 text-sm font-semibold text-tinta hover:bg-superficie"
            >
              {esSvg ? (
                <X size={16} aria-hidden="true" />
              ) : (
                <RefreshCw size={16} aria-hidden="true" />
              )}
              Elegir otro archivo
            </button>
          )}
          {esSvg && (
            <p className="mt-3 text-sm text-gris">
              Los SVG se usan tal cual, sin recorte: asegúrate de que el dibujo sea cuadrado.
            </p>
          )}
          <ErrorCampo id="logo" error={mostrado} />
        </div>
        <VistaPreviaMarca {...id} logo={esSvg ? archivo?.url : actual} />
      </div>
      <Acciones>
        <Continuar pendiente={pendiente} />
      </Acciones>
    </form>
  );
}

/* ---------- Paso 2: colores ---------- */

const fmt = (n: number) =>
  n.toLocaleString("es-VE", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

export function PasoColores({
  primario: p0,
  secundario: s0,
  logo,
  lema,
  ...id
}: Identidad & { primario?: string; secundario?: string; logo?: string; lema?: string }) {
  const [estado, accion] = useActionState(guardarColoresAccion, inicial);
  const [primario, setPrimario] = useState(estado.valores?.colorPrimario ?? p0 ?? "#1F3864");
  const [secundario, setSecundario] = useState(estado.valores?.colorSecundario ?? s0 ?? "");
  const [conSecundario, setConSecundario] = useState(Boolean(secundario));
  const valido = esHex(primario);
  const e = valido ? evaluarMarca(primario) : undefined;
  const [aviso, setAviso] = useState<string>();
  const error = aviso ?? estado.errores?.colorPrimario;

  return (
    <form
      action={accion}
      noValidate
      onSubmit={(ev) => {
        if (!valido) {
          ev.preventDefault();
          setAviso("Elige el color en el espectro o escribe su código, por ejemplo #1F3864.");
        } else if (!e?.ok) {
          ev.preventDefault();
          setAviso(explicarContraste(e!));
        }
      }}
    >
      <ResumenErrores estado={estado.mensaje ? estado : {}} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="space-y-6">
          <SelectorColor
            id="colorPrimario"
            etiqueta="Color primario"
            valor={primario}
            onCambio={(v) => {
              setPrimario(v);
              setAviso(undefined);
            }}
            ayuda="Pinta la línea, los marcadores y el botón principal del panel."
            error={error}
          />
          {e && (
            <div
              role="status"
              className={`rounded-lg p-4 text-sm ring-1 ring-inset ${
                e.ok
                  ? "bg-turquesa/10 text-tinta ring-turquesa/30"
                  : "bg-ambar/10 text-tinta ring-ambar/40"
              }`}
            >
              <p className="flex items-center gap-2 font-semibold">
                {e.ok ? (
                  <Check size={16} aria-hidden="true" className="text-turquesa-texto" />
                ) : (
                  <AlertCircle size={16} aria-hidden="true" className="text-ambar-texto" />
                )}
                {e.ok ? "Cumple el contraste AA" : "No cumple el contraste AA"}
              </p>
              <ul className="mt-2 space-y-1 text-cuerpo tabular-nums">
                {[
                  ["Texto sobre el color", e.texto, 4.5],
                  ["Línea contra el fondo", e.contraFondo, 3],
                ].map(([nombre, valor, minimo]) => {
                  const cumple = (valor as number) >= (minimo as number);
                  return (
                    <li key={nombre as string} className="flex items-start gap-2">
                      {cumple ? (
                        <Check
                          size={15}
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-turquesa-texto"
                        />
                      ) : (
                        <X size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-peligro" />
                      )}
                      {/* Un solo texto que fluye: en el teléfono no se parte en columnas. */}
                      <span>
                        {nombre}:{" "}
                        <span className="whitespace-nowrap">{fmt(valor as number)}:1</span>{" "}
                        <span className="whitespace-nowrap">(mínimo {fmt(minimo as number)})</span>{" "}
                        <span
                          className={`font-semibold whitespace-nowrap ${cumple ? "text-turquesa-texto" : "text-peligro"}`}
                        >
                          {cumple ? "cumple" : "no cumple"}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              {!e.ok && e.sugerencia && (
                <button
                  type="button"
                  onClick={() => {
                    setPrimario(e.sugerencia!);
                    setAviso(undefined);
                  }}
                  className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-control border border-linea bg-papel px-3 font-semibold text-tinta hover:border-tenue"
                >
                  <span
                    aria-hidden="true"
                    className="size-4 rounded-sm"
                    style={{ background: e.sugerencia }}
                  />
                  Usar el tono sugerido ({e.sugerencia})
                </button>
              )}
            </div>
          )}
          {conSecundario ? (
            <SelectorColor
              id="colorSecundario"
              etiqueta="Color secundario"
              opcional
              porDefecto="#17A398"
              valor={secundario}
              onCambio={setSecundario}
              ayuda="Se guarda para el portal ciudadano; en el panel solo se usa el primario."
              extra={
                <button
                  type="button"
                  onClick={() => {
                    setSecundario("");
                    setConSecundario(false);
                  }}
                  className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-control px-3 text-sm font-semibold text-tinta hover:bg-superficie"
                >
                  <X size={16} aria-hidden="true" />
                  Quitar
                </button>
              }
            />
          ) : (
            <div>
              <button
                type="button"
                onClick={() => {
                  setSecundario("#17A398");
                  setConSecundario(true);
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-control border border-linea bg-papel px-4 font-semibold text-tinta hover:border-tenue"
              >
                <Plus size={16} aria-hidden="true" />
                Añadir color secundario
              </button>
              <p className="mt-1.5 text-sm text-gris">
                Opcional: se guarda para el portal ciudadano; en el panel solo se usa el primario.
              </p>
            </div>
          )}
        </div>
        <VistaPreviaMarca
          {...id}
          primario={valido ? primario : undefined}
          secundario={esHex(secundario) ? secundario : undefined}
          logo={logo}
          lema={lema}
        />
      </div>
      <Acciones atras="/onboarding?paso=logo">
        <Continuar />
      </Acciones>
    </form>
  );
}

/* ---------- Paso 3: lema ---------- */

export function PasoLema({
  lema: l0,
  ...resto
}: Identidad & { lema?: string; primario?: string; logo?: string }) {
  const [estado, accion] = useActionState(guardarLemaAccion, inicial);
  const [lema, setLema] = useState(estado.valores?.lema ?? l0 ?? "");
  const largo = lema.trim().length;
  const error = estado.errores?.lema;
  return (
    <form action={accion} noValidate>
      <ResumenErrores estado={estado.mensaje ? estado : {}} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div>
          <label htmlFor="lema" className="mb-1.5 block text-sm font-bold text-tinta">
            Lema <span className="font-normal text-gris">(opcional)</span>
          </label>
          <input
            id="lema"
            name="lema"
            value={lema}
            maxLength={120}
            onChange={(ev) => setLema(ev.target.value)}
            placeholder="Por ejemplo, Construyamos juntos la ciudad"
            aria-describedby={`lema-ayuda lema-contador${error ? " lema-error" : ""}`}
            aria-invalid={error ? true : undefined}
            className={`h-11 w-full rounded-control border bg-papel px-3 text-tinta outline-none placeholder:text-tenue focus-visible:border-marca-texto ${
              error ? "border-peligro" : "border-linea hover:border-tenue"
            }`}
          />
          <p id="lema-contador" className="mt-1.5 text-right text-sm text-gris tabular-nums">
            {largo} / 120
          </p>
          {/* Solo se anuncia cerca del límite, no en cada tecla. */}
          <p className="sr-only" aria-live="polite">
            {largo >= 100 ? `Quedan ${120 - largo} caracteres` : ""}
          </p>
          <ErrorCampo id="lema" error={error} />
          <p id="lema-ayuda" className="mt-4 text-sm text-gris">
            Aparece bajo el nombre de la alcaldía en el tablero del panel y puede usarse en el
            portal.
          </p>
        </div>
        <VistaPreviaMarca {...resto} lema={lema.trim() || undefined} />
      </div>
      <Acciones atras="/onboarding?paso=colores">
        {l0 === undefined && largo === 0 ? (
          <Continuar>Continuar sin lema</Continuar>
        ) : (
          <Continuar />
        )}
      </Acciones>
    </form>
  );
}

/* ---------- Paso 4: confirmar ---------- */

export function ConfirmarOnboarding() {
  const [estado, accion] = useActionState(completarOnboardingAccion, inicial);
  return (
    <form action={accion}>
      <ResumenErrores estado={estado.mensaje ? estado : {}} />
      <Acciones atras="/onboarding?paso=lema">
        <Continuar>Confirmar y activar el panel</Continuar>
      </Acciones>
    </form>
  );
}
