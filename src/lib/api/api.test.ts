import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as SesionApi from "./sesion-api";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("./sesion-api", async (original) => ({
  ...(await original<typeof SesionApi>()),
  tokensDeCookie: async () => ({ a: "acceso", r: "refresco", x: Date.now() + 600_000, u: "u1" }),
}));

const { ErrorApi } = await import("./cliente");
const { mensajeDeError } = await import("./errores");
const documentos = await import("./documentos");
const marco = await import("./marco-legal");
const inicio = await import("./inicio");
const banners = await import("./banners");
const proceso = await import("./proceso");
const textos = await import("./textos-legales");
const catalogos = await import("./catalogos");
const noticias = await import("./noticias");
const participaciones = await import("./participaciones");
const acceso = await import("./acceso");
const equipo = await import("./equipo");
const ciudadanos = await import("./ciudadanos");
const bitacora = await import("./bitacora");
const metricas = await import("./metricas");
const { indicadoresApi } = await import("@/lib/plataforma/tablero-datos");
const { reflejarUsuario } = await import("./sesion-api");
const { abrirSello, sellar } = await import("./sello");
const { esMedioApi } = await import("@/lib/contenido/medio-api");
const { almacenDemo } = await import("@/lib/plataforma/fixtures");

const API = "https://api.ejemplo.test/api/v1";

/** fetch simulado: responde en orden lo que se le da y guarda lo que recibió. */
function simularFetch(...respuestas: { status?: number; cuerpo?: unknown }[]) {
  const llamadas: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    llamadas.push({ url, init });
    const r = respuestas.shift() ?? { status: 204 };
    return new Response(r.cuerpo === undefined ? null : JSON.stringify(r.cuerpo), {
      status: r.status ?? 200,
    });
  });
  return llamadas;
}

const NOTICIA = {
  id: "8e7c9a1f-0000-4000-8000-000000000001",
  slug: "una-noticia",
  tipo: "NOTICIA",
  formato: "IMAGEN",
  titulo: "Una noticia",
  resumen: "Resumen",
  cuerpo: "<p>Hola</p>",
  imagenes: [],
  destacada: false,
  estado: "PUBLICADO",
  publicadoEl: "2026-10-27T14:00:00.000Z",
  actualizadoEl: "2026-10-27T14:00:00.000Z",
  creadoEl: "2026-10-27T13:00:00.000Z",
  autor: { id: "u-api", nombre: "Luisa Colmenárez" },
  totales: { vistas: 0, likes: 0, dislikes: 0 },
};

beforeEach(() => {
  process.env.API_URL = API;
});
afterEach(() => {
  delete process.env.API_URL;
  vi.unstubAllGlobals();
});

describe("cliente de la API", () => {
  it("traduce los errores al español", () => {
    expect(mensajeDeError(new ErrorApi(401, "INVALID_CREDENTIALS", "x"))).toMatch(/correo o la/);
    expect(
      mensajeDeError(new ErrorApi(403, "ACCOUNT_LOCKED", "x", { retryAfterSeconds: 120 })),
    ).toMatch(/2 minutos/);
    expect(mensajeDeError(new ErrorApi(500, "ALGO", "detalle interno"))).not.toMatch(/interno/);
  });

  it("la cookie de tokens no se puede leer ni alterar sin el secreto", () => {
    const sello = sellar({ a: "acceso", r: "refresco", x: 1, u: "u1" }, "secreto");
    expect(abrirSello(sello, "secreto")).toMatchObject({ a: "acceso", r: "refresco" });
    expect(abrirSello(sello, "otro")).toBeNull();
    expect(abrirSello(`${sello}x`, "secreto")).toBeNull();
  });

  it("refleja al usuario de la API en el almacén con sus roles", () => {
    const alm = almacenDemo();
    const u = reflejarUsuario(alm, {
      id: "api-1",
      email: "Operador@iribarren.test",
      nombres: "Luisa",
      apellidos: "Colmenárez",
      context: "admin",
      roles: ["OPERADOR", "REVISOR"],
      permisos: [],
      cuenta: { estado: "ACTIVA", desde: null, motivo: null },
      alcaldia: { codigo: "IRI", nombre: "Alcaldía de Iribarren" },
    });
    expect(u.id).toBe("u-operador-iri");
    expect(u.roles).toEqual(["OPERADOR", "REVISOR"]);
    expect(alm.sesiones.get("api:api-1")).toEqual({ usuarioId: "u-operador-iri" });
    const nuevo = reflejarUsuario(alm, {
      id: "api-2",
      email: "otra@iribarren.test",
      nombres: null,
      apellidos: null,
      context: "admin",
      roles: ["SUPER_ADMIN"],
      permisos: [],
      cuenta: { estado: "ACTIVA", desde: null, motivo: null },
      alcaldia: { codigo: "IRI", nombre: "Alcaldía de Iribarren" },
    });
    expect(nuevo).toMatchObject({ id: "api-api-2", rolPlataforma: "SUPER_ADMIN", roles: [] });
  });

  it("reconoce solo los medios de la API configurada", () => {
    expect(esMedioApi(`${API}/media/8e7c9a1f-0000-4000-8000-000000000001.webp`)).toBe(true);
    expect(esMedioApi("https://otro.test/api/v1/media/8e7c9a1f-0000-4000-8000-000000000001")).toBe(
      false,
    );
    expect(esMedioApi("/medios/abc")).toBe(false);
  });
});

