import { describe, expect, it } from "vitest";
import {
  catalogosDe,
  cambiarActivoMiembro,
  cambiarMembresia,
  ciudadanosDe,
  csvCiudadanos,
  diferencias,
  editarRoles,
  enmascarar,
  equipoDe,
  eventosDe,
  fijarFaseActual,
  guardarFase,
  invitarMiembro,
  moverFase,
  reenviarInvitacionMiembro,
} from "./alcaldia";
import { CONTRASENA_DEMO, almacenDemo } from "./fixtures";
import { iniciarSesion, verificarIntegridad, verInvitacion } from "./servicio";

function sesionDe(correo: string) {
  const alm = almacenDemo();
  const r = iniciarSesion(alm, correo, CONTRASENA_DEMO);
  if (r.estado !== "OK") throw new Error(`No se pudo entrar con ${correo}`);
  return { alm, s: r.sesion };
}

const ADMIN = "admin@iribarren.test";

describe("equipo", () => {
  it("lista a los miembros de la alcaldía con su estado", () => {
    const { alm } = sesionDe(ADMIN);
    const equipo = equipoDe(alm, "iribarren", "u-admin-iri");
    expect(equipo.find((m) => m.correo === "nuevo.revisor@iribarren.test")?.estado).toBe(
      "INVITADO",
    );
    expect(equipo.find((m) => m.correo === "desactivado@iribarren.test")?.estado).toBe(
      "DESACTIVADO",
    );
    expect(equipo.find((m) => m.esYo)?.correo).toBe(ADMIN);
    expect(equipoDe(alm, "iribarren", undefined, { rol: "REVISOR" }).length).toBeGreaterThan(1);
  });

  it("invita con al menos un rol y la invitación es válida", () => {
    const { alm, s } = sesionDe(ADMIN);
    expect(invitarMiembro(alm, s, "nueva@iribarren.test", [])).toEqual({ estado: "SIN_ROLES" });
    expect(invitarMiembro(alm, s, "nueva@iribarren.test", ["ADMIN"])).toEqual({
      estado: "SIN_ROLES",
    });
    const r = invitarMiembro(alm, s, "Nueva@Iribarren.test", ["OPERADOR"]);
    expect(r.estado).toBe("OK");
    if (r.estado !== "OK") return;
    expect(verInvitacion(alm, r.token!)).toMatchObject({
      estado: "OK",
      correo: "nueva@iribarren.test",
      roles: ["OPERADOR"],
    });
    expect(invitarMiembro(alm, s, "nueva@iribarren.test", ["REVISOR"])).toEqual({
      estado: "YA_ES_MIEMBRO",
    });
  });

  it("no invita un correo que ya tiene cuenta en la alcaldía", () => {
    const { alm, s } = sesionDe(ADMIN);
    expect(invitarMiembro(alm, s, "operador@iribarren.test", ["REVISOR"])).toEqual({
      estado: "YA_ES_MIEMBRO",
    });
  });

  it("edita roles y activa o desactiva, pero no a sí mismo ni a otro administrador", () => {
    const { alm, s } = sesionDe(ADMIN);
    expect(editarRoles(alm, s, "u-revisor-iri", ["REVISOR", "OPERADOR"]).estado).toBe("OK");
    expect(alm.usuarios.get("u-revisor-iri")!.roles).toEqual(["REVISOR", "OPERADOR"]);
    expect(editarRoles(alm, s, "u-admin-iri", ["OPERADOR"]).estado).toBe("A_TI_MISMO");
    expect(cambiarActivoMiembro(alm, s, "u-operador-iri", false).estado).toBe("OK");
    expect(equipoDe(alm, "iribarren").find((m) => m.id === "u-operador-iri")?.estado).toBe(
      "DESACTIVADO",
    );
    expect(reenviarInvitacionMiembro(alm, s, "u-invitado").estado).toBe("OK");
  });

  it("el Revisor no gestiona el equipo", () => {
    const { alm, s } = sesionDe("revisor@iribarren.test");
    expect(invitarMiembro(alm, s, "x@iribarren.test", ["OPERADOR"])).toEqual({
      estado: "SIN_PERMISO",
    });
  });
});

