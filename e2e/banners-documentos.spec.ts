import { expect, test, type Page } from "@playwright/test";
import { ingresar } from "./utilidades";

/*
 * Backlog 2.9 (segunda parte): banners con vigencia y orden, y repositorio de documentos con
 * versiones. Cada prueba crea lo suyo y lo borra; los ejemplos quedan como estaban.
 */

const creados: [string, string][] = [];

test.afterEach(async ({ page }) => {
  for (const [tipo, id] of creados.splice(0))
    await page.request.delete(`/api/desarrollo/contenido/${tipo}/${id}`);
});

const confirmar = (page: Page, boton: string) =>
  page.getByRole("dialog").getByRole("button", { name: boton }).click();

test("banner: valida, se crea programado, se ordena, se edita y se elimina", async ({
  page,
}, info) => {
  // El orden del carrusel es uno solo por alcaldía: esta prueba corre en un único tamaño.
  test.skip(info.project.name !== "escritorio", "El orden se prueba en escritorio");
  test.slow();
  const titulo = "Prueba E2E de banner";
  await ingresar(page, "operador@iribarren.test");
  await page.goto("/contenido/banners/nuevo");
  await page.waitForLoadState("networkidle");

  await test.step("sin datos no se guarda", async () => {
    await page.getByRole("button", { name: "Crear banner" }).click();
    const resumen = page.getByRole("alert").filter({ hasText: "Revisa" });
    await expect(resumen).toBeVisible({ timeout: 30_000 });
    await expect(resumen.getByRole("link", { name: "Título" })).toBeVisible();
  });

  await test.step("se crea con fecha de inicio futura", async () => {
    await page.locator("#titulo").fill(titulo);
    await page.locator("#texto").fill("Texto del banner de prueba.");
    await page.locator("#enlace-etiqueta").fill("Participar");
    await page.locator("#enlace-href").fill("/participa");
    await page.getByRole("radio", { name: "Claro cálido" }).check({ force: true });
    await page.locator("#vigencia-desde").fill("2099-01-01");
    await page.getByRole("button", { name: "Crear banner" }).click();
    await page.waitForURL(/\/contenido\/banners$/, { timeout: 30_000 });
    await expect(page.getByText("Banner creado al final del carrusel.")).toBeVisible();
    const fila = page.getByRole("listitem").filter({ hasText: titulo });
    await expect(fila).toContainText("Programado");
    const href = await fila.getByRole("link", { name: /Editar/ }).getAttribute("href");
    creados.push(["banners", href!.split("/").at(-1)!]);
  });

  await test.step("sube un puesto y el orden se guarda", async () => {
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: `Subir «${titulo}»` }).click();
    await expect(page.getByText("Orden guardado: así se verán en el carrusel.")).toBeVisible();
    await page.reload();
    const titulos = await page.getByRole("listitem").locator("h2").allTextContents();
    expect(titulos.at(-2)).toBe(titulo);
  });

  await test.step("se edita y se elimina", async () => {
    await page
      .getByRole("listitem")
      .filter({ hasText: titulo })
      .getByRole("link", { name: /Editar/ })
      .click();
    await expect(page.locator("#titulo")).toHaveValue(titulo, { timeout: 30_000 });
    await page.locator("#texto").fill("Texto editado.");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await page.waitForURL(/\/contenido\/banners$/, { timeout: 30_000 });
    await expect(page.getByText("Banner actualizado.")).toBeVisible();
    await page
      .getByRole("listitem")
      .filter({ hasText: titulo })
      .getByRole("link", { name: /Editar/ })
      .click();
    await page.getByRole("button", { name: "Eliminar banner" }).click();
    await confirmar(page, "Eliminar");
    await page.waitForURL(/\/contenido\/banners$/, { timeout: 30_000 });
    await expect(page.getByText("Banner eliminado.")).toBeVisible();
    await expect(page.getByRole("heading", { name: titulo })).toHaveCount(0);
  });
});

test("documento: se sube, recibe una versión nueva, se oficializa y se elimina", async ({
  page,
}, info) => {
  test.slow();
  const titulo = `Prueba E2E de documento ${info.project.name}`;
  await ingresar(page, "operador@iribarren.test");
  await page.goto("/contenido/documentos/nuevo");
  await page.waitForLoadState("networkidle");

  await test.step("subir el PDF con su ficha", async () => {
    await page
      .locator("#archivo")
      .setInputFiles("public/ejemplos/minuta-mesa-tecnica-catedral-ejemplo.pdf");
    await expect(page.getByText(/minuta-mesa-tecnica/)).toBeVisible({ timeout: 30_000 });
    await page.locator("#titulo").fill(titulo);
    await page.locator("#descripcion").fill("Documento subido por la prueba.");
    await page.getByRole("combobox", { name: "Categoría" }).click();
    await page.getByRole("option", { name: "Minutas" }).click();
    await page.getByRole("button", { name: "Subir documento" }).click();
    // La ficha nueva, no «/nuevo».
    await page.waitForURL(/\/contenido\/documentos\/(?!nuevo$)[\w-]+$/, { timeout: 30_000 });
    creados.push(["documentos", page.url().split("/").at(-1)!]);
    await expect(page.getByText("Documento subido: versión 1.0.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible();
  });

  await test.step("nueva versión mayor", async () => {
    await page.getByRole("button", { name: "Nueva versión" }).click();
    const dialogo = page.getByRole("dialog");
    await dialogo
      .locator("#archivo")
      .setInputFiles("public/ejemplos/plan-de-trabajo-pdul-ejemplo.pdf");
    await expect(dialogo.getByText(/plan-de-trabajo/)).toBeVisible({ timeout: 30_000 });
    await dialogo.getByRole("radio", { name: /Cambio de fondo/ }).check();
    await dialogo.locator("#nota").fill("Se reorganizó el documento.");
    await dialogo.getByRole("button", { name: "Publicar versión 2.0" }).click();
    await expect(page.getByText("Versión 2.0 publicada como vigente.")).toBeVisible();
    const versiones = page.getByRole("region", { name: "Versiones" });
    await expect(versiones.getByText("Versión 2.0", { exact: true })).toBeVisible();
    await expect(versiones.getByText("Versión 1.0", { exact: true })).toBeVisible();
  });

  await test.step("oficializar y eliminar", async () => {
    await page.getByRole("radio", { name: "Oficial" }).check();
    await page.getByRole("button", { name: "Guardar ficha" }).click();
    await expect(page.getByText("Datos del documento guardados.")).toBeVisible();
    await page.getByRole("button", { name: "Eliminar documento" }).click();
    await confirmar(page, "Eliminar");
    await page.waitForURL(/\/contenido\/documentos$/, { timeout: 30_000 });
    await expect(page.getByText("Documento eliminado del repositorio.")).toBeVisible();
    await expect(page.getByRole("link", { name: titulo })).toHaveCount(0);
  });
});

test("el Revisor no entra a banners ni a documentos", async ({ page }) => {
  await ingresar(page, "revisor@iribarren.test");
  for (const ruta of ["/contenido/banners", "/contenido/documentos/nuevo"]) {
    await page.goto(ruta);
    await expect(
      page.getByRole("heading", { name: "Esta sección no es para tu rol" }),
    ).toBeVisible();
  }
});