describe("noticias contra la API", () => {
  it("lista todas las páginas con sus conteos y totales", async () => {
    const llamadas = simularFetch(
      {
        cuerpo: {
          data: [{ ...NOTICIA, autor: "Luisa Colmenárez" }],
          meta: {
            page: 1,
            limit: 100,
            total: 2,
            totalPages: 2,
            conteos: { BORRADOR: 1, PUBLICADO: 1 },
          },
        },
      },
      {
        cuerpo: {
          data: [{ ...NOTICIA, id: "otra", autor: "Luisa Colmenárez" }],
          meta: { page: 2, limit: 100, total: 2, totalPages: 2, conteos: {} },
        },
      },
    );
    const r = await noticias.listarNoticiasApi({ estado: "PUBLICADO", q: "una" });
    if (r.estado !== "OK") throw new Error(r.estado);
    expect(r.items.map((n) => n.id)).toEqual([NOTICIA.id, "otra"]);
    expect(r.items[0]!.autor).toBe("Luisa Colmenárez");
    expect(llamadas[0]!.url).toBe(
      `${API}/admin/posts?estado=PUBLICADO&q=una&sort=recientes&limit=100&page=1`,
    );
    expect(new Headers(llamadas[0]!.init.headers).get("Authorization")).toBe("Bearer acceso");
  });

  it("traduce INCOMPLETE, MEDIO_AJENO, INVALID_TRANSITION y 404 a los resultados del editor", async () => {
    const campos = { titulo: "Escribe el título." };
    simularFetch({ status: 422, cuerpo: { code: "INCOMPLETE", details: { campos } } });
    expect(await noticias.guardarNoticiaApi("x", {} as never)).toEqual({
      estado: "INCOMPLETA",
      errores: campos,
    });
    simularFetch({ status: 422, cuerpo: { code: "MEDIO_AJENO" } });
    expect(await noticias.guardarNoticiaApi("x", {} as never)).toEqual({ estado: "MEDIO_AJENO" });
    simularFetch({ status: 422, cuerpo: { code: "INVALID_TRANSITION" } });
    expect(await noticias.cambiarEstadoApi("x", "despublicar")).toEqual({ estado: "TRANSICION" });
    simularFetch({
      status: 422,
      cuerpo: { code: "INCOMPLETE", details: { campos: { publicarEl: "Elige otra fecha." } } },
    });
    expect((await noticias.cambiarEstadoApi("x", "programar", "2020-01-01")).estado).toBe(
      "FECHA_PASADA",
    );
    simularFetch({ status: 404, cuerpo: { code: "NOT_FOUND" } });
    expect(await noticias.obtenerNoticiaApi("x")).toEqual({ estado: "NO_EXISTE" });
  });

  it("programar envía la fecha y eliminar usa DELETE", async () => {
    const llamadas = simularFetch(
      { cuerpo: { actualizadoEl: "t", estado: "PROGRAMADO", slug: "s" } },
      { status: 204 },
    );
    await noticias.cambiarEstadoApi("n1", "programar", "2030-01-01T10:00:00.000Z");
    expect(llamadas[0]!.url).toBe(`${API}/admin/posts/n1/schedule`);
    expect(JSON.parse(String(llamadas[0]!.init.body))).toEqual({
      publicarEl: "2030-01-01T10:00:00.000Z",
    });
    expect((await noticias.cambiarEstadoApi("n1", "eliminar")).estado).toBe("OK");
    expect(llamadas[1]!.init.method).toBe("DELETE");
  });

  it("refleja las publicadas en el almacén y quita las de ejemplo", async () => {
    const alm = almacenDemo();
    simularFetch({
      cuerpo: {
        data: [NOTICIA],
        meta: { page: 1, limit: 100, total: 1, totalPages: 1, conteos: {} },
      },
    });
    await noticias.sincronizarNoticiasApi(alm);
    expect([...alm.noticias.keys()]).toEqual([NOTICIA.id]);
    expect(alm.noticias.get(NOTICIA.id)).toMatchObject({ autorId: "u-api", estado: "PUBLICADO" });
  });
});

const PDF = {
  nombre: "decreto.pdf",
  url: `${API}/media/8e7c9a1f-0000-4000-8000-000000000002.pdf`,
  tipo: "application/pdf" as const,
  pesoBytes: 1024,
};

const DOCUMENTO = {
  id: "d-api-1",
  slug: "decreto-48-2026",
  titulo: "Decreto N° 48-2026",
  descripcion: "Decreto del PDUL.",
  categoria: "Decretos y normativa",
  estado: "OFICIAL",
  publico: true,
  version: "1.0",
  archivo: PDF,
  versiones: [
    { version: "1.0", fecha: "2026-10-28T12:00:00.000Z", nota: "Primera versión.", archivo: PDF },
  ],
  publicadoEl: "2026-10-28T12:00:00.000Z",
  actualizadoEl: "2026-10-28T12:00:00.000Z",
  descargas: 7,
  descargaUrl: `${API}/portal/documents/decreto-48-2026/download`,
};

describe("documentos contra la API", () => {
  it("lista todas las páginas con los conteos y el total general", async () => {
    const llamadas = simularFetch(
      {
        cuerpo: {
          data: [DOCUMENTO],
          meta: {
            page: 1,
            limit: 100,
            total: 2,
            totalPages: 2,
            conteos: { BORRADOR: 1, OFICIAL: 1 },
            totalGeneral: 5,
          },
        },
      },
      {
        cuerpo: {
          data: [{ ...DOCUMENTO, id: "d-api-2", estado: "BORRADOR" }],
          meta: {
            page: 2,
            limit: 100,
            total: 2,
            totalPages: 2,
            conteos: { BORRADOR: 1, OFICIAL: 1 },
            totalGeneral: 5,
          },
        },
      },
    );
    const r = await documentos.listarDocumentosApi({ visibilidad: "publico", q: "decreto" });
    if (r.estado !== "OK") throw new Error(r.estado);
    expect(r.items.map((d) => d.id)).toEqual(["d-api-1", "d-api-2"]);
    expect(r.items[0]).toMatchObject({ descargas: 7, alcaldiaId: expect.any(String) });
    expect(r.items[0]).not.toHaveProperty("descargaUrl");
    expect(r.conteos).toEqual({ BORRADOR: 1, OFICIAL: 1 });
    expect(r.total).toBe(5);
    expect(llamadas[0]!.url).toBe(
      `${API}/admin/documents?visibilidad=publico&q=decreto&limit=100&page=1`,
    );
  });

  it("crea con el archivo en el cuerpo y la versión nueva lleva nota y tipo", async () => {
    const llamadas = simularFetch(
      { status: 201, cuerpo: DOCUMENTO },
      { status: 201, cuerpo: DOCUMENTO },
    );
    const campos = {
      titulo: "Decreto N° 48-2026",
      descripcion: "Decreto del PDUL.",
      categoria: "Decretos y normativa",
      estado: "OFICIAL",
      publico: true,
    } as const;
    expect((await documentos.crearDocumentoApi(campos, PDF)).estado).toBe("OK");
    expect(JSON.parse(String(llamadas[0]!.init.body))).toEqual({ ...campos, archivo: PDF });
    await documentos.nuevaVersionApi("d1", PDF, "  Corrige el anexo.  ", "mayor");
    expect(llamadas[1]!.url).toBe(`${API}/admin/documents/d1/versions`);
    expect(JSON.parse(String(llamadas[1]!.init.body))).toEqual({
      archivo: PDF,
      nota: "Corrige el anexo.",
      tipo: "mayor",
    });
  });

  it("traduce MEDIO_AJENO, VALIDATION_ERROR, la categoría y 404", async () => {
    simularFetch({ status: 422, cuerpo: { code: "MEDIO_AJENO" } });
    expect(await documentos.nuevaVersionApi("d1", PDF, "Nota larga", "menor")).toEqual({
      estado: "MEDIO_AJENO",
    });
    simularFetch({
      status: 400,
      cuerpo: {
        code: "VALIDATION_ERROR",
        details: ["Escribe el título.", "Escribe una descripción breve."],
      },
    });
    expect(await documentos.guardarDocumentoApi("d1", {} as never)).toEqual({
      estado: "INVALIDO",
      errores: { titulo: "Escribe el título.", descripcion: "Escribe una descripción breve." },
    });
    simularFetch({ status: 400, cuerpo: { code: "INVALID_CATALOG_VALUE" } });
    expect(await documentos.guardarDocumentoApi("d1", {} as never)).toMatchObject({
      estado: "INVALIDO",
      errores: { categoria: expect.any(String) },
    });
    simularFetch({ status: 404, cuerpo: { code: "NOT_FOUND" } });
    expect(await documentos.eliminarDocumentoApi("d1")).toEqual({ estado: "NO_EXISTE" });
  });

  it("refleja los documentos en el almacén y quita los de ejemplo", async () => {
    const alm = almacenDemo();
    simularFetch({
      cuerpo: { data: [DOCUMENTO], meta: { page: 1, limit: 100, total: 1, totalPages: 1 } },
    });
    await documentos.sincronizarDocumentosApi(alm);
    expect([...alm.documentos.keys()]).toEqual(["d-api-1"]);
  });
});

