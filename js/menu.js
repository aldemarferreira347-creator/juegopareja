// ═══════════════════════════════════════════════════════════════
// MENU.JS — arranque, pantalla de inicio y desbloqueo de audio
//
// Va el último de todos los scripts porque es quien orquesta el
// arranque: espera a que los cuatro PNG estén cargados y medidos
// (sprites.js), mide el lienzo, y sólo entonces enseña el menú. Antes
// el juego arrancaba solo por detrás del menú; ahora no puede, porque
// sin los sprites medidos no hay ni caja de colisión ni escala.
//
// Es también el único gesto real del usuario disponible para desbloquear
// el audio: tanto Web Audio como el <audio> de música exigen que la
// primera reproducción salga de un clic o un toque de verdad.
//
// Flujo:  cargador → menú → [selección de personaje] → juego
// «Continuar» se salta la selección: retoma con el personaje que ya
// estaba elegido en la partida guardada.
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    const elCargador = document.getElementById('cargador');
    const elMenu = document.getElementById('menu-inicio');
    const elTitulo = document.getElementById('menu-titulo');
    const elSubtitulo = document.getElementById('menu-subtitulo');
    const elDetalle = document.getElementById('menu-continuar-detalle');
    const btnContinuar = document.getElementById('menu-btn-continuar');
    const btnEmpezar = document.getElementById('menu-btn-empezar');
    const audio = document.getElementById('musica-fondo');

    const m = (window.GUION && GUION.menu) || {};
    if (elTitulo) elTitulo.textContent = m.titulo || 'El Camino a Ti';
    if (elSubtitulo) elSubtitulo.textContent = m.subtitulo || '';

    const guardado = GUARDADO.leer();
    const hayProgreso = !!(guardado && guardado.capitulo > 0 && !guardado.terminado);

    if (hayProgreso) {
        btnContinuar.hidden = false;
        btnContinuar.textContent = m.botonContinuar || 'Continuar';
        elDetalle.hidden = false;
        elDetalle.textContent = m.continuarDetalle || '';
        btnEmpezar.textContent = m.botonReiniciar || 'Empezar de nuevo';
    } else {
        btnEmpezar.textContent = m.botonEmpezar || 'Empezar';
    }

    // Nadie puede mover al personaje mientras hay un panel encima: un
    // toque sobre un botón no debe colarse también como entrada de juego.
    Entrada.pausar();

    function desbloquearAudio() {
        if (window.Sfx) Sfx.init();
        if (audio) {
            audio.volume = .45;
            // Algunos móviles siguen bloqueando aun con gesto: si pasa,
            // el juego funciona igual, sólo que en silencio.
            audio.play().catch(() => { });
        }
    }

    const btnFullscreen = document.getElementById('btn-fullscreen');

    function jugar(quien, indice) {
        Entrada.reanudar();
        // Mostrar el botón de pantalla completa al entrar en el juego
        if (btnFullscreen) btnFullscreen.hidden = false;
        Juego.iniciar(quien, indice);
    }

    btnEmpezar.addEventListener('click', () => {
        desbloquearAudio();
        if (hayProgreso) GUARDADO.borrar();
        elMenu.hidden = true;
        Seleccion.abrir(quien => jugar(quien, 0));
    });

    if (hayProgreso) {
        btnContinuar.addEventListener('click', () => {
            desbloquearAudio();
            elMenu.hidden = true;
            jugar(guardado.quien || 'carlo', guardado.capitulo);
        });
    }

    // ══════════════════════════════════════════════
    // ARRANQUE
    // ══════════════════════════════════════════════
    Sprites.cargar().then(() => {
        Juego.medir();
        if (elCargador) elCargador.hidden = true;
        elMenu.hidden = false;
    }).catch(err => {
        console.error(err);
        if (elCargador) {
            elCargador.innerHTML = (location.protocol === 'file:')
                ? '<p>El navegador bloquea las imágenes cuando este archivo se abre con doble clic.<br>' +
                  'Hace falta abrirlo desde un servidor local — mira el <code>README.md</code> ' +
                  '(sección "Probarlo en tu PC").</p>'
                : '<p>No se pudieron cargar las imágenes de <code>img/</code>.<br>' +
                  'Comprueba que la carpeta está junto a <code>index.html</code>.</p>';
        }
    });
})();
