import { expect, test } from "@playwright/test";
import { ingresar, prohibido } from "./utilidades";

/*
 * Configuración (R16): el Administrador edita los desplegables del portal. El valor de prueba
 * lleva la hora en el nombre y queda desactivado al final, como haría la alcaldía (no se borra).
 */

test("el Administrador agrega, renombra, ordena y desactiva un valor", async ({ page }, info) => {
  test.slow();
  const nombre = `Parroquia de prueba ${info.project.name} ${Date.now()}`;
  await ingresar(page, "admin@iribarren.test");
  await page.goto("/configuracion");
  const catalogo = page.getByRole("region", { name: /^Parroquias/ });

  await catalogo.getByRole("button", { name: "Agregar a Parroquias" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("Nombre").fill(nombre);
  await dialogo.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Valor agregado: el portal ya lo ofrece.")).toBeVisible();
  await expect(catalogo.getByText(nombre, { exact: true })).toBeVisible();

  // Repetido sin importar tildes ni mayúsculas.
  await catalogo.getByRole("button", { name: "Agregar a Parroquias" }).click();
  await dialogo.getByLabel("Nombre").fill("el cuji");
  await dialogo.getByRole("button", { name: "Guardar" }).click();
  await expect(dialogo.getByText(/Ya existe «El Cují»/)).toBeVisible();
  await dialogo.getByRole("button", { name: "Cancelar" }).click();

  const renombrado = `${nombre} (renombrada)`;
  await catalogo.getByRole("button", { name: `Renombrar «${nombre}»` }).click();
  await dialogo.getByLabel("Nombre").fill(renombrado);
  await dialogo.getByRole("button", { name: "Guardar" }).click();
  await expect(catalogo.getByText(renombrado, { exact: true })).toBeVisible();

  await catalogo.getByRole("button", { name: `Subir «${renombrado}»` }).click();
  await expect(page.getByText("Orden guardado.")).toBeVisible();

  await catalogo.getByRole("button", { name: `Desactivar «${renombrado}»` }).click();
  await expect(page.getByText(/Valor desactivado/)).toBeVisible();
  await expect(catalogo.getByRole("button", { name: `Activar «${renombrado}»` })).toBeVisible();

  // Agregarlo de nuevo no crea otro: ofrece activar el que ya existe (guía R16).
  await catalogo.getByRole("button", { name: "Agregar a Parroquias" }).click();
  await dialogo.getByLabel("Nombre").fill(renombrado.toUpperCase());
  await dialogo.getByRole("button", { name: "Guardar" }).click();
  await dialogo.getByRole("button", { name: `Activar «${renombrado}»` }).click();
  await expect(page.getByText(/Valor activado/)).toBeVisible();
  await expect(catalogo.getByRole("button", { name: `Desactivar «${renombrado}»` })).toBeVisible();
});

test("el Operador no entra a Configuración", async ({ page }) => {
  await ingresar(page, "operador@iribarren.test");
  await page.goto("/configuracion");
  await prohibido(page);
});

test("la raíz lleva al tablero sin pantalla en blanco", async ({ page }) => {
  await ingresar(page, "admin@iribarren.test");
  await page.goto("/");
  await expect(page).toHaveURL(/\/tablero$/);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
});
