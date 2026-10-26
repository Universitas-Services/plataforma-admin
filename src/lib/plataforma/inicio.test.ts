import { describe, expect, it } from "vitest";
import { cambiarEstadoNoticia } from "./contenido";
import { CONTRASENA_DEMO, almacenDemo } from "./fixtures";
import { MAX_ANUNCIOS, guardarInicio, inicioDe, totalesDe } from "./inicio";
import { iniciarSesion, verificarIntegridad } from "./servicio";

const entrar = (alm: ReturnType<typeof almacenDemo>, correo = "operador@iribarren.test") => {
  const r = iniciarSesion(alm, correo, CONTRASENA_DEMO);
  if (r.estado !== "OK") throw new Error(`No entró ${correo}`);
  return r.sesion;
};

const AHORA = Date.parse("2026-10-18T12:00:00-04:00");

describe("Inicio del portal", () => {
  it("muestra la selección de ejemplo y solo ofrece noticias publicadas", () => {
    const alm = almacenDemo();
    const r = inicioDe(alm, entrar(alm));
    if (r.estado !== "OK") throw new Error(r.estado);
    expect(r.mensajeAlcalde?.id).toBe("n-ejemplo-alcalde");
    expect(r.anuncios.map((n) => n.id)).toEqual(["n-ejemplo-mesas", "n-ejemplo-galeria"]);
    expect(r.candidatosMensaje.every((n) => n.formato === "TEXTO")).toBe(true);
    expect(r.candidatosAnuncios.every((n) => n.estado === "PUBLICADO")).toBe(true);
    expect(r.candidatosAnuncios.map((n) => n.id)).not.toContain("n-ejemplo-despublicada");
    expect(r.retiradas).toEqual([]);
  });

  it("el Revisor no edita el Inicio", () => {
    const alm = almacenDemo();
    const s = entrar(alm, "revisor@iribarren.test");
    expect(inicioDe(alm, s).estado).toBe("SIN_PERMISO");
    expect(guardarInicio(alm, s, { anuncios: [] }).estado).toBe("SIN_PERMISO");
    expect(inicioDe(alm, undefined).estado).toBe("SIN_SESION");
  });

  it("guarda el orden nuevo y lo deja en la bitácora", () => {
    const alm = almacenDemo();
    const s = entrar(alm);
    const r = guardarInicio(
      alm,
      s,
      { mensajeAlcalde: null, anuncios: ["n-ejemplo-video", "n-ejemplo-mesas"] },
      AHORA,
    );
    expect(r.estado).toBe("OK");
    expect(alm.inicio).toEqual({
      mensajeAlcalde: undefined,
      anuncios: ["n-ejemplo-video", "n-ejemplo-mesas"],
    });
    expect(alm.bitacora.at(-1)?.accion).toBe("INICIO_ACTUALIZADO");
    expect(verificarIntegridad(alm).ok).toBe(true);
  });

  it("rechaza lo que el portal no puede mostrar", () => {
    const alm = almacenDemo();
    const s = entrar(alm);
    const guardar = (mensajeAlcalde: string | null, anuncios: string[]) =>
      guardarInicio(alm, s, { mensajeAlcalde, anuncios }, AHORA).estado;
    expect(guardar("n-ejemplo-mesas", [])).toBe("NO_ES_TEXTO");
    expect(guardar("n-ejemplo-despublicada", [])).toBe("NO_PUBLICADA");
    expect(guardar(null, ["n-ejemplo-puntos"])).toBe("NO_PUBLICADA");
    expect(guardar(null, ["n-ejemplo-mesas", "n-ejemplo-mesas"])).toBe("REPETIDA");
    expect(
      guardar(
        null,
        Array.from({ length: MAX_ANUNCIOS + 1 }, (_, i) => `n-${i}`),
      ),
    ).toBe("DEMASIADAS");
    expect(alm.inicio.anuncios).toEqual(["n-ejemplo-mesas", "n-ejemplo-galeria"]);
  });

  it("si una noticia elegida se despublica, sale de la selección y se avisa", () => {
    const alm = almacenDemo();
    const s = entrar(alm);
    const titulo = alm.noticias.get("n-ejemplo-mesas")!.titulo;
    expect(cambiarEstadoNoticia(alm, s, "n-ejemplo-mesas", "despublicar", {}, AHORA).estado).toBe(
      "OK",
    );
    const r = inicioDe(alm, s);
    if (r.estado !== "OK") throw new Error(r.estado);
    expect(r.anuncios.map((n) => n.id)).toEqual(["n-ejemplo-galeria"]);
    expect(r.retiradas).toEqual([titulo]);
    // El aviso sale una sola vez: la selección ya quedó depurada.
    expect((inicioDe(alm, s) as { retiradas: string[] }).retiradas).toEqual([]);
  });

  it("suma vistas y reacciones de todos los días", () => {
    const alm = almacenDemo();
    alm.interacciones.set("noticia:x", {
      porDia: {
        "2026-10-01": { vistas: 10, likes: 2, dislikes: 1 },
        "2026-10-02": { vistas: 5, likes: 1, dislikes: 0 },
      },
    });
    expect(totalesDe(alm, "noticia:x")).toEqual({ vistas: 15, likes: 3, dislikes: 1 });
    expect(totalesDe(alm, "noticia:no-existe")).toEqual({ vistas: 0, likes: 0, dislikes: 0 });
  });
});
