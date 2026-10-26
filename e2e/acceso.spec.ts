import { expect, test } from "@playwright/test";
import { CONTRASENA_DEMO, ingresar, prohibido } from "./utilidades";

/*
 * Panel de la Alcaldía de Iribarren (una sola alcaldía): cada rol entra al tablero, ve solo sus
 * estaciones, recibe 403 en lo ajeno, y el historial no vuelve al formulario de ingreso.
 */

const DESTINOS = [
  ["superadmin@plataforma.test", /\/tablero$/],
  ["admin@iribarren.test", /\/tablero$/],
  ["operador@iribarren.test", /\/tablero$/],
  ["revisor@iribarren.test", /\/tablero$/],
] as const;

test.describe("destino al entrar", () => {
  for (const [correo, ruta] of DESTINOS) {
    test(correo, async ({ page }) => {
      await ingresar(page, correo);
      await expect(page).toHaveURL(ruta);
    });
  }
});

/** Rutas que cada rol NO puede ver (403). */
const AJENAS: [string, string[]][] = [
  [
    "operador@iribarren.test",
    ["/participaciones", "/ciudadanos", "/equipo", "/configuracion", "/bitacora"],
  ],
  ["revisor@iribarren.test", ["/contenido", "/equipo", "/configuracion", "/bitacora"]],
];

test.describe("protección por rol", () => {
  for (const [correo, rutas] of AJENAS) {
    test(`${correo} recibe 403 fuera de lo suyo`, async ({ page }) => {
      test.slow();
      await ingresar(page, correo);
      for (const ruta of rutas) {
        await page.goto(ruta);
        await prohibido(page);
      }
    });
  }

  test("las estaciones del menú salen de los permisos", async ({ page }) => {
    await ingresar(page, "operador@iribarren.test");
    const secciones = page.getByRole("navigation", { name: "Secciones" }).first();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(secciones.getByRole("link")).toHaveText(["Tablero", "Contenido"]);
  });

  test("sin sesión, cualquier ruta del panel pide ingresar y luego regresa", async ({ page }) => {
    await page.goto("/participaciones");
    await expect(page).toHaveURL(/\/ingresar\?volver=%2Fparticipaciones/);
    await page.getByLabel("Correo institucional").fill("revisor@iribarren.test");
    await page.locator("#contrasena").fill(CONTRASENA_DEMO);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/participaciones$/);
  });

  test("el Super Admin ve la franja de su sesión y todas las estaciones", async ({ page }) => {
    await ingresar(page, "superadmin@plataforma.test");
    await expect(page.getByText(/Sesión de Super Admin/)).toBeVisible();
    await page.goto("/configuracion");
    await expect(page.getByRole("heading", { level: 1, name: "Configuración" })).toBeVisible();
  });

  test("ya no existen el selector de alcaldía ni la plataforma", async ({ page }) => {
    await ingresar(page, "admin@iribarren.test");
    for (const ruta of ["/alcaldia", "/plataforma", "/onboarding"]) {
      await page.goto(ruta);
      await expect(page.getByRole("heading", { name: "Esta estación no existe" })).toBeVisible();
    }
  });
});

