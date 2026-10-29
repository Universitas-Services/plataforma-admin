import { describe, expect, it } from "vitest";
import { CONTRASENA_DEMO, almacenDemo } from "./fixtures";
import { iniciarSesion } from "./servicio";
import { historialTexto, publicarTexto, textosLegalesDe } from "./textos-legales";

const entrar = (alm: ReturnType<typeof almacenDemo>, correo = "admin@iribarren.test") => {
  const r = iniciarSesion(alm, correo, CONTRASENA_DEMO);
  if (r.estado !== "OK") throw new Error(`No entró ${correo}`);
  return r.sesion;
};

describe("Textos legales del portal (R15)", () => {
  it("parten de la versión 1 provisional de cada texto", () => {
    const alm = almacenDemo();
    const r = textosLegalesDe(alm, entrar(alm));
    if (r.estado !== "OK") throw new Error(r.estado);
    expect(r.textos.TERMINOS.vigente?.version).toBe(1);
    expect(r.textos.POLITICA_DATOS.vigente?.version).toBe(1);
    expect(r.textos.TERMINOS.vigente?.html).toContain("Contenido provisional");
  });

  it("publicar crea la versión siguiente, sin imágenes, y queda en la bitácora", () => {
    const alm = almacenDemo();
    const s = entrar(alm);
    const r = publicarTexto(alm, s, "TERMINOS", {
      html: '<h2>Uso del portal</h2><p>Texto nuevo.</p><img src="/x.png" alt="x"><script>x</script>',
      nota: "Se agrega la sección de uso del portal.",
    });
    if (r.estado !== "OK") throw new Error(r.estado);
    expect(r.version.version).toBe(2);
    expect(r.version.html).not.toContain("<img");
    expect(r.version.html).not.toContain("script");
    expect(r.version.autor).not.toBe("");
    const h = historialTexto(alm, s, "TERMINOS");
    if (h.estado !== "OK") throw new Error(h.estado);
    expect(h.versiones.map((v) => v.version)).toEqual([2, 1]);
    expect(alm.bitacora.at(-1)).toMatchObject({
      accion: "TEXTO_LEGAL_PUBLICADO",
      entidad: "texto-legal:TERMINOS",
      antes: { version: 1 },
    });
    // La política no cambia.
    const t = textosLegalesDe(alm, s);
    if (t.estado !== "OK") throw new Error(t.estado);
    expect(t.textos.POLITICA_DATOS.vigente?.version).toBe(1);
  });

  it("exige texto y nota, y no publica si nada cambió", () => {
    const alm = almacenDemo();
    const s = entrar(alm);
    expect(publicarTexto(alm, s, "TERMINOS", { html: "<p> </p>", nota: "x" }).estado).toBe("VACIO");
    expect(publicarTexto(alm, s, "TERMINOS", { html: "<p>Texto</p>", nota: "  " }).estado).toBe(
      "SIN_NOTA",
    );
    const vigente = historialTexto(alm, s, "TERMINOS");
    if (vigente.estado !== "OK") throw new Error(vigente.estado);
    expect(
      publicarTexto(alm, s, "TERMINOS", { html: vigente.versiones[0]!.html, nota: "Igual" }).estado,
    ).toBe("SIN_CAMBIOS");
  });

  it("solo el Administrador los ve y los publica", () => {
    const alm = almacenDemo();
    for (const correo of ["operador@iribarren.test", "revisor@iribarren.test"]) {
      const s = entrar(alm, correo);
      expect(textosLegalesDe(alm, s).estado).toBe("SIN_PERMISO");
      expect(publicarTexto(alm, s, "TERMINOS", { html: "<p>Nuevo</p>", nota: "x" }).estado).toBe(
        "SIN_PERMISO",
      );
    }
    expect(textosLegalesDe(alm, undefined).estado).toBe("SIN_SESION");
  });
});
