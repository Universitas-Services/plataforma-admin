import { ArrowLeft, Building2, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BotonEntrar } from "@/components/panel/boton-entrar";
import { FiltrosPlegables } from "@/components/panel/filtros-plegables";
import { SiglaAlcaldia } from "@/components/panel/sigla-alcaldia";
import { CrearAlcaldia, EstadoAlcaldia } from "@/components/plataforma/alcaldias";
import { EsqueletoTabla } from "@/components/ui/esqueletos";
import { EncabezadoPagina, EstadoVacio, InsigniaEstado } from "@/components/ui/piezas";
import { Selector } from "@/components/ui/selector";
import {
  alcaldiasResumen,
  resumenAlcaldia,
  type ResumenAlcaldia,
} from "@/lib/plataforma/plataforma";
import { almacen, exigirPermiso } from "@/lib/plataforma/sesion";
import { ESTADOS_ALCALDIA } from "@/lib/plataforma/tipos";

export const metadata: Metadata = { title: "Alcaldías" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const NOMBRE_ESTADO = {
  ACTIVA: "Activa",
  ONBOARDING_PENDIENTE: "Onboarding pendiente",
  SUSPENDIDA: "Suspendida",
};

export default function AlcaldiasPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<EsqueletoTabla filas={7} columnas={5} />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

/** Backlog 2.7: alcaldías de la plataforma. La ficha va en `?ver=` (sin ruta dinámica). */
async function Contenido({ searchParams }: { searchParams: SearchParams }) {
  await exigirPermiso("alcaldias.gestionar", "/plataforma/alcaldias");
  await connection();
  const sp = await searchParams;
  const texto = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const alm = almacen();

  const ver = alm.alcaldias.get(texto("ver"));
  if (ver) return <Ficha r={resumenAlcaldia(alm, ver)} />;

  const q = texto("q").trim().slice(0, 80);
  const estado = ESTADOS_ALCALDIA.find((e) => e === texto("estado"));
  const lista = alcaldiasResumen(alm, { estado, q });
  const filtrando = !!(q || estado);

  return (
    <>
      <EncabezadoPagina
        titulo="Alcaldías"
        bajada="Alta, estado y acceso a cada alcaldía de la plataforma."
        acciones={<CrearAlcaldia />}
      />

      <form
        role="search"
        action="/plataforma/alcaldias"
        className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]"
      >
        <div className="relative min-w-0 sm:col-span-2 xl:col-span-1">
          <span aria-hidden="true" className="mb-1.5 hidden text-sm font-bold text-tinta sm:block">
            Buscar
          </span>
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute bottom-3.5 left-3 text-gris"
          />
          <input
            name="q"
            type="search"
            defaultValue={q}
            maxLength={80}
            placeholder="Nombre o sigla"
            aria-label="Buscar por nombre o sigla"
            className="h-11 w-full rounded-control border border-linea bg-papel pr-3 pl-9 text-tinta outline-none placeholder:text-tenue hover:border-tenue focus-visible:border-marca-texto"
          />
        </div>
        <FiltrosPlegables activos={estado ? 1 : 0}>
          <Selector
            id="estado"
            etiqueta="Estado"
            opciones={ESTADOS_ALCALDIA.map((e) => ({ valor: e, texto: NOMBRE_ESTADO[e] }))}
            valorInicial={estado}
            permitirVacio
            vacio="Todos"
          />
          <button
            type="submit"
            className="h-11 rounded-control border border-linea bg-papel px-5 text-sm font-semibold text-tinta hover:border-tenue"
          >
            Filtrar
          </button>
        </FiltrosPlegables>
      </form>

      {lista.length ? (
        <ul className="divide-y divide-fila rounded-lg border border-linea">
          {lista.map((r) => (
            <li
              key={r.alcaldia.id}
              className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 px-4 py-3.5 md:grid-cols-[auto_minmax(0,1fr)_auto_auto]"
            >
              <SiglaAlcaldia alcaldia={r.alcaldia} />
              <div className="min-w-0">
                <Link
                  href={`/plataforma/alcaldias?ver=${r.alcaldia.id}`}
                  className="font-semibold text-marca-texto hover:underline"
                >
                  {r.alcaldia.nombre}
                </Link>
                <p className="text-sm text-gris">
                  {r.noticias} noticias · {r.participaciones} participaciones ({r.porAtender} por
                  atender) · {r.ciudadanos} ciudadanos
                </p>
              </div>
              <div className="col-span-2 flex flex-wrap items-center justify-between gap-3 md:col-span-1 md:contents">
                <InsigniaEstado estado={r.alcaldia.estado} />
                <Link
                  href={`/plataforma/alcaldias?ver=${r.alcaldia.id}`}
                  className="inline-flex min-h-10 items-center rounded-control border border-linea px-4 text-sm font-semibold text-tinta hover:border-tenue"
                >
                  Ver ficha<span className="sr-only"> de {r.alcaldia.nombre}</span>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EstadoVacio
          Icono={Building2}
          titulo={filtrando ? "Ninguna alcaldía coincide" : "Aún no hay alcaldías"}
          accion={
            filtrando ? (
              <Link
                href="/plataforma/alcaldias"
                className="inline-flex min-h-10 items-center rounded-control border border-linea px-4 text-sm font-semibold text-tinta hover:border-tenue"
              >
                Quitar los filtros
              </Link>
            ) : undefined
          }
        >
          {filtrando ? "Prueba con otro estado o nombre." : "Crea la primera con «Crear alcaldía»."}
        </EstadoVacio>
      )}
    </>
  );
}

function Cifra({ n, texto }: { n: number; texto: string }) {
  return (
    <div className="rounded-lg border border-linea bg-papel p-4">
      <p className="text-2xl font-bold text-tinta tabular-nums">{n}</p>
      <p className="text-sm text-gris">{texto}</p>
    </div>
  );
}

function Ficha({ r }: { r: ResumenAlcaldia }) {
  const a = r.alcaldia;
  const suspendida = a.estado === "SUSPENDIDA";
  const enOnboarding = a.estado === "ONBOARDING_PENDIENTE";
  return (
    <>
      <Link
        href="/plataforma/alcaldias"
        className="mb-4 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-marca-texto hover:underline"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Alcaldías
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <SiglaAlcaldia alcaldia={a} />
          <div className="min-w-0">
            <h1 className="text-[1.75rem] leading-tight font-bold break-words">{a.nombre}</h1>
            {a.marca?.lema && <p className="text-gris">{a.marca.lema}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <InsigniaEstado estado={a.estado} />
          <EstadoAlcaldia id={a.id} nombre={a.nombre} suspendida={suspendida} />
        </div>
      </div>

      {suspendida && a.motivoSuspension && (
        <p className="mb-6 rounded-control border border-peligro/30 bg-peligro-suave p-3 text-sm text-tinta">
          <strong>Suspendida.</strong> Motivo: {a.motivoSuspension}
        </p>
      )}

      <dl className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra n={r.noticias} texto="noticias" />
        <Cifra n={r.participaciones} texto="participaciones" />
        <Cifra n={r.porAtender} texto="por atender" />
        <Cifra n={r.ciudadanos} texto="ciudadanos" />
      </dl>

      <section
        aria-labelledby="operar"
        className="mb-6 rounded-lg border border-linea bg-cabecera p-5"
      >
        <h2 id="operar" className="mb-1 text-base font-bold text-tinta">
          Operar en esta alcaldía
        </h2>
        <p className="mb-4 text-sm text-gris">
          {suspendida
            ? "Está suspendida: reactívala para entrar."
            : enOnboarding
              ? "Aún no tiene marca: al entrar se abre su asistente de configuración."
              : "Entras con todos los permisos; queda registrado en la bitácora."}
        </p>
        {!suspendida && (
          <div className="flex flex-wrap gap-2">
            <BotonEntrar
              alcaldia={a.id}
              nombre={a.nombre}
              texto={enOnboarding ? "Configurar su marca" : "Entrar al tablero"}
              variante="primario"
            />
            {!enOnboarding && (
              <>
                <BotonEntrar
                  alcaldia={a.id}
                  nombre={a.nombre}
                  texto="Ver noticias"
                  destino="/contenido/noticias"
                />
                <BotonEntrar
                  alcaldia={a.id}
                  nombre={a.nombre}
                  texto="Ver participaciones"
                  destino="/participaciones"
                />
                <BotonEntrar
                  alcaldia={a.id}
                  nombre={a.nombre}
                  texto="Ver ciudadanos"
                  destino="/ciudadanos"
                />
              </>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="admins" className="rounded-lg border border-linea bg-papel p-5">
        <h2 id="admins" className="mb-3 text-base font-bold text-tinta">
          Administración ({r.equipo} en el equipo)
        </h2>
        {r.administradores.length ? (
          <ul className="space-y-2">
            {r.administradores.map((x) => (
              <li key={x.correo} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-tinta">{x.nombre}</span>
                {x.nombre !== x.correo && <span className="text-gris">{x.correo}</span>}
                {x.pendiente && (
                  <span className="rounded-full border border-ambar/50 px-2 py-0.5 text-xs font-semibold text-ambar-texto">
                    Invitación pendiente
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gris">Sin administrador asignado.</p>
        )}
      </section>
    </>
  );
}
