import { defineConfig, devices } from "@playwright/test";

/*
 * Pruebas E2E del panel. Corren contra `next dev` porque usan la API simulada (cuentas de
 * demostración y enlaces de desarrollo). En local reutiliza el `pnpm dev` del puerto 3001.
 */
const PUERTO = 3001;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  // La primera visita a cada ruta compila en `next dev`.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    locale: "es-VE",
    timezoneId: "America/Caracas",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"] } },
    {
      name: "tablet",
      use: { ...devices["Desktop Chrome"], viewport: { width: 820, height: 1180 }, hasTouch: true },
    },
    // 375 px: teléfono.
    {
      name: "movil",
      use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 }, hasTouch: true },
    },
  ],
  webServer: {
    command: `next dev -p ${PUERTO}`,
    url: `http://localhost:${PUERTO}/ingresar`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
