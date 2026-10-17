# Contexto del proyecto PDUL YA (portal y admin)

Documento para retomar el trabajo en otro equipo o en una conversación nueva con Claude Code, sin depender del historial anterior. Es igual en `portal-iribarren/docs/CONTEXTO.md` y en `plataforma-admin/docs/CONTEXTO.md`.

Fecha de corte: 17 de octubre de 2026.

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
  - `plataforma-admin`: el panel interno en Next.js (Super Admin, Representantes, Admin de alcaldía, Operador y Revisor). Lo hacemos nosotros.
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
| Participar           | Basta con el perfil COMPLETO (la v3 pedía «Verificado»). El estado de verificación se muestra; solo «Rechazado» bloquea.                                                                                                                                                                                   |
| Organizaciones       | Solo como cuentas propias (v3): se registran con el correo institucional, sin cédula. El representante llega en el perfil. No hay vínculo persona-organización ni selector «actuar como».                                                                                                                  |
| Unicidad             | Correo y RIF únicos; cédula única para las personas. Membresías por alcaldía para todos los tipos de cuenta.                                                                                                                                                                                               |
| Teléfono y ocupación | Se piden en el perfil, no en el registro.                                                                                                                                                                                                                                                                  |
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

| Backlog                    | Rutas                                                                                                                                            | Estado                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 3.3 Inicio                 | `/`                                                                                                                                              | Hecho (termómetro, banners, 3 noticias, llamadas a la acción)                                                                  |
| 3.4 Conoce                 | `/conoce-el-pdul`                                                                                                                                | Hecho con el contenido del cliente                                                                                             |
| 3.5 Noticias               | `/noticias`, `/noticias/[slug]`                                                                                                                  | Hecho: mosaico por formato (texto, imagen, galería, documento, video), filtros por URL, rango de fechas con atajos, paginación |
| 3.6 Documentos             | `/documentos`, `/documentos/[slug]`                                                                                                              | Hecho (visor PDF, versiones, estado oficial o borrador)                                                                        |
| 3.7–3.8 Registro y acceso  | `/registro`, `/registro/revisa-tu-correo`, `/verificar`, `/ingresar`, `/unirme`, `/recuperar`, `/restablecer`, `/terminos`, `/politica-de-datos` | Hecho (auth simulada)                                                                                                          |
| 3.9 Perfil                 | `/mi-cuenta`                                                                                                                                     | Hecho: asistente por pasos, documentos, corrección, abandonar el portal, pedir la baja                                         |
| 3.10 Participación         | `/participa`, `/participa/enviada`                                                                                                               | Hecho: gate, tipos, fotos y video, confirmación, folio, comprobante imprimible                                                 |
| 3.11 Mis participaciones   | `/mi-cuenta/participaciones`, `/mi-cuenta/participaciones/[folio]`                                                                               | Hecho: filtros, búsqueda por folio, línea de tiempo                                                                            |
| 3.12 Propuestas publicadas | `/propuestas`, `/propuestas/[folio]`                                                                                                             | Hecho                                                                                                                          |
| 3.1 portal-core            | —                                                                                                                                                | **Pendiente**                                                                                                                  |
| 3.13 Calidad y E2E         | —                                                                                                                                                | **Pendiente**                                                                                                                  |

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

2. **3.13 Calidad:**
   - auditoría WCAG 2.1 AA;
   - E2E con Playwright: registro → verificar → completar perfil → enviar propuesta → ver el cambio de estado.
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

**Estado actual:**

- Rama `chore/tooling-base`: Next 16.4.2, TypeScript estricto, Tailwind 4, ESLint, Prettier, Vitest, Husky, CI y Dependabot.
- `src/lib/validation/common.ts` sincronizado con el portal y `src/env.ts` con `API_URL`.
- Solo una página (`src/app/page.tsx`).
- **Primer arreglo pendiente:** cambiar el script `typecheck` a `next typegen && tsc --noEmit`, como en el portal. Sin eso la CI falla con `LayoutProps`.

**Patrón de cada pantalla (backlog 2):**

- estados de carga, vacío y error;
- toasts;
- confirmación modal antes de acciones irreversibles;
- validación con zod antes de enviar;
- errores de la API traducidos por código a mensajes en español.

**Orden sugerido, una rama por bloque:**

