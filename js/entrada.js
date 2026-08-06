// ═══════════════════════════════════════════════════════════════
// ENTRADA.JS — teclado y táctil, unificados
//
// Escritorio: flechas / WASD para moverse, arriba / W / espacio para
// saltar. Táctil: mitad izquierda de la pantalla es un mini-stick que
// arrastra hacia donde se quiere caminar; mitad derecha es el botón de
// salto. Ambos esquemas están siempre activos — no hay que elegir modo,
// el juego responde a lo que se use.
//
// fisica.js necesita distinguir "se acaba de pulsar" (para el jump
// buffer) de "sigue sujeto" (para el salto variable) de "se acaba de
// soltar" (para cortar el salto). Por eso el salto expone tres lecturas
// en vez de un solo booleano.
// ═══════════════════════════════════════════════════════════════

const Entrada = (function () {
    'use strict';

    let dirTeclado = 0;     // -1 izq, 0, 1 der — sólo teclado
    let dirTactil = 0;      // -1 izq, 0, 1 der — sólo el stick táctil
    let saltoTecladoAbajo = false;
    let saltoTactilAbajo = false;

    let saltoPulsadoEsteFrame = false;
    let saltoSoltadoEsteFrame = false;
    let saltoEstabaAbajo = false;

    // Mientras el menú de inicio o el panel final están abiertos, un
    // toque sobre sus botones no debe además mover o hacer saltar al
    // personaje que queda detrás. pausar()/reanudar() lo controlan.
    let pausado = false;

    // ── Teclado ──
    const TECLAS_IZQ = new Set(['ArrowLeft', 'KeyA']);
    const TECLAS_DER = new Set(['ArrowRight', 'KeyD']);
    const TECLAS_SALTO = new Set(['ArrowUp', 'KeyW', 'Space']);

    addEventListener('keydown', e => {
        if (pausado) return;
        if (TECLAS_IZQ.has(e.code)) { dirTeclado = -1; e.preventDefault(); }
        else if (TECLAS_DER.has(e.code)) { dirTeclado = 1; e.preventDefault(); }
        else if (TECLAS_SALTO.has(e.code)) {
            if (!saltoTecladoAbajo) saltoPulsadoEsteFrame = true;
            saltoTecladoAbajo = true;
            e.preventDefault();
        }
    });
    addEventListener('keyup', e => {
        if (TECLAS_IZQ.has(e.code) && dirTeclado === -1) dirTeclado = 0;
        else if (TECLAS_DER.has(e.code) && dirTeclado === 1) dirTeclado = 0;
        else if (TECLAS_SALTO.has(e.code)) {
            saltoTecladoAbajo = false;
            saltoSoltadoEsteFrame = true;
        }
    });
    // Si la pestaña pierde el foco a media pulsación, no debe quedar una
    // tecla "pegada" moviendo al personaje solo.
    addEventListener('blur', () => { dirTeclado = 0; saltoTecladoAbajo = false; });

    // ── Táctil ──
    // Un id de toque por zona: así un dedo moviendo y otro saltando no
    // se pisan entre sí.
    let idToqueMovimiento = null;
    let origenX = 0;

    function zonaSalto(x) { return x > innerWidth / 2; }

    addEventListener('touchstart', e => {
        if (pausado) return;
        for (const t of e.changedTouches) {
            if (zonaSalto(t.clientX)) {
                if (!saltoTactilAbajo) saltoPulsadoEsteFrame = true;
                saltoTactilAbajo = true;
            } else if (idToqueMovimiento === null) {
                idToqueMovimiento = t.identifier;
                origenX = t.clientX;
                dirTactil = 0;
            }
        }
    }, { passive: true });

    addEventListener('touchmove', e => {
        for (const t of e.changedTouches) {
            if (t.identifier === idToqueMovimiento) {
                const dx = t.clientX - origenX;
                const ZONA_MUERTA = 12;
                dirTactil = dx < -ZONA_MUERTA ? -1 : dx > ZONA_MUERTA ? 1 : 0;
            }
        }
    }, { passive: true });

    function soltarToque(e) {
        for (const t of e.changedTouches) {
            if (t.identifier === idToqueMovimiento) {
                idToqueMovimiento = null;
                dirTactil = 0;
            } else if (zonaSalto(t.clientX) && saltoTactilAbajo) {
                saltoTactilAbajo = false;
                saltoSoltadoEsteFrame = true;
            }
        }
    }
    addEventListener('touchend', soltarToque, { passive: true });
    addEventListener('touchcancel', soltarToque, { passive: true });

    // ══════════════════════════════════════════════
    // API — el bucle del juego llama actualizar() una vez por frame y
    // luego lee los getters; al final del frame limpia los flancos.
    // ══════════════════════════════════════════════
    function actualizar() {
        const abajoAhora = saltoTecladoAbajo || saltoTactilAbajo;
        if (abajoAhora && !saltoEstabaAbajo) saltoPulsadoEsteFrame = true;
        saltoEstabaAbajo = abajoAhora;
    }

    function limpiarFlancos() {
        saltoPulsadoEsteFrame = false;
        saltoSoltadoEsteFrame = false;
    }

    function pausar() {
        pausado = true;
        dirTeclado = 0; dirTactil = 0;
        saltoTecladoAbajo = false; saltoTactilAbajo = false;
        idToqueMovimiento = null;
        saltoPulsadoEsteFrame = false; saltoSoltadoEsteFrame = false;
    }

    function reanudar() { pausado = false; }

    return {
        actualizar,
        limpiarFlancos,
        pausar, reanudar,
        get direccion() {
            // El teclado gana si ambos están activos a la vez.
            return dirTeclado !== 0 ? dirTeclado : dirTactil;
        },
        get saltoMantenido() { return saltoTecladoAbajo || saltoTactilAbajo; },
        get saltoPulsado() { return saltoPulsadoEsteFrame; },
        get saltoSoltado() { return saltoSoltadoEsteFrame; }
    };
})();

window.Entrada = Entrada;
