import { expect, test } from "@playwright/test";
import { esperarMarca, ingresar } from "./utilidades";

/*
 * Backlog 2.6: el administrador de una alcaldía nueva completa el asistente (logo con recorte,
 * colores con chequeo de contraste, lema y confirmación) y el panel toma su marca.
 * Cada tamaño usa su propia alcaldía y la devuelve a «pendiente» antes de empezar.
 */
const POR_PROYECTO: Record<string, string> = {
  escritorio: "crespo",
  tablet: "moran",
  movil: "urdaneta",
};

const LOGO = "public/marca/isotipo-256px.png";

// Las pruebas comparten el `pnpm dev` de quien desarrolla: al terminar, la alcaldía vuelve a
// «pendiente» para que el asistente se pueda probar a mano con las cuentas de demostración.
test.afterEach(async ({ page }, info) => {
  const id = POR_PROYECTO[info.project.name] ?? "crespo";
  await page.request.delete(`/api/desarrollo/onboarding/${id}`);
});

test("completa el asistente y el panel toma la marca", async ({ page }, info) => {
  test.slow();
  const id = POR_PROYECTO[info.project.name] ?? "crespo";
  await ingresar(page, `admin@${id}.test`);
  expect((await page.request.delete(`/api/desarrollo/onboarding/${id}`)).status()).toBe(204);

  // Sin logo ni colores no se puede saltar al resumen.
  await page.goto("/onboarding?paso=resumen");
  await expect(page).toHaveURL(/paso=logo/, { timeout: 30_000 });
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/paso=logo/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Sube el logo de la alcaldía" })).toBeVisible();

  await test.step("logo con recorte", async () => {
    // Esperar la hidratación: antes, el cambio del archivo no llega a React.
    await page.waitForLoadState("networkidle");
    await page.locator("#logo").setInputFiles(LOGO);
    await expect(page.getByLabel("Acercar")).toBeVisible();
    await page.getByLabel("Acercar").fill("1.4");
    await page.getByRole("button", { name: "Guardar y continuar" }).click();
    await expect(page).toHaveURL(/paso=colores/, { timeout: 30_000 });
  });

  let sugerido = "";
  await test.step("el espectro elige el color donde se hace clic", async () => {
    const espectro = page.getByRole("slider", { name: "Color primario: saturación y brillo" });
    const caja = (await espectro.boundingBox())!;
    await page.mouse.click(caja.x + caja.width * 0.85, caja.y + caja.height * 0.2);
    await expect(page.locator("#colorPrimario")).not.toHaveValue("#1F3864");
    await expect(page.locator("#colorPrimario")).toHaveValue(/^#[0-9A-F]{6}$/);
  });

  await test.step("un color sin contraste no pasa y se usa el sugerido", async () => {
    await page.locator("#colorPrimario").fill("#ECA52B");
    await expect(page.getByText("No cumple el contraste AA")).toBeVisible();
    const boton = page.getByRole("button", { name: /Usar el tono sugerido/ });
    sugerido = (await boton.textContent())!.match(/#[0-9A-F]{6}/)![0];
    await boton.click();
    await expect(page.getByText("Cumple el contraste AA")).toBeVisible();
    await expect(page.locator("#colorPrimario")).toHaveValue(sugerido);
    await page.getByRole("button", { name: "Guardar y continuar" }).click();
    await expect(page).toHaveURL(/paso=lema/, { timeout: 30_000 });
  });

  await test.step("lema y resumen", async () => {
    await page.getByLabel(/Lema/).fill("Construyamos juntos la ciudad");
    await expect(page.getByText("29 / 120")).toBeVisible();
    await page.getByRole("button", { name: "Guardar y continuar" }).click();
    await expect(page).toHaveURL(/paso=resumen/, { timeout: 30_000 });
    await expect(page.getByText(sugerido).first()).toBeVisible();
    await expect(page.getByText("Construyamos juntos la ciudad").first()).toBeVisible();
  });

  await test.step("confirmar activa el panel con la marca", async () => {
    await page.getByRole("button", { name: "Confirmar y activar el panel" }).click();
    await expect(page).toHaveURL(/\/tablero$/, { timeout: 30_000 });
    await expect(page.getByText("Listo: el panel ya usa la marca de tu alcaldía.")).toBeVisible();
    await esperarMarca(page, sugerido);
    await expect(page.locator('img[src^="/logos/"]').first()).toBeAttached();
    // «Atrás» ya no vuelve a abrir el asistente.
    await page.goBack();
    await expect(page.getByRole("button", { name: "Confirmar y activar el panel" })).toHaveCount(0);
  });
});
