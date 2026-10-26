import { describe, expect, it } from "vitest";
import { cambiarEstadoNoticia } from "./contenido";
import { CONTRASENA_DEMO, almacenDemo } from "./fixtures";
import { guardarInicio, inicioDe, totalesDe } from "./inicio";
import { iniciarSesion, verificarIntegridad } from "./servicio";

const entrar = (alm: ReturnType<typeof almacenDemo>, correo = "operador@iribarren.test") => {
  const r = iniciarSesion(alm, correo, CONTRASENA_DEMO);
  if (r.estado !== "OK") throw new Error(`No entró ${correo}`);
  return r.sesion;
};

const AHORA = Date.parse("2026-10-18T12:00:00-04:00");

describe("Inicio del portal", () => {
  it("muestra el mensaje de ejemplo y solo ofrece noticias de texto publicadas", () => {
    const alm = almacenDemo();
    const r = inicioDe(alm, entrar(alm));
    if (r.estado !== "OK") throw new Error(r.estado);
    expect(r.mensajeAlcalde?.id).toBe("n-ejemplo-alcalde");
    expect(r.candidatosMensaje.every((n) => n.formato === "TEXTO")).toBe(true);
    expect(r.retiradas).toEqual([]);
  });

  it("el Revisor no edita el Inicio", () => {
    const alm = almacenDemo();
    const s = entrar(alm, "revisor@iribarren.test");
    expect(inicioDe(alm, s).estado).toBe("SIN_PERMISO");
    expect(guardarInicio(alm, s, { mensajeAlcalde: null }).estado).toBe("SIN_PERMISO");
    expect(inicioDe(alm, undefined).estado).toBe("SIN_SESION");
  });

  it("guarda el mensaje y lo deja en la bitácora", () => {
    const alm = almacenDemo();
    const s = entrar(alm);
    expect(guardarInicio(alm, s, { mensajeAlcalde: null }, AHORA).estado).toBe("OK");
    expect(alm.inicio).toEqual({ mensajeAlcalde: undefined });
    expect(alm.bitacora.at(-1)?.accion).toBe("INICIO_ACTUALIZADO");
    expect(verificarIntegridad(alm).ok).toBe(true);
  });

  it("rechaza un mensaje que no es de texto o no está publicado", () => {
    const alm = almacenDemo();
    const s = entrar(alm);
    const guardar = (mensajeAlcalde: string | null) =>
      guardarInicio(alm, s, { mensajeAlcalde }, AHORA).estado;
    expect(guardar("n-ejemplo-mesas")).toBe("NO_ES_TEXTO");
    expect(guardar("n-ejemplo-despublicada")).toBe("NO_PUBLICADA");
    expect(alm.inicio.mensajeAlcalde).toBe("n-ejemplo-alcalde");
  });

  it("si el mensaje elegido se despublica, sale de la selección y se avisa", () => {
    const alm = almacenDemo();
    const s = entrar(alm);
    const titulo = alm.noticias.get("n-ejemplo-alcalde")!.titulo;
    expect(cambiarEstadoNoticia(alm, s, "n-ejemplo-alcalde", "despublicar", {}, AHORA).estado).toBe(
      "OK",
    );
    const r = inicioDe(alm, s);
    if (r.estado !== "OK") throw new Error(r.estado);
    expect(r.mensajeAlcalde).toBeUndefined();
    expect(r.retiradas).toEqual([titulo]);
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
