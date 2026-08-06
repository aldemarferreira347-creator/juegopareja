// ═══════════════════════════════════════════════════════════════
// PERSONAJE.JS — render de los dos jugables a partir de 2 poses
//
// El material son cuatro PNG: quieto y corriendo, por personaje. Dos
// fotogramas NO son un ciclo de animación, y no se van a dibujar más.
// Así que el movimiento se fabrica deformando esas dos imágenes:
//
//   · REBOTE sincronizado a cuerpo.distanciaCaminada, nunca a un reloj.
//     El cuerpo baja en cada pisada, y como la fase sale de la distancia
//     REAL recorrida, la pisada cae siempre en el mismo punto del suelo
//     por rápido o lento que vaya. Con un reloj aparte, el personaje
//     "patinaría" al acelerar — es el error clásico.
//   · SQUASH & STRETCH: estirado al subir, aplastado al aterrizar, con
//     un Muelle para recuperar. Es el 80% de la sensación de peso.
//   · GIRO INTERPOLADO: el flip no es instantáneo. scaleX viaja de 1 a
//     -1 en 90ms, así que el personaje "pivota" en vez de parpadear.
//   · POLVO Y ESTELA emitidos desde los pies.
//
// A velocidad de juego, con el polvo y la estela encima, esto lee como
// carrera. Las piernas no alternan — es la limitación honesta de tener
// dos fotogramas, y la única solución real sería dibujar más.
// ═══════════════════════════════════════════════════════════════

