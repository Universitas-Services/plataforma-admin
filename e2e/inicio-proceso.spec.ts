import { expect, test } from "@playwright/test";
import { ingresar } from "./utilidades";

/*
 * Backlog de refactorización 1.11: lo que el Inicio del portal muestra elegido por la alcaldía
 * (mensaje del alcalde y anuncios) y el termómetro del proceso. La selección es una sola por
 * alcaldía: la prueba corre en escritorio y deja el orden como estaba.
 */

test("Inicio: el mensaje del alcalde se quita, se guarda y se restaura", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio", "El mensaje es uno solo por alcaldía");
  test.slow();
  await ingresar(page, "operador@iribarren.test");
  await page.goto("/contenido/inicio");
  await page.waitForLoadState("networkidle");

  const selector = page.getByRole("combobox", { name: "Noticia del mensaje" });
  const ejemplo = "Ejemplo: mensaje del alcalde para el Inicio";
  await expect(selector).toContainText(ejemplo);
  // Escritorio: el botón de guardar está junto al mensaje (en el teléfono va en la barra fija).
  const guardar = page.getByRole("button", { name: "Guardar el mensaje" }).first();
  const elegir = async (opcion: string | RegExp) => {
    await selector.click();
    await page.getByRole("option", { name: opcion }).click();
    await guardar.click();
    await expect(
      page.getByText("Inicio actualizado: el portal ya muestra tu selección."),
    ).toBeVisible();
    await page.reload();
    await page.waitForLoadState("networkidle");
  };

  await test.step("quitar el mensaje", async () => {
    await elegir(/^Sin mensaje/);
    await expect(selector).toContainText("Sin mensaje");
  });

  await test.step("volver a elegirlo", async () => {
    await elegir(new RegExp(`^${ejemplo}`));
    await expect(selector).toContainText(ejemplo);
  });
});

test("Proceso: el estado de una fase siguiente se elige y se restaura", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio", "El proceso es uno solo por alcaldía");
  test.slow();
  await ingresar(page, "operador@iribarren.test");
  await page.goto("/contenido/proceso");
  await page.waitForLoadState("networkidle");

  const editar = async (estado: string) => {
    await page.getByRole("button", { name: "Editar «Formulación»" }).click();
    const dialogo = page.getByRole("dialog");
    await dialogo.getByRole("combobox", { name: "Cómo se ve mientras no le toque" }).click();
    await page.getByRole("option", { name: estado, exact: true }).click();
    await dialogo.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Fase actualizada.")).toBeVisible();
  };

  await editar("Futuro");
  const fila = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("button", { name: "Editar «Formulación»" }) });
  await expect(fila).toContainText("Futuro");
  await editar("Pendiente");
});

test("Proceso: la fase actual no ofrece eliminarse", async ({ page }) => {
  await ingresar(page, "operador@iribarren.test");
  await page.goto("/contenido/proceso");
  const actual = page.getByRole("listitem").filter({ hasText: "Fase actual" });
  await expect(actual.getByRole("button", { name: /^Eliminar/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Eliminar «Diagnóstico»" })).toBeVisible();
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