describe("ciudadanos", () => {
  it("enmascara la cédula y el RIF", () => {
    expect(enmascarar("V-12345678")).toBe("V-•••••678");
    expect(enmascarar("C-29876543-7")).toBe("C-••••••437");
  });

  it("filtra por tipo, perfil, membresía y busca por nombre o cédula", () => {
    const { alm } = sesionDe(ADMIN);
    const todos = ciudadanosDe(alm, "iribarren");
    expect(todos.length).toBeGreaterThan(5);
    expect(ciudadanosDe(alm, "iribarren", { tipo: "ORGANIZACION" }).length).toBe(2);
    expect(ciudadanosDe(alm, "iribarren", { perfil: "INCOMPLETO" }).length).toBe(2);
    expect(ciudadanosDe(alm, "iribarren", { membresia: "SUSPENDIDA" }).length).toBe(1);
    expect(ciudadanosDe(alm, "iribarren", { q: "rodriguez" }).length).toBe(1);
    expect(ciudadanosDe(alm, "iribarren", { q: "12.345.678" }).length).toBe(1);
    expect(csvCiudadanos(todos)).not.toContain("12345678");
  });

  it("suspender exige motivo y queda en la bitácora", () => {
    const { alm, s } = sesionDe(ADMIN);
    const id = ciudadanosDe(alm, "iribarren", { q: "jose rodriguez" })[0]!.id;
    expect(cambiarMembresia(alm, s, id, "SUSPENDIDA", "corto")).toEqual({ estado: "SIN_MOTIVO" });
    expect(cambiarMembresia(alm, s, id, "SUSPENDIDA", "Uso indebido reiterado del portal")).toEqual(
      { estado: "OK" },
    );
    expect(alm.ciudadanos.get(id)!.membresia.estado).toBe("SUSPENDIDA");
    expect(alm.bitacora.at(-1)!.accion).toBe("MEMBRESIA_SUSPENDIDA");
  });

  it("el Revisor ve ciudadanos pero no suspende", () => {
    const { alm, s } = sesionDe("revisor@iribarren.test");
    const id = ciudadanosDe(alm, "iribarren")[0]!.id;
    expect(cambiarMembresia(alm, s, id, "SUSPENDIDA", "Motivo suficiente")).toEqual({
      estado: "SIN_PERMISO",
    });
  });
});

describe("catálogos y proceso", () => {
  it("los catálogos vienen del despliegue y se leen tal cual", () => {
    const alm = almacenDemo();
    expect(catalogosDe(alm, "iribarren")!.parroquias.length).toBeGreaterThan(0);
  });

  it("edita fases, valida fechas, reordena y mantiene la fase actual", () => {
    const { alm, s } = sesionDe(ADMIN);
    const p = alm.procesos.get("iribarren")!;
    const actual = p.fases[p.actual]!.id;
    expect(
      guardarFase(alm, s, {
        id: "diagnostico",
        nombre: "Diagnóstico",
        descripcion: "x",
        inicio: "2026-11-10",
        fin: "2026-11-01",
      }),
    ).toEqual({ estado: "FECHAS" });
    expect(moverFase(alm, s, actual, 1)).toEqual({ estado: "OK" });
    expect(p.fases[p.actual]!.id).toBe(actual);
    expect(fijarFaseActual(alm, s, "diagnostico")).toEqual({ estado: "OK" });
    expect(p.fases[p.actual]!.id).toBe("diagnostico");
  });
});

describe("bitácora", () => {
  it("filtra por alcaldía y acción, muestra diferencias y la cadena sigue íntegra", () => {
    const { alm, s } = sesionDe(ADMIN);
    editarRoles(alm, s, "u-revisor-iri", ["OPERADOR"]);
    const eventos = eventosDe(alm, "iribarren", { accion: "MIEMBRO_ROLES" });
    expect(eventos).toHaveLength(1);
    expect(diferencias(eventos[0]!)).toEqual([
      { campo: "roles", antes: ["REVISOR"], despues: ["OPERADOR"] },
    ]);
    expect(verificarIntegridad(alm)).toEqual({ ok: true });
  });
});
