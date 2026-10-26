import { describe, expect, it } from "vitest";
import type { CamposBanner } from "@/lib/contenido/tipos";
import {
  eliminarBanner,
  guardarBanner,
  listarBanners,
  ordenarBanners,
  vigenciaDe,
} from "./banners";
import { CONTRASENA_DEMO, almacenDemo } from "./fixtures";
import { iniciarSesion, verificarIntegridad } from "./servicio";

const entrar = (alm: ReturnType<typeof almacenDemo>, correo = "operador@iribarren.test") => {
  const r = iniciarSesion(alm, correo, CONTRASENA_DEMO);
  if (r.estado !== "OK") throw new Error(`No entró ${correo}`);
  return r.sesion;
};

const AHORA = Date.parse("2026-10-18T12:00:00-04:00");

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
    // Las vigencias de ejemplo se calculan desde el día de la prueba.
    const alm = almacenDemo(AHORA);
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
