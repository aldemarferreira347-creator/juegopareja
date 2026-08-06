// ═══════════════════════════════════════════════════════════════
// FISICA.JS — paso fijo, colisión AABB, coyote time + jump buffer,
//             planeo con vilano y corrientes ascendentes
//
// Por qué paso fijo: si la física avanzara con el dt variable del
// frame, un salto se sentiría distinto en un móvil a 45fps que en un
// portátil a 144fps, y al caer rápido un frame lento podría saltarse
// una plataforma entera (tunneling). juego.js acumula tiempo real y
// llama actualizarJugador() en pasos de PASO_FIJO exactos; el render
// interpola entre el estado anterior y el actual para que se vea fluido
// aunque la física corra a una cadencia distinta de la pantalla.
//
// Coyote time y jump buffer no son "trucos": son lo que hace que saltar
// se sienta justo. Sin ellos, perder el salto por 2 fotogramas de
// diferencia se siente como un error del juego, no del jugador.
//
// ── ESCALA ──────────────────────────────────────────────────────
// El personaje pasó de una silueta de 62px a un sprite de 112px, un
// factor k = 1.8. Para conservar EXACTAMENTE la misma sensación hay que
// escalar longitudes, velocidades y aceleraciones por k, y NO tocar los
// tiempos (coyote y buffer siguen en 0.10 y 0.12 s). Así los tiempos de
// vuelo son idénticos a los de antes y sólo cambia la talla del mundo.
//
// Cifras que salen de estas constantes y que MANDAN sobre el diseño de
// niveles (niveles.js no puede contradecirlas):
//
//   altura de salto  = FUERZA_SALTO² / (2·GRAVEDAD)   ≈ 170 px
//   tiempo de vuelo  = 2·FUERZA_SALTO / GRAVEDAD      ≈ 0.51 s
//   alcance a tope   = VELOCIDAD_MAX · tiempo         ≈ 220 px
//   alcance planeando ≈ 220 + VELOCIDAD_MAX·1.1       ≈ 690 px
//
// Regla: ningún hueco pasa del 60% del alcance (≤132px) si no hay
// planeo disponible, y ninguna subida pasa del 55% de la altura
// (≤93px) en un solo salto. El margen siempre gana sobre la precisión:
// esto es un regalo, no un reto.
// ═══════════════════════════════════════════════════════════════

