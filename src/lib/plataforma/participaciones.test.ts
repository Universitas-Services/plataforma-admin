import { describe, expect, it } from "vitest";
import { CONTRASENA_DEMO, almacenDemo } from "./fixtures";
import {
  agregarNota,
  bandeja,
  cambiarEstado,
  conteosBandeja,
  conteosParticipaciones,
  csvBandeja,
  enmascararDocumento,
  resumenParticipaciones,
  tieneSeguimiento,
  transicionesValidas,
} from "./participaciones";
import { filtrosDeBandeja } from "./filtros-bandeja";
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

describe("bandeja como la API (R11)", () => {
  it("cada conteo aplica los demás filtros, pero no el suyo", () => {
    const { alm } = sesionDe("revisor@iribarren.test");
    const c = conteosBandeja(alm, "iribarren", { estado: "PUBLICADA", tipo: "PROPUESTA_FORMAL" });
    // Los chips de estado cuentan solo propuestas formales; los tipos, solo publicadas.
    expect(Object.values(c.estado).reduce((a, b) => a + b, 0)).toBe(
      bandeja(alm, "iribarren", { tipo: "PROPUESTA_FORMAL" }).length,
    );
    expect(Object.values(c.tipo).reduce((a, b) => a + b, 0)).toBe(
      bandeja(alm, "iribarren", { estado: "PUBLICADA" }).length,
    );
  });

  it("ordena por recientes o antiguas y filtra por fecha de recepción", () => {
    const { alm } = sesionDe("revisor@iribarren.test");
    const recientes = bandeja(alm, "iribarren", { orden: "recientes" });
    const antiguas = bandeja(alm, "iribarren", { orden: "antiguas" });
    expect(recientes.map((p) => p.folio)).toEqual(antiguas.map((p) => p.folio).reverse());
    const dia = recientes[0]!.recibidaEl.slice(0, 10);
    const futuro = "2999-01-01";
    expect(bandeja(alm, "iribarren", { desde: futuro })).toHaveLength(0);
    expect(bandeja(alm, "iribarren", { hasta: futuro }).length).toBe(recientes.length);
    expect(bandeja(alm, "iribarren", { desde: dia }).length).toBeGreaterThan(0);
  });

  it("lee los filtros de la URL sin aceptar valores inventados", () => {
    const r = filtrosDeBandeja({
      tipo: "constructor",
      orden: "toString",
      estado: "BORRADA",
      desde: "2026-10-30",
      hasta: "2026-10-01",
      pagina: "3",
    });
    expect(r.filtros).toMatchObject({ tipo: undefined, orden: undefined, estado: undefined });
    expect(r.filtros).toMatchObject({ desde: "2026-10-01", hasta: "2026-10-30" });
    expect(r.pagina).toBe(3);
    expect(r.qs).toBe("desde=2026-10-01&hasta=2026-10-30");
    expect(filtrosDeBandeja({ orden: "atender", desde: "31-10-2026" }).qs).toBe("");
  });

  it("enmascara la cédula o el RIF como la API", () => {
    expect(enmascararDocumento("V-14567890")).toBe("V-14.***.890");
    expect(enmascararDocumento("J-30123456-7")).toBe("J-30.***.456-7");
    expect(enmascararDocumento("raro")).toBe("***");
    expect(enmascararDocumento(undefined)).toBe("");
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

  it("publica aunque el autor no quiera mostrar su nombre", () => {
    const { alm, s } = sesionDe("revisor@iribarren.test");
    expect(alm.participaciones.get("IRI-2026-0018")!.mostrarNombre).toBe(false);
    expect(cambiarEstado(alm, s, "IRI-2026-0018", "PUBLICADA")).toBe("OK");
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
    // La cédula sale enmascarada: el archivo puede circular.
    const cedula = alm.participaciones.get("IRI-2026-0031")!.autor.cedula!;
    expect(csv).not.toContain(cedula);
    expect(csv).toContain(enmascararDocumento(cedula));
  });

  it("guarda quién decidió o anotó con su nombre", () => {
    const { alm, s } = sesionDe("revisor@iribarren.test");
    expect(cambiarEstado(alm, s, "IRI-2026-0040", "EN_REVISION")).toBe("OK");
    expect(agregarNota(alm, s, "IRI-2026-0040", "Ver con catastro")).toBe("OK");
    const p = alm.participaciones.get("IRI-2026-0040")!;
    expect(p.historial.at(-1)!.por).toEqual({ id: "u-revisor-iri", nombre: "María Fernández" });
    expect(p.notas.at(-1)!.por.nombre).toBe("María Fernández");
  });
});
