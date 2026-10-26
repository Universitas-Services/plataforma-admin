---
name: Panel PDUL YA · Alcaldía de Iribarren
description: Panel interno de la Alcaldía del Municipio Iribarren, con la identidad del portal ciudadano PDUL YA y la navegación dibujada como una línea de metro.
colors:
  marca: "#E11D48"
  marca-texto: "#BE123C"
  sobre-marca: "#FFFFFF"
  marca-suave: "#FFE4EA"
  noche: "#2E134D"
  naranja: "#F97316"
  amarillo: "#F59E0B"
  tinta: "#1E293B"
  cuerpo: "#334155"
  gris: "#475569"
  tenue: "#94A3B8"
  linea: "#E2E8F0"
  fila: "#EEF2F6"
  superficie: "#F8FAFC"
  cabecera: "#F1F5F9"
  papel: "#FFFFFF"
  turquesa: "#28A745"
  turquesa-texto: "#1D6E33"
  ambar: "#F59E0B"
  ambar-texto: "#92400E"
  peligro: "#B91C1C"
  peligro-suave: "#FEF2F2"
typography:
  display:
    fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1
    fontFeature: '"tnum"'
  headline:
    fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
    fontFeature: '"tnum"'
  title:
    fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.56
    letterSpacing: "-0.02em"
    fontFeature: '"tnum"'
  body:
    fontFamily: "Roboto, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: '"tnum"'
  label:
    fontFamily: "Roboto, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.43
    fontFeature: '"tnum"'
  meta:
    fontFamily: "Roboto, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
    fontFeature: '"tnum"'
  column-header:
    fontFamily: "Roboto, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "0.025em"
    fontFeature: '"tnum"'
rounded:
  punta: "4px"
  md: "6px"
  lg: "8px"
  control: "12px"
  sheet: "24px"
  full: "9999px"
spacing:
  page-phone: "16px"
  page-tablet: "24px"
  page-desktop: "32px"
  control-height: "44px"
  control-min: "40px"
  sidebar: "248px"
  cajon: "280px"
  band: "56px"
  columna-max: "24px"
components:
  button-primary:
    backgroundColor: "{colors.marca}"
    textColor: "{colors.sobre-marca}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
    typography: "{typography.label}"
  button-secondary:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
    typography: "{typography.label}"
  button-danger:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.peligro}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
    typography: "{typography.label}"
  button-danger-hover:
    backgroundColor: "{colors.peligro-suave}"
  input:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
    typography: "{typography.body}"
  chip-filter:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "40px"
    typography: "{typography.body}"
  chip-filter-active:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel}"
    rounded: "{rounded.full}"
  insignia-estado:
    textColor: "{colors.tinta}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
    typography: "{typography.meta}"
  estacion:
    textColor: "{colors.tinta}"
    padding: "0 16px 0 58px"
    height: "44px"
    typography: "{typography.body}"
  estacion-activa:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
  sigla-alcaldia:
    backgroundColor: "{colors.marca}"
    textColor: "{colors.sobre-marca}"
    rounded: "{rounded.md}"
    width: "48px"
    height: "40px"
  franja-super-admin:
    backgroundColor: "{colors.noche}"
    textColor: "{colors.papel}"
    padding: "6px 16px"
  tabla-cabecera:
    backgroundColor: "{colors.cabecera}"
    textColor: "{colors.gris}"
    padding: "10px 12px"
    typography: "{typography.column-header}"
  cifra-kpi:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.lg}"
    padding: "16px"
    typography: "{typography.display}"
  columna-grafico:
    backgroundColor: "{colors.marca}"
    rounded: "{rounded.punta}"
    width: "24px"
---

# Design System: Panel PDUL YA · Alcaldía de Iribarren

## Overview

**Creative North Star: "Línea y estación, en rojo PDUL YA"**

El panel es el de una sola alcaldía, Iribarren, y se entrega ya vestido con la identidad del portal ciudadano PDUL YA (campaña «Barquisimeto suena en ti»): el rojo de marca, la noche morada, Montserrat en los títulos y Roboto en el texto. Otra alcaldía es otro despliegue con su propio `src/config/alcaldia.ts`; dentro de la aplicación no hay marca configurable, onboarding ni selector de alcaldía. Los logos (PDUL YA horizontal con divisor, isotipo «Catastral Verde» y el logo de la Alcaldía) viven en `public/brand/`.