| Rama                           | Backlog    | Contenido                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `feat/fundaciones-bff`         | 2.1, 2.2   | BFF (route handlers proxy, cookie httpOnly, renovación del token), cliente tipado (orval) más TanStack Query, componentes base (DataTable con filtros en la URL y búsqueda con 300 ms de espera, FormField, FileUpload, ConfirmDialog, StatusBadge, EmptyState, PageHeader), toasts (sonner), middleware de rutas (sesión, onboarding, 403), tema dinámico por alcaldía                                    |
| `feat/acceso-admin`            | 2.3, 2.4   | Login con bloqueo temporal o cuenta desactivada; aceptar invitación (token, cédula V/E, contraseña); olvidé y restablecer                                                                                                                                                                                                                                                                                  |
| `feat/layout-admin`            | 2.5        | Sidebar según permisos, selector de alcaldía con «Operando en: X», menú de usuario, 403/404/500                                                                                                                                                                                                                                                                                                            |
| `feat/onboarding`              | 2.6        | Asistente: logo con recorte → colores con chequeo de contraste → lema → resumen                                                                                                                                                                                                                                                                                                                            |
| `feat/contenido-operador`      | 2.9        | Noticias (Tiptap, portada con recorte, autoguardado a los 30 s, programar, publicar, despublicar), banners (orden por arrastre, vigencia), repositorio documental (subir PDF con progreso, versiones). **Los 5 formatos de noticia del portal** (texto, imagen, galería, documento, video de archivo, YouTube o Instagram) y los campos de la v4: puntos de análisis, botón opcional, destacada en portada |
| `feat/participaciones-revisor` | 2.10       | Bandeja (conteos por estado como filtros, filtros, búsqueda por folio, autor o cédula), detalle en dos columnas (aporte con fotos, video y soporte, y la identidad del autor con sus documentos), control de identidad, transiciones válidas, rechazo con motivo de catálogo y texto de al menos 20 caracteres, publicar o despublicar (solo con nombre autorizado), notas internas, CSV                   |
| `feat/ciudadanos`              | 2.11       | Tabla (cédula enmascarada), detalle con documentos por URL firmada, suspender o reactivar la membresía, CSV                                                                                                                                                                                                                                                                                                |
| `feat/configuracion`           | 2.12       | Branding, catálogos (parroquias, categorías técnicas, de noticias y de documentos, ocupaciones, tipos de organización), editor de fases y fase actual con vista previa del termómetro                                                                                                                                                                                                                      |
| `feat/plataforma`              | 2.7, 2.8   | Alcaldías (crear, suspender, portales con `client_secret` mostrado una vez, rotar), representantes, entidades, usuarios internos (invitar con roles Operador o Revisor)                                                                                                                                                                                                                                    |
| `feat/bitacora-tablero`        | 2.13, 2.14 | Bitácora con diferencias antes y después, verificar integridad, CSV; tablero de indicadores                                                                                                                                                                                                                                                                                                                |
| `chore/calidad-admin`          | 2.15       | Responsive para tablet, accesibilidad, E2E con Playwright                                                                                                                                                                                                                                                                                                                                                  |

**Reglas compartidas con el portal** (el admin debe respetarlas exactamente):

- **Estados de participación:** PENDIENTE → EN_REVISION → APROBADA o RECHAZADA; APROBADA → PUBLICADA solo si `mostrarNombre` es true. Rechazar exige un motivo.
- **Verificación de perfil:** PENDIENTE, VERIFICADO, RECHAZADO o REQUIERE_CORRECCION. Con corrección, el revisor indica **qué documento** (IDENTIDAD, REPRESENTACION o ENTIDAD) y el motivo; el ciudadano solo puede reemplazar ese.
- **Catálogos y estructuras:** los catálogos están en `portal-iribarren/src/lib/api/types.ts` (CATEGORIAS de noticias v4, PARROQUIAS, CATEGORIAS_TECNICAS, OCUPACIONES, CONDICIONES_REPRESENTANTE, TIPOS_ENTIDAD, ESTADOS_*). La forma de `Participacion`, `Cuenta` y `Perfil` está en `portal-iribarren/src/lib/auth/servicio.ts`.
- **Diseño:** reutilizar los tokens del portal (`globals.css`) y adaptar el `Selector`, `Dialogo` y `CampoArchivo` del portal en lugar de crearlos de cero. El backlog pide shadcn/ui: si se usa, que tome estos tokens.
- **Sin API:** simularla igual que en el portal, con un servicio puro en memoria y sus pruebas más fixtures, para construir las pantallas sin bloquearse.

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
| Perfil                  | `GET` / `PUT /portal/perfil`                                                                            | Teléfono y ocupación; en organizaciones, condición, representante, cédula, teléfono institucional y acreditación                                                                                                                    |
| Documentos              | `POST /portal/perfil/documentos`                                                                        | IDENTIDAD, REPRESENTACION o ENTIDAD; PDF, JPG o PNG de 2 MB; cada carga sube la versión y deja el perfil en PENDIENTE                                                                                                               |
| Abandonar o baja        | `DELETE /portal/membresia`, `POST /portal/cuenta/baja`                                                  |                                                                                                                                                                                                                                     |
| Participar              | `POST /portal/participaciones`                                                                          | Cabecera `Idempotency-Key`. Campos: tipo, noticia, parroquia, sector, categoría técnica, descripción (50–3000), hasta 5 fotos, video (enlace YouTube o Instagram), soporte y `mostrarNombre`. Responde con el folio `IRI-AAAA-XXXX` |
| Mis participaciones     | `GET /portal/participaciones?estado&tipo&folio` y `GET /portal/participaciones/{folio}`                 | Con el historial de estados y comentarios                                                                                                                                                                                           |
| Galería pública         | `GET /portal/propuestas?q&tipo&parroquia&categoriaTecnica&pagina` y `GET /portal/propuestas/{folio}`    | Solo PUBLICADA con nombre autorizado; sin datos personales                                                                                                                                                                          |
| Contenido               | `GET /portal/posts`, `/portal/posts/{slug}`, `/portal/banners`, `/portal/documentos`, `/portal/proceso` | Con las formas de `src/lib/api/types.ts`                                                                                                                                                                                            |