describe("renovación de la cookie (Proxy)", () => {
  it("cierra por inactividad y comparte la renovación entre peticiones simultáneas", async () => {
    const { INACTIVIDAD_MS, revisarCookie } = await import("./renovacion");
    const { secretoSesion } = await import("./sello");
    const ahora = 10_000_000;
    const cookie = (v: number, x = ahora + 1_000) =>
      sellar({ a: "a", r: `r-${v}`, x, u: "u", v }, secretoSesion());
    expect(
      await revisarCookie(cookie(ahora - INACTIVIDAD_MS - 1), { prefetch: false, ahora }),
    ).toEqual({ valor: null, motivo: "inactividad" });
    const refrescar = vi.fn(async () => ({
      accessToken: "a2",
      refreshToken: "r2",
      expiresIn: 900,
      user: { id: "u" },
    }));
    const porVencer = cookie(ahora);
    await Promise.all(
      [1, 2, 3].map(() =>
        revisarCookie(porVencer, { prefetch: false, ahora, refrescar: refrescar as never }),
      ),
    );
    expect(refrescar).toHaveBeenCalledTimes(1);
    expect(await revisarCookie(porVencer, { prefetch: true, ahora })).toBeUndefined();
  });
});

describe("Marco legal contra la API (R9)", () => {
  const ITEM = {
    id: "m1",
    titulo: "Sentencia N° 928/2018",
    descripcion: "Descripción del ítem del marco legal.",
    activo: true,
    orden: 0,
    botonDisponible: false,
    creadoEl: "2026-10-28T12:00:00.000Z",
    actualizadoEl: "2026-10-28T12:00:00.000Z",
  };

  it("arma la vista con los ítems, los activos y los destinos con su tipo", async () => {
    const llamadas = simularFetch(
      { cuerpo: { data: [ITEM], meta: { activos: 1, maxActivos: 10 } } },
      {
        cuerpo: {
          noticias: [{ id: "n1", titulo: "Análisis", slug: "analisis" }],
          documentos: [{ id: "d1", titulo: "Decreto", slug: "decreto-48-2026" }],
        },
      },
    );
    const r = await marco.marcoLegalApi();
    if (r.estado !== "OK") throw new Error(r.estado);
    expect(r.activos).toBe(1);
    expect(r.items[0]).toMatchObject({ id: "m1", alcaldiaId: expect.any(String) });
    expect(r.noticias[0]).toMatchObject({ tipo: "NOTICIA", slug: "analisis" });
    expect(r.documentos[0]).toMatchObject({ tipo: "DOCUMENTO", id: "d1" });
    expect(llamadas.map((l) => l.url)).toEqual([
      `${API}/admin/legal-framework`,
      `${API}/admin/legal-framework/destinos`,
    ]);
  });

  it("guardar manda boton: null al quitarlo y ordenar usa PUT con los ids", async () => {
    const llamadas = simularFetch({ cuerpo: ITEM }, { cuerpo: { data: [], meta: { activos: 0 } } });
    await marco.guardarItemMarcoApi("m1", {
      titulo: ITEM.titulo,
      descripcion: ITEM.descripcion,
      activo: true,
    });
    expect(llamadas[0]!.init.method).toBe("PATCH");
    expect(JSON.parse(String(llamadas[0]!.init.body)).boton).toBeNull();
    await marco.ordenarMarcoApi(["m2", "m1"]);
    expect(llamadas[1]!.init.method).toBe("PUT");
    expect(JSON.parse(String(llamadas[1]!.init.body))).toEqual({ ids: ["m2", "m1"] });
  });

  it("traduce los códigos del Marco y la validación por campo", async () => {
    simularFetch({
      status: 422,
      cuerpo: { code: "DEMASIADOS_ACTIVOS", details: { maxActivos: 10 } },
    });
    expect(await marco.crearItemMarcoApi({ titulo: "x", descripcion: "y", activo: true })).toEqual({
      estado: "DEMASIADOS_ACTIVOS",
    });
    simularFetch({
      status: 400,
      cuerpo: { code: "VALIDATION_ERROR", details: ["La descripción no admite HTML."] },
    });
    expect(
      await marco.crearItemMarcoApi({ titulo: "x", descripcion: "<b>", activo: false }),
    ).toEqual({ estado: "INVALIDO", errores: { descripcion: "La descripción no admite HTML." } });
    simularFetch({ status: 404, cuerpo: { code: "NOT_FOUND" } });
    expect(await marco.eliminarItemMarcoApi("m9")).toEqual({ estado: "NO_EXISTE" });
  });
});

