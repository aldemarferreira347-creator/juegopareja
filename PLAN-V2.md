# PLAN V2 — «El Camino a Ti»
### Reconstrucción total: de silueta oscura a prado animado

> **Documento en dos partes.**
> **PARTE A — DIRECCIÓN**: qué hay que lograr y por qué. Es la parte que no se negocia.
> **PARTE B — EJECUCIÓN**: tareas ordenadas y verificables, escritas para que Sonnet 5 las ejecute sin depender de esta conversación.

---

## 0 · Diagnóstico honesto de la V1

Lo que falló, en orden de gravedad:

| # | Problema | Diagnóstico |
|---|---|---|
| 1 | **No hay juego** | Los 4 capítulos son *plano → islas → escalera → plano*. Un solo verbo: "mantén la flecha derecha". Nada que decidir, nada que dominar, nada que recompense. Un capítulo (el 4) es literalmente una plataforma recta sin obstáculos. |
| 2 | **El personaje son 4 cápsulas negras** | `personaje.js` dibuja `ctx.stroke()` sobre líneas. No hay cara, no hay ropa, no hay identidad. Existiendo ilustraciones reales, es indefendible. |
| 3 | **Todo oscuro** | `--p-fondo: #0b0713` (casi negro), "estética Limbo/Gris". Esto se le regala a una persona querida — la referencia correcta no era un juego de terror indie, era una mañana de primavera. |
| 4 | **Cero feedback** | No hay squash/stretch, ni polvo al aterrizar, ni partículas, ni destello al recoger. El aterrizaje se siente igual que caminar. |
| 5 | **Un solo personaje** | Y encima genérico. |

**Lo único que se salva y por qué:** `fisica.js` está bien hecho — paso fijo a 1/120 s, *coyote time*, *jump buffer*, salto variable, resolución de colisión por ejes separados. Sus fallos históricos fueron de **geometría de nivel**, no del motor. Se conserva y se re-escala. Botarlo sería desperdicio.

**Activo oculto encontrado:** [`js/flores-amarillas.js`](../js/flores-amarillas.js) (1704 líneas) ya contiene un motor de flores de calidad — `dibujarClavelina()` con viento por profundidad, cabezas de flor horneadas a canvas y estampadas, gradientes de tallo, hojas que crecen, luciérnagas con estela. **La flora del juego se trasplanta de ahí, no se inventa.**

---

# PARTE A — DIRECCIÓN

## A1 · Principio rector

> **El mundo florece porque ella pasa por ahí.**

Esa frase es la mecánica, el arte y el mensaje a la vez. Todo lo que se construya tiene que poder justificarse contra ella. Si un elemento no aporta a "el mundo reacciona con belleza a que ella avance", no entra.

Consecuencia directa: el prado empieza **pálido, casi descolorido**, y gana color y flores a medida que el personaje avanza. No es decorado — es el marcador de progreso, y es lo que hace que caminar se sienta bien.

## A2 · Dirección de arte

### Prohibiciones absolutas
- ❌ **Girasoles.** Ni uno. Ni de fondo, ni en un icono, ni en un emoji (🌻 queda vetado en todo el proyecto). El resto del sitio usa `tema-girasol`; **el juego no lo hereda**.
- ❌ Fondos oscuros, negros, o "cinematográficos". Nada por debajo de `#f2e4d8` como color de cielo dominante.
- ❌ Siluetas. Los personajes se ven a color, con cara.

### Paleta (usar exactamente estos valores como base)

```
CIELO        alto   #bfe4f2   celeste pálido
             medio  #ffe9d6   durazno
             bajo   #ffd9e2   rosa polvo
SOL                 #fff4c2   crema luminoso

FLOR AMARILLA  pétalo claro #ffe98a
               pétalo       #ffd23f
               centro       #f5a623

PRADO        lejano #cfe6c3
             medio  #a8d49a
             cerca  #7fbf7a
             sombra #5c9e63

ACENTO ROSA         #ff9ec4  ·  #f8c8dc
TINTA (texto)       #4a3b52   morado suave — NUNCA negro puro
UI CREMA            #fffaf2
```

