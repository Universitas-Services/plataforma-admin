import { describe, expect, it } from "vitest";
import { almacenDemo } from "./fixtures";
import {
  csvMetricas,
  decisionesPorRevisor,
  metricasCiudadania,
  metricasContenido,
  metricasParticipacion,
  rangoDe,
  serie,
} from "./metricas";

const AHORA = Date.parse("2026-10-25T12:00:00-04:00");
const alm = () => almacenDemo(AHORA);

describe("rangos", () => {
  it("cuenta los días en hora de Venezuela, hoy incluido", () => {
    const r = rangoDe("7d", AHORA);
    expect(r.dias).toHaveLength(7);
    expect(r).toMatchObject({ desde: "2026-10-19", hasta: "2026-10-25" });
    expect(rangoDe("anio", AHORA).desde).toBe("2026-01-01");
    // 23:30 del 24 en Caracas ya es el 25 en UTC, pero sigue siendo el 24.
    expect(rangoDe("7d", Date.parse("2026-10-25T03:30:00Z")).hasta).toBe("2026-10-24");
  });

  it("agrupa por semana cuando el rango pasa de 31 días", () => {
    const corto = serie(rangoDe("30d", AHORA), () => 1);
    expect(corto).toHaveLength(30);
    const largo = serie(rangoDe("90d", AHORA), () => 1);
    expect(largo).toHaveLength(13);
    expect(largo[0]).toMatchObject({ valor: 7 });
    expect(largo.reduce((s, p) => s + p.valor, 0)).toBe(90);
  });
});

describe("participación", () => {
  it("suma lo recibido en el rango y lo que espera hoy", () => {
    const a = alm();
    const m = metricasParticipacion(a, "iribarren", rangoDe("30d", AHORA), AHORA);
    const total = [...a.participaciones.values()].length;
    expect(m.recibidas).toBe(total);
    expect(m.porTipo.reduce((s, f) => s + f.valor, 0)).toBe(total);
    expect(m.serie.reduce((s, p) => s + p.valor, 0)).toBe(total);
    const { total: t, hasta2, de3a7, mas7 } = m.pendientes;
    expect(hasta2 + de3a7 + mas7).toBe(t);
    expect(t).toBeGreaterThan(0);
  });

  it("mide la decisión de las propuestas formales: tasa y días de respuesta", () => {
    const m = metricasParticipacion(alm(), "iribarren", rangoDe("30d", AHORA), AHORA);
    // Ejemplos: 0021 y 0015 verificadas, 0012 rechazada.
    expect(m.decisiones).toEqual({ aprobadas: 2, rechazadas: 1, tasaAprobacion: 2 / 3 });
    expect(m.diasRespuesta).toBe(5);
    expect(m.opiniones.publicadas).toBe(1);
  });

  it("un rango sin datos devuelve ceros, no errores", () => {
    const m = metricasParticipacion(alm(), "otra", rangoDe("7d", AHORA), AHORA);
    expect(m.recibidas).toBe(0);
    expect(m.decisiones.tasaAprobacion).toBeUndefined();
    expect(m.diasRespuesta).toBeUndefined();
  });
});

describe("contenido, ciudadanía y equipo", () => {
  it("las vistas de la serie cuadran con el total y los rankings van de mayor a menor", () => {
    const m = metricasContenido(alm(), "iribarren", rangoDe("30d", AHORA));
    expect(m.serieVistas.reduce((s, p) => s + p.valor, 0)).toBe(m.alcance.vistas);
    const v = m.masVistas.map((f) => f.valor);
    expect(v).toEqual([...v].sort((a, b) => b - a));
    expect(m.masVistas[0]?.href).toMatch(/^\/contenido\/noticias\//);
    expect(m.porFormato).toHaveLength(5);
    expect(m.descargas).toBeGreaterThan(0);
  });

  it("cuenta registros y perfiles completos", () => {
    const m = metricasCiudadania(alm(), "iribarren", rangoDe("90d", AHORA));
    expect(m.personas + m.organizaciones).toBe(m.total);
    expect(m.serie.reduce((s, p) => s + p.valor, 0)).toBe(m.nuevos);
    expect(m.perfilesCompletos).toBeGreaterThan(0);
  });

  it("atribuye las decisiones a quien las tomó", () => {
    const filas = decisionesPorRevisor(alm(), "iribarren", rangoDe("30d", AHORA));
    expect(filas.length).toBeGreaterThan(0);
    expect(filas.every((f) => f.valor > 0)).toBe(true);
  });

  it("exporta solo las secciones que recibe, en CSV para Excel", () => {
    const r = rangoDe("7d", AHORA);
    const csv = csvMetricas(r, { contenido: metricasContenido(alm(), "iribarren", r) });
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"Contenido";"Vistas de noticias"');
    expect(csv).not.toContain("Participación");
  });
});
