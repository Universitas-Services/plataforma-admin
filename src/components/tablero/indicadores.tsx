import { Download } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Barras, Columnas } from "./graficos";
import { RANGOS, type ClaveRango, type Rango, type indicadoresDe } from "@/lib/plataforma/metricas";

/*
 * Indicadores del tablero (backlog de refactorización, KPI): cada rol ve lo suyo. El Revisor,
 * participación y ciudadanía; el Operador, contenido; el Admin y el Super Admin, todo.
 */

const cifra = (n: number) => n.toLocaleString("es-VE");
const pct = (x?: number) => (x === undefined ? "—" : `${Math.round(x * 100)} %`);

function Cifra({
  etiqueta,
  valor,
  detalle,
}: {
  etiqueta: string;
  valor: string;
  detalle?: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-linea bg-papel p-4">
      <dt className="text-sm text-gris">{etiqueta}</dt>
      <dd className="mt-1 font-display text-[1.75rem] leading-none font-bold text-tinta">
        {valor}
      </dd>
      {detalle && <dd className="mt-2 text-sm text-gris">{detalle}</dd>}
    </div>
  );
}

function Tarjeta({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-lg border border-linea bg-papel p-5">
      <h4 className="mb-4 text-base font-bold text-tinta">{titulo}</h4>
      {children}
    </section>
  );
}

