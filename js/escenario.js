// ═══════════════════════════════════════════════════════════════
// ESCENARIO.JS — el prado luminoso, en nueve capas
//
// Reescritura total. La versión anterior tenía cielos de #2c1b3d y
// #04060f — casi negros. Esto se le regala a alguien; la referencia
// correcta es una mañana de primavera, no un juego de terror indie.
//
//   1 cielo · 2 sol · 3 montañas · 4 mimosas · 5 colinas
//   6 [PLANO DE JUEGO, lo pinta juego.js] · 7 primer plano
//   8 [partículas] · 9 viñeta cálida
//
// ── Regla de coste ──
// Todo lo que no cambia se hornea en canvas al cargar el capítulo o al
// redimensionar; el bucle sólo estampa y desplaza. Nada de degradados
// recreados por fotograma, nada de ctx.filter — en canvas 2D obliga a
// rasterizar de nuevo la capa entera y hunde el framerate en móvil.
//
// ── Cómo florece el mundo ──
// Cada capa vegetal se hornea DOS veces: una pálida y escasa, otra viva
// y densa. Al dibujar se estampa la pálida y encima la viva con
// globalAlpha = progreso. Un crossfade de dos drawImage no cuesta nada
// y consigue lo que 'saturate()' costaría carísimo: el prado gana color
// y flores conforme el personaje avanza. Ese crossfade ES la idea del
// juego hecha render.
// ═══════════════════════════════════════════════════════════════

