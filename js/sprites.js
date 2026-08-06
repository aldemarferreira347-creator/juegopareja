// ═══════════════════════════════════════════════════════════════
// SPRITES.JS — carga, medición y horneado de los personajes
//
// Los PNG de img/ son ilustraciones de 407×612 con MUCHO margen
// transparente alrededor. Dibujarlos tal cual trae dos problemas:
//
//   1. La caja de colisión no puede ser el rectángulo del PNG — sería
//      enorme y el personaje flotaría sobre el suelo. Hay que medir los
//      píxeles realmente opacos (lo hace medirOpaco).
//   2. Reescalar 407×612 → ~112px de alto en CADA fotograma y por CADA
//      personaje es carísimo. Se hornea una vez a la altura de juego y
//      luego sólo se estampa (drawImage 1:1).
//
// Sobre el ancla horizontal: no se usa el centro de la caja opaca. En
// las poses de carrera el pelo vuela hacia atrás y las piernas se
// abren, así que ese centro queda desplazado y el personaje "bailaría"
// de lado al alternar quieto/corriendo. Se usa el centro del cuarto
// inferior — los pies, que es donde de verdad se apoya la figura.
//
// Sobre la escala: las cuatro imágenes NO se escalan cada una a la
// misma altura. Se calcula la escala desde la pose QUIETA de cada
// personaje y se aplica esa misma a su pose corriendo. Si cada una se
// normalizara a 112px, el personaje se haría más grande al correr
// (porque al inclinarse su caja opaca es más baja) — justo al revés de
// lo que hace un cuerpo real.
// ═══════════════════════════════════════════════════════════════

