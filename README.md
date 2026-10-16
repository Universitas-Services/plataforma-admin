# plataforma-admin

Panel administrativo de la plataforma de participación ciudadana multi-alcaldía. Lo usan el Super Admin, los Representantes (AVIPRI y Universitas) y el personal de cada alcaldía (administrador, Operador y Revisor). El menú se arma según los permisos del usuario y, dentro de una alcaldía, el panel toma su logo, sus colores y su lema.

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

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo en el puerto 3001 |
| `pnpm build` | Compilación de producción |
| `pnpm start` | Sirve la compilación en el puerto 3001 |
| `pnpm lint` | ESLint |

## Variables de entorno

Ver [`.env.example`](.env.example). Los archivos `.env*` no se suben al repositorio, salvo `.env.example`.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · ESLint. Código fuente en `src/`, con el alias `@/*`.

## Vincular con GitHub

```bash
git remote add origin https://github.com/<usuario-u-organizacion>/plataforma-admin.git
git push -u origin main
```