La estructura se conserva: la señalética de metro presta un solo gesto, la línea con estaciones. El sidebar es una línea vertical roja con una estación por sección; cada aporte ciudadano recorre su propia línea de estados en la tabla; la página de error es una «estación fuera de servicio». La interfaz es de oficina: fondo blanco, superficie de navegación pizarra muy clara, filetes finos y texto pizarra oscuro. La densidad es la de una herramienta de despacho: tablas apretadas, cifras tabulares, controles de 40 a 44 px.

La banda oscura del portal (`patron-urbano`: noche con brillos naranja y rosa y una cuadrícula urbana) aparece solo donde el panel se presenta: el acceso y la vista previa de la tarjeta del Inicio del portal. Dentro del trabajo diario, el oscuro se limita a franjas de 1 línea (sesión de Super Admin, entorno de demostración).

**Key Characteristics:**

- Una sola metáfora estructural (línea y estación) en navegación, estados, historial de versiones y páginas de error.
- Rojo PDUL YA para dibujar (línea, botón primario, serie de datos) y su versión oscura para texto; noche para títulos y bandas.
- Estado legible por forma (trazo lleno o discontinuo, punto lleno o hueco), nunca solo por color.
- Montserrat en títulos y cifras grandes; Roboto con cifras tabulares en todo lo demás.
- Plano por defecto; la sombra solo aparece en lo que flota.

## Colors

Rojo y noche de PDUL YA sobre neutros pizarra, con verde, ámbar y rojo de error como semánticos. La paleta vive en `@theme` de `src/app/globals.css`; `--marca` y sus derivados se fijan en `:root` con los mismos valores del rojo.

### Primary

- **Rojo PDUL YA** (`marca`, igual a `--color-rojo`): la línea del sidebar y su remate, el marcador de la estación activa, el filete izquierdo de 4 px de la barra superior, la sigla «IRI», el fondo del botón primario, el subrayado de la pestaña activa, la serie única de los gráficos, el tramo cumplido del termómetro, el pin del mapa y el contorno de foco global. Sobre blanco mide 4.7:1, así que también vale como elemento gráfico (≥ 3:1).
- **Rojo para texto** (`marca-texto`, igual a `--color-rojo-oscuro`): enlaces de acción, «Ver como tabla», iconos de estado vacío y de selector, borde de campo enfocado, borde de la fase actual, citas y enlaces del cuerpo de noticia.
- **Blanco sobre marca** (`sobre-marca`): el texto del botón primario y de la sigla.
- **Lavado rojo** (`marca-suave`): fondo de la opción elegida en las tarjetas de formato del editor de noticias.

### Secondary

- **Noche** (`noche`): color de `h1`, `h2` y `h3`; fondo de la franja «Sesión de Super Admin» y del aviso de entorno de demostración; base del `patron-urbano`; `theme-color` del documento; fondo de la miniatura sin portada en Anuncios. Sobre noche solo va blanco.
- **Naranja** (`naranja`): solo como brillo radial del `patron-urbano`. Nunca lleva texto blanco encima.
- **Amarillo** (`amarillo`): fondo de la selección de texto, con texto en noche. Nunca lleva texto blanco encima.

