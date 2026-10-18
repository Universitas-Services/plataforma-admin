import { describe, expect, it } from "vitest";
import {
  aceptarInvitacionSchema,
  brandingSchema,
  invitarUsuarioSchema,
  transicionParticipacionSchema,
} from "./schemas";

describe("aceptarInvitacionSchema", () => {
  const base = {
    nombres: "Ana",
    apellidos: "Pérez",
    cedula: "V-12345678",
    contrasena: "Segura#2026",
    confirmarContrasena: "Segura#2026",
  };

  it("acepta datos válidos", () => {
    expect(aceptarInvitacionSchema.safeParse(base).success).toBe(true);
  });

  it("marca el error en confirmarContrasena si no coinciden", () => {
    const r = aceptarInvitacionSchema.safeParse({ ...base, confirmarContrasena: "Otra#20266" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(["confirmarContrasena"]);
  });
});

describe("brandingSchema", () => {
  it("acepta un color hexadecimal y lema opcional", () => {
    expect(brandingSchema.safeParse({ colorPrimario: "#1F3A5F" }).success).toBe(true);
  });

  it("rechaza un color que no es hexadecimal de 6 dígitos", () => {
    expect(brandingSchema.safeParse({ colorPrimario: "azul" }).success).toBe(false);
  });

  it("rechaza un lema de más de 120 caracteres", () => {
    const r = brandingSchema.safeParse({ colorPrimario: "#1F3A5F", lema: "a".repeat(121) });
    expect(r.success).toBe(false);
  });
});

describe("invitarUsuarioSchema", () => {
  it("exige al menos un rol", () => {
    expect(
      invitarUsuarioSchema.safeParse({ correo: "op@iribarren.gob.ve", roles: [] }).success,
    ).toBe(false);
  });
});

describe("transicionParticipacionSchema", () => {
  it("permite aprobar sin motivo", () => {
    expect(transicionParticipacionSchema.safeParse({ to: "APROBADA" }).success).toBe(true);
  });

  it("exige motivo y texto al rechazar", () => {
    expect(transicionParticipacionSchema.safeParse({ to: "RECHAZADA" }).success).toBe(false);
    expect(
      transicionParticipacionSchema.safeParse({
        to: "RECHAZADA",
        motivoCodigo: "IDENTIDAD_NO_ACREDITADA",
        motivoTexto: "El documento cargado no corresponde a la persona registrada.",
      }).success,
    ).toBe(true);
  });

  it("rechaza transiciones no definidas", () => {
    expect(transicionParticipacionSchema.safeParse({ to: "PUBLICADA" }).success).toBe(false);
  });
});
