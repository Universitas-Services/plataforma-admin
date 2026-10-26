# Contexto del proyecto PDUL YA (portal y admin)

Documento para retomar el trabajo en otro equipo o en una conversación nueva con Claude Code, sin depender del historial anterior. Es igual en `portal-iribarren/docs/CONTEXTO.md` y en `plataforma-admin/docs/CONTEXTO.md`.

Fecha de corte: 17 de octubre de 2026. La sección 6.0 (admin de Iribarren) se agregó el 25 de octubre de 2026 y manda sobre lo anterior de la sección 6 cuando choquen.

---

## 0. Antes de irte del equipo actual (checklist)

1. **Commit y push de `feat/noticias-v4`** en `portal-iribarren`. Las ramas `feat/*` están apiladas: cada una sale de la anterior, y solo `feat/base-visual-inicio` está en GitHub. Con subir `feat/noticias-v4` subes todo el trabajo:
   - `feat/documentos-y-conoce-pdul` → `feat/registro-y-acceso` → `feat/perfil-y-participacion` → `feat/conoce-y-seguimiento` → `feat/noticias-v4`.
   ```bash
   git push -u origin feat/noticias-v4
   ```
   Si quieres conservar las ramas intermedias para hacer PRs por bloque, súbelas también (`git push -u origin <rama>` para cada una).
2. **Push de `plataforma-admin`**: rama `chore/tooling-base`, sin cambios pendientes salvo este documento.
3. **Documentos del cliente**: no están en los repos. Llévalos aparte, por ejemplo en una carpeta `Pdull/` junto a los dos repos:
   - `Backlog_Tecnico_Repositorios.docx`: backlog por repositorio. Sección 2 = admin, sección 3 = portal, sección 1 = API.
   - `SRS_Plataforma_Participacion.docx` / `.pdf`, `Desglose_Tareas_Tecnicas.pdf`, `Flujo_Esperado_MVP.pdf`, `PLAN_PDUL_Iribarren.md`.
   - `Propuesta Gestión Ciudadana PDUL YA (3).pdf`: la **v3**, documento técnico (roles, formularios, máquina de estados).
   - `Propuesta Gestión Ciudadana PDUL YA (4).pdf`: la **v4**, solo las 9 noticias reales.
   - La carpeta `para noticias`: fotos, video y Gaceta originales. Ya están copiados a `public/` del portal.

## 1. Arranque en el equipo nuevo

```bash
git clone https://github.com/Universitas-Services/portal-iribarren.git
git clone https://github.com/Universitas-Services/plataforma-admin.git
cd portal-iribarren && git checkout feat/noticias-v4 && pnpm install
cp .env.example .env.local
pnpm dev            # http://localhost:3000
```

- **Requisitos:** Node ≥ 24 y pnpm 12.3.4 (`corepack enable`).
- **Admin:** `pnpm dev` en el puerto 3001.
- **Comandos de calidad** (los mismos que corre la CI): `pnpm format:check`, `pnpm lint`, `pnpm typecheck` (en el portal es `next typegen && tsc --noEmit`), `pnpm test` y `pnpm build`.
- **Cuentas de demostración del portal**, todas con la contraseña `Iribarren#2026`:

| Correo                  | Caso                                                                        |
| ----------------------- | --------------------------------------------------------------------------- |
| `ana@ejemplo.com`       | Persona verificada, perfil completo, 5 participaciones en todos los estados |
| `jose@ejemplo.com`      | Perfil vacío: para recorrer el asistente de perfil                          |
| `rosa@ejemplo.com`      | Perfil en «Requiere corrección»                                             |
| `luis@ejemplo.com`      | Correo sin verificar                                                        |
| `carla@ejemplo.com`     | Cuenta de otra alcaldía: pasa por «Unirme a Iribarren»                      |
| `contacto@cardones.org` | Organización con perfil incompleto                                          |

- **Enlaces de ejemplo:** `/verificar?token=demo-vencido` y `/verificar?token=demo-usado`.
- Los datos viven en memoria y se reinician con el servidor de desarrollo.

## 2. Instrucciones para Claude (pegar al iniciar la conversación)

> Trabajo en PDUL YA, el portal de participación ciudadana de la Alcaldía de Iribarren. Lee `docs/CONTEXTO.md` antes de empezar. Reglas:
>
> - **Responde siempre en español.**
> - **Yo hago los commits y el push.** Tú no ejecutas `git commit`, `git push`, ni creas PRs o merges salvo que te lo pida en ese mensaje. Prepara los cambios y propón mensajes Conventional Commits en español.
> - **Pregunta antes de descargar** archivos de internet: fuente, licencia y tamaño.
> - **No inventes textos oficiales.** Marca el contenido de ejemplo como tal y da el crédito de las imágenes CC (CC BY-SA).
> - **Next.js 16 no es el que conoces:** lee la guía en `node_modules/next/dist/docs/` antes de usar una API (ver `AGENTS.md`).
> - **Verifica en el navegador**, a escritorio y 375 px, y corre los checks antes de dar algo por hecho.

Los dos repos traen en `.claude/skills/` las skills `flujo-git` (la regla de los commits), `impeccable`, `design-taste-frontend` y `emil-design-eng`.

## 3. El proyecto

- **Qué es:** PDUL YA (Plan de Desarrollo Urbano Local, municipio Iribarren, Barquisimeto) es una plataforma multi-alcaldía de participación ciudadana. Durante la formulación del PDUL 2026–2046, la ciudadanía se informa (noticias, documentos, Conoce) y envía opiniones y propuestas con folio y seguimiento.
- **Repositorios:**
  - `portal-iribarren`: el portal ciudadano en Next.js. Lo hacemos nosotros.
  - `plataforma-admin`: el panel interno en Next.js. **Desde el 25-10-2026 es el admin de una sola alcaldía (Iribarren)**, con Super Admin, Admin, Operador y Revisor (ver 6.0). Lo hacemos nosotros.
  - `plataforma-api`: NestJS. **Lo hace otra persona.** Mientras no exista, el portal usa datos y servicios simulados con la misma forma que los endpoints del backlog.
