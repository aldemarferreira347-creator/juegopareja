/* ============================================================
   PREGUNTAS.JS — BANCO DE DATOS DEL JEFE
   
   Estructura escalable para añadir decenas de preguntas sin 
   modificar la lógica del juego.
   
   Cada pregunta tiene:
   - pregunta: El texto que dirá el Guardián.
   - opciones: Array de 3 o 4 respuestas posibles.
   - correcta: El índice (0-based) de la respuesta correcta.
   - exito: Mensaje positivo al acertar.
   - error: Mensaje motivador al fallar (nunca negativo).
============================================================ */

const BaseDatosPreguntas = [
    {
        id: "primer_hola",
        pregunta: "¿Qué día fue nuestro primer beso?",
        opciones: [
            "14 de febrero", 
            "16 de agosto", 
            "10 de abril", 
            "25 de diciembre"
        ],
        correcta: 1, // "16 de agosto"
        exito: "Un hola que lo cambió absolutamente todo.",
        error: "Tranquila, tómate un momento para recordar aquel día especial."
    },
    {
        id: "dia_favorito",
        pregunta: "¿Cuál es nuestro día favorito?",
        opciones: [
            "Lunes", 
            "Viernes", 
            "Domingo", 
            "Sábado"
        ],
        correcta: 2, // "Domingo"
        exito: "El día que siempre es nuestro, a pesar de la distancia.",
        error: "Casi... recuerda qué día es el más esperado de la semana."
    },
    {
        id: "gran_pregunta",
        pregunta: "¿Cuándo hice la gran pregunta?",
        opciones: [
            "10 de abril de 2026",
            "16 de agosto de 2025",
            "1 de enero de 2026",
            "14 de febrero de 2026"
        ],
        correcta: 0, // "10 de abril de 2026"
        exito: "Ese día el miedo desapareció y sólo quedaron las ganas de ti.",
        error: "Ese día escribí y borré la carta muchas veces. Inténtalo de nuevo."
    },
    {
        id: "primera_cita",
        pregunta: "¿A dónde te llevé en nuestra primera cita de verdad?",
        opciones: [
            "Un café",
            "El cine",
            "La playa",
            "Un parque"
        ],
        correcta: 1, // "El cine"
        exito: "Aquella tarde a oscuras, muerto de nervios, pensando más en ti que en la película.",
        error: "No hagas que la distancia también se lleve esa tarde. Piénsalo de nuevo."
    },
    {
        id: "sin_anillo",
        pregunta: "El día de la gran pregunta, ¿qué te dije que no tenía conmigo?",
        opciones: [
            "Las palabras correctas",
            "algo que nos uniera",
            "Ni anillo ni manilla",
            "El valor para hablar"
        ],
        correcta: 2, // "Ni anillo ni manilla"
        exito: "Nada de anillo, nada de manilla — sólo la pregunta, desnuda, tal cual era yo ese día.",
        error: "Ese día te dije, muy claro, lo que me faltaba encima. Repásalo."
    },
    {
        id: "los_apodos",
        pregunta: "Ese mismo 10 de abril dije toda una lista de apodos tuyos, uno detrás de otro, y elegí no quedarme con ninguno. ¿Cómo te llamé al final?",
        opciones: [
            "Isa",
            "Mi crespa",
            "Amor",
            "Isabela Quiñonez Gonzalez"
        ],
        correcta: 3, // nombre completo
        exito: "Por tu nombre entero, despacio — porque a quien de verdad amas mereces llamarla así, completa.",
        error: "Dije muchos apodos ese día sólo para terminar sin usar ninguno de ellos."
    },
    {
        id: "comida_favorita",
        pregunta: "¿Cuál es mi comida favorita?",
        opciones: [
            "Pizza",
            "Hamburguesa",
            "Sushi",
            "Tacos"
        ],
        correcta: 1, // "Hamburguesa"
        exito: "Con papas y todo — tú ya lo sabías de memoria.",
        error: "Piensa en lo que pido siempre que no logramos decidir a dónde ir."
    },
    {
        id: "cumpleanos",
        pregunta: "¿Qué día es mi cumpleaños?",
        opciones: [
            "29 de agosto",
            "30 de agosto",
            "31 de agosto",
            "1 de septiembre"
        ],
        correcta: 1, // "30 de agosto"
        exito: "30 de agosto. Ese día pienso en ti desde antes de abrir los ojos.",
        error: "Casi... cuenta de nuevo los días de agosto."
    },
    {
        id: "los_jueves_distancia",
        pregunta: "Durante los jueves separados, ¿qué dije que nunca lograba reemplazar del todo?",
        opciones: [
            "Una videollamada",
            "Un mensaje de buenos días",
            "Una canción",
            "Una foto tuya"
        ],
        correcta: 0, // "Una videollamada"
        exito: "Una videollamada no reemplaza un abrazo — pero tu sonrisa hacía llevadera hasta la noche más larga.",
        error: "No es lo que te mandaba para acompañarte. Es lo que uso para verte y aun así se queda corto."
    }
];

window.BaseDatosPreguntas = BaseDatosPreguntas;
