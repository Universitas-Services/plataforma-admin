import { describe, expect, it } from "vitest";
import { CONTRASENA_DEMO, almacenDemo } from "./fixtures";
import { PERMISOS, permisoDeRuta, permisosDe, puede, seccionesDe } from "./permisos";
import {
  aceptarInvitacion,
  cambiarContrasena,
  cerrarTodas,
  contextoDe,
  iniciarSesion,
  recuperar,
  reenviarInvitacion,
  restablecer,
  verInvitacion,
  verificarIntegridad,
  idSecuencial,
} from "./servicio";

const entrar = (alm: ReturnType<typeof almacenDemo>, correo: string) => {
  const r = iniciarSesion(alm, correo, CONTRASENA_DEMO);
  if (r.estado !== "OK") throw new Error(`No entró ${correo}: ${r.estado}`);
  return r;
};

describe("permisos por rol", () => {
  const alm = almacenDemo();
  const u = (id: string) => alm.usuarios.get(id)!;

  it("el Super Admin tiene todos los permisos de la alcaldía", () => {
    expect([...permisosDe(u("u-super"))].sort()).toEqual([...PERMISOS].sort());
  });

  it("matriz de la alcaldía: Admin todo, Operador contenido, Revisor participaciones", () => {
    expect([...permisosDe(u("u-admin-iri"))].sort()).toEqual([...PERMISOS].sort());
    const op = permisosDe(u("u-operador-iri"));
    expect(op.has("contenido.editar") && op.has("inicio.editar") && op.has("proceso.editar")).toBe(
      true,
    );
    expect(op.has("participaciones.evaluar")).toBe(false);
    expect(op.has("bitacora.ver")).toBe(false);
    const rev = permisosDe(u("u-revisor-iri"));
    expect(rev.has("participaciones.evaluar")).toBe(true);
    expect(rev.has("ciudadanos.ver")).toBe(true);
    expect(rev.has("ciudadanos.suspender")).toBe(false);
    expect(rev.has("contenido.editar")).toBe(false);
  });

  it("Operador y Revisor combinados suman permisos; una cuenta desactivada no tiene ninguno", () => {
    const eq = permisosDe(u("u-equipo-iri"));
    expect(eq.has("contenido.editar") && eq.has("participaciones.evaluar")).toBe(true);
    expect(permisosDe(u("u-inactivo")).size).toBe(0);
    expect(puede(u("u-revisor-iri"), "equipo.gestionar")).toBe(false);
  });

  it("el menú sale de los permisos", () => {
    expect(seccionesDe(u("u-operador-iri")).map((s) => s.etiqueta)).toEqual([
      "Tablero",
      "Contenido",
    ]);
    expect(seccionesDe(u("u-super")).map((s) => s.href)).toContain("/configuracion");
  });

  it("cada ruta exige el permiso de su sección más específica", () => {
    expect(permisoDeRuta("/participaciones/IRI-2026-0031")?.permiso).toBe(
      "participaciones.evaluar",
    );
    expect(permisoDeRuta("/plataforma")).toBeUndefined();
    expect(permisoDeRuta("/otra")).toBeUndefined();
  });
});

describe("inicio de sesión", () => {
  it("lleva a cada rol a su destino", () => {
    const alm = almacenDemo();
    expect(entrar(alm, "superadmin@plataforma.test").destino).toBe("/tablero");
    expect(entrar(alm, "revisor@iribarren.test").destino).toBe("/tablero");
    // El Super Admin entra a operar la alcaldía: queda en la bitácora.
    expect(alm.bitacora.some((e) => e.accion === "OPERAR_COMO_SUPER_ADMIN")).toBe(true);
    const s = entrar(alm, "operador@iribarren.test").sesion;
    expect(contextoDe(alm, s)?.alcaldia.id).toBe("iribarren");
  });

  it("bloquea 15 minutos tras 5 intentos y no revela si el correo existe", () => {
    const alm = almacenDemo();
    const t0 = Date.UTC(2026, 9, 18, 12);
    expect(iniciarSesion(alm, "nadie@x.test", "x", t0).estado).toBe("CREDENCIALES");
    for (let i = 0; i < 4; i++)
      expect(iniciarSesion(alm, "admin@iribarren.test", "mala", t0).estado).toBe("CREDENCIALES");
    expect(iniciarSesion(alm, "admin@iribarren.test", "mala", t0)).toEqual({
      estado: "BLOQUEADA",
      minutos: 15,
    });
    // Ni con la contraseña correcta mientras dura el bloqueo.
    expect(iniciarSesion(alm, "admin@iribarren.test", CONTRASENA_DEMO, t0 + 60_000)).toEqual({
      estado: "BLOQUEADA",
      minutos: 14,
    });
    expect(
      iniciarSesion(alm, "admin@iribarren.test", CONTRASENA_DEMO, t0 + 16 * 60_000).estado,
    ).toBe("OK");
  });

  it("una cuenta desactivada no entra", () => {
    expect(iniciarSesion(almacenDemo(), "desactivado@iribarren.test", CONTRASENA_DEMO).estado).toBe(
      "DESACTIVADA",
    );
  });
});