- **Fuentes de verdad, por orden:**
  1. lo que diga el usuario o el cliente en la conversación;
  2. la Propuesta v3 (técnica) y la v4 (noticias);
  3. el texto de «Conoce el PDUL» que entregó el cliente, ya volcado en `src/lib/conoce/contenido.ts`;
  4. el backlog;
  5. el SRS.
- **Identidad visual:**
  - colores definidos como tokens en `src/app/globals.css`: rojo `#c32026`, noche `#232a36`, naranja, amarillo, papel, superficie, línea, éxito y éxito-oscuro `#1d6e33`;
  - tipografía display más sans;
  - más detalle en `DESIGN.md` y `PRODUCT.md` del portal.

## 4. Decisiones tomadas (no volver a discutirlas)

| Tema                 | Decisión                                                                                                                                                                                                                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Participar           | Basta con el perfil COMPLETO. **Decisión del 18-10-2026:** al completar los documentos el perfil queda VERIFICADO automáticamente; ningún revisor verifica perfiles.                                                                                                                                       |
| Organizaciones       | Solo como cuentas propias (v3): se registran con el correo institucional, sin cédula. El representante llega en el perfil. No hay vínculo persona-organización ni selector «actuar como».                                                                                                                  |
| Unicidad             | Correo y RIF únicos; cédula única para las personas. Membresías por alcaldía para todos los tipos de cuenta.                                                                                                                                                                                               |
| Teléfono y ocupación | Se piden en el perfil, no en el registro.                                                                                                                                                                                                                                                                  |
| Datos de la cuenta   | Nombres y apellidos editables (persona natural). Cédula, RIF, razón social y correo cambian vía soporte. Cambiar la contraseña pide la actual y cierra las demás sesiones.                                                                                                                                 |
| Sesión e historial   | Las Server Actions redirigen con `RedirectType.replace` (función `ir()` en `acciones.ts`). Las páginas de invitado llaman a `soloInvitados()`; `src/proxy.ts` manda sin cookie a `/ingresar?volver=…` en las privadas.                                                                                     |
| Parroquias           | 10: Concepción, Catedral, El Cují, Tamaca, Ana Soto, Santa Rosa, Unión, Juárez, Buena Vista y Águedo Felipe Alvarado.                                                                                                                                                                                      |
| Cédula               | V con 5 a 8 dígitos y E con 5 a 9, solo números. Se normaliza a `V-12345678`.                                                                                                                                                                                                                              |
| RIF                  | J, G o C, 8 dígitos y el **dígito verificador SENIAT** (módulo 11: letra V1 E2 J3 P4 G5 C3 × 4, pesos 3-2-7-6-5-4-3-2). Ejemplo válido: `J-07013380-5`.                                                                                                                                                    |
| Nombres              | Solo letras (con tildes, ñ y ü) y espacios, de 2 a 100 caracteres.                                                                                                                                                                                                                                         |
| Adjuntos del aporte  | En los tres tipos: hasta **5 fotos** (JPG, PNG o WebP de 2 MB) y **1 enlace de video** (YouTube o Instagram; no se sube el archivo), combinables. La **propuesta formal** exige además su documento de soporte (PDF, JPG o PNG de 2 MB).                                                                   |
| Folio                | `IRI-AAAA-XXXX`, idempotente por `Idempotency-Key` (un doble clic no crea dos).                                                                                                                                                                                                                            |
| Galería pública      | Solo participaciones PUBLICADA con nombre autorizado (`mostrarNombre`), sin datos de contacto.                                                                                                                                                                                                             |
| Conoce el PDUL       | Texto del cliente. Las **4 fases** (24 meses) son el contenido principal; los **7 hitos** del termómetro se muestran como «¿En qué va el proceso?». Solo la Fase I tiene duración (meses 1 a 6). Marco legal: solo la cadena del cliente (CRBV → LOOU → LOPPM → Sentencia 928 → MINFRA → Decreto 48-2026). |
| Nombre del alcalde   | **Yanys Enrique Agüero**. La v4 a veces dice «Yanis»: se corrige siempre.                                                                                                                                                                                                                                  |
| Noticias             | Las 9 de la v4 son las reales. Las de ejemplo se quedan con la marca `ejemplo: true`: llevan el rótulo «Ejemplo» y nunca van al Inicio. Destacadas en portada: Visión de futuro, la reunión de auditoría y la primera mesa técnica.                                                                        |
| Selectores           | Componente propio (`src/components/ui/selector.tsx`), no `<select>` nativo.                                                                                                                                                                                                                                |

## 5. Estado del portal (`portal-iribarren`)

### Rutas por pantalla del backlog

| Backlog                    | Rutas                                                                                                                                            | Estado                                                                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.3 Inicio                 | `/`                                                                                                                                              | Hecho (termómetro, banners, 3 noticias, llamadas a la acción)                                                                                                                            |
| 3.4 Conoce                 | `/conoce-el-pdul`                                                                                                                                | Hecho con el contenido del cliente                                                                                                                                                       |
| 3.5 Noticias               | `/noticias`, `/noticias/[slug]`                                                                                                                  | Hecho: mosaico por formato (texto, imagen, galería, documento, video), filtros por URL, rango de fechas con atajos, paginación                                                           |
| 3.6 Documentos             | `/documentos`, `/documentos/[slug]`                                                                                                              | Hecho (visor PDF, versiones, estado oficial o borrador)                                                                                                                                  |
| 3.7–3.8 Registro y acceso  | `/registro`, `/registro/revisa-tu-correo`, `/verificar`, `/ingresar`, `/unirme`, `/recuperar`, `/restablecer`, `/terminos`, `/politica-de-datos` | Hecho (auth simulada)                                                                                                                                                                    |
| 3.9 Perfil                 | `/mi-cuenta`, `/mi-cuenta/seguridad`                                                                                                             | Hecho: pestañas Perfil · Seguridad · Mis participaciones; asistente por pasos, documentos, corrección, nombres editables; contraseña, cerrar sesión, abandonar el portal y pedir la baja |
| 3.10 Participación         | `/participa`, `/participa/enviada`                                                                                                               | Hecho: gate, tipos, fotos y video, confirmación, folio, comprobante imprimible                                                                                                           |
| 3.11 Mis participaciones   | `/mi-cuenta/participaciones`, `/mi-cuenta/participaciones/[folio]`                                                                               | Hecho: filtros, búsqueda por folio, línea de tiempo                                                                                                                                      |
| 3.12 Propuestas publicadas | `/propuestas`, `/propuestas/[folio]`                                                                                                             | Hecho                                                                                                                                                                                    |
| 3.1 portal-core            | —                                                                                                                                                | **Pendiente**                                                                                                                                                                            |
| 3.13 Calidad y E2E         | `e2e/`, `docs/ACCESIBILIDAD.md`                                                                                                                  | Hecho: E2E del flujo completo, axe WCAG 2.1 AA en 40 pantallas y estados, teclado y reflujo; falta lector de pantalla real                                                               |