test.describe("historial y sesión", () => {
  test("tras iniciar sesión, «atrás» no vuelve al formulario", async ({ page }) => {
    await page.goto("/ingresar");
    await ingresar(page, "revisor@iribarren.test");
    await page.goBack();
    await expect(page.getByRole("button", { name: "Iniciar sesión" })).toHaveCount(0);
  });

  test("con la sesión abierta, /ingresar lleva al panel", async ({ page }) => {
    await ingresar(page, "revisor@iribarren.test");
    await page.goto("/ingresar");
    // Con `next dev` bajo carga, la primera visita a /tablero compila.
    await expect(page).toHaveURL(/\/tablero$/, { timeout: 30_000 });
  });

  test("tras cerrar sesión, «atrás» no muestra el panel", async ({ page }) => {
    await ingresar(page, "revisor@iribarren.test");
    await page.goto("/participaciones");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Menú de la cuenta" }).click();
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/ingresar$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/ingresar/);
    await expect(page.getByText("IRI-2026-0031")).toHaveCount(0);
  });

  test("bloquea la cuenta tras 5 intentos fallidos", async ({ page }) => {
    await page.goto("/ingresar");
    for (let i = 0; i < 5; i++) {
      await page.getByLabel("Correo institucional").fill("bloqueo@iribarren.test");
      await page.locator("#contrasena").fill("NoEsLaClave#1");
      await page.getByRole("button", { name: "Iniciar sesión" }).click();
      await expect(page.getByRole("alert").first()).toBeVisible();
    }
    await expect(page.getByText(/la cuenta quedó bloqueada/)).toBeVisible();
  });

  test("una cuenta desactivada no entra", async ({ page }) => {
    await page.goto("/ingresar");
    await page.getByLabel("Correo institucional").fill("desactivado@iribarren.test");
    await page.locator("#contrasena").fill(CONTRASENA_DEMO);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page.getByText(/Tu cuenta está desactivada/)).toBeVisible();
  });
});

test.describe("invitación y contraseña", () => {
  test("una invitación vencida ofrece reenviarla", async ({ page }) => {
    await page.goto("/invitacion?token=demo-invitacion-vencida");
    // La primera corrida la ve vencida; las siguientes, reemplazada por el reenvío anterior.
    await expect(page.getByText(/La invitación venció|fue reemplazado/)).toBeVisible();
    await page.getByRole("button", { name: "Pedir una invitación nueva" }).click();
    await expect(page.getByRole("link", { name: "Abrir el enlace" })).toBeVisible();
  });

  test("cambiar la contraseña desde el menú de usuario", async ({ page }, info) => {
    // Cambia una cuenta del almacén compartido: una sola vez y la deja como estaba.
    test.skip(info.project.name !== "escritorio", "Solo en escritorio");
    await ingresar(page, "equipo@iribarren.test");
    await page.getByRole("button", { name: "Menú de la cuenta" }).click();
    await page.getByRole("button", { name: "Cambiar contraseña" }).click();
    const dialogo = page.getByRole("dialog", { name: "Cambiar contraseña" });
    await dialogo.locator("#contrasenaActual").fill("NoEsLaClave#1");
    await dialogo.locator("#contrasena").fill("Nueva#Clave2026x");
    await dialogo.locator("#confirmarContrasena").fill("Nueva#Clave2026x");
    await dialogo.getByRole("button", { name: "Cambiar contraseña" }).click();
    await expect(dialogo.getByText("La contraseña actual no es correcta.").first()).toBeVisible();
    await dialogo.locator("#contrasenaActual").fill(CONTRASENA_DEMO);
    await dialogo.locator("#contrasena").fill("Nueva#Clave2026x");
    await dialogo.locator("#confirmarContrasena").fill("Nueva#Clave2026x");
    await dialogo.getByRole("button", { name: "Cambiar contraseña" }).click();
    await expect(dialogo.getByText(/Contraseña actualizada/)).toBeVisible();

    // Restaura la contraseña de demostración.
    await dialogo.getByRole("button", { name: "Listo" }).click();
    await page.getByRole("button", { name: "Menú de la cuenta" }).click();
    await page.getByRole("button", { name: "Cambiar contraseña" }).click();
    await dialogo.locator("#contrasenaActual").fill("Nueva#Clave2026x");
    await dialogo.locator("#contrasena").fill(CONTRASENA_DEMO);
    await dialogo.locator("#confirmarContrasena").fill(CONTRASENA_DEMO);
    await dialogo.getByRole("button", { name: "Cambiar contraseña" }).click();
    await expect(dialogo.getByText(/Contraseña actualizada/)).toBeVisible();
  });
});
