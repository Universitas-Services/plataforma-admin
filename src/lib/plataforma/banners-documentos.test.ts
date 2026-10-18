import { describe, expect, it } from "vitest";
import type { Adjunto, CamposBanner, CamposDocumento } from "@/lib/contenido/tipos";
import { siguienteVersion } from "@/lib/contenido/version";
import {
  eliminarBanner,
  guardarBanner,
  listarBanners,
  ordenarBanners,
  vigenciaDe,
} from "./banners";
import { guardarMedio } from "./contenido";
import {
  crearDocumento,
  eliminarDocumento,
  guardarDocumento,
  listarDocumentos,
  nuevaVersion,
} from "./documentos";
import { CONTRASENA_DEMO, almacenDemo } from "./fixtures";
import { iniciarSesion, verificarIntegridad } from "./servicio";

const entrar = (alm: ReturnType<typeof almacenDemo>, correo = "operador@iribarren.test") => {
  const r = iniciarSesion(alm, correo, CONTRASENA_DEMO);
  if (r.estado !== "OK") throw new Error(`No entró ${correo}`);
  return r.sesion;
};

const AHORA = Date.parse("2026-10-18T12:00:00-04:00");
const PDF = new TextEncoder().encode("%PDF-1.7\n...");

const banner = (c: Partial<CamposBanner> = {}): CamposBanner => ({
  titulo: "Banner de prueba",
  texto: "Texto de prueba.",
  enlace: { href: "/participa", etiqueta: "Participar" },
  tono: "tinta",
  ...c,
});

describe("vigencia de los banners", () => {
  it("usa días completos en hora de Venezuela, ambos incluidos", () => {
    const v = { vigencia: { desde: "2026-10-18", hasta: "2026-10-18" } };
    expect(vigenciaDe(v, Date.parse("2026-10-18T00:00:00-04:00"))).toBe("VIGENTE");
    expect(vigenciaDe(v, Date.parse("2026-10-18T23:59:59-04:00"))).toBe("VIGENTE");
    expect(vigenciaDe(v, Date.parse("2026-10-17T23:59:59-04:00"))).toBe("FUTURO");
    expect(vigenciaDe(v, Date.parse("2026-10-19T00:00:00-04:00"))).toBe("VENCIDO");
    expect(vigenciaDe({}, AHORA)).toBe("VIGENTE");
  });
});

describe("banners", () => {
  it("el Revisor no gestiona banners", () => {
    const alm = almacenDemo();
    expect(listarBanners(alm, entrar(alm, "revisor@iribarren.test")).estado).toBe("SIN_PERMISO");
  });

  it("crea al final del carrusel y rechaza fechas invertidas", () => {
    const alm = almacenDemo();
    const s = entrar(alm);
    const r = guardarBanner(alm, s, undefined, banner(), AHORA);
    expect(r.estado === "OK" && r.banner.orden).toBe(5);
    const malo = guardarBanner(
      alm,
      s,
      undefined,
      banner({ vigencia: { desde: "2026-10-20", hasta: "2026-10-10" } }),
      AHORA,
    );
    expect(malo.estado).toBe("FECHAS");
  });

  it("ordena con la lista completa y rechaza una incompleta", () => {
    const alm = almacenDemo();
    const s = entrar(alm);
    const r = listarBanners(alm, s, undefined, AHORA);
    if (r.estado !== "OK") throw new Error();
    const ids = r.items.map((b) => b.id);
    expect(ordenarBanners(alm, s, ids.slice(1), AHORA).estado).toBe("LISTA_INVALIDA");
    expect(ordenarBanners(alm, s, [...ids].reverse(), AHORA).estado).toBe("OK");
    const despues = listarBanners(alm, s, undefined, AHORA);
    expect(despues.estado === "OK" && despues.items.map((b) => b.id)).toEqual([...ids].reverse());
    expect(alm.bitacora.at(-1)?.accion).toBe("BANNERS_ORDENADOS");
  });

  it("filtra por vigencia y elimina (borrado lógico)", () => {
    const alm = almacenDemo();
    const s = entrar(alm);
    const r = listarBanners(alm, s, "VENCIDO", AHORA);
    expect(r.estado === "OK" && r.items.map((b) => b.id)).toEqual(["b-ejemplo-vencido"]);
    expect(eliminarBanner(alm, s, "b-ejemplo-vencido", AHORA).estado).toBe("OK");
    const despues = listarBanners(alm, s, undefined, AHORA);
    expect(despues.estado === "OK" && despues.total).toBe(3);
    expect(verificarIntegridad(alm).ok).toBe(true);
  });

  it("no acepta una foto de otra alcaldía", () => {
    const alm = almacenDemo();
    const s = entrar(alm);
    const r = guardarBanner(
      alm,
      s,
      undefined,
      banner({ imagen: { src: "/medios/ajeno", alt: "x", ancho: 10, alto: 10 } }),
      AHORA,
    );
    expect(r.estado).toBe("MEDIO_AJENO");
  });
});

