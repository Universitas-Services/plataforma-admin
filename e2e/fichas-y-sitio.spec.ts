import { expect, test } from "@playwright/test";
import { ingresar, prohibido } from "./utilidades";

/*
 * Las fichas llevan el id en la consulta (?id=), para que Netlify no responda 500 con los UUID de
 * la API; las direcciones viejas redirigen. Datos del sitio (R17) es del Administrador.
 */

test("las fichas abren por la dirección nueva y la vieja redirige", async ({ page }) => {
  await ingresar(page, "admin@iribarren.test");
  await page.goto("/ciudadanos");
  const ficha = await page.locator('a[href^="/ciudadanos/ficha?id="]').first().getAttribute("href");
  expect(ficha).toBeTruthy();
  await page.goto(ficha!);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });

  const id = new URL(ficha!, "http://x").searchParams.get("id")!;
  await page.goto(`/ciudadanos/${id}`);
  await expect(page).toHaveURL(new RegExp(`/ciudadanos/ficha\\?id=${id}$`));

  await page.goto("/contenido/noticias");
  const noticia = await page
    .locator('a[href^="/contenido/noticias/editar?id="]')
    .first()
    .getAttribute("href");
  const idNoticia = new URL(noticia!, "http://x").searchParams.get("id")!;
  await page.goto(`/contenido/noticias/${idNoticia}`);
  await expect(page).toHaveURL(/\/contenido\/noticias\/editar\?id=/);
});

test("el Administrador guarda los datos del sitio", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio", "Cambia datos compartidos de la simulación");
  test.slow();
  await ingresar(page, "admin@iribarren.test");
  await page.goto("/configuracion");
  await page.getByRole("link", { name: /Datos del sitio/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Datos del sitio" })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByLabel("Teléfono").fill("0251-2310000");
  await page.getByLabel("Correo").fill("no-es-correo");
  await page.getByRole("button", { name: "Guardar datos del sitio" }).click();
  await expect(page.getByText("Escribe un correo válido.")).toBeVisible();
  await page.getByLabel("Correo").fill("planificacion@iribarren.test");
  await page.getByRole("button", { name: "Guardar datos del sitio" }).click();
  await expect(page.getByText(/Datos del sitio guardados/)).toBeVisible();
});

test("el Operador no entra a Datos del sitio", async ({ page }) => {
  await ingresar(page, "operador@iribarren.test");
  await page.goto("/configuracion/sitio");
  await prohibido(page);
});