### Catálogo de flores (amarillas, sin girasoles)

| Especie | Uso | Forma |
|---|---|---|
| **Margarita amarilla** | La base. Campos enteros, cientos. | Centro redondo + 12-14 pétalos finos |
| **Ranúnculo** | Primer plano, cerca de cámara. Lujoso. | Capas concéntricas de pétalos redondos |
| **Tulipán amarillo** | Acentos verticales, rompe la horizontal. | Copa cerrada sobre tallo largo |
| **Mimosa** | Copas de árboles al fondo. | Racimos de pompones esponjosos |
| **Campanilla / narciso** | Momentos especiales (checkpoints, final). | Trompeta + corola |
| **Diente de león (vilano)** | **Mecánica**: las semillas flotantes son el planeo. | Esfera de filamentos → semillas que se desprenden |

### Composición en capas (de fondo a frente)

```
1. Gradiente de cielo (horneado 1 vez por capítulo)
2. Sol + rayos suaves, respiración lenta
3. Montañas pálidas lejanas (2 capas, parallax 0.15 / 0.25)
4. Copas de mimosa / arbolado (parallax 0.4)
5. Colinas de prado (3 capas, parallax 0.55 / 0.7 / 0.85)
6. ── PLANO DE JUEGO: plataformas, flores plantadas, personajes ──
7. Flores de primer plano desenfocadas (parallax 1.25) — profundidad barata
8. Partículas: pétalos al viento, polen dorado, mariposas
9. Viñeta cálida muy suave (nunca oscura) + destello de sol
```

## A3 · Los personajes

### Material disponible
`img/` — 4 PNG, 407×612, fondo transparente, vector limpio, **ambos mirando a la derecha**:
- `cquieto.png` / `Ccorriendo.png` → **Carlo** (polo negro, pantalón crema, tenis blancos)
- `iquieta.png` / `icorriendo.png` → **Isabela** (top negro, cargo crema, rizos largos)

### El problema y la solución
Dos fotogramas no son un ciclo de animación. **No se van a dibujar más fotogramas.** Se genera movimiento creíble por deformación procedural sobre esas dos imágenes:

| Estado | Sprite | Transformación |
|---|---|---|
| **Quieto** | `quieto` | Respiración: `scaleY = 1 + sin(t·1.8)·0.012`, con origen en los pies |
| **Corriendo** | `corriendo` | Rebote vertical `sin(fase)·5px` + inclinación `sin(fase)·0.035 rad` + squash `scaleY 0.97↔1.03`, todo sincronizado a `distanciaCaminada` (nunca a un reloj aparte) |
| **Subiendo** | `corriendo` | Estirado `scaleY 1.08 / scaleX 0.94`, rotación −0.08 rad |
| **Cayendo** | `corriendo` | `scaleY 1.05`, rotación +0.05 rad, brazos hacia arriba por rotación del sprite |
| **Aterrizando** | `quieto` | Squash fuerte `scaleY 0.82 / scaleX 1.14` → recupera con `Muelle` en ~180 ms |
| **Planeando** | `quieto` | Rotación oscilante ±0.06 rad + vilano dibujado encima |
| **Giro** | — | El flip NO es instantáneo: `scaleX` se interpola de 1 a −1 en 90 ms |

Con polvo al aterrizar, pétalos en la estela y el rebote sincronizado, esto lee como carrera. Es la técnica correcta para 2 fotogramas.

### Calibración de la caja de colisión (crítico)
El PNG tiene mucho margen transparente. La caja física **no** es el rectángulo del sprite. Hay que medir los píxeles opacos reales (método en tarea **B2**) y dibujar el sprite anclado a los pies, centrado en X sobre la caja.

Objetivo en pantalla: **~112 px de alto** (contra los 62 px de la V1). Eso obliga a re-escalar la física (tarea **B3**).