describe("Inicio, diapositivas y proceso contra la API (R10)", () => {
  it("el mensaje del alcalde: vista con candidatos y PUT con null para quitarlo", async () => {
    const llamadas = simularFetch(
      {
        cuerpo: {
          mensajeAlcalde: { ...NOTICIA, formato: "TEXTO" },
          candidatosMensaje: [{ ...NOTICIA, formato: "TEXTO" }],
          retiradas: ["Una vieja"],
        },
      },
      { status: 204 },
      { status: 422, cuerpo: { code: "NO_ES_TEXTO" } },
    );
    const r = await inicio.inicioApi();
    if (r.estado !== "OK") throw new Error(r.estado);
    expect(r.mensajeAlcalde?.id).toBe(NOTICIA.id);
    expect(r.retiradas).toEqual(["Una vieja"]);
    expect((await inicio.guardarInicioApi(null)).estado).toBe("OK");
    expect(llamadas[1]!.init.method).toBe("PUT");
    expect(JSON.parse(String(llamadas[1]!.init.body))).toEqual({ mensajeAlcalde: null });
    expect(await inicio.guardarInicioApi("x")).toEqual({ estado: "NO_ES_TEXTO" });
  });

  const DIAPO = {
    id: "b1",
    titulo: "Consulta",
    texto: "Participa",
    enlace: { href: "/participa", etiqueta: "Ir" },
    tono: "rojo",
    orden: 0,
    estadoVigencia: "VIGENTE",
    creadoEl: "2026-10-28T12:00:00.000Z",
    actualizadoEl: "2026-10-28T12:00:00.000Z",
  };

  it("diapositivas: enPortal llega como ids y con filtro se pide también la lista completa", async () => {
    const llamadas = simularFetch(
      {
        cuerpo: {
          data: [],
          meta: { total: 0, conteos: { VIGENTE: 1, FUTURO: 0, VENCIDO: 0 }, enPortal: ["b1"] },
        },
      },
      {
        cuerpo: {
          data: [DIAPO],
          meta: { total: 1, conteos: { VIGENTE: 1, FUTURO: 0, VENCIDO: 0 }, enPortal: ["b1"] },
        },
      },
    );
    const r = await banners.listarBannersApi("VENCIDO");
    if (r.estado !== "OK") throw new Error(r.estado);
    expect(r.items).toEqual([]);
    expect(r.enPortal.map((b) => b.id)).toEqual(["b1"]);
    expect(llamadas.map((l) => l.url)).toEqual([
      `${API}/admin/banners?vigencia=VENCIDO`,
      `${API}/admin/banners`,
    ]);
  });

  it("diapositivas: ordenar con PUT y traducir FECHAS, ORDEN_INVALIDO y validación", async () => {
    const llamadas = simularFetch(
      { status: 200, cuerpo: {} },
      { status: 422, cuerpo: { code: "ORDEN_INVALIDO" } },
      { status: 422, cuerpo: { code: "FECHAS" } },
      { status: 400, cuerpo: { code: "VALIDATION_ERROR", details: ["El enlace no es válido."] } },
    );
    expect((await banners.ordenarBannersApi(["b2", "b1"])).estado).toBe("OK");
    expect(llamadas[0]!.init.method).toBe("PUT");
    expect(await banners.ordenarBannersApi(["b1"])).toEqual({ estado: "ORDEN_INVALIDO" });
    const campos = {
      titulo: "t",
      texto: "x",
      enlace: { href: "/a", etiqueta: "b" },
      tono: "rojo" as const,
      vigencia: { desde: "2026-11-02", hasta: "2026-11-01" },
    };
    expect(await banners.guardarBannerApi(undefined, campos)).toEqual({ estado: "FECHAS" });
    expect(await banners.guardarBannerApi("b1", campos)).toEqual({
      estado: "INVALIDO",
      errores: { "enlace-href": "El enlace no es válido." },
    });
  });

  const PROCESO = {
    faseActual: 1,
    fases: [
      {
        id: "f1",
        nombre: "Decreto",
        descripcion: "",
        orden: 0,
        estadoSiguiente: "PENDIENTE",
        actual: false,
      },
      {
        id: "f2",
        nombre: "Plan",
        descripcion: "",
        orden: 1,
        estadoSiguiente: "PENDIENTE",
        actual: true,
      },
      {
        id: "f3",
        nombre: "Consulta",
        descripcion: "",
        orden: 2,
        estadoSiguiente: "PROXIMAMENTE",
        actual: false,
      },
    ],
  };

  it("proceso: mapea faseActual y el estado de cada fase siguiente", async () => {
    simularFetch({ cuerpo: PROCESO });
    const p = await proceso.procesoApi();
    expect(p?.actual).toBe(1);
    expect(p?.fases[2]).toMatchObject({ id: "f3", estadoSiguiente: "PROXIMAMENTE" });
  });

  it("proceso: mover arma la lista completa de ids y el estado viaja en «estado»", async () => {
    const llamadas = simularFetch({ cuerpo: PROCESO }, { cuerpo: PROCESO }, { cuerpo: PROCESO });
    expect((await proceso.moverFaseApi("f3", -1)).estado).toBe("OK");
    expect(llamadas[1]!.url).toBe(`${API}/admin/process/order`);
    expect(JSON.parse(String(llamadas[1]!.init.body))).toEqual({ ids: ["f1", "f3", "f2"] });
    await proceso.guardarFaseApi({
      id: "f3",
      nombre: "Consulta",
      descripcion: "",
      estadoSiguiente: "FUTURO",
    });
    expect(JSON.parse(String(llamadas[2]!.init.body))).toMatchObject({
      estado: "FUTURO",
      inicio: null,
      fin: null,
    });
  });

  it("proceso: traduce FASE_ACTUAL, LIMITE y FECHAS", async () => {
    simularFetch(
      { status: 422, cuerpo: { code: "FASE_ACTUAL" } },
      { status: 422, cuerpo: { code: "LIMITE", details: { maxFases: 12 } } },
      { status: 422, cuerpo: { code: "FECHAS" } },
    );
    expect(await proceso.eliminarFaseApi("f2")).toEqual({ estado: "FASE_ACTUAL" });
    expect(await proceso.guardarFaseApi({ nombre: "Otra", descripcion: "" })).toEqual({
      estado: "LIMITE",
    });
    expect(
      await proceso.guardarFaseApi({
        nombre: "Otra",
        descripcion: "",
        inicio: "2026-12-02",
        fin: "2026-12-01",
      }),
    ).toEqual({ estado: "FECHAS" });
  });
});

describe("Textos legales contra la API (R15)", () => {
  const VERSION = {
    version: 3,
    html: "<p>Texto</p>",
    nota: "Se aclara la sección de cuentas.",
    publicadoAt: "2026-10-29T12:00:00.000Z",
    publicadoPor: { id: "u-api", nombre: "Ramón Escalona" },
  };

  it("lee la vigente de cada texto y el historial", async () => {
    const llamadas = simularFetch(
      { cuerpo: { data: [{ tipo: "TERMINOS", vigente: VERSION, versiones: 3 }] } },
      { cuerpo: { data: [VERSION] } },
    );
    const r = await textos.textosLegalesApi();
    if (r.estado !== "OK") throw new Error(r.estado);
    expect(r.textos.TERMINOS).toMatchObject({
      versiones: 3,
      vigente: { version: 3, autor: "Ramón Escalona" },
    });
    expect(r.textos.POLITICA_DATOS).toEqual({ versiones: 0 });
    const h = await textos.historialTextoApi("POLITICA_DATOS");
    if (h.estado !== "OK") throw new Error(h.estado);
    expect(llamadas.map((l) => l.url)).toEqual([
      `${API}/admin/legal-texts`,
      `${API}/admin/legal-texts/POLITICA_DATOS/versions`,
    ]);
  });

  it("publica con POST y traduce SIN_CAMBIOS, la nota faltante y el permiso", async () => {
    const llamadas = simularFetch(
      { status: 201, cuerpo: VERSION },
      { status: 409, cuerpo: { code: "SIN_CAMBIOS", message: "Igual" } },
      {
        status: 400,
        cuerpo: { code: "VALIDATION_ERROR", message: "x", details: ["nota es obligatoria"] },
      },
      { status: 403, cuerpo: { code: "FORBIDDEN", message: "x" } },
    );
    const ok = await textos.publicarTextoApi("TERMINOS", { html: "<p>T</p>", nota: "N" });
    expect(ok).toMatchObject({ estado: "OK", version: { version: 3 } });
    expect(llamadas[0]).toMatchObject({
      url: `${API}/admin/legal-texts/TERMINOS/versions`,
      init: { method: "POST" },
    });
    expect(JSON.parse(String(llamadas[0]!.init.body))).toEqual({ html: "<p>T</p>", nota: "N" });
    const d = { html: "<p>T</p>", nota: "N" };
    expect((await textos.publicarTextoApi("TERMINOS", d)).estado).toBe("SIN_CAMBIOS");
    expect((await textos.publicarTextoApi("TERMINOS", d)).estado).toBe("SIN_NOTA");
    expect((await textos.publicarTextoApi("TERMINOS", d)).estado).toBe("SIN_PERMISO");
  });
});

