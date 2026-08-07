// ═══════════════════════════════════════════════════════════════
// COMPANERO.JS — el personaje que NO se está jugando
//
// Se elige uno de los dos al empezar; el otro no desaparece. En los
// capítulos 1-3 espera al final, mirando hacia quien llega. En el 4
// corre al lado. Ese es el arco entero del juego contado sin una sola
// línea de texto: primero está lejos, al final está al lado.
//
// No usa Fisica: no hace falta simular un cuerpo entero para algo que
// no se controla. Sigue una posición objetivo con un Muelle y se apoya
// en la plataforma que tenga debajo. El Muelle es lo que hace que se
// quede atrás al arrancar y adelante al frenar — un seguimiento rígido
// parecería un remolque, no alguien corriendo contigo.
// ═══════════════════════════════════════════════════════════════

const Companero = (function () {
    'use strict';

    const SEPARACION = 128;    // px por detrás del jugador al correr juntos
    const ALTO_P = Fisica.ALTO_CUERPO;

    function crear(quien, nivel) {
        const cuerpo = {
            x: 0, y: 0, ancho: Fisica.ANCHO_CUERPO, alto: ALTO_P,
            vx: 0, vy: 0,
            enSuelo: true, mirandoDer: false, forzarGiro: false,
            planeando: false, impactoCaida: 0,
            distanciaCaminada: 0,
            sombraY: undefined
        };

        const pos = nivel.companero || nivel.spawn;
        cuerpo.x = pos.x;
        cuerpo.y = pos.y;

        return {
            quien,
            cuerpo,
            arte: Personaje.crear(quien),
            muelle: new Nucleo.Muelle(pos.x, 34, 11),
            acompana: !!nivel.acompana,
            visible: true,
            saludando: false,
            arrebatado: null
        };
    }

    // Distancia se lo lleva: durante `duracion` segundos deja de seguir
    // al jugador y vuela en arco hacia (xf, yf) — la posición del jefe.
    // Sustituye por completo el seguimiento normal mientras dura.
    function arrebatar(comp, xf, yf, duracion) {
        const c = comp.cuerpo;
        comp.arrebatado = { t: 0, duracion: duracion || 1.7, x0: c.x, y0: c.y, xf, yf };
    }

    function soltar(comp) {
        comp.arrebatado = null;
    }

    // Devuelve la Y de la superficie que hay bajo un punto, o null.
    function superficieBajo(nivel, x, desdeY) {
        let mejor = null;
        for (const p of nivel.plataformas) {
            if (x < p.x || x > p.x + p.ancho) continue;
            if (p.y < desdeY - 4) continue;             // por encima: no cuenta
            if (mejor === null || p.y < mejor) mejor = p.y;
        }
        return mejor;
    }

    function actualizar(comp, jugador, nivel, dt) {
        const c = comp.cuerpo;

        if (comp.arrebatado) {
            const r = comp.arrebatado;
            r.t = Math.min(r.duracion, r.t + dt);
            const p = Nucleo.suave(r.t / r.duracion);
            const xAntes = c.x;
            c.x = Nucleo.mezcla(r.x0, r.xf, p);
            // Arco hacia arriba: no se lo arrastra por el suelo, se lo lleva volando.
            c.y = Nucleo.mezcla(r.y0, r.yf, p) - Math.sin(p * Math.PI) * 90;
            c.vx = dt > 0 ? (c.x - xAntes) / dt : 0;
            if (Math.abs(c.vx) > 20) c.mirandoDer = c.vx > 0;
            c.forzarGiro = false;
            c.enSuelo = false;
            c.sombraY = undefined;
            Personaje.actualizar(comp.arte, c, dt);
            return;
        }

        if (comp.acompana) {
            // ── Capítulo 4: corre al lado ──
            // Se coloca por detrás, del lado contrario al que mira el
            // jugador, para no taparlo nunca.
            const detras = jugador.mirandoDer ? -SEPARACION : SEPARACION;
            comp.muelle.destino = jugador.x + detras;
            const xAntes = c.x;
            c.x = comp.muelle.paso(dt);

            const dx = c.x - xAntes;
            c.vx = dt > 0 ? dx / dt : 0;
            if (Math.abs(c.vx) > 20) c.mirandoDer = c.vx > 0;
            c.distanciaCaminada += Math.abs(dx);

            // Se apoya en lo que tenga debajo; si no hay nada, sube al
            // nivel del jugador (así una corriente se los lleva a los dos).
            const sup = superficieBajo(nivel, c.x + c.ancho / 2, jugador.y);
            const objetivoY = (sup !== null ? sup : jugador.y + ALTO_P) - ALTO_P;
            c.y += (objetivoY - c.y) * Math.min(1, 9 * dt);
            c.enSuelo = Math.abs(c.y - objetivoY) < 6;
            c.sombraY = sup !== null ? sup : undefined;

        } else {
            // ── Capítulos 1-3: espera al final, mirando a quien llega ──
            c.vx = 0;
            c.enSuelo = true;
            c.forzarGiro = true;
            c.mirandoDer = jugador.x > c.x;
            const sup = superficieBajo(nivel, c.x + c.ancho / 2, c.y);
            if (sup !== null) c.sombraY = sup;
        }

        Personaje.actualizar(comp.arte, c, dt);
    }

    function dibujar(g, comp, camaraX, camaraY, t) {
        if (!comp.visible) return;
        Personaje.dibujar(g, comp.arte, comp.cuerpo, camaraX, camaraY, t);
    }

    return { crear, actualizar, dibujar, superficieBajo, SEPARACION, arrebatar, soltar };
})();

window.Companero = Companero;
