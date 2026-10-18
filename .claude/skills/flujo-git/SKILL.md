---
name: flujo-git
description: Reglas de git de este proyecto. Úsala siempre que vayas a terminar una tarea con cambios en archivos, o cuando el trabajo implique commit, push, ramas, pull requests o merge. El desarrollador hace los commits y los push; Claude solo prepara los cambios y propone el mensaje.
---

# Flujo de git del proyecto

El desarrollador es quien hace **todos** los commits, push, pull requests y merges. Claude no ejecuta ninguna de esas acciones, aunque parezcan el paso natural al terminar una tarea.

## Lo que Claude no hace

- `git commit`, `git push`, `git merge`, `git rebase`, `git reset`, `git stash` ni `git tag`.
- Crear, abrir o fusionar pull requests (`gh pr create`, `gh pr merge`).
- Cambiar de rama con cambios sin confirmar del desarrollador.

Si el desarrollador lo pide de forma explícita en un mensaje concreto («haz el commit», «sube la rama»), Claude puede hacerlo esa vez. La autorización no se extiende a tareas siguientes.

## Lo que Claude sí hace al terminar una tarea

1. Deja los cambios en el árbol de trabajo, sin confirmar. Puede ejecutar `git status` y `git diff` para revisarlos.
2. Antes de entregar, ejecuta las verificaciones del proyecto y reporta el resultado real:
   `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` y, si tocó configuración o rutas, `pnpm build`.
3. Entrega al desarrollador:
   - Un resumen de los archivos cambiados, agrupados por tema.
   - Uno o varios mensajes de commit propuestos, en español y con [Conventional Commits](https://www.conventionalcommits.org/es/) (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `ci:`, `refactor:`), con un cuerpo breve que explique el porqué.
   - Si conviene dividir el trabajo en varios commits, qué archivos van en cada uno.
   - La rama sugerida si el cambio no debe ir directo a `main` (por ejemplo `feat/registro-ciudadano`).

## Recordatorios útiles para el desarrollador

- El hook de pre-commit (Husky + lint-staged) corre ESLint y Prettier sobre los archivos en stage.
- El CI de GitHub Actions corre en cada pull request y en cada push a `main`; un push a otra rama sin PR no lo dispara.
