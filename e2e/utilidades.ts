import { expect, type Page } from "@playwright/test";

/** Contraseña de las cuentas de demostración (src/lib/plataforma/fixtures.ts). */
export const CONTRASENA_DEMO = "Plataforma#2026";

export async function ingresar(page: Page, correo: string, contrasena = CONTRASENA_DEMO) {
  await page.goto("/ingresar");
  await page.getByLabel("Correo institucional").fill(correo);
  await page.locator("#contrasena").fill(contrasena);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/ingresar"));
}

/** La página 403 del panel. */
export const prohibido = (page: Page) =>
  expect(page.getByRole("heading", { name: "Esta sección no es para tu rol" })).toBeVisible();

/** Abre el menú del teléfono si la línea no está visible. */
export async function abrirMenuSiHaceFalta(page: Page) {
  const boton = page.getByRole("button", { name: "Abrir el menú" });
  if (await boton.isVisible()) await boton.click();
}
