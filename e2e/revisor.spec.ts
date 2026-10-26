import { expect, test, type Page } from "@playwright/test";
import { ingresar } from "./utilidades";

/*
 * Las dos máquinas del Revisor (decisión del cliente, 23-10-2026): la opinión solo se publica o
 * se despublica; la propuesta formal tiene seguimiento y lleva su ubicación en el mapa. Los
 * aportes son uno solo por alcaldía: las pruebas que cambian estados corren en escritorio y lo
 * dejan como estaba.
 */

const confirmar = (page: Page) =>
  page.getByRole("dialog").getByRole("button", { name: "Confirmar" }).click();

test("opinión: se publica y se despublica, sin revisión ni rechazo", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio", "Cambia el estado de un aporte compartido");
  test.slow();
  await ingresar(page, "revisor@iribarren.test");
  await page.goto("/participaciones/IRI-2026-0042");
  await expect(page.getByRole("heading", { name: "Publicación de la opinión" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Rechazar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Marcar como verificada" })).toHaveCount(0);

  await page.getByRole("button", { name: "Publicar en el portal" }).click();
  await confirmar(page);
  await expect(page.getByText("Aporte publicado en el portal.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Despublicar" })).toBeVisible();

  await page.getByRole("button", { name: "Despublicar" }).click();
  await confirmar(page);
  await expect(page.getByText("Aporte despublicado: ya no se ve en el portal.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publicar en el portal" })).toBeVisible();
});

test("opinión sin nombre autorizado: no se puede publicar", async ({ page }) => {
  await ingresar(page, "revisor@iribarren.test");
  await page.goto("/participaciones/IRI-2026-0018");
  await expect(page.getByRole("button", { name: "Publicar en el portal" })).toBeDisabled();
  await expect(page.getByText(/no autorizó mostrar su nombre/)).toBeVisible();
});

test("propuesta formal: muestra el mapa y se despublica y se vuelve a publicar", async ({
  page,
}, info) => {
  test.slow();
  await ingresar(page, "revisor@iribarren.test");
  await page.goto("/participaciones/IRI-2026-0015");
  await expect(page.getByRole("heading", { name: "Decisión sobre la propuesta" })).toBeVisible();
  const ubicacion = page.getByRole("region", { name: "Ubicación" });
  await expect(ubicacion.locator(".leaflet-container")).toBeVisible({ timeout: 30_000 });
  await expect(ubicacion.getByRole("link", { name: /Abrir en Google Maps/ })).toHaveAttribute(
    "href",
    /google\.com\/maps\?q=10\.14/,
  );
  await expect(page.getByText(/En el portal:/)).toBeVisible();

  if (info.project.name !== "escritorio") return;
  await page.getByRole("button", { name: "Despublicar" }).click();
  await confirmar(page);
  await expect(page.getByText("Aporte despublicado: ya no se ve en el portal.")).toBeVisible();
  await page.getByRole("button", { name: "Publicar en el portal" }).click();
  await confirmar(page);
  await expect(page.getByText("Aporte publicado en el portal.")).toBeVisible();
});
