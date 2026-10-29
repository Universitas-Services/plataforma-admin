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
const noticias = await import("./noticias");
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
