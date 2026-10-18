import { describe, expect, it } from "vitest";
import { CONTRASENA_DEMO, almacenDemo } from "./fixtures";
import { PERMISOS_ALCALDIA, permisoDeRuta, permisosDe, puede, seccionesDe } from "./permisos";
import {
  aceptarInvitacion,
  cambiarContrasena,
  cerrarTodas,
  completarOnboarding,
  contextoDe,
  elegirAlcaldia,
  guardarColores,
  guardarLema,
  guardarLogo,
  iniciarSesion,
  logoDe,
  MAX_LEMA,
  MAX_LOGO,
  recuperar,
  reenviarInvitacion,
  restablecer,
  verInvitacion,
  verificarIntegridad,
} from "./servicio";

const entrar = (alm: ReturnType<typeof almacenDemo>, correo: string) => {
  const r = iniciarSesion(alm, correo, CONTRASENA_DEMO);
  if (r.estado !== "OK") throw new Error(`No entró ${correo}: ${r.estado}`);
  return r;
};

describe("permisos por rol", () => {
  const alm = almacenDemo();
  const u = (id: string) => alm.usuarios.get(id)!;

  it("el Super Admin tiene lo reservado; el Representante no", () => {
    expect(puede(u("u-super"), "plataforma.reservado")).toBe(true);
    expect(puede(u("u-avipri"), "plataforma.reservado")).toBe(false);
    expect(puede(u("u-avipri"), "alcaldias.gestionar")).toBe(true);
  });

  it("los roles de plataforma solo operan una alcaldía cuando entran en ella", () => {
    expect(puede(u("u-avipri"), "contenido.editar")).toBe(false);
    expect(puede(u("u-avipri"), "contenido.editar", "iribarren")).toBe(true);
  });

  it("matriz de la alcaldía: Admin todo, Operador contenido, Revisor participaciones", () => {
    expect([...permisosDe(u("u-admin-iri"), "iribarren")].sort()).toEqual(
      [...PERMISOS_ALCALDIA].sort(),
    );
    const op = permisosDe(u("u-operador-iri"), "iribarren");
    expect(op.has("contenido.editar")).toBe(true);
    expect(op.has("participaciones.evaluar")).toBe(false);
    expect(op.has("bitacora.ver")).toBe(false);
    const rev = permisosDe(u("u-revisor-iri"), "iribarren");
    expect(rev.has("participaciones.evaluar")).toBe(true);
    expect(rev.has("ciudadanos.ver")).toBe(true);
    expect(rev.has("ciudadanos.suspender")).toBe(false);
    expect(rev.has("contenido.editar")).toBe(false);
  });

  it("Operador y Revisor combinados suman permisos; sin membresía, nada", () => {
    const eq = permisosDe(u("u-equipo-iri"), "iribarren");
    expect(eq.has("contenido.editar") && eq.has("participaciones.evaluar")).toBe(true);
    expect(permisosDe(u("u-revisor-iri"), "jimenez").size).toBe(0);
  });

  it("el menú sale de los permisos y del ámbito", () => {
    expect(seccionesDe(u("u-operador-iri"), "iribarren").map((s) => s.etiqueta)).toEqual([
      "Tablero",
      "Contenido",
    ]);
    expect(seccionesDe(u("u-avipri")).map((s) => s.href)).toEqual([
      "/plataforma",
      "/plataforma/alcaldias",
      "/plataforma/bitacora",
    ]);
  });

  it("cada ruta exige el permiso de su sección más específica", () => {
    expect(permisoDeRuta("/plataforma/representantes")?.permiso).toBe("plataforma.reservado");
    expect(permisoDeRuta("/participaciones/IRI-2026-0031")?.permiso).toBe(
      "participaciones.evaluar",
    );
    expect(permisoDeRuta("/otra")).toBeUndefined();
  });
});