const Escenario = (function () {
    'use strict';

    const ANCHO_TIRA = Flora.ANCHO_TIRA;

    // ══════════════════════════════════════════════
    // ATMÓSFERAS — una por capítulo. Ninguna es oscura.
    // ══════════════════════════════════════════════
    const CAPITULOS = {
        // 1 · El primer hola — mañana clara de prado
        amanecer: {
            cielo: ['#bfe4f2', '#dcf0f2', '#ffe9d6', '#ffd9e2'],
            sol: { x: .72, y: .18, r: 150 },
            montana: ['#cfe0ee', '#dbe8f3'],
            arboles: '#a8d49a',
            colinas: ['#cfe6c3', '#a8d49a', '#7fbf7a'],
            especies: ['margarita', 'margarita', 'ranunculo'],
            frente: '#5c9e63',
            mariposas: 3
        },
        // 2 · Los jueves — atardecer rosa sobre islas
        tarde: {
            cielo: ['#f6d9ee', '#ffd9e2', '#ffc9c0', '#ffdcc2'],
            sol: { x: .28, y: .26, r: 175 },
            montana: ['#e2cfe6', '#eadcee'],
            arboles: '#b6cf9e',
            colinas: ['#dcd6ea', '#c2ceb0', '#9dbd8c'],
            especies: ['margarita', 'campanilla'],
            frente: '#7d9a6e',
            mariposas: 2
        },
        // 3 · La pregunta — dorado de tarde alta
        // El cielo es ámbar, así que las colinas NO pueden serlo también:
        // con todo del mismo tono el capítulo salía monocromo y el prado
        // se confundía con el aire. Los verdes se conservan, sólo se
        // calientan hacia el dorado — que es justo lo que hace la luz de
        // las seis de la tarde con la hierba de verdad.
        dorado: {
            cielo: ['#ffe4c0', '#ffd7a4', '#ffc890', '#ffbb9c'],
            sol: { x: .5, y: .14, r: 200 },
            montana: ['#e8c9a8', '#f2ddc2'],
            arboles: '#a8b46a',
            colinas: ['#d8e0a2', '#adc77e', '#83a862'],
            especies: ['tulipan', 'margarita', 'ranunculo'],
            frente: '#6f8f4c',
            mariposas: 4
        },
        // 4 · A tu lado — amanecer pleno, campo infinito
        pleno: {
            cielo: ['#cfeaf5', '#e6f2ea', '#fff0d8', '#ffe9a8'],
            sol: { x: .5, y: .2, r: 230 },
            montana: ['#d6e6e2', '#e6f0ea'],
            arboles: '#9ed08c',
            colinas: ['#d8ecb8', '#b2dd93', '#8ccb78'],
            especies: ['margarita', 'ranunculo', 'tulipan', 'campanilla'],
            frente: '#5f9c58',
            mariposas: 6
        }
    };

    // ══════════════════════════════════════════════
    // COLOR — "despintar" una capa es mezclarla hacia el crema, no
    // hacia el gris: un prado desaturado a gris parece enfermo, y
    // mezclado a crema parece simplemente lejano o aún sin florecer.
    // ══════════════════════════════════════════════
    // Acepta '#rrggbb' y 'rgb(r,g,b)'. Hace falta las dos formas porque
    // palido() se aplica en cascada: la versión pálida de una colina se
    // vuelve a aclarar al hornear su degradado, y para entonces el color
    // ya no es hexadecimal sino la cadena rgb() que devolvió la primera
    // pasada.
    function aRGB(color) {
        if (color[0] === '#') {
            const h = color.slice(1);
            return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
        }
        const n = color.match(/-?\d+/g) || [0, 0, 0];
        return [+n[0], +n[1], +n[2]];
    }
    function palido(hex, k) {
        const [r, g, b] = aRGB(hex);
        const m = (c, d) => Math.round(c + (d - c) * k);
        return `rgb(${m(r, 250)},${m(g, 246)},${m(b, 232)})`;
    }

    // Perspectiva atmosférica: lo lejano no se "aclara", se tiñe del
    // color del AIRE que hay entre el ojo y el objeto — es decir, del
    // cielo. Mezclar hacia el cielo en vez de hacia el blanco es lo que
    // hace que las montañas parezcan estar de verdad a kilómetros y no
    // simplemente pintadas más flojas.
    function mezclar(hexA, hexB, k) {
        const A = aRGB(hexA), B = aRGB(hexB);
        const m = i => Math.round(A[i] + (B[i] - A[i]) * k);
        return `rgb(${m(0)},${m(1)},${m(2)})`;
    }

    // ══════════════════════════════════════════════
    // HORNEADO DE CAPAS
    // ══════════════════════════════════════════════

    // Silueta de colina: suma de tres senos. Las frecuencias son
    // múltiplos ENTEROS del ancho de la tira, así el borde derecho
    // encaja exacto con el izquierdo y el tileado no deja costura.
    function hornearColina(alto, amplitud, color, semilla, alturaBase) {
        const c = document.createElement('canvas');
        c.width = ANCHO_TIRA; c.height = alto;
        const g = c.getContext('2d');
        const r = Flora.sembrar(semilla);
        const f1 = r() * 6.28, f2 = r() * 6.28, f3 = r() * 6.28;

        g.beginPath();
        g.moveTo(0, alto);
        for (let x = 0; x <= ANCHO_TIRA; x += 4) {
            const u = (x / ANCHO_TIRA) * Math.PI * 2;
            const y = alturaBase
                + Math.sin(u * 1 + f1) * amplitud
                + Math.sin(u * 2 + f2) * amplitud * 0.45
                + Math.sin(u * 3 + f3) * amplitud * 0.22;
            g.lineTo(x, y);
        }
        g.lineTo(ANCHO_TIRA, alto);
        g.closePath();

        const grad = g.createLinearGradient(0, alturaBase - amplitud, 0, alto);
        grad.addColorStop(0, color);
        grad.addColorStop(1, palido(color, .18));
        g.fillStyle = grad;
        g.fill();
        return c;
    }

    // Copas de mimosa: masas redondeadas con pompones amarillos encima.
    function hornearArboles(alto, color, semilla) {
        const c = document.createElement('canvas');
        c.width = ANCHO_TIRA; c.height = alto;
        const g = c.getContext('2d');
        const r = Flora.sembrar(semilla);
        for (let i = 0; i < 16; i++) {
            const x = r() * ANCHO_TIRA;
            const rr = alto * (0.28 + r() * 0.26);
            const y = alto - rr * 0.35;
            g.fillStyle = palido('#8a6a4a', .3);
            g.fillRect(x - rr * .07, y, rr * .14, alto - y);
            g.fillStyle = color;
            g.beginPath();
            g.ellipse(x, y, rr * 1.25, rr, 0, 0, Math.PI * 2);
            g.fill();
            const s = Math.max(5, rr * 0.16);
            const cab = Flora.cabeza('mimosa', s, 0);
            g.globalAlpha = .85;
            for (let k = 0; k < 6; k++) {
                const a = r() * Math.PI * 2, d = Math.sqrt(r()) * rr * .85;
                g.drawImage(cab, x + Math.cos(a) * d * 1.2 - s, y + Math.sin(a) * d * .8 - s, s * 2, s * 2);
            }
            g.globalAlpha = 1;
        }
        return c;
    }

    function hornearMontana(alto, color, semilla) {
        const c = document.createElement('canvas');
        c.width = ANCHO_TIRA; c.height = alto;
        const g = c.getContext('2d');
        const r = Flora.sembrar(semilla);
        g.fillStyle = color;
        g.beginPath();
        g.moveTo(0, alto);
        let x = 0;
        while (x < ANCHO_TIRA) {
            const w = 150 + r() * 260;
            const h = alto * (0.35 + r() * 0.6);
            g.lineTo(x + w * .5, alto - h);
            x += w;
            g.lineTo(x, alto - h * .15);
        }
        g.lineTo(ANCHO_TIRA, alto);
        g.closePath();
        g.fill();
        return c;
    }

    // Flores grandes pegadas a la cámara. No se usa desenfoque real
    // (ctx.filter='blur' es carísimo): tamaño grande + opacidad baja +
    // tono plano bastan para que el ojo las lea como "delante y fuera
    // de foco".
    function hornearFrente(alto, color, semilla) {
        const c = document.createElement('canvas');
        c.width = ANCHO_TIRA; c.height = alto;
        const g = c.getContext('2d');
        const r = Flora.sembrar(semilla);
        // Especies de copa CERRADA a propósito. Una margarita a 40 px de
        // radio, tan cerca de la cámara, deja de parecer una margarita y
        // se convierte en un girasol — y aquí no puede haber girasoles.
        // El tulipán y la campanilla no tienen esa lectura a ningún
        // tamaño, y además su silueta vertical enmarca mejor la escena.
        const especies = ['tulipan', 'campanilla', 'ranunculo'];
        // A .45 estas flores se leían como manchas sucias sobre la
        // tierra en vez de como plantas delante de la cámara. Con más
        // cuerpo vuelven a ser flores; el efecto de "fuera de foco" ya lo
        // da el tamaño, no hace falta desvanecerlas.
        g.globalAlpha = .72;
        for (let i = 0; i < 11; i++) {
            const x = r() * ANCHO_TIRA;
            const h = alto * (0.55 + r() * 0.45);
            g.strokeStyle = color;
            g.lineWidth = 6 + r() * 5;
            g.lineCap = 'round';
            g.beginPath();
            g.moveTo(x, alto);
            g.quadraticCurveTo(x + (r() - .5) * 60, alto - h * .6, x + (r() - .5) * 90, alto - h);
            g.stroke();
            const R = 14 + r() * 10;
            const cab = Flora.cabeza(especies[(r() * especies.length) | 0], R, (r() * 3) | 0);
            g.drawImage(cab, x - R, alto - h - R, R * 2, R * 2);
        }
        g.globalAlpha = 1;
        return c;
    }

    // ── Nubes ──
    // Cada nube es un racimo de elipses con un degradado vertical: más
    // clara arriba (le da el sol) y con un pelo de sombra abajo. Nada de
    // círculos planos: es la diferencia entre una nube y un garabato.
    function hornearNubes(alto, semilla, tonoAlto, tonoBajo) {
        const c = document.createElement('canvas');
        c.width = ANCHO_TIRA; c.height = alto;
        const g = c.getContext('2d');
        const r = Flora.sembrar(semilla);

        for (let n = 0; n < 5; n++) {
            const cxn = r() * ANCHO_TIRA;
            const cyn = alto * (0.3 + r() * 0.45);
            const esc = 0.65 + r() * 0.75;
            const grad = g.createLinearGradient(0, cyn - 44 * esc, 0, cyn + 26 * esc);
            grad.addColorStop(0, tonoAlto);
            grad.addColorStop(1, tonoBajo);
            g.fillStyle = grad;
            g.globalAlpha = 0.5 + r() * 0.32;
            for (let i = 0; i < 6; i++) {
                const dx = (i - 2.5) * 42 * esc + (r() - .5) * 26 * esc;
                const dy = (r() - .5) * 16 * esc;
                const rx = (38 + r() * 34) * esc;
                const ry = rx * (0.44 + r() * 0.2);
                g.beginPath();
                g.ellipse(cxn + dx, cyn + dy, rx, ry, 0, 0, Math.PI * 2);
                g.fill();
            }
            g.globalAlpha = 1;
        }
        return c;
    }

    // ── Rayos de sol ──
    // Cuñas que salen del sol, difuminadas por un degradado radial que
    // las apaga con la distancia. Se hornean una vez a tamaño de
    // pantalla y luego se estampan dos veces: una detrás del mundo
    // (dentro del cielo) y otra delante con 'lighter', que es lo que da
    // la sensación de luz atravesando el aire en vez de un dibujo pegado
    // al fondo.
    function hornearRayos(W, H, cfg) {
        const c = document.createElement('canvas');
        c.width = Math.max(1, W); c.height = Math.max(1, H);
        const g = c.getContext('2d');
        const sx = W * cfg.sol.x, sy = H * cfg.sol.y;
        const largo = Math.hypot(W, H) * 1.2;
        const r = Flora.sembrar(4051);

        // Pocos rayos y muy tenues. Con once y a media opacidad esto se
        // convertía en un sol de estampita que dominaba la composición y
        // lavaba el resto. Un rayo de sol de verdad se intuye; no se
        // mira. Cinco, apenas visibles, y sólo hacia abajo.
        g.translate(sx, sy);
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 1.1 + 0.5 + r() * 0.25;
            const ancho = 0.014 + r() * 0.03;
            g.save();
            g.rotate(a);
            const grad = g.createLinearGradient(0, 0, largo, 0);
            grad.addColorStop(0, 'rgba(255,250,220,.2)');
            grad.addColorStop(.3, 'rgba(255,244,194,.07)');
            grad.addColorStop(1, 'rgba(255,244,194,0)');
            g.fillStyle = grad;
            g.beginPath();
            g.moveTo(0, 0);
            g.lineTo(largo, -Math.tan(ancho) * largo);
            g.lineTo(largo, Math.tan(ancho) * largo);
            g.closePath();
            g.fill();
            g.restore();
        }
        return c;
    }

    function hornearCielo(W, H, cfg) {
        const c = document.createElement('canvas');
        c.width = Math.max(1, W); c.height = Math.max(1, H);
        const g = c.getContext('2d');

        const grad = g.createLinearGradient(0, 0, 0, H);
        cfg.cielo.forEach((col, i) => grad.addColorStop(i / (cfg.cielo.length - 1), col));
        g.fillStyle = grad;
        g.fillRect(0, 0, W, H);

        // El sol se hornea DENTRO del cielo: no se mueve respecto a él.
        const sx = W * cfg.sol.x, sy = H * cfg.sol.y, R = cfg.sol.r;
        const halo = g.createRadialGradient(sx, sy, 0, sx, sy, R);
        halo.addColorStop(0, 'rgba(255,250,222,.95)');
        halo.addColorStop(.4, 'rgba(255,244,194,.42)');
        halo.addColorStop(1, 'rgba(255,244,194,0)');
        g.fillStyle = halo;
        g.beginPath(); g.arc(sx, sy, R, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,252,232,.9)';
        g.beginPath(); g.arc(sx, sy, R * .24, 0, Math.PI * 2); g.fill();
        return c;
    }

    // ══════════════════════════════════════════════
    // TILEADO INFINITO
    // ══════════════════════════════════════════════
    function capaInfinita(g, sprite, desp, y, W, alpha) {
        if (!sprite) return;
        const tira = sprite.width;
        // El % de JS puede dar negativo; se normaliza para que la
        // primera copia empiece siempre a la izquierda del borde.
        let x = -(((desp % tira) + tira) % tira);
        if (alpha !== undefined) g.globalAlpha = alpha;
        while (x < W) {
            g.drawImage(sprite, Math.round(x), Math.round(y));
            x += tira;
        }
        if (alpha !== undefined) g.globalAlpha = 1;
    }

    // ══════════════════════════════════════════════
    // ESCENA
    // ══════════════════════════════════════════════
    function crear(clave, W, H) {
        const cfg = CAPITULOS[clave] || CAPITULOS.amanecer;
        const capas = {};
        let ancho = W, alto = H;

        function hornearTodo() {
            const s = clave.length * 977 + 13;   // semilla estable por capítulo

            capas.cielo = hornearCielo(ancho, alto, cfg);
            capas.rayos = hornearRayos(ancho, alto, cfg);

            // El aire del horizonte: el color del cielo justo donde se
            // apoyan las montañas. Todo lo lejano se mezcla hacia él.
            const aire = cfg.cielo[cfg.cielo.length - 2];
            capas.nubes = hornearNubes(Math.round(alto * .3), s + 60,
                mezclar('#ffffff', aire, .12), mezclar('#ffffff', aire, .5));
            capas.nubes2 = hornearNubes(Math.round(alto * .24), s + 61,
                mezclar('#ffffff', aire, .34), mezclar('#ffffff', aire, .66));

            capas.montana1 = hornearMontana(Math.round(alto * .22), mezclar(cfg.montana[0], aire, .58), s + 1);
            capas.montana2 = hornearMontana(Math.round(alto * .17), mezclar(cfg.montana[1], aire, .38), s + 2);
            capas.arboles = hornearArboles(Math.round(alto * .17), mezclar(cfg.arboles, aire, .22), s + 3);

            capas.colina = [];
            capas.colinaViva = [];
            capas.colinaTono = [];
            for (let i = 0; i < 3; i++) {
                const h = Math.round(alto * (.20 + i * .07));
                const amp = 16 + i * 13;
                const base = h * .55;
                const vivo = cfg.colinas[i];
                const flojo = palido(vivo, .45);
                capas.colinaViva.push(hornearColina(h, amp, vivo, s + 10 + i, base));
                capas.colina.push(hornearColina(h, amp, flojo, s + 10 + i, base));
                // El color del pie de cada colina, para prolongarla hasta
                // abajo del todo (ver dibujarFondo).
                capas.colinaTono.push({ vivo: palido(vivo, .18), flojo: palido(flojo, .18) });
            }

            // Campos: pálido y escaso ↔ vivo y denso, MISMA semilla en
            // ambos, para que el crossfade parezca que las mismas
            // plantas florecen y no que aparece un campo distinto.
            capas.campo = [];
            capas.campoVivo = [];
            for (let i = 0; i < 2; i++) {
                capas.campo.push(Flora.tiraCampo({
                    alto: 120 + i * 40, densidad: 5 + i * 3,
                    especies: ['margarita'], escala: .55 + i * .2, semilla: s + 20 + i
                }));
                capas.campoVivo.push(Flora.tiraCampo({
                    alto: 120 + i * 40, densidad: 24 + i * 12,
                    especies: cfg.especies, escala: .7 + i * .3, semilla: s + 20 + i
                }));
            }

            capas.frente = hornearFrente(Math.round(alto * .3), cfg.frente, s + 40);
        }

        hornearTodo();

        function remedir(W2, H2) {
            if (W2 === ancho && H2 === alto) return;
            ancho = W2; alto = H2;
            hornearTodo();
        }

        // progreso: 0..1 — cuánto ha florecido este capítulo.
        function dibujarFondo(g, camX, camY, t, progreso) {
            const p = Nucleo.lim(progreso, 0, 1);
            // Con movimiento reducido se anula el parallax DIFERENCIAL
            // (todo al mismo factor). El fondo sigue desplazándose, pero
            // sin la profundidad que marea.
            const f = k => Nucleo.reducido ? 1 : k;

            g.drawImage(capas.cielo, 0, 0);
            g.globalAlpha = .5;
            g.drawImage(capas.rayos, 0, 0);
            g.globalAlpha = 1;

            // El fondo apenas responde a la cámara vertical: a 1:1, en el
            // capítulo del ascenso el cielo se saldría por arriba y
            // dejaría un vacío blanco.
            const vy = camY * 0.12;

            // Las nubes van más lentas que las montañas: son lo más
            // lejano que hay, salvo el propio cielo.
            capaInfinita(g, capas.nubes, camX * f(.07), alto * .10 - vy * .5, ancho);
            capaInfinita(g, capas.nubes2, camX * f(.12), alto * .28 - vy * .7, ancho);

            capaInfinita(g, capas.montana1, camX * f(.15), alto * .46 - vy, ancho);
            capaInfinita(g, capas.montana2, camX * f(.25), alto * .52 - vy, ancho);
            capaInfinita(g, capas.arboles, camX * f(.40), alto * .56 - vy, ancho);

            for (let i = 0; i < 3; i++) {
                const fac = f(.55 + i * .15);
                const y = alto * (.58 + i * .08) - camY * (0.12 + i * 0.08);
                const tira = capas.colina[i];

                // Cada tira de colina se rellena sólo hasta el borde de
                // su propio lienzo. Donde no hay plataforma que lo tape
                // —encima de un hueco, por ejemplo— ese borde se veía
                // como una franja pálida cortada en seco. Se prolonga el
                // color del pie hasta abajo del todo.
                const pie = y + tira.height;
                if (pie < alto) {
                    // Con relleno plano, un hueco entre plataformas dejaba
                    // ver una losa de color liso y se leía como un error de
                    // dibujo. Con un degradado que se va oscureciendo hacia
                    // abajo parece lo que debe parecer: el valle que sigue
                    // ahí, lejos y en sombra.
                    const hondo = (col) => {
                        const gr = g.createLinearGradient(0, pie, 0, alto);
                        gr.addColorStop(0, col);
                        gr.addColorStop(1, mezclar(col, '#6f7f8c', .3));
                        return gr;
                    };
                    g.fillStyle = hondo(capas.colinaTono[i].flojo);
                    g.fillRect(0, pie - 1, ancho, alto - pie + 1);
                    if (p > 0.01) {
                        g.globalAlpha = p;
                        g.fillStyle = hondo(capas.colinaTono[i].vivo);
                        g.fillRect(0, pie - 1, ancho, alto - pie + 1);
                        g.globalAlpha = 1;
                    }
                }

                capaInfinita(g, tira, camX * fac, y, ancho);
                if (p > 0.01) capaInfinita(g, capas.colinaViva[i], camX * fac, y, ancho, p);
            }

            for (let i = 0; i < 2; i++) {
                const fac = f(.72 + i * .13);
                const y = alto * (.70 + i * .09) - camY * (0.3 + i * 0.2);
                capaInfinita(g, capas.campo[i], camX * fac, y, ancho);
                if (p > 0.01) capaInfinita(g, capas.campoVivo[i], camX * fac, y, ancho, p);
            }

            // ── Neblina de valle ──
            // Sólo se ve por los HUECOS entre plataformas, porque el
            // resto lo tapa el terreno. Sin ella, un hueco enseñaba un
            // fondo liso y se leía como un agujero en el dibujo en vez de
            // como un vacío con profundidad. Es un fillRect y cambia por
            // completo la lectura de los saltos.
            const niebla = g.createLinearGradient(0, alto * .58, 0, alto);
            niebla.addColorStop(0, 'rgba(196,208,222,0)');
            niebla.addColorStop(.55, 'rgba(186,198,216,.3)');
            niebla.addColorStop(1, 'rgba(158,172,196,.55)');
            g.fillStyle = niebla;
            g.fillRect(0, alto * .58, ancho, alto * .42);
        }

        // Capas 7 y 9 — se llaman DESPUÉS del plano de juego.
        function dibujarFrente(g, camX) {
            // Los rayos otra vez, ahora ENCIMA del mundo y en aditivo.
            // Estampados sólo detrás quedan como un dibujo pegado al
            // fondo; repetidos delante, la luz parece atravesar el aire
            // y pasar por delante de las colinas y del personaje.
            g.save();
            g.globalCompositeOperation = 'lighter';
            g.globalAlpha = .08;
            g.drawImage(capas.rayos, 0, 0);
            g.restore();

            const f = Nucleo.reducido ? 1 : 1.25;
            capaInfinita(g, capas.frente, camX * f, alto - capas.frente.height, ancho, .55);

            // Viñeta CÁLIDA, dorada y suavísima. Nunca oscura: oscurecer
            // las esquinas es justo el gesto que hacía que la versión
            // anterior pareciera un juego de miedo.
            const v = g.createRadialGradient(
                ancho * .5, alto * .45, Math.min(ancho, alto) * .34,
                ancho * .5, alto * .5, Math.max(ancho, alto) * .78);
            v.addColorStop(0, 'rgba(255,244,194,0)');
            v.addColorStop(1, 'rgba(255,196,120,.20)');
            g.fillStyle = v;
            g.fillRect(0, 0, ancho, alto);
        }

        return { cfg, remedir, dibujarFondo, dibujarFrente };
    }

    return { CAPITULOS, crear, capaInfinita, palido };
})();

window.Escenario = Escenario;