### Ambos jugables
- **Pantalla de selección** al empezar: dos tarjetas grandes con el sprite `quieto` respirando. Se elige con clic/toque o ←/→ + Enter.
- **Física idéntica** para los dos. Un nivel tiene que ser superable igual con cualquiera — nada de asimetría que rompa el diseño.
- **Diferencia = identidad visual**: Carlo deja estela de **polen dorado**; Isabela deja estela de **pétalos rosados**. Sonidos ligeramente distintos de salto.
- **El otro personaje existe en el nivel**: corre por delante, espera al final de cada capítulo, y en el capítulo 4 **corre al lado** siguiendo al jugador con retardo elástico.

## A4 · Diseño de juego

### El problema a resolver
Un juego necesita **verbos**. La V1 tenía uno (correr). Aquí hay tres, y cada capítulo enseña uno y luego los combina.

| Verbo | Entrada | Qué hace |
|---|---|---|
| **Correr / saltar** | ←→ / A D · ↑ W Espacio | Base. Coyote time + jump buffer + salto variable. |
| **Planear con vilano** | Mantener salto mientras se cae | Limita la caída a `PLANEO_MAX`. Dura hasta 1.2 s, se recarga al tocar suelo. Un vilano de diente de león se abre sobre el personaje. |
| **Corriente ascendente** | Entrar en una columna de pétalos | Empuja hacia arriba. Se controla sólo con ←→ dentro de la columna. |

Y un verbo pasivo que es el corazón: **florecer**. Cada paso planta flores en el suelo detrás del personaje. Cada semilla recogida sube el medidor. Al llenarlo, el capítulo entero estalla en color.

### Los cuatro capítulos, rediseñados

| # | Título | Atmósfera (¡luminosa!) | Verbo nuevo | Diseño |
|---|---|---|---|---|
| **1** | **El primer hola** | Mañana clara, prado de margaritas, mariposas, rocío | Correr + saltar | Llano y ancho, huecos perdonables. Enseña sin texto de tutorial. El suelo florece a su paso. Isabela/Carlo esperan al final. |
| **2** | **Los jueves** | **Atardecer rosa-lavanda** sobre islas de prado flotando entre nubes bajas | **Planeo** | Las islas están más lejos de lo que alcanza un salto: hay que planear. La distancia se cruza flotando, no cayendo. |
| **3** | **La pregunta** | Dorado de tarde alta, pétalos que suben, globos de luz | **Corriente ascendente** | Ascenso real: columnas de vilanos que elevan, plataformas entre ellas. Arriba del todo, el sobre. |
| **4** | **A tu lado** | **Amanecer pleno**, campo infinito de flores amarillas hasta el horizonte | Los tres juntos | Los dos personajes corren juntos. Sin peligro, pero con recorrido: saltos amplios, planeos largos, una corriente final que los sube al cierre. Termina con el prado entero floreciendo de golpe. |

**Regla que no cambia:** no hay muerte ni "game over". Caerse reaparece en el último punto seguro con una frase cariñosa.

### Medidor de floración
- Barra discreta arriba a la izquierda, en forma de tallo que va abriendo pétalos.
- Semillas repartidas por el nivel (las "luces" de la V1, ahora vilanos flotantes).
- Al llenarse: destello suave, el fondo gana saturación de forma permanente en ese capítulo, y se dispara una línea del guion.
- **Nunca bloquea el avance.** Es recompensa, no peaje.

## A5 · Juice — la diferencia entre "funciona" y "se siente increíble"

Lista corta, toda barata, toda obligatoria:

1. **Squash & stretch** en salto y aterrizaje (ver tabla A3).
2. **Polvo de aterrizaje**: 8-12 partículas crema que se abren en abanico, con velocidad según la altura de la caída.
3. **Flores que brotan en la estela**, con `Muelle` para que salgan con un rebotito.
4. **Micro-sacudida de cámara** al aterrizar fuerte: ≤3 px, 120 ms. Desactivada con `prefers-reduced-motion`.
5. **Recogida de semilla**: la semilla vuela hacia el medidor con una curva Bézier, destello + `Sfx`.
6. **Viento global**: `sin(t·0.6 + x·0.004)` que mece todas las flores por igual → el prado respira.
7. **Mariposas** con vuelo en zigzag suave que se posan en las flores.
8. **Rayos de sol** volumétricos muy tenues sobre el plano de juego.
9. **Transición entre capítulos**: barrido de pétalos que cubre la pantalla y se disuelve.
10. **Cámara**: `Muelle` con *look-ahead* (ya existe en la V1, se conserva) + zoom-out muy leve al correr rápido.

