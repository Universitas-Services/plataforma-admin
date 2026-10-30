import { describe, expect, it } from "vitest";
import { CONTRASENA_DEMO, almacenDemo } from "./fixtures";
import { iniciarSesion } from "./servicio";
import {
  ACTORES_INICIAL,
  ENCABEZADO_INICIAL,
  SITIO_INICIAL,
  actoresDe,
  encabezadoDe,
  guardarActores,
  guardarEncabezado,
  guardarSitio,
  sitioDe,
  sitioSchema,
} from "./sitio";

/* Datos del sitio y encabezado del Inicio (R17), sobre la simulación. */

function sesionDe(correo: string) {
  const alm = almacenDemo();
  const r = iniciarSesion(alm, correo, CONTRASENA_DEMO);
  if (r.estado !== "OK") throw new Error(`No se pudo entrar con ${correo}`);
  return { alm, s: r.sesion };
}

describe("datos del sitio", () => {
  it("sin guardar, el portal usa los valores de hoy", () => {
    const alm = almacenDemo();
    expect(sitioDe(alm)).toBe(SITIO_INICIAL);
    expect(encabezadoDe(alm).fotos).toHaveLength(10);
    expect(actoresDe(alm)).toBe(ACTORES_INICIAL);
  });

  it("los valores de hoy pasan la validación (se pueden guardar sin cambios)", () => {
    expect(sitioSchema.safeParse(SITIO_INICIAL).success).toBe(true);
    const { alm, s } = sesionDe("admin@iribarren.test");
    expect(guardarEncabezado(alm, s, ENCABEZADO_INICIAL)).toEqual({ estado: "OK" });
    expect(guardarActores(alm, s, ACTORES_INICIAL)).toEqual({ estado: "OK" });
  });

  it("el Administrador guarda y queda en la bitácora; los errores van por campo", () => {
    const { alm, s } = sesionDe("admin@iribarren.test");
    const nuevo = {
      ...SITIO_INICIAL,
      contacto: { ...SITIO_INICIAL.contacto, correo: "planificacion@iribarren.gob.ve" },
    };
    expect(guardarSitio(alm, s, nuevo)).toEqual({ estado: "OK" });
    expect(sitioDe(alm).contacto.correo).toBe("planificacion@iribarren.gob.ve");
    expect(alm.bitacora.at(-1)!.accion).toBe("SITIO_EDITADO");

    const malo = {
      ...SITIO_INICIAL,
      contacto: { direccion: "", correo: "no-es-correo" },
      enlaces: [{ texto: "Decreto", url: "www.algo" }],
      redes: [{ red: "INSTAGRAM", usuario: "@x", url: "http://inseguro" }],
    };
    const r = guardarSitio(alm, s, malo);
    expect(r.estado).toBe("INVALIDO");
    if (r.estado !== "INVALIDO") return;
    expect(Object.keys(r.errores)).toEqual(
      expect.arrayContaining([
        "contacto.direccion",
        "contacto.correo",
        "enlaces.0.url",
        "redes.0.url",
      ]),
    );
  });

  it("solo el Administrador edita los datos del sitio; el Operador edita el Inicio", () => {
    const op = sesionDe("operador@iribarren.test");
    expect(guardarSitio(op.alm, op.s, SITIO_INICIAL)).toEqual({ estado: "SIN_PERMISO" });
    expect(
      guardarEncabezado(op.alm, op.s, { ...ENCABEZADO_INICIAL, titulo: "Barquisimeto que crece" }),
    ).toEqual({ estado: "OK" });
    expect(encabezadoDe(op.alm).titulo).toBe("Barquisimeto que crece");
    const rev = sesionDe("revisor@iribarren.test");
    expect(guardarActores(rev.alm, rev.s, ACTORES_INICIAL)).toEqual({ estado: "SIN_PERMISO" });
  });

  it("el encabezado necesita al menos una foto descrita", () => {
    const { alm, s } = sesionDe("admin@iribarren.test");
    const r = guardarEncabezado(alm, s, {
      ...ENCABEZADO_INICIAL,
      fotos: [{ ...ENCABEZADO_INICIAL.fotos[0]!, alt: "" }],
    });
    expect(r).toMatchObject({ estado: "INVALIDO", errores: { "fotos.0.alt": expect.any(String) } });
    expect(guardarEncabezado(alm, s, { ...ENCABEZADO_INICIAL, fotos: [] })).toMatchObject({
      estado: "INVALIDO",
      errores: { fotos: expect.any(String) },
    });
  });
});
