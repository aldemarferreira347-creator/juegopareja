// ═══════════════════════════════════════════════════════════════
// META.JS — los corazones y el portal de flores
//
// Esto es lo que faltaba y lo que hacía el juego imposible de terminar:
// antes el final de cada capítulo era un rectángulo INVISIBLE en el
// suelo. Al pisarlo salía un subtítulo y nada más. No había meta que
// mirar, ni objetivo que cumplir, ni forma de saber que habías llegado.
//
// Ahora cada capítulo tiene:
//
//   · CORAZONES — repartidos por el nivel, y hay que recogerlos TODOS.
//     Son el objetivo, no un extra. Están colocados en sitios que
//     obligan a usar el verbo del capítulo (saltar, planear, subir en
//     una corriente), así que recogerlos ES la dificultad.
//
//   · PORTAL — un arco de flores al final, bien visible desde lejos.
//     Nace marchito y se va abriendo con cada corazón: la propia meta
//     hace de marcador de progreso. Cuando están todos, florece entero,
//     se enciende y deja pasar.
//
// Un portal cerrado no bloquea físicamente (no hay muro invisible, eso
// se siente roto): deja pasar por delante, simplemente no completa el
// capítulo, y lo dice con un subtítulo en vez de callarse.
// ═══════════════════════════════════════════════════════════════

