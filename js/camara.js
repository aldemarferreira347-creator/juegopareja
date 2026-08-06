// ═══════════════════════════════════════════════════════════════
// CAMARA.JS — seguimiento con muelle, look-ahead y sacudida
//
// Estaba metida dentro de juego.js y se le habían pegado tres
// responsabilidades. Aquí sola queda clara: convierte "dónde está el
// jugador" en "qué trozo del mundo se ve", y nada más.
//
// Tres cosas la hacen sentirse bien:
//
//  · MUELLE en vez de interpolación lineal. Un lerp siempre reinicia su
//    recorrido; el muelle arranca desde su velocidad actual, así que si
//    el jugador cambia de rumbo a mitad de camino la cámara se dobla en
//    lugar de dar un tirón. Eso es lo que da sensación de peso.
//  · LOOK-AHEAD: la cámara se adelanta en la dirección de la marcha, así
//    se ve a dónde se va y no de dónde se viene. Es lo que evita que un
//    hueco aparezca de sorpresa bajo los pies.
//  · SUELO PEGAJOSO en vertical: seguir la Y del jugador en cada salto
//    marearía. La cámara sólo persigue en vertical cuando el jugador se
//    aleja de verdad (capítulo 3, el ascenso), no en un salto normal.
// ═══════════════════════════════════════════════════════════════

const Camara = (function () {
    'use strict';

    const ADELANTO_MAX = 190;       // px que la cámara se adelanta a tope de velocidad
    const ZONA_MUERTA_Y = 120;      // px de salto vertical que NO mueven la cámara
    const SACUDIDA_MAX = 3.4;       // px — micro, nunca un temblor de terremoto
    const SACUDIDA_DUR = 0.13;      // s

    function crear() {
        return {
            x: new Nucleo.Muelle(0, 55, 14),
            y: new Nucleo.Muelle(0, 42, 13),
            sacudida: 0,
            sacudidaT: 0,
            despX: 0, despY: 0,   // desplazamiento final ya aplicado
            W: 0, H: 0
        };
    }

    function medir(cam, W, H) { cam.W = W; cam.H = H; }

    // Coloca la cámara de golpe, sin animación. Para cargar capítulo.
    function fijar(cam, cuerpo, nivel) {
        const objetivo = calcularObjetivo(cam, cuerpo, nivel);
        cam.x.fijar(objetivo.x);
        cam.y.fijar(objetivo.y);
        cam.sacudida = 0; cam.sacudidaT = 0;
        cam.despX = objetivo.x; cam.despY = objetivo.y;
    }

    function calcularObjetivo(cam, cuerpo, nivel) {
        const cx = cuerpo.x + cuerpo.ancho / 2;
        const adelanto = (cuerpo.vx / Fisica.VELOCIDAD_MAX) * ADELANTO_MAX;

        let x = cx + adelanto - cam.W / 2;
        // El nivel manda: nunca se ve más allá de sus bordes.
        const maxX = Math.max(0, nivel.ancho - cam.W);
        x = Nucleo.lim(x, 0, maxX);

        // Vertical con zona muerta: el objetivo sólo se mueve si el
        // jugador sale de una banda central.
        const cy = cuerpo.y + cuerpo.alto / 2;
        const centro = cam.y.destino + cam.H / 2;
        let y = cam.y.destino;
        if (cy < centro - ZONA_MUERTA_Y) y = cy + ZONA_MUERTA_Y - cam.H / 2;
        else if (cy > centro + ZONA_MUERTA_Y) y = cy - ZONA_MUERTA_Y - cam.H / 2;

        const techo = nivel.limiteArriba === undefined ? -cam.H : nivel.limiteArriba;
        const suelo = nivel.limiteAbajo === undefined ? 0 : nivel.limiteAbajo;
        y = Nucleo.lim(y, techo, suelo);

        return { x, y };
    }

    function sacudir(cam, fuerza) {
        if (Nucleo.reducido) return;   // accesibilidad: la sacudida se anula entera
        const f = Nucleo.lim(fuerza, 0, 1);
        if (f < 0.25) return;          // los saltitos no sacuden nada
        cam.sacudida = Math.max(cam.sacudida, f * SACUDIDA_MAX);
        cam.sacudidaT = SACUDIDA_DUR;
    }

    function actualizar(cam, cuerpo, nivel, dt) {
        const objetivo = calcularObjetivo(cam, cuerpo, nivel);
        cam.x.destino = objetivo.x;
        cam.y.destino = objetivo.y;
        cam.x.paso(dt);
        cam.y.paso(dt);

        let sx = 0, sy = 0;
        if (cam.sacudidaT > 0) {
            cam.sacudidaT = Math.max(0, cam.sacudidaT - dt);
            const k = cam.sacudidaT / SACUDIDA_DUR;
            const a = cam.sacudida * k;
            sx = (Math.random() - 0.5) * 2 * a;
            sy = (Math.random() - 0.5) * 2 * a;
            if (cam.sacudidaT === 0) cam.sacudida = 0;
        }

        cam.despX = cam.x.v + sx;
        cam.despY = cam.y.v + sy;
    }

    return { crear, medir, fijar, actualizar, sacudir, ADELANTO_MAX };
})();

window.Camara = Camara;