const Personaje = (function () {
    'use strict';

    const ZANCADA = 210;        // px por ciclo completo de piernas
    const REBOTE = 5.5;         // px que baja el cuerpo en cada pisada
    const INCLINA_CARRERA = .035;
    const GIRO_DUR = 0.09;      // s que tarda el flip
    const UMBRAL_MOV = 18;      // px/s por debajo de esto se considera quieto

    // Identidad visual de cada jugable: es lo único que los distingue,
    // porque la física tiene que ser idéntica para que los niveles sean
    // superables con cualquiera de los dos.
    const IDENTIDAD = {
        carlo: { nombre: 'Carlo', estela: '#ffd23f', petalos: false, sello: '🤍' },
        isabela: { nombre: 'Isabela', estela: '#ff9ec4', petalos: true, sello: '💛' }
    };

    function crear(quien) {
        return {
            quien,
            estado: 'quieto',
            giro: 1,              // -1..1, scaleX interpolado
            giroDestino: 1,
            squash: new Nucleo.Muelle(1, 260, 16),
            aterrizajeT: 0,
            estelaAcum: 0
        };
    }

    // ══════════════════════════════════════════════
    // MÁQUINA DE ESTADOS
    // El orden de las comprobaciones es la prioridad: aterrizando pisa a
    // todo lo demás durante su ventana, porque es el fotograma que hay
    // que subrayar.
    // ══════════════════════════════════════════════
    function calcularEstado(est, cuerpo) {
        if (est.aterrizajeT > 0) return 'aterrizando';
        if (cuerpo.planeando) return 'planeando';
        if (!cuerpo.enSuelo) return cuerpo.vy < 0 ? 'subiendo' : 'cayendo';
        return Math.abs(cuerpo.vx) > UMBRAL_MOV ? 'corriendo' : 'quieto';
    }

    function actualizar(est, cuerpo, dt) {
        // ── Aterrizaje: dispara squash, polvo y sacudida ──
        if (cuerpo.impactoCaida > 0) {
            const f = Nucleo.lim(cuerpo.impactoCaida / Fisica.CAIDA_MAX, 0, 1);
            est.squash.v = 1 - 0.20 * (0.35 + f * 0.65);   // aplasta
            est.squash.vel = 0;
            est.squash.destino = 1;
            est.aterrizajeT = 0.13;
            Particulas.polvo(cuerpo.x + cuerpo.ancho / 2, cuerpo.y + cuerpo.alto, f);
            cuerpo.impactoCaida = 0;
        }
        if (est.aterrizajeT > 0) est.aterrizajeT = Math.max(0, est.aterrizajeT - dt);
        est.squash.paso(dt);

        // ── Giro suave ──
        // Normalmente sólo gira si se está moviendo (evita que tiemble al
        // frenar en seco). El compañero quieto es la excepción: nunca se
        // mueve, así que sin `forzarGiro` se quedaría mirando para siempre
        // hacia donde apuntaba al aparecer, ignorando por dónde llega.
        if (Math.abs(cuerpo.vx) > UMBRAL_MOV || cuerpo.forzarGiro) {
            est.giroDestino = cuerpo.mirandoDer ? 1 : -1;
        }
        const paso = (dt / GIRO_DUR) * 2;
        if (est.giro < est.giroDestino) est.giro = Math.min(est.giroDestino, est.giro + paso);
        else if (est.giro > est.giroDestino) est.giro = Math.max(est.giroDestino, est.giro - paso);

        est.estado = calcularEstado(est, cuerpo);

        // ── Estela: una partícula cada tantos px recorridos, no cada
        //    tantos ms. Así la densidad de la estela no depende del
        //    framerate ni se amontona al ir despacio. ──
        const id = IDENTIDAD[est.quien];
        if (Nucleo.nivel > 0 && (est.estado === 'corriendo' || est.estado === 'planeando')) {
            est.estelaAcum += Math.abs(cuerpo.vx) * dt;
            const cada = est.estado === 'planeando' ? 30 : 52;
            while (est.estelaAcum > cada) {
                est.estelaAcum -= cada;
                Particulas.estela(
                    cuerpo.x + cuerpo.ancho / 2 - (cuerpo.mirandoDer ? 22 : -22),
                    cuerpo.y + cuerpo.alto - 18,
                    id.estela, id.petalos);
            }
        } else {
            est.estelaAcum = 0;
        }
    }

    // ══════════════════════════════════════════════
    // DIBUJO
    // ══════════════════════════════════════════════
    function dibujar(g, est, cuerpo, camaraX, camaraY, t) {
        const pieX = cuerpo.x + cuerpo.ancho / 2 - camaraX;
        const pieY = cuerpo.y + cuerpo.alto - camaraY;

        let pose = 'quieto';
        let dy = 0, rot = 0, sx = 1, sy = 1;
        const s = est.squash.v;

        switch (est.estado) {
            case 'corriendo': {
                pose = 'corre';
                const fase = (cuerpo.distanciaCaminada / ZANCADA) * Math.PI * 2;
                // abs(sin) da DOS bajadas por ciclo — una por pisada.
                dy = Math.abs(Math.sin(fase)) * REBOTE;
                rot = Math.sin(fase) * INCLINA_CARRERA;
                sy = 1 + Math.sin(fase * 2) * 0.03;
                sx = 1 - Math.sin(fase * 2) * 0.02;
                break;
            }
            case 'quieto': {
                pose = 'quieto';
                // Respiración: casi imperceptible, pero sin ella el
                // personaje parado parece una calcomanía.
                sy = 1 + Math.sin(t * 1.8) * 0.012;
                break;
            }
            case 'subiendo':
                pose = 'corre'; sy = 1.08; sx = 0.94; rot = -0.08;
                break;
            case 'cayendo':
                pose = 'corre'; sy = 1.05; sx = 0.97; rot = 0.05;
                break;
            case 'aterrizando':
                pose = 'quieto';
                break;
            case 'planeando':
                pose = 'quieto';
                rot = Math.sin(t * 2.6) * 0.06;
                break;
        }

        // El squash del aterrizaje se multiplica encima de todo y
        // conserva el volumen: lo que se pierde de alto se gana de ancho.
        sy *= s;
        sx *= (1 + (1 - s) * 0.7);

        const clave = Sprites.clavePose(est.quien, pose);
        if (!clave) return;

        // ── Sombra en el suelo: ancla la figura al mundo ──
        dibujarSombra(g, cuerpo, pieX, camaraY);

        // ── Vilano de planeo, por detrás del personaje ──
        if (est.estado === 'planeando') dibujarVilano(g, pieX, pieY, t);

        Sprites.dibujar(g, clave, {
            x: pieX,
            y: pieY + dy,
            rotacion: rot * est.giro,
            escalaX: sx * est.giro,
            escalaY: sy
        });
    }

    // La sombra se encoge y se aclara con la altura sobre el suelo. Es
    // barata y hace muchísimo por la legibilidad de los saltos: sin
    // ella, en el aire no se sabe sobre qué se va a caer.
    function dibujarSombra(g, cuerpo, pieX, camaraY) {
        const suelo = cuerpo.sombraY;
        if (suelo === undefined) return;
        const altura = suelo - (cuerpo.y + cuerpo.alto);
        if (altura < -4 || altura > 340) return;
        const k = 1 - Nucleo.lim(altura / 340, 0, 1);
        g.save();
        g.globalAlpha = 0.20 * k;
        g.fillStyle = '#5c9e63';
        g.beginPath();
        g.ellipse(pieX, suelo - camaraY - 2, 30 * (0.45 + k * 0.55), 8 * (0.45 + k * 0.55), 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
    }

    function dibujarVilano(g, pieX, pieY, t) {
        const R = 30;
        const cab = Flora.cabeza('vilano', R, 0);
        const bal = Math.sin(t * 2.6) * 6;
        g.save();
        g.globalAlpha = 0.92;
        g.translate(pieX + bal, pieY - 128);
        g.rotate(Math.sin(t * 2.6) * 0.12);
        g.drawImage(cab, -R, -R, R * 2, R * 2);
        // Hilo del vilano hasta las manos.
        g.strokeStyle = 'rgba(255,255,255,.5)';
        g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(0, R * 0.5); g.lineTo(-bal * 0.5, 40); g.stroke();
        g.restore();
    }

    return { crear, actualizar, dibujar, IDENTIDAD, ZANCADA };
})();

window.Personaje = Personaje;
