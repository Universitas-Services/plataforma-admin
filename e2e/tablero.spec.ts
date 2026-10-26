import { expect, test, type Page } from "@playwright/test";
import { ingresar } from "./utilidades";

/* Indicadores del tablero: cada rol ve lo suyo, con rango de fechas y exportación a CSV. */

const secciones = (page: Page) =>
  page.getByRole("region", { name: "Indicadores" }).getByRole("heading", { level: 3 });

test("el Admin ve todas las secciones, cambia el rango y exporta", async ({ page }) => {
  await ingresar(page, "admin@iribarren.test");
  await page.goto("/tablero");
  await expect(secciones(page)).toHaveText(["Participación", "Contenido", "Ciudadanía", "Equipo"]);

  await page.getByRole("link", { name: "Últimos 7 días" }).click();
  await expect(page).toHaveURL(/rango=7d/);
  await expect(page.getByRole("link", { name: "Últimos 7 días" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  const descarga = page.waitForEvent("download");
  await page.getByRole("link", { name: "Exportar CSV" }).click();
  const archivo = await descarga;
  expect(archivo.suggestedFilename()).toMatch(/^indicadores-iri-.+\.csv$/);
});

test("el gráfico se recorre con el teclado y tiene su tabla", async ({ page }) => {
  await ingresar(page, "admin@iribarren.test");
  await page.goto("/tablero");
  const grafico = page.getByRole("img", { name: /^Aportes recibidos:/ });
  await grafico.focus();
  await page.keyboard.press("End");
  // La lectura del punto activo (región aria-live): «25 oct.: 1 aportes».
  await expect(grafico).toHaveAccessibleDescription(/^\d+ \S+: \d+ aportes$/);
  await page.getByText("Ver como tabla").first().click();
  await expect(page.getByRole("table", { name: "Aportes recibidos" })).toBeVisible();
});

test("el Operador solo ve contenido y el Revisor no lo ve", async ({ page }) => {
  await ingresar(page, "operador@iribarren.test");
  await page.goto("/tablero");
  await expect(secciones(page)).toHaveText(["Contenido"]);
  await page.context().clearCookies();
  await ingresar(page, "revisor@iribarren.test");
  await page.goto("/tablero");
  await expect(secciones(page)).toHaveText(["Participación", "Ciudadanía"]);
});