const Fisica = (function () {
    'use strict';

    const PASO_FIJO = 1 / 120;

    // ── Por qué estos números y no los anteriores ──
    // La primera versión iba a 612 px/s y saltaba 280 px. Con un
    // personaje de 112 px eso son 5,5 alturas de cuerpo por segundo
    // (velocidad de esprint, no de paseo) y un salto de dos veces y
    // media su propia estatura. Se sentía descontrolado y flotante: el
    // personaje llegaba al borde antes de que te diera tiempo a leer el
    // terreno, y cada salto duraba tanto que el mando parecía no
    // responder.
    //
    // Ahora: 430 px/s (unas 3,8 alturas por segundo) y salto de 170 px,
    // vez y media su estatura — la proporción habitual en un plataformas
    // que se siente sólido. Y la gravedad sube a 5200 para que la caída
    // sea más franca y el salto no se quede colgado en el aire.
    const GRAVEDAD = 5200;           // px/s²
    const CAIDA_MAX = 2000;          // px/s — velocidad terminal, evita tunneling
    const VELOCIDAD_MAX = 430;       // px/s en horizontal
    const ACELERACION_SUELO = 3400;  // px/s²
    const ACELERACION_AIRE = 1900;   // px/s² — un poco menos de control en el aire
    const FRICCION_SUELO = 3200;     // px/s² al soltar, en el suelo
    const FRICCION_AIRE = 700;

    const FUERZA_SALTO = 1330;       // px/s, velocidad inicial hacia arriba
    const CORTE_SALTO = -380;        // al soltar antes de tiempo, vy no baja de esto
    const COYOTE_TIEMPO = 0.1;       // s — tiempo, NO se escala
    const BUFFER_TIEMPO = 0.12;      // s — tiempo, NO se escala

    // ── Planeo con vilano de diente de león ──
    // Mantener el salto mientras se cae abre un vilano que frena la
    // caída. No se limita de golpe: se frena con PLANEO_FRENO para que
    // el vilano parezca que "agarra" el aire en vez de teletransportar
    // la velocidad. Se recarga entero al tocar suelo.
    // PLANEO_MAX estaba en 300 px/s y era casi la mitad de una caída
    // libre: el vilano apenas frenaba. Medido, el planeo cubría 325 px
    // frente a los 220 de un salto normal — sólo 100 px más, así que un
    // hueco diseñado para "sólo se cruza planeando" quedaba a 45 px de
    // margen y se fallaba constantemente.
    //
    // A 170 px/s el descenso de 170 px dura un segundo entero, y en ese
    // segundo se recorren 430 px: el alcance planeando pasa a ~540 px.
    // Ahora la diferencia entre saltar y planear es evidente, y además
    // se parece por fin a lo que es — un vilano bajando, no una piedra.
    const PLANEO_MAX = 170;          // px/s — caída máxima planeando
    // ⚠️ PLANEO_FRENO tiene que ser MUY superior a GRAVEDAD (5200).
    // Estuvo en 4200, por debajo de la gravedad, y el resultado fue que
    // el planeo no frenaba NADA: cada paso la gravedad sumaba 5200 y el
    // vilano restaba 4200, así que la caída se aceleraba igual y nunca
    // alcanzaba el tope de 170. Medido en el capítulo 2, el personaje
    // caía a 830 px/s con el vilano abierto y se estrellaba contra el
    // canto de la isla siguiente en vez de posarse encima.
    // Lo que importa es la diferencia, no el valor: 14000 deja 8800
    // netos y el vilano "agarra" el aire en dos décimas.
    const PLANEO_FRENO = 14000;      // px/s² de frenado al abrir el vilano
    const PLANEO_DURACION = 1.4;     // s de planeo por salto

    // ── Corrientes ascendentes de pétalos ──
    // Zonas que empujan hacia arriba mientras se está dentro. El jugador
    // sólo controla el horizontal: subir es automático, para que el
    // capítulo 3 se sienta como dejarse llevar y no como pelear.
    // OJO con este número: la corriente compite contra la gravedad, que
    // ya vale 4680. Estaba en 5200 y la fuerza NETA era de sólo 520
    // px/s² — la columna tardaba más de un segundo en alcanzar su
    // velocidad de subida y el jugador salía por arriba a media altura.
    // Lo que importa es la diferencia, no el valor absoluto: 11000 deja
    // 6320 netos y la subida arranca en menos de una décima.
    const CORRIENTE_FUERZA = 11000;  // px/s²
    const CORRIENTE_VY_MAX = -460;   // px/s — tope de subida
    // Dentro de una corriente NO se puede esprintar. Sin esto el juego
    // se rompe: a 612 px/s se cruza una columna de 260 px en 0.42 s, y
    // en ese tiempo el aire sólo alcanza a levantar ~60 px de los 560
    // que hacen falta — se sale por el lado antes de subir. Medido: el
    // jugador salía a 63 px de altura y volvía a caer, una y otra vez.
    // Frenar el horizontal lo mantiene dentro el tiempo necesario y
    // además se lee bien: el aire te sostiene, no te deja correr.
    const CORRIENTE_VEL_MAX = 170;   // px/s
    const CORRIENTE_FRENO = 2600;    // px/s² para bajar a esa velocidad

    // El ancho NO es el del sprite. Medido con sprites.js, la figura de
    // pie ocupa ~21 px a esta escala y la de carrera ~68 (piernas
    // abiertas). Una caja de 54 dejaría al personaje parándose a 16 px
    // de cada borde —se vería flotar junto a las paredes—; una de 21
    // sería tan fina que caería por cualquier rendija. 36 es el punto
    // donde la silueta parada casi llena la caja y el borde se pisa de
    // verdad.
    const ANCHO_CUERPO = 36;
    const ALTO_CUERPO = 112;

    function crearCuerpo(x, y) {
        return {
            x, y, ancho: ANCHO_CUERPO, alto: ALTO_CUERPO,
            vx: 0, vy: 0,
            enSuelo: false,
            mirandoDer: true,
            coyoteRestante: 0,
            bufferRestante: 0,
            saltando: false,
            planeando: false,
            planeoRestante: PLANEO_DURACION,
            enCorriente: false,
            impactoCaida: 0,        // vy del último aterrizaje — lo usa el squash
            distanciaCaminada: 0    // la usa personaje.js para el rebote de carrera
        };
    }

    function solapan(a, b) {
        return a.x < b.x + b.ancho && a.x + a.ancho > b.x &&
            a.y < b.y + b.alto && a.y + a.alto > b.y;
    }

    // Resuelve colisiones contra plataformas SOLO en un eje: se llama una
    // vez tras mover en X y otra tras mover en Y, así el personaje no se
    // "engancha" en la esquina de una plataforma al tocarla en diagonal.
    function resolverEje(cuerpo, plataformas, eje) {
        for (const p of plataformas) {
            if (!solapan(cuerpo, p)) continue;
            if (eje === 'x') {
                if (cuerpo.vx > 0) cuerpo.x = p.x - cuerpo.ancho;
                else if (cuerpo.vx < 0) cuerpo.x = p.x + p.ancho;
                cuerpo.vx = 0;
            } else {
                if (cuerpo.vy > 0) { cuerpo.y = p.y - cuerpo.alto; cuerpo.enSuelo = true; cuerpo.saltando = false; }
                else if (cuerpo.vy < 0) { cuerpo.y = p.y + p.alto; }
                cuerpo.vy = 0;
            }
        }
    }

    function dentroDeCorriente(cuerpo, corrientes) {
        if (!corrientes) return false;
        for (const c of corrientes) if (solapan(cuerpo, c)) return true;
        return false;
    }

    // nivel: { plataformas, corrientes? }
    function actualizarJugador(cuerpo, nivel, dt, entrada, sfx) {
        entrada = entrada || Entrada;
        const plataformas = nivel.plataformas;
        const dir = entrada.direccion;

        // La corriente se detecta ANTES del bloque horizontal: es quien
        // decide la velocidad máxima de este paso.
        const enCorrienteAntes = cuerpo.enCorriente;
        cuerpo.enCorriente = dentroDeCorriente(cuerpo, nivel.corrientes);

        // ── Horizontal ──
        const tope = cuerpo.enCorriente ? CORRIENTE_VEL_MAX : VELOCIDAD_MAX;
        // Al entrar corriendo hay que frenar de verdad, no sólo bajar el
        // tope: si no, se conservaría la velocidad de entrada y se
        // saldría por el otro lado igual de rápido.
        if (Math.abs(cuerpo.vx) > tope) {
            const signo = cuerpo.vx > 0 ? 1 : -1;
            cuerpo.vx = signo * Math.max(tope, Math.abs(cuerpo.vx) - CORRIENTE_FRENO * dt);
        }
        const objetivo = dir * tope;
        const acel = cuerpo.enSuelo ? ACELERACION_SUELO : ACELERACION_AIRE;
        const fric = cuerpo.enSuelo ? FRICCION_SUELO : FRICCION_AIRE;
        if (dir !== 0) {
            const paso = acel * dt;
            cuerpo.vx = cuerpo.vx < objetivo
                ? Math.min(cuerpo.vx + paso, objetivo)
                : Math.max(cuerpo.vx - paso, objetivo);
            cuerpo.mirandoDer = dir > 0;
        } else {
            const paso = fric * dt;
            cuerpo.vx = cuerpo.vx > 0 ? Math.max(0, cuerpo.vx - paso) : Math.min(0, cuerpo.vx + paso);
        }

        // ── Coyote time y jump buffer ──
        if (cuerpo.enSuelo) {
            cuerpo.coyoteRestante = COYOTE_TIEMPO;
            cuerpo.planeoRestante = PLANEO_DURACION;
        } else {
            cuerpo.coyoteRestante = Math.max(0, cuerpo.coyoteRestante - dt);
        }

        if (entrada.saltoPulsado) cuerpo.bufferRestante = BUFFER_TIEMPO;
        else cuerpo.bufferRestante = Math.max(0, cuerpo.bufferRestante - dt);

        if (cuerpo.bufferRestante > 0 && cuerpo.coyoteRestante > 0) {
            cuerpo.vy = -FUERZA_SALTO;
            cuerpo.enSuelo = false;
            cuerpo.saltando = true;
            cuerpo.bufferRestante = 0;
            cuerpo.coyoteRestante = 0;
            if (sfx && sfx.salto) sfx.salto();
        }

        // ── Salto variable: soltar antes recorta la altura ──
        if (entrada.saltoSoltado && cuerpo.vy < CORTE_SALTO) {
            cuerpo.vy = CORTE_SALTO;
        }

        // ── Gravedad ──
        cuerpo.vy = Math.min(CAIDA_MAX, cuerpo.vy + GRAVEDAD * dt);

        // ── Corriente ascendente ──
        // Va antes que el planeo: dentro de una corriente el vilano no
        // aporta nada y tenerlo abierto sería sólo ruido visual.
        if (cuerpo.enCorriente) {
            cuerpo.vy = Math.max(CORRIENTE_VY_MAX, cuerpo.vy - CORRIENTE_FUERZA * dt);
            cuerpo.planeando = false;
            if (!enCorrienteAntes && sfx && sfx.corriente) sfx.corriente();
        } else {
            // ── Planeo ──
            const quierePlanear = !cuerpo.enSuelo && cuerpo.vy > 0 &&
                entrada.saltoMantenido && cuerpo.planeoRestante > 0;
            if (quierePlanear) {
                if (!cuerpo.planeando && sfx && sfx.planear) sfx.planear();
                cuerpo.planeando = true;
                cuerpo.planeoRestante = Math.max(0, cuerpo.planeoRestante - dt);
                if (cuerpo.vy > PLANEO_MAX) {
                    cuerpo.vy = Math.max(PLANEO_MAX, cuerpo.vy - PLANEO_FRENO * dt);
                }
            } else {
                cuerpo.planeando = false;
            }
        }

        // ── Integración + colisión, un eje a la vez ──
        const enSueloAntes = cuerpo.enSuelo;
        const vyAntes = cuerpo.vy;
        cuerpo.enSuelo = false;

        cuerpo.x += cuerpo.vx * dt;
        resolverEje(cuerpo, plataformas, 'x');

        cuerpo.y += cuerpo.vy * dt;
        resolverEje(cuerpo, plataformas, 'y');

        if (cuerpo.enSuelo && !enSueloAntes) {
            cuerpo.impactoCaida = vyAntes;
            cuerpo.planeando = false;
            if (sfx && sfx.aterrizar) sfx.aterrizar(vyAntes / CAIDA_MAX);
        }

        cuerpo.distanciaCaminada += Math.abs(cuerpo.vx) * dt;

        return cuerpo;
    }

    return {
        PASO_FIJO, VELOCIDAD_MAX, CAIDA_MAX, GRAVEDAD, FUERZA_SALTO,
        PLANEO_MAX, PLANEO_DURACION,
        ANCHO_CUERPO, ALTO_CUERPO,
        // Derivadas — niveles.js las usa para no inventarse distancias.
        ALTURA_SALTO: (FUERZA_SALTO * FUERZA_SALTO) / (2 * GRAVEDAD),
        TIEMPO_VUELO: (2 * FUERZA_SALTO) / GRAVEDAD,
        ALCANCE_SALTO: VELOCIDAD_MAX * ((2 * FUERZA_SALTO) / GRAVEDAD),
        crearCuerpo, actualizarJugador, solapan
    };
})();

window.Fisica = Fisica;
