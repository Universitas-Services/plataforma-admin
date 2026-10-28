import { describe, expect, it } from "vitest";
import type { Adjunto, CamposDocumento } from "@/lib/contenido/tipos";
import { siguienteVersion } from "@/lib/contenido/version";
import { guardarMedio } from "./contenido";
import {
  crearDocumento,
  eliminarDocumento,
  guardarDocumento,
  listarDocumentos,
  nuevaVersion,
} from "./documentos";
import { CONTRASENA_DEMO, almacenDemo } from "./fixtures";
import { iniciarSesion } from "./servicio";

const entrar = (alm: ReturnType<typeof almacenDemo>, correo = "operador@iribarren.test") => {
  const r = iniciarSesion(alm, correo, CONTRASENA_DEMO);
  if (r.estado !== "OK") throw new Error(`No entró ${correo}`);
  return r.sesion;
};

const AHORA = Date.parse("2026-10-18T12:00:00-04:00");
const PDF = new TextEncoder().encode("%PDF-1.7\n...");

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
    return { nombre: m.nombre, url: m.url, tipo: "application/pdf", pesoBytes: m.pesoBytes };
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
