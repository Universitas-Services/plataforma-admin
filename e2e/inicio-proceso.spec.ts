import { expect, test } from "@playwright/test";
import { ingresar } from "./utilidades";

/*
 * Backlog de refactorización 1.11: lo que el Inicio del portal muestra elegido por la alcaldía
 * (mensaje del alcalde y anuncios) y el termómetro del proceso. La selección es una sola por
 * alcaldía: la prueba corre en escritorio y deja el orden como estaba.
 */

test("Inicio: los anuncios se reordenan, se guardan y se restauran", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio", "La selección es una sola por alcaldía");
  test.slow();
  await ingresar(page, "operador@iribarren.test");
  await page.goto("/contenido/inicio");
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("combobox", { name: "Noticia del mensaje" })).toContainText(
    "Ejemplo: mensaje del alcalde para el Inicio",
  );
  const lista = page.getByRole("list", { name: "Noticias de anuncios, en orden" });
  const titulos = async () =>
    (await lista
      .getByRole("button", { name: /^Bajar/ })
      .evaluateAll((bs) =>
        bs.map((b) => b.getAttribute("aria-label")!.replace(/^Bajar «|»$/g, "")),
      )) as string[];
  const antes = await titulos();
  expect(antes.length).toBeGreaterThan(1);
  const guardar = page.getByRole("button", { name: "Guardar el Inicio" });
  await expect(guardar).toBeDisabled();

  await test.step("bajar el primero y guardar", async () => {
    await page.getByRole("button", { name: `Bajar «${antes[0]}»` }).click();
    await guardar.click();
    await expect(
      page.getByText("Inicio actualizado: el portal ya muestra tu selección."),
    ).toBeVisible();
    await page.reload();
    await page.waitForLoadState("networkidle");
    expect((await titulos()).slice(0, 2)).toEqual([antes[1], antes[0]]);
  });

  await test.step("restaurar el orden", async () => {
    await page.getByRole("button", { name: `Subir «${antes[0]}»` }).click();
    await guardar.click();
    await expect(
      page.getByText("Inicio actualizado: el portal ya muestra tu selección."),
    ).toBeVisible();
    await page.reload();
    await page.waitForLoadState("networkidle");
    expect(await titulos()).toEqual(antes);
  });
});

test("Proceso: el Operador ve el editor de fases y el termómetro", async ({ page }) => {
  await ingresar(page, "operador@iribarren.test");
  await page.goto("/contenido/proceso");
  await expect(page.getByRole("link", { name: "Proceso", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(
    page.getByRole("list", { name: "Vista previa del termómetro del portal" }),
  ).toBeVisible();
});

test("el Revisor no entra a Proceso", async ({ page }) => {
  await ingresar(page, "revisor@iribarren.test");
  await page.goto("/contenido/proceso");
  await expect(page.getByRole("heading", { name: "Esta sección no es para tu rol" })).toBeVisible();
});
