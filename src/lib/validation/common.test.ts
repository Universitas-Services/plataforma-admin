import { describe, expect, it } from "vitest";
import {
  archivoSchema,
  cedulaSchema,
  contrasenaSchema,
  correoSchema,
  MB,
  rifSchema,
  telefonoSchema,
} from "./common";

const archivo = (bytes: number, type: string) => new File([new Uint8Array(bytes)], "doc", { type });

describe("cedulaSchema", () => {
  it.each(["V-12345678", "v12345678", "E-1234567", " V-1234567 "])("acepta %s", (v) => {
    expect(cedulaSchema.safeParse(v).success).toBe(true);
  });

  it("normaliza al formato V-12345678", () => {
    expect(cedulaSchema.parse("v12345678")).toBe("V-12345678");
  });

  it.each(["J-12345678", "V-123456", "V-123456789", "12345678", ""])("rechaza %s", (v) => {
    expect(cedulaSchema.safeParse(v).success).toBe(false);
  });
});

describe("rifSchema", () => {
  it.each(["J-12345678-9", "g123456789", "C-12345678-0"])("acepta %s", (v) => {
    expect(rifSchema.safeParse(v).success).toBe(true);
  });

  it("normaliza al formato J-12345678-9", () => {
    expect(rifSchema.parse("j123456789")).toBe("J-12345678-9");
  });

  it.each(["V-12345678-9", "J-1234567-9", "J-12345678"])("rechaza %s", (v) => {
    expect(rifSchema.safeParse(v).success).toBe(false);
  });
});

describe("telefonoSchema", () => {
  it.each(["0414-1234567", "04241234567", "+584121234567", "0251 2345678"])("acepta %s", (v) => {
    expect(telefonoSchema.safeParse(v).success).toBe(true);
  });

  it.each(["0415-1234567", "1234567", "0414-123456"])("rechaza %s", (v) => {
    expect(telefonoSchema.safeParse(v).success).toBe(false);
  });
});

describe("correoSchema", () => {
  it("normaliza a minúsculas", () => {
    expect(correoSchema.parse(" Ana@Ejemplo.COM ")).toBe("ana@ejemplo.com");
  });

  it("rechaza un correo sin dominio", () => {
    expect(correoSchema.safeParse("ana@").success).toBe(false);
  });
});

describe("contrasenaSchema", () => {
  it("acepta una contraseña que cumple la política", () => {
    expect(contrasenaSchema.safeParse("Segura#2026").success).toBe(true);
  });

  it.each([
    ["corta", "Ab1#"],
    ["sin mayúscula", "segura#2026"],
    ["sin minúscula", "SEGURA#2026"],
    ["sin número", "Segura#abcd"],
    ["sin símbolo", "Segura2026x"],
  ])("rechaza una contraseña %s", (_motivo, v) => {
    expect(contrasenaSchema.safeParse(v).success).toBe(false);
  });
});

describe("archivoSchema", () => {
  const schema = archivoSchema();

  it("acepta un PDF de 1 MB", () => {
    expect(schema.safeParse(archivo(MB, "application/pdf")).success).toBe(true);
  });

  it("rechaza un archivo de más de 2 MB", () => {
    expect(schema.safeParse(archivo(2 * MB + 1, "application/pdf")).success).toBe(false);
  });

  it("rechaza un tipo no permitido", () => {
    expect(schema.safeParse(archivo(100, "application/zip")).success).toBe(false);
  });

  it("rechaza un archivo vacío", () => {
    expect(schema.safeParse(archivo(0, "application/pdf")).success).toBe(false);
  });
});