function Seccion({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-4">
      <h3 id={id} className="text-lg font-bold">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

export function SelectorRango({ actual }: { actual: ClaveRango }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <nav aria-label="Rango de fechas de los indicadores">
        <ul className="flex flex-wrap gap-1 rounded-control bg-superficie p-1">
          {(Object.keys(RANGOS) as ClaveRango[]).map((k) => (
            <li key={k}>
              <Link
                href={k === "30d" ? "/tablero" : `/tablero?rango=${k}`}
                scroll={false}
                aria-current={k === actual ? "page" : undefined}
                className={`inline-flex min-h-10 items-center rounded-[0.5rem] px-3 text-sm font-semibold ${
                  k === actual
                    ? "bg-papel text-tinta shadow-sm ring-1 ring-linea"
                    : "text-gris hover:text-tinta"
                }`}
              >
                {RANGOS[k]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <a
        href={`/tablero/exportar?rango=${actual}`}
        download
        className="inline-flex min-h-10 items-center gap-2 rounded-control border border-linea bg-papel px-4 text-sm font-semibold text-tinta hover:border-tenue"
      >
        <Download size={16} aria-hidden="true" />
        Exportar CSV
      </a>
    </div>
  );
}

export function Indicadores({
  rango,
  datos,
}: {
  rango: Rango;
  datos: ReturnType<typeof indicadoresDe>;
}) {
  const { participacion: p, contenido: c, ciudadania: ci, equipo } = datos;
  const fechas = `del ${rango.desde.split("-").reverse().join("/")} al ${rango.hasta.split("-").reverse().join("/")}`;
  return (
    <div className="space-y-10">
      <p className="text-sm text-gris">
        {rango.etiqueta}, {fechas}. Las cifras de vistas, reacciones y descargas son de demostración
        hasta conectar la API.
      </p>

      {p && (
        <Seccion id="ind-participacion" titulo="Participación">
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Cifra
              etiqueta="Aportes recibidos"
              valor={cifra(p.recibidas)}
              detalle={`${cifra(p.opiniones.recibidas)} opiniones`}
            />
            <Cifra
              etiqueta="Por atender hoy"
              valor={cifra(p.pendientes.total)}
              detalle={
                p.pendientes.mas7 ? (
                  <span className="font-semibold text-peligro">
                    {cifra(p.pendientes.mas7)} con más de 7 días
                  </span>
                ) : (
                  "Ninguno con más de 7 días"
                )
              }
            />
            <Cifra
              etiqueta="Días de respuesta"
              valor={p.diasRespuesta === undefined ? "—" : cifra(p.diasRespuesta)}
              detalle={p.sinHistorial ? "Llega con R13" : "Mediana, propuestas formales"}
            />
            <Cifra
              etiqueta="Propuestas verificadas"
              valor={pct(p.decisiones.tasaAprobacion)}
              detalle={`${cifra(p.decisiones.aprobadas)} verificadas · ${cifra(p.decisiones.rechazadas)} rechazadas${p.sinHistorial ? ", por su estado actual" : ""}`}
            />
          </dl>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Tarjeta titulo="Aportes recibidos">
              <Columnas titulo="Aportes recibidos" puntos={p.serie} unidad="aportes" />
            </Tarjeta>
            <Tarjeta titulo="Por tipo">
              <Barras filas={p.porTipo} vacio="Sin aportes en este rango." />
              <p className="mt-4 text-sm text-gris">
                Opiniones publicadas: {cifra(p.opiniones.publicadas)} de{" "}
                {cifra(p.opiniones.recibidas)} recibidas.
              </p>
            </Tarjeta>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Tarjeta titulo="Por parroquia">
              <Barras filas={p.porParroquia} vacio="Sin aportes en este rango." />
            </Tarjeta>
            <Tarjeta titulo="Por categoría técnica">
              <Barras filas={p.porCategoria} vacio="Sin aportes en este rango." />
            </Tarjeta>
            <Tarjeta titulo="Aportes con más reacciones">
              <Barras filas={p.masReacciones} vacio="Sin reacciones en este rango." />
              <p className="mt-4 text-sm text-gris">
                {cifra(p.alcance.vistas)} vistas · {cifra(p.alcance.likes)} me gusta ·{" "}
                {cifra(p.alcance.dislikes)} no me gusta
              </p>
            </Tarjeta>
          </div>
        </Seccion>
      )}

      {c && (
        <Seccion id="ind-contenido" titulo="Contenido">
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Cifra etiqueta="Noticias publicadas" valor={cifra(c.publicadasEnRango)} />
            <Cifra etiqueta="Vistas de noticias" valor={cifra(c.alcance.vistas)} />
            <Cifra
              etiqueta="Reacciones"
              valor={cifra(c.alcance.likes + c.alcance.dislikes)}
              detalle={`${cifra(c.alcance.likes)} me gusta · ${cifra(c.alcance.dislikes)} no me gusta`}
            />
            <Cifra etiqueta="Descargas de documentos" valor={cifra(c.descargas)} />
          </dl>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Tarjeta titulo="Vistas de noticias">
              <Columnas titulo="Vistas de noticias" puntos={c.serieVistas} unidad="vistas" />
            </Tarjeta>
            <Tarjeta titulo="Más vistas">
              <Barras filas={c.masVistas} vacio="Sin vistas en este rango." />
            </Tarjeta>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Tarjeta titulo="Más valoradas (me gusta)">
              <Barras filas={c.masValoradas} vacio="Sin reacciones en este rango." />
            </Tarjeta>
            <Tarjeta titulo="Publicadas hoy, por formato">
              <Barras filas={c.porFormato} vacio="No hay noticias publicadas." />
            </Tarjeta>
            <Tarjeta titulo="Documentos más descargados">
              <Barras filas={c.masDescargados} vacio="Sin descargas en este rango." />
            </Tarjeta>
          </div>
        </Seccion>
      )}

      {ci && (
        <Seccion id="ind-ciudadania" titulo="Ciudadanía">
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Cifra etiqueta="Registros nuevos" valor={cifra(ci.nuevos)} />
            <Cifra etiqueta="Registrados en total" valor={cifra(ci.total)} />
            <Cifra
              etiqueta="Perfiles completos"
              valor={pct(ci.perfilesCompletos)}
              detalle="Sobre el total registrado"
            />
            <Cifra etiqueta="Cuentas suspendidas" valor={cifra(ci.suspendidos)} />
          </dl>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Tarjeta titulo="Registros nuevos">
              <Columnas titulo="Registros nuevos" puntos={ci.serie} unidad="registros" />
            </Tarjeta>
            <Tarjeta titulo="Por tipo de cuenta">
              <Barras
                filas={[
                  { nombre: "Personas naturales", valor: ci.personas },
                  { nombre: "Organizaciones", valor: ci.organizaciones },
                ]}
                vacio="Todavía no hay registros."
              />
            </Tarjeta>
          </div>
        </Seccion>
      )}

      {equipo && (
        <Seccion id="ind-equipo" titulo="Equipo">
          <Tarjeta titulo="Decisiones sobre aportes, por persona">
            <Barras filas={equipo} vacio="Nadie decidió aportes en este rango." />
          </Tarjeta>
        </Seccion>
      )}
    </div>
  );
}