describe("Catálogos contra la API (R16)", () => {
  const ITEM = (id: string, valor: string, activo = true) => ({
    id,
    valor,
    codigo: null,
    orden: 0,
    activo,
  });

  it("lee los 6 catálogos con su slug y los valores activos", async () => {
    const llamadas = simularFetch(
      ...Array.from({ length: 6 }, () => ({
        cuerpo: { data: [ITEM("a", "Catedral"), ITEM("b", "Vieja", false)] },
      })),
      { cuerpo: { data: [ITEM("a", "Catedral"), ITEM("b", "Vieja", false)] } },
    );
    const r = await catalogos.catalogosApi();
    expect(r?.parroquias).toEqual([
      { id: "a", nombre: "Catedral", activo: true },
      { id: "b", nombre: "Vieja", activo: false },
    ]);
    expect(llamadas.map((l) => l.url)).toContain(`${API}/admin/catalogs/tipos-entidad`);
    expect(await catalogos.activosApi("categoriasNoticias")).toEqual(["Catedral"]);
  });

  it("crea, renombra, activa y reordena; traduce el repetido", async () => {
    const llamadas = simularFetch(
      { status: 201, cuerpo: ITEM("n", "Nueva") },
      { status: 409, cuerpo: { code: "CATALOGO_REPETIDO", message: "x" } },
      { cuerpo: ITEM("n", "Otra") },
      { cuerpo: { data: [ITEM("a", "A"), ITEM("b", "B")] } },
      { status: 204 },
    );
    expect((await catalogos.guardarItemApi("parroquias", "Nueva")).estado).toBe("OK");
    expect(llamadas[0]).toMatchObject({
      url: `${API}/admin/catalogs/parroquias`,
      init: { method: "POST" },
    });
    expect((await catalogos.guardarItemApi("parroquias", "Nueva")).estado).toBe("REPETIDO");
    expect((await catalogos.activarItemApi("parroquias", "n", false)).estado).toBe("OK");
    expect(llamadas[2]).toMatchObject({
      url: `${API}/admin/catalogs/parroquias/n`,
      init: { method: "PATCH" },
    });
    expect(JSON.parse(String(llamadas[2]!.init.body))).toEqual({ activo: false });
    expect((await catalogos.moverItemApi("parroquias", "b", -1)).estado).toBe("OK");
    expect(llamadas[4]).toMatchObject({
      url: `${API}/admin/catalogs/parroquias/order`,
      init: { method: "PUT" },
    });
    expect(JSON.parse(String(llamadas[4]!.init.body))).toEqual({ ids: ["b", "a"] });
  });
});

