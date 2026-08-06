// ═══════════════════════════════════════════════════════════════
// SELECCION.JS — elegir con quién se camina
//
// Los dos personajes son jugables y tienen EXACTAMENTE la misma física.
// No es pereza: si uno saltara más lejos, cada capítulo tendría que
// diseñarse dos veces o quedarse en el mínimo común de los dos. La
// diferencia es de identidad, no de ventaja — el color de la estela y
// el sonido del salto.
//
// El que no se elige no desaparece: se convierte en el compañero que
// espera al final de cada capítulo y que en el último corre al lado.
// ═══════════════════════════════════════════════════════════════

const Seleccion = (function () {
    'use strict';

    const panel = document.getElementById('seleccion');
    const elTitulo = document.getElementById('sel-titulo');
    const elSub = document.getElementById('sel-subtitulo');
    const elBtn = document.getElementById('sel-btn');
    const tarjetas = Array.prototype.slice.call(document.querySelectorAll('#sel-tarjetas .tarjeta'));

    let elegido = null;
    let alConfirmar = null;

    const cfg = (window.GUION && GUION.seleccion) || {};
    if (elTitulo) elTitulo.textContent = cfg.titulo || '¿Con quién quieres caminar?';
    if (elSub) elSub.textContent = cfg.subtitulo || '';
    if (elBtn) elBtn.textContent = cfg.boton || 'Caminar';

    tarjetas.forEach(t => {
        const quien = t.dataset.quien;
        const datos = cfg[quien] || {};
        const nombre = t.querySelector('[data-nombre]');
        const detalle = t.querySelector('[data-detalle]');
        if (nombre) nombre.textContent = datos.nombre || Personaje.IDENTIDAD[quien].nombre;
        if (detalle) detalle.textContent = datos.detalle || '';

        t.addEventListener('click', () => marcar(quien));
    });

    function marcar(quien) {
        elegido = quien;
        tarjetas.forEach(t => {
            const activa = t.dataset.quien === quien;
            t.classList.toggle('activa', activa);
            t.setAttribute('aria-pressed', activa ? 'true' : 'false');
        });
        if (elBtn) elBtn.disabled = false;
        if (window.Sfx && Sfx.semilla) Sfx.semilla();
    }

    // Teclado: ←/→ para moverse entre las dos, Enter para confirmar.
    function alTeclado(e) {
        if (panel.hidden) return;
        if (e.key === 'ArrowLeft') { marcar('carlo'); e.preventDefault(); }
        else if (e.key === 'ArrowRight') { marcar('isabela'); e.preventDefault(); }
        else if (e.key === 'Enter' && elegido) { confirmar(); e.preventDefault(); }
    }

    function confirmar() {
        if (!elegido) return;
        panel.hidden = true;
        document.removeEventListener('keydown', alTeclado);
        if (alConfirmar) alConfirmar(elegido);
    }

    if (elBtn) elBtn.addEventListener('click', confirmar);

    function abrir(callback) {
        alConfirmar = callback;
        elegido = null;
        if (elBtn) elBtn.disabled = true;
        tarjetas.forEach(t => {
            t.classList.remove('activa');
            t.setAttribute('aria-pressed', 'false');
        });
        panel.hidden = false;
        document.addEventListener('keydown', alTeclado);
    }

    return { abrir };
})();

window.Seleccion = Seleccion;
