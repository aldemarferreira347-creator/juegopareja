// ═══════════════════════════════════════════════════════════════
// JUEGO.JS — el bucle: cámara, objetivo, estados y render
//
// Paso fijo con acumulador y render interpolado (técnica: Gaffer on
// Games, "Fix Your Timestep"). La física avanza en trozos exactos de
// 1/120 s pase lo que pase con el framerate; el dibujo interpola entre
// el paso anterior y el actual. Un móvil a 45fps y un portátil a 144fps
// juegan EXACTAMENTE el mismo juego.
//
// ── CÓMO SE PASA UN CAPÍTULO ──
// Recoger todos los corazones y entrar por el portal de flores. El
// portal está siempre a la vista, florece con cada corazón, y si se
// entra sin completarlos lo DICE en vez de callarse. La versión
// anterior tenía un rectángulo invisible en el suelo y ninguna forma de
// saber qué había que hacer: por eso era imposible de terminar.
//
// ── ORDEN DE RENDER ──
//   fondo → plataformas → flores → corrientes → portal → corazones
//   → compañero → jugador → partículas → primer plano
//   → BLOOM → HUD
//
// El bloom va antes del HUD a propósito: el resplandor tiene que
// bañar el mundo, no la interfaz.
//
// ── LA REGLA DE ORO ──
// No hay muerte. Caerse reaparece en el último punto seguro con una
// frase cariñosa. Nada aquí puede castigar a quien lo juega.
// ═══════════════════════════════════════════════════════════════