`--color-morado-activo` (#44226E) está definido en `@theme` por paridad con el portal, pero el panel no lo usa.

### Tertiary

- **Verde de éxito** (`turquesa`, el nombre se conserva por compatibilidad): punto de «Publicadas» en los chips, lavado al 10–15 % de las insignias Publicada y Oficial, borde al 40 % de Verificada y Activa, avisos de éxito. Nunca como color de texto.
- **Verde para texto** (`turquesa-texto`): texto de éxito en insignias y avisos; trazo y estación del tramo «publicada» de noticias.
- **Ámbar** (`ambar`): tramo del recorrido con más de 4 días de espera, segmento de la fase actual del termómetro, borde de la insignia «Fase actual» y de los avisos solo de demostración.
- **Ámbar para texto** (`ambar-texto`): texto de la insignia «Fase actual» y fecha «Recibida» atrasada.
- **Peligro** (`peligro`) y **Peligro suave** (`peligro-suave`): errores de campo, borde de campo inválido, insignias Rechazada y Suspendida, botón de peligro (texto peligro, borde al 40 %, hover en peligro-suave), cifra de pendientes con más de 7 días.

### Neutral

- **Cuerpo** (`cuerpo`): color de texto base del documento y del cuerpo de noticia.
- **Tinta** (`tinta`): texto fuerte, etiquetas, folios, cifras KPI, trazo del recorrido, chip activo, contador de estación.
- **Gris** (`gris`): bajadas, metadatos, cabeceras de columna, ejes y rótulos de gráficos, leyendas.
- **Tenue** (`tenue`): placeholders, borde en hover de controles, guía vertical del tooltip, estaciones futuras, barra de desplazamiento.
- **Filete** (`linea`): bordes de controles, tarjetas, tablas, sidebar y barra superior; rejilla de gráficos; segmentos futuros del termómetro.
- **Fila** (`fila`): separadores de fila y pista de las barras horizontales.
- **Superficie** (`superficie`): fondo del sidebar, del cajón y del selector de rango; hover de botones de icono.
- **Cabecera** (`cabecera`): fondo de cabecera de tabla y del número de fase.
- **Papel** (`papel`): fondo de página, tarjetas, campos, menús, diálogos y estación activa.

### Named Rules

**The Marca Dibuja Rule.** `--marca` dibuja: línea, marcadores, filete de la barra, sigla, botón primario, pestaña activa y la serie de datos. No tiñe fondos de sección, tablas ni texto corrido; para texto en tono de marca se usa `--marca-texto`.

**The Blanco Solo Sobre Oscuro Rule.** El blanco va solo sobre rojo, rojo oscuro, noche o morado. Naranja y amarillo nunca llevan texto blanco; sobre amarillo, el texto es noche.

**The Verde Es Un Punto Rule.** `turquesa` aparece como punto, borde translúcido o lavado; el texto de éxito siempre usa `turquesa-texto`.

## Typography

**Display Font:** Montserrat (con ui-sans-serif, system-ui, sans-serif), pesos 600, 700 y 800
**Body Font:** Roboto (con ui-sans-serif, system-ui, sans-serif), pesos 400, 500 y 700

**Character:** las mismas fuentes del portal ciudadano. Montserrat, geométrica y ancha, da voz a los títulos y a las cifras grandes; Roboto sostiene la lectura densa de tablas y formularios. Las cifras son tabulares en todo el documento (`font-variant-numeric: tabular-nums` en `html`) para que folios, conteos y fechas se alineen.

### Hierarchy

- **Display** (Montserrat 700, 1.75rem, 1): cifras KPI del tablero, en tinta. El título «Panel PDUL YA» del acceso usa Montserrat 800 a 1.875rem (escritorio) o 700 a 1.125rem (teléfono), en blanco sobre la banda.
- **Headline** (Montserrat 700, 1.75rem, 1.25, −0.02em): título de página (`h1`) en noche con `text-wrap: balance`. Uno por pantalla.
- **Title** (Montserrat 700, 1.125rem, −0.02em): `h2` de diálogos, estados vacíos y secciones del editor del Inicio; `h3` de secciones del tablero.
- **Body** (Roboto 400, 0.9375rem, 1.5): celdas, bajadas de página, estaciones, chips, campos. El cuerpo de noticia usa 1.65 de interlínea.
- **Label** (Roboto 700, 0.875rem): etiquetas de campo en tinta y títulos de tarjeta (`h4`, 1rem). Los botones usan 0.875rem en 600.
- **Meta** (Roboto 600, 0.8125rem): insignias de estado y leyenda del recorrido (en 400).
- **Column header** (Roboto 600, 0.75rem, 0.025em, mayúsculas): cabeceras de columna de tabla y rótulos `dt` de las fichas de detalle, en gris.
- **Rótulo de gráfico** (Roboto 400, 11 px): ejes y fechas de los gráficos, en gris; el ancho del SVG sigue al contenedor para que se mantenga en 11 px.

### Named Rules

**The Montserrat Titula Rule.** Montserrat solo en `h1`–`h3`, cifras KPI y el título del acceso. Etiquetas, botones, tablas y `h4` van en Roboto.

**The Cifras En Columna Rule.** Todo número va en cifras tabulares; un conteo se destaca con peso (700), no con color. Solo la cifra KPI sube de tamaño.

**The Mayúsculas Solo En Columna Rule.** Las mayúsculas espaciadas existen únicamente en cabeceras de columna y rótulos `dt`. No se usan como antetítulo sobre títulos.

## Layout

Marco de dos columnas desde 1024 px: sidebar fijo de 248 px (`superficie`, filete derecho, alto completo y pegado) y contenido fluido. Encima del contenido, una barra de 56 px pegada arriba, sobre papel al 95 % con desenfoque, con un filete izquierdo de 4 px en marca, el nombre de la alcaldía en tinta 600 y el menú de usuario a la derecha. Para el Super Admin, sobre esa barra va la franja noche «Sesión de Super Admin». El contenido usa 16 px de margen lateral en teléfono, 24 px desde 640 px y 32 px desde 1024 px, con 24/32 px verticales.

El encabezado de página apila título y bajada a la izquierda y las acciones a la derecha desde 640 px; en teléfono las acciones bajan. Los controles miden 44 px (mínimo 40 px en botones y chips).

El tablero agrupa los indicadores por sección (Participación, Contenido, Ciudadanía, Equipo), separadas 40 px: cuatro cifras KPI en rejilla de 2 columnas (4 desde 1024 px), luego el gráfico de columnas junto a un reparto en proporción 1.6 : 1 desde 1280 px, y una fila de tres repartos (2 desde 768 px).

**Respuesta por ancho:**

- **≥ 1024 px:** sidebar visible. **< 1024 px:** la línea se abre como cajón lateral (`dialog` nativo, 280 px, máximo 85vw) desde el botón de menú de la barra.
- **< 640 px:** las tablas se convierten en lista apilada; folio, estado y recorrido nunca se ocultan y las columnas secundarias aparecen por escalones (md, lg, xl, 2xl).
- **< 640 px:** los filtros se pliegan tras «Filtros (n)»; los chips pasan a una fila con desplazamiento horizontal sin barra.
- **< 640 px:** los selectores abren como hoja inferior (máximo 75dvh, esquinas superiores de 24 px, respeta el área segura).
- **< 640 px:** la barra muestra la sigla y el nombre corto («Iribarren») en lugar del nombre completo.
- **< 1024 px:** en editores con barra de acción, la acción principal queda fija al pie.

Las pantallas de acceso usan otro reparto: banda `patron-urbano` a la izquierda (5/12) con el isotipo, «Panel PDUL YA», una línea de estaciones en blanco y la bajada; a la derecha (7/12, máximo 448 px), los logos de PDUL YA y de la Alcaldía separados por un filete vertical, y el formulario. En teléfono la banda se reduce a una franja con isotipo de 48 px y el nombre.

## Elevation & Depth

Plano por defecto. La profundidad se construye con tonos (superficie pizarra del sidebar contra papel) y filetes de 1 px. La sombra existe solo en lo que flota: menús, listas desplegables, hojas inferiores, diálogos, avisos y el tooltip de los gráficos. Los fondos de modal son tinta al 40–50 %.

### Shadow Vocabulary

- **Panel** (`box-shadow: 0 12px 32px -16px rgb(15 23 42 / 0.28), 0 2px 6px -2px rgb(15 23 42 / 0.08)`): menú de usuario, selector desplegado, hoja inferior, diálogo, aviso y tooltip; acompañada de un anillo de 1 px en `linea` salvo en el diálogo.
- **Segmento elegido** (sombra pequeña con anillo de 1 px en `linea`): solo el segmento activo de un control segmentado (rango del tablero, fuente de video) sobre su riel `superficie`.
- **Anillo de correspondencia** (`box-shadow: 0 0 0 2px var(--marca)`): exclusivo del marcador de estación activa y de la estación de la página de error. No es elevación.

### Named Rules

**The Solo Flota Rule.** Tarjetas, cifras KPI, tablas y secciones no llevan sombra; si un elemento no se superpone al contenido, se separa con filete.

## Shapes

Radios suaves heredados del portal: 12 px en controles (botones, campos, selectores, contenedor del mapa, tabla de datos, tooltip), 8 px en contenedores (tarjetas, cifras KPI, tablas, menús, diálogos, avisos, estados vacíos), 6 px en la sigla y los rótulos tipo señal, y círculo completo en chips, insignias, contadores, marcadores, barras horizontales y el termómetro. La hoja inferior abre con 24 px arriba. Las columnas de los gráficos tienen la punta redondeada de 4 px y la base recta. El trazo discontinuo (5 3) es el signo de «en espera»; los bordes discontinuos repiten ese sentido en estados vacíos, «Borrador de trabajo», «Datos de demostración» y avisos de demostración.

## Components

### Buttons

Firmes y redondeados; un primario por vista.

- **Shape:** esquinas redondeadas (12 px).
- **Primary:** fondo marca, texto blanco, 600, mínimo 40 px de alto y 16 px laterales; en los formularios de acceso, 44 px de alto, 24 px laterales y ancho completo. Hover: `brightness(1.1)`; en acceso, pulsación a escala 0.98 en 150 ms con salida exponencial.
- **Secondary:** papel con filete `linea`, texto tinta, 600; el hover solo oscurece el borde a `tenue`. Es el botón por defecto.
- **Danger:** papel con borde peligro al 40 %, texto peligro; hover en `peligro-suave`. Para «Rechazar».
- **Icon button:** 40–44 px cuadrado, sin borde, hover en `superficie`.
- **Text action:** texto en `marca-texto`, 600, subrayado en hover.
- **Disabled:** opacidad 50 % y cursor bloqueado; el motivo se explica debajo en gris con icono de ayuda.

### Chips

- **Style:** píldora de 40 px, filete `linea`, texto tinta en 0.9375rem 500 y el conteo en 700. Publicadas lleva un punto verde de 8 px.
- **State:** son enlaces de filtro: el activo se rellena en tinta con texto papel y `aria-current`. Hover: borde `tenue` (inactivo) o fondo `cuerpo` (activo).

### Status Insignia

- Píldora con filete, 0.8125rem 600, y un punto de 8 px con borde de 2 px en el color del texto. El punto **lleno o hueco repite el estado sin color**: lleno = en marcha o logrado (En revisión, Verificada, Publicada, Activa); hueco = esperando o detenido (Pendiente, Rechazada, Suspendida).
- Color por estado: Pendiente con filete tenue; Verificada y Activa en verde-texto con borde verde al 40 %; Publicada sobre verde al 15 %; Rechazada y Suspendida en peligro.

### Cards / Containers

- **Corner Style:** 8 px.
- **Background:** papel.
- **Shadow Strategy:** ninguna (ver Elevation & Depth).
- **Border:** filete `linea`; discontinuo en estados vacíos.
- **Internal Padding:** 16 px en cifras KPI, avisos y filas; 20 px en tarjetas del tablero; 24 px en diálogos; 24 × 48 px en estados vacíos (icono de 28 px en marca-texto, título, texto en gris con ancho de lectura, acción).

### Inputs / Fields

- **Style:** 44 px de alto, papel, filete `linea`, 12 px, 16 px laterales, texto tinta, placeholder tenue. Etiqueta encima en 0.875rem 700 tinta, separada 6 px; «(opcional)» en gris 400.
- **Focus:** el borde pasa a `marca-texto`; los selectores suman un anillo de 2 px en marca al 20 %. El resto de elementos enfocables usa el contorno global de 3 px en rojo con 2 px de separación.
- **Error:** borde peligro y mensaje debajo en 0.875rem peligro (con icono de alerta en los selectores).
- **Hover:** borde `tenue`.

### Navigation (la línea)

- **Cabecera:** logo horizontal de PDUL YA a 44 px de alto y debajo «Panel de la Alcaldía de Iribarren» en 0.75rem 500 gris; luego el rótulo de línea (sigla «IRI» en marca, 700, tracking amplio) y «Línea Iribarren» en 0.9375rem 700 tinta.
- **Línea:** barra vertical de 4 px en marca que remata en una barra horizontal redondeada de fin de recorrido.
- **Estaciones:** filas de 44 px, 0.9375rem. Inactiva: círculo de 12 px con borde de 3 px en marca sobre papel, texto 500; hover en papel al 60 %. Activa: círculo de correspondencia de 20 px relleno en marca con borde papel y anillo de marca, fila en papel con esquina derecha redondeada, texto 700 y `aria-current="page"`; el círculo crece en 200 ms con salida exponencial.
- **Contador:** píldora tinta con texto papel en 0.75rem 600 (aportes por atender).
- **Mobile:** la misma línea en un cajón `dialog` que entra desde la izquierda en 200 ms; fondo tinta al 40 %, foco atrapado, se cierra al navegar.

### Franja «Sesión de Super Admin»

Línea de 0.75rem 500 en blanco sobre noche, centrada, con icono de escudo de 14 px, encima de la barra superior: recuerda al Super Admin que opera la alcaldía con todos los permisos y que queda en la bitácora. El aviso «Entorno de demostración» usa la misma franja en todo el documento.

### Pestañas de contenido

Fila de enlaces de 44 px sobre un filete inferior; la activa lleva un subrayado de 3 px en marca y texto tinta, las demás gris con hover a tinta. Desplazamiento horizontal sin barra en teléfono.

### Recorrido (firma)

El estado de un aporte dibujado como línea de metro, en SVG de 24 px de alto.

- **Tramo completado:** trazo lleno de 3 px en tinta; estaciones cumplidas rellenas (radio 4.5).
- **Tramo en espera:** trazo discontinuo (5 3) de 3 px; su longitud es la antigüedad.
- **Alerta:** con más de 4 días, el tramo en espera pasa a ámbar y la fecha «Recibida» a ámbar-texto seminegrita.
- **Estación actual:** anillo de 3 px en tinta sobre papel; **futuro:** trazo de 1.5 px en `linea` y estaciones huecas en tenue.
- Lleva `role="img"` con etiqueta legible y una leyenda al pie de toda tabla que lo use. Se dibuja en tinta, no en marca.

### Sigla de alcaldía

La sigla «IRI» en 0.75rem 700 con tracking amplio, blanco sobre marca, en losa de 6 px (48 × 40 px; 24 px de alto en la barra móvil).

### Tabla de cola

Densa: celdas de 10 × 12 px, filas separadas por `fila`, cabecera en `cabecera` con mayúsculas de columna; el folio en tinta 600; la columna ordenada marca su sentido con una flecha y `aria-sort`.

### Tablero de indicadores

- **Cifra KPI:** tarjeta de 16 px con la etiqueta en 0.875rem gris, la cifra en Display tinta y un detalle en gris (en peligro 600 cuando señala atraso).
- **Columnas (SVG propio):** una sola serie en `marca`; columnas de hasta 24 px con punta redondeada de 4 px y base recta; rejilla horizontal de 1 px en `linea` con tres marcas (0, mitad, tope «redondo»); rótulos de 11 px en gris, uno cada ~80 px. Con el puntero o las flechas (Inicio/Fin incluidos), la columna elegida queda en marca, las demás al 45 %, aparece una guía vertical en `tenue` y un tooltip papel de 12 px con sombra panel (cifra en tinta 700, tramo de fechas en gris). Lectura `aria-live` para lector de pantalla.
- **Ver como tabla:** cada gráfico lleva debajo un `details` en `marca-texto` con la misma serie en tabla (cabecera pegada, máximo 256 px de alto).
- **Barras horizontales:** para repartos y rankings; nombre (enlace a la ficha si existe) y valor 600 en la misma línea, debajo una pista de 8 px en `fila` con la barra en marca, ambas en píldora. Todas llevan su número, sin tooltip.
- **Selector de rango:** control segmentado sobre riel `superficie`, junto a «Exportar CSV» en secundario.

### Editor del Inicio del portal

Dos columnas desde 1024 px. **Mensaje del alcalde:** selector de noticias de formato Texto y, debajo, una aproximación de la tarjeta del portal sobre `patron-urbano` (radio 20 px, título en Montserrat 700, resumen en blanco al 90 %) con pie de figura en gris. **Anuncios:** lista ordenada de hasta 6 noticias en tarjetas de 8 px con asa de arrastre, número de posición en círculo `superficie`, miniatura de 80 × 48 px (noche con icono si no hay portada) y flechas «Subir»/«Bajar»; el elemento arrastrado toma borde `marca-texto` y opacidad 60 %. El cambio de posición se anuncia por `aria-live`.

### Proceso (termómetro)

Vista previa del termómetro del portal: segmentos de 8 px en píldora, cumplidos en marca, el actual en ámbar y los siguientes en `linea`, con el nombre de cada fase debajo desde 768 px y su estado en texto oculto. Debajo, la lista de fases en tarjetas de 8 px con el número en círculo `cabecera`; la fase actual lleva borde `marca-texto` y la insignia «Fase actual» (bandera, ámbar). Las fases se crean y editan en diálogo.

### Alcance

Vistas, «me gusta» y «no me gusta» de una noticia o un aporte en una sola línea de 0.875rem tabular en `cuerpo`, cada cifra con su icono de 14 px en gris y su nombre para lector de pantalla. Sin vistas, «Sin vistas» en gris.

### Mapa de ubicación (Revisor)

Mapa Leaflet de solo lectura con teselas de OpenStreetMap y su atribución, 256 px de alto (288 px desde 640 px), radio 12 px, filete `linea`, encuadrado al municipio. El pin es una gota roja (marca) con borde blanco de 3 px y centro blanco. Debajo, las coordenadas tabulares con icono y «Abrir en Google Maps» en `marca-texto`; si el punto cae fuera del municipio, un aviso en peligro 600.

### Acciones del Revisor

Dependen del tipo de aporte. **Opinión:** una sola acción, «Publicar en el portal» (primario con icono de globo) o «Despublicar» (secundario). **Propuesta formal:** «Marcar como verificada» (primario), «Rechazar» (peligro) y «Publicar en el portal» (primario), siempre visibles; las que no aplican quedan deshabilitadas y su motivo se lista debajo en gris con icono de ayuda. Cada acción se confirma en diálogo; el rechazo pide motivo.

### Diálogo

`dialog` nativo, máximo 448 px, papel, 8 px, sombra panel, fondo tinta al 50 %. Acciones al pie, apiladas al revés en teléfono.

### Estado de una noticia (tramo)

Legible sin color: borrador = tramo discontinuo sin estación; programada = discontinuo hasta una estación hueca, en tinta; publicada = tramo lleno hasta la estación llena, en verde-texto; despublicada = tramo lleno cortado con un remate.

### Documentos

«Oficial» con sello lleno sobre verde al 10 %; «Borrador de trabajo» con contorno discontinuo en tenue. El historial de versiones es una línea vertical: la vigente es el círculo de correspondencia en marca, las anteriores estaciones huecas.

### Aviso (toast)

Abajo a la derecha (abajo al centro en el teléfono), papel con borde verde o rojo, icono, sombra panel y botón para cerrar; entra en 200 ms con salida exponencial. Los de éxito se van solos salvo con el puntero o el foco encima; los de error esperan.

### Esqueletos de carga

Cada pantalla tiene el suyo con su forma real; brillo de 1.4 s que queda estático con movimiento reducido. Un solo `role="status"` «Cargando…» por pantalla.

### Página de error (403, 404, 500)

«Estación fuera de servicio»: tramo lleno en marca, la estación como círculo de correspondencia, un tramo discontinuo en tenue y el remate con el código como rótulo en tinta. Dentro del panel conserva el marco; fuera, lleva el logo horizontal de PDUL YA.

## Do's and Don'ts

### Do:

- **Do** tomar nombre, sigla, límites del municipio y logos de `src/config/alcaldia.ts` (`ALCALDIA`, `LOGOS`), nunca escribirlos a mano en una pantalla.
- **Do** usar `--marca` para dibujar y `--marca-texto` para cualquier texto, icono o borde de foco en tono rojo.
- **Do** expresar cada estado por forma además de color: trazo lleno o discontinuo, punto lleno o hueco.
- **Do** dibujar los gráficos con una sola serie en marca, columnas de hasta 24 px con punta de 4 px, rejilla de 1 px en `linea`, tooltip por puntero y teclado, y siempre «Ver como tabla».
- **Do** mantener cifras tabulares y destacar conteos con peso 700.
- **Do** convertir tablas en listas apiladas por debajo de 640 px sin ocultar folio, estado ni recorrido.
- **Do** animar entre 150 y 250 ms con `cubic-bezier(0.23, 1, 0.32, 1)` y dejar que `prefers-reduced-motion: reduce` anule animaciones y transiciones.
- **Do** usar controles de 44 px de alto (40 px como mínimo).

### Don't:

- **Don't** poner texto blanco sobre naranja o amarillo, ni usar `turquesa` como color de texto.
- **Don't** pintar con `--marca` fondos de sección, tablas o el recorrido.
- **Don't** usar el `patron-urbano` dentro del trabajo diario: es la banda del acceso y de la vista previa del portal.
- **Don't** poner sombra a tarjetas, cifras KPI, tablas o secciones; la sombra panel es solo para lo que flota.
- **Don't** usar mayúsculas espaciadas fuera de cabeceras de columna y rótulos `dt`, ni antetítulos sobre los títulos.
- **Don't** reintroducir marca configurable, selector de alcaldía o franja «Operando en»: otra alcaldía es otro despliegue.
- **Don't** colocar los logos de PDUL YA horizontal o de la Alcaldía sobre fondo oscuro; sobre oscuro va el isotipo.
