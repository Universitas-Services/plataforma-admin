import { describe, expect, it } from "vitest";
import { CONTRASENA_DEMO, almacenDemo } from "./fixtures";
import {
  agregarNota,
  bandeja,
  cambiarEstado,
  conteosParticipaciones,
  csvBandeja,
  resumenParticipaciones,
  transicionesValidas,
} from "./participaciones";
import { iniciarSesion } from "./servicio";

function sesionDe(correo: string) {
  const alm = almacenDemo();
  const r = iniciarSesion(alm, correo, CONTRASENA_DEMO);
  if (r.estado !== "OK") throw new Error(`No se pudo entrar con ${correo}`);
  return { alm, s: r.sesion };
}

const TEXTO = "La definición de alturas corresponde a la Fase III del plan.";

describe("bandeja del Revisor", () => {
  it("cuenta por estado y pone por atender primero, de la más antigua", () => {
    const { alm } = sesionDe("revisor@iribarren.test");
    const c = conteosParticipaciones(alm, "iribarren");
    expect(c.PENDIENTE + c.EN_REVISION).toBe(resumenParticipaciones(alm, "iribarren").cola.length);
    const lista = bandeja(alm, "iribarren");
    expect(lista[0]!.folio).toBe("IRI-2026-0031");
    expect(lista.every((p) => p.alcaldiaId === "iribarren")).toBe(true);
  });

  it("busca por folio, autor o cédula, sin importar tildes", () => {
    const { alm } = sesionDe("revisor@iribarren.test");
    expect(bandeja(alm, "iribarren", { q: "0042" }).map((p) => p.folio)).toEqual(["IRI-2026-0042"]);
    expect(bandeja(alm, "iribarren", { q: "jose rodriguez" })).toHaveLength(1);
    expect(bandeja(alm, "iribarren", { q: "14.567.890" })).toHaveLength(1);
    expect(bandeja(alm, "iribarren", { estado: "PUBLICADA" })).toHaveLength(1);
  });
});

describe("máquina de estados", () => {
  it("solo ofrece las transiciones válidas", () => {
    const { alm } = sesionDe("revisor@iribarren.test");
    const p = (f: string) => alm.participaciones.get(f)!;
    expect(transicionesValidas(p("IRI-2026-0031"))).toEqual([
      "EN_REVISION",
      "APROBADA",
      "RECHAZADA",
    ]);
    expect(transicionesValidas(p("IRI-2026-0042"))).toEqual(["APROBADA", "RECHAZADA"]);
    expect(transicionesValidas(p("IRI-2026-0012"))).toEqual([]);
  });

  it("recorre pendiente → en revisión → aprobada → publicada y lo anota en la bitácora", () => {
    const { alm, s } = sesionDe("revisor@iribarren.test");
    const antes = alm.bitacora.length;
    expect(cambiarEstado(alm, s, "IRI-2026-0031", "PUBLICADA")).toBe("TRANSICION_INVALIDA");
    expect(cambiarEstado(alm, s, "IRI-2026-0031", "EN_REVISION")).toBe("OK");
    expect(cambiarEstado(alm, s, "IRI-2026-0031", "APROBADA", { comentario: "Bien" })).toBe("OK");
    expect(cambiarEstado(alm, s, "IRI-2026-0031", "PUBLICADA")).toBe("OK");
    const p = alm.participaciones.get("IRI-2026-0031")!;
    expect(p.estado).toBe("PUBLICADA");
    expect(p.historial.map((h) => h.estado)).toEqual([
      "PENDIENTE",
      "EN_REVISION",
      "APROBADA",
      "PUBLICADA",
    ]);
    expect(alm.bitacora.length).toBe(antes + 3);
  });

  it("rechazar exige motivo de catálogo y un texto de 20 caracteres o más", () => {
    const { alm, s } = sesionDe("revisor@iribarren.test");
    const f = "IRI-2026-0042";
    expect(cambiarEstado(alm, s, f, "RECHAZADA", { texto: TEXTO })).toBe("SIN_MOTIVO");
    expect(cambiarEstado(alm, s, f, "RECHAZADA", { motivo: "INVENTADO", texto: TEXTO })).toBe(
      "SIN_MOTIVO",
    );
    expect(cambiarEstado(alm, s, f, "RECHAZADA", { motivo: "OTRO", texto: "corto" })).toBe(
      "TEXTO_CORTO",
    );
    expect(
      cambiarEstado(alm, s, f, "RECHAZADA", { motivo: "FUERA_DE_ALCANCE", texto: TEXTO }),
    ).toBe("OK");
    expect(alm.participaciones.get(f)!.historial.at(-1)).toMatchObject({
      motivo: "FUERA_DE_ALCANCE",
      comentario: TEXTO,
    });
  });

  it("no publica si el autor no autorizó mostrar su nombre", () => {
    const { alm, s } = sesionDe("revisor@iribarren.test");
    expect(cambiarEstado(alm, s, "IRI-2026-0018", "PUBLICADA")).toBe("SIN_AUTORIZACION_NOMBRE");
  });
});

describe("permisos y notas", () => {
  it("el Operador no evalúa y nadie ve aportes de otra alcaldía", () => {
    const op = sesionDe("operador@iribarren.test");
    expect(cambiarEstado(op.alm, op.s, "IRI-2026-0031", "EN_REVISION")).toBe("SIN_PERMISO");
    const rev = sesionDe("revisor@iribarren.test");
    expect(cambiarEstado(rev.alm, rev.s, "JIM-2026-0004", "EN_REVISION")).toBe("NO_EXISTE");
  });

  it("verifica directo desde pendiente y agrega notas internas", () => {
    const { alm, s } = sesionDe("revisor@iribarren.test");
    expect(cambiarEstado(alm, s, "IRI-2026-0033", "APROBADA")).toBe("OK");
    expect(alm.participaciones.get("IRI-2026-0033")!.estado).toBe("APROBADA");
    expect(agregarNota(alm, s, "IRI-2026-0031", "   ")).toBe("NOTA_VACIA");
    expect(agregarNota(alm, s, "IRI-2026-0031", "Revisar con movilidad")).toBe("OK");
    expect(alm.participaciones.get("IRI-2026-0031")!.notas).toHaveLength(1);
  });

  it("exporta CSV con BOM y separador «;»", () => {
    const { alm } = sesionDe("revisor@iribarren.test");
    const csv = csvBandeja(bandeja(alm, "iribarren", { q: "0031" }));
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"IRI-2026-0031";"Propuesta formal"');
  });
});