### Arquitectura

- Next.js 16.4 (App Router) con **Cache Components**, React 19, Tailwind 4, Zod 4, Vitest. Hay CI en GitHub Actions.
- **Datos públicos simulados:** `src/lib/mocks/data.ts`, servidos por `src/lib/api/index.ts` (con `use cache`). La lógica pura está en `src/lib/noticias/consultas.ts` y `src/lib/documentos/consultas.ts`, con pruebas.
- **Auth y participación simuladas:** `src/lib/auth/`.
  - `servicio.ts`: lógica pura y probada. Registro neutro, IDENTITY_CONFLICT, tokens de un uso, perfil calculado, documentos con versión, folios, filtros y galería pública.
  - `fixtures.ts`: cuentas y participaciones de ejemplo.
  - `sesion.ts`: cookie httpOnly `pdul_sesion` y almacén en `globalThis.__pdulAuth`.
  - `acciones.ts`: Server Actions.
- **Validaciones:**
  - `src/lib/validation/common.ts` debe estar **idéntico** en portal y admin, igual que `common.test.ts`.
  - `schemas.ts` es propio de cada repo.
- **Componentes reutilizables:**
  - `ui/selector.tsx`: combobox ARIA, con hoja inferior en el teléfono.
  - `cuenta/campos.tsx`: Campo, CampoDocumento con prefijo y filtrado, CampoContrasena, ResumenErrores, BotonEnviar.
  - `cuenta/piezas.tsx`: CampoArchivo, CampoImagenes, CampoSelect, Dialogo nativo, Progreso.
  - `listado/filtros-url.tsx`: barra de filtros en la URL.
  - `listado/paginacion.tsx` y `listado/transicion.tsx`.
  - `participacion/aporte.tsx`: FichaAporte, LineaTiempoEstados, TarjetaAporte, InsigniaEstado.
- **Trampas de Next 16 ya resueltas:**
  - `cookies()` y `searchParams` se leen dentro de `<Suspense>`.
  - Las cookies solo se escriben en Server Actions.
  - `Date.now()` o `randomUUID()` en un render requieren `await connection()` antes.
  - Una ruta dinámica con Cache Components necesita `generateStaticParams` con **al menos un** parámetro.
  - Un módulo `"use client"` no debe exportar constantes que use un componente de servidor (llegan vacías): ponlas en `src/lib`.
  - `experimental.serverActions.bodySizeLimit = "13mb"`, por los archivos.
  - No uses `encType` en un `<form>` con acción-función.
- **Pruebas E2E:** `pnpm test:e2e` (Playwright contra `pnpm dev`, escritorio y 375 px). El Revisor se simula con `POST /api/desarrollo/participaciones/{folio}/estado`, que usa `cambiarEstadoParticipacion` y `TRANSICIONES` de `servicio.ts` (404 en producción).
- **Contraste:** sobre blanco o `superficie`, el texto en `tinta` no baja de /70.
- **Avisos de entorno:**
  - Si el panel del navegador está oculto, el contenido en streaming no se revela.
  - Tras cambiar `fixtures.ts` hay que **reiniciar** `pnpm dev`, porque el almacén vive en `globalThis`.

### Pendiente del portal

1. **3.1 portal-core:**
   - paquete compartido con el cliente de la API generado (OpenAPI), los helpers del BFF (inyectar `PORTAL_CLIENT_ID` y `PORTAL_CLIENT_SECRET` desde el servidor), y los hooks `useSession`, `useMembership`, `useProfileStatus` y `useBranding`;
   - formularios sin estilos rígidos;
   - plantilla de repositorio;
   - publicación en npm privado.

   Lo natural es extraerlo de lo que ya existe en `src/lib/auth`, `src/components/cuenta` y `src/lib/validation`.

2. **3.13 Calidad** (hecho lo automatizable, ver `docs/ACCESIBILIDAD.md`):
   - probar con NVDA y VoiceOver;
   - al integrar la API, leer el enlace de verificación desde un buzón de pruebas y cambiar el estado con la API del admin en lugar de `/api/desarrollo/…`.
3. **Integración con plataforma-api:**
   - reemplazar `src/lib/api/index.ts` y `src/lib/auth/servicio.ts` por llamadas al BFF (sección 8);
   - las pantallas no deberían cambiar.
4. **Pendientes del cliente:**
   - duraciones de las fases II a IV;
   - si «Decretos y normativas» y «Normativa» son de verdad dos categorías;
   - foto de la primera mesa técnica (22-09) y video del HCAMP (16-09), que la v4 deja vacíos; hoy son TEXTO e IMAGEN ilustrativa (el obelisco);
   - los textos oficiales de términos y política de datos;
   - el `SITE_URL` definitivo;
   - los banners del Inicio, que siguen siendo de ejemplo (uno enlaza a una noticia de ejemplo).
5. **Deuda técnica:**
   - los selectores propios no se pueden cambiar sin JavaScript (se podría agregar un `<select>` de respaldo en `<noscript>`);
   - el video `public/videos/tres-compromisos-pdul.mp4` pesa 10 MB y conviene comprimirlo (ffmpeg) y darle una portada propia;
   - las fotos de la v4 están en PNG de unos 300 KB (next/image las optimiza al servirlas).