describe("documentos", () => {
  const ficha: CamposDocumento = {
    titulo: "Informe de prueba",
    descripcion: "Descripción de prueba.",
    categoria: "Informes técnicos",
    estado: "BORRADOR",
    publico: true,
  };

  function subirPdf(alm: ReturnType<typeof almacenDemo>, s: string): Adjunto {
    const m = guardarMedio(alm, s, "pdf", "informe.pdf", PDF, AHORA);
    if (m.estado !== "OK") throw new Error(m.estado);
    return { nombre: m.nombre, url: m.url, tipo: "application/pdf", pesoBytes: m.peso };
  }

  it("calcula la versión siguiente", () => {
    expect(siguienteVersion("1.0", "menor")).toBe("1.1");
    expect(siguienteVersion("2.9", "menor")).toBe("2.10");
    expect(siguienteVersion("2.9", "mayor")).toBe("3.0");
  });

  it("crea con la versión 1.0 y sube versiones con historial", () => {
    const alm = almacenDemo();
    const s = entrar(alm);
    const r = crearDocumento(alm, s, ficha, subirPdf(alm, s), AHORA);
    if (r.estado !== "OK") throw new Error(r.estado);
    expect(r.documento.version).toBe("1.0");
    expect(r.documento.slug).toBe("informe-de-prueba");
    const v = nuevaVersion(
      alm,
      s,
      r.documento.id,
      subirPdf(alm, s),
      "Se corrigió el anexo.",
      "menor",
      AHORA,
    );
    expect(v.estado === "OK" && v.documento.versiones.map((x) => x.version)).toEqual([
      "1.1",
      "1.0",
    ]);
    const m = nuevaVersion(
      alm,
      s,
      r.documento.id,
      subirPdf(alm, s),
      "Nueva estructura.",
      "mayor",
      AHORA,
    );
    expect(m.estado === "OK" && m.documento.version).toBe("2.0");
  });

  it("oficializar queda en la bitácora", () => {
    const alm = almacenDemo();
    const s = entrar(alm);
    guardarDocumento(alm, s, "d-ejemplo-plan", { ...ficha, estado: "OFICIAL" }, AHORA);
    expect(alm.bitacora.at(-1)?.accion).toBe("DOCUMENTO_OFICIALIZADO");
  });

  it("filtra por estado, visibilidad y texto; los conteos ignoran el estado", () => {
    const alm = almacenDemo();
    const s = entrar(alm);
    const ocultos = listarDocumentos(alm, s, { visibilidad: "oculto" });
    expect(ocultos.estado === "OK" && ocultos.items.map((d) => d.id)).toEqual(["d-ejemplo-minuta"]);
    const r = listarDocumentos(alm, s, { estado: "OFICIAL", q: "DECRETO" });
    if (r.estado !== "OK") throw new Error();
    expect(r.items.map((d) => d.id)).toEqual(["d-ejemplo-decreto"]);
    expect(r.conteos.BORRADOR).toBe(0);
  });

  it("no acepta un PDF ajeno y elimina con borrado lógico", () => {
    const alm = almacenDemo();
    const s = entrar(alm);
    const ajeno: Adjunto = {
      nombre: "x.pdf",
      url: "/medios/otro",
      tipo: "application/pdf",
      pesoBytes: 1,
    };
    expect(crearDocumento(alm, s, ficha, ajeno, AHORA).estado).toBe("MEDIO_AJENO");
    expect(eliminarDocumento(alm, s, "d-ejemplo-minuta", AHORA).estado).toBe("OK");
    const r = listarDocumentos(alm, s);
    expect(r.estado === "OK" && r.total).toBe(3);
  });
});
