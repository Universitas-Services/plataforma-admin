import { describe, expect, it } from "vitest";
import {
  anonimizarCiudadano,
  cambiarActivoItem,
  catalogosDe,
  cambiarActivoMiembro,
  cambiarMembresia,
  ciudadanosDe,
  csvCiudadanos,
  diferencias,
  editarRoles,
  eliminarFase,
  enmascarar,
  equipoDe,
  eventosDe,
  filtrosCiudadanos,
  fijarFaseActual,
  guardarFase,
  guardarItem,
  invitarMiembro,
  moverFase,
  moverItem,
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
    // El mismo formato que la API (guía R13).
    expect(enmascarar("V-12345678")).toBe("V-12.***.678");
    expect(enmascarar("C-29876543-7")).toBe("C-29.***.543-7");
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

  it("reactivar no exige motivo, como en la API", () => {
    const { alm, s } = sesionDe(ADMIN);
    const id = ciudadanosDe(alm, "iribarren", { membresia: "SUSPENDIDA" })[0]!.id;
    expect(cambiarMembresia(alm, s, id, "ACTIVA", "")).toEqual({ estado: "OK" });
    expect(cambiarMembresia(alm, s, id, "SUSPENDIDA", "")).toEqual({ estado: "SIN_MOTIVO" });
    expect(alm.ciudadanos.get(id)!.membresia.estado).toBe("ACTIVA");
  });

  it("filtra las bajas pedidas, ordena y lee el orden de la URL", () => {
    const { alm } = sesionDe(ADMIN);
    const bajas = ciudadanosDe(alm, "iribarren", { baja: "solicitada" });
    expect(bajas.map((c) => c.nombre)).toEqual(["Gabriel Torrealba"]);
    const porNombre = ciudadanosDe(alm, "iribarren", { orden: "nombre" }).map((c) => c.nombre);
    expect(porNombre).toEqual([...porNombre].sort((a, b) => a.localeCompare(b, "es")));
    const leer = (q: Record<string, string>) => filtrosCiudadanos((k) => q[k]);
    expect(leer({ orden: "nombre", baja: "solicitada" })).toMatchObject({
      orden: "nombre",
      baja: "solicitada",
    });
    expect(leer({ orden: "toString", baja: "x" })).toMatchObject({
      orden: undefined,
      baja: undefined,
    });
  });

  it("anonimiza solo si pidió la baja, y después no se puede suspender", () => {
    const { alm, s } = sesionDe(ADMIN);
    const sinBaja = ciudadanosDe(alm, "iribarren", { q: "jose rodriguez" })[0]!.id;
    expect(anonimizarCiudadano(alm, s, sinBaja)).toEqual({ estado: "SIN_BAJA" });
    const id = ciudadanosDe(alm, "iribarren", { baja: "solicitada" })[0]!.id;
    expect(anonimizarCiudadano(alm, s, id)).toEqual({ estado: "OK" });
    const c = alm.ciudadanos.get(id)!;
    expect(c).toMatchObject({ nombre: "Cuenta anonimizada", correo: "", documentos: [] });
    expect(c.cedula).toBeUndefined();
    expect(alm.bitacora.at(-1)!.accion).toBe("CUENTA_ANONIMIZADA");
    expect(ciudadanosDe(alm, "iribarren", { baja: "solicitada" })).toHaveLength(0);
    expect(ciudadanosDe(alm, "iribarren", { baja: "anonimizada" })).toHaveLength(1);
    expect(cambiarMembresia(alm, s, id, "SUSPENDIDA", "Motivo suficiente")).toEqual({
      estado: "ANONIMIZADA",
    });
    expect(csvCiudadanos([c]).split("\r\n")[0]).toContain('"Cuenta"');
  });

  it("el Revisor ve ciudadanos pero no suspende", () => {
    const { alm, s } = sesionDe("revisor@iribarren.test");
    const id = ciudadanosDe(alm, "iribarren")[0]!.id;
    expect(cambiarMembresia(alm, s, id, "SUSPENDIDA", "Motivo suficiente")).toEqual({
      estado: "SIN_PERMISO",
    });
    expect(anonimizarCiudadano(alm, s, id)).toEqual({ estado: "SIN_PERMISO" });
  });
});

describe("catálogos y proceso", () => {
  it("los catálogos vienen del despliegue y se leen tal cual", () => {
    const alm = almacenDemo();
    expect(catalogosDe(alm, "iribarren")!.parroquias.length).toBeGreaterThan(0);
  });

  it("el Administrador crea, renombra sin repetir (sin tildes), ordena y desactiva", () => {
    const { alm, s } = sesionDe(ADMIN);
    const lista = () => catalogosDe(alm, "iribarren")!.parroquias;
    const antes = lista().length;
    expect(guardarItem(alm, s, "parroquias", "  Nueva   parroquia ").estado).toBe("OK");
    expect(lista().at(-1)).toMatchObject({ nombre: "Nueva parroquia", activo: true });
    expect(guardarItem(alm, s, "parroquias", "el cuji").estado).toBe("REPETIDO");
    expect(guardarItem(alm, s, "parroquias", "   ").estado).toBe("VACIO");
    const nueva = lista().at(-1)!;
    expect(guardarItem(alm, s, "parroquias", "Parroquia renombrada", nueva.id).estado).toBe("OK");
    expect(moverItem(alm, s, "parroquias", nueva.id, -1).estado).toBe("OK");
    expect(lista()[antes - 1]!.id).toBe(nueva.id);
    expect(moverItem(alm, s, "parroquias", lista()[0]!.id, -1).estado).toBe("NO_EXISTE");
    expect(cambiarActivoItem(alm, s, "parroquias", nueva.id, false).estado).toBe("OK");
    expect(lista().find((i) => i.id === nueva.id)?.activo).toBe(false);
    expect(alm.bitacora.map((e) => e.accion)).toEqual(
      expect.arrayContaining([
        "CATALOGO_CREADO",
        "CATALOGO_EDITADO",
        "CATALOGO_REORDENADO",
        "CATALOGO_DESACTIVADO",
      ]),
    );
    expect(verificarIntegridad(alm).ok).toBe(true);
  });

  it("el Operador y el Revisor no editan los catálogos", () => {
    for (const correo of ["operador@iribarren.test", "revisor@iribarren.test"]) {
      const { alm, s } = sesionDe(correo);
      expect(guardarItem(alm, s, "parroquias", "Otra").estado).toBe("SIN_PERMISO");
    }
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

  it("guarda cómo se ve una fase siguiente y no elimina la actual", () => {
    const { alm, s } = sesionDe(ADMIN);
    const p = alm.procesos.get("iribarren")!;
    expect(
      guardarFase(alm, s, {
        id: "formulacion",
        nombre: "Formulación",
        descripcion: "x",
        estadoSiguiente: "PROXIMAMENTE",
      }),
    ).toEqual({ estado: "OK" });
    expect(p.fases.find((f) => f.id === "formulacion")!.estadoSiguiente).toBe("PROXIMAMENTE");
    const actual = p.fases[p.actual]!.id;
    expect(eliminarFase(alm, s, actual)).toEqual({ estado: "FASE_ACTUAL" });
    // Borrar una anterior corre la actual un lugar, pero sigue siendo la misma fase.
    expect(eliminarFase(alm, s, p.fases[0]!.id)).toEqual({ estado: "OK" });
    expect(p.fases[p.actual]!.id).toBe(actual);
    expect(alm.bitacora.at(-1)?.accion).toBe("FASE_ELIMINADA");
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
