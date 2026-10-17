# plataforma-admin

Panel administrativo de la plataforma de participación ciudadana multi-alcaldía. Lo usan el Super Admin, los Representantes (AVIPRI y Universitas) y el personal de cada alcaldía (administrador, Operador y Revisor). El menú se arma según los permisos del usuario y, dentro de una alcaldía, el panel toma su logo, sus colores y su lema.

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

## Variables de entorno

Ver [`.env.example`](.env.example). Los archivos `.env*` no se suben al repositorio, salvo `.env.example`.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Zod · ESLint · Prettier · Vitest. Código fuente en `src/`, con el alias `@/*`.

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
