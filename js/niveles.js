// ═══════════════════════════════════════════════════════════════
// NIVELES.JS — geometría de los cuatro capítulos
//
// Cada capítulo es puro dato. juego.js decide qué hacer con él; aquí
// sólo se construye el terreno.
//
// ── CÓMO SE PASA UN CAPÍTULO ──
// Recogiendo TODOS sus corazones y entrando después por el portal de
// flores del final. Los corazones no son un extra: son el objetivo, y
// están colocados a propósito donde hace falta usar el verbo que enseña
// el capítulo. Por eso recogerlos ES la dificultad del juego.
//
// El portal está siempre a la vista y va floreciendo con cada corazón,
// así que en todo momento se sabe qué falta y hacia dónde ir. Antes el
// final era un rectángulo invisible en el suelo: no había meta que
// mirar ni forma de saber que se había llegado.
//
// ── LO QUE MANDA SOBRE ESTAS CIFRAS ──
// Las constantes reales de fisica.js dan:
//     altura de salto ≈ 170 px · alcance a tope ≈ 220 px · vuelo 0.51 s
//     planeando, el alcance sube a ~400-450 px
// Y de ahí los topes que ningún capítulo puede contradecir:
//     · hueco sin planeo   ≤ 132 px  (60% del alcance)
//     · subida por salto   ≤  93 px  (55% de la altura)
// El margen SIEMPRE gana sobre la precisión exigida.
//
// ── LOS TRES ERRORES QUE AQUÍ NO SE REPITEN ──
//  1. Repisa sin aire suficiente por debajo: la cabeza chocaba al pasar.
//     Las repisas bajas de aquí son ESCALONES (se suben, no se pasan por
//     debajo) y las altas están fuera del camino.
//  2. Columnas de subida solapando la plataforma destino: el salto
//     moría contra su canto inferior. Ninguna corriente toca en
//     horizontal a la plataforma a la que lleva.
//  3. Saltos hacia atrás en un nivel que avanza a la derecha. Nunca.
// ═══════════════════════════════════════════════════════════════

