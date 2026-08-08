# 🌼 El Camino a Ti

Un plataformas corto hecho para Isabela: cuatro capítulos, cada uno una etapa real de la relación, con subtítulos narrados, una carta al final y un epílogo caminado juntos hasta casa.

**La idea que sostiene todo el juego:** el prado empieza descolorido y va floreciendo a medida que el personaje avanza. El mundo florece porque tú pasas por ahí.

---

## Qué editar antes de entregarlo

**Todo el texto está en un solo archivo: [`js/guion.js`](js/guion.js)**. Ya viene escrito y listo para usarse — ábrelo con el Bloc de notas o VS Code si quieres cambiar algo:

1. **Las líneas de cada capítulo** (`capitulos.amanecer / tarde / dorado / pleno / hogar`): `inicio` sale al empezar el capítulo, `final` al llegar al final, y `coleccionables` son cinco frases, una por cada corazón del nivel.
2. **`reaparicion`**: las frases que salen al caerse (no hay "game over" — sólo se vuelve al último punto seguro).
3. **`discusiones`** y **`derrota`**: las frases al tocar un corazón roto y al quedarse sin vidas.
4. **`besoConfirmacion`**: la pregunta que sale antes de pasar de capítulo.
5. **`menu`** y **`seleccion`**: la pantalla de inicio y la de elegir personaje.
6. **`cartaFinal`**: el cierre de verdad, después del capítulo 4 ("Detalle final" en el panel).
7. **`compromiso`**: la pregunta de la puerta de casa, al final del epílogo, y sus dos respuestas.
8. **`jefe`**: el nombre de Distancia, la frase que lo presenta y el panel de derrota si se pierde la batalla contra él.

**Las preguntas del jefe viven aparte, en [`js/preguntas.js`](js/preguntas.js)** — cada una tiene `pregunta`, sus `opciones`, el índice de la `correcta`, y dos frases (`exito` / `error`) que salen según la respuesta. Añadir una nueva es copiar el bloque de otra y cambiar el contenido; no hay límite de cuántas puede haber.

Importante: ningún texto lleva símbolos ni marcas delante — cualquier cosa que pongas dentro de las comillas sale tal cual en pantalla. Si quieres dejarte una nota a ti mismo, escríbela como comentario (con `//` delante, fuera de las comillas), nunca dentro del texto.

No hace falta tocar ningún otro archivo para cambiar el texto.

**Si editas y recargas y no ves el cambio:** el navegador guarda los archivos en caché y a veces sigue mostrando la versión vieja. Sube en 1 el número `?v=15` que aparece al final de cada línea `<script src="js/...">` en `index.html` (el siguiente sería `?v=16`, luego `?v=17`, etc.) — eso obliga a cargar todo de nuevo. Si no quieres tocar `index.html`, con `Ctrl+Shift+R` (recarga forzada) también alcanza.

---

## 🎮 Cómo se juega

Al empezar se elige **con quién caminar: Carlo o Isabela**. Los dos tienen exactamente la misma física — la diferencia es la estela que van dejando (polen dorado o pétalos rosados). El que no elijas te espera al final de cada capítulo, y en el último corre a tu lado.

**Escritorio**
- `←` `→` o `A` `D` — moverse
- `↑` `W` o `Espacio` — saltar
- **Mantener el salto mientras caes** — se abre un vilano de diente de león y planeas
- Tocar o pulsar espacio también avanza los subtítulos

**Móvil**
- Mitad izquierda de la pantalla: arrastra el dedo para moverte
- Mitad derecha: toca para saltar, **mantén pulsado al caer** para planear

**Los tres verbos, uno por capítulo**

| Capítulo | Qué enseña |
|---|---|
| 1 · El primer hola | Correr y saltar. Prado llano, huecos muy perdonables. |
| 2 · Los jueves | **Planear.** Las islas están más lejos de lo que alcanza un salto. |
| 3 · La pregunta | **Corrientes.** Columnas de pétalos que te suben. |
| 4 · A tu lado | Los tres juntos — y, justo antes del portal, la batalla contra Distancia. |

### Cómo se pasa un capítulo