---

# PARTE B — EJECUCIÓN (tareas para Sonnet 5)

## B0 · Reglas de trabajo — leer antes de tocar nada

1. **Idioma**: todo el código en español (nombres, comentarios), como el resto del proyecto.
2. **Sin build, sin dependencias, sin módulos ES.** Scripts clásicos `IIFE` expuestos en `window`, cargados por orden de dependencia en `index.html`. Es como está el resto del regalo.
3. **Autocontenido**: `el-camino/` se publica aparte. **Prohibido referenciar `../js/`, `../css/` o `../music/`.** Si algo de fuera sirve, se **copia** dentro.
4. **Todo texto visible vive en `js/guion.js`** y sólo ahí. Ningún otro archivo puede tener una cadena que el usuario lea.
5. **Verificar cada tarea antes de pasar a la siguiente.** Cada tarea abajo trae su criterio.
6. ⚠️ **Limitación conocida del entorno**: en el panel de navegador de la herramienta, `document.hidden = true` congela `requestAnimationFrame` y las capturas fallan. **No es un bug del juego.** Verificar llamando a los módulos directamente por consola (`javascript_tool`) y con ganchos de depuración, no esperando ver render en vivo.
7. `prefers-reduced-motion` está **activado por defecto en este entorno**. `Nucleo.reducido` siempre devuelve `true` aquí. Para probar los caminos animados hay que forzar con `?fx=2`; nunca "arreglar" algo que sólo parece raro por esto.

## B1 · Limpieza y nuevo esqueleto

**Borrar** (reescritura total): `js/personaje.js`, `js/escenario.js`, `js/niveles.js`, `css/juego.css`.
**Conservar y afinar**: `js/fisica.js`, `js/entrada.js`, `js/nucleo.js`, `js/guardado.js`, `js/subtitulos.js`, `js/sfx.js`, `js/final.js`.
**Reescribir a fondo**: `js/juego.js`, `js/menu.js`, `js/guion.js`.

**Archivos nuevos:**
```
js/sprites.js      carga de PNG, medición de bordes opacos, dibujo con transformaciones
js/flora.js        catálogo de flores procedurales + sistema de floración por estela
js/particulas.js   pétalos, polen, polvo, mariposas, destellos
js/camara.js       extraída de juego.js: muelle, look-ahead, sacudida, zoom
js/seleccion.js    pantalla de selección de personaje
js/companero.js    el otro personaje: seguimiento elástico y poses
```

**Orden de carga en `index.html`:**
`nucleo → guardado → entrada → sprites → fisica → flora → particulas → camara → personaje → escenario → guion → subtitulos → niveles → companero → sfx → juego → final → seleccion → menu`

✅ **Verificación**: la página carga con 0 errores en consola y todos los módulos responden en `window`.

## B2 · `sprites.js` — carga y calibración

1. Precargar los 4 PNG con `Image()`; el juego no arranca hasta que los 4 estén `complete`. Mostrar un cargador con una margarita girando.
2. **Medir los bordes opacos**: dibujar cada PNG en un canvas fuera de pantalla, `getImageData`, recorrer buscando el primer y último píxel con `alpha > 8` en X y en Y. Guardar `{ x0, y0, x1, y1 }` por sprite.
3. Exponer `Sprites.dibujar(ctx, clave, { x, y, alto, escalaX, escalaY, rotacion, alpha })` donde `x,y` es **el punto medio de los pies** y `alto` es la altura opaca deseada en px.
4. Cachear cada sprite ya reescalado a la altura de juego en un canvas propio (**horneado**): `drawImage` de 407×612 a 75×112 en cada fotograma y por cada personaje es caro. Rehornear sólo si cambia el tamaño de ventana.

