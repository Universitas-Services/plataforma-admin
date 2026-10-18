import { describe, expect, it } from "vitest";
import { MARCA_PLATAFORMA, contraste, marcaLegible, variablesMarca } from "./marca";

describe("capa de marca", () => {
  it("sin alcaldía usa el azul de la plataforma con texto blanco", () => {
    expect(variablesMarca()).toMatchObject({
      "--marca": MARCA_PLATAFORMA,
      "--sobre-marca": "#FFFFFF",
    });
  });

  it("elige el texto de mejor contraste y deriva un tono AA para textos", () => {
    const rojo = variablesMarca("#c32026");
    expect(rojo["--sobre-marca"]).toBe("#FFFFFF");
    expect(contraste(rojo["--marca-texto"], "#FFFFFF")).toBeGreaterThanOrEqual(4.5);

    const amarillo = variablesMarca("#ECA52B");
    expect(amarillo["--sobre-marca"]).toBe("#16213A");
    expect(contraste(amarillo["--marca-texto"], "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
  });

  it("detecta marcas cuyo texto no llega a AA", () => {
    expect(marcaLegible("#C32026")).toBe(true);
    expect(marcaLegible("#777777")).toBe(false);
  });

  it("ignora valores inválidos", () => {
    expect(variablesMarca("rojo")["--marca"]).toBe(MARCA_PLATAFORMA);
  });
});