const Niveles = (function () {
    'use strict';

    const ALTO_P = Fisica.ALTO_CUERPO;   // 112
    const GROSOR = 26;
    const HONDO = 600;
    const PORTAL_ANCHO = 132;
    const PORTAL_ALTO = 190;

    const repisa = (x, sup, ancho, alto) => ({ x, y: sup, ancho, alto: alto || GROSOR });
    const suelo = (x, sup, ancho) => ({ x, y: sup, ancho, alto: HONDO });
    const dePie = (x, sup) => ({ x, y: sup - ALTO_P });
    // El arco se apoya SOBRE la superficie que se le indique.
    const portalEn = (x, sup) => ({ x, y: sup - PORTAL_ALTO, ancho: PORTAL_ANCHO, alto: PORTAL_ALTO });

    // ══════════════════════════════════════════════
    // CAPÍTULO 1 — El primer hola
    // Enseña a correr y saltar. Dos huecos pequeños (120 px, muy por
    // debajo de los 220 de alcance) y una escalera de dos escalones de
    // 88 px cada uno. Tres corazones piden saltar; dos están en el
    // suelo, para que el primero se recoja sin pensarlo y se entienda
    // qué son.
    // ══════════════════════════════════════════════
    function construirAmanecer(H) {
        const s = Math.round(H * 0.74);

        const plataformas = [
            suelo(-400, s, 1100),          // -400 → 700
            suelo(820, s, 700),            //  820 → 1520   · hueco 120
            suelo(1640, s, 1600),          // 1640 → 3240   · hueco 120
            repisa(690, s - 88, 140),      // pasarela sobre el hueco 1
            // ⚠️ LAS DOS REPISAS VAN A LA MISMA ALTURA, y no es pereza.
            // Antes eran una escalera: 85 px y luego otros 85, dejando la
            // segunda a 170 px del suelo — justo la altura MÁXIMA de
            // salto, es decir, margen cero. Quien se cayera del primer
            // escalón quedaba debajo del segundo sin poder volver a
            // subir, y con un corazón obligatorio arriba el capítulo se
            // volvía intrasitable. El bot se quedó ahí 1360 saltos.
            // A 88 px las dos, siempre se puede subir desde el suelo y
            // no existe forma de quedarse atrapado.
            repisa(1900, s - 88, 160),     // 1900 → 2060
            repisa(2200, s - 88, 160)      // 2200 → 2360 · hueco 140, saltable
        ];

        return {
            clave: 'amanecer', escena: 'amanecer', guion: 'amanecer',
            plataformas, corrientes: [],
            ancho: 3240,
            spawn: dePie(60, s),
            checkpoints: [dePie(60, s), dePie(880, s), dePie(1700, s), dePie(2400, s)],
            corazones: [
                { x: 380, y: s - 52, indice: 0 },          // en el suelo: enseña qué son
                { x: 760, y: s - 88 - 52, indice: 1 },     // sobre la pasarela del hueco
                { x: 1200, y: s - 52, indice: 2 },
                { x: 1980, y: s - 88 - 52, indice: 3 },    // repisa 1
                { x: 2280, y: s - 88 - 52, indice: 4 }     // repisa 2
            ],
            // Corazones rotos: el peligro del capítulo. Puestos a la altura
            // exacta de un salto apurado — sólo se tocan si se salta sin
            // pensar. Con calma, se pasan por debajo o por encima sin rozar.
            corazonesRotos: [
                { x: 1580, y: s - 100 },   // sobre el segundo hueco
                { x: 2130, y: s - 178 }    // entre las dos repisas de la escalera
            ],
            portal: portalEn(2870, s),
            // Directamente dentro del arco desde el principio del capítulo,
            // no al lado — así no hace falta moverlo de golpe al terminar.
            companero: dePie(2870 + 132 / 2, s),
            limiteCaida: s + H,
            limiteArriba: -60, limiteAbajo: 60
        };
    }

    // ══════════════════════════════════════════════
    // CAPÍTULO 2 — Los jueves
    // Enseña a planear. Los huecos son de 280 px: imposibles de saltar
    // (el alcance es 220) y cómodos planeando (~354). Esa diferencia
    // tiene que ser grande a propósito — un hueco de 240 sería "casi"
    // saltable, y eso sí frustra; uno de 280 se lee como "aquí hace
    // falta otra cosa".
    //
    // ⚠️ TODAS LAS ISLAS A LA MISMA ALTURA, y no es decorativo.
    // Antes bajaban 40 px cada una y los corazones flotaban en mitad de
    // los huecos. Con las islas escalonadas hacia abajo el camino es de
    // ida sin vuelta: el planeo sólo frena la caída, nunca eleva, así
    // que pasar de largo un corazón lo dejaba inalcanzable PARA SIEMPRE
    // y el capítulo se volvía imposible de terminar. Lo destapó el bot:
    // 0 de 5 corazones y 38 caídas.
    //
    // A la misma altura, un planeo cubre 354 px en cualquier dirección,
    // así que siempre se puede volver a por lo que se dejó atrás.
    // ══════════════════════════════════════════════
    function construirTarde(H) {
        const s = Math.round(H * 0.60);

        const islas = [
            { x: -400, ancho: 900 },   // → 500
            { x: 780, ancho: 280 },    // hueco 280 → 1060
            { x: 1340, ancho: 280 },   // hueco 280 → 1620
            { x: 1900, ancho: 280 },   // hueco 280 → 2180
            { x: 2460, ancho: 280 },   // hueco 280 → 2740
            { x: 3020, ancho: 950 }    // hueco 280 → 3970
        ];

        const plataformas = islas.map(i => suelo(i.x, s, i.ancho));
        const checkpoints = islas.map(i => dePie(i.x + 50, s));

        // Los corazones van en el punto exacto por donde pasa el arco del
        // planeo, medido: ~170 px sobre la isla, a 140 px del borde. Más
        // abajo se les pasa por encima sin rozarlos.
        const corazones = islas.slice(0, 5).map((isla, i) => ({
            x: isla.x + isla.ancho + 140,
            y: s - 170,
            indice: i
        }));

        // Corazones rotos: 90 px por ENCIMA de la altura normal del
        // planeo (s-170). Sólo se tocan si se plantea más de lo que
        // hace falta — planear justo lo necesario los deja intactos.
        const corazonesRotos = [1, 3].map(i => ({
            x: islas[i].x + islas[i].ancho + 140,
            y: s - 260
        }));

        return {
            clave: 'tarde', escena: 'tarde', guion: 'tarde',
            plataformas, corrientes: [],
            ancho: 3970,
            spawn: dePie(60, s),
            checkpoints,
            corazones,
            corazonesRotos,
            portal: portalEn(3540, s),
            // Directamente dentro del arco desde el principio del capítulo,
            // no al lado — así no hace falta moverlo de golpe al terminar.
            companero: dePie(3540 + 132 / 2, s),
            limiteCaida: s + H + 400,
            limiteArriba: -60, limiteAbajo: 80
        };
    }

    // ══════════════════════════════════════════════
    // CAPÍTULO 3 — La pregunta
    // Enseña a dejarse subir. No se asciende saltando entre repisas —ahí
    // fue donde la primera versión se rompió— sino entrando en columnas
    // de pétalos. Sólo hay que caminar a la derecha y meterse; el resto
    // lo hace el aire. Subir tenía que sentirse como atreverse, no como
    // pelearse con el mando.
    //
    // Cada columna sube 190 px POR ENCIMA de la repisa a la que lleva.
    // Ese exceso no es capricho: es el tiempo de caída que hace falta
    // para desplazarse en horizontal hasta la repisa. Con la columna
    // justa a la altura del destino, se salía sin recorrido y se caía
    // en el hueco.
    //
    // Ninguna columna toca en horizontal a su repisa destino: si lo
    // hiciera, subir por dentro significaría golpearse con su canto.
    // ══════════════════════════════════════════════
    function construirDorado(H) {
        const base = Math.round(H * 0.80);
        const SUBE = 340;
        const SOBRA = 190;   // cuánto sube la columna por encima del destino

        const s0 = base;
        const s1 = base - SUBE;
        const s2 = base - SUBE * 2;
        const s3 = base - SUBE * 3;

        const plataformas = [
            suelo(-400, s0, 900),        // -400 → 500
            repisa(820, s1, 380),        //  820 → 1200
            repisa(1520, s2, 380),       // 1520 → 1900
            repisa(2220, s3, 600)        // 2220 → 2820 · la cima
        ];

        const columna = (x, arriba, abajo) => ({
            x, ancho: 220, y: arriba - SOBRA, alto: (abajo + 60) - (arriba - SOBRA)
        });
        const corrientes = [
            columna(520, s1, s0),        //  520 → 740   (repisa1 empieza en 820)
            columna(1240, s2, s1),       // 1240 → 1460  (repisa2 empieza en 1520)
            columna(1940, s3, s2)        // 1940 → 2160  (cima empieza en 2220)
        ];

        return {
            clave: 'dorado', escena: 'dorado', guion: 'dorado',
            plataformas, corrientes,
            ancho: 2820,
            spawn: dePie(60, s0),
            checkpoints: [dePie(60, s0), dePie(870, s1), dePie(1570, s2), dePie(2270, s3)],
            corazones: [
                { x: 630, y: s0 - 300, indice: 0 },   // dentro de la 1ª columna
                { x: 950, y: s1 - 52, indice: 1 },
                { x: 1350, y: s1 - 340, indice: 2 },  // dentro de la 2ª
                { x: 1650, y: s2 - 52, indice: 3 },
                { x: 2050, y: s2 - 340, indice: 4 }   // dentro de la 3ª
            ],
            // Corazones rotos: más arriba dentro de las mismas columnas 1
            // y 3 — sólo se tocan si te quedas flotando de más en vez de
            // salir hacia la repisa en cuanto toca.
            corazonesRotos: [
                { x: 630, y: s0 - 480 },
                { x: 2050, y: s2 - 480 }
            ],
            portal: portalEn(2480, s3),
            // Directamente dentro del arco desde el principio del capítulo,
            // no al lado — así no hace falta moverlo de golpe al terminar.
            companero: dePie(2480 + 132 / 2, s3),
            limiteCaida: base + 300,
            limiteArriba: s3 - Math.round(H * 0.55), limiteAbajo: 80
        };
    }

    // ══════════════════════════════════════════════
    // CAPÍTULO 4 — A tu lado
    // El cierre, con los tres verbos juntos. Suelo CONTINUO de punta a
    // punta: aquí no se puede caer ni queriendo, y esa es la intención.
    // Hay escalones que subir y una corriente final que eleva a los dos
    // al mirador, pero fallar cualquiera de las dos cosas sólo devuelve
    // al prado. Nada en este capítulo puede castigar.
    // ══════════════════════════════════════════════
    function construirPleno(H) {
        const s = Math.round(H * 0.74);
        const mirador = s - 420;

        const plataformas = [
            // El suelo se extiende MÁS ALLÁ del ancho del nivel: si
            // acabara en el borde, quien siguiera corriendo en vez de
            // subir se caería por el final del mundo, y este capítulo
            // prometía que no se podía caer.
            suelo(-400, s, 4400),          // -400 → 4000
            // Las dos a la misma altura, por lo mismo que en el capítulo
            // 1: la segunda estaba a 176 px del suelo, por ENCIMA de los
            // 170 de salto máximo. Era literalmente inalcanzable salvo
            // saltando desde la primera, y quien se cayera se quedaba sin
            // poder recuperar un corazón obligatorio.
            repisa(800, s - 88, 200),      //  800 → 1000
            repisa(1150, s - 88, 200),     // 1150 → 1350 · hueco 150
            repisa(2740, mirador, 760)     // 2740 → 3500 · el mirador
        ];

        const corrientes = [
            // 300 de ancho (más que las del capítulo 3) para que suba
            // con holgura: aquí no puede haber ni un tropiezo.
            { x: 2400, ancho: 300, y: mirador - 190, alto: (s + 60) - (mirador - 190) }
        ];

        return {
            clave: 'pleno', escena: 'pleno', guion: 'pleno',
            plataformas, corrientes,
            ancho: 3600,
            spawn: dePie(60, s),
            checkpoints: [dePie(60, s), dePie(1300, s), dePie(2100, s), dePie(2800, mirador)],
            corazones: [
                { x: 890, y: s - 88 - 52, indice: 0 },
                { x: 1240, y: s - 88 - 52, indice: 1 },
                { x: 1800, y: s - 52, indice: 2 },
                { x: 2540, y: s - 330, indice: 3 },        // dentro de la corriente
                { x: 2900, y: mirador - 52, indice: 4 }
            ],
            portal: portalEn(3120, mirador),
            companero: dePie(3360, mirador),
            // El compañero corre AL LADO en este capítulo en vez de
            // esperar al final: es el único donde van juntos.
            acompana: true,
            limiteCaida: s + H + 200,
            limiteArriba: mirador - 190 - Math.round(H * 0.5), limiteAbajo: 80
        };
    }

    // ══════════════════════════════════════════════
    // CAPÍTULO 5 — Nuestro hogar (epílogo, sólo desde la carta)
    // No es un capítulo del juego "de verdad" — no se llega aquí por
    // "Siguiente capítulo", sólo desde el botón "Caminar juntos" del
    // panel final. No enseña nada ni pone nada a prueba: eso ya pasó en
    // los capítulos 1-4. Aquí sólo se camina, juntos, hacia la casa.
    // Sin corazones que perseguir ni corazones rotos que esquivar.
    // ══════════════════════════════════════════════
    function construirHogar(H) {
        const s = Math.round(H * 0.74);
        // La casa de dos plantas (con la puerta a la altura de referencia
        // que se pidió) ocupa unos 600px de ancho visual con aleros. Ese
        // margen tiene que caber ENTERO después de la puerta — si no, la
        // cámara (que no puede pasar de nivel.ancho) recorta la fachada
        // contra el borde derecho de la pantalla, como pasó la vez pasada.
        const anchoNivel = 3000;

        const plataformas = [
            // Se extiende bastante más allá de la casa: nadie se cae
            // por seguir de largo una vez que ya llegó.
            suelo(-400, s, anchoNivel + 700)
        ];

        return {
            clave: 'hogar', escena: 'pleno', guion: 'hogar',
            plataformas, corrientes: [],
            ancho: anchoNivel,
            spawn: dePie(60, s),
            checkpoints: [dePie(60, s)],
            corazones: [],
            portal: null,
            // La zona de la puerta: al llegar aquí no se abre un portal,
            // se abre la pregunta de verdad.
            casa: { x: anchoNivel - 500, y: s - 170, ancho: 190, alto: 170 },
            companero: dePie(160, s),
            // Igual que el capítulo 4: corre al lado, de la mano, no
            // esperando al final.
            acompana: true,
            limiteCaida: s + H,
            limiteArriba: -60, limiteAbajo: 60
        };
    }

    const CONSTRUCTORES = [construirAmanecer, construirTarde, construirDorado, construirPleno, construirHogar];

    return {
        total: CONSTRUCTORES.length,
        cargar(indice, H) {
            const fn = CONSTRUCTORES[indice];
            return fn ? fn(H) : null;
        }
    };
})();

window.Niveles = Niveles;
