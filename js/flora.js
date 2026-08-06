// ═══════════════════════════════════════════════════════════════
// FLORA.JS — el motor de flores del juego
//
// Técnica trasplantada de js/flores-amarillas.js del regalo principal:
// la cabeza de cada flor se dibuja UNA vez en un canvas pequeño y luego
// sólo se estampa con drawImage. Dibujar pétalos con arc() y bezier()
// en cada fotograma, por cada una de las ~200 flores en pantalla, es lo
// que hunde el framerate; estampar un canvas ya hecho no cuesta nada.
//
// Aquí las flores hacen dos trabajos distintos:
//
//   · CAMPOS DE FONDO — cientos de flores que nunca cambian. Se hornean
//     en tiras de 1024px que después se repiten en bucle. Cero coste por
//     fotograma más allá de tres drawImage.
//   · FLORES VIVAS — las que brotan detrás del personaje al pasar. Estas
//     sí se actualizan: nacen con un Muelle en la escala para que salgan
//     con un rebotito, y se mecen con el viento compartido.
//
// El viento es una sola función global: todas las flores del mundo la
// consumen con su propia x y profundidad, así que el prado entero se
// mece a la vez en lugar de parecer doscientas flores independientes.
// Es la diferencia entre "hay flores" y "hay un prado".
//
// ⚠️ Ni un girasol. En ninguna especie, en ningún campo, en ningún
// tamaño. Es requisito explícito del regalo.
// ═══════════════════════════════════════════════════════════════

