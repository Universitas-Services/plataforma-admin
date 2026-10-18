import { expect, test, type Page } from "@playwright/test";
import { ingresar } from "./utilidades";

/* Sin scroll horizontal en ninguna anchura, de 320 px a monitores grandes (backlog 2.15). */

const ANCHOS = [320, 375, 768, 1024, 1280, 1920];

async function sinDesborde(page: Page, ruta: string) {
  await page.goto(ruta);
  await page.waitForLoadState("networkidle");
  const desborde = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(desborde, `${ruta} desborda ${desborde}px`).toBeLessThanOrEqual(0);
}

test.describe("responsive", () => {
  for (const ancho of ANCHOS) {
    test(`${ancho} px`, async ({ page }, info) => {
      // Las anchuras se fijan aquí: basta con un proyecto.
      test.skip(info.project.name !== "escritorio", "Solo en escritorio");
      test.slow();
      await page.setViewportSize({ width: ancho, height: 900 });
      await sinDesborde(page, "/ingresar");
      await ingresar(page, "revisor@iribarren.test");
      for (const ruta of [
        "/tablero",
        "/participaciones",
        "/participaciones?estado=APROBADA",
        "/no-existe",
      ])
        await sinDesborde(page, ruta);
      await page.context().clearCookies();
      await ingresar(page, "admin@palavecino.test");
      for (const paso of ["logo", "colores", "lema"])
        await sinDesborde(page, `/onboarding?paso=${paso}`);
      await page.context().clearCookies();
      await ingresar(page, "superadmin@plataforma.test");
      for (const ruta of ["/plataforma", "/alcaldia", "/plataforma/representantes"])
        await sinDesborde(page, ruta);
      await page.context().clearCookies();
      await ingresar(page, "operador@iribarren.test");
      for (const ruta of [
        "/contenido/noticias",
        "/contenido/noticias/n-ejemplo-mesas",
        "/contenido/noticias/n-ejemplo-galeria",
        "/contenido/noticias/n-ejemplo-video",
        "/contenido/banners",
        "/contenido/banners/b-ejemplo-diagnostico",
        "/contenido/documentos",
        "/contenido/documentos/d-ejemplo-plan",
      ])
        await sinDesborde(page, ruta);
    });
  }
});
