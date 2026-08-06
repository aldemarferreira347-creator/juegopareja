// ═══════════════════════════════════════════════════════════════
// GUARDADO.JS — progreso en localStorage
// Un solo lugar para la clave y el formato, así juego.js, menu.js y
// final.js nunca se desincronizan sobre cómo se guarda o se borra.
// ═══════════════════════════════════════════════════════════════

const GUARDADO = (function () {
    'use strict';

    const CLAVE = 'el-camino-progreso';

    function leer() {
        try {
            const bruto = localStorage.getItem(CLAVE);
            if (!bruto) return null;
            const datos = JSON.parse(bruto);
            return (datos && typeof datos.capitulo === 'number') ? datos : null;
        } catch (e) { return null; } // modo privado o JSON corrupto
    }

    function escribir(datos) {
        try { localStorage.setItem(CLAVE, JSON.stringify(datos)); }
        catch (e) { /* modo privado: no pasa nada, sólo no se guarda */ }
    }

    function borrar() {
        try { localStorage.removeItem(CLAVE); } catch (e) { /* modo privado */ }
    }

    return { CLAVE, leer, escribir, borrar };
})();

window.GUARDADO = GUARDADO;