const Sprites = (function () {
    'use strict';

    // clave → { archivo, personaje, pose }
    const FUENTES = {
        carloQuieto: { archivo: 'img/cquieto.png', personaje: 'carlo', pose: 'quieto' },
        carloCorre: { archivo: 'img/Ccorriendo.png', personaje: 'carlo', pose: 'corre' },
        isaQuieta: { archivo: 'img/iquieta.png', personaje: 'isabela', pose: 'quieto' },
        isaCorre: { archivo: 'img/icorriendo.png', personaje: 'isabela', pose: 'corre' }
    };

    // Qué sprite corresponde a cada personaje y pose.
    const POSES = {
        carlo: { quieto: 'carloQuieto', corre: 'carloCorre' },
        isabela: { quieto: 'isaQuieta', corre: 'isaCorre' }
    };

    const ALFA_MIN = 8;        // por debajo de esto se considera transparente
    const registro = {};       // clave → { img, opaco, ancla, horneado, escala }
    let cargado = false;
    let alturaJuego = 0;

    // ══════════════════════════════════════════════
    // MEDICIÓN — recorre los píxeles buscando los bordes reales
    // ══════════════════════════════════════════════
    function medirOpaco(img) {
        const w = img.naturalWidth, h = img.naturalHeight;
        const lienzo = document.createElement('canvas');
        lienzo.width = w; lienzo.height = h;
        const c = lienzo.getContext('2d', { willReadFrequently: true });
        c.drawImage(img, 0, 0);
        const datos = c.getImageData(0, 0, w, h).data;

        let x0 = w, y0 = h, x1 = -1, y1 = -1;
        for (let y = 0; y < h; y++) {
            const fila = y * w * 4;
            for (let x = 0; x < w; x++) {
                if (datos[fila + x * 4 + 3] <= ALFA_MIN) continue;
                if (x < x0) x0 = x;
                if (x > x1) x1 = x;
                if (y < y0) y0 = y;
                if (y > y1) y1 = y;
            }
        }
        if (x1 < 0) return { x0: 0, y0: 0, x1: w - 1, y1: h - 1, ancho: w, alto: h };
        return { x0, y0, x1, y1, ancho: x1 - x0 + 1, alto: y1 - y0 + 1 };
    }

    // Centro horizontal del cuarto inferior de la figura — los pies.
    // Devuelto como fracción (0..1) dentro de la caja opaca, para que
    // sobreviva a cualquier reescalado posterior.
    function medirAnclaPies(img, opaco) {
        const w = img.naturalWidth;
        const lienzo = document.createElement('canvas');
        lienzo.width = w; lienzo.height = img.naturalHeight;
        const c = lienzo.getContext('2d', { willReadFrequently: true });
        c.drawImage(img, 0, 0);

        const desde = Math.floor(opaco.y1 - opaco.alto * 0.25);
        const datos = c.getImageData(0, desde, w, opaco.y1 - desde + 1).data;

        let min = w, max = -1;
        for (let y = 0; y <= opaco.y1 - desde; y++) {
            const fila = y * w * 4;
            for (let x = 0; x < w; x++) {
                if (datos[fila + x * 4 + 3] <= ALFA_MIN) continue;
                if (x < min) min = x;
                if (x > max) max = x;
            }
        }
        if (max < 0) return 0.5;
        const centro = (min + max) / 2;
        return Nucleo.lim((centro - opaco.x0) / opaco.ancho, 0, 1);
    }

    // ══════════════════════════════════════════════
    // HORNEADO — recorta el margen transparente y reescala una sola vez
    // ══════════════════════════════════════════════
    function hornearUno(entrada, escala) {
        const { img, opaco } = entrada;
        const bw = Math.max(1, Math.round(opaco.ancho * escala));
        const bh = Math.max(1, Math.round(opaco.alto * escala));

        const lienzo = document.createElement('canvas');
        lienzo.width = bw; lienzo.height = bh;
        const c = lienzo.getContext('2d');
        c.imageSmoothingEnabled = true;
        c.imageSmoothingQuality = 'high';
        c.drawImage(img, opaco.x0, opaco.y0, opaco.ancho, opaco.alto, 0, 0, bw, bh);

        // ── Luz de escena, horneada ──
        // Los PNG vienen con iluminación plana de ilustración, así que
        // el personaje se veía recortado y pegado encima del prado, sin
        // pertenecer a él. Con 'source-atop' se tiñe SÓLO lo opaco: cálido
        // arriba (el sol) y frío abajo (el rebote de la sombra). Es lo
        // que integra la figura en la luz del mundo, y como va horneado
        // no cuesta ni un microsegundo por fotograma.
        c.globalCompositeOperation = 'source-atop';
        const luz = c.createLinearGradient(0, 0, 0, bh);
        luz.addColorStop(0, 'rgba(255,238,196,.30)');
        luz.addColorStop(.42, 'rgba(255,232,190,.07)');
        luz.addColorStop(1, 'rgba(122,96,150,.16)');
        c.fillStyle = luz;
        c.fillRect(0, 0, bw, bh);
        c.globalCompositeOperation = 'source-over';

        entrada.horneado = lienzo;
        entrada.escala = escala;
        entrada.ancho = bw;
        entrada.alto = bh;
    }

    // Hornea las cuatro imágenes para una altura de personaje dada.
    // La escala sale de la pose QUIETA y se comparte con la de correr.
    function hornear(alto) {
        if (!cargado) return;
        alturaJuego = alto;
        for (const personaje in POSES) {
            const claveQuieto = POSES[personaje].quieto;
            const escala = alto / registro[claveQuieto].opaco.alto;
            for (const pose in POSES[personaje]) {
                hornearUno(registro[POSES[personaje][pose]], escala);
            }
        }
    }

    // ══════════════════════════════════════════════
    // CARGA
    // ══════════════════════════════════════════════
    function cargar() {
        const promesas = Object.keys(FUENTES).map(clave => new Promise((ok, mal) => {
            const img = new Image();
            img.onload = () => {
                // Si esto se abrió con doble clic (file://) en vez de con un
                // servidor local, getImageData lanza SecurityError por el
                // lienzo "manchado" — y como eso pasa dentro de un callback
                // de evento, no dentro del executor, nunca llegaría a ok()
                // ni a mal(): la promesa se quedaría colgada para siempre y
                // el cargador jamás desaparecería. Por eso el try/catch.
                try {
                    const opaco = medirOpaco(img);
                    registro[clave] = {
                        img, opaco,
                        anclaX: medirAnclaPies(img, opaco),
                        horneado: null, escala: 1, ancho: 0, alto: 0
                    };
                    ok();
                } catch (e) {
                    mal(e);
                }
            };
            img.onerror = () => mal(new Error('No se pudo cargar ' + FUENTES[clave].archivo));
            img.src = FUENTES[clave].archivo;
        }));
        return Promise.all(promesas).then(() => { cargado = true; });
    }

    // ══════════════════════════════════════════════
    // DIBUJO
    //
    // x, y = punto medio de los PIES. Todas las transformaciones giran y
    // escalan alrededor de ese punto, que es lo que hace que el squash al
    // aterrizar aplaste la figura contra el suelo en vez de hundirla.
    // ══════════════════════════════════════════════
    function dibujar(ctx, clave, o) {
        const e = registro[clave];
        if (!e || !e.horneado) return;

        const escalaX = o.escalaX === undefined ? 1 : o.escalaX;
        const escalaY = o.escalaY === undefined ? 1 : o.escalaY;

        ctx.save();
        ctx.translate(o.x, o.y);
        if (o.rotacion) ctx.rotate(o.rotacion);
        if (escalaX !== 1 || escalaY !== 1) ctx.scale(escalaX, escalaY);
        if (o.alpha !== undefined && o.alpha < 1) ctx.globalAlpha *= o.alpha;
        ctx.drawImage(e.horneado, -e.ancho * e.anclaX, -e.alto, e.ancho, e.alto);
        ctx.restore();
    }

    function clavePose(personaje, pose) {
        const p = POSES[personaje];
        return p ? p[pose] : null;
    }

    return {
        cargar, hornear, dibujar, clavePose,
        get listo() { return cargado; },
        get altura() { return alturaJuego; },
        personajes: Object.keys(POSES),
        // Depuración / calibración de niveles.
        medidas(clave) {
            const e = registro[clave];
            if (!e) return null;
            return {
                natural: { ancho: e.img.naturalWidth, alto: e.img.naturalHeight },
                opaco: e.opaco, anclaX: e.anclaX,
                horneado: { ancho: e.ancho, alto: e.alto }, escala: e.escala
            };
        }
    };
})();

window.Sprites = Sprites;
