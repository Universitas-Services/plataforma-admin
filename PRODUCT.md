# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Personal de la Alcaldía del Municipio Iribarren**, en oficinas municipales:
  - **Admin de la alcaldía:** invita al equipo, consulta los catálogos, la bitácora, los ciudadanos y todos los indicadores.
  - **Operador:** publica noticias y documentos, elige lo que muestra el Inicio del portal (mensaje del alcalde y anuncios) y mantiene las fases del proceso.
  - **Revisor:** decide sobre las propuestas formales (verificar, rechazar con motivo, publicar) y publica o despublica las opiniones; ve la ubicación de cada propuesta en el mapa.
  - Una misma persona puede ser Operador y Revisor.
- **Super Admin:** existe en cada panel de alcaldía con todos los permisos (y aparte en el proyecto central de registro). Opera con una franja visible que lo recuerda.
- Trabajan sobre todo en monitores de distintos tamaños y en tablet, y a veces en el teléfono. El panel debe ser altamente responsivo.

## Product Purpose

Panel interno de PDUL YA, el portal de participación ciudadana de Iribarren, donde la gente se informa y envía opiniones y propuestas con folio. Desde este panel, la alcaldía:

- publica el contenido del portal y elige lo administrable del Inicio;
- evalúa los aportes y publica los que van al portal;
- gestiona a su equipo;
- mide la participación y el alcance de su contenido.

Cada alcaldía tiene su propia API, su base de datos y su panel. El éxito es que un revisor despache su bandeja con criterio y trazabilidad, y que la alcaldía entienda, con cifras, cómo responde la ciudadanía.

## Positioning

- Un panel por alcaldía, entregado ya personalizado: la identidad es la del portal ciudadano y no se configura desde la aplicación. Otra alcaldía es otro despliegue con su `src/config/alcaldia.ts`.
- Cada acción queda en una bitácora verificable.

## Operating Context

- **Flujo del MVP:**
  1. El equipo técnico despliega el panel con los catálogos y el Admin.
  2. El Admin invita a operadores y revisores.
  3. Los operadores publican y eligen lo que muestra el Inicio.
  4. Llegan participaciones desde el portal.
  5. El revisor publica opiniones y decide sobre las propuestas formales.
  6. El tablero muestra los indicadores por rol, con rango de fechas y CSV.

## Capabilities and Constraints

- **Stack:** Next.js 16 (App Router, Cache Components), React 19, Tailwind 4, Zod 4, Leaflet, Vitest y Playwright.
- **Acceso:** Server Actions con redirecciones _replace_, `proxy.ts` y comprobación de permisos en el servidor.
- **API:** la API de la alcaldía la hace otra persona. Mientras tanto, el panel usa una API simulada en memoria con la forma del backlog de refactorización.
- **Perfil del ciudadano:** queda verificado automáticamente al completar sus documentos. El revisor no verifica perfiles.
- **Estados de participación:**
  - propuesta formal: Pendiente o En revisión → Verificada (APROBADA) o Rechazada, con motivo de catálogo y texto de 20+ caracteres; Verificada → Publicada, y se puede despublicar;
  - opinión: Pendiente («Recibida» en el portal) ↔ Publicada;
  - publicar exige que el autor haya autorizado su nombre.
- **Contenido:** noticias en 5 formatos (texto, imagen, galería, documento PDF y video), documentos con versiones, el Inicio del portal (mensaje del alcalde y anuncios) y las fases del proceso. Conoce el PDUL y el resto del Inicio son fijos.
- **Catálogos:** fijos por despliegue; el panel solo los muestra.
- **Seguridad:** bloqueo tras 5 intentos durante 15 minutos, invitaciones de un uso válidas 72 h, cambiar la contraseña y cerrar todas las sesiones.
- **Validación compartida:** `src/lib/validation/common.ts` es idéntico al del portal.

## Brand Commitments

- **Identidad de PDUL YA**, la misma del portal: rojo #E11D48, noche #2E134D, morado, naranja y amarillo; Montserrat para títulos y Roboto para texto; logos de PDUL YA y de la Alcaldía en `public/brand/`, copiados del portal.
- Se conserva la estructura del panel («Línea y estación»).
- **Voz:** español de Venezuela, claro, institucional y cercano. Sin jerga técnica hacia el personal municipal.

## Evidence on Hand

- Marca: tokens en `portal-iribarren/src/app/globals.css` y logos en `portal-iribarren/public/brand/`.
- Documentos del cliente: backlog de refactorización (API y admin), backlog técnico, SRS y propuesta de gestión ciudadana.
- No hay datos reales de personal, participaciones ni métricas. Los fixtures son de demostración y se rotulan como tales.

## Product Principles

1. **Cada rol ve solo lo suyo:** el menú, las rutas, las acciones y los indicadores salen de los permisos, y el servidor los vuelve a comprobar siempre.
2. **Trazabilidad visible:** estados, motivos, historial y bitácora a la vista.
3. **Despachar rápido sin errores:** densidad útil, filtros en la URL y confirmación antes de lo irreversible.
4. **Cifras honestas:** cada gráfico tiene su tabla y dice qué rango mide.
5. **Funciona en cualquier pantalla:** monitor, tablet y teléfono.

## Accessibility & Inclusion

WCAG 2.1 AA, igual que el portal. Los gráficos se recorren con el teclado y tienen su tabla equivalente.
