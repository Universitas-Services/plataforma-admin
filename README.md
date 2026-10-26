# plataforma-admin

Panel administrativo de PDUL YA para la **Alcaldía del Municipio Iribarren**. Cada alcaldía tiene su propia API, su base de datos y su panel, entregado ya personalizado: los datos del despliegue (nombre, sigla, folio, límites del municipio y logos) están en [`src/config/alcaldia.ts`](src/config/alcaldia.ts), y la identidad visual es la del portal ciudadano. Lo usan el Super Admin, el Admin de la alcaldía, el Operador y el Revisor; el menú se arma según los permisos de cada uno.

> **¿Retomas el proyecto en otro equipo o en una conversación nueva?** Lee primero [`docs/CONTEXTO.md`](docs/CONTEXTO.md): estado, decisiones, pendientes del portal y del admin, y el contrato supuesto con la API.

La aplicación no llama a la API desde el navegador: lo hace desde su propio servidor Next.js (BFF), que habla con `plataforma-api`.

## Requisitos

- Node.js 24 o superior
- pnpm 12

## Puesta en marcha

```bash
pnpm install
cp .env.example .env.local   # completa los valores
pnpm dev                     # http://localhost:3001
```

| Comando          | Qué hace                                                             |
| ---------------- | -------------------------------------------------------------------- |
| `pnpm dev`       | Servidor de desarrollo en el puerto 3001                             |
| `pnpm build`     | Compilación de producción                                            |
| `pnpm start`     | Sirve la compilación en el puerto 3001                               |
| `pnpm lint`      | ESLint, sin advertencias permitidas                                  |
| `pnpm typecheck` | Chequeo de tipos de TypeScript                                       |
| `pnpm test`      | Pruebas unitarias con Vitest (`pnpm test:watch` en modo observación) |
| `pnpm format`    | Formatea todo con Prettier (`pnpm format:check` solo verifica)       |

Al hacer commit, Husky ejecuta lint-staged: ESLint y Prettier sobre los archivos modificados.

## Panel con API simulada

Mientras no exista la API de la alcaldía, el panel usa una API simulada en memoria (`src/lib/plataforma/`). Se reinicia al reiniciar el servidor. Cuentas de demostración con la contraseña `Plataforma#2026`:

| Correo                       | Qué puede hacer                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| `superadmin@plataforma.test` | Todo, con la franja «Sesión de Super Admin»                                                 |
| `admin@iribarren.test`       | Equipo, catálogos (lectura), bitácora, contenido, participaciones, ciudadanos e indicadores |
| `operador@iribarren.test`    | Noticias, documentos, Inicio del portal y proceso                                           |
| `revisor@iribarren.test`     | Participaciones (opiniones y propuestas, con mapa) y ciudadanos                             |
| `equipo@iribarren.test`      | Operador y Revisor                                                                          |
| `desactivado@iribarren.test` | Cuenta desactivada                                                                          |

Detalle en [`docs/CONTEXTO.md`](docs/CONTEXTO.md), sección 6.0. Las vistas, reacciones y descargas de los indicadores son cifras de demostración.

| Comando         | Qué hace                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------ |
| `pnpm test:e2e` | Playwright: roles, rutas protegidas, historial y WCAG 2.1 AA (escritorio, tablet y 375 px) |

## Variables de entorno

Ver [`.env.example`](.env.example). Los archivos `.env*` no se suben al repositorio, salvo `.env.example`.

**Para el despliegue de demostración en Netlify** (mientras no exista plataforma-api):

| Variable         | Valor                      | Para qué                                                                                                                       |
| ---------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `SESION_SECRETO` | Una cadena larga aleatoria | Firma la cookie de sesión. Así cualquier instancia de la función la valida y no hay parpadeos ni salidas de sesión al navegar. |
| `DEMO`           | `1`                        | Muestra en pantalla los enlaces que llegarían por correo y la cinta «Entorno de demostración».                                 |

Limitación conocida: los datos que se crean en la demo (aportes evaluados, noticias, notas) siguen en la memoria de cada instancia y pueden reiniciarse; la sesión no se pierde.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Zod · Leaflet (mapa del Revisor, teselas de OpenStreetMap) · ESLint · Prettier · Vitest · Playwright. Código fuente en `src/`, con el alias `@/*`.

- **Validaciones:** `src/lib/validation/common.ts` reúne las reglas compartidas (cédula, RIF, teléfono, correo, contraseña y archivos) y debe mantenerse idéntico en `plataforma-admin` y `portal-iribarren`. Los formularios de este proyecto están en `src/lib/validation/schemas.ts`.
- **Variables de entorno:** `src/env.ts` las valida con Zod en el servidor (`env()`), y solo se importa desde código de servidor.

## Integración continua

`.github/workflows/ci.yml` se ejecuta en cada pull request y en cada push a `main`: Prettier, ESLint, TypeScript, Vitest y `next build`. Dependabot propone actualizaciones semanales de dependencias y de acciones.

## Herramientas de diseño para Claude Code

El repositorio incluye, en `.claude/`, skills y un servidor MCP que Claude Code carga al abrir el proyecto:

| Herramienta                                                                      | Para qué                                                                           |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `emil-design-eng` ([Emil Kowalski](https://github.com/emilkowalski/skills))      | Criterios de animación, curvas, duraciones y microinteracciones                    |
| `design-taste-frontend` ([Taste Skill](https://github.com/Leonxlnx/taste-skill)) | Dirección de arte contra el diseño genérico, pensada para páginas públicas         |
| `impeccable` ([Impeccable](https://github.com/pbakaus/impeccable))               | Jerarquía, espaciado, tipografía y auditorías de diseño; incluye agentes revisores |
| Playwright MCP (`.mcp.json`)                                                     | Permite a Claude abrir el sitio en un navegador, probarlo y tomar capturas         |

Impeccable también instala hooks que revisan la UI tras cada edición. Son configuración personal (`.claude/settings.local.json`, fuera del repositorio): quien los quiera debe ejecutar una vez, dentro del proyecto:

```bash
npx impeccable@4.6.0 install --project --providers=claude -y
```

Las versiones de las skills quedan registradas en `skills-lock.json`. Para actualizarlas: `npx skills update -p` y `npx impeccable update`.

## Vincular con GitHub

```bash
git remote add origin https://github.com/<usuario-u-organizacion>/plataforma-admin.git
git push -u origin main
```
