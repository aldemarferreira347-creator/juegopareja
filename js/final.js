// ═══════════════════════════════════════════════════════════════
// FINAL.JS — el panel de cierre, después del último capítulo
//
// juego.js llama a Final.mostrar() cuando ya no quedan más capítulos.
// No toca el juego por debajo: sólo pinta un panel encima, igual que
// la barra de subtítulos nunca pausa nada.
// ═══════════════════════════════════════════════════════════════

const Final = (function () {
    'use strict';

    const el = document.getElementById('final-panel');
    const elTitulo = document.getElementById('final-titulo');
    const elCuerpo = document.getElementById('final-cuerpo');
    const elFirma = document.getElementById('final-firma');
    const elBtn = document.getElementById('final-btn-reiniciar');
    const elBtnJuntos = document.getElementById('final-btn-juntos');

    let mostrado = false;

    function mostrar(quien) {
        if (mostrado || !el) return;
        mostrado = true;
        if (quien) el.dataset.quien = quien;

        const c = GUION.cartaFinal;
        if (c) {
            elTitulo.textContent = c.titulo || '';
            elCuerpo.innerHTML = '';
            (c.parrafos || []).forEach(p => {
                const parrafo = document.createElement('p');
                parrafo.textContent = p;
                elCuerpo.appendChild(parrafo);
            });
            elFirma.textContent = c.firma || '';
            if (elBtn) elBtn.textContent = c.botonReiniciar || 'Volver a caminar';
            if (elBtnJuntos) elBtnJuntos.textContent = c.botonJuntos || 'Caminar juntos →';
        }

        el.classList.add('visible');
        el.setAttribute('aria-hidden', 'false');
        if (window.Sfx && Sfx.fanfarria) Sfx.fanfarria();
        GUARDADO.escribir({ capitulo: 0, terminado: true });
    }

    if (elBtn) {
        elBtn.addEventListener('click', () => {
            GUARDADO.borrar();
            location.reload();
        });
    }

    // "Caminar juntos" no reinicia nada: lleva al epílogo (capítulo 5),
    // el único donde de verdad se ve a los dos caminando de la mano.
    if (elBtnJuntos) {
        elBtnJuntos.addEventListener('click', () => {
            el.classList.remove('visible');
            el.setAttribute('aria-hidden', 'true');
            Entrada.reanudar();
            if (window.Juego) Juego.irACapitulo(4);
        });
    }

    return { mostrar };
})();

window.Final = Final;
