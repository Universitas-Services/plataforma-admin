import { describe, expect, it } from "vitest";
import { CONTRASENA_DEMO, almacenDemo } from "./fixtures";
import { alcaldiasResumen, cambiarEstadoAlcaldia, crearAlcaldia } from "./plataforma";
import { iniciarSesion, verInvitacion } from "./servicio";

function sesionDe(correo: string) {
  const alm = almacenDemo();
  const r = iniciarSesion(alm, correo, CONTRASENA_DEMO);
  if (r.estado !== "OK") throw new Error(`No se pudo entrar con ${correo}`);
  return { alm, s: r.sesion };
}

const SUPER = "superadmin@plataforma.test";
const DATOS = {
  nombre: "Alcaldía del Municipio Andrés Eloy Blanco",
  sigla: "aeb",
  correoAdmin: "admin@aeb.test",
};

describe("alcaldías de la plataforma", () => {
  it("resume cada alcaldía con sus conteos", () => {
    const { alm } = sesionDe(SUPER);
    const iri = alcaldiasResumen(alm).find((r) => r.alcaldia.id === "iribarren")!;
    expect(iri.participaciones).toBeGreaterThan(5);
    expect(iri.noticias).toBeGreaterThan(0);
    expect(iri.administradores.some((a) => a.correo === "admin@iribarren.test")).toBe(true);
    expect(alcaldiasResumen(alm, { estado: "SUSPENDIDA" }).length).toBe(1);
  });

  it("crea una alcaldía en onboarding e invita a su administrador", () => {
    const { alm, s } = sesionDe(SUPER);
    const r = crearAlcaldia(alm, s, DATOS);
    expect(r.estado).toBe("OK");
    if (r.estado !== "OK") return;
    expect(r.id).toBe("andres-eloy-blanco");
    expect(alm.alcaldias.get(r.id)).toMatchObject({ sigla: "AEB", estado: "ONBOARDING_PENDIENTE" });
    expect(alm.procesos.get(r.id)?.fases.length).toBeGreaterThan(0);
    expect(verInvitacion(alm, r.token!)).toMatchObject({ estado: "OK", roles: ["ADMIN"] });
    expect(alm.bitacora.at(-1)!.accion).toBe("ALCALDIA_CREADA");
    // Ni el nombre ni la sigla se repiten.
    expect(crearAlcaldia(alm, s, DATOS)).toMatchObject({ estado: "INVALIDO" });
  });

  it("valida los campos y solo la plataforma crea alcaldías", () => {
    const { alm, s } = sesionDe(SUPER);
    const r = crearAlcaldia(alm, s, { nombre: "", sigla: "X1", correoAdmin: "no" });
    expect(r.estado).toBe("INVALIDO");
    if (r.estado === "INVALIDO")
      expect(Object.keys(r.errores).sort()).toEqual(["correoAdmin", "nombre", "sigla"]);
    const admin = sesionDe("admin@iribarren.test");
    expect(crearAlcaldia(admin.alm, admin.s, DATOS)).toEqual({ estado: "SIN_PERMISO" });
  });

  it("suspende con motivo y reactiva", () => {
    const { alm, s } = sesionDe(SUPER);
    expect(cambiarEstadoAlcaldia(alm, s, "jimenez", true, "corto")).toEqual({
      estado: "SIN_MOTIVO",
    });
    expect(cambiarEstadoAlcaldia(alm, s, "jimenez", true, "Convenio en revisión")).toEqual({
      estado: "OK",
    });
    expect(alm.alcaldias.get("jimenez")!.estado).toBe("SUSPENDIDA");
    expect(cambiarEstadoAlcaldia(alm, s, "jimenez", false)).toEqual({ estado: "OK" });
    expect(alm.alcaldias.get("jimenez")!.estado).toBe("ACTIVA");
  });
});