describe("Participaciones contra la API (R11)", () => {
  const FILA = {
    folio: "IRI-2026-0045",
    tipo: "PROPUESTA_FORMAL",
    estado: "PENDIENTE",
    recibidaEl: "2026-10-29T20:09:44.740Z",
    parroquia: "Catedral",
    sector: "Centro",
    categoriaTecnica: "Vialidad y Transporte",
    mostrarNombre: false,
    autor: { tipo: "NATURAL", nombre: "Ana Pérez", documento: "V-14.***.890" },
  };
  const CONTEOS = {
    estado: { PENDIENTE: 1, EN_REVISION: 0, APROBADA: 0, RECHAZADA: 0, PUBLICADA: 0 },
    tipo: { OPINION_GENERAL: 0, OPINION_NOTICIA: 0, PROPUESTA_FORMAL: 1 },
  };

  it("lista con los filtros de la API y los conteos de los chips", async () => {
    const llamadas = simularFetch({
      cuerpo: {
        data: [FILA],
        meta: { page: 2, limit: 50, total: 51, totalPages: 2, conteos: CONTEOS },
      },
    });
    const r = await participaciones.listarParticipacionesApi(
      {
        estado: "PENDIENTE",
        categoria: "Vialidad y Transporte",
        desde: "2026-10-01",
        orden: "antiguas",
      },
      2,
    );
    const url = new URL(llamadas[0]!.url);
    expect(url.pathname).toBe("/api/v1/admin/participations");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      estado: "PENDIENTE",
      categoria: "Vialidad y Transporte",
      desde: "2026-10-01",
      sort: "antiguas",
      page: "2",
      limit: "50",
    });
    expect(r.estado === "OK" && r.meta.conteos.tipo.PROPUESTA_FORMAL).toBe(1);
    const fila = participaciones.filaDeApi(FILA as never, Date.parse("2026-11-01T12:00:00Z"));
    expect(fila).toMatchObject({
      tipoClave: "PROPUESTA_FORMAL",
      tipo: "Propuesta formal",
      dias: 2,
    });
    // Con `estadoDesde`, los días son los del estado actual, no desde la recepción.
    const enRevision = participaciones.filaDeApi(
      { ...FILA, estadoDesde: "2026-10-31T13:00:00.000Z" } as never,
      Date.parse("2026-11-01T12:00:00Z"),
    );
    expect(enRevision.dias).toBe(0);
  });

  it("el detalle trae quién y con su nombre; los 404 son NO_EXISTE", async () => {
    simularFetch(
      {
        cuerpo: {
          ...FILA,
          descripcion: "Texto",
          imagenes: [{ id: "f1", nombre: "a.jpg", mime: "image/jpeg", tamano: 10, sha256: "x" }],
          autor: { tipo: "NATURAL", nombre: "Ana", correo: "a@b.test", documentos: [] },
          historial: [
            { estado: "PENDIENTE", fecha: FILA.recibidaEl },
            { estado: "EN_REVISION", fecha: FILA.recibidaEl, por: { id: "u1", nombre: "María" } },
          ],
          notas: [],
          transiciones: ["APROBADA", "RECHAZADA"],
          hashContenido: "abc",
          codigoVerificacion: "YYDK-FJK9",
        },
      },
      { status: 404, cuerpo: { code: "NOT_FOUND", message: "No existe" } },
    );
    const r = await participaciones.obtenerParticipacionApi("iri-2026-0045");
    expect(r.estado).toBe("OK");
    if (r.estado !== "OK") return;
    expect(r.participacion.historial[1]!.por?.nombre).toBe("María");
    expect(r.participacion.transiciones).toEqual(["APROBADA", "RECHAZADA"]);
    expect(r.participacion.imagenes[0]!.id).toBe("f1");
    expect((await participaciones.obtenerParticipacionApi("IRI-2026-9999")).estado).toBe(
      "NO_EXISTE",
    );
  });

  it("el rechazo manda motivoCodigo y comentario, y traduce los errores", async () => {
    const llamadas = simularFetch(
      { cuerpo: {} },
      { status: 422, cuerpo: { code: "INVALID_TRANSITION", message: "x" } },
      { status: 422, cuerpo: { code: "MOTIVO_REQUERIDO", message: "x" } },
      { status: 422, cuerpo: { code: "TEXTO_CORTO", message: "x" } },
      { status: 403, cuerpo: { code: "FORBIDDEN", message: "x" } },
    );
    const texto = "No corresponde a la fase actual del plan de desarrollo.";
    expect(
      await participaciones.cambiarEstadoApi("IRI-2026-0045", "RECHAZADA", {
        motivo: "FUERA_DE_ALCANCE",
        texto,
        comentario: "se ignora",
      }),
    ).toBe("OK");
    expect(llamadas[0]!.url).toBe(`${API}/admin/participations/IRI-2026-0045/transitions`);
    expect(JSON.parse(String(llamadas[0]!.init.body))).toEqual({
      estado: "RECHAZADA",
      motivoCodigo: "FUERA_DE_ALCANCE",
      comentario: texto,
    });
    const otro = () => participaciones.cambiarEstadoApi("IRI-2026-0045", "PUBLICADA");
    expect(await otro()).toBe("TRANSICION_INVALIDA");
    expect(await otro()).toBe("SIN_MOTIVO");
    expect(await otro()).toBe("TEXTO_CORTO");
    expect(await otro()).toBe("SIN_PERMISO");
  });

  it("notas, URL firmada y CSV crudo", async () => {
    const llamadas = simularFetch(
      { status: 201, cuerpo: { id: "n1" } },
      { status: 422, cuerpo: { code: "NOTA_VACIA", message: "x" } },
      { cuerpo: { url: "https://storage.ejemplo.test/a.jpg?firma", expiraEl: "x" } },
      { cuerpo: { url: "https://storage.ejemplo.test/cedula.pdf?firma", expiraEl: "x" } },
    );
    expect(await participaciones.agregarNotaApi("IRI-2026-0045", "  Llamar al autor  ")).toBe("OK");
    expect(JSON.parse(String(llamadas[0]!.init.body))).toEqual({ texto: "Llamar al autor" });
    expect(await participaciones.agregarNotaApi("IRI-2026-0045", "x")).toBe("NOTA_VACIA");
    expect(await participaciones.agregarNotaApi("IRI-2026-0045", "   ")).toBe("NOTA_VACIA");
    const foto = await participaciones.urlArchivoApi("IRI-2026-0045", "f1", "adjunto");
    expect(foto).toEqual({ estado: "OK", url: "https://storage.ejemplo.test/a.jpg?firma" });
    await participaciones.urlArchivoApi("IRI-2026-0045", "d1", "documento");
    expect(llamadas[2]!.url).toBe(`${API}/admin/participations/IRI-2026-0045/files/f1/url`);
    expect(llamadas[3]!.url).toBe(`${API}/admin/participations/IRI-2026-0045/documents/d1/url`);

    const csv = '\uFEFF"Folio";"Tipo"\r\n';
    vi.stubGlobal("fetch", async () => new Response(csv, { status: 200 }));
    expect(await participaciones.exportarCsvApi({ tipo: "OPINION_GENERAL" })).toEqual({
      estado: "OK",
      csv,
    });
  });
});

describe("Acceso del personal contra la API (R13)", () => {
  it("traduce los estados de la invitación y acepta con la sesión", async () => {
    const llamadas = simularFetch(
      {
        cuerpo: {
          estado: "VALIDA",
          email: "nuevo@iribarren.test",
          roles: ["REVISOR"],
          alcaldia: { codigo: "iribarren", nombre: "Alcaldía de Iribarren" },
        },
      },
      { cuerpo: { estado: "REEMPLAZADA", alcaldia: { codigo: "x", nombre: "y" } } },
      { cuerpo: { accessToken: "a", refreshToken: "r", expiresIn: 900, user: { id: "u" } } },
      {
        status: 409,
        cuerpo: { code: "IDENTITY_CONFLICT", message: "x", details: { field: "cedula" } },
      },
      { status: 400, cuerpo: { code: "INVALID_TOKEN", message: "x" } },
    );
    expect(await acceso.verInvitacionApi("t1")).toMatchObject({
      estado: "OK",
      correo: "nuevo@iribarren.test",
      roles: ["REVISOR"],
      alcaldia: "Alcaldía de Iribarren",
    });
    expect((await acceso.verInvitacionApi("t2")).estado).toBe("REEMPLAZADA");
    expect((await acceso.verInvitacionApi("")).estado).toBe("INVALIDO");
    const datos = {
      cedula: "V-12345678",
      nombres: "Ana",
      apellidos: "Pérez",
      contrasena: "Una-clave-larga1",
    };
    expect((await acceso.aceptarInvitacionApi("t1", datos)).estado).toBe("OK");
    expect(JSON.parse(String(llamadas[2]!.init.body))).toEqual({
      token: "t1",
      cedula: "V-12345678",
      nombres: "Ana",
      apellidos: "Pérez",
      password: "Una-clave-larga1",
    });
    expect(new Headers(llamadas[2]!.init.headers).has("x-client-id")).toBe(false);
    expect((await acceso.aceptarInvitacionApi("t1", datos)).estado).toBe("CEDULA_EN_USO");
    expect((await acceso.aceptarInvitacionApi("t1", datos)).estado).toBe("INVALIDA");
  });

  it("restablecer dice por qué el enlace no sirve", async () => {
    simularFetch(
      { cuerpo: { estado: "VENCIDO" } },
      { status: 204 },
      {
        status: 400,
        cuerpo: { code: "INVALID_TOKEN", message: "x", details: { estado: "USADO" } },
      },
    );
    expect(await acceso.estadoRestablecerApi("t")).toBe("VENCIDO");
    expect(await acceso.restablecerApi("t", "Una-clave-larga1")).toBe("OK");
    expect(await acceso.restablecerApi("t", "Una-clave-larga1")).toBe("USADO");
  });
});