✅ **Verificación**: por consola, `Sprites.medidas('cquieto')` devuelve una caja opaca coherente (ancho notablemente menor que 407, alto cercano a 612), y dibujar en `alto: 112` produce una figura de 112 px de píxel opaco, no 112 px de lienzo con aire.

## B3 · Re-escalado de la física

El personaje pasa de 62 px a **112 px** de alto → factor **k = 1.8**. Para conservar exactamente la misma *sensación* (los mismos tiempos de vuelo), se escalan **longitudes y velocidades por k, aceleraciones por k**, y **los tiempos NO se tocan**.

```js
const k = 1.8;
GRAVEDAD          2600 → 4680
FUERZA_SALTO       900 → 1620
CAIDA_MAX         1400 → 2520
VELOCIDAD_MAX      340 →  612
ACELERACION_SUELO 2600 → 4680
ACELERACION_AIRE  1500 → 2700
FRICCION_SUELO    2200 → 3960
FRICCION_AIRE      500 →  900
CORTE_SALTO       -260 → -468
COYOTE_TIEMPO     0.10 → 0.10   (tiempo: NO se escala)
BUFFER_TIEMPO     0.12 → 0.12   (tiempo: NO se escala)
```

**Cifras resultantes que mandan sobre el diseño de niveles:**
- Altura máxima de salto = `FUERZA_SALTO² / (2·GRAVEDAD)` = **280 px** (2.5× la altura del personaje)
- Tiempo de vuelo = `2·FUERZA_SALTO / GRAVEDAD` = **0.69 s**
- Alcance horizontal a velocidad máxima = **≈424 px**

**Regla de diseño**: ningún hueco supera el **60 %** del alcance (**≤ 255 px**) sin planeo disponible. Ninguna subida supera el **55 %** de la altura (**≤ 154 px**) en un solo salto.

Caja de colisión nueva: `ancho ≈ 54`, `alto = 112` (ajustar `ancho` a lo medido en B2, un poco más estrecho que el sprite para que no se enganche).

✅ **Verificación**: script de consola que simula un salto desde parado y desde velocidad máxima, e imprime altura y alcance reales. Deben coincidir con 280 / 424 con ≤5 % de error.

## B4 · `flora.js` — el motor de flores

Trasplantar la técnica de [`js/flores-amarillas.js`](../js/flores-amarillas.js) (leer `dibujarClavelina`, `cabezaClavel`, `gradTallo`, `dibujarHoja`, `viento`).

1. **Cabezas horneadas**: cada especie × cada variante de color se dibuja **una sola vez** en un canvas pequeño y luego se estampa con `drawImage`. Nunca dibujar pétalos con `arc`/`bezier` por fotograma.
2. **Especies** (las 6 de A2). Cada una: `{ hornear(radio, colores) → canvas, altoTallo, anchoHoja }`.
3. **Viento compartido**: `viento(t, x, prof) = sin(t·0.6 + x·0.004)·(0.4 + prof·0.6)`. Todas las flores lo consumen → el prado se mece junto.
4. **Floración por estela**: `Flora.plantar(x, sueloY, especie)`. Cada flor nace con un `Muelle` de escala (0 → 1) para que brote con rebote. Máximo **220 flores vivas**; las más lejanas a la cámara se reciclan.
5. **Campos de fondo**: generados con ruido sembrado y determinista (misma semilla → mismo campo) y **horneados en tiras de 1024 px** que se repiten con desplazamiento. Nunca por flor individual.

✅ **Verificación**: `Flora.plantar()` 300 veces seguidas mantiene el conteo en 220 y no crece la memoria. Una tira de campo horneada se dibuja en <1 ms.

## B5 · `escenario.js` — el prado luminoso

Reescritura completa con las 9 capas de A2. Cielo, sol, montañas, mimosas, colinas, campo de flores, primer plano desenfocado, viñeta cálida.