**Recogiendo los 5 corazones y entrando después por el portal de flores.** El portal está siempre a la vista al final del recorrido: nace marchito y va floreciendo con cada corazón, así que en todo momento se ve cuánto falta. Si se llega sin completarlos, lo dice — no bloquea el paso, pero no se abre. En el instante en que se entra por el portal ya abierto, el capítulo termina ahí mismo (el personaje se detiene justo en el arco, no de largo) y sale un panel con dos botones: repetirlo o seguir al siguiente — no hay que esperar nada ni se puede seguir jugando de más.

Antes de dejar avanzar al siguiente capítulo, el panel pregunta algo que no tiene que ver con el juego: si ya le diste un beso a quien esté jugando 💋. No es un candado de verdad — es sólo un empujón cariñoso, como el cupón de `1agosto`.

Los corazones están colocados a propósito donde hace falta usar el verbo del capítulo, así que recogerlos **es** la dificultad. Arriba a la izquierda hay un contador, y si el objetivo queda fuera de pantalla aparece una flecha en el borde apuntando hacia él.

**El peligro: corazones rotos.** En los capítulos 1 a 3 hay un par de corazones agrietados repartidos por el camino — una discusión, un mal momento. Tocar uno cuesta una vida (hay 3, con un respiro después de cada golpe para no perder dos de seguido); quedarse sin ninguna devuelve al último checkpoint, igual que una caída. El capítulo 4 no tiene ninguno a propósito: ahí ya no hay nada que pueda salir mal.

**Nunca hay muerte.** Caerse, o quedarse sin vidas, devuelve al último punto seguro con una frase, no con un "game over". Y ningún corazón puede quedarse inalcanzable: todos los niveles están construidos para que siempre se pueda volver a por lo que se dejó atrás.

El progreso se guarda solo en ese navegador — el botón **Continuar** retoma desde el último capítulo y con el mismo personaje.

### Distancia — el jefe del capítulo 4

Justo antes del portal del último capítulo, el camino se corta: aparece **Distancia**, dibujada como una grieta que parte el camino en dos mitades que se alejan — no un enemigo con forma de persona, sino la distancia misma abriéndose paso. Hace tres preguntas (`js/preguntas.js`) sobre cosas fáciles de dar por sentadas en una relación; acertarlas la va cerrando, fallarlas cuesta una vida de las tres que hay.

**Si se agotan las tres vidas respondiendo**, Distancia gana ese asalto: se lleva volando al personaje que no se está jugando, la pantalla lo dice con un panel propio, y un solo botón — **"Cerrar la grieta y volver a intentarlo"** — devuelve al último checkpoint con Distancia lista para el siguiente intento. Igual que el resto del juego, esto **nunca es un final real**: es teatro para dar peso a las preguntas, no una manera de perder de verdad.

### El epílogo — "Caminar juntos"

Después de la carta ("Detalle final"), un segundo botón — **Caminar juntos →** — lleva a un quinto capítulo corto: sin corazones, sin peligro, sólo los dos caminando de la mano (el que no se juega corre al lado, como en el capítulo 4) hasta una casa. Al llegar a la puerta sale la pregunta de verdad: **¿Estás segura de pasar toda tu vida junto a mí?**

- **Sí** — los dos entran juntos y el juego cierra ahí, de verdad.
- **Todavía no** — un mensaje cariñoso, sin ningún drama, con un botón para volver a preguntar cuando quiera.

---

## 🎵 Música

Incluye `assets/musica.mp3` (actualmente *Persona favorita*). Para cambiarla, reemplaza ese archivo por cualquier otro mp3 **con el mismo nombre**. Si lo borras, el juego funciona igual pero en silencio.

---

## 🖥️ Probarlo en tu PC

Hace falta un servidor local: abrir `index.html` con doble clic no basta, porque el navegador bloquea la lectura de las imágenes desde `file://`. Con Python instalado, desde esta carpeta:

```bash
python -m http.server 8790
```

Y abre `http://localhost:8790`. Para ver cómo queda en el celular: F12 → icono de móvil (Ctrl+Shift+M).

---

## 🚀 Publicarlo en GitHub Pages

Esta carpeta se publica **aparte** del resto del regalo — no depende de ningún archivo fuera de `el-camino/`.

