import { expect, test } from "@playwright/test";
import { ingresar, prohibido } from "./utilidades";

/*
 * Textos legales del portal (R15): solo el Administrador publica versiones nuevas de los
 * términos de uso y de la política de datos. Cada prueba publica una versión más; no se borran
 * (como en la API), así que se compara con la que había.
 */

test("el Administrador publica una versión nueva con su nota", async ({ page }) => {
  test.slow();
  await ingresar(page, "admin@iribarren.test");
  await page.goto("/configuracion");
  await page.getByRole("link", { name: /Textos legales del portal/ }).click();
  await expect(page.getByRole("heading", { name: "Textos legales", level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Ver y publicar una versión nueva" }).last().click();
  await expect(page).toHaveURL(/\/configuracion\/textos-legales\/politica-de-datos$/);

  const boton = page.getByRole("button", { name: /^Publicar la versión \d+$/ });
  const siguiente = Number((await boton.textContent())!.match(/\d+/)![0]);

  // Sin nota no deja publicar.
  await boton.click();
  await expect(
    page.getByText("Cuenta qué cambió: lo leerán las personas al aceptarlo."),
  ).toBeVisible();

  const editor = page.locator("#texto");
  await editor.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(` Cambio de prueba ${Date.now()}.`);
  await page.getByLabel("Qué cambió").fill("Prueba automatizada: se agrega una aclaración.");
  await boton.click();

  const confirmar = page.getByRole("dialog", { name: `¿Publicar la versión ${siguiente}?` });
  await expect(confirmar).toContainText("tendrán que aceptar");
  await confirmar.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByText(`versión ${siguiente} publicada`)).toBeVisible();

  const historial = page.getByRole("region", { name: "Versiones publicadas" });
  await expect(historial.getByRole("listitem").first()).toContainText(`Versión ${siguiente}`);
  await expect(historial.getByRole("listitem").first()).toContainText("Vigente");
  await expect(historial.getByRole("listitem").first()).toContainText(
    "Prueba automatizada: se agrega una aclaración.",
  );
});

test("el Operador y el Revisor no entran a los textos legales", async ({ page }) => {
  for (const correo of ["operador@iribarren.test", "revisor@iribarren.test"]) {
    await ingresar(page, correo);
    await page.goto("/configuracion/textos-legales");
    await prohibido(page);
    await page.goto("/configuracion/textos-legales/terminos");
    await prohibido(page);
    await page.context().clearCookies();
  }
});