- Cada capítulo define su gradiente de cielo y sus tintes de colina.
- **Todo lo estático se hornea** en canvas al cargar el capítulo o al redimensionar; el bucle sólo estampa y desplaza.
- Tileado infinito horizontal por capa (ya existía en la V1 — conservar esa función).
- **Saturación por progreso**: cada capítulo lleva `saturacion` de 0.55 → 1.0 según cuánto se ha avanzado. Aplicar interpolando los colores al hornear por tramos, **no** con `ctx.filter` (mata el rendimiento).

✅ **Verificación**: los 4 capítulos se ven claros y cálidos; ningún píxel de fondo por debajo de `#f2e4d8` en luminancia dominante. Confirmar muestreando el canvas por consola.

## B6 · `particulas.js`

Un solo sistema con tipos: `petalo`, `polen`, `polvo`, `mariposa`, `destello`. Presupuesto **máximo 300 partículas simultáneas**, con recorte por nivel de calidad (`Nucleo.nivel` 0/1/2 → 100/200/300).

✅ **Verificación**: forzar 1000 emisiones y comprobar que el conteo se estabiliza en el techo del nivel activo.

## B7 · `personaje.js` — nuevo, basado en sprites

Máquina de estados: `quieto · corriendo · subiendo · cayendo · aterrizando · planeando`, con la tabla de transformaciones de A3 y el flip interpolado de 90 ms. Emite polvo al aterrizar y estela (polen o pétalos, según personaje).

✅ **Verificación**: gancho de depuración que imprime el estado por fotograma durante un salto simulado. La secuencia debe ser `quieto → corriendo → subiendo → cayendo → aterrizando → corriendo`, sin estados intermedios espurios.

## B8 · Verbos nuevos en `fisica.js` + `entrada.js`

- **Planeo**: si `!enSuelo && vy > 0 && saltoMantenido && planeoRestante > 0` → `vy = min(vy, PLANEO_MAX)` con `PLANEO_MAX = 420`. Consume `planeoRestante` (1.2 s), se recarga al tocar suelo. Exponer `cuerpo.planeando` para el render.
- **Corrientes ascendentes**: `nivel.corrientes = [{x, y, ancho, alto}]`. Dentro de una: `vy -= 5200·dt`, limitado a `vy ≥ -560`. Control horizontal normal.
- `entrada.js`: distinguir *pulsar* de *mantener* el salto (ya lo hace) y exponerlo al planeo.

✅ **Verificación**: simulación que confirma que un salto **con** planeo cruza un hueco de 600 px y **sin** planeo no lo cruza. Y que una corriente eleva 400 px sin tocar ninguna tecla salvo la dirección.

## B9 · `niveles.js` — los 4 capítulos rediseñados

Geometría según A4, respetando los topes de B3 (huecos ≤255 px sin planeo, subidas ≤154 px por salto). Cada capítulo lleva: `plataformas`, `spawn`, `checkpoints`, `semillas`, `corrientes`, `zonaFinal` (rectángulo 2D completo `{x,y,ancho,alto}` — **no** el `{x,ancho}` 1D de la V1, que fue un bug real), `companero`, `limiteCaida`, y su configuración de escenario.

⚠️ Errores de la V1 que **no se pueden repetir**:
- Plataforma flotante sin espacio libre suficiente para pasar por debajo → el personaje se golpea la cabeza. Dejar **≥ altura del personaje + 40 px** de aire.
- Columnas solapadas en el ascenso → el salto choca con el borde inferior del objetivo. Sin solape horizontal entre un escalón y el siguiente.
- Nunca exigir saltar **hacia atrás** en un nivel de avance a la derecha.

✅ **Verificación**: por cada capítulo, simulación de un bot que sólo mantiene "derecha" y salta al borde. Debe llegar a `zonaFinal` en los 4. **Este es el criterio que la V1 nunca superó de verdad — es innegociable.**

## B10 · `seleccion.js` + `companero.js`

