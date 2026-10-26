import { describe, expect, it } from "vitest";
import { CONTRASENA_DEMO, almacenDemo } from "./fixtures";
import {
  agregarNota,
  bandeja,
  cambiarEstado,
  conteosParticipaciones,
  csvBandeja,
  resumenParticipaciones,
  tieneSeguimiento,
  transicionesValidas,
} from "./participaciones";
import { iniciarSesion } from "./servicio";
import { dentroDelMunicipio } from "@/lib/ubicacion";

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
    expect(lista[0]!.folio).toBe("IRI-2026-0018");
    expect(lista.every((p) => p.alcaldiaId === "iribarren")).toBe(true);
  });

  it("busca por folio, autor o cédula, sin importar tildes", () => {
    const { alm } = sesionDe("revisor@iribarren.test");
    expect(bandeja(alm, "iribarren", { q: "0042" }).map((p) => p.folio)).toEqual(["IRI-2026-0042"]);
    expect(bandeja(alm, "iribarren", { q: "jose rodriguez" })).toHaveLength(1);
    expect(bandeja(alm, "iribarren", { q: "14.567.890" })).toHaveLength(1);
    expect(bandeja(alm, "iribarren", { estado: "PUBLICADA" })).toHaveLength(2);
    expect(bandeja(alm, "iribarren", { tipo: "PROPUESTA_FORMAL" })).toHaveLength(5);
  });
});

describe("máquina de estados de la propuesta formal", () => {
  it("solo ofrece las transiciones válidas", () => {
    const { alm } = sesionDe("revisor@iribarren.test");
    const p = (f: string) => alm.participaciones.get(f)!;
    expect(transicionesValidas(p("IRI-2026-0031"))).toEqual([
      "EN_REVISION",
      "APROBADA",
      "RECHAZADA",
    ]);
    expect(transicionesValidas(p("IRI-2026-0021"))).toEqual(["PUBLICADA", "RECHAZADA"]);
    expect(transicionesValidas(p("IRI-2026-0015"))).toEqual(["APROBADA"]);
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
    const f = "IRI-2026-0040";
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

  it("las propuestas de ejemplo traen su ubicación dentro del municipio", () => {
    const { alm } = sesionDe("revisor@iribarren.test");
    const formales = [...alm.participaciones.values()].filter((p) => tieneSeguimiento(p.tipo));
    expect(formales.every((p) => p.ubicacion && dentroDelMunicipio(p.ubicacion))).toBe(true);
  });
});

describe("opiniones: sin seguimiento", () => {
  it("solo se publican o se despublican", () => {
    const { alm, s } = sesionDe("revisor@iribarren.test");
    const f = "IRI-2026-0042";
    expect(transicionesValidas(alm.participaciones.get(f)!)).toEqual(["PUBLICADA"]);
    for (const destino of ["EN_REVISION", "APROBADA", "RECHAZADA"] as const)
      expect(cambiarEstado(alm, s, f, destino, { motivo: "OTRO", texto: TEXTO })).toBe(
        "TRANSICION_INVALIDA",
      );
    expect(cambiarEstado(alm, s, f, "PUBLICADA")).toBe("OK");
    expect(transicionesValidas(alm.participaciones.get(f)!)).toEqual(["PENDIENTE"]);
    expect(cambiarEstado(alm, s, f, "PENDIENTE")).toBe("OK");
    expect(alm.participaciones.get(f)!.historial.map((h) => h.estado)).toEqual([
      "PENDIENTE",
      "PUBLICADA",
      "PENDIENTE",
    ]);
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
    expect(cambiarEstado(alm, s, "IRI-2026-0040", "APROBADA")).toBe("OK");
    expect(alm.participaciones.get("IRI-2026-0040")!.estado).toBe("APROBADA");
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