describe("inicio de sesión", () => {
  it("lleva a cada rol a su destino", () => {
    const alm = almacenDemo();
    expect(entrar(alm, "superadmin@plataforma.test").destino).toBe("/plataforma");
    expect(entrar(alm, "revisor@iribarren.test").destino).toBe("/tablero");
    expect(entrar(alm, "admin@palavecino.test").destino).toBe("/onboarding");
    expect(entrar(alm, "multi@lara.test").destino).toBe("/alcaldia");
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

describe("alcaldía activa", () => {
  it("el personal solo entra a sus alcaldías; la plataforma a todas, con bitácora", () => {
    const alm = almacenDemo();
    const multi = entrar(alm, "multi@lara.test").sesion;
    expect(elegirAlcaldia(alm, multi, "palavecino").estado).toBe("SIN_ACCESO");
    expect(elegirAlcaldia(alm, multi, "jimenez")).toEqual({ estado: "OK", destino: "/tablero" });
    expect(contextoDe(alm, multi)?.roles).toEqual(["OPERADOR"]);

    const rep = entrar(alm, "avipri@plataforma.test").sesion;
    const antes = alm.bitacora.length;
    expect(elegirAlcaldia(alm, rep, "torres")).toEqual({ estado: "OK", destino: "/tablero" });
    expect(alm.bitacora.at(-1)?.accion).toBe("OPERAR_EN_ALCALDIA");
    expect(alm.bitacora.length).toBe(antes + 1);
    // En una alcaldía sin onboarding, la plataforma puede completarlo.
    expect(elegirAlcaldia(alm, rep, "palavecino")).toEqual({
      estado: "OK",
      destino: "/onboarding",
    });
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

describe("onboarding de la alcaldía", () => {
  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

  function adminPalavecino() {
    const alm = almacenDemo();
    return { alm, s: entrar(alm, "admin@palavecino.test").sesion };
  }

  it("acepta PNG y SVG por su firma real y rechaza lo demás", () => {
    const { alm, s } = adminPalavecino();
    expect(guardarLogo(alm, s, PNG).estado).toBe("OK");
    expect(alm.alcaldias.get("palavecino")?.borradorMarca?.logo).toMatchObject({
      tipo: "image/png",
      version: 1,
    });
    expect(guardarLogo(alm, s, SVG).estado).toBe("OK");
    expect(guardarLogo(alm, s, new TextEncoder().encode("hola")).estado).toBe("FORMATO");
    expect(guardarLogo(alm, s, new Uint8Array()).estado).toBe("VACIO");
    expect(guardarLogo(alm, s, new Uint8Array(MAX_LOGO + 1).fill(0x89)).estado).toBe("MUY_GRANDE");
  });

  it("solo configura el administrador o la plataforma operando en la alcaldía", () => {
    const alm = almacenDemo();
    const op = entrar(alm, "operador@iribarren.test").sesion;
    expect(guardarLogo(alm, op, PNG).estado).toBe("SIN_PERMISO");
    const rep = entrar(alm, "avipri@plataforma.test").sesion;
    elegirAlcaldia(alm, rep, "palavecino");
    expect(guardarLogo(alm, rep, PNG).estado).toBe("OK");
  });

  it("rechaza colores sin contraste y sugiere uno que cumple", () => {
    const { alm, s } = adminPalavecino();
    const r = guardarColores(alm, s, "#ECA52B");
    expect(r.estado).toBe("CONTRASTE");
    if (r.estado === "CONTRASTE") expect(guardarColores(alm, s, r.sugerencia).estado).toBe("OK");
    expect(guardarLema(alm, s, "x".repeat(MAX_LEMA + 1)).estado).toBe("MUY_LARGO");
    expect(guardarLema(alm, s, "  Cabudare   participa ").estado).toBe("OK");
    expect(alm.alcaldias.get("palavecino")?.borradorMarca?.lema).toBe("Cabudare participa");
  });

  it("confirma solo con logo y color, activa la alcaldía y deja bitácora", () => {
    const { alm, s } = adminPalavecino();
    expect(completarOnboarding(alm, s)).toEqual({ estado: "FALTA", paso: "logo" });
    guardarLogo(alm, s, PNG);
    expect(completarOnboarding(alm, s)).toEqual({ estado: "FALTA", paso: "colores" });
    guardarColores(alm, s, "#0B4F8A");
    expect(completarOnboarding(alm, s)).toEqual({ estado: "OK" });
    const a = alm.alcaldias.get("palavecino")!;
    expect(a.estado).toBe("ACTIVA");
    expect(a.marca).toMatchObject({ primario: "#0B4F8A", logo: { tipo: "image/png" } });
    expect(logoDe(alm, "palavecino")?.bytes).toEqual(PNG);
    expect(alm.bitacora.at(-1)?.accion).toBe("ONBOARDING_COMPLETADO");
    expect(completarOnboarding(alm, s).estado).toBe("YA_ACTIVA");
    expect(verificarIntegridad(alm)).toEqual({ ok: true });
  });
});