const Flora = (function () {
    'use strict';

    const TECHO_VIVAS = 220;   // flores brotadas simultáneas; más allá se reciclan
    const ANCHO_TIRA = 1024;   // px por tira horneada de campo

    // ══════════════════════════════════════════════
    // Aleatorio sembrado — misma semilla, mismo campo siempre.
    // Sin esto, cada redimensionado de ventana reorganizaría el prado
    // entero delante del jugador.
    // ══════════════════════════════════════════════
    function sembrar(semilla) {
        let a = semilla >>> 0;
        return function () {
            a += 0x6D2B79F5;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // ══════════════════════════════════════════════
    // VIENTO — compartido por todo lo que se mece
    // prof: 0 = lejos (se mueve poco) · 1 = cerca (se mueve mucho)
    // ══════════════════════════════════════════════
    function viento(t, x, prof) {
        const base = Math.sin(t * 0.6 + x * 0.004);
        const rafaga = Math.sin(t * 1.31 + x * 0.011) * 0.35;
        return (base + rafaga) * (0.4 + (prof === undefined ? 0.6 : prof) * 0.6);
    }

    // ══════════════════════════════════════════════
    // PALETA — amarillos del prado (A2 del plan)
    // ══════════════════════════════════════════════
    const AMARILLOS = [
        { claro: '#ffe98a', medio: '#ffd23f', centro: '#f5a623' },
        { claro: '#fff0a8', medio: '#ffdb5e', centro: '#e8971c' },
        { claro: '#ffe37a', medio: '#fbc72e', centro: '#d98b18' }
    ];
    const VERDES = { tallo: '#7fbf7a', talloOsc: '#5c9e63', hoja: '#8fcb86' };

    // ══════════════════════════════════════════════
    // CABEZAS HORNEADAS — una por especie × variante × radio
    // ══════════════════════════════════════════════
    const cacheCabezas = new Map();

    function lienzoCabeza(radio) {
        const d = Math.ceil(radio * 2) + 2;
        const c = document.createElement('canvas');
        c.width = d; c.height = d;
        return c;
    }

    // ── Margarita amarilla: la flor base del prado ──
    //
    // ⚠️ Esta función es la que más cerca estuvo de arruinar el encargo.
    // La primera versión tenía 13 pétalos anchos y un centro de 0.32·R
    // en naranja oscuro — y a tamaño grande eso NO es una margarita, es
    // un girasol de manual. Lo comprobé mirando una captura del juego.
    // Lo que separa una cosa de la otra: el centro tiene que ser pequeño
    // y claro, y los pétalos, muchos y finos.
    function hornearMargarita(R, col) {
        const c = lienzoCabeza(R), g = c.getContext('2d');
        const m = c.width / 2;
        g.translate(m, m);
        const petalos = 17;
        for (let i = 0; i < petalos; i++) {
            const a = (i / petalos) * Math.PI * 2;
            g.save();
            g.rotate(a);
            const grad = g.createLinearGradient(0, 0, 0, -R);
            grad.addColorStop(0, col.medio);
            grad.addColorStop(1, col.claro);
            g.fillStyle = grad;
            g.beginPath();
            g.ellipse(0, -R * 0.62, R * 0.098, R * 0.4, 0, 0, Math.PI * 2);
            g.fill();
            g.restore();
        }
        const gc = g.createRadialGradient(-R * .05, -R * .05, R * .02, 0, 0, R * .2);
        gc.addColorStop(0, '#fff6d0');
        gc.addColorStop(1, col.medio);
        g.fillStyle = gc;
        g.beginPath(); g.arc(0, 0, R * 0.19, 0, Math.PI * 2); g.fill();
        return c;
    }

    // ── Ranúnculo: capas concéntricas, para primer plano ──
    function hornearRanunculo(R, col) {
        const c = lienzoCabeza(R), g = c.getContext('2d');
        const m = c.width / 2;
        g.translate(m, m);
        // El corazón va CLARO, no ámbar. Con el centro oscuro la flor
        // dejaba de leerse como un ranúnculo —una rosa apretada— y
        // volvía a parecer un girasol pequeño en cuanto se dibujaba
        // chica, que es como sale en el arco del portal.
        const capas = [
            { r: 1.0, n: 9, tono: col.medio },
            { r: 0.72, n: 8, tono: col.claro },
            { r: 0.48, n: 7, tono: col.medio },
            { r: 0.26, n: 5, tono: col.claro }
        ];
        for (const capa of capas) {
            const rr = R * capa.r;
            for (let i = 0; i < capa.n; i++) {
                const a = (i / capa.n) * Math.PI * 2 + capa.r * 3.1;
                g.save();
                g.rotate(a);
                g.fillStyle = capa.tono;
                g.beginPath();
                g.ellipse(0, -rr * 0.52, rr * 0.42, rr * 0.5, 0, 0, Math.PI * 2);
                g.fill();
                g.restore();
            }
        }
        return c;
    }

    // ── Tulipán: copa cerrada, rompe la horizontal del prado ──
    function hornearTulipan(R, col) {
        const c = lienzoCabeza(R), g = c.getContext('2d');
        const m = c.width / 2;
        g.translate(m, m);
        const grad = g.createLinearGradient(0, -R, 0, R * .8);
        grad.addColorStop(0, col.claro);
        grad.addColorStop(1, col.centro);
        g.fillStyle = grad;
        // Tres lóbulos: el central al frente, dos laterales detrás.
        for (const d of [-1, 1]) {
            g.beginPath();
            g.moveTo(0, R * .78);
            g.quadraticCurveTo(d * R * .92, R * .1, d * R * .5, -R * .86);
            g.quadraticCurveTo(d * R * .2, -R * .3, 0, R * .78);
            g.fill();
        }
        g.beginPath();
        g.moveTo(0, R * .82);
        g.quadraticCurveTo(-R * .58, R * .05, 0, -R * .95);
        g.quadraticCurveTo(R * .58, R * .05, 0, R * .82);
        g.fill();
        return c;
    }

    // ── Mimosa: racimo de pompones, para las copas del fondo ──
    function hornearMimosa(R, col) {
        const c = lienzoCabeza(R), g = c.getContext('2d');
        const m = c.width / 2;
        g.translate(m, m);
        const r = sembrar(7717);
        for (let i = 0; i < 26; i++) {
            const a = r() * Math.PI * 2;
            const d = Math.sqrt(r()) * R * 0.82;
            const rr = R * (0.13 + r() * 0.11);
            const gg = g.createRadialGradient(
                Math.cos(a) * d - rr * .3, Math.sin(a) * d - rr * .3, rr * .1,
                Math.cos(a) * d, Math.sin(a) * d, rr);
            gg.addColorStop(0, col.claro);
            gg.addColorStop(1, col.medio);
            g.fillStyle = gg;
            g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, rr, 0, Math.PI * 2); g.fill();
        }
        return c;
    }

    // ── Campanilla: campana vista de lado ──
    //
    // ⚠️ La versión anterior era un disco de seis pétalos con un centro
    // de 0.4·R — o sea, un girasol pequeño, que es justo lo único que
    // este juego no puede tener. Y como en el primer plano se dibuja a
    // R≈28, cantaba muchísimo.
    // Una campanilla de verdad no se ve de frente: es un tubo estrecho
    // que se abre hacia arriba en una corola de lóbulos. De perfil no se
    // parece a un girasol a ningún tamaño, y además su silueta vertical
    // rompe la horizontal del prado.
    function hornearCampanilla(R, col) {
        const c = lienzoCabeza(R), g = c.getContext('2d');
        const m = c.width / 2;
        g.translate(m, m);

        const grad = g.createLinearGradient(0, -R, 0, R * .9);
        grad.addColorStop(0, col.claro);
        grad.addColorStop(.6, col.medio);
        grad.addColorStop(1, col.centro);
        g.fillStyle = grad;

        const bordeY = -R * .68, radio = R * .88, LOB = 5;
        g.beginPath();
        g.moveTo(-R * .15, R * .88);
        g.bezierCurveTo(-R * .3, R * .12, -radio, -R * .2, -radio, bordeY);
        for (let i = 0; i < LOB; i++) {
            const x0 = -radio + i * (radio * 2 / LOB);
            const x1 = -radio + (i + 1) * (radio * 2 / LOB);
            g.quadraticCurveTo((x0 + x1) / 2, bordeY - R * .34, x1, bordeY);
        }
        g.bezierCurveTo(radio, -R * .2, R * .3, R * .12, R * .15, R * .88);
        g.closePath();
        g.fill();

        // Boca en sombra: sin esto la campana parece maciza y plana.
        g.fillStyle = 'rgba(190,120,20,.3)';
        g.beginPath();
        g.ellipse(0, bordeY + R * .06, radio * .82, R * .17, 0, 0, Math.PI * 2);
        g.fill();

        // Filo iluminado del borde
        g.strokeStyle = 'rgba(255,250,220,.6)';
        g.lineWidth = Math.max(1, R * .05);
        g.beginPath();
        g.ellipse(0, bordeY + R * .04, radio * .84, R * .18, 0, Math.PI, Math.PI * 2);
        g.stroke();
        return c;
    }

    // ── Vilano de diente de león: es la MECÁNICA de planeo hecha objeto ──
    function hornearVilano(R) {
        const c = lienzoCabeza(R), g = c.getContext('2d');
        const m = c.width / 2;
        g.translate(m, m);
        g.strokeStyle = 'rgba(255,255,255,.72)';
        g.lineWidth = Math.max(1, R * 0.045);
        g.lineCap = 'round';
        const n = 34;
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const l = R * (0.72 + (i % 3) * 0.09);
            g.beginPath();
            g.moveTo(Math.cos(a) * R * 0.14, Math.sin(a) * R * 0.14);
            g.lineTo(Math.cos(a) * l, Math.sin(a) * l);
            g.stroke();
            g.fillStyle = 'rgba(255,255,255,.85)';
            g.beginPath(); g.arc(Math.cos(a) * l, Math.sin(a) * l, R * 0.05, 0, Math.PI * 2); g.fill();
        }
        g.fillStyle = 'rgba(255,246,214,.9)';
        g.beginPath(); g.arc(0, 0, R * 0.13, 0, Math.PI * 2); g.fill();
        return c;
    }

    const ESPECIES = {
        margarita: { hornear: hornearMargarita, tallo: [46, 78], radio: [9, 14], prof: 1 },
        ranunculo: { hornear: hornearRanunculo, tallo: [38, 62], radio: [11, 16], prof: 1 },
        tulipan: { hornear: hornearTulipan, tallo: [70, 105], radio: [12, 17], prof: 1 },
        mimosa: { hornear: hornearMimosa, tallo: [30, 50], radio: [14, 22], prof: .6 },
        campanilla: { hornear: hornearCampanilla, tallo: [52, 80], radio: [12, 18], prof: 1 },
        vilano: { hornear: (R) => hornearVilano(R), tallo: [58, 92], radio: [13, 19], prof: 1 }
    };

    // Redondear el radio evita hornear 40 variantes casi idénticas.
    function cabeza(especie, radio, variante) {
        const R = Math.round(radio);
        const clave = especie + '|' + R + '|' + variante;
        let c = cacheCabezas.get(clave);
        if (!c) {
            c = ESPECIES[especie].hornear(R, AMARILLOS[variante % AMARILLOS.length]);
            cacheCabezas.set(clave, c);
        }
        return c;
    }

    // ══════════════════════════════════════════════
    // TALLO Y HOJAS — se dibujan por flor viva (las de fondo van
    // horneadas dentro de su tira, así que esto sólo corre ~200 veces)
    // ══════════════════════════════════════════════
    function dibujarTallo(g, x, baseY, alto, inclinacion, grosor) {
        const puntaX = x + inclinacion;
        const grad = g.createLinearGradient(x, baseY, puntaX, baseY - alto);
        grad.addColorStop(0, VERDES.talloOsc);
        grad.addColorStop(1, VERDES.tallo);
        g.strokeStyle = grad;
        g.lineWidth = grosor;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(x, baseY);
        g.quadraticCurveTo(x + inclinacion * 0.35, baseY - alto * 0.55, puntaX, baseY - alto);
        g.stroke();
    }

    function dibujarHoja(g, x, y, lado, largo, apertura) {
        g.fillStyle = VERDES.hoja;
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + lado * largo * 0.6, y - largo * 0.34 * apertura, x + lado * largo, y);
        g.quadraticCurveTo(x + lado * largo * 0.6, y + largo * 0.16 * apertura, x, y);
        g.fill();
    }

    // ══════════════════════════════════════════════
    // FLORES VIVAS — las que brotan al paso del personaje
    // ══════════════════════════════════════════════
    const vivas = [];
    let siguienteHueco = 0;

    function plantar(x, sueloY, especie, opciones) {
        const o = opciones || {};
        const esp = ESPECIES[especie] || ESPECIES.margarita;
        const r = Math.random();

        const flor = {
            x, sueloY, especie,
            alto: esp.tallo[0] + r * (esp.tallo[1] - esp.tallo[0]),
            radio: esp.radio[0] + Math.random() * (esp.radio[1] - esp.radio[0]),
            variante: (Math.random() * AMARILLOS.length) | 0,
            prof: esp.prof,
            inclina: (Math.random() - 0.5) * 0.5,
            grosor: 2 + Math.random() * 1.6,
            // El Muelle es lo que hace que la flor SALTE al brotar en vez
            // de aparecer. Es el gesto que vende toda la mecánica.
            escala: new Nucleo.Muelle(0, 210, 15),
            hojas: Math.random() < 0.6
        };
        flor.escala.destino = o.escala || 1;

        // Buffer circular: pasado el techo se reescribe la flor más
        // antigua. No hay splice ni realojo — el coste es constante.
        if (vivas.length < TECHO_VIVAS) vivas.push(flor);
        else { vivas[siguienteHueco] = flor; siguienteHueco = (siguienteHueco + 1) % TECHO_VIVAS; }
        return flor;
    }

    function actualizar(dt) {
        for (let i = 0; i < vivas.length; i++) vivas[i].escala.paso(dt);
    }

    function dibujarVivas(g, camaraX, camaraY, W, t) {
        const izq = camaraX - 80, der = camaraX + W + 80;
        for (let i = 0; i < vivas.length; i++) {
            const f = vivas[i];
            if (f.x < izq || f.x > der) continue;      // recorte: fuera de pantalla no se paga
            const e = f.escala.v;
            if (e <= 0.01) continue;

            const x = f.x - camaraX;
            const baseY = f.sueloY - camaraY;
            const alto = f.alto * e;
            const v = viento(t, f.x, f.prof);
            const incl = f.inclina * alto * 0.3 + v * alto * 0.14;

            dibujarTallo(g, x, baseY, alto, incl, f.grosor * e);
            if (f.hojas && e > 0.45) {
                const ha = (e - 0.45) / 0.55;
                dibujarHoja(g, x + incl * 0.42, baseY - alto * 0.42, f.inclina > 0 ? -1 : 1, 15 * e, ha);
            }

            const cab = cabeza(f.especie, f.radio, f.variante);
            const s = f.radio * e;
            g.save();
            g.translate(x + incl, baseY - alto);
            g.rotate(v * 0.09);
            g.drawImage(cab, -s, -s, s * 2, s * 2);
            g.restore();
        }
    }

    function limpiar() { vivas.length = 0; siguienteHueco = 0; }

    // ══════════════════════════════════════════════
    // TIRAS DE CAMPO — el prado de fondo, horneado y repetido
    //
    // Una tira es un trozo de campo de ANCHO_TIRA px con sus flores ya
    // dibujadas. En el bucle sólo se estampan tres o cuatro copias
    // desplazadas. Es la única forma de tener cientos de flores al fondo
    // sin pagarlas.
    // ══════════════════════════════════════════════
    function tiraCampo(opciones) {
        const o = opciones || {};
        const alto = o.alto || 170;
        const densidad = o.densidad || 26;
        const especies = o.especies || ['margarita'];
        const escala = o.escala || 1;
        const r = sembrar(o.semilla || 1234);

        const c = document.createElement('canvas');
        c.width = ANCHO_TIRA; c.height = alto;
        const g = c.getContext('2d');

        // Se dibujan de "lejos" a "cerca" (de arriba abajo) para que las
        // de delante tapen a las de detrás.
        const flores = [];
        for (let i = 0; i < densidad; i++) {
            flores.push({
                x: r() * ANCHO_TIRA,
                y: alto * (0.25 + r() * 0.72),
                especie: especies[(r() * especies.length) | 0],
                variante: (r() * AMARILLOS.length) | 0,
                s: (0.62 + r() * 0.58) * escala,
                incl: (r() - 0.5) * 16
            });
        }
        flores.sort((a, b) => a.y - b.y);

        for (const f of flores) {
            const esp = ESPECIES[f.especie];
            const altoTallo = (esp.tallo[0] + esp.tallo[1]) / 2 * f.s;
            const radio = (esp.radio[0] + esp.radio[1]) / 2 * f.s;
            dibujarTallo(g, f.x, f.y, altoTallo, f.incl, 2.1 * f.s);
            const cab = cabeza(f.especie, radio, f.variante);
            g.drawImage(cab, f.x + f.incl - radio, f.y - altoTallo - radio, radio * 2, radio * 2);
        }
        return c;
    }

    return {
        ANCHO_TIRA, ESPECIES, AMARILLOS, VERDES,
        viento, sembrar, cabeza, tiraCampo,
        plantar, actualizar, dibujarVivas, limpiar,
        get contadorVivas() { return vivas.length; }
    };
})();

window.Flora = Flora;
