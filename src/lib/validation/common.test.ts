import { describe, expect, it } from "vitest";
import {
  archivoSchema,
  cedulaSchema,
  contrasenaSchema,
  correoSchema,
  digitoVerificadorRif,
  MB,
  nombrePersonaSchema,
  rifSchema,
  telefonoSchema,
} from "./common";

const archivo = (bytes: number, type: string) => new File([new Uint8Array(bytes)], "doc", { type });

describe("cedulaSchema", () => {
  it.each(["V-12345678", "v12345678", "E-1234567", " V-1234567 ", "V-12345", "E-123456789"])(
    "acepta %s",
    (v) => {
      expect(cedulaSchema.safeParse(v).success).toBe(true);
    },
  );

  it("normaliza al formato V-12345678", () => {
    expect(cedulaSchema.parse("v12345678")).toBe("V-12345678");
  });

  it.each([
    "J-12345678",
    "V-1234",
    "V-123456789",
    "E-1234567890",
    "V-1234a678",
    "V-12.345.678",
    "V-00000000",
    "12345678",
    "",
  ])("rechaza %s", (v) => {
    expect(cedulaSchema.safeParse(v).success).toBe(false);
  });

  it("explica el rango de dígitos según el tipo", () => {
    const r = cedulaSchema.safeParse("V-123456789");
    expect(r.error?.issues[0]?.message).toBe("La cédula V debe tener entre 5 y 8 dígitos.");
  });
});

describe("digitoVerificadorRif", () => {
  it.each([
    ["J", "07013380", 5],
    ["J", "12345678", 4],
    ["G", "20000002", 3],
    ["C", "29876543", 7],
  ] as const)("%s-%s → %i", (letra, ocho, dv) => {
    expect(digitoVerificadorRif(letra, ocho)).toBe(dv);
  });
});

describe("rifSchema", () => {
  it.each(["J-07013380-5", "g200000023", "C-29876543-7", " j-12345678-4 "])("acepta %s", (v) => {
    expect(rifSchema.safeParse(v).success).toBe(true);
  });

  it("normaliza al formato J-12345678-4", () => {
    expect(rifSchema.parse("j123456784")).toBe("J-12345678-4");
  });

  it.each(["V-12345678-9", "J-1234567-9", "J-12345678", "J-1234567a-4", "P-12345678-4"])(
    "rechaza %s",
    (v) => {
      expect(rifSchema.safeParse(v).success).toBe(false);
    },
  );

  it("rechaza un dígito verificador que no corresponde", () => {
    const r = rifSchema.safeParse("J-07013380-4");
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toMatch(/dígito verificador/);
  });
});

describe("nombrePersonaSchema", () => {
  it.each(["Ana", "María José", "Peña Núñez", "Güerere", "  Luis   Alberto "])("acepta %s", (v) => {
    expect(nombrePersonaSchema.safeParse(v).success).toBe(true);
  });

  it("unifica los espacios repetidos", () => {
    expect(nombrePersonaSchema.parse("  Luis   Alberto ")).toBe("Luis Alberto");
  });

  it.each(["A", "Ana2", "Ana_María", "José!", "O'Brien", "Ana-María", "", "a".repeat(101)])(
    "rechaza %s",
    (v) => {
      expect(nombrePersonaSchema.safeParse(v).success).toBe(false);
    },
  );
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

  it.each(["ana@", "ana", "ana@ejemplo", "ana @ejemplo.com", "@ejemplo.com", "ana@@ejemplo.com"])(
    "rechaza %s",
    (v) => {
      expect(correoSchema.safeParse(v).success).toBe(false);
    },
  );

  it("rechaza un correo de más de 255 caracteres", () => {
    expect(correoSchema.safeParse(`${"a".repeat(250)}@ejemplo.com`).success).toBe(false);
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
