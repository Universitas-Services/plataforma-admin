---
name: Plataforma de Participación Ciudadana · Panel
description: Panel interno de despacho municipal dibujado como una red de metro, con la marca de cada alcaldía como color de línea.
colors:
  tinta: "#1F3864"
  cuerpo: "#2B3852"
  gris: "#4B5B7C"
  tenue: "#8592A8"
  linea: "#DCE1E9"
  fila: "#E7EBF1"
  superficie: "#EEF1F5"
  cabecera: "#F6F7FA"
  papel: "#FFFFFF"
  turquesa: "#17A398"
  turquesa-texto: "#0E7A71"
  ambar: "#B7791F"
  ambar-texto: "#8A5A12"
  peligro: "#B42318"
  peligro-suave: "#FDECEA"
  marca: "#1F3864"
  sobre-marca: "#FFFFFF"
  marca-texto: "#1F3864"
  marca-suave: "#E9EBF0"
typography:
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
    fontFeature: '"tnum"'
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "-0.01em"
    fontFeature: '"tnum"'
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: '"tnum"'
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.43
    fontFeature: '"tnum"'
  meta:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
    fontFeature: '"tnum"'
  column-header:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "0.025em"
    fontFeature: '"tnum"'
rounded:
  control: "6px"
  lg: "8px"
  sheet: "24px"
  full: "9999px"
spacing:
  page-phone: "16px"
  page-tablet: "24px"
  page-desktop: "32px"
  control-height: "44px"
  control-min: "40px"
  sidebar: "248px"
  band: "56px"
components:
  button-primary:
    backgroundColor: "{colors.marca}"
    textColor: "{colors.sobre-marca}"
    rounded: "{rounded.control}"
    padding: "0 24px"
    height: "44px"
    typography: "{typography.label}"
  button-secondary:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
    typography: "{typography.label}"
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
    rounded: "{rounded.control}"
    width: "48px"
    height: "40px"
  tabla-cabecera:
    backgroundColor: "{colors.cabecera}"
    textColor: "{colors.gris}"
    padding: "10px 12px"
    typography: "{typography.column-header}"
---

# Design System: Plataforma de Participación Ciudadana · Panel

## Overview

**Creative North Star: "Línea y estación"**

El panel es una red de metro. La señalética del Metro de Caracas presta el tipo, la paleta, la densidad y un solo gesto: la línea con estaciones. El sidebar es una línea vertical con una estación por sección; cada aporte ciudadano recorre su propia línea de estados en la tabla. Quien entra sabe en qué alcaldía opera (la franja «Operando en» con borde de marca), dónde está (la estación activa) y qué espera más (tramos largos y en ámbar).

La interfaz es neutra y de oficina: fondo blanco, superficie de navegación gris azulada, filetes finos, texto azul institucional. Pensada para luz de tubo y uso sostenido en monitor, tablet y teléfono. La densidad es la de una herramienta de despacho: tablas apretadas, cifras tabulares, controles estándar. El único color que cambia es `--marca`, que cada alcaldía fija al completar su configuración; sin alcaldía, la marca es el azul de la plataforma.

Se rechaza el panel gris genérico con un acento suelto: el color de marca no decora, dibuja la línea.

**Key Characteristics:**

- Una sola metáfora estructural (línea y estación) repetida en navegación, estados y páginas de error.
- Marca por alcaldía calculada para WCAG AA; el resto de la paleta es fija.
- Estado legible por forma (trazo lleno, discontinuo, punto lleno o hueco), nunca solo por color.
- Archivo con cifras tabulares en toda la interfaz.
- Plano por defecto; la sombra solo aparece en lo que flota.

## Colors

Azules institucionales fríos sobre papel blanco, con tres colores semánticos (turquesa, ámbar, rojo) y un color de marca variable.

### Primary