- Pantalla de selección: dos tarjetas grandes, sprite respirando, nombre, y el color de estela como distintivo. Clic/toque o ←/→ + Enter. La elección se guarda en `localStorage`.
- El personaje no elegido pasa a ser el compañero: espera al final de los capítulos 1-3 y **corre al lado** en el 4, con seguimiento elástico (`Muelle` sobre la posición del jugador con retardo) y la misma máquina de estados de `personaje.js`.

✅ **Verificación**: elegir cada uno de los dos y comprobar que el compañero es siempre el otro, tanto en partida nueva como al continuar una guardada.

## B11 · `css/juego.css` + UI clara

Reescritura total con la paleta de A2. Tarjetas de vidrio **crema** (no negras), bordes redondeados generosos (20-28 px), sombras suaves de color (`rgba(245,166,35,.18)`, nunca `rgba(0,0,0,…)` fuerte). Tipografías Playfair Display + Poppins, ya en uso en el resto del regalo.

Rehacer: barra de subtítulos (fondo crema translúcido, tinta `#4a3b52`), medidor de floración, HUD de capítulo, menú, selección, panel de carta final.

✅ **Verificación**: a 375×812 (móvil) y 1280×800 no hay desbordamiento horizontal, los botones tienen ≥44 px de zona táctil y los subtítulos no tapan al personaje.

## B12 · Guion, audio y pulido final

- Reescribir `guion.js` con el tono luminoso: nada de "oscuridad", "miedo", "caída". Mantener las fechas reales (16 ago 2025, 10 abr 2026). Conservar el marcador ✏️ en cada línea editable.
- `sfx.js`: añadir `planear`, `corriente`, `florecer`, `semilla`, `medidorLleno`. Sonidos suaves, tonos de campana, nada estridente.
- Repasar `prefers-reduced-motion` en todo: sin sacudida de cámara, sin parallax diferencial, subtítulos completos sin tecleo.
- Actualizar `README.md`: personajes, controles nuevos (incluido el planeo), y **mantener la advertencia de privacidad** sobre repositorio público con nombre real y fotos.

✅ **Verificación final**: partida completa de principio a fin —selección → 4 capítulos → carta— con los **dos** personajes, en móvil y escritorio, con 0 errores de consola.

---

# PARTE C — Riesgos y decisiones tuyas

## Riesgos reales, dichos por adelantado

| Riesgo | Mitigación |
|---|---|
| **Dos fotogramas no son un ciclo de carrera.** Por bien que se deforme, las piernas no van a alternar. | El rebote + polvo + estela + inclinación lo disimulan bien a velocidad de juego. Si aun así no convence, la solución es dibujar 2 fotogramas más de carrera; **eso no lo puedo generar yo**. |
| Sprites de 407×612 estampados muchas veces son caros. | Horneado a la altura de juego (B2). Innegociable. |
| Muchas flores + partículas pueden bajar de 60 fps en móvil. | Techos duros: 220 flores, 300 partículas, campos horneados en tiras. Recorte por `Nucleo.nivel`. |
| Cuatro capítulos con tres verbos es más superficie de bugs que la V1. | El bot de la tarea B9 es la red de seguridad, y se corre en cada cambio de geometría. |

## Decisiones ya tomadas (cerradas — no volver a preguntar)

1. **Selección de personaje**: sí. La pantalla de inicio deja elegir con quién se juega, Carlo o Isabela. Física idéntica para ambos.
2. **Nombres en pantalla**: "Carlo" e "Isabela", tal como el resto del sitio.
3. **Voz del guion**: primera persona de Carlo **siempre**, se juegue con quien se juegue — es la misma voz de todas las cartas del sitio, y el juego hereda la temática del sistema. Escribir el borrador completo marcado con ✏️.
4. **Música**: se deja **para el final** (tarea B12). Elegir de `../music/` la pista que mejor case con el tono luminoso ya terminado y **copiarla** dentro de `assets/`.
5. **Publicación**: va a GitHub. Mantener la advertencia de privacidad en el README (nombre real + fotos en repo público quedan indexados; alternativa: repo privado + Netlify/Cloudflare Pages).
