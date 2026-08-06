// ═══════════════════════════════════════════════════════════════
// SFX.JS — efectos de sonido sintetizados con Web Audio
// Sin archivos: todo son osciladores. Misma técnica que
// 1agosto/js/sfx.js, con el vocabulario propio de este juego.
// ═══════════════════════════════════════════════════════════════

const Sfx = (function () {
    'use strict';

    let ctx = null;
    let activo = true;

    // El AudioContext sólo puede arrancar dentro de un gesto real del
    // usuario (clic/tap) — se llama desde el botón de inicio del menú.
    function init() {
        if (!ctx) {
            try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
            catch (e) { /* sin audio, no pasa nada */ }
        }
        if (ctx && ctx.state === 'suspended') ctx.resume();
    }

    function setActivo(v) { activo = v; }

    function tono(freq, opciones) {
        if (!ctx || !activo) return;
        const o = Object.assign({ dur: .2, tipo: 'sine', vol: .09, delay: 0, hasta: null }, opciones);
        const t = ctx.currentTime + o.delay;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = o.tipo;
        osc.frequency.setValueAtTime(freq, t);
        if (o.hasta) osc.frequency.exponentialRampToValueAtTime(o.hasta, t + o.dur);
        g.gain.setValueAtTime(o.vol, t);
        g.gain.exponentialRampToValueAtTime(.0004, t + o.dur);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + o.dur + .03);
    }

    // ══════════════════════════════════════════════
    // VOCABULARIO DEL JUEGO
    // Todo en escala mayor y con volúmenes bajos: el juego es un regalo,
    // no un arcade. Ningún sonido puede sobresaltar.
    // ══════════════════════════════════════════════
    const salto = () => tono(520, { tipo: 'triangle', dur: .14, hasta: 780, vol: .07 });

    // La intensidad (0..1) la manda fisica.js con la velocidad de caída:
    // bajar un escalón y caer desde arriba no pueden sonar igual.
    const aterrizar = (fuerza) => {
        const f = fuerza === undefined ? .5 : Math.max(0, Math.min(1, fuerza));
        tono(180 - f * 50, { tipo: 'sine', dur: .09 + f * .06, hasta: 80, vol: .035 + f * .045 });
    };

    // Planeo: soplo suave y agudo, el vilano abriéndose.
    const planear = () => tono(1180, { tipo: 'sine', dur: .3, hasta: 1560, vol: .035 });

    // Corriente: una subida larga, para que se oiga que te está elevando.
    const corriente = () => {
        tono(420, { tipo: 'sine', dur: .5, hasta: 1240, vol: .05 });
        tono(630, { tipo: 'triangle', dur: .45, hasta: 1560, delay: .05, vol: .03 });
    };

    // Recoger un corazón: dos notas que suben, como un latido contento.
    const corazon = () => {
        tono(784, { dur: .14, vol: .07 });
        tono(1175, { dur: .2, delay: .07, vol: .06 });
    };
    const semilla = corazon;   // alias, por si queda alguna llamada vieja

    // Llegar al portal sin haberlo completado. Tiene que sonar a "aún
    // no", nunca a error: dos notas graves y suaves, sin disonancia.
    const cerrado = () => {
        tono(392, { tipo: 'sine', dur: .18, vol: .05 });
        tono(330, { tipo: 'sine', dur: .26, delay: .1, vol: .045 });
    };

    // Se recogieron TODAS: el prado estalla. El único sonido con acorde.
    const florecer = () => {
        [523, 659, 784, 988, 1318].forEach((f, i) => tono(f, { dur: .5, delay: i * .07, vol: .055 }));
    };

    // Tocar un corazón roto: dos notas que bajan, un desacuerdo breve.
    // Nunca un golpe, nunca un error — sólo un "ay" pequeño.
    const discusion = () => {
        tono(370, { tipo: 'sine', dur: .22, hasta: 260, vol: .05 });
        tono(300, { tipo: 'sine', dur: .3, delay: .12, hasta: 220, vol: .045 });
    };

    const checkpoint = () => { tono(659, { dur: .12, vol: .06 }); tono(988, { dur: .18, delay: .07, vol: .05 }); };
    const capitulo = () => {
        [523, 659, 784].forEach((f, i) => tono(f, { dur: .2, delay: i * .09, vol: .06 }));
    };
    const reaparicion = () => tono(300, { tipo: 'sine', dur: .18, hasta: 420, vol: .05 });
    const fanfarria = () => {
        [523, 659, 784, 1046].forEach((f, i) => tono(f, { dur: .24, delay: i * .11, vol: .08 }));
        tono(1318, { dur: .55, delay: .46, vol: .07 });
    };

    return {
        init, setActivo,
        salto, aterrizar, planear, corriente,
        corazon, semilla, cerrado, florecer, discusion,
        checkpoint, capitulo, reaparicion, fanfarria
    };
})();

window.Sfx = Sfx;
