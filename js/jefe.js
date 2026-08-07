/* ============================================================
   JEFE.JS — DISTANCIA

   Controla la entidad del Jefe (animación in-game, estado de vida,
   secuencias cinemáticas). Se dibuja como una grieta que parte el
   camino en dos — la distancia es literalmente el hueco entre las
   dos mitades — no una figura abstracta sin relación con su nombre.
   Se comunica con UI-Batalla para el DOM.
============================================================ */

const Jefe = (function () {
    'use strict';

    let activo = false;
    let vida = 3; // 3 preguntas = 3 vidas
    let x = 0, y = 0;
    let alto = 180, ancho = 120;
    let tiempo = 0;
    
    // Estados: 'esperando', 'emergiendo', 'preguntando', 'dano', 'derrotado'
    let estado = 'esperando';
    let preguntaActual = 0;
    
    // Muelle para animar daño y aparición
    let animacionY;
    let animacionAlpha;
    let sacudida = 0;
    
    // Callbacks
    let onBatallaInicio = null;
    let onPreguntaMostrar = null;
    let onBatallaFin = null;
    let onVidaPerdida = null; // Jugador pierde vida

    function iniciar(px, py, callbacks) {
        activo = true;
        vida = window.BaseDatosPreguntas ? window.BaseDatosPreguntas.length : 3;
        preguntaActual = 0;
        x = px;
        y = py;
        estado = 'esperando';
        tiempo = 0;
        sacudida = 0;
        
        animacionY = new Nucleo.Muelle(py + 300, 100, 15);
        animacionAlpha = new Nucleo.Muelle(0, 80, 10);
        
        onBatallaInicio = callbacks.inicio;
        onPreguntaMostrar = callbacks.mostrarPregunta;
        onBatallaFin = callbacks.fin;
        onVidaPerdida = callbacks.perderVida;
    }

    function detonarBatalla() {
        estado = 'emergiendo';
        animacionY.destino = y;
        animacionAlpha.destino = 1;
        sacudida = 15; // Sacudida inicial
        if (window.Sfx && Sfx.fanfarria) Sfx.fanfarria(); // TODO: Add specific boss sound if available
        if (onBatallaInicio) onBatallaInicio();
        
        // Tras 2 segundos de emerger, hacer la primera pregunta
        setTimeout(() => {
            if(estado === 'emergiendo') {
                estado = 'preguntando';
                lanzarPregunta();
            }
        }, 2500);
    }

    function lanzarPregunta() {
        if (!window.BaseDatosPreguntas || preguntaActual >= window.BaseDatosPreguntas.length) return;
        const pregunta = window.BaseDatosPreguntas[preguntaActual];
        if (onPreguntaMostrar) onPreguntaMostrar(pregunta);
    }

    function recibirRespuesta(indiceRespuesta) {
        if (!window.BaseDatosPreguntas || estado !== 'preguntando') return;
        const pregunta = window.BaseDatosPreguntas[preguntaActual];
        
        if (indiceRespuesta === pregunta.correcta) {
            // ÉXITO
            estado = 'dano';
            vida--;
            sacudida = 20;
            animacionY.v -= 60; // Knockback visual hacia arriba/atrás
            if (window.Sfx && Sfx.corazon) Sfx.corazon();
            Particulas.destello(x + ancho/2, y + alto/2, '#ffd23f');
            Subtitulos.mostrar(pregunta.exito, { prioridad: 'ahora' });
            
            setTimeout(() => {
                if (vida <= 0) {
                    derrotar();
                } else {
                    preguntaActual++;
                    estado = 'preguntando';
                    lanzarPregunta();
                }
            }, 2000);
            
        } else {
            // ERROR
            if (window.Sfx && Sfx.discusion) Sfx.discusion();
            Subtitulos.mostrar(pregunta.error, { prioridad: 'ahora' });
            if (onVidaPerdida) onVidaPerdida();
            sacudida = 10;
            // No avanza pregunta, el jugador debe intentarlo de nuevo (o recargar si pierde todas las vidas de jugador)
            setTimeout(() => {
                if (estado === 'preguntando') lanzarPregunta();
            }, 2500);
        }
    }

    // El jugador se quedó sin vidas respondiendo: Distancia gana este
    // asalto. No lo desactiva — eso lo decide juego.js una vez termina
    // la cinemática — sólo cambia su color a algo más frío y duro.
    function anunciarVictoria() {
        estado = 'ganador';
        sacudida = 18;
    }

    function derrotar() {
        estado = 'derrotado';
        animacionAlpha.destino = 0;
        animacionY.destino = y - 200; // Flota hacia arriba
        if (window.Sfx && Sfx.florecer) Sfx.florecer();
        
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                Particulas.destello(x + Nucleo.rnd(0, ancho), y + Nucleo.rnd(0, alto), '#ff9ec4');
            }, i * 100);
        }
        
        setTimeout(() => {
            activo = false;
            if (onBatallaFin) onBatallaFin();
        }, 2000);
    }

    function actualizar(dt, jugador) {
        if (!activo) return;
        tiempo += dt;
        animacionY.paso(dt);
        animacionAlpha.paso(dt);
        
        if (sacudida > 0) {
            sacudida = Math.max(0, sacudida - dt * 30);
        }
        
        // Trigger battle si el jugador se acerca (ejemplo: a 400px en el eje X) y está esperando
        if (estado === 'esperando') {
            const dist = (x - jugador.x);
            if (dist > 0 && dist < 400) {
                detonarBatalla();
            }
        }
    }

    // Una de las dos mitades que se alejan la una de la otra. `dentro`
    // marca de qué lado está el canto que mira hacia la grieta (+1 si
    // es el lado +x de esta masa, -1 si es el lado -x) — así el borde
    // de luz siempre queda pegado al vacío, nunca hacia afuera.
    function dibujarMasa(g, mx, my, dentro, r, colorBorde) {
        const cerca = dentro * r * 0.18;
        const lejos = -dentro * r * 1.05;
        g.fillStyle = '#241b2e';
        g.beginPath();
        g.moveTo(mx + cerca, my - r * 0.9);
        g.lineTo(mx + lejos * 0.55, my - r * 0.5);
        g.lineTo(mx + lejos, my + r * 0.1);
        g.lineTo(mx + lejos * 0.5, my + r * 0.9);
        g.lineTo(mx + cerca * 0.6, my + r * 0.65);
        g.lineTo(mx + cerca, my - r * 0.1);
        g.closePath();
        g.fill();

        g.strokeStyle = colorBorde;
        g.lineWidth = 2.4;
        g.beginPath();
        g.moveTo(mx + cerca, my - r * 0.9);
        g.lineTo(mx + cerca * 0.6, my + r * 0.65);
        g.stroke();
    }

    function dibujar(g, cx, cy) {
        if (!activo || animacionAlpha.v <= 0) return;

        const dx = (x - cx) + (Math.random() - 0.5) * sacudida;
        const dy = (animacionY.v - cy) + (Math.random() - 0.5) * sacudida;

        g.save();
        const alphaBase = Nucleo.lim(animacionAlpha.v, 0, 1);
        g.globalAlpha = alphaBase;

        // Distancia no es una figura sola: son dos mitades que se
        // alejan, con el vacío entre ellas como único cuerpo real. Esa
        // separación crece y encoge despacio, como si respirara.
        const flotacion = Math.sin(tiempo * 2) * 10;
        const centroX = dx + ancho / 2;
        const centroY = dy + alto / 2 + flotacion;
        const colorGrieta = estado === 'dano' ? '#ffd23f'
            : estado === 'ganador' ? '#ffe3d6'
            : '#8fb8ff';

        // Aura
        const aura = g.createRadialGradient(centroX, centroY, 0, centroX, centroY, alto * 1.05);
        aura.addColorStop(0, estado === 'dano' ? 'rgba(255,210,63,0.75)' : estado === 'ganador' ? 'rgba(255,140,120,0.6)' : 'rgba(40,32,58,0.9)');
        aura.addColorStop(0.55, 'rgba(74,58,92,0.45)');
        aura.addColorStop(1, 'rgba(40,32,58,0)');
        g.fillStyle = aura;
        g.fillRect(dx - ancho, dy - alto + flotacion, ancho * 3, alto * 3);

        // El camino, partido justo donde se abrió la grieta — el
        // sendero del juego, cortado en dos por Distancia.
        const sendaY = dy + alto * 0.86 + flotacion;
        const huecoSenda = ancho * 0.22;
        g.strokeStyle = 'rgba(255,255,255,0.16)';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(dx - ancho * 0.6, sendaY);
        g.lineTo(centroX - huecoSenda, sendaY);
        g.moveTo(centroX + huecoSenda, sendaY);
        g.lineTo(dx + ancho * 1.6, sendaY);
        g.stroke();

        // Las dos mitades, cada vez un poco más lejos la una de la otra.
        const r = alto * 0.4;
        const separacion = ancho * 0.16 + Math.sin(tiempo * 1.6) * ancho * 0.03;
        dibujarMasa(g, centroX - separacion, centroY, 1, r, colorGrieta);
        dibujarMasa(g, centroX + separacion, centroY, -1, r, colorGrieta);

        // La grieta de luz entre ambas: el vacío en sí, pulsando.
        const grietaAncho = separacion * 2;
        const grieta = g.createLinearGradient(centroX - grietaAncho / 2, 0, centroX + grietaAncho / 2, 0);
        grieta.addColorStop(0, 'rgba(0,0,0,0)');
        grieta.addColorStop(0.5, colorGrieta);
        grieta.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalAlpha = alphaBase * 0.85;
        g.fillStyle = grieta;
        g.fillRect(centroX - grietaAncho / 2, dy + r * 0.1 + flotacion, grietaAncho, r * 1.8);
        g.globalAlpha = alphaBase;

        // Motas arrastradas hacia el vacío desde ambos lados.
        g.fillStyle = colorGrieta;
        for (let i = 0; i < 6; i++) {
            const fase = (tiempo * 0.6 + i / 6) % 1;
            const lado = i % 2 === 0 ? -1 : 1;
            const mx = centroX + lado * ancho * 0.5 * (1 - fase);
            const my = centroY - r * 0.6 + r * 1.2 * (((i * 37) % 10) / 10);
            g.globalAlpha = alphaBase * (1 - fase);
            g.beginPath();
            g.arc(mx, my, 2 + (1 - fase) * 1.5, 0, Math.PI * 2);
            g.fill();
        }
        g.globalAlpha = alphaBase;

        // Barra de Vida del Jefe encima
        if (estado === 'preguntando' || estado === 'dano') {
            const vidaMax = window.BaseDatosPreguntas.length;
            const bw = 100;
            const bh = 8;
            const bx = dx + ancho/2 - bw/2;
            const by = dy - 30 + flotacion;
            
            g.fillStyle = 'rgba(0,0,0,0.3)';
            g.beginPath();
            g.roundRect(bx, by, bw, bh, 4);
            g.fill();
            
            if (vida > 0) {
                g.fillStyle = '#ff9ec4';
                g.beginPath();
                g.roundRect(bx, by, (vida / vidaMax) * bw, bh, 4);
                g.fill();
            }
        }
        
        g.restore();
    }

    function desactivar() {
        activo = false;
    }

    return {
        iniciar,
        desactivar,
        actualizar,
        dibujar,
        recibirRespuesta,
        anunciarVictoria,
        posicion() { return { x: x + ancho / 2, y: y + alto / 2 }; },
        get activo() { return activo; },
        get estado() { return estado; },
        get sacudida() { return sacudida; }
    };
})();

window.Jefe = Jefe;