describe("Equipo contra la API (R13)", () => {
  it("lista con INACTIVO como DESACTIVADO y la invitación pendiente", async () => {
    const llamadas = simularFetch({
      cuerpo: {
        data: [
          {
            id: "m1",
            nombre: "Luis Pérez",
            correo: "luis@iribarren.test",
            roles: ["OPERADOR"],
            estado: "INACTIVO",
            ultimoAcceso: "2026-10-28T12:00:00.000Z",
            esYo: false,
          },
          {
            id: "m2",
            nombre: null,
            correo: "nueva@iribarren.test",
            roles: ["REVISOR"],
            estado: "INVITADO",
            ultimoAcceso: null,
            esYo: false,
            invitacion: { id: "inv-9", expiraEl: "x", vencida: true },
          },
        ],
        meta: { page: 1, totalPages: 1, conteos: { INVITADO: 1, ACTIVO: 3, INACTIVO: 1 } },
      },
    });
    const r = await equipo.listarEquipoApi({ estado: "DESACTIVADO", q: "luis" });
    expect(new URL(llamadas[0]!.url).searchParams.get("estado")).toBe("INACTIVO");
    if (r.estado !== "OK") throw new Error(r.estado);
    expect(r.miembros[0]).toMatchObject({
      estado: "DESACTIVADO",
      ultimoAcceso: "2026-10-28T12:00:00.000Z",
    });
    expect(r.miembros[1]).toMatchObject({
      nombre: "nueva@iribarren.test",
      invitacionId: "inv-9",
      invitacionVencida: true,
    });
    expect(r.conteos).toEqual({ ACTIVO: 3, INVITADO: 1, DESACTIVADO: 1 });
  });

  it("reenvía con el id de la invitación y traduce los errores", async () => {
    const llamadas = simularFetch(
      { status: 204 },
      { status: 409, cuerpo: { code: "YA_ES_MIEMBRO", message: "x" } },
      {
        status: 409,
        cuerpo: { code: "IDENTITY_CONFLICT", message: "x", details: { field: "email" } },
      },
      { status: 403, cuerpo: { code: "A_TI_MISMO", message: "x" } },
      { status: 403, cuerpo: { code: "ES_ADMIN", message: "x" } },
      { status: 400, cuerpo: { code: "VALIDATION_ERROR", message: "x" } },
    );
    expect((await equipo.reenviarInvitacionApi("inv-9")).estado).toBe("OK");
    expect(llamadas[0]!.url).toBe(`${API}/admin/staff/invitations/inv-9/resend`);
    expect((await equipo.invitarApi("a@b.test", ["REVISOR"])).estado).toBe("YA_ES_MIEMBRO");
    expect((await equipo.invitarApi("a@b.test", ["REVISOR"])).estado).toBe("ES_CIUDADANO");
    expect((await equipo.activarApi("m1", false)).estado).toBe("A_TI_MISMO");
    expect((await equipo.rolesApi("m1", ["REVISOR"])).estado).toBe("ES_ADMIN");
    expect((await equipo.rolesApi("m1", [])).estado).toBe("SIN_ROLES");
    expect(JSON.parse(String(llamadas[3]!.init.body))).toEqual({ activo: false });
    expect(llamadas[3]!.init.method).toBe("PATCH");
  });
});

describe("Ciudadanos contra la API (R13)", () => {
  const FILA = {
    id: "c1",
    tipo: "NATURAL",
    nombre: "Ana Pérez",
    correo: "ana@ejemplo.com",
    documento: "V-14.***.890",
    perfilEstado: "INCOMPLETO",
    cuenta: { estado: "ACTIVA", desde: "2026-10-01T00:00:00.000Z" },
    bajaSolicitadaEl: "2026-10-28T00:00:00.000Z",
    registradoEl: "2026-10-01T00:00:00.000Z",
  };

  it("lista con cuenta en vez de membresía y cuenta las bajas pedidas", async () => {
    const llamadas = simularFetch(
      {
        cuerpo: {
          data: [FILA],
          meta: { page: 1, total: 1, totalPages: 1, conteos: { ACTIVA: 1, SUSPENDIDA: 0 } },
        },
      },
      { cuerpo: { data: [FILA], meta: { page: 1, total: 4, totalPages: 4, conteos: {} } } },
    );
    const r = await ciudadanos.listarCiudadanosApi({ membresia: "ACTIVA", orden: "nombre" });
    const q = new URL(llamadas[0]!.url).searchParams;
    expect(q.get("cuenta")).toBe("ACTIVA");
    expect(q.get("sort")).toBe("nombre");
    expect(q.has("membresia")).toBe(false);
    if (r.estado !== "OK") throw new Error(r.estado);
    expect(r.bajas).toBe(4);
    expect(r.items[0]).toMatchObject({
      perfilCompleto: false,
      membresia: { estado: "ACTIVA" },
      documento: "V-14.***.890",
      bajaSolicitadaEl: FILA.bajaSolicitadaEl,
    });
    // Sin `documentosEstado` (la API aún no lo da) no se informa; con él, se traduce (R18).
    expect(r.items[0]).not.toHaveProperty("documentosCompletos");
    expect(
      ciudadanos.ciudadanoDeApi({ ...FILA, documentosEstado: "PENDIENTE" } as never)
        .documentosCompletos,
    ).toBe(false);
  });

  it("suspende con motivo, reactiva sin él y anonimiza solo con la baja pedida", async () => {
    const llamadas = simularFetch(
      { cuerpo: {} },
      { cuerpo: {} },
      { status: 400, cuerpo: { code: "VALIDATION_ERROR", message: "x" } },
      { status: 422, cuerpo: { code: "INVALID_TRANSITION", message: "x" } },
      { cuerpo: {} },
      { cuerpo: { url: "https://storage.ejemplo.test/cedula.pdf?firma", expiraEl: "x" } },
    );
    expect(
      (await ciudadanos.cuentaApi("c1", "SUSPENDIDA", " Uso indebido del portal ")).estado,
    ).toBe("OK");
    expect(JSON.parse(String(llamadas[0]!.init.body))).toEqual({
      estado: "SUSPENDIDA",
      motivo: "Uso indebido del portal",
    });
    await ciudadanos.cuentaApi("c1", "ACTIVA", "");
    expect(JSON.parse(String(llamadas[1]!.init.body))).toEqual({ estado: "ACTIVA" });
    expect((await ciudadanos.cuentaApi("c1", "SUSPENDIDA", "x")).estado).toBe("SIN_MOTIVO");
    expect((await ciudadanos.anonimizarApi("c1")).estado).toBe("SIN_BAJA");
    expect((await ciudadanos.anonimizarApi("c1")).estado).toBe("OK");
    expect(llamadas[4]!.url).toBe(`${API}/admin/citizens/c1/deletion`);
    expect(JSON.parse(String(llamadas[4]!.init.body))).toEqual({ accion: "ANONIMIZAR" });
    expect(await ciudadanos.urlDocumentoCiudadanoApi("c1", "d1")).toEqual({
      estado: "OK",
      url: "https://storage.ejemplo.test/cedula.pdf?firma",
    });
    expect(llamadas[5]!.url).toBe(`${API}/admin/citizens/c1/documents/d1/url`);
  });

  it("el CSV conserva el BOM", async () => {
    vi.stubGlobal("fetch", async () => new Response("Nombre;Tipo\r\n", { status: 200 }));
    const r = await ciudadanos.exportarCiudadanosApi({});
    expect(r.estado === "OK" && r.csv.startsWith("\uFEFF")).toBe(true);
  });
});

