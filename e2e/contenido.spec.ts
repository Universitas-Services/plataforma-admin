import { expect, test, type Page } from "@playwright/test";
import { ingresar, prohibido } from "./utilidades";

/*
 * Backlog 2.9 (primera parte): el Operador crea, completa, programa, publica, despublica y
 * elimina noticias. Cada prueba trabaja con su propia noticia (título distinto por tamaño de
 * pantalla) y la borra al terminar, para no tocar los ejemplos del `pnpm dev` compartido.
 */

const creadas: string[] = [];

test.afterEach(async ({ page }) => {
  for (const id of creadas.splice(0)) await page.request.delete(`/api/desarrollo/noticias/${id}`);
});

async function nuevaNoticia(page: Page) {
  await page.goto("/contenido/noticias");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Nueva noticia" }).click();
  await page.waitForURL(/\/contenido\/noticias\/[\w-]+$/, { timeout: 30_000 });
  const id = page.url().split("/").at(-1)!;
  creadas.push(id);
  await expect(page.getByRole("heading", { name: "Noticia sin título" })).toBeVisible();
  // Esperar la hidratación (el editor de texto se monta en el cliente).
  await expect(page.locator("#cuerpo")).toBeVisible({ timeout: 30_000 });
  return id;
}

async function datosBasicos(page: Page, titulo: string) {
  await page.locator("#titulo").fill(titulo);
  await page.locator("#resumen").fill("Resumen de una noticia de prueba.");
  await page.getByRole("combobox", { name: "Categoría" }).click();
  await page.getByRole("option", { name: "Mesas de trabajo" }).click();
  await page.locator("#cuerpo").click();
  await page.keyboard.type("Cuerpo escrito en la prueba.");
}

async function confirmar(page: Page, boton: RegExp | string) {
  await page.getByRole("dialog").getByRole("button", { name: boton }).click();
}

test("el botón a medio llenar no salta ni marca error al autoguardar", async ({ page }) => {
  test.slow();
  await ingresar(page, "operador@iribarren.test");
  await nuevaNoticia(page);
  await page.getByRole("button", { name: "Añadir un botón" }).click();
  await page.locator("#boton-texto").click();
  await page.locator("#boton-href").click();
  await page.locator("#boton-texto").fill("Inscríbete");
  await page.locator("#titulo").click();
  await expect(page.getByText(/^Guardado /).first()).toBeVisible({ timeout: 30_000 });
  // Sin el resumen de errores ni «No se pudo guardar»: el borrador admite el botón incompleto.
  await expect(page.getByText(/Para publicar o programar, falta/)).toHaveCount(0);
  await expect(page.getByText("No se pudo guardar")).toHaveCount(0);
  await expect(page.locator("#titulo")).toBeFocused();
});

test("crea una noticia con imagen, se guarda sola y se programa", async ({ page }, info) => {
  test.slow();
  const titulo = `Prueba E2E imagen ${info.project.name}`;
  await ingresar(page, "operador@iribarren.test");
  await nuevaNoticia(page);

  await test.step("formato imagen con portada recortada y texto alternativo", async () => {
    await page.getByRole("radio", { name: "Imagen" }).check({ force: true });
    await datosBasicos(page, titulo);
    await page.locator("#portada").setInputFiles("public/ejemplos/teatro-juares.jpg");
    await page.getByRole("button", { name: "Usar este encuadre" }).click();
    await expect(page.locator("#portada-alt")).toBeVisible({ timeout: 30_000 });
    await page.locator("#portada-alt").fill("Fachada del Teatro Juares");
  });

  await test.step("autoguardado al salir del campo", async () => {
    await page.locator("#parroquia").click();
    await page.locator("#parroquia").fill("Catedral");
    await page.locator("#titulo").click();
    await expect(page.getByText(/^Guardado /).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible();
  });

  await test.step("programar para mañana", async () => {
    await page.getByRole("button", { name: "Programar" }).click();
    await expect(page.locator("#publicarEl-hora")).toContainText("8:00 a. m.");
    await confirmar(page, "Programar");
    await expect(page.getByText("Noticia programada.")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/^Se publicará sola el/)).toBeVisible();
  });

  await test.step("aparece en el listado filtrado", async () => {
    await page.goto(`/contenido/noticias?estado=PROGRAMADO&q=${encodeURIComponent(titulo)}`);
    await expect(page.getByRole("link", { name: titulo }).first()).toBeVisible();
    await expect(page.getByText("1 noticia en esta vista")).toBeVisible();
  });

  await test.step("vuelve a borrador y se elimina", async () => {
    await page.getByRole("link", { name: titulo }).first().click();
    await expect(page.locator("#cuerpo")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Volver a borrador" }).click();
    await confirmar(page, "Volver a borrador");
    await expect(page.getByRole("button", { name: "Eliminar borrador" })).toBeVisible();
    await page.getByRole("button", { name: "Eliminar borrador" }).click();
    await confirmar(page, "Eliminar");
    await page.waitForURL(/\/contenido\/noticias$/, { timeout: 30_000 });
    await expect(page.getByText("Borrador eliminado.")).toBeVisible();
    await expect(page.getByRole("link", { name: titulo })).toHaveCount(0);
  });
});

test("publicar exige lo que falta; luego se publica y se despublica", async ({ page }, info) => {
  test.slow();
  const titulo = `Prueba E2E texto ${info.project.name}`;
  await ingresar(page, "operador@iribarren.test");
  await nuevaNoticia(page);

  await page.getByRole("button", { name: "Publicar ahora" }).click();
  await confirmar(page, "Publicar");
  const resumen = page.getByRole("alert").filter({ hasText: "Para publicar o programar" });
  await expect(resumen).toBeVisible();
  await expect(resumen.getByRole("link", { name: "Título" })).toBeVisible();

  await datosBasicos(page, titulo);
  await page.getByRole("button", { name: "Publicar ahora" }).click();
  await confirmar(page, "Publicar");
  await expect(page.getByText("Noticia publicada en el portal.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Publicada", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Despublicar" }).click();
  await confirmar(page, "Despublicar");
  await expect(page.getByText("Noticia despublicada: ya no se ve en el portal.")).toBeVisible();
  await expect(page.getByText("Despublicada", { exact: true }).first()).toBeVisible();
});

test("el Revisor no entra a Contenido", async ({ page }) => {
  await ingresar(page, "revisor@iribarren.test");
  await page.goto("/contenido/noticias");
  await prohibido(page);
  await page.goto("/contenido/noticias/n-ejemplo-mesas");
  await prohibido(page);
});

test("una noticia de otra alcaldía no existe para esta", async ({ page }) => {
  await ingresar(page, "operador@iribarren.test");
  await page.goto("/contenido/noticias/n-ejemplo-jimenez");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /fuera de servicio|no existe/i,
  );
});
