import { describe, expect, it } from "vitest";
import { DURACION_SESION_MS, firmarSesion, leerSesion } from "./token-sesion";

const SECRETO = "secreto-de-prueba";

describe("token de sesión firmado", () => {
  it("se lee en cualquier instancia con el mismo secreto", () => {
    const t = firmarSesion({ usuarioId: "u1" }, SECRETO, 1000);
    expect(leerSesion(t, SECRETO, 2000)).toMatchObject({ u: "u1", e: 1000 });
  });

  it("rechaza un token alterado o firmado con otro secreto", () => {
    const t = firmarSesion({ usuarioId: "u1" }, SECRETO, 1000);
    const [cuerpo, sello] = t.split(".");
    const otro = Buffer.from(JSON.stringify({ u: "admin", e: 1000, v: 9e15 })).toString(
      "base64url",
    );
    expect(leerSesion(`${otro}.${sello}`, SECRETO, 2000)).toBeNull();
    expect(leerSesion(`${cuerpo}.${sello}x`, SECRETO, 2000)).toBeNull();
    expect(leerSesion(t, "otro-secreto", 2000)).toBeNull();
    expect(leerSesion("basura", SECRETO, 2000)).toBeNull();
  });

  it("vence a las 8 horas", () => {
    const t = firmarSesion({ usuarioId: "u1" }, SECRETO, 0);
    expect(leerSesion(t, SECRETO, DURACION_SESION_MS - 1)).not.toBeNull();
    expect(leerSesion(t, SECRETO, DURACION_SESION_MS)).toBeNull();
  });
});
