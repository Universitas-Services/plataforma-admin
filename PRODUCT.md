# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Personal de cada alcaldía**, en oficinas municipales:
  - **Administrador de la alcaldía:** configura la marca en su primer ingreso, invita al equipo, gestiona catálogos y fases, y consulta la bitácora y los ciudadanos.
  - **Operador:** publica noticias, banners y documentos.
  - **Revisor:** evalúa las opiniones y propuestas de la ciudadanía, cotejando los documentos de identidad del autor.
  - Una misma persona puede ser Operador y Revisor.
- **Equipo de la plataforma:**
  - **Super Admin:** gestiona Representantes, integraciones y configuración global.
  - **Representantes de AVIPRI y Universitas:** crean y administran alcaldías y portales, operan dentro de cualquier alcaldía y ven la bitácora de todas.
- Trabajan sobre todo en monitores de distintos tamaños y en tablet, y a veces en el teléfono. El panel debe ser altamente responsivo.

## Product Purpose

Panel interno de una plataforma multi-alcaldía de participación ciudadana. Cada alcaldía tiene su portal ciudadano (el primero es PDUL YA, de Iribarren), donde la gente se informa y envía opiniones y propuestas con folio. Desde este panel, cada alcaldía:

- publica el contenido de su portal;
- evalúa los aportes (aprobar, rechazar con motivo, publicar);
- gestiona a su equipo y su marca.

La plataforma da de alta y supervisa las alcaldías.

El éxito es que un revisor despache su bandeja con criterio y trazabilidad, y que una alcaldía nueva quede operando sin ayuda técnica.

## Positioning

- Es un solo panel para todas las alcaldías: la interfaz base es neutra (la marca de la plataforma) y cada alcaldía aplica su propia capa de marca (logo, colores y lema), que su administrador configura en el onboarding.
- Cada acción queda en una bitácora verificable.

## Operating Context

- **Flujo del MVP:**
  1. La plataforma crea la alcaldía.
  2. El administrador acepta la invitación y completa el asistente de marca.
  3. El administrador invita a operadores y revisores.
  4. Los operadores publican.
  5. Llegan participaciones desde el portal.
  6. El revisor las pasa a revisión, confirma la identidad, aprueba o rechaza, y publica.
- La alcaldía en uso se elige con «Operando en: X» para los roles de plataforma y para el personal de varias alcaldías.

## Capabilities and Constraints

- **Stack:** Next.js 16 (App Router, Cache Components), React 19, Tailwind 4, Zod 4, Vitest y Playwright.
- **Acceso:** Server Actions con redirecciones _replace_, `proxy.ts` y comprobación de permisos en el servidor.
- **API:** `plataforma-api` (NestJS) la hace otra persona. Mientras tanto, el panel usa una API simulada en memoria con la forma de los endpoints del backlog.
- **Perfil del ciudadano:** queda verificado automáticamente al completar sus documentos. El revisor no verifica perfiles; solo evalúa cada aporte y coteja los documentos del autor.
- **Estados de participación:** PENDIENTE → EN_REVISION → APROBADA o RECHAZADA, con motivo de catálogo y texto de al menos 20 caracteres. APROBADA → PUBLICADA, solo con nombre autorizado, y se puede despublicar.
- **El contenido debe cubrir lo que muestra el portal:**
  - noticias en 5 formatos (texto, imagen, galería, documento PDF y video de archivo, YouTube o Instagram), con puntos de análisis, botón opcional, destacada, alt obligatorio y crédito de fotos;
  - banners con vigencia y orden;
  - documentos con versiones y estado borrador u oficial.
- **Seguridad:** bloqueo tras 5 intentos durante 15 minutos, invitaciones de un uso válidas 72 h, cambiar la contraseña y cerrar todas las sesiones.
- **Validación compartida:** `src/lib/validation/common.ts` es idéntico al del portal (cédula, RIF, teléfono, correo, contraseña y archivos).
- **Sin decidir:**
  - el flujo de un usuario interno con varias alcaldías (lo resuelve el backend);
  - las integraciones y la configuración global del Super Admin, que no tienen pantalla definida.

## Brand Commitments

- **Marca neutra de la plataforma:** «Plataforma de Participación Ciudadana».
  - Logos en `public/marca/`, originales en `Downloads/Plataforma-Participacion-Ciudadana_logos`.
  - Isotipo: dos burbujas de diálogo; la principal lleva un check.
  - Colores: azul institucional #1F3864, turquesa #17A398, gris azulado #4B5B7C y blanco.
  - Tipografía del logo: Poppins.
  - Versión blanca sobre fondos oscuros. Tamaños mínimos: isotipo 24 px y horizontal 160 px. No deformar, recolorear ni añadir sombras.
- **Capa de alcaldía:** dentro de una alcaldía con onboarding completo, el panel usa su logo, sus colores primario y secundario y su lema. La marca de la plataforma queda por encima solo en los flujos de plataforma, el inicio de sesión y el asistente.
- **Voz:** español de Venezuela, claro, institucional y cercano. Sin jerga técnica hacia el personal municipal.

## Evidence on Hand

- Logos de la plataforma: el set completo con su LEEME.
- Marca de Iribarren: el rojo #c32026 y el resto de los tokens en `portal-iribarren/src/app/globals.css`.
- Documentos del cliente: backlog técnico (sección 2), SRS, flujo esperado del MVP y propuesta de gestión ciudadana.
- No hay datos reales de alcaldías, personal ni participaciones. Los fixtures son de demostración y deben rotularse como tales.

## Product Principles

1. **Neutro por defecto, propio por alcaldía:** nada de la interfaz base debe chocar con la marca que cada alcaldía elija.
2. **Cada rol ve solo lo suyo:** el menú, las rutas y las acciones salen de los permisos, y el servidor los vuelve a comprobar siempre.
3. **Trazabilidad visible:** estados, motivos, historial y bitácora a la vista.
4. **Despachar rápido sin errores:** densidad útil, filtros en la URL y confirmación antes de lo irreversible.
5. **Funciona en cualquier pantalla:** monitor, tablet y teléfono.

## Accessibility & Inclusion

WCAG 2.1 AA, igual que el portal. El contraste de los colores que elige cada alcaldía se valida en el onboarding y se compensa en la interfaz.