## 6. Admin (`plataforma-admin`): qué hay y cómo seguir

## 6.0 Admin de Iribarren (rama `feat/admin-iribarren`, 25-10-2026)

Refactorización según `Backlog_Refactorizacion_API_Admin.docx`: **una base de datos y una API por alcaldía**, y un admin por alcaldía entregado ya personalizado. Lo que sigue de la sección 6 sobre multi-alcaldía, onboarding, marca configurable, Representantes, `/plataforma` y banners **quedó como historia**. Los datos siguen simulados en `src/lib/plataforma/`, con la forma del backlog nuevo.

- **Identidad:** la del portal PDUL YA. Colores, Montserrat (títulos) y Roboto (texto) en `src/app/globals.css`; logos de PDUL YA y de la Alcaldía en `public/brand/`, copiados del portal. Lo propio del despliegue (nombre, sigla, código del folio, límites del municipio para el mapa, logos) vive en **`src/config/alcaldia.ts`**: otra alcaldía es otro despliegue con otro archivo como ese. Se conserva la estructura «Línea y estación».
- **Roles** (`src/lib/plataforma/permisos.ts`), sin membresías ni Representantes:
  - **Super Admin:** todos los permisos, con la franja «Sesión de Super Admin» en el marco. También existirá en el proyecto central de registro (otro repositorio, sin empezar y sin prioridad).
  - **Admin:** todo lo de la alcaldía (equipo, catálogos de lectura, bitácora, contenido, participaciones, ciudadanos, indicadores).
  - **Operador:** noticias, documentos, Inicio del portal y proceso; indicadores de contenido.
  - **Revisor:** participaciones y ciudadanos; indicadores de participación y ciudadanía.
- **Catálogos fijos por despliegue:** `/configuracion` es solo lectura. Las fases del proceso se editan en Contenido → Proceso.
- **Contenido** (`/contenido/*`, pestañas Noticias · Documentos · Inicio del portal · Proceso):
  - noticias con los 5 formatos, con vistas, me gusta y no me gusta en la lista;
  - documentos con versiones y descargas;
  - **Inicio del portal** (`/contenido/inicio`, `src/lib/plataforma/inicio.ts`): la tarjeta del mensaje del alcalde (una noticia de formato Texto publicada) y la tarjeta de anuncios (hasta 6 noticias publicadas, ordenables con flechas o arrastre). Si una elegida se despublica, sale de la selección y el panel avisa. El resto del Inicio es fijo o sale de los rankings;
  - **Proceso** (`/contenido/proceso`): fases y fase actual del termómetro.
  - Los banners se eliminaron.
- **Revisor, con las dos máquinas del portal** (`src/lib/plataforma/participaciones.ts`):
  - **Propuesta formal:** Pendiente o En revisión → Verificada o Rechazada (motivo y texto de 20+); Verificada → Publicada o Rechazada; Publicada → Verificada al despublicar. Se mantiene la decisión directa del 19-10-2026; el portal solo permite Pendiente → En revisión: **alinear las dos reglas con backend**.
  - **Opinión** (general o sobre noticia): sin seguimiento. Pendiente («Recibida» en el portal) ↔ Publicada.
  - Publicar exige `mostrarNombre` en los dos casos.
  - **Ubicación** de la propuesta (`ubicacion {lat, lng}`) en un mapa de solo lectura con Leaflet 1.9.4 y OpenStreetMap, con enlace a Google Maps (`src/components/revisor/mapa-ubicacion.tsx`, `src/lib/ubicacion.ts`).
  - Vistas y reacciones de los aportes publicados en el detalle. Se quitó el campo `identidad`.
- **Indicadores en `/tablero`** (`src/lib/plataforma/metricas.ts`, con pruebas): rango (7, 30, 90 días o el año, en hora de Venezuela) y exportación a CSV (`/tablero/exportar?rango=`). Cada rol ve sus secciones:
  - participación: recibidos por día o semana, por tipo, parroquia y categoría, por atender y su antigüedad, mediana de días de respuesta, tasa de verificación, opiniones publicadas, aportes con más reacciones;
  - contenido: noticias publicadas, vistas, reacciones, más vistas y más valoradas, publicadas por formato, descargas y documentos más descargados;
  - ciudadanía: registros nuevos y totales, perfiles completos, tipo de cuenta y suspendidas;
  - equipo: decisiones por persona.
  - Gráficos en SVG propio (sin librería), con tooltip por puntero y teclado, y su tabla. **Las vistas, reacciones y descargas son de demostración** (`interaccionesDemo` en `fixtures-contenido.ts`) hasta conectar la API.
- **Cuentas de demostración** (contraseña `Plataforma#2026`):

| Correo                         | Rol                                           |
| ------------------------------ | --------------------------------------------- |
| `superadmin@plataforma.test`   | Super Admin                                   |
| `admin@iribarren.test`         | Admin                                         |
| `operador@iribarren.test`      | Operador                                      |
| `revisor@iribarren.test`       | Revisor                                       |
| `equipo@iribarren.test`        | Operador y Revisor                            |
| `bloqueo@iribarren.test`       | Solo para la prueba del bloqueo               |
| `desactivado@iribarren.test`   | Cuenta desactivada                            |
| `nuevo.revisor@iribarren.test` | Invitado: `/invitacion?token=demo-invitacion` |

- **Pruebas:** Vitest (181) y Playwright: `acceso`, `accesibilidad`, `responsive`, `documentos`, `contenido`, `inicio-proceso`, `revisor` y `tablero`.
- **Pendiente:** conectar la API real (BFF con renovación del token); el proyecto central de registro; alinear con backend la regla de transiciones de la propuesta formal y el catálogo de motivos de rechazo; que el portal lea el Inicio, el proceso y los catálogos desde la API.

### Historia: el admin multi-alcaldía (hasta el 24-10-2026)

**Estado actual (ramas `feat/fundaciones-admin` → `feat/onboarding-admin`):**