const Juego = (function () {
    'use strict';

    const lienzo = document.getElementById('juego');
    const g = lienzo.getContext('2d');
    const elHud = document.getElementById('hud-capitulo');

    // Panel de "capítulo superado" — sale al entrar por el portal ya
    // abierto. Sustituye a la transición muda de antes, que sólo esperaba
    // a que los subtítulos terminaran de leerse solos y cargaba lo
    // siguiente sin decir nada: no había forma de saber que ya se había
    // pasado el nivel, sólo un silencio largo.
    const elPanelCap = document.getElementById('capitulo-panel');
    const elEtapaLogrado = document.getElementById('cap-etapa-logrado');
    const elPanelCapTitulo = document.getElementById('cap-titulo');
    const elPanelCapSub = document.getElementById('cap-subtitulo');
    const btnPanelRepetir = document.getElementById('cap-btn-repetir');
    const btnPanelSiguiente = document.getElementById('cap-btn-siguiente');

    // Segunda etapa del mismo panel: el peaje del beso antes de dejar
    // seguir. Nunca aplica a "Repetir" — sólo a avanzar de verdad.
    const elEtapaBeso = document.getElementById('cap-etapa-beso');
    const elBesoPregunta = document.getElementById('cap-beso-pregunta');
    const elBesoNota = document.getElementById('cap-beso-nota');
    const btnBesoSi = document.getElementById('cap-btn-beso-si');
    const btnBesoNo = document.getElementById('cap-btn-beso-no');
    let accionTrasBeso = null;

    // El panel de compromiso: sólo lo dispara la puerta de casa del
    // capítulo 5 (comprobarCasa), nunca un portal normal.
    const elCompromiso = document.getElementById('compromiso-panel');
    const elCompEtapaPregunta = document.getElementById('compromiso-etapa-pregunta');
    const elCompTitulo = document.getElementById('compromiso-titulo');
    const elCompSub = document.getElementById('compromiso-subtitulo');
    const btnCompSi = document.getElementById('compromiso-btn-si');
    const btnCompNo = document.getElementById('compromiso-btn-no');
    const elCompEtapaSi = document.getElementById('compromiso-etapa-si');
    const elCompSiTitulo = document.getElementById('compromiso-si-titulo');
    const elCompSiTexto = document.getElementById('compromiso-si-texto');
    const elCompEtapaNo = document.getElementById('compromiso-etapa-no');
    const elCompNoTitulo = document.getElementById('compromiso-no-titulo');
    const elCompNoTexto = document.getElementById('compromiso-no-texto');
    const btnCompReintentar = document.getElementById('compromiso-btn-reintentar');
    const btnCompFin = document.getElementById('compromiso-btn-fin');
    const elCompEtapaFin = document.getElementById('compromiso-etapa-fin');
    const elCompFinTitulo = document.getElementById('compromiso-fin-titulo');
    const elCompFinTexto = document.getElementById('compromiso-fin-texto');

    // Elementos de la Batalla (Jefe In-Game)
    const elUiBatalla = document.getElementById('ui-batalla');
    const elBatallaPregunta = document.getElementById('batalla-pregunta');
    const elBatallaOpciones = document.getElementById('batalla-opciones');

    // Panel de derrota ante Distancia
    const elJefeDerrota = document.getElementById('jefe-derrota-panel');
    const elJefeDerrotaTitulo = document.getElementById('jefe-derrota-titulo');
    const elJefeDerrotaTexto = document.getElementById('jefe-derrota-texto');
    const btnJefeDerrota = document.getElementById('jefe-derrota-btn');
    
    let oscuridadCielo = 0;
    let cieloObjetivo = 0;

    let W = 0, H = 0, dpr = 1;
    let prevW = 0, prevH = 0;

    let nivel = null, escena = null;
    let jugador = null, previo = null, arteJugador = null;
    let companero = null;
    const cam = Camara.crear();

    let quien = 'carlo';
    let capituloIndice = 0;
    let checkpointIndice = 0;
    let corazonesTomados = new Set();
    let avanceMax = 0;
    let capituloTerminado = false;
    let juegoTerminado = false;
    // Vidas: lo que puede llegar a perderse de verdad. Tocar un corazón
    // roto cuesta una — no el juego entero, sólo el margen de error.
    // Los 4 capítulos "de verdad" — el 5º ("hogar") es el epílogo que se
    // desbloquea desde la carta, nunca por el flujo normal de "Siguiente
    // capítulo". Por eso esto NO es Niveles.total (que ya cuenta los 5).
    const CAPITULOS_JUGABLES = 4;
    const VIDAS_MAX = 3;
    let vidas = VIDAS_MAX;
    let vidasInvulnerable = 0;
    let corriendo = false;
    let enPortal = false;
    let portalAbierto = false;
    let panelCapMostrado = false;
    let hudOcultarId = 0;
    let siembraAcum = 0;
    let ambienteAcum = 0;
    let tGlobal = 0;
    // Muelle del brillo del HUD al recoger: el marcador reacciona.
    let latido = new Nucleo.Muelle(0, 190, 13);

    // ══════════════════════════════════════════════
    // MEDIDAS
    // ══════════════════════════════════════════════
    let bufA = null, bufB = null, bufC = null;

    function prepararBuffers() {
        // Escalar por dpr para mantener la nitidez en pantallas Retina/Móvil
        const w = Math.max(2, Math.round((W * dpr) / 4)), h = Math.max(2, Math.round((H * dpr) / 4));
        const mk = (a, b) => { const c = document.createElement('canvas'); c.width = a; c.height = b; return c; };
        bufA = mk(w, h);
        bufC = mk(w, h);
        bufB = mk(Math.max(2, w >> 1), Math.max(2, h >> 1));
    }

    function medir() {
        // Un viewport de 0px sólo ocurre en paneles sin ventana real. Se
        // ignora para no rehornear el escenario entero a tamaño nulo.
        const w = window.innerWidth, h = window.innerHeight;
        if (w < 2 || h < 2) return;

        // Evitar reiniciar el nivel entero por cambios menores de alto en móvil (ej. barra de navegación)
        const deltaW = Math.abs(w - prevW);
        const deltaH = Math.abs(h - prevH);
        if (prevW > 0 && deltaW === 0 && deltaH < 100) return;
        
        prevW = w;
        prevH = h;

        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = w; H = h;
        lienzo.width = Math.round(W * dpr);
        lienzo.height = Math.round(H * dpr);
        lienzo.style.width = W + 'px';
        lienzo.style.height = H + 'px';
        g.setTransform(dpr, 0, 0, dpr, 0, 0);

        prepararBuffers();
        Camara.medir(cam, W, H);
        if (Sprites.listo) Sprites.hornear(Fisica.ALTO_CUERPO);

        if (nivel) {
            // La geometría se calcula a partir de H, así que cambiar de
            // tamaño obliga a reconstruir el capítulo. Se conserva el
            // avance para no castigar por girar el móvil a media partida.
            const x = jugador.x;
            const cps = checkpointIndice, tom = corazonesTomados, av = avanceMax;
            // Si el panel de "capítulo superado" estaba abierto, un giro de
            // pantalla no puede dejar la entrada pausada para siempre.
            if (panelCapMostrado) Entrada.reanudar();
            cargarCapitulo(capituloIndice, true);
            jugador.x = Math.min(x, nivel.ancho - 120);
            checkpointIndice = Math.min(cps, nivel.checkpoints.length - 1);
            corazonesTomados = tom;
            avanceMax = av;
            portalAbierto = tom.size >= nivel.corazones.length;
            Camara.fijar(cam, jugador, nivel);
        }
    }

    // ══════════════════════════════════════════════
    // CARGA DE CAPÍTULO
    // ══════════════════════════════════════════════
    function cargarCapitulo(indice, silencioso) {
        capituloIndice = indice;
        nivel = Niveles.cargar(indice, H);
        escena = Escenario.crear(nivel.escena, W, H);

        checkpointIndice = 0;
        corazonesTomados = new Set();
        avanceMax = 0;
        capituloTerminado = false;
        enPortal = false;
        portalAbierto = false;
        vidas = VIDAS_MAX;
        vidasInvulnerable = 0;
        siembraAcum = 0;
        latido.fijar(0);
        ocultarPanelCapitulo();

        Flora.limpiar();
        Particulas.limpiar();

        jugador = Fisica.crearCuerpo(nivel.spawn.x, nivel.spawn.y);
        previo = Object.assign({}, jugador);
        arteJugador = Personaje.crear(quien);

        const otro = quien === 'carlo' ? 'isabela' : 'carlo';
        companero = Companero.crear(otro, nivel);

        Camara.fijar(cam, jugador, nivel);

        activarJefeParaCapitulo();

        if (silencioso) return;

        const gc = GUION.capitulos[nivel.guion];
        mostrarHudCapitulo(gc);
        Subtitulos.vaciar();
        (gc.inicio || []).forEach(l => Subtitulos.mostrar(l));
        Subtitulos.mostrar(objetivoTexto());
        if (window.Sfx && Sfx.capitulo) Sfx.capitulo();
        GUARDADO.escribir({ capitulo: indice, quien, terminado: false });
    }

    // Distancia sólo vive en el capítulo 4 ("pleno"), justo antes del
    // portal. Se usa tanto al cargar el capítulo como al reintentar
    // tras una derrota, así que vive aparte en vez de duplicarse.
    function activarJefeParaCapitulo() {
        if (!window.Jefe) return;
        if (nivel.clave === 'pleno') {
            Jefe.iniciar(nivel.portal.x - 450, nivel.portal.y, {
                inicio: () => {
                    Entrada.pausar();
                    oscurecerCielo();
                    const j = GUION.jefe || {};
                    if (j.presentacion) Subtitulos.mostrar(j.presentacion, { prioridad: 'ahora' });
                },
                mostrarPregunta: mostrarUiBatalla,
                fin: () => { Entrada.reanudar(); ocultarUiBatalla(); aclararCielo(); abrirPortal(); },
                perderVida: perderVida
            });
        } else {
            Jefe.desactivar();
        }
    }

    function objetivoTexto() {
        const t = (GUION.objetivo && GUION.objetivo.inicio) || '';
        return t.replace('{n}', nivel.corazones.length);
    }

    function mostrarHudCapitulo(gc) {
        if (!elHud) return;
        elHud.innerHTML = '';
        const t = document.createElement('strong');
        t.textContent = gc.titulo;
        const f = document.createElement('span');
        f.textContent = gc.fecha;
        elHud.appendChild(t);
        elHud.appendChild(f);
        elHud.classList.add('visible');
        clearTimeout(hudOcultarId);
        hudOcultarId = setTimeout(() => elHud.classList.remove('visible'), 4600);
    }

    // ══════════════════════════════════════════════
    // COMPROBACIONES POR PASO DE FÍSICA
    // ══════════════════════════════════════════════
    function actualizarCheckpoint() {
        for (let i = nivel.checkpoints.length - 1; i > checkpointIndice; i--) {
            // La altura importa tanto como la x. Sin comprobarla, correr
            // por DEBAJO de una repisa activaba su checkpoint y al caerse
            // aparecías en una plataforma a la que nunca subiste.
            if (jugador.x >= nivel.checkpoints[i].x &&
                Math.abs(jugador.y - nivel.checkpoints[i].y) < 260) {
                checkpointIndice = i;
                if (window.Sfx && Sfx.checkpoint) Sfx.checkpoint();
                Flora.plantar(nivel.checkpoints[i].x + 30,
                    nivel.checkpoints[i].y + Fisica.ALTO_CUERPO, 'campanilla');
                break;
            }
        }
    }

    // Vuelve al último punto seguro, con una frase de la lista que toque.
    // La usan tanto caerse como quedarse sin vidas — la misma regla de
    // oro para las dos: nunca "game over", siempre otra oportunidad.
    function volverAlCheckpoint(frases) {
        const cp = nivel.checkpoints[checkpointIndice];
        jugador.x = cp.x; jugador.y = cp.y;
        jugador.vx = 0; jugador.vy = 0;
        jugador.planeoRestante = Fisica.PLANEO_DURACION;
        jugador.impactoCaida = 0;
        vidas = VIDAS_MAX;
        vidasInvulnerable = 1.2;
        previo = Object.assign({}, jugador);
        Camara.fijar(cam, jugador, nivel);
        if (window.Sfx && Sfx.reaparicion) Sfx.reaparicion();
        Subtitulos.mostrar(frases[(Math.random() * frases.length) | 0], { prioridad: 'ahora' });
    }

    function comprobarCaida() {
        if (jugador.y <= nivel.limiteCaida) return;
        volverAlCheckpoint(GUION.reaparicion);
    }

    // Corazones rotos: el peligro del mapa. Tocar uno no mata ni termina
    // nada — cuesta una vida, con un aviso breve y un respiro antes de
    // poder perder otra. Quedarse sin ninguna manda de vuelta al último
    // checkpoint, igual que una caída.
    function comprobarPeligros() {
        if (vidasInvulnerable > 0 || !nivel.corazonesRotos) return;
        const cx = jugador.x + jugador.ancho / 2;
        const cy = jugador.y + jugador.alto / 2;
        for (const p of nivel.corazonesRotos) {
            const dx = p.x - cx, dy = p.y - cy;
            if (dx * dx + dy * dy > 60 * 60) continue;
            perderVida();
            break;
        }
    }

    function perderVida() {
        vidasInvulnerable = 1.4;
        vidas = Math.max(0, vidas - 1);
        if (window.Sfx && Sfx.discusion) Sfx.discusion();
        Particulas.destello(jugador.x + jugador.ancho / 2, jugador.y + jugador.alto / 2, '#8d6b78');

        // Quedarse sin vidas EN MEDIO de la batalla contra Distancia no es
        // igual que caerse o tocar un corazón roto: aquí sí hay una
        // cinemática de derrota — nunca "game over" de verdad, sólo un
        // asalto perdido — antes de volver al checkpoint.
        if (vidas <= 0 && window.Jefe && Jefe.activo) {
            perderBatallaJefe();
            return;
        }

        const lineas = GUION.discusiones || [];
        if (lineas.length) Subtitulos.mostrar(lineas[(Math.random() * lineas.length) | 0], { prioridad: 'ahora' });

        if (vidas <= 0) volverAlCheckpoint(GUION.derrota || GUION.reaparicion);
    }

    // El jugador se quedó sin vidas respondiendo. Distancia se lleva al
    // compañero volando por un momento, sale el panel de derrota, y al
    // reintentar todo vuelve al último checkpoint con Distancia lista
    // para el siguiente intento — igual de perdonavidas que el resto
    // del juego, sólo que con más puesta en escena.
    function perderBatallaJefe() {
        Entrada.pausar();
        ocultarUiBatalla();
        const jp = (window.Jefe && Jefe.posicion) ? Jefe.posicion() : { x: jugador.x + 300, y: jugador.y - 100 };
        if (window.Jefe && Jefe.anunciarVictoria) Jefe.anunciarVictoria();
        if (companero) Companero.arrebatar(companero, jp.x, jp.y - 30, 1.7);

        // vaciar() antes de mostrar: la línea de "error" de la pregunta
        // que acaba de fallar puede seguir escribiéndose en pantalla, y
        // 'ahora' sólo la pondría primera EN LA COLA — no la interrumpe.
        // Sin esto, el aviso de la derrota podía no llegar a verse nunca
        // antes de que apareciera el panel.
        Subtitulos.vaciar();
        const j = GUION.jefe || {};
        Subtitulos.mostrar((j.derrotaAviso || '{otro} se pierde en la grieta...').replace('{otro}', nombreCompanero()), { prioridad: 'ahora' });

        setTimeout(() => {
            if (companero) companero.visible = false;
            mostrarPanelDerrotaJefe();
        }, 1700);
    }

    function mostrarPanelDerrotaJefe() {
        if (window.Jefe) Jefe.desactivar();
        ocultarUiBatalla();
        aclararCielo();

        const j = GUION.jefe || {};
        if (elJefeDerrotaTitulo) elJefeDerrotaTitulo.textContent = j.derrotaTitulo || 'Distancia gana este asalto';
        if (elJefeDerrotaTexto) elJefeDerrotaTexto.textContent = j.derrotaTexto || '';
        if (btnJefeDerrota) btnJefeDerrota.textContent = j.derrotaBoton || 'Cerrar la grieta y volver a intentarlo';
        if (elJefeDerrota) {
            elJefeDerrota.classList.add('visible');
            elJefeDerrota.setAttribute('aria-hidden', 'false');
        }
    }

    if (btnJefeDerrota) {
        btnJefeDerrota.addEventListener('click', () => {
            if (elJefeDerrota) {
                elJefeDerrota.classList.remove('visible');
                elJefeDerrota.setAttribute('aria-hidden', 'true');
            }
            if (companero) {
                Companero.soltar(companero);
                companero.visible = true;
            }
            volverAlCheckpoint(GUION.derrota || GUION.reaparicion);
            activarJefeParaCapitulo();
            Entrada.reanudar();
        });
    }

    function comprobarCorazones() {
        const cx = jugador.x + jugador.ancho / 2;
        const cy = jugador.y + jugador.alto / 2;
        for (const c of nivel.corazones) {
            if (corazonesTomados.has(c.indice)) continue;
            const dx = c.x - cx, dy = c.y - cy;
            // Radio generoso: fallar un corazón por 5 px sería un castigo,
            // y aquí nada puede castigar.
            if (dx * dx + dy * dy > 82 * 82) continue;

            corazonesTomados.add(c.indice);
            Particulas.destello(c.x, c.y, '#ffb3d0');
            latido.v = 1; latido.vel = 0; latido.destino = 0;
            if (window.Sfx && Sfx.corazon) Sfx.corazon();

            const lineas = GUION.capitulos[nivel.guion].coleccionables || [];
            // Guardia: sólo mostrar si la línea existe y no está vacía
            const lineaCorazon = lineas[c.indice];
            if (lineaCorazon) Subtitulos.mostrar(lineaCorazon);

            if (!portalAbierto && corazonesTomados.size === nivel.corazones.length) {
                if (window.Jefe && Jefe.activo) {
                    Subtitulos.mostrar("Algo te espera cerca del portal...", { prioridad: 'ahora' });
                } else {
                    abrirPortal();
                }
            }
        }
    }

    function abrirPortal() {
        portalAbierto = true;
        if (window.Sfx && Sfx.florecer) Sfx.florecer();
        const p = nivel.portal;
        for (let i = 0; i < 5; i++) {
            Particulas.destello(p.x + Nucleo.rnd(0, p.ancho), p.y + Nucleo.rnd(0, p.alto), '#fff4c2');
        }
        Subtitulos.mostrar((GUION.objetivo && GUION.objetivo.abierto) || '', { prioridad: 'ahora' });
    }

    function comprobarPortal() {
        if (juegoTerminado || capituloTerminado) return;
        if (!Fisica.solapan(jugador, nivel.portal)) { enPortal = false; return; }
        if (enPortal) return;             // ya se resolvió en esta entrada
        enPortal = true;

        if (!portalAbierto) {
            // Un portal cerrado NO bloquea físicamente: un muro invisible
            // se siente roto. Deja pasar, pero avisa de qué falta.
            if (window.Sfx && Sfx.cerrado) Sfx.cerrado();
            const faltan = nivel.corazones.length - corazonesTomados.size;
            const txt = (GUION.objetivo && GUION.objetivo.faltan) || '';
            Subtitulos.mostrar(txt.replace('{n}', faltan), { prioridad: 'ahora' });
            return;
        }

        capituloTerminado = true;
        if (window.Sfx && Sfx.capitulo) Sfx.capitulo();
        const gc = GUION.capitulos[nivel.guion];
        (gc.final || []).forEach(l => Subtitulos.mostrar(l));

        // Se queda AL RAS del portal, no de largo: sin esto el impulso
        // horizontal seguía empujando un poco más allá del arco antes de
        // que la fricción lo parara, y se veía como si hubiera "pasado de
        // largo" en vez de quedarse justo donde el nivel se completó.
        const centroPortal = nivel.portal.x + nivel.portal.ancho / 2;
        jugador.x = centroPortal - jugador.ancho / 2;
        jugador.vx = 0;
        previo.x = jugador.x;
        // El compañero YA está dentro del arco desde que empezó el
        // capítulo (niveles.js lo coloca ahí) — no hace falta moverlo de
        // golpe aquí. Antes sí se reposicionaba en este instante, y esa
        // reubicación era justo el "teletransporte brusco" que se veía
        // mal: el compañero saltaba desde donde esperaba hasta el portal
        // en un solo fotograma. Ahora sólo se le frena.
        if (companero) companero.cuerpo.vx = 0;

        // El nivel termina EN EL INSTANTE de tocar el portal abierto, no
        // un rato después: antes se esperaba a que los subtítulos del
        // "final" terminaran de leerse solos, y en ese hueco se seguía
        // jugando con total libertad — se podía seguir caminando, saltando,
        // lo que fuera, sin que nada indicara que el capítulo ya se había
        // ganado. Las líneas de "final" se quedan sonando en la barra de
        // abajo (se siguen leyendo), pero ya no bloquean nada: el panel de
        // "capítulo superado" sale ya mismo, y con él Entrada.pausar()
        // congela el control.
        mostrarPanelCapitulo();
    }

    // ══════════════════════════════════════════════
    // LA CASA — capítulo 5, el epílogo
    // Sustituye por completo al portal: no hay corazones que completar,
    // sólo llegar a la puerta. Al llegar no sale el panel de "capítulo
    // superado" ni el peaje del beso — sale la pregunta de verdad.
    // ══════════════════════════════════════════════
    function comprobarCasa() {
        if (juegoTerminado || capituloTerminado) return;
        if (!Fisica.solapan(jugador, nivel.casa)) { enPortal = false; return; }
        if (enPortal) return;
        enPortal = true;
        capituloTerminado = true;

        // Se detiene justo en la puerta, de la mano del otro, no de largo.
        const centro = nivel.casa.x + nivel.casa.ancho / 2;
        jugador.x = centro - jugador.ancho / 2;
        jugador.vx = 0;
        previo.x = jugador.x;
        if (companero) companero.cuerpo.vx = 0;

        Entrada.pausar();
        mostrarCompromiso();
    }

    function mostrarCompromiso() {
        const c = (window.GUION && GUION.compromiso) || {};
        if (elCompTitulo) elCompTitulo.textContent = c.titulo || '¿Estás segura de pasar toda tu vida junto a mí?';
        if (elCompSub) elCompSub.textContent = c.subtitulo || '';
        if (btnCompSi) btnCompSi.textContent = c.si || 'Sí';
        if (btnCompNo) btnCompNo.textContent = c.no || 'Todavía no';
        if (elCompEtapaPregunta) elCompEtapaPregunta.hidden = false;
        if (elCompEtapaSi) elCompEtapaSi.hidden = true;
        if (elCompEtapaNo) elCompEtapaNo.hidden = true;
        if (elCompEtapaFin) elCompEtapaFin.hidden = true;
        if (elCompromiso) {
            elCompromiso.classList.add('visible');
            elCompromiso.setAttribute('aria-hidden', 'false');
        }
    }

    // Nombre del compañero — el personaje que NO se está jugando — para
    // que la respuesta "todavía no" lo mencione por su nombre.
    function nombreCompanero() {
        const otro = quien === 'carlo' ? 'isabela' : 'carlo';
        const s = GUION.seleccion && GUION.seleccion[otro];
        return (s && s.nombre) || (otro === 'carlo' ? 'Carlo' : 'Isabela');
    }

    if (btnCompSi) {
        btnCompSi.addEventListener('click', () => {
            const c = (window.GUION && GUION.compromiso) || {};
            if (window.Sfx && Sfx.fanfarria) Sfx.fanfarria();
            if (elCompSiTitulo) elCompSiTitulo.textContent = c.desenlaceTitulo || 'Entramos juntos';
            if (elCompSiTexto) elCompSiTexto.textContent = c.desenlaceTexto || '';
            if (elCompEtapaPregunta) elCompEtapaPregunta.hidden = true;
            if (elCompEtapaSi) elCompEtapaSi.hidden = false;
            GUARDADO.escribir({ capitulo: 0, terminado: true });
        });
    }
    if (btnCompNo) {
        btnCompNo.addEventListener('click', () => {
            const c = (window.GUION && GUION.compromiso) || {};
            if (window.Sfx && Sfx.reaparicion) Sfx.reaparicion();
            if (elCompNoTitulo) elCompNoTitulo.textContent = c.noTitulo || 'Está bien';
            if (elCompNoTexto) elCompNoTexto.textContent = (c.noTexto || '').replace('{otro}', nombreCompanero());
            if (btnCompReintentar) btnCompReintentar.textContent = c.reintentar || 'Preguntar de nuevo';
            if (btnCompFin) btnCompFin.textContent = c.fin || 'Fin';
            if (elCompEtapaPregunta) elCompEtapaPregunta.hidden = true;
            if (elCompEtapaNo) elCompEtapaNo.hidden = false;
        });
    }
    if (btnCompReintentar) {
        btnCompReintentar.addEventListener('click', () => mostrarCompromiso());
    }
    // "Fin" cierra aquí de verdad — la otra salida de "Todavía no",
    // para quien no quiera que el panel le siga preguntando.
    if (btnCompFin) {
        btnCompFin.addEventListener('click', () => {
            const c = (window.GUION && GUION.compromiso) || {};
            if (elCompFinTitulo) elCompFinTitulo.textContent = c.finTitulo || 'Hasta aquí llega el juego';
            if (elCompFinTexto) elCompFinTexto.textContent = c.finTexto || '';
            if (elCompEtapaNo) elCompEtapaNo.hidden = true;
            if (elCompEtapaFin) elCompEtapaFin.hidden = false;
            GUARDADO.escribir({ capitulo: 0, terminado: true });
        });
    }

    function mostrarPanelCapitulo() {
        panelCapMostrado = true;
        Entrada.pausar();
        if (window.Sfx && Sfx.fanfarria) Sfx.fanfarria();

        const c = (window.GUION && GUION.capituloSuperado) || {};
        const gc = GUION.capitulos[nivel.guion] || {};
        const esUltimo = capituloIndice + 1 >= CAPITULOS_JUGABLES;
        if (elPanelCapTitulo) elPanelCapTitulo.textContent = c.titulo || '¡Lo lograste!';
        if (elPanelCapSub) elPanelCapSub.textContent = (c.subtitulo || '{titulo}').replace('{titulo}', gc.titulo || '');
        if (btnPanelRepetir) btnPanelRepetir.textContent = c.botonRepetir || 'Repetir';
        if (btnPanelSiguiente) {
            btnPanelSiguiente.textContent = esUltimo
                ? (c.botonCarta || 'Detalle final →')
                : (c.botonSiguiente || 'Siguiente capítulo →');
        }
        if (elEtapaLogrado) elEtapaLogrado.hidden = false;
        if (elEtapaBeso) elEtapaBeso.hidden = true;
        if (elPanelCap) {
            elPanelCap.classList.add('visible');
            elPanelCap.setAttribute('aria-hidden', 'false');
        }
    }

    function ocultarPanelCapitulo() {
        panelCapMostrado = false;
        accionTrasBeso = null;
        if (elPanelCap) {
            elPanelCap.classList.remove('visible');
            elPanelCap.setAttribute('aria-hidden', 'true');
        }
    }

    // ══════════════════════════════════════════════
    // UI BATALLA
    // ══════════════════════════════════════════════
    function mostrarUiBatalla(pregunta) {
        if (!elUiBatalla || !elBatallaPregunta || !elBatallaOpciones) return;
        elBatallaPregunta.textContent = pregunta.pregunta;
        elBatallaOpciones.innerHTML = '';
        
        pregunta.opciones.forEach((opcion, i) => {
            const btn = document.createElement('button');
            btn.className = 'btn-batalla';
            btn.textContent = opcion;
            btn.type = 'button';
            btn.onclick = () => {
                if (window.Jefe) Jefe.recibirRespuesta(i);
            };
            elBatallaOpciones.appendChild(btn);
        });

        elUiBatalla.hidden = false;
    }

    function ocultarUiBatalla() {
        if (elUiBatalla) elUiBatalla.hidden = true;
    }

    function oscurecerCielo() {
        cieloObjetivo = 0.65; // Nivel de oscuridad (alfa)
    }

    function aclararCielo() {
        cieloObjetivo = 0;
    }

    // Muestra la segunda etapa del mismo panel — el peaje del beso — y
    // guarda qué hacer si contesta que sí. No es un candado de verdad
    // (no hay forma de comprobarlo): es sólo un empujón cariñoso.
    function mostrarEtapaBeso(accion) {
        accionTrasBeso = accion;
        const b = (window.GUION && GUION.besoConfirmacion) || {};
        if (elBesoPregunta) elBesoPregunta.textContent = b.pregunta || '¿Ya le diste un beso?';
        if (elBesoNota) elBesoNota.hidden = true;
        if (btnBesoSi) btnBesoSi.textContent = b.si || 'Sí ❣️';
        if (btnBesoNo) btnBesoNo.textContent = b.no || 'Todavía no';
        if (elEtapaLogrado) elEtapaLogrado.hidden = true;
        if (elEtapaBeso) elEtapaBeso.hidden = false;
    }

    if (btnBesoSi) {
        btnBesoSi.addEventListener('click', () => {
            const accion = accionTrasBeso;
            accionTrasBeso = null;
            if (accion) accion();
        });
    }
    if (btnBesoNo) {
        btnBesoNo.addEventListener('click', () => {
            const b = (window.GUION && GUION.besoConfirmacion) || {};
            if (elBesoNota) {
                elBesoNota.textContent = b.nota || 'Sin prisa — cuando ya se lo hayas dado, toca «Sí».';
                elBesoNota.hidden = false;
            }
        });
    }

    if (btnPanelRepetir) {
        btnPanelRepetir.addEventListener('click', () => {
            ocultarPanelCapitulo();
            Entrada.reanudar();
            cargarCapitulo(capituloIndice, false);
        });
    }
    if (btnPanelSiguiente) {
        btnPanelSiguiente.addEventListener('click', () => mostrarEtapaBeso(() => {
            ocultarPanelCapitulo();
            const siguiente = capituloIndice + 1;
            if (siguiente < CAPITULOS_JUGABLES) {
                Entrada.reanudar();
                cargarCapitulo(siguiente, false);
                return;
            }
            // En el último capítulo la carta sustituye al juego: no hace
            // falta reanudar la entrada porque no se vuelve a jugar.
            juegoTerminado = true;
            if (window.Final) Final.mostrar(quien);
        }));
    }

    // Siembra en la estela: el mundo florece porque pasas por ahí.
    function sembrarEstela(dt) {
        if (!jugador.enSuelo || Math.abs(jugador.vx) < 40) return;
        siembraAcum += Math.abs(jugador.vx) * dt;
        const cada = Nucleo.nivel === 0 ? 150 : 90;
        while (siembraAcum > cada) {
            siembraAcum -= cada;
            const especies = escena.cfg.especies;
            Flora.plantar(
                jugador.x + jugador.ancho / 2 + Nucleo.rnd(-60, 60),
                jugador.y + jugador.alto,
                especies[(Math.random() * especies.length) | 0]);
        }
    }

    function pasoFisica(entrada) {
        Fisica.actualizarJugador(jugador, nivel, Fisica.PASO_FIJO, entrada, window.Sfx);
        jugador.sombraY = Companero.superficieBajo(nivel, jugador.x + jugador.ancho / 2, jugador.y);
        if (vidasInvulnerable > 0) vidasInvulnerable = Math.max(0, vidasInvulnerable - Fisica.PASO_FIJO);
        actualizarCheckpoint();
        comprobarCaida();
        comprobarPeligros();
        comprobarCorazones();
        if (nivel.casa) comprobarCasa(); else comprobarPortal();
        sembrarEstela(Fisica.PASO_FIJO);
        
        // Transición suave del cielo
        if (oscuridadCielo < cieloObjetivo) oscuridadCielo = Math.min(cieloObjetivo, oscuridadCielo + Fisica.PASO_FIJO * 0.5);
        if (oscuridadCielo > cieloObjetivo) oscuridadCielo = Math.max(cieloObjetivo, oscuridadCielo - Fisica.PASO_FIJO * 0.5);

        if (window.Jefe && Jefe.activo) {
            Jefe.actualizar(Fisica.PASO_FIJO, jugador);
            if (Jefe.sacudida > 0) {
                Camara.sacudir(cam, Jefe.sacudida);
            }
        }
        avanceMax = Math.max(avanceMax, Nucleo.lim(jugador.x / (nivel.ancho * 0.85), 0, 1));
    }

    // ══════════════════════════════════════════════
    // RENDER — MUNDO
    // ══════════════════════════════════════════════

    // Una plataforma no es un rectángulo marrón: es un trozo de prado.
    // Lleva tierra con vetas y piedras, una banda de césped que SOBRESALE
    // por los lados (el detalle que más la separa de una caja), un filo
    // iluminado en la cresta, briznas irregulares y raíces colgando.
    //
    // Todo se calcula con la x DEL MUNDO, nunca con la de pantalla: si
    // usara la de pantalla, la hierba se desplazaría sobre sí misma cada
    // vez que se mueve la cámara.
    function dibujarPlataformas(cx, cy, t) {
        const ALTO_CESPED = 32;
        const hash = (n) => { const h = (Math.sin(n * 12.9898) * 43758.5453) % 1; return h < 0 ? h + 1 : h; };

        for (const p of nivel.plataformas) {
            const x = p.x - cx, y = p.y - cy;
            if (x > W + 80 || x + p.ancho < -80) continue;

            const fina = p.alto <= 40;
            const rad = fina ? 14 : [20, 20, 12, 12];
            const altoC = fina ? p.alto : ALTO_CESPED;

            // ── Sombra proyectada bajo la plataforma ──
            if (!fina) {
                const so = g.createLinearGradient(0, y + p.alto - 90, 0, y + p.alto);
                so.addColorStop(0, 'rgba(120,80,50,0)');
                so.addColorStop(1, 'rgba(120,80,50,.16)');
                g.fillStyle = so;
                g.fillRect(x, y + p.alto - 90, p.ancho, 90);
            }

            // ── Tierra ──
            // Se aclara hacia abajo, al revés de lo natural: un bloque que
            // se va a negro ancla la mirada abajo y devuelve al juego el
            // peso sombrío que se le está quitando. Yéndose a arena, la
            // masa marrón se difumina y el ojo sube al prado.
            const hondo = Math.min(p.alto, 320);
            const tierra = g.createLinearGradient(0, y, 0, y + hondo);
            tierra.addColorStop(0, '#b98a5c');
            tierra.addColorStop(.3, '#c9a173');
            tierra.addColorStop(1, '#e7d0ac');
            g.fillStyle = tierra;
            g.beginPath();
            g.roundRect(x, y, p.ancho, p.alto, rad);
            g.fill();

            g.save();
            g.beginPath();
            g.roundRect(x, y, p.ancho, p.alto, rad);
            g.clip();

            if (!fina) {
                // Oclusión justo bajo el césped: da grosor a la capa.
                const oc = g.createLinearGradient(0, y + altoC - 8, 0, y + altoC + 42);
                oc.addColorStop(0, 'rgba(90,60,35,.28)');
                oc.addColorStop(1, 'rgba(90,60,35,0)');
                g.fillStyle = oc;
                g.fillRect(x, y + altoC - 8, p.ancho, 50);

                // Vetas y piedrecitas
                g.strokeStyle = 'rgba(255,244,222,.15)';
                g.lineWidth = 3;
                for (let k = 1; k <= 3; k++) {
                    const vy = y + ALTO_CESPED + k * 38;
                    g.beginPath();
                    for (let i = 0; i <= p.ancho; i += 18) {
                        const oy = Math.sin((p.x + i) * 0.012 + k) * 6;
                        i ? g.lineTo(x + i, vy + oy) : g.moveTo(x + i, vy + oy);
                    }
                    g.stroke();
                }
                for (let i = 30; i < p.ancho; i += 70) {
                    const h1 = hash(p.x + i), h2 = hash(p.x + i + 7);
                    if (h1 > .55) continue;
                    const px = x + i + h1 * 40, py = y + altoC + 26 + h2 * 150;
                    g.fillStyle = 'rgba(150,115,80,.4)';
                    g.beginPath();
                    g.ellipse(px, py, 5 + h1 * 7, 3.5 + h1 * 4, h2 * 3, 0, Math.PI * 2);
                    g.fill();
                }
            }

            // ── Césped ──
            const borde = (i) => y + altoC - 6 + Math.sin((p.x + i) * 0.034) * 5
                + Math.sin((p.x + i) * 0.105) * 2;
            g.beginPath();
            g.moveTo(x, y - 16);
            for (let i = 0; i <= p.ancho; i += 10) g.lineTo(x + i, borde(i));
            g.lineTo(x + p.ancho, y - 16);
            g.closePath();
            const cesped = g.createLinearGradient(0, y - 10, 0, y + altoC + 8);
            cesped.addColorStop(0, '#b0e39b');
            cesped.addColorStop(.5, '#87cb79');
            cesped.addColorStop(1, '#5fa45e');
            g.fillStyle = cesped;
            g.fill();

            g.strokeStyle = 'rgba(255,255,228,.55)';
            g.lineWidth = 2.5;
            g.beginPath();
            for (let i = 0; i <= p.ancho; i += 10) {
                const by = borde(i) - altoC + 6;
                i ? g.lineTo(x + i, by) : g.moveTo(x + i, by);
            }
            g.stroke();
            g.restore();

            // ── El césped SOBRESALE por los cantos ──
            // Es el detalle que convierte la caja en un trozo de tierra
            // arrancado: el borde deja de ser una línea recta perfecta.
            g.fillStyle = '#7cc36e';
            for (const lado of [0, 1]) {
                const bx = lado ? x + p.ancho : x;
                g.beginPath();
                g.moveTo(bx, y);
                g.quadraticCurveTo(bx + (lado ? 9 : -9), y + 8, bx + (lado ? 5 : -5), y + altoC + 6);
                g.lineTo(bx, y + altoC);
                g.closePath();
                g.fill();
            }

            // ── Briznas irregulares en la cresta ──
            const v = Flora.viento(t, p.x, 1);
            g.strokeStyle = 'rgba(146,212,130,.92)';
            g.lineCap = 'round';
            for (let i = 4; i <= p.ancho; i += 11) {
                const h = hash(p.x + i);
                if (h > 0.62) continue;         // huecos: no es un cepillo
                const largo = 5 + h * 17;
                const bx = x + i + h * 5;
                g.lineWidth = 1.3 + h * 1.6;
                g.beginPath();
                g.moveTo(bx, y + 3);
                g.quadraticCurveTo(bx + v * 2.5, y - largo * .55, bx + v * 5 + 1.5, y - largo);
                g.stroke();
            }

            // ── Raíces colgando de las repisas finas ──
            if (fina) {
                g.strokeStyle = 'rgba(150,120,80,.5)';
                g.lineCap = 'round';
                for (let i = 14; i < p.ancho; i += 34) {
                    const h = hash(p.x + i * 3);
                    if (h > .6) continue;
                    const largo = 9 + h * 22;
                    g.lineWidth = 1.6 + h;
                    g.beginPath();
                    g.moveTo(x + i, y + p.alto - 2);
                    g.quadraticCurveTo(x + i + v * 2, y + p.alto + largo * .6,
                        x + i + v * 4 + (h - .3) * 8, y + p.alto + largo);
                    g.stroke();
                }
            }
        }
    }

    function dibujarCorrientes(cx, cy, t) {
        for (const c of nivel.corrientes) {
            const x = c.x - cx, y = c.y - cy;
            if (x > W + 60 || x + c.ancho < -60) continue;

            // El capítulo del ascenso tiene el cielo dorado, así que una
            // columna blanca translúcida se volvía invisible justo ahí.
            // La legibilidad la dan el rosa (el único tono que contrasta
            // contra crema y contra dorado) y sobre todo los bordes: es
            // el contorno, no el relleno, lo que dice "aquí pasa algo".
            // Se desvanece por ARRIBA además de por abajo. Cortada en
            // seco arriba, la columna se leía como una caja translúcida
            // pegada al cielo; disolviéndose por los dos extremos parece
            // aire en movimiento, que es lo que es.
            const grad = g.createLinearGradient(0, y + c.alto, 0, y);
            grad.addColorStop(0, 'rgba(255,158,196,.04)');
            grad.addColorStop(.4, 'rgba(255,190,214,.24)');
            grad.addColorStop(.82, 'rgba(255,255,255,.4)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = grad;
            g.fillRect(x, y, c.ancho, c.alto);

            // Los cantos también se disuelven: una línea recta de punta a
            // punta volvería a dibujar la caja que acabamos de quitar.
            const canto = g.createLinearGradient(0, y + c.alto, 0, y);
            canto.addColorStop(0, 'rgba(255,255,255,0)');
            canto.addColorStop(.35, 'rgba(255,255,255,.5)');
            canto.addColorStop(.85, 'rgba(255,255,255,.5)');
            canto.addColorStop(1, 'rgba(255,255,255,0)');
            g.strokeStyle = canto;
            g.lineWidth = 2;
            for (const bx of [x + 1, x + c.ancho - 1]) {
                g.beginPath();
                g.moveTo(bx, y + c.alto);
                g.lineTo(bx, y);
                g.stroke();
            }

            const n = Nucleo.nivel === 0 ? 8 : 18;
            for (let i = 0; i < n; i++) {
                const sube = ((t * 0.34 + i / n) % 1);
                const py = y + c.alto * (1 - sube);
                const px = x + c.ancho * (0.5 + Math.sin(t * 1.6 + i * 2.1) * 0.36);
                g.globalAlpha = Math.sin(sube * Math.PI) * .9;
                g.fillStyle = i % 3 === 0 ? '#ff8ab8' : '#ffd23f';
                g.beginPath();
                g.ellipse(px, py, 6.5, 4, t * 2 + i, 0, Math.PI * 2);
                g.fill();
            }
            g.globalAlpha = 1;
        }
    }

    function dibujarCorazones(cx, cy, t) {
        for (const c of nivel.corazones) {
            if (corazonesTomados.has(c.indice)) continue;
            const x = c.x - cx;
            if (x > W + 70 || x < -70) continue;
            Meta.dibujarCorazon(g, x, c.y - cy, t, c.indice * 1.7);
        }
    }

    // Los corazones rotos no se recogen ni desaparecen — son un peligro
    // fijo, no un coleccionable. Parpadean siempre igual mientras estén
    // dentro de la pantalla.
    function dibujarPeligros(cx, cy, t) {
        if (!nivel.corazonesRotos) return;
        for (const p of nivel.corazonesRotos) {
            const x = p.x - cx;
            if (x > W + 70 || x < -70) continue;
            Meta.dibujarCorazonRoto(g, x, p.y - cy, t, p.x * 0.01);
        }
    }

    // ══════════════════════════════════════════════
    // LA CASA — un cottage de dos plantas, horneado una sola vez
    //
    // No es una silueta plana: tiene cimiento de piedra, tablazón en las
    // esquinas, contraventanas, jardineras con flores, un tejado con
    // hileras de tejas y su propio desnivel de luz, chimenea con humo,
    // y farol y ventanas encendidas — el mismo nivel de detalle que ya
    // lleva el resto del escenario (colinas, árboles, montañas), sólo
    // que horneado en su propio lienzo porque únicamente existe en el
    // capítulo 5. Las medidas son fijas (constantes de diseño, no CSS).
    // ══════════════════════════════════════════════
    let casitaHorneada = null;
    let casitaGeom = null;

    function hornearCasita() {
        if (casitaHorneada) return casitaHorneada;

        const ESC = 2;                 // supersample: bordes nítidos
        // Referencia de tamaño: la puerta debe quedar un poco más alta
        // que el personaje (ALTO_CUERPO = 112px). K=2 la deja en 132px
        // — el resto de la casa escala con ella, para que la fachada
        // entera se sienta de ese mismo tamaño "de verdad", no de juguete.
        const K = 2;
        const AW = 300 * K, AH = 300 * K;      // lienzo de trabajo
        const lienzoCasa = document.createElement('canvas');
        lienzoCasa.width = AW * ESC; lienzoCasa.height = AH * ESC;
        const c = lienzoCasa.getContext('2d');
        c.scale(ESC, ESC);

        const anchoCasa = 202 * K, altoPlanta = 74 * K;
        const bx = (AW - anchoCasa) / 2;
        const sueloY = AH - 26 * K;
        const y0 = sueloY;                     // línea del suelo
        const y1 = y0 - altoPlanta;             // techo planta baja
        const yTecho = y1 - altoPlanta;         // techo planta alta = arranque del tejado
        const picoY = yTecho - 76 * K;          // cumbrera
        const aleroIzq = bx - 22 * K, aleroDer = bx + anchoCasa + 22 * K;

        // ── Sombra en el suelo ──
        c.fillStyle = 'rgba(70,48,32,.18)';
        c.beginPath();
        c.ellipse(bx + anchoCasa / 2, sueloY + 10 * K, anchoCasa * 0.62, 12 * K, 0, 0, Math.PI * 2);
        c.fill();

        // ── Cimiento de piedra ──
        const gradPiedra = c.createLinearGradient(0, y0 - 16 * K, 0, y0 + 8 * K);
        gradPiedra.addColorStop(0, '#b9ada0');
        gradPiedra.addColorStop(1, '#8d8377');
        c.fillStyle = gradPiedra;
        c.fillRect(bx - 6 * K, y0 - 16 * K, anchoCasa + 12 * K, 24 * K);
        c.strokeStyle = 'rgba(60,52,44,.35)';
        c.lineWidth = 1.4 * K;
        // Hiladas de piedra irregulares: unos cuantos rectángulos, no una
        // textura procedural cara — igual de creíble a esta escala.
        let px = bx - 6 * K;
        let fila = 0;
        while (px < bx + anchoCasa + 6 * K) {
            const w = (16 + ((px * 7) % 11)) * K;
            c.strokeRect(px, y0 - 16 * K + (fila % 2) * 12 * K, w, 12 * K);
            px += w;
        }

        // ── Paredes: planta baja y planta alta, tonos ligeramente
        //    distintos para que se lea el desnivel de piso ──
        const gradP1 = c.createLinearGradient(0, y1, 0, y0);
        gradP1.addColorStop(0, '#fff4e2');
        gradP1.addColorStop(1, '#f2d9ae');
        c.fillStyle = gradP1;
        c.fillRect(bx, y1, anchoCasa, altoPlanta);

        const gradP2 = c.createLinearGradient(0, yTecho, 0, y1);
        gradP2.addColorStop(0, '#fff8ec');
        gradP2.addColorStop(1, '#f7e2bc');
        c.fillStyle = gradP2;
        c.fillRect(bx, yTecho, anchoCasa, altoPlanta);

        // Línea de forjado entre plantas (una sombra fina, no un CSS border)
        c.fillStyle = 'rgba(120,90,60,.25)';
        c.fillRect(bx, y1 - 2 * K, anchoCasa, 3 * K);

        // Tablazón de esquina (le da estructura, evita el look "cartón")
        c.fillStyle = 'rgba(140,105,70,.55)';
        c.fillRect(bx, yTecho, 7 * K, y0 - yTecho);
        c.fillRect(bx + anchoCasa - 7 * K, yTecho, 7 * K, y0 - yTecho);

        // ── Ventana: dibuja marco, cristal, cruz, contraventanas y
        //    jardinera con flores. `encendida` decide el tono del vidrio,
        //    pero el brillo que PARPADEA se pinta aparte, cada fotograma. ──
        function ventana(vx, vy, w, h, jardinera) {
            c.fillStyle = '#6b452c';
            c.fillRect(vx - 4 * K, vy - 4 * K, w + 8 * K, h + 8 * K);
            const vidrio = c.createLinearGradient(0, vy, 0, vy + h);
            vidrio.addColorStop(0, '#ffedb8');
            vidrio.addColorStop(1, '#f7c96a');
            c.fillStyle = vidrio;
            c.fillRect(vx, vy, w, h);
            c.strokeStyle = '#6b452c';
            c.lineWidth = Math.max(2 * K, w * 0.05);
            c.beginPath();
            c.moveTo(vx + w / 2, vy); c.lineTo(vx + w / 2, vy + h);
            c.moveTo(vx, vy + h / 2); c.lineTo(vx + w, vy + h / 2);
            c.stroke();
            // Contraventanas
            c.fillStyle = '#7d9a72';
            c.fillRect(vx - 15 * K, vy - 2 * K, 10 * K, h + 4 * K);
            c.fillRect(vx + w + 5 * K, vy - 2 * K, 10 * K, h + 4 * K);
            c.strokeStyle = 'rgba(50,64,44,.4)'; c.lineWidth = 1 * K;
            for (const sx of [vx - 15 * K, vx + w + 5 * K]) {
                for (let i = 1; i < 4; i++) {
                    c.beginPath(); c.moveTo(sx, vy - 2 * K + (h + 4 * K) * i / 4);
                    c.lineTo(sx + 10 * K, vy - 2 * K + (h + 4 * K) * i / 4); c.stroke();
                }
            }
            // Repisa
            c.fillStyle = '#5c3d28';
            c.fillRect(vx - 9 * K, vy + h + 2 * K, w + 18 * K, 5 * K);
            if (jardinera) {
                c.fillStyle = '#8a5a3b';
                c.fillRect(vx - 9 * K, vy + h + 7 * K, w + 18 * K, 9 * K);
                const flores = ['#ff8ab8', '#ffd23f', '#ff6f6f', '#fff'];
                for (let i = 0; i < 6; i++) {
                    const fx = vx - 4 * K + i * ((w + 8 * K) / 5);
                    c.fillStyle = '#6a9a5a';
                    c.beginPath(); c.moveTo(fx, vy + h + 7 * K); c.lineTo(fx, vy + h - 2 * K); c.stroke();
                    c.fillStyle = flores[i % flores.length];
                    c.beginPath(); c.arc(fx, vy + h - 2 * K, 3.4 * K, 0, Math.PI * 2); c.fill();
                }
            }
        }

        // Ventana planta alta (centrada)
        ventana(bx + anchoCasa / 2 - 20 * K, yTecho + 20 * K, 40 * K, 34 * K, false);
        // Ventana planta baja (izquierda, con jardinera — la más vista)
        ventana(bx + 26 * K, y1 + 22 * K, 46 * K, 38 * K, true);

        // ── Puerta: marco, hoja con paneles, cristalera superior,
        //    pomo y un pequeño porche con dos escalones de piedra ──
        //
        // pdx se calcula por el CANTO DERECHO DEL MARCO, no por el centro
        // de la puerta — el marco sobresale `margenMarco` a cada lado de
        // la hoja, así que si se posiciona por el centro es fácil que ese
        // sobrante se salga de la pared sin que se note en el número.
        // Eso fue justo el bug: con la puerta más grande, el marco
        // terminaba varios píxeles más allá del canto de la fachada.
        const puertaW = 46 * K, puertaH = 66 * K;
        const margenMarco = 5 * K;    // lo que el marco sobresale a cada lado de la hoja
        const margenPared = 20 * K;   // aire entre el marco y el canto de la fachada
        const pdx = bx + anchoCasa - margenPared - margenMarco - puertaW, pdy = y0 - puertaH;
        c.fillStyle = '#6b452c';
        c.fillRect(pdx - 5 * K, pdy - 14 * K, puertaW + 10 * K, puertaH + 14 * K);
        const gradPuerta = c.createLinearGradient(0, pdy, 0, y0);
        gradPuerta.addColorStop(0, '#9a6a45');
        gradPuerta.addColorStop(1, '#7a4f30');
        c.fillStyle = gradPuerta;
        c.fillRect(pdx, pdy, puertaW, puertaH);
        // Cristalera superior de la puerta
        c.fillStyle = '#ffe9ac';
        c.fillRect(pdx + 7 * K, pdy - 10 * K, puertaW - 14 * K, 10 * K);
        c.strokeStyle = '#6b452c'; c.lineWidth = 1.6 * K;
        c.strokeRect(pdx + 7 * K, pdy - 10 * K, puertaW - 14 * K, 10 * K);
        // Paneles tallados
        c.strokeStyle = 'rgba(50,30,15,.5)'; c.lineWidth = 1.6 * K;
        c.strokeRect(pdx + 6 * K, pdy + 8 * K, puertaW - 12 * K, puertaH * 0.36);
        c.strokeRect(pdx + 6 * K, pdy + puertaH * 0.52, puertaW - 12 * K, puertaH * 0.36);
        // Pomo
        c.fillStyle = '#e8c463';
        c.beginPath(); c.arc(pdx + puertaW - 9 * K, pdy + puertaH * 0.55, 2.6 * K, 0, Math.PI * 2); c.fill();
        // Escalones de piedra
        c.fillStyle = '#c9bdae';
        c.fillRect(pdx - 14 * K, y0, puertaW + 28 * K, 7 * K);
        c.fillRect(pdx - 20 * K, y0 + 7 * K, puertaW + 40 * K, 8 * K);

        // Farol sobre la puerta
        const farolX = pdx + puertaW / 2, farolY = pdy - 24 * K;
        c.strokeStyle = '#4a3628'; c.lineWidth = 2.4 * K;
        c.beginPath(); c.moveTo(farolX, farolY + 14 * K); c.lineTo(farolX, farolY); c.stroke();
        c.fillStyle = '#4a3628';
        c.fillRect(farolX - 6 * K, farolY - 10 * K, 12 * K, 12 * K);
        c.fillStyle = '#ffe9ac';
        c.fillRect(farolX - 4 * K, farolY - 8 * K, 8 * K, 8 * K);

        // ── Tejado a dos aguas, con hileras de tejas y aleros ──
        c.fillStyle = '#a8503c';
        c.beginPath();
        c.moveTo(aleroIzq, yTecho + 6 * K);
        c.lineTo(bx + anchoCasa / 2, picoY);
        c.lineTo(aleroDer, yTecho + 6 * K);
        c.lineTo(aleroDer - 10 * K, yTecho + 14 * K);
        c.lineTo(bx + anchoCasa / 2, picoY + 12 * K);
        c.lineTo(aleroIzq + 10 * K, yTecho + 14 * K);
        c.closePath();
        c.fill();
        // Sombra bajo el alero (le da grosor al tejado)
        c.fillStyle = 'rgba(70,30,20,.35)';
        c.beginPath();
        c.moveTo(aleroIzq, yTecho + 6 * K); c.lineTo(aleroIzq + 10 * K, yTecho + 14 * K);
        c.lineTo(aleroDer - 10 * K, yTecho + 14 * K); c.lineTo(aleroDer, yTecho + 6 * K);
        c.lineTo(aleroDer, yTecho + 9 * K); c.lineTo(aleroIzq, yTecho + 9 * K);
        c.closePath();
        c.fill();
        // Tejas: filas curvas alternando tono, del alero hacia la cumbrera
        c.save();
        c.beginPath();
        c.moveTo(aleroIzq + 10 * K, yTecho + 14 * K);
        c.lineTo(bx + anchoCasa / 2, picoY + 12 * K);
        c.lineTo(aleroDer - 10 * K, yTecho + 14 * K);
        c.lineTo(aleroDer, yTecho + 6 * K);
        c.lineTo(bx + anchoCasa / 2, picoY);
        c.lineTo(aleroIzq, yTecho + 6 * K);
        c.closePath();
        c.clip();
        for (let fila = 0; fila < 8; fila++) {
            const fy = yTecho + 10 * K - fila * 15 * K;
            c.fillStyle = fila % 2 === 0 ? 'rgba(120,64,46,.55)' : 'rgba(150,84,60,.4)';
            for (let tx = aleroIzq - 10 * K; tx < aleroDer + 10 * K; tx += 18 * K) {
                c.beginPath();
                c.arc(tx + (fila % 2) * 9 * K, fy, 9 * K, Math.PI, 0);
                c.fill();
            }
        }
        c.restore();

        // Chimenea, en la falda derecha del tejado
        const chimX = bx + anchoCasa * 0.72, chimW = 24 * K;
        const fraccion = (chimX - (bx + anchoCasa / 2)) / (aleroDer - (bx + anchoCasa / 2));
        const chimYtejado = picoY + fraccion * (yTecho - picoY);
        c.fillStyle = '#8d6656';
        c.fillRect(chimX, 28 * K, chimW, chimYtejado - 28 * K + 6 * K);
        c.fillStyle = '#6f4d40';
        c.fillRect(chimX - 4 * K, 24 * K, chimW + 8 * K, 10 * K);
        c.strokeStyle = 'rgba(50,32,24,.4)'; c.lineWidth = 1.2 * K;
        for (let i = 1; i < 5; i++) {
            c.beginPath(); c.moveTo(chimX, 28 * K + i * 14 * K); c.lineTo(chimX + chimW, 28 * K + i * 14 * K); c.stroke();
        }

        casitaHorneada = lienzoCasa;
        // Coordenadas relevantes que dibujarCasita() necesita cada fotograma
        // (ventanas para el brillo parpadeante, chimenea para el humo).
        casitaGeom = {
            anchoLienzo: AW, altoLienzo: AH, anchoCasa, sueloY,
            ventanaAlta: { x: bx + anchoCasa / 2, y: yTecho + 37 * K },
            ventanaBaja: { x: bx + 49 * K, y: y1 + 41 * K },
            farol: { x: farolX, y: farolY - 4 * K },
            chimenea: { x: chimX + chimW / 2, y: 26 * K },
            puertaH                                         // para dibujarCasita(): referencia de tamaño
        };
        return casitaHorneada;
    }

    // Humo de la chimenea: unos cuantos círculos subiendo y disolviéndose,
    // demasiado barato para hornear y demasiado vivo para no animarlo.
    function dibujarHumo(x, y, t, escala) {
        for (let i = 0; i < 4; i++) {
            const f = ((t * 0.12 + i / 4) % 1);
            const py = y - f * 46 * escala;
            const px = x + Math.sin(t * 0.5 + i * 2) * 6 * escala * f;
            g.globalAlpha = Math.sin(f * Math.PI) * .32;
            g.fillStyle = '#e8e2da';
            g.beginPath();
            g.arc(px, py, (4 + f * 7) * escala, 0, Math.PI * 2);
            g.fill();
        }
        g.globalAlpha = 1;
    }

    // La casa del epílogo: una fachada horneada una sola vez (dos plantas,
    // tejado a dos aguas, chimenea, jardineras) más un brillo de ventanas
    // que sí se repinta cada fotograma, para que se vea encendida y viva.
    function dibujarCasita(cx, cy, t) {
        const c = nivel.casa;
        const x = c.x - cx;
        if (x > W + 500 || x + c.ancho < -500) return;

        const bake = hornearCasita();
        const geom = casitaGeom;
        const sueloY = nivel.plataformas[0].y - cy;
        const bx = x + c.ancho / 2 - geom.anchoCasa / 2 - (geom.anchoLienzo - geom.anchoCasa) / 2;
        const by = sueloY - geom.sueloY;

        // El lienzo horneado va al doble de tamaño (ESC=2) para que los
        // bordes salgan nítidos — hay que volver a encogerlo aquí al
        // dibujarlo, o sale exactamente el doble de grande de lo que toca.
        g.drawImage(bake, bx, by, geom.anchoLienzo, geom.altoLienzo);

        const parp = 0.85 + Math.sin(t * 1.1) * 0.1;
        const escalaHalo = geom.puertaH / 66;   // sigue creciendo con K, sin otro número mágico
        for (const v of [geom.ventanaAlta, geom.ventanaBaja]) {
            const vx = bx + v.x, vy = by + v.y;
            const r = 42 * escalaHalo;
            const halo = g.createRadialGradient(vx, vy, 0, vx, vy, r);
            halo.addColorStop(0, `rgba(255,222,150,${.42 * parp})`);
            halo.addColorStop(1, 'rgba(255,222,150,0)');
            g.fillStyle = halo;
            g.beginPath(); g.arc(vx, vy, r, 0, Math.PI * 2); g.fill();
        }
        const fx = bx + geom.farol.x, fy = by + geom.farol.y;
        const rf = 26 * escalaHalo;
        const haloFarol = g.createRadialGradient(fx, fy, 0, fx, fy, rf);
        haloFarol.addColorStop(0, `rgba(255,214,140,${.5 * parp})`);
        haloFarol.addColorStop(1, 'rgba(255,214,140,0)');
        g.fillStyle = haloFarol;
        g.beginPath(); g.arc(fx, fy, rf, 0, Math.PI * 2); g.fill();

        dibujarHumo(bx + geom.chimenea.x, by + geom.chimenea.y, t, escalaHalo);
    }

    function render(alpha, t) {
        const cx = cam.despX, cy = cam.despY;

        escena.dibujarFondo(g, cx, cy, t, avanceMax);
        
        // Oscurecimiento del cielo para la batalla
        if (oscuridadCielo > 0) {
            g.fillStyle = `rgba(30, 15, 45, ${oscuridadCielo})`;
            g.fillRect(0, 0, W, H);
        }

        dibujarPlataformas(cx, cy, t);
        Flora.dibujarVivas(g, cx, cy, W, t);
        dibujarCorrientes(cx, cy, t);

        if (nivel.portal) {
            const p = nivel.portal;
            Meta.dibujarPortal(g,
                { x: p.x - cx, y: p.y - cy, ancho: p.ancho, alto: p.alto },
                nivel.corazones.length ? corazonesTomados.size / nivel.corazones.length : 1,
                t, escena.cfg.especies);
        }
        if (nivel.casa) dibujarCasita(cx, cy, t);

        dibujarCorazones(cx, cy, t);
        dibujarPeligros(cx, cy, t);
        
        if (window.Jefe && Jefe.activo) {
            Jefe.dibujar(g, cx, cy);
        }
        
        Companero.dibujar(g, companero, cx, cy, t);

        // El cuerpo dibujado es una mezcla entre el paso de física
        // anterior y el actual: es lo que hace que se vea fluido aunque
        // la física corra a otra cadencia que la pantalla.
        const vista = Object.assign({}, jugador);
        vista.x = Nucleo.mezcla(previo.x, jugador.x, alpha);
        vista.y = Nucleo.mezcla(previo.y, jugador.y, alpha);
        Personaje.dibujar(g, arteJugador, vista, cx, cy, t);

        Particulas.dibujar(g, cx, cy, W);
        escena.dibujarFrente(g, cx);

        pasarBloom();

        dibujarHud(cx, t);
    }

    // ══════════════════════════════════════════════
    // BLOOM
    //
    // Es el pase que más cambia el aspecto del juego, y en canvas 2D no
    // hay shaders para hacerlo bien. El truco:
    //   1. copiar la escena a 1/4 de tamaño
    //   2. multiplicarla por sí misma → elevar al cuadrado apaga los
    //      tonos medios y deja sólo lo muy claro. Es un umbral gratis.
    //   3. bajar a 1/8 y volver a subir → el filtrado bilineal de
    //      drawImage hace de desenfoque, sin tocar un solo píxel a mano
    //   4. teñir de ámbar y componer con 'lighter'
    //
    // Cuatro drawImage diminutos y uno grande. En nivel de calidad 0 se
    // salta entero.
    // ══════════════════════════════════════════════
    function pasarBloom() {
        if (!bufA || Nucleo.nivel === 0) return;
        const a = bufA.getContext('2d');
        const b = bufB.getContext('2d');
        const c = bufC.getContext('2d');

        a.globalCompositeOperation = 'source-over';
        a.clearRect(0, 0, bufA.width, bufA.height);
        a.drawImage(lienzo, 0, 0, bufA.width, bufA.height);

        c.globalCompositeOperation = 'source-over';
        c.clearRect(0, 0, bufC.width, bufC.height);
        c.drawImage(bufA, 0, 0);

        // Se multiplica DOS veces (x⁴, no x²). Con una sola pasada el
        // umbral era tan flojo que hasta los tonos medios entraban en el
        // resplandor, y la escena entera salía lavada y sin contraste —
        // el error clásico de pasarse de bloom. Elevando a la cuarta,
        // sólo brillan de verdad el sol, los corazones y los destellos.
        a.globalCompositeOperation = 'multiply';
        a.drawImage(bufC, 0, 0);
        a.drawImage(bufC, 0, 0);

        b.globalCompositeOperation = 'source-over';
        b.clearRect(0, 0, bufB.width, bufB.height);
        b.drawImage(bufA, 0, 0, bufB.width, bufB.height);

        a.globalCompositeOperation = 'source-over';
        a.clearRect(0, 0, bufA.width, bufA.height);
        a.drawImage(bufB, 0, 0, bufA.width, bufA.height);

        // Tinte ámbar: el resplandor de un prado al sol es dorado, no
        // blanco. Sin esto el bloom lava los colores hacia el gris claro.
        a.globalCompositeOperation = 'multiply';
        a.fillStyle = '#ffe0a8';
        a.fillRect(0, 0, bufA.width, bufA.height);
        a.globalCompositeOperation = 'source-over';

        g.save();
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = Nucleo.nivel === 1 ? .14 : .2;
        g.drawImage(bufA, 0, 0, W, H);
        g.restore();
    }

    // ══════════════════════════════════════════════
    // RENDER — HUD
    // ══════════════════════════════════════════════
    function dibujarHud(cx, t) {
        const total = nivel.corazones.length;
        if (total) {
            const tomados = corazonesTomados.size;
            const R = 11, paso = 30;
            const x0 = 26, y0 = 30;
            const lat = latido.v;

            // Cápsula de fondo
            const anchoCaja = paso * total + 20;
            g.save();
            g.fillStyle = 'rgba(255,250,242,.72)';
            g.strokeStyle = 'rgba(245,166,35,.3)';
            g.lineWidth = 1.5;
            g.beginPath();
            g.roundRect(x0 - 12, y0 - 20, anchoCaja, 42, 21);
            g.fill(); g.stroke();

            for (let i = 0; i < total; i++) {
                const px = x0 + i * paso + R, py = y0;
                const lleno = i < tomados;
                const esc = lleno ? 1 + (i === tomados - 1 ? lat * .34 : 0) : .82;
                g.save();
                g.translate(px, py);
                g.scale(esc, esc);
                if (lleno) {
                    const s = Meta.hornearCorazon(R);
                    g.drawImage(s, -s.width / 2, -s.height / 2);
                } else {
                    Meta.trazarCorazon(g, R);
                    g.fillStyle = 'rgba(255,158,196,.16)';
                    g.fill();
                    g.strokeStyle = 'rgba(232,71,127,.45)';
                    g.lineWidth = 1.6;
                    g.stroke();
                }
                g.restore();
            }
            g.restore();
        }

        dibujarVidas();
        dibujarBrujula(cx);
    }

    // Fila de vidas, justo debajo de la cápsula de corazones. Sólo se
    // dibuja en capítulos que de verdad tienen corazones rotos — en los
    // que no, no hay nada que perder y no hace falta el aviso.
    function dibujarVidas() {
        if (!nivel.corazonesRotos || !nivel.corazonesRotos.length) return;
        const R = 8.5, paso = 22;
        const x0 = 26 + R, y0 = 30 + 34;
        g.save();
        for (let i = 0; i < VIDAS_MAX; i++) {
            const viva = i < vidas;
            const s = viva ? Meta.hornearCorazon(R) : Meta.hornearCorazonRoto(R);
            g.globalAlpha = viva ? 1 : .8;
            g.drawImage(s, x0 + i * paso - s.width / 2, y0 - s.height / 2);
        }
        g.restore();
    }

    // Flecha al borde de la pantalla apuntando a lo que toca hacer: al
    // corazón más cercano que falte, o al portal si ya están todos.
    // Sin esto, en un nivel de 3000 px de ancho es perfectamente posible
    // no encontrar nunca la meta y no saber por qué no pasas.
    function dibujarBrujula(cx) {
        let objetivoX = null;
        if (nivel.casa) {
            objetivoX = nivel.casa.x + nivel.casa.ancho / 2;
        } else if (portalAbierto) {
            objetivoX = nivel.portal.x + nivel.portal.ancho / 2;
        } else {
            let mejor = Infinity;
            for (const c of nivel.corazones) {
                if (corazonesTomados.has(c.indice)) continue;
                const d = Math.abs(c.x - (jugador.x + 18));
                if (d < mejor) { mejor = d; objetivoX = c.x; }
            }
        }
        if (objetivoX === null) return;

        const px = objetivoX - cx;
        if (px > 40 && px < W - 40) return;    // ya se ve: no hace falta

        const der = px >= W - 40;
        const x = der ? W - 30 : 30;
        const y = H * 0.42;
        const s = der ? 1 : -1;

        g.save();
        g.globalAlpha = .82;
        g.translate(x, y);
        g.fillStyle = portalAbierto ? '#ffd23f' : '#ff8ab8';
        g.beginPath();
        g.moveTo(s * 11, 0);
        g.lineTo(-s * 7, -11);
        g.lineTo(-s * 7, 11);
        g.closePath();
        g.fill();
        g.restore();
    }

    // ══════════════════════════════════════════════
    // BUCLE
    // ══════════════════════════════════════════════
    let acumulador = 0, tPrevio = 0;
    const DT_MAX = 0.25;
    const PASOS_MAX = 8;

    function cuadro(ahora) {
        if (!corriendo) return;
        requestAnimationFrame(cuadro);

        const dt = Math.min(DT_MAX, (ahora - tPrevio) / 1000 || 0);
        tPrevio = ahora;
        tGlobal += dt;

        Entrada.actualizar();

        acumulador += dt;
        let pasos = 0;
        while (acumulador >= Fisica.PASO_FIJO && pasos < PASOS_MAX) {
            previo = Object.assign({}, jugador);
            pasoFisica(Entrada);
            acumulador -= Fisica.PASO_FIJO;
            pasos++;
        }
        // Si se venía muy atrasado se tira la deuda, en vez de arrastrar
        // una espiral de la que el bucle ya no sale.
        if (pasos === PASOS_MAX) acumulador = 0;

        if (Entrada.saltoPulsado) Subtitulos.avanzar();

        const impacto = jugador.impactoCaida;
        Personaje.actualizar(arteJugador, jugador, dt);
        if (impacto > 0) Camara.sacudir(cam, impacto / Fisica.CAIDA_MAX);

        Companero.actualizar(companero, jugador, nivel, dt);
        Camara.actualizar(cam, jugador, nivel, dt);
        Flora.actualizar(dt);
        Particulas.actualizar(dt, tGlobal);
        latido.paso(dt);

        if (Nucleo.nivel > 0) {
            ambienteAcum += dt;
            if (ambienteAcum > 0.42) {
                ambienteAcum = 0;
                Particulas.petaloAmbiente(cam.despX, W, H);
                if (Math.random() < 0.12) {
                    Particulas.mariposa(cam.despX + Nucleo.rnd(0, W),
                        cam.despY + Nucleo.rnd(H * .3, H * .7));
                }
            }
        }

        Entrada.limpiarFlancos();
        render(acumulador / Fisica.PASO_FIJO, tGlobal);
    }

    // ══════════════════════════════════════════════
    // API
    // ══════════════════════════════════════════════
    function iniciar(quienElegido, indice) {
        quien = quienElegido || 'carlo';
        juegoTerminado = false;
        cargarCapitulo(indice || 0, false);
        if (!corriendo) {
            corriendo = true;
            tPrevio = performance.now();
            requestAnimationFrame(cuadro);
        }
    }

    function irACapitulo(indice) {
        juegoTerminado = false;
        cargarCapitulo(indice, false);
    }

    window.addEventListener('resize', medir);
    window.addEventListener('orientationchange', medir);
    // Al entrar o salir de fullscreen el viewport cambia: hay que remedir
    window.addEventListener('fullscreenchange', medir);
    window.addEventListener('webkitfullscreenchange', medir);

    // ══════════════════════════════════════════════
    // PANTALLA COMPLETA
    // Compatible con Safari (webkit) y el resto de navegadores.
    // ══════════════════════════════════════════════
    function enPantallaCompleta() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement);
    }

    function entrarPantallaCompleta() {
        const el = document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    }

    function salirPantallaCompleta() {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }

    function toggleFullscreen() {
        enPantallaCompleta() ? salirPantallaCompleta() : entrarPantallaCompleta();
    }

    // Actualizar el icono del botón al cambiar el estado de fullscreen
    function actualizarBotonFullscreen() {
        const btn = document.getElementById('btn-fullscreen');
        if (!btn) return;
        btn.textContent = enPantallaCompleta() ? '⛶' : '⛶';
        btn.setAttribute('aria-label', enPantallaCompleta() ? 'Salir de pantalla completa' : 'Pantalla completa');
        btn.classList.toggle('activo', enPantallaCompleta());
    }

    const btnFs = document.getElementById('btn-fullscreen');
    if (btnFs) {
        btnFs.addEventListener('click', (e) => {
            e.stopPropagation(); // que no avance el diálogo
            toggleFullscreen();
        });
    }
    window.addEventListener('fullscreenchange', actualizarBotonFullscreen);
    window.addEventListener('webkitfullscreenchange', actualizarBotonFullscreen);

    return {
        medir, iniciar, irACapitulo,
        get personaje() { return quien; },
        set personaje(v) { quien = v; },
        estado() {
            return {
                capitulo: capituloIndice, quien,
                x: jugador && Math.round(jugador.x), y: jugador && Math.round(jugador.y),
                enSuelo: jugador && jugador.enSuelo,
                planeando: jugador && jugador.planeando,
                enCorriente: jugador && jugador.enCorriente,
                estadoArte: arteJugador && arteJugador.estado,
                corazones: corazonesTomados.size + '/' + (nivel ? nivel.corazones.length : 0),
                vidas, vidasMax: VIDAS_MAX,
                portalAbierto,
                avance: avanceMax.toFixed(2),
                flores: Flora.contadorVivas, particulas: Particulas.contador,
                capituloTerminado, juegoTerminado
            };
        },
        // Ganchos de prueba: en paneles headless (document.hidden)
        // requestAnimationFrame no se dispara nunca, así que la única
        // forma de verificar es avanzar y pintar a mano.
        //
        // Avanza TODO, no sólo la física: si sólo avanzara el cuerpo, la
        // cámara se quedaría clavada en el punto de salida y cualquier
        // captura saldría con el personaje fuera de plano.
        _avanzarPasos(n, entradaFalsa) {
            const dt = Fisica.PASO_FIJO;
            for (let i = 0; i < n; i++) {
                previo = Object.assign({}, jugador);
                pasoFisica(entradaFalsa);
                Personaje.actualizar(arteJugador, jugador, dt);
                Companero.actualizar(companero, jugador, nivel, dt);
                Camara.actualizar(cam, jugador, nivel, dt);
                Flora.actualizar(dt);
                Particulas.actualizar(dt, tGlobal + i * dt);
                latido.paso(dt);
            }
            tGlobal += n * dt;
            return this.estado();
        },
        _nivel() { return nivel; },
        _pintar(t) {
            if (!nivel) return false;
            if (t !== undefined) tGlobal = t;
            Camara.actualizar(cam, jugador, nivel, 1 / 60);
            render(0, tGlobal);
            return true;
        }
    };
})();

window.Juego = Juego;
