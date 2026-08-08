/* ============================================================
   GUION.JS — TODO EL TEXTO DEL JUEGO

   Este es el ÚNICO archivo que hay que tocar para cambiar lo que se
   lee. Ábrelo con el Bloc de notas o VS Code, cambia lo que quieras,
   guarda y recarga la página. Ningún otro archivo tiene texto visible.

   El texto ya está escrito para usarse tal cual — no lleva ninguna
   marca ni símbolo delante, porque cualquier símbolo puesto en el
   VALOR de una línea sale en pantalla, dentro del juego. Si quieres
   dejar tu propia nota para ti mismo, escríbela como comentario (con
   // delante), nunca dentro de las comillas.

   Cada capítulo tiene:
     · titulo / fecha  — lo que aparece arriba al empezar el capítulo
     · inicio          — líneas al entrar
     · final           — líneas al llegar al final del capítulo
     · coleccionables  — una por corazón (hay 5 por capítulo). Salen
                         al recogerlos, de paso.

   Las claves (amanecer, tarde, dorado, pleno) son las mismas que usan
   escenario.js y niveles.js — no cambies los nombres, sólo el texto
   de dentro.
   ============================================================ */

const GUION = {

  capitulos: {

    // ── Capítulo 1 — El primer hola (prado de mañana) ──
    amanecer: {
      titulo: "El primer hola",
      fecha: "16 de agosto de 2025",
      inicio: [
        "Todo empezó un 16 de agosto, con un hola que no sabía que lo iba a cambiar todo.",
        "Nunca tuve que compararte con nadie. Simplemente fuiste tú."
      ],
      final: [
        "Y ahí estabas, un poco más adelante, como ibas a estarlo siempre.",
        "Ese día no lo noté, pero ya había dejado de buscar a cualquier otra persona."
      ],
      coleccionables: [
        "Me acuerdo hasta de lo que llevabas puesto ese día.",
        "Dijiste algo que me hizo reír. No recuerdo qué fue, pero recuerdo la risa.",
        "Ese día el mundo se puso de otro color y yo ni cuenta me di.",
        "No tenía idea de todo lo que venía después. Menos mal que no la tenía.",
        "Si pudiera, volvería a ese 16 de agosto sólo para verte llegar otra vez."
      ]
    },

    // ── Capítulo 2 — Los jueves (islas al atardecer) ──
    tarde: {
      titulo: "Los jueves",
      fecha: "la distancia",
      inicio: [
        "Después vinieron los jueves — el único día de la semana que de verdad era nuestro.",
        "El resto de los días la pantalla ayudaba, pero nunca alcanzaba del todo."
      ],
      final: [
        "Cada isla de este camino fue un jueves esperado toda la semana.",
        "Ninguna distancia — ni de calendario ni de pantalla — logró que dejara de caminar hacia ti."
      ],
      coleccionables: [
        "Contaba los días como quien cuenta lo único que de verdad le importa.",
        "Una videollamada no reemplaza un abrazo, pero tu sonrisa hacía llevadera hasta la noche más larga.",
        "Aprendí a querer los jueves más que a cualquier otro día de la semana.",
        "Esperar también fue una manera de quererte — sólo que en silencio.",
        "Y cada jueves que llegaba, el mundo volvía a florecer un poco."
      ]
    },

    // ── Capítulo 3 — La pregunta (el ascenso dorado) ──
    dorado: {
      titulo: "La pregunta",
      fecha: "10 de abril de 2026",
      inicio: [
        "10 de abril de 2026. Una carta escrita y reescrita mil veces, y yo con el corazón en la garganta.",
        "Subí sin saber tu respuesta. Sólo sabía que tenía que preguntarte de una vez."
      ],
      final: [
        "Ahí estabas, esperando a que abrieras el sobre.",
        "Todo lo que subí a decirte — sin anillo, sin manilla, sólo con lo que siento — cupo en esa carta."
      ],
      coleccionables: [
        "Escribí y borré esa carta más veces de las que voy a admitir.",
        "Cada pétalo que sube es una frase que no me atreví a decir antes de ese día.",
        "Tenía miedo. Pero más miedo me daba no decírtelo nunca.",
        "Subir contigo pesa menos que quedarme abajo sin ti.",
        "Y de repente ya no daba miedo. Sólo ganas de que dijeras que sí."
      ]
    },

    // ── Capítulo 4 — A tu lado (campo abierto) ──
    pleno: {
      titulo: "A tu lado",
      fecha: "hoy",
      inicio: [
        "Y aquí seguimos.",
        "Ahora el camino ya no tiene huecos que saltar. Sólo tiene flores. Y te tiene a ti, a mi lado."
      ],
      final: [
        "Llegamos.",
        "Y de todo lo que hay al final de este camino, lo único que de verdad quería eras tú."
      ],
      coleccionables: [
        "De todo lo que pasó, esto es lo único que me llevo: a ti.",
        "No hacía falta ningún nivel más difícil que este para quererte tanto.",
        "Mira todo lo que floreció sólo porque tú pasaste por aquí.",
        "Contigo hasta lo difícil se camina bonito.",
        "Y si hubiera que hacer este camino otra vez, entero, lo vuelvo a hacer."
      ]
    },

    // ── Capítulo 5 — Nuestro hogar (epílogo, desde la carta) ──
    hogar: {
      titulo: "Nuestro hogar",
      fecha: "el resto del camino",
      inicio: [
        "De aquí en adelante ya no hay capítulos — sólo el camino de siempre.",
        "Caminemos juntos hasta la puerta."
      ],
      final: [],
      coleccionables: []
    }
  },

  // ── El objetivo ──
  // Lo que se dice al empezar un capítulo, al llegar al portal sin
  // haberlo completado, y al completarlo. {n} se sustituye por el número
  // que toque. Sin estas tres frases el jugador no sabe qué hacer.
  objetivo: {
    inicio: "Recoge los {n} corazones — el portal de flores se abre cuando estén todos.",
    faltan: "El portal todavía no se abre… faltan {n} corazones por aquí cerca.",
    abierto: "¡Ya están todos! El portal floreció — ve hacia él."
  },

  // ── Panel al superar un capítulo ──
  // Sale justo después de entrar por el portal ya abierto, con dos
  // botones claros: repetirlo o seguir. {titulo} se cambia solo por el
  // nombre del capítulo que se acaba de cerrar.
  capituloSuperado: {
    titulo: "¡Lo lograste!",
    // "completo" concuerda con "capítulo" (masculino) — puesto justo
    // detrás de un título que a veces es femenino ("La pregunta") se
    // leía como si no concordara. Por eso "capítulo" queda explícito.
    subtitulo: "«{titulo}» — capítulo completo.",
    botonRepetir: "Repetir",
    botonSiguiente: "Siguiente capítulo →",
    botonCarta: "Detalle final →"
  },

  // ── El peaje antes de seguir ──
  // Sale al pulsar "Siguiente capítulo": un empujón cariñoso a hacer
  // la parte que no está en la pantalla. No hay forma de "hacer trampa"
  // — y esa es la gracia, no un candado de verdad.
  besoConfirmacion: {
    pregunta: "Antes de seguir… ¿ya le diste un beso?",
    nota: "Sin prisa — cuando ya se lo hayas dado, toca «Sí».",
    si: "Sí ❣️",
    no: "Todavía no"
  },

  // Cuando el jugador se cae. No hay "game over" — sólo vuelve al
  // último punto seguro con una de estas frases, elegida al azar.
  reaparicion: [
    "Tranquila, aquí no hay caída que no se pueda volver a intentar.",
    "Otra vez — contigo siempre vale la pena intentarlo de nuevo.",
    "Un tropiezo no cuenta si sigues yendo hacia el mismo sitio.",
    "Ni cayéndome dejo de ir hacia ti."
  ],

  // Al tocar un corazón roto (cuesta una vida, nunca el juego). Se leen
  // como un desacuerdo pequeño, no como un golpe — el tipo de cosa que
  // de verdad pasa entre dos personas y no significa nada grave.
  discusiones: [
    "Un mal día no borra todos los buenos.",
    "Discutimos, sí — y aun así seguimos eligiéndonos todos los días.",
    "Ni el peor de nuestros desacuerdos valió nunca más que nosotros dos.",
    "Nos molestamos, se nos pasa, seguimos. Así ha sido siempre."
  ],

  // Cuando se agotan las tres vidas. Igual que reaparicion, pero
  // reconociendo que esta vez sí costó un poco más volver.
  derrota: [
    "Esta vez costó más, pero aquí seguimos — volvamos a intentarlo.",
    "Ni la peor discusión logró que dejara de caminar hacia ti.",
    "Nos cuesta a veces, pero siempre encontramos el camino de vuelta."
  ],

  // ── Distancia — el jefe del capítulo "A tu lado" ──
  // La grieta que se abre en el camino justo antes del portal. Se
  // presenta con nombre y todo apenas empieza la batalla, y si el
  // jugador se queda sin vidas respondiendo, se lleva al compañero
  // por un momento — nunca de verdad ni para siempre.
  jefe: {
    nombre: "Distancia",
    presentacion: "Algo se interpone en el camino: Distancia.",
    derrotaAviso: "{otro} se pierde en la grieta...",
    derrotaTitulo: "Distancia gana este asalto",
    derrotaTexto: "Por un momento pesó más que nosotros. Pero esto no se acaba aquí — todavía se puede cerrar esa grieta.",
    derrotaBoton: "Cerrar la grieta y volver a intentarlo"
  },

  // ── Pantalla de inicio ──
  menu: {
    titulo: "El Camino a Ti",
    subtitulo: "Cuatro capítulos. Un mismo camino: hacia ti.",
    botonEmpezar: "Empezar",
    botonContinuar: "Continuar",
    botonReiniciar: "Empezar de nuevo",
    continuarDetalle: "Ya caminaste hasta aquí una vez."
  },

  // ── Pantalla de selección de personaje ──
  seleccion: {
    titulo: "¿Con quién quieres caminar?",
    subtitulo: "Elige. El otro te espera al final de cada capítulo.",
    carlo: {
      nombre: "Carlo",
      detalle: "Va dejando polen dorado por donde pasa"
    },
    isabela: {
      nombre: "Isabela",
      detalle: "Va dejando pétalos rosados por donde pasa"
    },
    boton: "Caminar"
  },

  // ── Carta final — el cierre de verdad, tras el capítulo 4 ──
  cartaFinal: {
    titulo: "Llegué hasta ti",
    parrafos: [
      "Este camino tuvo huecos que saltar, subidas que costaron y algún tropiezo — como todo lo que de verdad importa.",
      "Pero ningún tropiezo fue nunca razón para dejar de caminar hacia ti. Ni la distancia de los jueves, ni la pantalla, ni el miedo de aquel 10 de abril.",
      "Y mira: todo esto floreció sólo porque tú pasaste por aquí. Así de simple es tenerte — el mundo se pone bonito nada más con que camines por él.",
      "Si llegaste jugando hasta este punto, ya sabes lo único que quería decirte. Pero te lo digo con nombre y todo: Isabela Quiñonez Gonzalez, te amo.",
      "No a Isa, no a mi niña, no a corazón — a ti, exactamente como eres. Y pienso seguir caminando este camino contigo todas las veces que haga falta."
    ],
    firma: "— Con todo mi amor, Carlo ❣️",
    botonReiniciar: "Volver a caminar",
    botonJuntos: "Caminar juntos →"
  },

  // ── El compromiso — al llegar a la puerta de casa, capítulo 5 ──
  // {otro} se cambia solo por el nombre del personaje que NO se está
  // jugando (el compañero de todo el camino).
  compromiso: {
    titulo: "¿Estás segura de tenerme junto a ti como pareja?",
    subtitulo: "No hay ninguna prisa. Contesta sólo cuando de verdad lo sientas así.",
    si: "Sí",
    no: "Todavía no",
    desenlaceTitulo: "Entramos juntos",
    desenlaceTexto: "Y así, de la mano, cerramos la puerta detrás de los dos. Lo que sigue ya no es un juego — es simplemente la vida, contigo.",
    noTitulo: "Está bien",
    noTexto: "{otro} entra a casa. Yo me quedo aquí afuera — acepto tu decisión.",
    reintentar: "Preguntar de nuevo",
    // El otro camino desde "Todavía no": cerrar aquí, sin volver a
    // preguntar. Las dos opciones quedan una al lado de la otra.
    fin: "Fin",
    finTitulo: "Hasta aquí llega el juego",
    finTexto: "Aunque el juego termine aquí, todo lo que te dije en este camino sigue siendo verdad. Gracias por haberlo caminado conmigo hasta este punto."
  }
};

window.GUION = GUION;