- Bloques 2.1 a 2.5 hechos sobre una API simulada: acceso, roles, protección de rutas, marco del panel y tema por alcaldía.
- **Diseño «Línea y estación»**, elegido con Impeccable entre 5 direcciones:
  - Señalética del Metro de Caracas. El sidebar es una línea con una estación por sección.
  - Recorrido de estados en las tablas: lleno = completado; discontinuo = en espera, con su longitud según la antigüedad; ámbar con más de 4 días.
  - Contrato en `.impeccable/surfaces/` (no versionado), producto en `PRODUCT.md`.
- **Marca:** la neutra es la de la Plataforma de Participación Ciudadana (azul #1F3864, turquesa #17A398, Archivo; logos en `public/marca/`).
  - Dentro de una alcaldía con onboarding completo, el marco toma su color.
  - `src/lib/marca.ts` deriva `--marca`, `--sobre-marca` (blanco o tinta según el contraste), `--marca-texto` (AA sobre blanco) y `--marca-suave`.
- **API simulada:** `src/lib/plataforma/`.
  - `servicio.ts`: sesiones, bloqueo tras 5 intentos durante 15 minutos, invitaciones de 72 h (vencida, usada o reemplazada), recuperar y restablecer, cambiar la contraseña y cerrar todas, alcaldía en uso y bitácora encadenada por hash.
  - `permisos.ts`: permisos por rol, menú y permiso de cada ruta.
  - `fixtures.ts`: cuentas y alcaldías de demostración.
  - `sesion.ts`: cookie `pp_sesion` y las comprobaciones `exigirSesion`, `exigirAlcaldia`, `exigirEnAlcaldia`, `exigirPermiso` (→ `forbidden()`) y `soloInvitados`.
  - `acciones.ts`: Server Actions con `ir()`, que redirige con replace; `refresh()` al cambiar de alcaldía, porque el marco vive en el layout.
- **Protección:** `src/proxy.ts` hace una verificación optimista de la cookie. Cada página comprueba la sesión real y el permiso. `experimental.authInterrupts` da las páginas 403.
- **Cuentas de demostración** (contraseña `Plataforma#2026`):
  - `superadmin@plataforma.test`;
  - `avipri@plataforma.test` y `universitas@plataforma.test` (Representantes);
  - `admin@iribarren.test`, `operador@iribarren.test`, `revisor@iribarren.test` y `equipo@iribarren.test` (Operador y Revisor);
  - `multi@lara.test` (dos alcaldías);
  - `admin@palavecino.test` (onboarding pendiente);
  - `desactivado@iribarren.test`;
  - `admin@crespo.test`, `admin@moran.test` y `admin@urdaneta.test`: alcaldías pendientes para probar el asistente (una por tamaño en las pruebas E2E). `DELETE /api/desarrollo/onboarding/{id}` (solo desarrollo) las devuelve a «pendiente».
  - Invitaciones: `/invitacion?token=demo-invitacion` y `demo-invitacion-vencida`.
- **Pantallas:**
  - `/ingresar`, `/recuperar`, `/restablecer` e `/invitacion`;
  - `/plataforma` (alcaldías y actividad);
  - `/alcaldia` (selector);
  - `/tablero` (chips de estado, las pendientes que más esperan con su recorrido, accesos por rol);
  - `/participaciones` (bandeja de lectura con recorrido, chips de estado, búsqueda y filtros por tipo, parroquia y categoría; en el teléfono los filtros se pliegan tras «Filtros»);
  - `/onboarding` (**2.6, hecho**): asistente `?paso=logo|colores|lema|resumen` con la línea de pasos, borrador guardado en `Alcaldia.borradorMarca`, logo PNG/JPG con recorte (`react-easy-crop`, PNG de 512 px) o SVG sin recorte servido por `/logos/[id]` con CSP, colores elegidos en un espectro con barra de tono (`react-colorful`, etiquetas traducidas) o escribiendo el código, evaluados con `evaluarMarca()` (texto 4.5:1 y línea 3:1 contra blanco, con tono sugerido), lema de hasta 120 y vista previa en vivo. Las pruebas E2E devuelven cada alcaldía a «pendiente» al terminar, porque comparten el `pnpm dev` local. Al confirmar, la alcaldía queda ACTIVA, se anota en la bitácora y el marco toma color y logo.
  - 404 propia «Esta estación no existe»: dentro del panel (`(panel)/[...resto]` y `(panel)/not-found.tsx`) conserva el marco y sugiere las estaciones del usuario; fuera, con la marca neutra. 403 y 500 usan el mismo dibujo de línea cortada.
  - Esqueletos de carga con la forma de cada pantalla (`src/components/ui/esqueletos.tsx`) y `loading.tsx` en `(panel)` y `(acceso)`.
  - `/contenido/noticias` (**2.9, primera parte: noticias**): listado con chips por estado (borrador, programada, publicada, despublicada), búsqueda por título y filtros por tipo, formato, categoría, fechas y orden; tabla en escritorio y lista en el teléfono. `/contenido/noticias/[id]`: editor con los 5 formatos del portal (texto, imagen, galería, documento y video por archivo o por enlace de YouTube/Instagram, validado con las mismas reglas que `portal-iribarren/src/lib/noticias/video.ts`), portada con recorte 16:9 (1600 px), texto alternativo obligatorio, crédito y «foto ilustrativa», cuerpo en Tiptap (encabezados, negrita, cursiva, listas, cita, enlaces e imágenes) saneado en el servidor con lista blanca (`src/lib/contenido/sanear.ts`), puntos de análisis, botón opcional y «destacada en portada». Un borrador se guarda solo cada 30 s y al salir de un campo; una publicada o programada se guarda a mano y tiene que quedar completa. Publicar, programar (hora de Venezuela), volver a borrador, despublicar y eliminar el borrador (borrado lógico) piden confirmación y avisan con un toast. Las programadas vencidas se publican al leer (el «job» simulado). Los archivos suben por `POST /api/medios` con barra de progreso (firma real del archivo; imagen 5 MB, PDF 20 MB, **video 50 MB y subtítulos 200 KB: límites propios del admin, pendientes de definir con plataforma-api**) y se sirven por `/medios/[id]` solo a su alcaldía, con `Range` para el video. Las noticias de ejemplo usan fotos CC BY-SA copiadas del portal (`public/ejemplos/CREDITOS.md`). Tras cada cambio se purga la caché del navegador de las rutas de Contenido (`revalidatePath`).
  - `/contenido/banners` (**2.9, segunda parte**): carrusel del Inicio en orden, con chips por vigencia (vigente, programado, vencido; días completos en hora de Venezuela, misma regla que `portal-iribarren/src/lib/banners.ts`). Se reordena arrastrando o con «Subir»/«Bajar» y se guarda al momento (`PATCH /admin/banners/order` simulado: la lista completa o nada). `/contenido/banners/[id]` (y `/nuevo`): título, texto, botón (texto y enlace), tono del portal («rojo» = color de la alcaldía, «tinta», «cálido»), foto de fondo opcional con recorte 16:7 y crédito, y vigencia desde/hasta, con vista previa aproximada. **Decisión a confirmar:** el backlog dice que el enlace del banner es opcional, pero el tipo `Banner` del portal lo exige; el admin lo pide obligatorio.
  - `/contenido/documentos`: repositorio con chips (borrador de trabajo, oficial), búsqueda y filtros por categoría, visibilidad y fechas. `/contenido/documentos/nuevo`: PDF con progreso y ficha (título, descripción, categoría, estado, visible en el portal). `/contenido/documentos/[id]`: ficha editable (oficializar queda en la bitácora como `DOCUMENTO_OFICIALIZADO`), «Nueva versión» con PDF, nota y salto menor (1.1 → 1.2) o mayor (1.2 → 2.0), e historial como una línea donde la vigente es la estación llena; cada versión guarda su PDF (el portal solo muestra el vigente).
  - **Capa de alcaldía (2.8, 2.11, 2.12 y 2.13, rama `feat/alcaldia-revisor`):** servicio en `src/lib/plataforma/alcaldia.ts` (con pruebas), acciones en `acciones-alcaldia.ts`, datos de ejemplo en `fixtures-alcaldia.ts` y pantallas en `src/components/alcaldia/`. Cada cambio queda en la bitácora.
    - `/equipo`: miembros con estado (activo, invitación pendiente, desactivado), filtros por rol y estado, búsqueda; «Invitar» con correo y roles Operador y/o Revisor (a una cuenta existente solo se le agrega la membresía); «Gestionar» cambia roles, activa o desactiva y reenvía la invitación. Nadie se edita a sí mismo ni a un administrador. En la demo el enlace de la invitación se muestra en el diálogo.
    - `/ciudadanos`: tabla con cédula o RIF enmascarados, filtros por tipo, perfil y membresía, búsqueda por nombre, correo o 4+ dígitos de la cédula, CSV (`/ciudadanos/exportar`, también enmascarado). `/ciudadanos/[id]`: perfil completo, documentos, sus aportes y suspender o reactivar la membresía con motivo de 10+ caracteres (el Revisor ve, pero no suspende).
    - `/configuracion?pestana=marca|catalogos|fases`: marca (colores con chequeo AA, lema, logo PNG/JPG/SVG de 1 MB, vista previa); seis catálogos (agregar, renombrar sin repetir ignorando tildes, activar o desactivar); fases del proceso (agregar, editar con fechas, reordenar, marcar la actual) con vista previa del termómetro. **El portal todavía no lee estos catálogos ni fases:** se conectan con la API real.
    - `/bitacora`: eventos de la alcaldía con filtros por actor, acción, entidad y fechas, detalle `?evento=` con las diferencias antes y después, «Verificar integridad» de la cadena de hashes y CSV (`/bitacora/exportar`).
  - **Alcaldías (2.7, versión demo):** `/plataforma/alcaldias` con tabla, filtros, «Crear alcaldía» (nombre, sigla, correo del administrador; queda en onboarding con catálogos y fases de partida e invita al administrador) y ficha en `?ver=<id>` (sin ruta dinámica, por el 500 de Netlify) con conteos, administradores, suspender o reactivar y botones para entrar a operar directo en su tablero, noticias, participaciones o ciudadanos (`elegirAlcaldiaAccion` acepta `destino`). Servicio en `src/lib/plataforma/plataforma.ts`. **Flujo de demo con un solo usuario:** `superadmin@plataforma.test`.
  - Siguen anunciando su bloque: representantes y bitácora global de la plataforma.
- **Pruebas:**
  - Vitest: permisos, bloqueo, invitaciones, contraseñas, alcaldía en uso, cadena de la bitácora y contraste de marca.
  - Playwright (`pnpm test:e2e`, puerto 3001) en escritorio, tablet y 375 px: destinos por rol, 403 por rol, historial, bloqueo, invitación, cambio de marca, asistente completo, axe WCAG 2.1 AA (incluidos los pasos del asistente y la 404) y responsive sin desborde de 320 a 1920 px.

**Patrón de cada pantalla (backlog 2):**

- estados de carga, vacío y error;
- toasts;
- confirmación modal antes de acciones irreversibles;
- validación con zod antes de enviar;
- errores de la API traducidos por código a mensajes en español.

**Orden sugerido, una rama por bloque:**

| Rama                                      | Backlog    | Contenido                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `feat/fundaciones-admin` ✔                | 2.1–2.5    | Hecho con API simulada (ver arriba). Quedan para cuando exista la API: BFF con renovación del token, cliente orval y TanStack Query. Por ahora los avisos van en línea (`role="status"`/`alert`); toasts y DataTable completos llegan con las pantallas que los necesitan                                                                                                                                  |
| ~~`feat/fundaciones-bff`~~                | 2.1, 2.2   | BFF (route handlers proxy, cookie httpOnly, renovación del token), cliente tipado (orval) más TanStack Query, componentes base (DataTable con filtros en la URL y búsqueda con 300 ms de espera, FormField, FileUpload, ConfirmDialog, StatusBadge, EmptyState, PageHeader), toasts (sonner), middleware de rutas (sesión, onboarding, 403), tema dinámico por alcaldía                                    |
| ~~`feat/acceso-admin`~~ (incluido arriba) | 2.3, 2.4   | Login con bloqueo temporal o cuenta desactivada; aceptar invitación (token, cédula V/E, contraseña); olvidé y restablecer                                                                                                                                                                                                                                                                                  |
| ~~`feat/layout-admin`~~ (incluido arriba) | 2.5        | Sidebar según permisos, selector de alcaldía con «Operando en: X», menú de usuario, 403/404/500                                                                                                                                                                                                                                                                                                            |
| `feat/onboarding`                         | 2.6        | Asistente: logo con recorte → colores con chequeo de contraste → lema → resumen                                                                                                                                                                                                                                                                                                                            |
| `feat/contenido-operador`                 | 2.9        | Noticias (Tiptap, portada con recorte, autoguardado a los 30 s, programar, publicar, despublicar), banners (orden por arrastre, vigencia), repositorio documental (subir PDF con progreso, versiones). **Los 5 formatos de noticia del portal** (texto, imagen, galería, documento, video de archivo, YouTube o Instagram) y los campos de la v4: puntos de análisis, botón opcional, destacada en portada |
| `feat/participaciones-revisor`            | 2.10       | Bandeja (conteos por estado como filtros, filtros, búsqueda por folio, autor o cédula), detalle en dos columnas (aporte con fotos, video y soporte, y la identidad del autor con sus documentos), control de identidad, transiciones válidas, rechazo con motivo de catálogo y texto de al menos 20 caracteres, publicar o despublicar (solo con nombre autorizado), notas internas, CSV                   |
| `feat/ciudadanos`                         | 2.11       | Tabla (cédula enmascarada), detalle con documentos por URL firmada, suspender o reactivar la membresía, CSV                                                                                                                                                                                                                                                                                                |
| `feat/configuracion`                      | 2.12       | Branding, catálogos (parroquias, categorías técnicas, de noticias y de documentos, ocupaciones, tipos de organización), editor de fases y fase actual con vista previa del termómetro                                                                                                                                                                                                                      |
| `feat/plataforma`                         | 2.7, 2.8   | Alcaldías (crear, suspender, portales con `client_secret` mostrado una vez, rotar), representantes, entidades, usuarios internos (invitar con roles Operador o Revisor)                                                                                                                                                                                                                                    |
| `feat/bitacora-tablero`                   | 2.13, 2.14 | Bitácora con diferencias antes y después, verificar integridad, CSV; tablero de indicadores                                                                                                                                                                                                                                                                                                                |
| `chore/calidad-admin`                     | 2.15       | Responsive para tablet, accesibilidad, E2E con Playwright                                                                                                                                                                                                                                                                                                                                                  |

**Reglas compartidas con el portal** (el admin debe respetarlas exactamente):

- **Estados de participación:** PENDIENTE → EN_REVISION → APROBADA o RECHAZADA; APROBADA → PUBLICADA solo si `mostrarNombre` es true. Rechazar exige un motivo.
- **Verificación de perfil (decisión del 18-10-2026):** automática al completar el perfil. El Revisor **no** verifica perfiles: evalúa cada opinión o propuesta y, al hacerlo, ve los documentos de identidad del autor para cotejarlos («Identidad confirmada / No se puede confirmar»); si no lo identifican, rechaza con IDENTIDAD_NO_ACREDITADA. El portal todavía muestra los estados antiguos (pendiente de ajustar en `feat/verificacion-automatica`).
- **Catálogos y estructuras:** los catálogos están en `portal-iribarren/src/lib/api/types.ts` (CATEGORIAS de noticias v4, PARROQUIAS, CATEGORIAS_TECNICAS, OCUPACIONES, CONDICIONES_REPRESENTANTE, TIPOS_ENTIDAD, ESTADOS_*). La forma de `Participacion`, `Cuenta` y `Perfil` está en `portal-iribarren/src/lib/auth/servicio.ts`.
- **Diseño:** reutilizar los tokens del portal (`globals.css`) y adaptar el `Selector`, `Dialogo` y `CampoArchivo` del portal en lugar de crearlos de cero. El backlog pide shadcn/ui: si se usa, que tome estos tokens.
- **Sin API:** simularla igual que en el portal, con un servicio puro en memoria y sus pruebas más fixtures, para construir las pantallas sin bloquearse.

## 6.1 Demo en Netlify: sesión firmada y modo demo (19-10-2026)

- **Problema:** en Netlify cada petición puede caer en otra instancia de la función, y la sesión guardada en memoria se perdía (parpadeos y vuelta al inicio de sesión).
- **Solución en los dos repos:** la cookie de sesión es un token firmado con HMAC (`SESION_SECRETO`) que cualquier instancia valida. Admin: `src/lib/plataforma/token-sesion.ts`. «Cerrar todas las sesiones» y los cambios de contraseña dejan una marca `sesionesDesde` por usuario (por instancia; con la API real se vuelve fiable).
- **Modo demo (`DEMO=1`):** enlaces de recuperación en pantalla y cinta «Entorno de demostración». En el portal, además, el registro entra directo sin el paso del correo. Se mantienen las validaciones de formato. **Endurecer al conectar la API.**
- **Sigue en memoria:** lo que se crea en la demo puede reiniciarse y el portal y el admin no comparten datos.
- **Revisor (2.10) hecho en el admin:** bandeja con todos los estados (conteos como filtros, búsqueda por folio, autor o cédula, filtros por tipo, parroquia y categoría), detalle en dos columnas (aporte con fotos, video y soporte; identidad del autor con sus documentos y cotejo), transiciones válidas, rechazo con motivo de catálogo y texto de 20 caracteres o más, publicar solo con nombre autorizado, notas internas y exportar CSV (`/participaciones/exportar`). Servicio en `src/lib/plataforma/participaciones.ts`, datos de ejemplo en `fixtures-participaciones.ts`. El catálogo de motivos de rechazo es una propuesta: confirmarlo con el cliente y con backend.
- **Decisión del 19-10-2026 (cliente):** el Revisor decide directo con «Marcar como verificada», «Rechazar» y «Publicar en el portal», siempre visibles (las que no aplican quedan desactivadas con el motivo). Desde Pendiente o En revisión se puede verificar o rechazar; una verificada se publica o se rechaza. **No hay cotejo de identidad** del Revisor: se quitó. APROBADA se muestra como «Verificada» en los dos repos (el código del estado no cambia).
- **500 en Netlify con parámetros no generados al compilar:** el adaptador todavía no sirve el App Shell de Next 16.3+ para un `[param]` no listado. Por eso los `generateStaticParams` listan todos los ids de ejemplo, y noticias, documentos y banners nuevos usan ids secuenciales (`n-0001`, `d-0001`, `b-0001`, `idSecuencial` en `servicio.ts`) con el rango 1–200 generado de antemano. Revisar al conectar la API o al actualizar el adaptador.
- **Capa de alcaldía hecha en el admin:** Equipo (2.8), Ciudadanos (2.11), Configuración (2.12) y Bitácora (2.13), con API simulada. **Sigue:** tablero de indicadores (2.14) y la capa de plataforma (2.7).
- **Pruebas E2E opcionales en CI:** corren solo si el PR lleva la etiqueta `e2e` o al lanzarlas a mano (_Run workflow_). Los PR normales pasan solo los checks rápidos.

## 7. Noticias reales (Propuesta v4), ya cargadas

| Slug                                    | Fecha | Categoría               | Formato                                            |
| --------------------------------------- | ----- | ----------------------- | -------------------------------------------------- |
| `gaceta-5256-decreto-48-2026`           | 11-09 | Normativa               | Documento (Gaceta en el visor y botón de descarga) |
| `decreto-inicio-pdul-iribarren`         | 14-09 | Análisis institucional  | Imagen                                             |
| `anuncio-decreto-48-aniversario`        | 14-09 | Decretos y normativas   | Galería (sesión solemne)                           |
| `tres-compromisos-alcalde-pdul`         | 15-09 | Mensaje institucional   | Video de archivo                                   |
| `no-se-trata-de-improvisar-hcamp`       | 16-09 | Despliegue territorial  | Imagen ilustrativa                                 |
| `marco-jurisprudencial-pdul`            | 18-09 | Doctrina legal          | Imagen ilustrativa                                 |
| `primera-mesa-tecnica-concejo-alcaldia` | 22-09 | Mesas de trabajo        | Texto (destacada)                                  |
| `reunion-auditoria-legal-institucional` | 03-10 | Auditoría y diagnóstico | Galería (destacada)                                |
| `vision-de-futuro-conversacion-publica` | 04-10 | Visión de futuro        | Imagen (destacada)                                 |

El PDF de la Gaceta también es el documento `decreto-48-2026` del repositorio, al que enlazan Conoce y el pie de página.

## 8. Contrato supuesto con plataforma-api (revisar con backend)

Lo que las pantallas del portal dan por hecho. Las rutas siguen el backlog 1.4, 1.11 y 1.16.

| Uso                     | Método y ruta                                                                                           | Notas                                                                                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registro                | `POST /portal/auth/register`                                                                            | Responde 202 neutro aunque el correo exista; 409 `IDENTITY_CONFLICT` si la cédula o el RIF ya tienen otro correo                                                                                                                    |
| Verificar o reenviar    | `POST /portal/auth/verify`, `POST /portal/auth/resend`                                                  | Token de un uso, 24 h; estados OK, VENCIDO, USADO e INVALIDO                                                                                                                                                                        |
| Login                   | `POST /portal/auth/login`                                                                               | 401 si las credenciales no son válidas; 403 `EMAIL_NOT_VERIFIED`; `NO_MEMBERSHIP` lleva a «unirse»                                                                                                                                  |
| Unirse                  | `POST /portal/membership`                                                                               | Crea la membresía en la alcaldía                                                                                                                                                                                                    |
| Recuperar o restablecer | `POST /portal/auth/forgot`, `POST /portal/auth/reset`                                                   | Neutro; token de 1 h; restablecer cierra todas las sesiones                                                                                                                                                                         |
| Cambiar contraseña      | `POST /portal/auth/password/change` (**no está en el backlog: pedir a backend**)                        | `{ actual, nueva }` → 204; 401 `INVALID_PASSWORD` si la actual no coincide; revoca las demás sesiones                                                                                                                               |
| Perfil                  | `GET` / `PUT /portal/perfil` (backlog: `PATCH /portal/me/profile`)                                      | Nombres y apellidos (persona natural), teléfono y ocupación; en organizaciones, condición, representante, cédula, teléfono institucional y acreditación                                                                             |
| Documentos              | `POST /portal/perfil/documentos`                                                                        | IDENTIDAD, REPRESENTACION o ENTIDAD; PDF, JPG o PNG de 2 MB; cada carga sube la versión y deja el perfil en PENDIENTE                                                                                                               |
| Abandonar o baja        | `DELETE /portal/membresia`, `POST /portal/cuenta/baja`                                                  |                                                                                                                                                                                                                                     |
| Participar              | `POST /portal/participaciones`                                                                          | Cabecera `Idempotency-Key`. Campos: tipo, noticia, parroquia, sector, categoría técnica, descripción (50–3000), hasta 5 fotos, video (enlace YouTube o Instagram), soporte y `mostrarNombre`. Responde con el folio `IRI-AAAA-XXXX` |
| Mis participaciones     | `GET /portal/participaciones?estado&tipo&folio` y `GET /portal/participaciones/{folio}`                 | Con el historial de estados y comentarios                                                                                                                                                                                           |
| Galería pública         | `GET /portal/propuestas?q&tipo&parroquia&categoriaTecnica&pagina` y `GET /portal/propuestas/{folio}`    | Solo PUBLICADA con nombre autorizado; sin datos personales                                                                                                                                                                          |
| Contenido               | `GET /portal/posts`, `/portal/posts/{slug}`, `/portal/banners`, `/portal/documentos`, `/portal/proceso` | Con las formas de `src/lib/api/types.ts`                                                                                                                                                                                            |