describe("contraseñas y sesiones", () => {
  it("cambiar la contraseña exige la actual y cierra las otras sesiones", () => {
    const alm = almacenDemo();
    const a = entrar(alm, "operador@iribarren.test").sesion;
    const b = entrar(alm, "operador@iribarren.test").sesion;
    expect(cambiarContrasena(alm, a, "mala", "Nueva#Clave2026")).toBe("ACTUAL_INCORRECTA");
    expect(cambiarContrasena(alm, a, CONTRASENA_DEMO, CONTRASENA_DEMO)).toBe("IGUAL_A_LA_ACTUAL");
    expect(cambiarContrasena(alm, a, CONTRASENA_DEMO, "Nueva#Clave2026")).toBe("OK");
    expect(contextoDe(alm, a)).not.toBeNull();
    expect(contextoDe(alm, b)).toBeNull();
  });

  it("cerrar todas revoca también la actual", () => {
    const alm = almacenDemo();
    const a = entrar(alm, "revisor@iribarren.test").sesion;
    entrar(alm, "revisor@iribarren.test");
    expect(cerrarTodas(alm, a)).toBe(2);
    expect(contextoDe(alm, a)).toBeNull();
  });

  it("restablecer usa un enlace de un uso y cierra todas las sesiones", () => {
    const alm = almacenDemo();
    const s = entrar(alm, "admin@iribarren.test").sesion;
    const token = recuperar(alm, "admin@iribarren.test").tokenDesarrollo!;
    expect(recuperar(alm, "nadie@x.test").tokenDesarrollo).toBeUndefined();
    expect(restablecer(alm, token, "Otra#Clave2026")).toBe("OK");
    expect(restablecer(alm, token, "Otra#Clave2026")).toBe("USADO");
    expect(contextoDe(alm, s)).toBeNull();
  });
});

describe("invitaciones", () => {
  const datos = {
    nombres: "Elena",
    apellidos: "Silva",
    cedula: "V-20111222",
    contrasena: "Invitada#2026",
  };

  it("muestra la alcaldía y el rol, y se acepta una sola vez", () => {
    const alm = almacenDemo();
    expect(verInvitacion(alm, "demo-invitacion")).toMatchObject({
      estado: "OK",
      correo: "nuevo.revisor@iribarren.test",
      roles: ["REVISOR"],
    });
    expect(aceptarInvitacion(alm, "demo-invitacion", datos)).toBe("OK");
    expect(verInvitacion(alm, "demo-invitacion").estado).toBe("USADO");
    expect(iniciarSesion(alm, "nuevo.revisor@iribarren.test", datos.contrasena).estado).toBe("OK");
  });

  it("vencida, usada o con cédula ajena no se acepta; la vencida se reenvía", () => {
    const alm = almacenDemo();
    expect(aceptarInvitacion(alm, "demo-invitacion-vencida", datos)).toBe("VENCIDO");
    expect(aceptarInvitacion(alm, "demo-invitacion-usada", datos)).toBe("USADO");
    expect(aceptarInvitacion(alm, "no-existe", datos)).toBe("INVALIDO");
    const nuevo = reenviarInvitacion(alm, "demo-invitacion-vencida")!;
    expect(verInvitacion(alm, nuevo).estado).toBe("OK");
    // El enlace anterior queda reemplazado (y se puede volver a pedir uno).
    expect(verInvitacion(alm, "demo-invitacion-vencida").estado).toBe("REEMPLAZADA");
    alm.usuarios.get("u-admin-iri")!.cedula = "V-20111222";
    expect(aceptarInvitacion(alm, nuevo, datos)).toBe("CEDULA_EN_USO");
  });
});

describe("bitácora", () => {
  it("detecta un evento alterado en la cadena", () => {
    const alm = almacenDemo();
    entrar(alm, "superadmin@plataforma.test");
    entrar(alm, "revisor@iribarren.test");
    expect(verificarIntegridad(alm)).toEqual({ ok: true });
    alm.bitacora[1]!.accion = "OTRA_COSA";
    expect(verificarIntegridad(alm)).toEqual({ ok: false, eventoId: 2 });
  });
});

describe("ids secuenciales", () => {
  it("sigue el mayor número del prefijo e ignora los ids de ejemplo", () => {
    expect(idSecuencial([], "n")).toBe("n-0001");
    expect(idSecuencial(["n-ejemplo-mesas", "n-0002", "n-0010", "d-0050"], "n")).toBe("n-0011");
  });
});
