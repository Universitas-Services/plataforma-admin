import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ingresar } from "./utilidades";

/* Backlog 2.15: WCAG 2.1 A y AA con axe-core, en escritorio, tablet y 375 px. */

test.use({ reducedMotion: "reduce" });

async function auditar(page: Page) {
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".skeleton")).toHaveCount(0);
  await expect(page.locator('main img[alt=""]:not([aria-hidden])')).toHaveCount(0);
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude("nextjs-portal")
    .analyze();
  const resumen = violations.map((v) => ({
    regla: v.id,
    nodos: v.nodes.map((n) => `${n.target.join(" ")} → ${n.any[0]?.message ?? n.failureSummary}`),
  }));
  expect(resumen, JSON.stringify(resumen, null, 2)).toEqual([]);
}

test.describe("acceso", () => {
  for (const ruta of [
    "/ingresar",
    "/recuperar",
    "/restablecer?token=no-existe",
    "/invitacion?token=demo-invitacion",
    "/invitacion?token=demo-invitacion-vencida",
  ]) {
    test(ruta, async ({ page }) => {
      await page.goto(ruta);
      await auditar(page);
    });
  }

  test("ingreso con error", async ({ page }) => {
    await page.goto("/ingresar");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();
    await auditar(page);
  });
});

const POR_ROL: [string, string[]][] = [
  [
    "revisor@iribarren.test",
    [
      "/tablero",
      "/participaciones",
      "/participaciones/IRI-2026-0031",
      "/participaciones/IRI-2026-0036",
      "/ciudadanos",
    ],
  ],
  ["admin@iribarren.test", ["/tablero", "/contenido", "/equipo", "/configuracion", "/bitacora"]],
  [
    "operador@iribarren.test",
    [
      "/tablero",
      "/bitacora",
      "/contenido/noticias",
      "/contenido/noticias?estado=BORRADOR&formato=IMAGEN",
      "/contenido/noticias?q=no-existe-nada",
      "/contenido/noticias/n-ejemplo-mesas",
      "/contenido/noticias/n-ejemplo-galeria",
      "/contenido/noticias/n-ejemplo-video",
      "/contenido/noticias/n-ejemplo-documento",
      "/contenido/noticias/n-ejemplo-puntos",
      "/contenido/inicio",
      "/contenido/proceso",
      "/contenido/documentos",
      "/contenido/documentos?visibilidad=oculto",
      "/contenido/documentos/d-ejemplo-plan",
      "/contenido/documentos/nuevo",
    ],
  ],
  ["superadmin@plataforma.test", ["/tablero", "/configuracion", "/contenido/proceso"]],
];

test.describe("panel", () => {
  for (const [correo, rutas] of POR_ROL) {
    test(correo, async ({ page }) => {
      test.slow();
      await ingresar(page, correo);
      for (const ruta of rutas) {
        await test.step(ruta, async () => {
          await page.goto(ruta);
          await auditar(page);
        });
      }
    });
  }

  test("404 dentro del panel", async ({ page }) => {
    await ingresar(page, "revisor@iribarren.test");
    await page.goto("/esta-pagina-no-existe");
    await expect(page.getByRole("heading", { name: "Esta estación no existe" })).toBeVisible();
    await auditar(page);
  });

  test("menú de usuario y diálogo de contraseña abiertos", async ({ page }) => {
    await ingresar(page, "revisor@iribarren.test");
    await page.getByRole("button", { name: "Menú de la cuenta" }).click();
    await auditar(page);
    await page.getByRole("button", { name: "Cambiar contraseña" }).click();
    await expect(page.getByRole("dialog", { name: "Cambiar contraseña" })).toBeVisible();
    await auditar(page);
  });

  test("editor de noticias: errores, diálogos y vista previa", async ({ page }) => {
    test.slow();
    await ingresar(page, "operador@iribarren.test");
    await page.goto("/contenido/noticias/n-ejemplo-incompleta");
    await expect(page.locator("#cuerpo")).toBeVisible({ timeout: 30_000 });
    // Solo se abren diálogos y se intenta publicar: el ejemplo sigue como borrador.
    await page.getByRole("button", { name: "Publicar ahora" }).click();
    await auditar(page);
    await page.getByRole("dialog").getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "falta" })).toBeVisible();
    await auditar(page);
    await page.getByRole("button", { name: "Programar" }).click();
    await auditar(page);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Vista previa" }).click();
    await auditar(page);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Enlace" }).click();
    await auditar(page);
  });

  test("documento: diálogo de nueva versión", async ({ page }) => {
    await ingresar(page, "operador@iribarren.test");
    await page.goto("/contenido/documentos/d-ejemplo-plan");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Nueva versión" }).click();
    await expect(page.getByRole("dialog", { name: "Nueva versión" })).toBeVisible();
    await auditar(page);
  });
});