describe("Bitácora contra la API (R13)", () => {
  it("lista con las opciones de los filtros y verifica la cadena", async () => {
    const llamadas = simularFetch(
      {
        cuerpo: {
          data: [
            {
              id: "e1",
              seq: 41,
              fecha: "2026-10-29T12:00:00.000Z",
              actor: null,
              accion: "LOGIN_SUCCESS",
              accionNombre: "Inicio de sesión",
              entidad: "users",
              entidadId: "u1",
              hashPrevio: "a",
              hash: "b",
            },
          ],
          meta: { page: 1, total: 1, totalPages: 1 },
        },
      },
      { cuerpo: { data: [{ codigo: "LOGIN_SUCCESS", nombre: "Inicio de sesión", eventos: 3 }] } },
      { cuerpo: { data: [{ id: "u1", nombre: "María", roles: ["REVISOR"] }] } },
      { cuerpo: { ok: false, revisados: 41, primerAlterado: "e1", primerAlteradoSeq: 41 } },
      { status: 400, cuerpo: { code: "VALIDATION_ERROR", message: "x" } },
    );
    const r = await bitacora.listarBitacoraApi({ entidad: "users", desde: "2026-10-01" });
    expect(new URL(llamadas[0]!.url).searchParams.get("entidad")).toBe("users");
    if (r.estado !== "OK") throw new Error(r.estado);
    expect(r.eventos[0]!.accionNombre).toBe("Inicio de sesión");
    expect(r.acciones[0]!.codigo).toBe("LOGIN_SUCCESS");
    expect(r.actores[0]!.nombre).toBe("María");
    expect(await bitacora.verificarBitacoraApi()).toMatchObject({
      estado: "OK",
      ok: false,
      primerAlteradoSeq: 41,
    });
    expect(llamadas[3]!.init.method).toBe("POST");
    simularFetch({ status: 400, cuerpo: { code: "VALIDATION_ERROR", message: "x" } });
    expect((await bitacora.listarBitacoraApi({ actor: "no-es-uuid" })).estado).toBe(
      "FILTRO_INVALIDO",
    );
  });
});

describe("Métricas del Tablero contra la API (R14)", () => {
  const CONTENIDO = {
    alcance: { vistas: 9, likes: 2, dislikes: 0 },
    serieVistas: [],
    masVistas: [{ nombre: "Una noticia", valor: 9, href: "n-1" }],
    masValoradas: [{ nombre: "Una noticia", valor: 2, href: "n-1" }],
    porFormato: [],
    publicadasEnRango: 1,
    descargas: 3,
    masDescargados: [{ nombre: "Gaceta", valor: 3, href: "d-1" }],
  };

  it("pide la sección con su rango y arma las rutas del panel", async () => {
    const llamadas = simularFetch(
      { cuerpo: CONTENIDO },
      { cuerpo: [{ nombre: "María Fernández", valor: 4 }] },
    );
    const c = await metricas.metricasApi("contenido", "7d");
    expect(llamadas[0]!.url).toBe(`${API}/admin/metrics/content?rango=7d`);
    expect(c.masVistas[0]!.href).toBe("/contenido/noticias/editar?id=n-1");
    expect(c.masDescargados[0]!.href).toBe("/contenido/documentos/editar?id=d-1");
    const equipo = await metricas.metricasApi("equipo", "anio");
    expect(llamadas[1]!.url).toBe(`${API}/admin/metrics/team?rango=anio`);
    expect(equipo).toEqual([{ nombre: "María Fernández", valor: 4 }]);
  });

  it("solo pide lo que permiten los permisos; si una sección falla, avisa", async () => {
    const llamadas: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      llamadas.push(url);
      if (url.includes("/citizens")) return new Response(null, { status: 503 });
      if (url.includes("/participation"))
        return new Response(
          JSON.stringify({
            masReacciones: [{ nombre: "IRI-2026-0001", valor: 1, href: "IRI-2026-0001" }],
          }),
          { status: 200 },
        );
      return new Response(JSON.stringify(CONTENIDO), { status: 200 });
    });
    const r = await indicadoresApi(
      new Set(["metricas.participacion", "metricas.ciudadania"]),
      "30d",
    );
    expect(llamadas.some((u) => u.includes("/content") || u.includes("/team"))).toBe(false);
    expect(r.participacion?.masReacciones[0]!.href).toBe("/participaciones/IRI-2026-0001");
    expect(r.ciudadania).toBeUndefined();
    expect(r.incompletas).toBe(true);
    expect(r.simulado).toBeUndefined();
  });

  it("el CSV conserva el BOM", async () => {
    vi.stubGlobal(
      "fetch",
      async () => new Response("Sección;Indicador;Valor\r\n", { status: 200 }),
    );
    const r = await metricas.exportarMetricasApi("90d");
    expect(r.estado === "OK" && r.csv.startsWith("\uFEFF")).toBe(true);
  });
});

describe("Catálogos contra la API (R16)", () => {
  it("lee los usos de cada valor", async () => {
    simularFetch(
      ...Array.from({ length: 6 }, () => ({
        cuerpo: {
          data: [{ id: "p1", valor: "Catedral", codigo: null, orden: 1, activo: true, usos: 7 }],
        },
      })),
    );
    const c = await catalogos.catalogosApi();
    expect(c!.parroquias[0]).toEqual({ id: "p1", nombre: "Catedral", activo: true, usos: 7 });
  });

  it("el repetido dice cuál existe y el orden cambiado se informa", async () => {
    simularFetch(
      {
        status: 409,
        cuerpo: {
          code: "CATALOGO_REPETIDO",
          message: "x",
          details: { id: "p9", valor: "El Cují", activo: false },
        },
      },
      { cuerpo: { data: [{ id: "a" }, { id: "b" }] } },
      { status: 422, cuerpo: { code: "ORDEN_INVALIDO", message: "x" } },
    );
    expect(await catalogos.guardarItemApi("parroquias", "el cuji")).toEqual({
      estado: "REPETIDO",
      existente: { id: "p9", nombre: "El Cují", activo: false },
    });
    expect(await catalogos.moverItemApi("parroquias", "a", 1)).toEqual({
      estado: "ORDEN_INVALIDO",
    });
  });

  it("un enlace de botón inválido en el borrador marca el campo", async () => {
    simularFetch({
      status: 400,
      cuerpo: {
        code: "VALIDATION_ERROR",
        message: "x",
        details: ["boton.Escribe un enlace que empiece por https:// o por /."],
      },
    });
    const r = await noticias.guardarNoticiaApi("n-1", {
      ...NOTICIA,
      boton: { texto: "Ver", href: "www.algo" },
    } as unknown as Parameters<typeof noticias.guardarNoticiaApi>[1]);
    expect(r).toMatchObject({ estado: "INCOMPLETA", errores: { boton: expect.any(String) } });
  });
});