const Meta = (function () {
    'use strict';

    // ══════════════════════════════════════════════
    // CORAZÓN — horneado una vez por tamaño
    // ══════════════════════════════════════════════
    const cacheCorazon = new Map();

    function trazarCorazon(g, R) {
        // Curva clásica de corazón: dos lóbulos arriba y punta abajo.
        g.beginPath();
        g.moveTo(0, R * 0.72);
        g.bezierCurveTo(-R * 1.32, -R * 0.22, -R * 0.56, -R * 1.12, 0, -R * 0.42);
        g.bezierCurveTo(R * 0.56, -R * 1.12, R * 1.32, -R * 0.22, 0, R * 0.72);
        g.closePath();
    }

    function hornearCorazon(R) {
        const clave = Math.round(R);
        let c = cacheCorazon.get(clave);
        if (c) return c;

        const d = Math.ceil(R * 2.9);
        c = document.createElement('canvas');
        c.width = d; c.height = d;
        const g = c.getContext('2d');
        g.translate(d / 2, d / 2);

        trazarCorazon(g, R);
        const grad = g.createLinearGradient(0, -R, 0, R);
        grad.addColorStop(0, '#ffd9e6');
        grad.addColorStop(.45, '#ff7fb0');
        grad.addColorStop(1, '#e8477f');
        g.fillStyle = grad;
        g.fill();

        // Filo claro arriba y brillo especular: sin esto el corazón es
        // una mancha rosa plana y no se lee como objeto.
        g.strokeStyle = 'rgba(255,255,255,.75)';
        g.lineWidth = Math.max(1.2, R * 0.09);
        g.stroke();

        g.fillStyle = 'rgba(255,255,255,.72)';
        g.beginPath();
        g.ellipse(-R * .38, -R * .38, R * .2, R * .13, -0.6, 0, Math.PI * 2);
        g.fill();

        cacheCorazon.set(clave, c);
        return c;
    }

    // Dibuja un corazón suelto del nivel, con halo y flotación.
    function dibujarCorazon(g, x, y, t, semilla) {
        const R = 17;
        const bob = Math.sin(t * 1.9 + semilla) * 6;
        const pulso = 1 + Math.sin(t * 3.1 + semilla) * 0.07;

        g.save();
        g.translate(x, y + bob);

        const halo = g.createRadialGradient(0, 0, 0, 0, 0, R * 3);
        halo.addColorStop(0, 'rgba(255,150,195,.42)');
        halo.addColorStop(1, 'rgba(255,150,195,0)');
        g.fillStyle = halo;
        g.beginPath(); g.arc(0, 0, R * 3, 0, Math.PI * 2); g.fill();

        g.rotate(Math.sin(t * 1.2 + semilla) * 0.1);
        g.scale(pulso, pulso);
        const s = hornearCorazon(R);
        g.drawImage(s, -s.width / 2, -s.height / 2);
        g.restore();
    }

    // ══════════════════════════════════════════════
    // CORAZÓN ROTO — el peligro del mapa
    // Una discusión, un mal momento — no es un monstruo, es un corazón
    // partido por la mitad. Tocarlo cuesta una vida, nunca el juego: la
    // misma regla de oro de siempre, sólo que ahora sí hay algo que
    // perder por el camino.
    // ══════════════════════════════════════════════
    const cacheCorazonRoto = new Map();

    function hornearCorazonRoto(R) {
        const clave = Math.round(R);
        let c = cacheCorazonRoto.get(clave);
        if (c) return c;

        const d = Math.ceil(R * 2.9);
        c = document.createElement('canvas');
        c.width = d; c.height = d;
        const g = c.getContext('2d');
        g.translate(d / 2, d / 2);

        trazarCorazon(g, R);
        const grad = g.createLinearGradient(0, -R, 0, R);
        grad.addColorStop(0, '#c9b6bd');
        grad.addColorStop(.5, '#8d6b78');
        grad.addColorStop(1, '#5c4450');
        g.fillStyle = grad;
        g.fill();

        g.strokeStyle = 'rgba(40,28,34,.5)';
        g.lineWidth = Math.max(1.2, R * 0.09);
        g.stroke();

        // La grieta: un rayo quebrado de arriba a abajo. Es lo único
        // que hace falta para que se lea "roto" y no "corazón oscuro".
        g.save();
        g.clip();
        g.strokeStyle = 'rgba(20,12,16,.75)';
        g.lineWidth = Math.max(1.4, R * 0.11);
        g.beginPath();
        g.moveTo(-R * 0.12, -R * 0.5);
        g.lineTo(R * 0.1, -R * 0.05);
        g.lineTo(-R * 0.14, R * 0.28);
        g.lineTo(R * 0.08, R * 0.7);
        g.stroke();
        g.restore();

        cacheCorazonRoto.set(clave, c);
        return c;
    }

    // Dibuja un corazón roto suelto en el nivel: late más despacio y sin
    // halo cálido — un aviso, no una recompensa.
    function dibujarCorazonRoto(g, x, y, t, semilla) {
        const R = 17;
        const bob = Math.sin(t * 1.3 + semilla) * 5;
        const pulso = 1 + Math.sin(t * 2.1 + semilla) * 0.05;

        g.save();
        g.translate(x, y + bob);

        const halo = g.createRadialGradient(0, 0, 0, 0, 0, R * 2.4);
        halo.addColorStop(0, 'rgba(90,60,72,.28)');
        halo.addColorStop(1, 'rgba(90,60,72,0)');
        g.fillStyle = halo;
        g.beginPath(); g.arc(0, 0, R * 2.4, 0, Math.PI * 2); g.fill();

        g.rotate(Math.sin(t * 0.9 + semilla) * 0.08);
        g.scale(pulso, pulso);
        const s = hornearCorazonRoto(R);
        g.drawImage(s, -s.width / 2, -s.height / 2);
        g.restore();
    }

    // ══════════════════════════════════════════════
    // PORTAL — arco de flores
    //
    // `abierto` es 0..1: cuántos corazones se llevan. Las enredaderas
    // crecen, las flores se abren y la luz de dentro sube con ese
    // número, así que el portal ES el marcador de progreso.
    // ══════════════════════════════════════════════
    function dibujarPortal(g, portal, abierto, t, especies) {
        const x = portal.x, y = portal.y, w = portal.ancho, h = portal.alto;
        const cx = x + w / 2;
        const baseY = y + h;
        const k = Nucleo.lim(abierto, 0, 1);

        // ── Luz de dentro (crece con el progreso) ──
        const luz = g.createRadialGradient(cx, baseY - h * .45, 0, cx, baseY - h * .45, w * .78);
        const brillo = .1 + k * .55;
        luz.addColorStop(0, `rgba(255,246,206,${brillo})`);
        luz.addColorStop(.55, `rgba(255,214,120,${brillo * .45})`);
        luz.addColorStop(1, 'rgba(255,214,120,0)');
        g.fillStyle = luz;
        g.beginPath(); g.arc(cx, baseY - h * .45, w * .78, 0, Math.PI * 2); g.fill();

        // ── Arco: dos jambas y una bóveda ──
        const anchoJamba = 15;
        const altoJamba = h * .58;
        const rArco = w / 2;

        g.save();
        g.lineCap = 'round';
        g.lineJoin = 'round';

        // Enredadera. El grosor crece un poco al abrirse: el portal
        // "engorda" de vida conforme se completa.
        g.strokeStyle = k > .999 ? '#6fae62' : '#8a9c74';
        g.lineWidth = anchoJamba * (.8 + k * .35);

        g.beginPath();
        g.moveTo(x + anchoJamba / 2, baseY);
        g.lineTo(x + anchoJamba / 2, baseY - altoJamba);
        g.arc(cx, baseY - altoJamba, rArco - anchoJamba / 2, Math.PI, 0);
        g.lineTo(x + w - anchoJamba / 2, baseY);
        g.stroke();

        // ── Flores del arco ──
        // Se reparten por todo el recorrido de la enredadera y se abren
        // en orden: primero las de abajo, luego las de la bóveda. Así se
        // ve LLENARSE, no simplemente encenderse.
        const total = 16;
        const abiertas = k * total;
        for (let i = 0; i < total; i++) {
            const p = i / (total - 1);
            let px, py;
            if (p < .28) {                       // jamba izquierda
                px = x + anchoJamba / 2;
                py = baseY - (p / .28) * altoJamba;
            } else if (p > .72) {                // jamba derecha
                px = x + w - anchoJamba / 2;
                py = baseY - ((1 - p) / .28) * altoJamba;
            } else {                              // bóveda
                const a = Math.PI * (1 - (p - .28) / .44);
                px = cx + Math.cos(a) * (rArco - anchoJamba / 2);
                py = baseY - altoJamba - Math.sin(a) * (rArco - anchoJamba / 2);
            }

            const crece = Nucleo.lim(abiertas - i, 0, 1);
            const R = 7 + crece * 8;
            if (crece <= 0.02) {
                // Capullo cerrado: se ve que ahí VA a haber una flor.
                g.fillStyle = 'rgba(150,170,135,.85)';
                g.beginPath(); g.arc(px, py, 4.5, 0, Math.PI * 2); g.fill();
                continue;
            }
            const esp = especies[i % especies.length];
            const cab = Flora.cabeza(esp, R, i % 3);
            const bal = Math.sin(t * 1.4 + i) * 0.12;
            g.save();
            g.translate(px, py);
            g.rotate(bal);
            g.drawImage(cab, -R, -R, R * 2, R * 2);
            g.restore();
        }
        g.restore();

        // ── Cuando está completo: destellos subiendo por el vano ──
        if (k > .999) {
            for (let i = 0; i < 7; i++) {
                const f = (t * .32 + i / 7) % 1;
                const px = cx + Math.sin(t * 1.1 + i * 2.3) * w * .3;
                const py = baseY - f * h * .9;
                g.globalAlpha = Math.sin(f * Math.PI) * .8;
                g.fillStyle = i % 2 ? '#fff4c2' : '#ffb3d0';
                g.beginPath(); g.arc(px, py, 3.4, 0, Math.PI * 2); g.fill();
            }
            g.globalAlpha = 1;
        }
    }

    return {
        dibujarCorazon, dibujarPortal, hornearCorazon, trazarCorazon,
        dibujarCorazonRoto, hornearCorazonRoto
    };
})();

window.Meta = Meta;
