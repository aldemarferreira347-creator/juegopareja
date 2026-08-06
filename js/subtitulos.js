// ═══════════════════════════════════════════════════════════════
// SUBTITULOS.JS — la barra inferior tipo cine
//
// No pausa el juego: es un rótulo que aparece encima mientras se sigue
// jugando, como en la mayoría de plataformas narrativos. Si dos líneas
// se disparan a la vez (un checkpoint justo cuando termina un diálogo),
// se encolan — nunca se pisan.
//
// El tecleo usa Nucleo.grafemas() para no partir emojis compuestos a
// la mitad. Con prefers-reduced-motion, o en nivel de calidad 0, el
// texto aparece completo de una vez.
//
// Avanzar: tocar/hacer clic en cualquier parte de la pantalla, o pulsar
// espacio (el mismo botón de saltar — juego.js reenvía ese flanco aquí
// cada frame). La primera pulsación completa el tecleo si seguía
// escribiendo; la siguiente pasa a la próxima línea.
// ═══════════════════════════════════════════════════════════════

const Subtitulos = (function () {
    'use strict';

    const elBarra = document.getElementById('subtitulos');
    const elTexto = document.getElementById('subtitulos-texto');
    const elSigue = document.getElementById('subtitulos-sigue');
    const elLector = document.getElementById('subtitulos-lector');

    const VELOCIDAD_TECLEO = 26;    // ms por grafema
    const TIEMPO_MIN_VISIBLE = 900; // ms — evita saltarse una línea por un toque accidental

    // ── Auto-avance ──
    // Sin esto el juego se COLGABA: juego.js espera a que no quede nada
    // que leer para pasar de capítulo, y las líneas sólo avanzaban al
    // tocar la pantalla. Quien no supiera que hay que tocar se quedaba
    // parado para siempre, sin que nada se lo dijera. Ahora la línea se
    // va sola cuando ha dado tiempo de leerla; tocar sigue sirviendo
    // para adelantarla.
    const LECTURA_BASE = 2400;      // ms fijos por línea (antes 1500 — muy corto para leer corriendo)
    const LECTURA_POR_LETRA = 72;   // ms extra por cada carácter visible (antes 55)
    const LECTURA_MAX = 10000;      // techo más alto para frases muy largas

    const cola = [];
    let actual = null;         // { texto, completo }
    let idIntervalo = null;
    let idAuto = null;
    let mostradaDesde = 0;

    function cancelarAuto() {
        if (idAuto) { clearTimeout(idAuto); idAuto = null; }
    }

    function textoListo() {
        if (!actual) return;
        actual.completo = true;
        if (idIntervalo) { clearInterval(idIntervalo); idIntervalo = null; }
        elSigue.classList.add('visible');

        cancelarAuto();
        const espera = Math.min(LECTURA_MAX,
            LECTURA_BASE + actual.texto.length * LECTURA_POR_LETRA);
        idAuto = setTimeout(() => { idAuto = null; siguiente(); }, espera);
    }

    function empezarLinea(item) {
        actual = { texto: item.texto, completo: false };
        mostradaDesde = performance.now();
        elLector.textContent = item.texto;
        elBarra.classList.add('visible');
        elBarra.setAttribute('aria-hidden', 'false');
        elSigue.classList.remove('visible');

        if (Nucleo.nivel === 0 || Nucleo.reducido) {
            elTexto.textContent = item.texto;
            textoListo();
            return;
        }

        elTexto.textContent = '';
        const graf = Nucleo.grafemas(item.texto);
        let i = 0;
        idIntervalo = setInterval(() => {
            elTexto.textContent += graf[i];
            i++;
            if (i >= graf.length) textoListo();
        }, VELOCIDAD_TECLEO);
    }

    function ocultar() {
        actual = null;
        cancelarAuto();
        elBarra.classList.remove('visible');
        elBarra.setAttribute('aria-hidden', 'true');
    }

    function siguiente() {
        if (!cola.length) { ocultar(); return; }
        empezarLinea(cola.shift());
    }

    // ══════════════════════════════════════════════
    // API
    // ══════════════════════════════════════════════

    // opciones.prioridad: 'ahora' salta al frente de la cola (para la
    // línea de checkpoint, que debe leerse antes que cualquier otra
    // cosa pendiente); por defecto se encola al final.
    function mostrar(texto, opciones) {
        // Guardia: nunca mostrar undefined, null ni cadenas vacías
        if (texto === undefined || texto === null || String(texto).trim() === '') return;
        const o = opciones || {};
        const item = { texto: String(texto) };
        if (o.prioridad === 'ahora') cola.unshift(item);
        else cola.push(item);
        if (!actual) siguiente();
    }

    function avanzar() {
        if (!actual) return;
        if (!actual.completo) { textoListo(); return; }
        if (performance.now() - mostradaDesde < TIEMPO_MIN_VISIBLE) return;
        siguiente();
    }

    function hablando() { return actual !== null; }

    function vaciar() {
        cola.length = 0;
        if (idIntervalo) { clearInterval(idIntervalo); idIntervalo = null; }
        ocultar();
    }

    // Cuántas líneas quedan por leer, contando la que está en pantalla.
    // juego.js la usa para no soltar un aviso encima de otro.
    function pendientes() { return cola.length + (actual ? 1 : 0); }

    // Tocar o hacer clic avanza el diálogo activo — PERO sólo en la
    // mitad derecha de la pantalla. La mitad izquierda es el joystick
    // táctil de entrada.js; si el texto avanzara también ahí, cualquier
    // paso de movimiento saltaría la frase antes de que se pudiera leer.
    // En escritorio (puntero de ratón) no hay zona táctil de movimiento,
    // así que se trata como «derecha» siempre.
    window.addEventListener('pointerdown', (e) => {
        if (!actual) return;
        // pointerType 'mouse' o 'pen': sin restricción de zona
        if (e.pointerType !== 'touch') { avanzar(); return; }
        // Táctil: sólo mitad derecha (zona de salto = zona de avance)
        if (e.clientX > window.innerWidth / 2) avanzar();
    }, { passive: true });

    return { mostrar, avanzar, hablando, vaciar, pendientes };
})();

window.Subtitulos = Subtitulos;