1. Entra a [github.com](https://github.com) e inicia sesión.
2. Botón **+** (arriba a la derecha) → **New repository**. Nombre, por ejemplo `el-camino-a-ti` → **Create repository**.
3. En el repo nuevo: **uploading an existing file** → arrastra TODOS los archivos y carpetas (`index.html`, `css`, `js`, `img`, `assets`) → **Commit changes**.
   - ⚠️ Arrastra las carpetas completas para que se conserve la estructura. `.claude` y `PLAN-V2.md` no hace falta subirlos.
   - ⚠️ **`img/` es obligatoria**: son los cuatro dibujos de los personajes. Sin ella el juego no arranca.
4. **Settings** → **Pages** → en "Branch" elige `main` y carpeta `/ (root)` → **Save**.
5. Espera 1-2 minutos y recarga: aparecerá el enlace, algo como
   `https://TU-USUARIO.github.io/el-camino-a-ti/`
6. Ábrelo en tu celular para probarlo y luego… envíaselo 💌

**Antes de hacerlo público:** este juego lleva nombres reales y dibujos de los dos. Un repositorio público de GitHub queda indexado por los buscadores. Si prefieres que no lo esté, usa un repositorio **privado** con Netlify o Cloudflare Pages en vez de GitHub Pages — dan una URL igual de compartible sin que Google la encuentre.

---

## 🧩 Cómo está armado

Sin build, sin dependencias, sin conexión a nada. Cada módulo hace una sola cosa y se carga en orden en `index.html`.

| Archivo | Qué hace |
|---|---|
| `js/nucleo.js` | Muelle (física de resorte), grafemas, utilidades, nivel de calidad |
| `js/guardado.js` | El progreso en `localStorage` |
| `js/entrada.js` | Teclado y táctil, unificados |
| `js/sprites.js` | Carga los 4 PNG, mide sus bordes opacos y los hornea a la escala de juego |
| `js/fisica.js` | Paso fijo, colisiones, coyote-time, buffer, planeo y corrientes |
| `js/flora.js` | Las 6 especies de flores, el viento y la floración por estela |
| `js/particulas.js` | Pétalos, polen, polvo, mariposas, destellos |
| `js/camara.js` | Seguimiento con muelle, look-ahead y micro-sacudida |
| `js/meta.js` | Los corazones y el portal de flores que abre el capítulo |
| `js/personaje.js` | Máquina de estados y deformación de los sprites |
| `js/escenario.js` | Las nueve capas del prado, horneadas |
| `js/guion.js` | Todo el texto — el único archivo que deberías editar |
| `js/subtitulos.js` | La barra de diálogo |
| `js/niveles.js` | La geometría de los 4 capítulos |
| `js/companero.js` | El personaje que no estás jugando |
| `js/sfx.js` | Los sonidos (sintetizados, sin archivos de audio) |
| `js/preguntas.js` | El banco de preguntas de Distancia |
| `js/jefe.js` | Distancia: su dibujo, su vida y la secuencia de batalla |
| `js/juego.js` | El bucle — conecta todo lo anterior |
| `js/final.js` | El panel de la carta |
| `js/seleccion.js` | La pantalla de elegir personaje |
| `js/menu.js` | Arranque y pantalla de inicio |

**Notas para quien toque el código**

- Las cifras de `fisica.js` mandan sobre `niveles.js`: velocidad 430 px/s, salto de 170 px (vez y media la altura del personaje), alcance 220 px, y ~540 px planeando. Ningún hueco pasa de 132 px sin planeo, ninguna subida de 93 px por salto, y **ninguna repisa con un corazón puede estar a más de 93 px del suelo del que se llega**: si no, quien se caiga se queda sin poder recuperarlo.
- Cuidado al tocar las fuerzas que compiten con la gravedad (`PLANEO_FRENO`, `CORRIENTE_FUERZA`): lo que importa es la DIFERENCIA con `GRAVEDAD`, no el valor absoluto. Las dos estuvieron por debajo de ella en algún momento y el resultado fue que ni el vilano frenaba ni las corrientes levantaban.
- Sólo hay dos dibujos por personaje (quieto y corriendo). El movimiento se fabrica deformándolos: rebote sincronizado a la distancia recorrida, squash al aterrizar, giro interpolado. Las piernas no alternan — para eso harían falta más dibujos.
- Para probar niveles de calidad: añade `?fx=0`, `?fx=1` o `?fx=2` a la URL.
- `Juego.estado()` desde la consola muestra posición, semillas y estado de animación.
- El plan de diseño completo, con el porqué de cada decisión, está en [`PLAN-V2.md`](PLAN-V2.md).