- **Azul Institucional / Tinta** (`tinta`): títulos, texto fuerte, trazo del recorrido, chip activo, contador de la estación, avatar. Es también la marca de la plataforma por defecto.
- **Marca de la alcaldía** (`marca`, variable en tiempo de ejecución): la línea del sidebar, el marcador de la estación activa, el borde izquierdo de 4 px de la franja «Operando en», el rótulo de línea (sigla) y el fondo del botón primario. Su valor por defecto es el azul de la plataforma.
- **Texto sobre marca** (`sobre-marca`): blanco o tinta oscura (#16213A), el que contraste más con la marca.
- **Marca para texto** (`marca-texto`): la marca oscurecida en pasos del 6 % hasta 4.5:1 sobre blanco. Contorno de foco, borde de campo enfocado, enlaces de acción e iconos de menú y estado vacío.
- **Lavado de marca** (`marca-suave`): la marca al 10 % sobre blanco; fondo de la selección de texto.

### Secondary

- **Turquesa** (`turquesa`): solo como punto o relleno de éxito (punto de «Publicadas», fondo al 15 % de la insignia Publicada, borde al 40 % de Aprobada/Activa). Nunca como color de texto.
- **Turquesa para texto** (`turquesa-texto`): la versión legible para texto de éxito (insignias, reglas de contraseña cumplidas, avisos de éxito).

### Tertiary

- **Ámbar** (`ambar`): tramo de recorrido con más de 4 días de espera; borde de «Onboarding pendiente»; borde discontinuo de avisos de desarrollo.
- **Ámbar para texto** (`ambar-texto`): fecha «Recibida» cuando el aporte pasa de 4 días (en seminegrita) y texto de insignias de onboarding pendiente.
- **Peligro** (`peligro`) y **Peligro suave** (`peligro-suave`): errores de campo, borde de campo inválido, insignias Rechazada y Suspendida, fondo de avisos de error.

### Neutral

- **Cuerpo** (`cuerpo`): color de texto base del documento.
- **Gris Azulado** (`gris`): texto secundario, bajadas, cabeceras de columna, metadatos, leyenda.
- **Tenue** (`tenue`): placeholders, estaciones deshabilitadas, borde en hover de controles, estaciones futuras del recorrido, barra de desplazamiento.
- **Filete** (`linea`): bordes de controles, tablas, sidebar y franja; tramo final del recorrido.
- **Fila** (`fila`): separadores entre filas de tabla y de lista.
- **Superficie** (`superficie`): fondo del sidebar y del cajón; fondo de hover de botones de icono.
- **Cabecera** (`cabecera`): fondo de la cabecera de tabla.
- **Papel** (`papel`): fondo de página, campos, menús, diálogos y estación activa.

### Named Rules

**The Marca Dibuja Rule.** `--marca` se usa solo en la línea, el marcador activo, la franja, el rótulo de línea y el botón primario. No tiñe fondos de sección, tablas ni texto; para texto en tono de marca se usa `--marca-texto`.

**The Contraste Calculado Rule.** Ningún color de alcaldía entra sin pasar por `variablesMarca()`: el texto sobre marca y la marca para texto se derivan, nunca se fijan a mano. Si el texto sobre la marca no llega a 4.5:1, el onboarding sugiere otro tono.

**The Turquesa Es Un Punto Rule.** Turquesa aparece como punto, borde translúcido o lavado; el texto de éxito siempre usa `turquesa-texto`.

## Typography

**Display Font:** Archivo (con system-ui, sans-serif)
**Body Font:** Archivo (con system-ui, sans-serif)

**Character:** una grotesca de señalética, firme y sin adornos, cargada en pesos 400, 500, 600 y 700. Las cifras son tabulares en todo el documento (`font-variant-numeric: tabular-nums` en `html`) para que folios, conteos y fechas se alineen en columna.

### Hierarchy

- **Headline** (700, 1.75rem, 1.25): título de página (`h1`), en tinta, con `text-wrap: balance` y −0.01em de tracking. Uno por pantalla.
- **Title** (700, 1.125rem): títulos de diálogo y de estado vacío (`h2`).
- **Body** (400, 0.9375rem, 1.5): celdas de tabla, bajadas de página, estaciones del sidebar, chips. La bajada va en gris azulado.
- **Label** (700, 0.875rem): etiquetas de campo, en tinta. Los botones usan 0.875rem en 600.
- **Meta** (600, 0.8125rem): insignias de estado, botón «Cambiar», leyenda del recorrido (en 400).
- **Column header** (600, 0.75rem, 0.025em, mayúsculas): solo cabeceras de columna de tabla, en gris sobre `cabecera`.

### Named Rules

**The Cifras En Columna Rule.** Todo número va en cifras tabulares; un conteo se destaca con peso (700), no con tamaño ni color.

**The Mayúsculas Solo En Columna Rule.** Las mayúsculas espaciadas existen únicamente en cabeceras de tabla. No se usan como antetítulo ni rótulo sobre títulos.

## Layout

Marco de dos columnas desde 1024 px: sidebar fijo de 248 px (`superficie`, filete derecho, alto completo y pegado) y contenido fluido. Encima del contenido, la franja «Operando en» de 56 px, pegada arriba, sobre papel al 95 % con desenfoque, con un borde izquierdo de 4 px en marca y el menú de usuario a la derecha. El contenido usa 16 px de margen lateral en teléfono, 24 px desde 640 px y 32 px desde 1024 px, con 24/32 px verticales.

El encabezado de página apila título y bajada a la izquierda y las acciones a la derecha desde 640 px; en teléfono las acciones bajan debajo del título. Los controles miden 44 px de alto (mínimo 40 px en botones y chips) para el dedo.

**Respuesta por ancho:**

- **≥ 1024 px:** sidebar visible. **< 1024 px:** la línea se abre como cajón lateral (`dialog` nativo, 280 px, máximo 85vw) desde un botón de menú en la franja.
- **< 640 px:** las tablas se convierten en lista apilada (folio e insignia arriba, tipo y parroquia, fecha y recorrido abajo). Folio, estado y recorrido nunca se ocultan; las columnas secundarias aparecen por escalones (md, lg, xl, 2xl).
- **< 640 px:** los selectores de filtro se pliegan detrás de un botón «Filtros (n)»; desde 640 px se muestran en la fila del buscador. Los chips de estado pasan a una fila con desplazamiento horizontal sin barra.
- **< 640 px:** los selectores abren como hoja inferior (máximo 75dvh, esquinas superiores de 24 px, respeta el área segura); desde 640 px, como lista desplegable.
- **< 640 px:** la franja muestra la sigla y el nombre corto de la alcaldía en lugar de «Operando en: nombre completo».

Las pantallas de acceso usan otro reparto: panel tinta a la izquierda (5/12) con una línea de estaciones en blanco y el formulario a la derecha (7/12, máximo 448 px).

## Elevation & Depth

Plano por defecto. La profundidad se construye con tonos (superficie gris del sidebar contra papel blanco) y filetes de 1 px. La sombra existe solo en lo que flota sobre la página: menús, listas desplegables, hojas inferiores y diálogos. Los fondos de modal son tinta al 40–50 %.

### Shadow Vocabulary

- **Panel** (`box-shadow: 0 1px 2px rgb(31 56 100 / 0.06), 0 8px 24px -12px rgb(31 56 100 / 0.18)`): menú de usuario, selector desplegado, hoja inferior y diálogo; siempre acompañada de un anillo de 1 px en `linea` salvo en el diálogo.
- **Anillo de correspondencia** (`box-shadow: 0 0 0 2px var(--marca)`): exclusivo del marcador de la estación activa, para dibujar el doble círculo de correspondencia. No es elevación.

### Named Rules

**The Solo Flota Rule.** Tarjetas, tablas y secciones no llevan sombra; si un elemento no se superpone al contenido, se separa con filete.

## Shapes

Radios contenidos: 6 px en controles (botones, campos, selectores, rótulo de línea), 8 px en contenedores (tablas, listas apiladas, menús, diálogos, avisos, estados vacíos) y círculo completo en chips, insignias, contadores, avatar y marcadores. La hoja inferior del teléfono abre con 24 px arriba. El trazo discontinuo (5 3) es el signo de «en espera»; los bordes discontinuos repiten ese sentido en estados vacíos, la etiqueta «Datos de demostración» y avisos de desarrollo.

## Components

### Buttons

Estándar y firmes; un primario por vista.

- **Shape:** esquinas suaves (6 px).
- **Primary:** fondo marca, texto sobre-marca, 600, alto 44 px, 24 px laterales en formularios de acceso. Hover: `brightness(1.1)`; activo: escala 0.98 con salida exponencial en 150 ms.
- **Secondary:** papel con filete `linea`, texto tinta, 600, 40–44 px de alto; el hover solo oscurece el borde a `tenue`. Es el botón por defecto («Cambiar», «Filtrar», «Filtros»).
- **Icon button:** 40–44 px cuadrado, sin borde, hover en `superficie`.
- **Text action:** texto en `marca-texto`, 600, subrayado en hover («Volver a la plataforma»).

### Chips

- **Style:** píldora de 40 px, filete `linea`, texto tinta en 0.9375rem 500 y el conteo en 700. Publicadas lleva un punto turquesa de 8 px.
- **State:** son enlaces de filtro (`?estado=`): el activo se rellena en tinta con texto papel y `aria-current`; volver a pulsarlo quita el filtro. Sin filtro, ninguno aparece presionado. Hover: borde `tenue` (inactivo) o fondo `cuerpo` (activo).

### Status Insignia

- Píldora con filete, 0.8125rem 600, y un punto de 8 px con borde de 2 px en el color del texto. El punto **lleno o hueco repite el estado sin color**: lleno = en marcha o logrado (En revisión, Aprobada, Publicada, Activa); hueco = esperando o detenido (Pendiente, Rechazada, Onboarding pendiente, Suspendida).
- Color por estado: Pendiente con filete tenue; En revisión sobre lavado azul; Aprobada/Activa en turquesa-texto con borde turquesa al 40 %; Publicada sobre turquesa al 15 %; Rechazada/Suspendida en peligro; Onboarding pendiente en ámbar.

### Cards / Containers

- **Corner Style:** 8 px.
- **Background:** papel.
- **Shadow Strategy:** ninguna (ver Elevation & Depth).
- **Border:** filete `linea`; discontinuo en estados vacíos.
- **Internal Padding:** 16 px en avisos y filas de lista; 24 px en diálogos; 24 × 48 px en estados vacíos (icono de 28 px en marca-texto, título, texto en gris con ancho de lectura, acción).

### Inputs / Fields

- **Style:** 44 px de alto, papel, filete `linea`, 6 px, 16 px laterales, texto tinta, placeholder tenue. Etiqueta encima en 0.875rem 700 tinta, separada 6 px.
- **Focus:** el borde pasa a `marca-texto` y el contorno global de 3 px en `marca-texto` con 2 px de separación; los selectores suman un anillo de 2 px en marca al 20 %.
- **Error:** borde peligro y mensaje debajo en 0.875rem peligro con icono de alerta. Las validaciones correctas confirman en turquesa-texto con icono.
- **Hover:** borde `tenue`.

### Navigation (la línea)

- **Style:** cabecera con isotipo de 36 px y nombre de la plataforma en 0.8125rem 600; debajo, el rótulo de línea (sigla en marca, 700, tracking amplio) y «Línea {alcaldía}» en 0.9375rem 700.
- **Línea:** barra vertical de 4 px en marca que remata en una barra horizontal redondeada de fin de recorrido.
- **Estaciones:** filas de 44 px, 0.9375rem. Inactiva: círculo de 12 px con borde de 3 px en marca sobre papel, texto 500. Activa: círculo de correspondencia de 20 px relleno en marca con borde papel y anillo de marca, fila en papel con esquina derecha redondeada, texto 700 y `aria-current="page"`. El círculo crece en 200 ms con salida exponencial. Deshabilitada: círculo en tenue sobre superficie, texto tenue, `aria-disabled`.
- **Contador:** píldora tinta con texto papel en 0.75rem 600 (aportes por atender).
- **Mobile:** la misma línea dentro de un cajón `dialog` que entra desde la izquierda en 200 ms; fondo tinta al 40 %, foco atrapado, se cierra al navegar.

### Franja «Operando en»

Banda de 56 px pegada arriba con borde izquierdo de 4 px en marca: «Operando en:» en gris, el nombre de la alcaldía en tinta 600 y un botón secundario compacto «Cambiar». Sin alcaldía, muestra «Plataforma» o «Sin alcaldía elegida» y el enlace para entrar a una.

### Recorrido (firma)

El estado de un aporte dibujado como línea de metro: Pendiente → En revisión → Resultado → Publicada, en SVG de 24 px de alto.

- **Tramo completado:** trazo lleno de 3 px en tinta; estaciones cumplidas rellenas (radio 4.5).
- **Tramo en espera:** trazo discontinuo (5 3) de 3 px; su **longitud es la antigüedad** (14 px + 10 px por día, tope 84 px).
- **Alerta:** con más de 4 días, el tramo en espera pasa a ámbar y la fecha «Recibida» a ámbar-texto seminegrita.
- **Estación actual:** anillo de 3 px en tinta sobre papel (radio 6).
- **Futuro:** trazo de 1.5 px en `linea` y estaciones huecas en tenue.
- Lleva `role="img"` con etiqueta legible («Pendiente desde hace 6 días») y una leyenda al pie de toda tabla que lo use. Se dibuja en tinta, no en marca, para leerse igual con cualquier alcaldía.

### Sigla de alcaldía

Identidad de línea: la sigla en 700 con tracking amplio sobre el color de la alcaldía, en losa de 6 px (48 × 40 px en listas, 24 px de alto en la franja móvil). Sin onboarding completo, la losa es neutra: superficie con texto gris azulado y filete interior `linea`.

### Tabla de cola

Densa: celdas de 12 × 14 px, filas separadas por `fila`, cabecera en `cabecera` con mayúsculas de columna; el folio en tinta 600; la columna ordenada marca su sentido con una flecha y `aria-sort`.

### Diálogo

`dialog` nativo, máximo 448 px, papel, 8 px, sombra panel, fondo tinta al 50 %. Solo para confirmar acciones irreversibles o formularios cortos.

### Asistente de onboarding

Pasos como una línea horizontal de cuatro estaciones (`LineaPasos`): la actual es el círculo de correspondencia, las hechas se rellenan y enlazan, las siguientes van huecas. Cada paso: formulario a la izquierda y **vista previa en vivo** a la derecha (`VistaPreviaMarca`, fija arriba en escritorio, debajo en el teléfono), que aplica `variablesMarca()` igual que el marco real. El contraste se muestra con su relación numérica y, si no cumple, un botón «Usar el tono sugerido». Acciones al pie: «Atrás» (secundario) y la principal en `--marca`.

### Selector de color

Espectro de saturación y brillo a todo el ancho, con la barra de tono debajo (`SelectorColor`, sobre `react-colorful`, etiquetas ARIA traducidas) y el campo hexadecimal sincronizado al lado de la muestra. El secundario se pliega tras «Añadir color secundario».

### Estado de una noticia (tramo)

El estado se dibuja con el lenguaje de la línea, legible sin color (`TramoEstado`): borrador = tramo discontinuo sin estación; programada = discontinuo hasta una estación hueca, en tinta, con la fecha; publicada = tramo lleno hasta la estación llena, en turquesa; despublicada = tramo lleno cortado con un remate. Va junto al nombre del estado en la tabla, la lista del teléfono y el encabezado del editor.

### Editor de noticias

Formulario por secciones separadas por una línea (Formato, Datos, Portada, el medio del formato, Cuerpo, Puntos de análisis, Botón al final) y, desde 1024 px, el panel «Publicación» fijo a la derecha con la acción principal en `--marca` y las demás en secundario; en el teléfono la acción principal queda en una barra fija al pie. Formato como cinco tarjetas con icono (la elegida con borde `--marca` y fondo `--marca-suave`). La barra de Tiptap es un `toolbar` con tabulador itinerante. El resumen de lo que falta para publicar va arriba, en `peligro-suave`, con enlaces a cada campo.

### Aviso (toast)

Abajo a la derecha (abajo al centro en el teléfono), papel con borde turquesa o rojo, icono y botón para cerrar; región `role="status"` presente desde el inicio. Los de éxito se van solos a los 6 s salvo con el puntero o el foco encima; los de error esperan.

### Esqueletos de carga

Cada pantalla tiene el suyo con su forma real (`esqueletos.tsx`): encabezado, chips, tabla que en el teléfono pasa a lista, filas con sigla, formularios y asistente. Un solo `role="status"` «Cargando…» por pantalla; los bloques son `aria-hidden`.

### Página de error (403, 404, 500)

«Estación fuera de servicio»: tramo lleno en `--marca`, la estación como círculo de correspondencia, un tramo discontinuo y el remate de fin de línea con el código (403, 404, 500) como rótulo en tinta. Dentro del panel conserva el marco y ofrece las estaciones del usuario (la primera como acción principal); fuera, lleva el logo neutro de la plataforma.

## Do's and Don'ts

### Do:

- **Do** derivar toda marca de alcaldía con `variablesMarca()` y usar `--marca-texto` para cualquier texto o borde de foco en tono de marca.
- **Do** expresar cada estado por forma además de color: trazo lleno o discontinuo en el recorrido, punto lleno o hueco en la insignia.
- **Do** mantener cifras tabulares y destacar conteos con peso 700.
- **Do** convertir tablas en listas apiladas por debajo de 640 px sin ocultar folio, estado ni recorrido.
- **Do** plegar los filtros detrás de «Filtros» en teléfono y abrir selectores como hoja inferior.
- **Do** animar entre 150 y 250 ms con `cubic-bezier(0.23, 1, 0.32, 1)` y dejar que `prefers-reduced-motion: reduce` anule animaciones y transiciones.
- **Do** usar controles de 44 px de alto (40 px como mínimo).

### Don't:

- **Don't** usar turquesa como color de texto; para texto de éxito, `turquesa-texto`.
- **Don't** pintar con `--marca` fondos de sección, tablas o el recorrido; la marca dibuja la línea y el botón primario.
- **Don't** poner sombra a tarjetas, tablas o secciones; la sombra panel es solo para lo que flota.
- **Don't** usar mayúsculas espaciadas fuera de las cabeceras de columna, ni antetítulos sobre los títulos de página.
- **Don't** fijar a mano el texto sobre un color de alcaldía.
