// ═══════════════════════════════════════════════════════════════
// PARTICULAS.JS — pétalos, polen, polvo, mariposas y destellos
//
// Un solo sistema con un solo array y un techo duro. La razón de que
// sea uno y no cinco: el presupuesto de partículas es global, no por
// tipo. Con sistemas separados, cinco emisores "moderados" suman un
// desastre en un móvil; con uno solo, el techo es el techo.
//
// El techo se recorta por nivel de calidad (Nucleo.nivel):
//   0 → 100 · 1 → 200 · 2 → 300
//
// Cuando está lleno NO se descarta la partícula nueva: se reescribe la
// más vieja. Si se descartara la nueva, el polvo del aterrizaje —que es
// justo el momento que hay que subrayar— desaparecería precisamente
// cuando la pantalla está más ocupada.
// ═══════════════════════════════════════════════════════════════

const Particulas = (function () {
    'use strict';

    const TECHOS = [100, 200, 300];
    const lista = [];
    let siguienteHueco = 0;
    let techo = 300;

    function recalcularTecho() {
        techo = TECHOS[Nucleo.nivel] || 300;
        if (lista.length > techo) lista.length = techo;
        if (siguienteHueco >= techo) siguienteHueco = 0;
    }

    function meter(p) {
        if (lista.length < techo) lista.push(p);
        else { lista[siguienteHueco] = p; siguienteHueco = (siguienteHueco + 1) % techo; }
    }

    const rnd = Nucleo.rnd;

    // ══════════════════════════════════════════════
    // EMISORES
    // ══════════════════════════════════════════════

    // Polvo del aterrizaje. `fuerza` (0..1) viene de la velocidad de
    // caída: dejarse caer desde alto levanta más tierra que bajar un
    // escalón. Es feedback gratis y se lee al instante.
    function polvo(x, y, fuerza) {
        const f = Nucleo.lim(fuerza, 0, 1);
        const n = Math.round(4 + f * 9);
        for (let i = 0; i < n; i++) {
            const lado = i % 2 ? 1 : -1;
            meter({
                tipo: 'polvo', x, y,
                vx: lado * rnd(50, 190) * (0.5 + f), vy: -rnd(20, 90) * (0.5 + f),
                r: rnd(3, 7) * (0.7 + f * 0.6),
                vida: 0, total: rnd(0.32, 0.6),
                gir: 0, vgir: 0
            });
        }
    }

    // Estela del personaje. El color distingue a los dos jugables:
    // Carlo deja polen dorado, Isabela deja pétalos rosados.
    function estela(x, y, color, esPetalo) {
        meter({
            tipo: esPetalo ? 'petalo' : 'polen',
            x: x + rnd(-9, 9), y: y + rnd(-16, 4),
            vx: rnd(-26, 26), vy: -rnd(12, 46),
            r: esPetalo ? rnd(3.5, 6.5) : rnd(1.6, 3.2),
            vida: 0, total: esPetalo ? rnd(1.1, 1.9) : rnd(0.7, 1.3),
            gir: rnd(0, 6.28), vgir: rnd(-3, 3),
            color: color || '#ffd23f'
        });
    }

    // Pétalos del viento ambiente: nacen fuera del borde y cruzan.
    function petaloAmbiente(camaraX, W, H) {
        meter({
            tipo: 'petalo',
            x: camaraX + rnd(-60, W + 60), y: rnd(-40, H * 0.7),
            vx: rnd(18, 62), vy: rnd(14, 40),
            r: rnd(4, 8),
            vida: 0, total: rnd(4, 8),
            gir: rnd(0, 6.28), vgir: rnd(-1.6, 1.6),
            color: Math.random() < 0.55 ? '#ffd23f' : '#ff9ec4'
        });
    }

    // Destello al recoger una semilla.
    function destello(x, y, color) {
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            meter({
                tipo: 'destello', x, y,
                vx: Math.cos(a) * rnd(110, 230), vy: Math.sin(a) * rnd(110, 230),
                r: rnd(2.5, 5),
                vida: 0, total: rnd(0.3, 0.55),
                gir: 0, vgir: 0,
                color: color || '#fff4c2'
            });
        }
    }

    // Mariposas: no son partículas de física, son bichos. Vuelan en
    // zigzag suave y viven mucho, así que se emiten poquísimas.
    function mariposa(x, y) {
        meter({
            tipo: 'mariposa', x, y,
            vx: rnd(28, 62), vy: 0,
            r: rnd(5, 8),
            vida: 0, total: rnd(9, 16),
            gir: rnd(0, 6.28), vgir: rnd(2.4, 4.2),
            base: y, amp: rnd(16, 40), fase: rnd(0, 6.28),
            color: Math.random() < 0.6 ? '#fff0a8' : '#ffd9e2'
        });
    }

    // ══════════════════════════════════════════════
    // ACTUALIZACIÓN
    // ══════════════════════════════════════════════
    const GRAVEDAD_POLVO = 420;
    const GRAVEDAD_PETALO = 26;

    function actualizar(dt, t) {
        for (let i = lista.length - 1; i >= 0; i--) {
            const p = lista[i];
            p.vida += dt;
            if (p.vida >= p.total) { lista.splice(i, 1); if (siguienteHueco > i) siguienteHueco--; continue; }

            if (p.tipo === 'mariposa') {
                p.x += p.vx * dt;
                p.y = p.base + Math.sin(t * 2.1 + p.fase) * p.amp;
                p.gir += p.vgir * dt;
                continue;
            }

            if (p.tipo === 'polvo') {
                p.vy += GRAVEDAD_POLVO * dt;
                p.vx *= (1 - 2.6 * dt);
            } else if (p.tipo === 'petalo') {
                p.vy += GRAVEDAD_PETALO * dt;
                p.vx += Math.sin(t * 1.7 + p.gir) * 34 * dt;   // revoloteo
            } else if (p.tipo === 'destello') {
                p.vx *= (1 - 3.4 * dt);
                p.vy *= (1 - 3.4 * dt);
            } else { // polen
                p.vy -= 14 * dt;                                // el polen sube
                p.vx += Math.sin(t * 2.3 + p.gir) * 12 * dt;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.gir += p.vgir * dt;
        }
    }

    // ══════════════════════════════════════════════
    // DIBUJO
    // ══════════════════════════════════════════════
    function dibujar(g, camaraX, camaraY, W) {
        const izq = camaraX - 40, der = camaraX + W + 40;
        for (let i = 0; i < lista.length; i++) {
            const p = lista[i];
            if (p.x < izq || p.x > der) continue;

            const k = p.vida / p.total;
            const x = p.x - camaraX, y = p.y - camaraY;

            if (p.tipo === 'polvo') {
                // Se desvanece y crece: lee como polvo levantándose.
                g.globalAlpha = (1 - k) * 0.42;
                g.fillStyle = '#fff3e0';
                g.beginPath(); g.arc(x, y, p.r * (1 + k * 1.4), 0, Math.PI * 2); g.fill();

            } else if (p.tipo === 'petalo') {
                // Entra y sale con una curva suave, nunca de golpe.
                g.globalAlpha = Math.min(1, (1 - k) * 2.2) * 0.85;
                g.fillStyle = p.color;
                g.save();
                g.translate(x, y);
                g.rotate(p.gir);
                // El "escorzo" (achatar según el giro) es lo que hace que
                // el pétalo parezca girar en 3D con un solo dibujo 2D.
                g.scale(1, Math.abs(Math.cos(p.gir * 0.8)) * 0.7 + 0.3);
                g.beginPath();
                g.ellipse(0, 0, p.r, p.r * 0.56, 0, 0, Math.PI * 2);
                g.fill();
                g.restore();

            } else if (p.tipo === 'destello') {
                g.globalAlpha = (1 - k);
                g.fillStyle = p.color;
                g.beginPath(); g.arc(x, y, p.r * (1 - k * 0.5), 0, Math.PI * 2); g.fill();

            } else if (p.tipo === 'mariposa') {
                const bat = Math.sin(p.gir * 6) * 0.7 + 0.3;   // aleteo
                g.globalAlpha = Math.min(1, (1 - k) * 4) * 0.9;
                g.fillStyle = p.color;
                g.save();
                g.translate(x, y);
                for (const lado of [-1, 1]) {
                    g.save();
                    g.scale(lado * bat, 1);
                    g.beginPath();
                    g.ellipse(p.r * 0.6, -p.r * 0.15, p.r * 0.62, p.r * 0.44, -0.3, 0, Math.PI * 2);
                    g.fill();
                    g.restore();
                }
                g.restore();

            } else { // polen
                g.globalAlpha = (1 - k) * 0.7;
                g.fillStyle = p.color;
                g.beginPath(); g.arc(x, y, p.r, 0, Math.PI * 2); g.fill();
            }
        }
        g.globalAlpha = 1;
    }

    function limpiar() { lista.length = 0; siguienteHueco = 0; }

    recalcularTecho();

    return {
        polvo, estela, petaloAmbiente, destello, mariposa,
        actualizar, dibujar, limpiar, recalcularTecho,
        get contador() { return lista.length; },
        get techo() { return techo; }
    };
})();

window.Particulas = Particulas;
