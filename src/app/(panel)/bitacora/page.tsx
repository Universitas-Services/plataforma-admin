import { ChevronLeft, ChevronRight, Download, History, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { VerificarIntegridad } from "@/components/alcaldia/integridad";
import { FiltrosPlegables } from "@/components/panel/filtros-plegables";
import { EsqueletoTabla } from "@/components/ui/esqueletos";
import { EncabezadoPagina, EstadoVacio } from "@/components/ui/piezas";
import { Selector } from "@/components/ui/selector";
import { SelectorFecha } from "@/components/ui/selector-fecha";
import { usaApi } from "@/lib/api/cliente";
import { listarBitacoraApi, obtenerEventoApi, type EventoApi } from "@/lib/api/bitacora";
import { diferencias, eventosDe, filtrosBitacora, nombreAccion } from "@/lib/plataforma/alcaldia";
import { nombreCompleto } from "@/lib/plataforma/servicio";
import { almacen, exigirEnAlcaldia } from "@/lib/plataforma/sesion";

/** Un evento como lo muestra la página, venga de la API o del almacén simulado. */
type Evento = {
  id: string;
  /** Número de orden en la cadena (con la API). */
  seq?: number;
  fecha: string;
  actor: string;
  accionNombre: string;
  entidad: string;
  antes?: unknown;
  despues?: unknown;
  ip?: string;
  requestId?: string;
  hash: string;
};

const deApi = (e: EventoApi): Evento => ({
  id: e.id,
  seq: e.seq,
  fecha: e.fecha,
  // Sin actor, lo hizo el sistema (p. ej., una publicación programada).
  actor: e.actor?.nombre ?? "Sistema",
  accionNombre: e.accionNombre,
  // La API guarda la tabla y el id por separado.
  entidad: e.entidadId ? `${e.entidad} · ${e.entidadId}` : e.entidad,
  antes: e.antes,
  despues: e.despues,
  ip: e.ip,
  requestId: e.requestId,
  hash: e.hash,
});

export const metadata: Metadata = { title: "Bitácora" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const fechaHora = new Intl.DateTimeFormat("es-VE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Caracas",
});
const fecha = (iso: string) => fechaHora.format(new Date(iso));

/** Valor legible para la vista de diferencias. */
function valor(v: unknown) {
  if (v === undefined || v === null || v === "") return "—";
  if (Array.isArray(v)) return v.join(", ") || "—";
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return fecha(v);
  return String(v);
}

export default function BitacoraPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<EsqueletoTabla filas={8} columnas={4} />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

/** Backlog 2.13: cada acción del equipo de la alcaldía, encadenada por hash. */
async function Contenido({ searchParams }: { searchParams: SearchParams }) {
  const c = await exigirEnAlcaldia("bitacora.ver", "/bitacora");
  await connection();
  const sp = await searchParams;
  const leer = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const f = filtrosBitacora(leer);
  const filtrando = Object.values(f).some(Boolean);
  const consulta = new URLSearchParams(
    Object.entries(f).filter((e): e is [string, string] => !!e[1]),
  );
  const pedido = leer("evento");
  const pagina = Math.max(1, Math.min(10_000, Number.parseInt(leer("pagina") ?? "", 10) || 1));

  let eventos: Evento[];
  let actores: { valor: string; texto: string }[];
  let acciones: { valor: string; texto: string }[];
  let paginas = 1;
  let filtroInvalido = false;
  if (usaApi()) {
    const r = await listarBitacoraApi(f, pagina);
    if (r.estado === "FILTRO_INVALIDO") {
      filtroInvalido = true;
      eventos = [];
      actores = [];
      acciones = [];
    } else if (r.estado !== "OK")
      return null; // exigirEnAlcaldia ya cubrió sesión y permiso.
    else {
      eventos = r.eventos.map(deApi);
      paginas = r.paginas;
      actores = r.actores.map((a) => ({ valor: a.id, texto: a.nombre }));
      acciones = r.acciones.map((a) => ({ valor: a.codigo, texto: a.nombre }));
    }
  } else {
    const alm = almacen();
    const actor = (id: string) => {
      const u = alm.usuarios.get(id);
      return u ? nombreCompleto(u) || u.correo : "Sistema";
    };
    const todos = eventosDe(alm, c.alcaldia.id);
    eventos = eventosDe(alm, c.alcaldia.id, f).map((e) => ({
      id: String(e.id),
      fecha: e.fecha,
      actor: actor(e.actorId),
      accionNombre: nombreAccion(e.accion),
      entidad: e.entidad,
      antes: e.antes,
      despues: e.despues,
      hash: e.hash,
    }));
    actores = [...new Set(todos.map((e) => e.actorId))].map((id) => ({
      valor: id,
      texto: actor(id),
    }));
    acciones = [...new Set(todos.map((e) => e.accion))]
      .sort()
      .map((a) => ({ valor: a, texto: nombreAccion(a) }));
  }
  // El evento elegido: de esta página o, con la API, pedido aparte (p. ej., desde «Verificar»).
  let elegido = pedido ? eventos.find((e) => e.id === pedido) : undefined;
  if (pedido && !elegido && usaApi()) {
    const r = await obtenerEventoApi(pedido);
    if (r.estado === "OK") elegido = deApi(r.evento);
  }

  const conEvento = (id: string) => {
    const q = new URLSearchParams(consulta);
    if (pagina > 1) q.set("pagina", String(pagina));
    q.set("evento", id);
    return `/bitacora?${q}`;
  };
  const aPagina = (n: number) => {
    const q = new URLSearchParams(consulta);
    if (n > 1) q.set("pagina", String(n));
    const t = q.toString();
    return `/bitacora${t ? `?${t}` : ""}`;
  };

  return (
    <>
      <EncabezadoPagina
        titulo="Bitácora"
        bajada="Cada acción del equipo de tu alcaldía queda registrada y encadenada: nada se edita ni se borra."
        acciones={
          <>
            <VerificarIntegridad />
            {eventos.length > 0 && (
              <a
                href={`/bitacora/exportar${consulta.size ? `?${consulta}` : ""}`}
                download
                className="inline-flex min-h-10 items-center gap-2 rounded-control border border-linea bg-papel px-4 text-sm font-semibold text-tinta hover:border-tenue"
              >
                <Download size={16} aria-hidden="true" />
                Exportar CSV
              </a>
            )}
          </>
        }
      />

      <form
        role="search"
        action="/bitacora"
        className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))_auto]"
      >
        <div className="min-w-0 sm:col-span-2 xl:col-span-1">
          <label htmlFor="entidad" className="mb-1.5 hidden text-sm font-bold text-tinta sm:block">
            Entidad
          </label>
          <input
            id="entidad"
            name="entidad"
            type="search"
            defaultValue={f.entidad}
            maxLength={80}
            placeholder={usaApi() ? "Tabla (posts, users…) o id" : "Folio, ciudadano, catálogo…"}
            aria-label="Buscar por entidad"
            className="h-11 w-full rounded-control border border-linea bg-papel px-3 text-tinta outline-none placeholder:text-tenue hover:border-tenue focus-visible:border-marca-texto"
          />
        </div>
        <FiltrosPlegables activos={[f.actor, f.accion, f.desde, f.hasta].filter(Boolean).length}>
          <Selector
            id="actor"
            etiqueta="Actor"
            opciones={actores}
            valorInicial={f.actor}
            permitirVacio
            vacio="Todos"
          />
          <Selector
            id="accion"
            etiqueta="Acción"
            opciones={acciones}
            valorInicial={f.accion}
            permitirVacio
            vacio="Todas"
          />
          <SelectorFecha
            id="desde"
            name="desde"
            etiqueta="Desde"
            valorInicial={f.desde}
            vacio="Elegir"
          />
          <SelectorFecha
            id="hasta"
            name="hasta"
            etiqueta="Hasta"
            valorInicial={f.hasta}
            vacio="Elegir"
          />
          <button
            type="submit"
            className="h-11 rounded-control border border-linea bg-papel px-5 text-sm font-semibold text-tinta hover:border-tenue"
          >
            Filtrar
          </button>
        </FiltrosPlegables>
      </form>

      {eventos.length ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div
            role="region"
            aria-label="Eventos de la bitácora"
            tabIndex={0}
            className="relative overflow-x-auto rounded-lg border border-linea xl:self-start"
          >
            <table className="w-full border-collapse text-left text-[0.9375rem]">
              <caption className="sr-only">Eventos de la bitácora, del más reciente</caption>
              <thead className="bg-cabecera text-xs font-semibold tracking-wide text-gris uppercase">
                <tr>
                  <th scope="col" className="px-3 py-2.5">
                    Acción
                  </th>
                  <th scope="col" className="hidden px-3 py-2.5 md:table-cell">
                    Actor
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody>
                {eventos.map((e) => (
                  <tr
                    key={e.id}
                    className={`border-t border-fila ${elegido?.id === e.id ? "bg-cabecera" : ""}`}
                  >
                    <td className="w-full max-w-0 px-3 py-2.5">
                      <Link
                        href={conEvento(e.id)}
                        scroll={false}
                        aria-current={elegido?.id === e.id ? "true" : undefined}
                        className="font-semibold text-marca-texto hover:underline"
                      >
                        {e.accionNombre}
                      </Link>
                      <span className="block truncate text-sm text-gris">{e.entidad}</span>
                      <span className="block truncate text-sm text-gris md:hidden">{e.actor}</span>
                    </td>
                    <td className="hidden px-3 py-2.5 md:table-cell">{e.actor}</td>
                    <td className="px-3 py-2.5 text-right text-sm whitespace-nowrap text-gris tabular-nums">
                      {fecha(e.fecha)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {paginas > 1 && (
            <nav
              aria-label="Páginas de la bitácora"
              className="flex flex-wrap items-center justify-between gap-3 xl:col-start-1"
            >
              <p className="text-sm text-gris">
                Página {pagina} de {paginas}
              </p>
              <div className="flex gap-2">
                {pagina > 1 && (
                  <Link
                    href={aPagina(pagina - 1)}
                    className="inline-flex min-h-10 items-center gap-1 rounded-control border border-linea px-4 text-sm font-semibold text-tinta hover:border-tenue"
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                    Anterior
                  </Link>
                )}
                {pagina < paginas && (
                  <Link
                    href={aPagina(pagina + 1)}
                    className="inline-flex min-h-10 items-center gap-1 rounded-control border border-linea px-4 text-sm font-semibold text-tinta hover:border-tenue"
                  >
                    Siguiente
                    <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                )}
              </div>
            </nav>
          )}
          {elegido ? (
            <Detalle e={elegido} cerrar={aPagina(pagina)} />
          ) : (
            <p className="hidden rounded-lg border border-dashed border-linea p-5 text-sm text-gris xl:block">
              Elige un evento para ver qué cambió.
            </p>
          )}
        </div>
      ) : (
        <EstadoVacio
          Icono={History}
          titulo={filtrando ? "Ningún evento coincide" : "Aún no hay eventos"}
          accion={
            filtrando ? (
              <Link
                href="/bitacora"
                className="inline-flex min-h-10 items-center rounded-control border border-linea px-4 text-sm font-semibold text-tinta hover:border-tenue"
              >
                Quitar los filtros
              </Link>
            ) : undefined
          }
        >
          {filtroInvalido
            ? "Revisa la entidad: con la API se busca por el nombre de la tabla o por el id exacto del registro."
            : filtrando
              ? "Prueba con otras fechas, actor o acción."
              : "Aparecerán cuando el equipo haga cambios en el panel."}
        </EstadoVacio>
      )}
    </>
  );
}

function Detalle({ e, cerrar }: { e: Evento; cerrar: string }) {
  const cambios = diferencias(e as Parameters<typeof diferencias>[0]);
  return (
    <section
      aria-labelledby="detalle-evento"
      className="order-first rounded-lg border border-linea bg-papel p-5 xl:sticky xl:top-6 xl:order-none xl:self-start"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 id="detalle-evento" className="text-base font-bold text-tinta">
          {e.accionNombre}
        </h2>
        <Link
          href={cerrar}
          scroll={false}
          className="-m-2 grid size-10 shrink-0 place-items-center rounded-control text-gris hover:text-tinta"
        >
          <X size={18} aria-hidden="true" />
          <span className="sr-only">Cerrar el detalle</span>
        </Link>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold tracking-wide text-gris uppercase">Actor</dt>
          <dd className="mt-0.5 text-tinta">{e.actor}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold tracking-wide text-gris uppercase">Fecha</dt>
          <dd className="mt-0.5 text-tinta tabular-nums">{fecha(e.fecha)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold tracking-wide text-gris uppercase">Entidad</dt>
          <dd className="mt-0.5 break-all text-tinta">{e.entidad}</dd>
        </div>
        {e.seq !== undefined && (
          <div>
            <dt className="text-xs font-semibold tracking-wide text-gris uppercase">
              N.º de orden
            </dt>
            <dd className="mt-0.5 text-tinta tabular-nums">{e.seq}</dd>
          </div>
        )}
        {e.ip && (
          <div>
            <dt className="text-xs font-semibold tracking-wide text-gris uppercase">IP</dt>
            <dd className="mt-0.5 break-all text-tinta tabular-nums">{e.ip}</dd>
          </div>
        )}
        {e.requestId && (
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold tracking-wide text-gris uppercase">
              Id de la petición
            </dt>
            <dd className="mt-0.5 font-mono text-xs break-all text-tinta">{e.requestId}</dd>
          </div>
        )}
      </dl>

      <h3 className="mt-5 mb-2 text-sm font-bold text-tinta">Qué cambió</h3>
      {cambios.length ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="text-xs font-semibold tracking-wide text-gris uppercase">
              <tr>
                <th scope="col" className="py-1.5 pr-3">
                  Campo
                </th>
                <th scope="col" className="py-1.5 pr-3">
                  Antes
                </th>
                <th scope="col" className="py-1.5">
                  Después
                </th>
              </tr>
            </thead>
            <tbody>
              {cambios.map((d) => (
                <tr key={d.campo} className="border-t border-fila align-top">
                  <th scope="row" className="py-2 pr-3 font-semibold text-tinta">
                    {d.campo}
                  </th>
                  <td className="py-2 pr-3 break-words text-peligro">
                    <del className="no-underline">{valor(d.antes)}</del>
                  </td>
                  <td className="py-2 break-words text-turquesa-texto">
                    <ins className="no-underline">{valor(d.despues)}</ins>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gris">Este evento no registra cambios de datos.</p>
      )}

      <p className="mt-5 text-xs break-all text-gris">
        <span className="font-semibold">Hash:</span> <code>{e.hash}</code>
      </p>
    </section>
  );
}
