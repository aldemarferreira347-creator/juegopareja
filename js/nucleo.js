// ═══════════════════════════════════════════════════════════════
// NUCLEO.JS — primitivas compartidas del juego
//
// Extraído de fx-engine.js del regalo principal: sólo lo que un juego
// de plataformas necesita (Muelle para la cámara, grafemas para los
// subtítulos, utilidades numéricas y detección de calidad). El resto de
// fx-engine.js son módulos DOM (tilt, magnético, cursor…) que no aplican
// aquí — el juego tiene su propio bucle y su propio render en canvas.
// ═══════════════════════════════════════════════════════════════

const Nucleo = (function () {
    'use strict';

    // ══════════════════════════════════════════════
    // UTILIDADES NUMÉRICAS
    // ══════════════════════════════════════════════
    const lim = (v, a, b) => v < a ? a : v > b ? b : v;
    const mezcla = (a, b, t) => a + (b - a) * t;
    const suave = t => { t = lim(t, 0, 1); return t * t * (3 - 2 * t); };
    const rnd = (a, b) => a + Math.random() * (b - a);

    // ══════════════════════════════════════════════
    // MUELLE — física de resorte (idéntico a fx-engine.js)
    // Se usa para la cámara: arranca desde su velocidad actual, así que
    // si el jugador cambia de rumbo a mitad de camino el seguimiento se
    // dobla en vez de reiniciarse. Eso es lo que da la sensación de peso.
    // ══════════════════════════════════════════════
    function Muelle(inicial, rigidez, amortiguacion) {
        this.v = inicial || 0;
        this.destino = this.v;
        this.vel = 0;
        this.k = rigidez || 170;
        this.c = amortiguacion || 22;
    }
    const H_MAX = 1 / 120;
    const SUBPASOS_MAX = 8;

    Muelle.prototype.paso = function (dt) {
        if (!(dt > 0)) return this.v;
        if (dt > 0.1) dt = 0.1;
        let n = Math.ceil(dt / H_MAX);
        if (n > SUBPASOS_MAX) n = SUBPASOS_MAX;
        const h = dt / n;
        for (let i = 0; i < n; i++) {
            const a = this.k * (this.destino - this.v) - this.c * this.vel;
            this.vel += a * h;
            this.v += this.vel * h;
        }
        return this.v;
    };
    Muelle.prototype.quieto = function (eps) {
        const e = eps || 0.0005;
        return Math.abs(this.vel) < e && Math.abs(this.destino - this.v) < e;
    };
    Muelle.prototype.fijar = function (v) { this.v = this.destino = v; this.vel = 0; };

    // ══════════════════════════════════════════════
    // GRAFEMAS — divide texto en caracteres visibles de verdad.
    // "❣️" y "👩‍👧" son UN carácter aunque ocupen varios code points;
    // partirlos por índice los rompe. Lo usan los subtítulos.
    // ══════════════════════════════════════════════
    function grafemas(txt) {
        if (typeof Intl !== 'undefined' && Intl.Segmenter) {
            const seg = new Intl.Segmenter('es', { granularity: 'grapheme' });
            return Array.from(seg.segment(txt), s => s.segment);
        }
        return Array.from(txt);
    }

    // ══════════════════════════════════════════════
    // CALIDAD — mismo criterio que fx-engine.js, aplicado al juego.
    // Nivel 0 = quieto (sin partículas, sin parallax fino, subtítulos sin
    // tecleo) · 1 = sobrio · 2 = completo.
    // ══════════════════════════════════════════════
    const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    function nivelForzado() {
        const p = new URLSearchParams(location.search).get('fx');
        if (p === null) return null;
        const n = parseInt(p, 10);
        return (n === 0 || n === 1 || n === 2) ? n : null;
    }

    function calcularNivel() {
        const forzado = nivelForzado();
        if (forzado !== null) return forzado;
        if (mqReduce.matches) return 0;
        const nucleos = navigator.hardwareConcurrency || 4;
        const memoria = navigator.deviceMemory || 4;
        if (nucleos <= 4 || memoria <= 2 || window.innerWidth < 480) return 1;
        return 2;
    }

    return {
        lim, mezcla, suave, rnd,
        Muelle, grafemas,
        get nivel() { return calcularNivel(); },
        get reducido() { return mqReduce.matches; }
    };
})();

window.Nucleo = Nucleo;
