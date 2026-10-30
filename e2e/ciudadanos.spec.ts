import { expect, test } from "@playwright/test";
import { ingresar } from "./utilidades";

/*
 * Ciudadanos (guía R13): la cola de bajas pedidas y anonimizar la cuenta, y suspender con motivo
 * obligatorio. Anonimizar no se puede deshacer y el almacén es uno por servidor: esa prueba corre
 * solo en escritorio y acepta que la cuenta ya esté anonimizada (servidor reutilizado).
 */

test("la baja pedida se atiende anonimizando la cuenta", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio", "Anonimizar no se puede deshacer");
  test.slow();
  await ingresar(page, "admin@iribarren.test");
  await page.goto("/ciudadanos");
  await page.getByRole("link", { name: /Bajas pedidas/ }).click();
  await expect(page).toHaveURL(/baja=solicitada/);

  const fila = page.getByRole("link", { name: "Gabriel Torrealba" });
  if ((await fila.count()) === 0) {
    // Ya se anonimizó en una corrida anterior con el mismo servidor.
    await page.goto("/ciudadanos?baja=anonimizada");
    await expect(page.getByRole("link", { name: "Cuenta anonimizada" }).first()).toBeVisible();
    return;
  }
  await fila.click();
  await page.waitForURL(/\/ciudadanos\/c-/);
  await expect(page.getByText(/Pidió la baja el/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Anonimizar la cuenta" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByText(/Sus aportes se conservan con su folio/)).toBeVisible();
  await dialogo.getByRole("button", { name: "Anonimizar", exact: true }).click();
  // La ficha lo confirma (el botón y su aviso desaparecen con la baja ya atendida).
  await expect(page.getByText(/sus aportes se conservan con su folio/)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Cuenta anonimizada" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Suspender membresía/ })).toHaveCount(0);
});

test("suspender pide el motivo", async ({ page }) => {
  test.slow();
  await ingresar(page, "admin@iribarren.test");
  await page.goto("/ciudadanos?q=rodriguez");
  // Se abre la ficha por su dirección: un clic durante la primera compilación se puede perder.
  const ficha = await page
    .getByRole("link", { name: /Rodr[ií]guez/ })
    .first()
    .getAttribute("href");
  await page.goto(ficha!);
  // Se espera la ficha antes de ver qué botón tiene (la primera vez, Next la compila).
  await expect(page.getByRole("heading", { level: 1, name: /Rodr[ií]guez/ })).toBeVisible({
    timeout: 15_000,
  });
  const suspender = page.getByRole("button", { name: "Suspender membresía" });
  // Otra corrida pudo dejarla suspendida: entonces se ve reactivar.
  if ((await suspender.count()) === 0) {
    await expect(page.getByRole("button", { name: "Reactivar membresía" })).toBeVisible();
    return;
  }
  const dialogo = page.getByRole("dialog");
  // Un clic antes de que la página se hidrate no abre el diálogo: se reintenta.
  await expect(async () => {
    await suspender.click();
    await expect(dialogo).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await dialogo.getByLabel("Motivo").fill("corto");
  await dialogo.getByRole("button", { name: "Suspender" }).click();
  await expect(dialogo.getByText(/de 10 a 500 caracteres/).first()).toBeVisible();
  await dialogo.getByRole("button", { name: "Cancelar" }).click();
});
