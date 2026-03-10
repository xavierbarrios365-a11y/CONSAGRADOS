export interface LoreFragment {
    title: string;
    text: string;
    question: string;
    options: string[];
    correctIndex: number;
}

export const LORE_DATA: Record<number, LoreFragment[]> = {
    1: [ // Puerta de las Ovejas
        {
            title: "El Sumo Sacerdote al Frente",
            text: "Nehemías 3:1 nos dice que el sumo sacerdote Elíasib y sus hermanos fueron los primeros en levantarse. Edificaron la Puerta de las Ovejas. Es notable que los líderes espirituales tomaron la iniciativa en el trabajo duro.",
            question: "¿Quiénes fueron los primeros en levantarse a reconstruir?",
            options: ["Los soldados", "Elíasib y los sacerdotes", "Los comerciantes de ovejas", "Nehemías y su guardia"],
            correctIndex: 1
        },
        {
            title: "Propósito de la Puerta",
            text: "Esta puerta fue la única que fue 'consagrada' explícitamente durante la reconstrucción. Su nombre se debe a que por ella entraban a la ciudad las ovejas que serían usadas para los sacrificios en el Templo.",
            question: "¿Por qué se llamaba la Puerta de las Ovejas?",
            options: ["Había muchos pastores cerca", "Allí se vendía lana", "Entraban las ovejas para los sacrificios", "Era el diseño de la puerta"],
            correctIndex: 2
        },
        {
            title: "Hasta la Torre de Hananeel",
            text: "Los sacerdotes no solo hicieron la puerta, sino que continuaron reconstruyendo el muro hasta la torre de Hamea y hasta la torre de Hananeel, asegurando una gran porción defensiva de la ciudad.",
            question: "¿Hasta qué torre importante construyeron desde esta puerta?",
            options: ["Torre de David", "Torre de Babel", "Torre de los Hornos", "Torre de Hananeel"],
            correctIndex: 3
        },
        {
            title: "Colocando las Puertas",
            text: "La estructura del trabajo de Nehemías era completa: ellos 'edificaron la puerta, la consagraron y levantaron sus puertas'. No bastaba con reparar el hueco, había que dejar la puerta funcional.",
            question: "¿Qué acción validaba que la puerta estaba terminada y segura?",
            options: ["Pintarla de rojo", "Levantar / colocar sus puertas", "Poner guardias", "Hacer una fiesta"],
            correctIndex: 1
        },
        {
            title: "El Valor de Consagrar",
            text: "Consagrar significa apartar algo para el uso exclusivo de Dios. Al iniciar el muro por esta puerta y consagrarla, todo el proyecto de reconstrucción de Jerusalén comenzaba bajo la bendición y el propósito divino.",
            question: "¿Qué significa consagrar la puerta?",
            options: ["Hacerla indestructible", "Apartarla para el uso y propósito de Dios", "Inaugurarla con el rey", "Poner puertas de oro"],
            correctIndex: 1
        }
    ],
    2: [ // Puerta del Pescado
        {
            title: "Los Hijos de Senaa",
            text: "La Puerta del Pescado fue reconstruida por los hijos de Senaa (Neh 3:3). Ellos colocaron sus vigas y levantaron sus puertas, con sus cerraduras y sus cerrojos.",
            question: "¿Quiénes reconstruyeron la Puerta del Pescado?",
            options: ["Los pescadores", "Los hijos de Senaa", "Nehemías", "Los sacerdotes"],
            correctIndex: 1
        },
        {
            title: "Cerraduras y Cerrojos",
            text: "A diferencia de la Puerta de las Ovejas donde no se mencionan cerraduras en el texto, para la Puerta del Pescado sí se detalla que instalaron 'cerraduras y cerrojos', mostrando la necesidad de seguridad comercial.",
            question: "¿Qué elementos de seguridad instalaron específicamente aquí?",
            options: ["Fosos de agua", "Cerraduras y cerrojos", "Trampas ocultas", "Cadenas de hierro"],
            correctIndex: 1
        },
        {
            title: "El Mercado de Tiro",
            text: "Esta puerta recibía su nombre porque a través de ella los mercaderes (especialmente de Tiro y la costa) traían el pescado y otros bienes al mercado principal de Jerusalén.",
            question: "¿De dónde venían principalmente los bienes del mar?",
            options: ["De Egipto", "De Babilonia", "De la región de Tiro", "Del Mar Muerto"],
            correctIndex: 2
        },
        {
            title: "La Restauración del Comercio",
            text: "Restaurar la Puerta del Pescado no solo era una medida defensiva, sino una reactivación económica vital para la supervivencia de la ciudad post-exilio.",
            question: "¿Qué representaba restaurar esta puerta además de defensa?",
            options: ["Un lugar de ocio", "Reactivación económica", "Un templo nuevo", "Un puerto artificial"],
            correctIndex: 1
        },
        {
            title: "Todos Participan",
            text: "Junto a ellos, reparó Meremot, Mesulam y Sadoc. El trabajo en equipo de diferentes familias muestra que la protección de la economía y la ciudad era tarea de todos.",
            question: "¿Qué valor resalta la participación de varias familias juntas?",
            options: ["Competitividad", "Trabajo en equipo", "Egoísmo", "Lentitud"],
            correctIndex: 1
        }
    ],
    3: [ // Puerta Vieja
        {
            title: "Joiada y Mesulam",
            text: "La Puerta Vieja fue restaurada por Joiada hijo de Paseah y Mesulam hijo de Besodías. (Neh 3:6). Ambos unieron fuerzas para esta zona histórica de la ciudad.",
            question: "¿Quiénes restauraron la Puerta Vieja?",
            options: ["Elíasib y Nehemías", "Joiada y Mesulam", "Senaa y Sadoc", "Salum y Hanún"],
            correctIndex: 1
        },
        {
            title: "Respeto a los Orígenes",
            text: "La Puerta Vieja posiblemente fue una de las puertas originales de la antigua ciudad jebusea o de la primera expansión. Restaurarla simbolizaba respetar el fundamento antiguo.",
            question: "¿Qué simboliza el nombre 'Puerta Vieja'?",
            options: ["Que estaba podrida", "Que nunca fue destruida", "El fundamento y origen de la ciudad", "Que la hizo gente mayor"],
            correctIndex: 2
        },
        {
            title: "El Trono del Gobernador",
            text: "Cerca de esta zona se encontraban personas que trabajaban hasta la sede (o trono) del gobernador del otro lado del río, señalando una zona diplomática o administrativa clave.",
            question: "¿Qué sede administrativa estaba cerca de esta sección del muro?",
            options: ["Plaza del Rey", "Trono del Gobernador", "Corte Suprema", "Tesorería"],
            correctIndex: 1
        },
        {
            title: "El Gremio de Perfumistas",
            text: "Nehemías 3:8 menciona que junto a ellos reparó Hananías, uno de los perfumistas. Hasta quienes tenían oficios delicados pusieron sus manos a la dura obra de albañilería.",
            question: "¿Qué oficio tenía Hananías, demostrando que todos ayudaron sin importar su profesión?",
            options: ["Herrero", "Soldado", "Perfumista", "Gobernador"],
            correctIndex: 2
        },
        {
            title: "Reafirmar las Bases",
            text: "Restaurar lo 'viejo' a veces es más difícil que construir algo nuevo porque implica limpiar escombros antiguos y encajar piezas desiguales, pero es vital no perder la historia.",
            question: "¿Cuál es una dificultad técnica de restaurar la Puerta Vieja?",
            options: ["Diseñar algo moderno", "Limpiar escombros antiguos", "Mover la puerta de lugar", "Quebrantar la ley"],
            correctIndex: 1
        }
    ],
    4: [ // Puerta del Valle
        {
            title: "Hanún y los habitantes de Zanoa",
            text: "La Puerta del Valle fue reparada por Hanún y los habitantes de Zanoa. Esta puerta daba hacia la escarpada bajada del valle de Hinom (Neh 3:13).",
            question: "¿Quiénes restauraron la Puerta del Valle?",
            options: ["Los sacerdotes", "Hanún y los de Zanoa", "Elíasib", "Los hijos de Senaa"],
            correctIndex: 1
        },
        {
            title: "MIL CODOS de Muro",
            text: "El récord de reconstrucción: Ellos repararon la puerta y edificaron 'mil codos' del muro hasta la Puerta del Muladar. Esto es casi medio kilómetro de muralla.",
            question: "¿Cuánta distancia de muro construyeron los de Zanoa?",
            options: ["Cien codos", "Trescientos codos", "Mil codos", "Terminaron todo el muro"],
            correctIndex: 2
        },
        {
            title: "El Punto de Partida de Nehemías",
            text: "Cuando Nehemías llegó a Jerusalén e hizo su primera inspección nocturna y secreta de la ciudad destruida, salió montado en su cabalgadura precisamente por la Puerta del Valle (Neh 2:13).",
            question: "¿Por qué puerta salió Nehemías a inspeccionar de noche?",
            options: ["Puerta del Pescado", "Puerta del Valle", "Puerta de las Ovejas", "Puerta Vieja"],
            correctIndex: 1
        },
        {
            title: "Significado del Valle",
            text: "Espiritualmente y geográficamente, el 'Valle' representa los momentos bajos, de prueba o de humillación. Nehemías inició su evaluación de los daños desde el lugar más bajo.",
            question: "¿Qué suele representar el 'Valle' en lenguaje figurado?",
            options: ["Victoria final", "Lugar alto", "Pruebas y humillación", "Mercado de comercio"],
            correctIndex: 2
        },
        {
            title: "Esfuerzo Sobresaliente",
            text: "Trabajar mil codos de extensión fue un logro descomunal. Demuestra que algunos grupos tomaron sobre sí mismos una carga mucho mayor de la esperada por el bien común.",
            question: "¿Qué nos enseña el trabajo de Hanún y Zanoa?",
            options: ["Buscar beneficios", "Tomar una carga extra por el bien común", "Hacer solo lo necesario", "Evitar el trabajo duro"],
            correctIndex: 1
        }
    ],
    5: [ // Puerta del Muladar
        {
            title: "Malquías hijo de Recab",
            text: "La Puerta del Muladar fue reparada por Malquías hijo de Recab, gobernador del distrito de Bet-haquerem. Él construyó, puso puertas, cerraduras y cerrojos (Neh 3:14).",
            question: "¿Quién restauró la Puerta del Muladar?",
            options: ["Salum", "Nehemías", "Malquías hijo de Recab", "Hanún"],
            correctIndex: 2
        },
        {
            title: "La Puerta de la Basura",
            text: "Esta era la puerta de salida para los desperdicios, basura y cenizas de Jerusalén hacia el valle de Hinom, donde había un fuego constante consumiendo los desechos.",
            question: "¿Para qué se usaba la Puerta del Muladar?",
            options: ["Desfiles del rey", "Sacar la basura y desperdicios", "Entrada de ovejas", "Pasaje secreto"],
            correctIndex: 1
        },
        {
            title: "Gobernador de Bet-haquerem",
            text: "Malquías era un gobernador, un hombre de alta posición. Sin embargo, no tuvo problemas en ensuciarse las manos y trabajar en la puerta más despreciada y maloliente de la ciudad.",
            question: "¿Qué nos enseña la actitud de Malquías?",
            options: ["Que era castigado", "Liderazgo humilde, trabajando en la peor zona", "Que quería ganar dinero", "Que los líderes no deben trabajar"],
            correctIndex: 1
        },
        {
            title: "Limpiar el Sistema",
            text: "Una ciudad sin salida de basura se enferma y colapsa. La Puerta del Muladar era vital para la salud pública. Purificar el sistema arrojando la corrupción fuera.",
            question: "¿Por qué era vital esta puerta para la ciudad?",
            options: ["Era muy hermosa", "Permitía la salud pública sacando la contaminación", "Se ganaba dinero", "Allí estaban los guardias"],
            correctIndex: 1
        },
        {
            title: "Una sola persona",
            text: "Mientras otras puertas fueron arregladas por gremios enteros o familias numerosas, la Biblia menciona solo a Malquías trabajando en esta asoladora tarea de la puerta de la basura.",
            question: "¿Qué característica resalta del trabajo en esta puerta según el texto de Nehemías?",
            options: ["Ayudó todo el pueblo", "Se menciona solo a Malquías encargado de ello", "La hicieron ángeles", "La financiaron los reyes"],
            correctIndex: 1
        }
    ],
    6: [ // Puerta de la Fuente
        {
            title: "Salum hijo de Colhoze",
            text: "La puerta de la Fuente fue reparada por Salum hijo de Colhoze, gobernador del distrito de Mizpa. (Neh 3:15).",
            question: "¿Quién estuvo a cargo de la reconstrucción de la Puerta de la Fuente?",
            options: ["Nehemías", "Salum", "Elíasib", "Malquías"],
            correctIndex: 1
        },
        {
            title: "El Estanque de Siloé",
            text: "Salum además de la puerta, reconstruyó el muro del estanque de Siloé ('Seloah' en el AT), junto al huerto del rey, y hasta las gradas que descienden de la Ciudad de David.",
            question: "¿Qué estanque famoso estaba protegido por esta zona?",
            options: ["Estanque de Betesda", "Estanque de Siloé", "Estanque del Rey", "Mar de Galilea"],
            correctIndex: 1
        },
        {
            title: "Acceso al Agua",
            text: "La Puerta de la Fuente probablemente estaba cerca de la fuente de Gihón. Es vital en una ciudad asediada controlar y proteger el suministro interno de agua fresca.",
            question: "¿Por qué era estratégicamente vital esta puerta?",
            options: ["Porque era bonita", "Daba acceso al mar", "Protegía el suministro de agua", "Servía de prisión"],
            correctIndex: 2
        },
        {
            title: "El Huerto del Rey",
            text: "El suministro de la fuente regaba los jardines reales en la parte baja de la ciudad. Era el origen de la fertilidad y vida en medio de la ciudad de piedra.",
            question: "¿Qué regaba esta fuente de agua en la ciudad?",
            options: ["La plaza mayor", "El Templo", "El Huerto del Rey", "Los camellos"],
            correctIndex: 2
        },
        {
            title: "Restauración Integral",
            text: "Salum no solo hizo la puerta, la cubrió (le puso techo), puso sus puertas y cerrojos, y reparó el acueducto/estanque. Fue una obra de infraestructura inmensa.",
            question: "¿Qué hizo Salum además de arreglar la puerta en sí?",
            options: ["Le puso un techo (la cubrió)", "La vistió de oro", "La movió de lugar", "Derribó el muro contiguo"],
            correctIndex: 0
        }
    ],
    7: [ // Puerta de las Aguas
        {
            title: "Los sirvientes del Templo",
            text: "Nehemías 3:26 dice: 'Y los sirvientes del templo que habitaban en Ofel restauraron hasta enfrente de la puerta de las Aguas al oriente, y la torre que sobresale'.",
            question: "¿Quiénes restauraron enfrente de la puerta de las Aguas?",
            options: ["Los soldados", "Los gobernadores", "Los sirvientes del templo (Sirvientes de Ofel)", "Los comerciantes"],
            correctIndex: 2
        },
        {
            title: "La Palabra como Agua",
            text: "Interesantemente, esta puerta no necesitó ser 'reparada'. A diferencia de las demás, no dice que le pusieron vigas o cerraduras. Muchos relacionan esto con que la 'Palabra de Dios' (simbolizada por el agua) no necesita ser reparada, solo proclamada.",
            question: "¿Qué peculiaridad tiene esta puerta en el relato de construcción?",
            options: ["Fue la más alta", "Fue hecha de oro", "El texto no menciona que haya sido 'reparada' o 'reconstruida'", "Tenía cuatro torres"],
            correctIndex: 2
        },
        {
            title: "Lectura de la Ley",
            text: "Más adelante, en Nehemías 8, todo el pueblo se reuniría unánime en la plaza que estaba delante de la Puerta de las Aguas para pedirle a Esdras que leyera el Libro de la Ley de Moisés.",
            question: "¿Qué evento crucial sucedió frente a esta puerta en Nehemías 8?",
            options: ["La coronación del Rey", "La lectura pública de la Ley por Esdras", "Una batalla", "Un sacrificio masivo"],
            correctIndex: 1
        },
        {
            title: "El Manantial de Gihón",
            text: "La puerta daba acceso al manantial de Gihón y al sistema de suministro de agua de la ciudad, haciéndola una salida vital hacia el valle de Cedrón.",
            question: "¿A qué fuente de agua principal daba acceso esta puerta?",
            options: ["Al río Nilo", "Al Mar Mediterráneo", "Al manantial de Gihón", "Al Jordán"],
            correctIndex: 2
        },
        {
            title: "Despertar Espiritual",
            text: "Al escuchar la Palabra frente a esta puerta, el pueblo lloró y se arrepintió, produciendo un gran avivamiento. El 'agua' lavó la conciencia de la nación.",
            question: "¿Cuál fue la reacción del pueblo al escuchar la Palabra frente a esta puerta?",
            options: ["Lloraron y se arrepintieron", "Se fueron a dormir", "Pelearon contra Esdras", "Construyeron más rápido"],
            correctIndex: 0
        }
    ],
    8: [ // Puerta de los Caballos
        {
            title: "La Puerta de los Soldados",
            text: "Se dice que desde la Puerta de los Caballos repararon los sacerdotes, cada uno enfrente de su propia casa (Neh 3:28).",
            question: "¿Quiénes repararon a partir de la Puerta de los Caballos?",
            options: ["Los soldados", "Los herreros", "Los sacerdotes, cerca de sus casas", "Los pastores"],
            correctIndex: 2
        },
        {
            title: "El Símbolo Militar",
            text: "En la antigüedad, los caballos representaban fuerza, batalla y tácticas militares. Esta puerta cerca del área del Templo y Palacio pudo usarse para la caballería real.",
            question: "¿Qué representaba el caballo en aquel tiempo?",
            options: ["Debilidad", "Fuerza, batalla y táctica militar", "Transporte de carga lenta", "Símbolo de paz"],
            correctIndex: 1
        },
        {
            title: "Cada uno frente a su casa",
            text: "Un excelente modelo de organización usado por Nehemías fue asignar secciones del muro a personas que vivían exactamente en esa zona. Si lo hacían mal, su propia casa quedaría desprotegida.",
            question: "¿Por qué era brillante que cada uno reparara 'frente a su casa'?",
            options: ["Era más económico", "Garantizaba que trabajarían muy bien por su propia seguridad", "No tenían que caminar mucho", "Lo pidió el gobernador"],
            correctIndex: 1
        },
        {
            title: "Cercanía al Templo",
            text: "La Puerta de los Caballos es mencionada también en 2 Crónicas y Jeremías como estando muy cerca o conectada al área del palacio real y el templo.",
            question: "¿Cerca de qué estructuras importantes estaba esta puerta?",
            options: ["Palacio Real y áreas sagradas", "El mercado", "El campo enemigo", "Los huertos"],
            correctIndex: 0
        },
        {
            title: "Estrategia Defensiva",
            text: "Mientras la Puerta de las Ovejas (espiritual) fue la primera, la de los Caballos (militar) asegura el centro de mando. Ambas son vitales: fe y buena estrategia.",
            question: "¿Qué balance muestran las puertas de Nehemías?",
            options: ["Comercio y Sueño", "Fe y Acción Estratégica (Caballos/Ejército)", "Riqueza y Pobreza", "Agua y Fuego"],
            correctIndex: 1
        }
    ],
    9: [ // Puerta Oriental
        {
            title: "Semaías, el Guarda de la Puerta",
            text: "Nehemías 3:29 menciona a Semaías hijo de Secanías, quien era el guarda de la puerta Oriental. A diferencia de otros que repararon secciones cerca de sus casas, Semaías tenía la responsabilidad directa de vigilar la entrada más majestuosa.",
            question: "¿Cuál era el cargo de Semaías hijo de Secanías?",
            options: ["Sumo Sacerdote", "Herrero Real", "Guarda de la Puerta Oriental", "Perfumista"],
            correctIndex: 2
        },
        {
            title: "La Entrada del Mesías",
            text: "En la tradición bíblica y profética, la Puerta Oriental es el lugar por donde entrará el Mesías. Restaurarla representa no solo seguridad física, sino la esperanza en el cumplimiento de las promesas divinas.",
            question: "¿Qué evento profético se asocia tradicionalmente con la Puerta Oriental?",
            options: ["La caída de los muros", "El regreso del Mesías", "La llegada de los mercaderes", "La huida del rey"],
            correctIndex: 1
        },
        {
            title: "Hacia el Monte de los Olivos",
            text: "Esta puerta comunicaba directamente con el valle de Cedrón y el Monte de los Olivos. Era la vía principal para quienes venían del oriente hacia el área sagrada del Templo.",
            question: "¿Hacia qué monte comunicaba directamente esta puerta?",
            options: ["Monte Sinaí", "Monte Carmelo", "Monte de los Olivos", "Monte Ararat"],
            correctIndex: 2
        },
        {
            title: "La Primera Luz",
            text: "Al estar orientada al este, esta puerta recibía los primeros rayos del sol al amanecer. Simboliza la vigilancia constante y el despertar espiritual ante un nuevo día de gracia.",
            question: "¿Qué simboliza el hecho de ser la puerta del 'Este' u 'Oriental'?",
            options: ["La puesta del sol", "La vigilancia y la luz del amanecer", "El final de la jornada", "La oscuridad"],
            correctIndex: 1
        },
        {
            title: "Vigilancia de Restos Sagrados",
            text: "La Puerta Oriental también estaba cerca de las dependencias donde se guardaban tesoros y registros sagrados. Un guarda en esta posición debía ser de absoluta confianza y lealtad.",
            question: "¿Qué cualidad era vital para el guarda de esta puerta específica?",
            options: ["Fuerza física", "Lealtad y confianza absoluta", "Riqueza", "Habilidad comercial"],
            correctIndex: 1
        }
    ],
    10: [ // Puerta del Juicio (Miphkad)
        {
            title: "Miphkad: El Lugar de la Inspección",
            text: "La palabra hebrea Miphkad (Mifkad) se traduce como 'inspección', 'censo' o 'lugar asignado'. Aquí se realizaba el recuento final y la revisión de quienes entraban y salían, asegurando que el orden se mantuviera en la ciudad restaurada.",
            question: "¿Qué significa el nombre hebreo 'Miphkad'?",
            options: ["Puerta del Oro", "Lugar de la Inspección o Censo", "Salida de emergencia", "Mercado de especias"],
            correctIndex: 1
        },
        {
            title: "Malquías el Platero",
            text: "Nehemías 3:31 menciona que Malquías, hijo del platero, reparó hasta la casa de los sirvientes del templo y de los comerciantes, enfrente de la puerta del Juicio. Incluso los artesanos de metales preciosos se dedicaron a la construcción.",
            question: "¿Qué oficio tenía Malquías, quien reparó cerca de esta puerta?",
            options: ["Carpintero", "Sacerdote", "Platero (Orfebre)", "Soldado"],
            correctIndex: 2
        },
        {
            title: "El Recuento de los Talentos",
            text: "El juicio o inspección no siempre era punitivo; a menudo era una evaluación de los recursos y talentos. En la reconstrucción, cada hombre era 'inspeccionado' para ver si su trabajo cumplía con el estándar de excelencia del muro.",
            question: "¿Cuál era el propósito de la 'inspección' en el contexto del muro?",
            options: ["Cobrar impuestos altos", "Evaluar la calidad y estándar del trabajo", "Buscar enemigos ocultos", "Pintar la puerta"],
            correctIndex: 1
        },
        {
            title: "Punto de Reunión Final",
            text: "Esta puerta estaba situada al noreste, cerca del final del recorrido de Nehemías. Representa la culminación del esfuerzo: la revisión final antes de declarar la obra terminada ante Dios.",
            question: "¿Qué fase del proyecto representa simbólicamente esta puerta?",
            options: ["El inicio de los cimientos", "La mitad del camino", "La revisión y cierre final de la obra", "El primer ataque enemigo"],
            correctIndex: 2
        },
        {
            title: "Justicia y Verdad",
            text: "La Puerta del Juicio nos recuerda que toda obra será probada. Nehemías buscaba que el muro no solo fuera alto, sino que estuviera construido con integridad. La 'Criba' elimina lo falso para dejar solo lo sólido.",
            question: "¿Qué se buscaba asegurar mediante la inspección en esta puerta?",
            options: ["Que fuera el muro más caro", "Integridad y solidez en la construcción", "Que tuviera muchos colores", "Que fuera famosa"],
            correctIndex: 1
        }
    ],
    11: [ // Puerta de Efraín
        {
            title: "La Puerta de la Expansión",
            text: "La Puerta de Efraín (Neh 12:39) conectaba la Ciudad de David con las nuevas extensiones del muro. Representa el crecimiento y la capacidad de la ciudad para albergar a más personas bajo protección.",
            question: "¿Qué representa simbólicamente la Puerta de Efraín?",
            options: ["El fin del mundo", "La expansión y crecimiento de la ciudad", "Un lugar de castigo", "Una entrada secreta"],
            correctIndex: 1
        },
        {
            title: "Equilibrio Táctico",
            text: "Situada entre la Puerta Vieja y la Puerta del Pescado, Efraín servía como un nodo de balance. En la guerra espiritual, el crecimiento debe ser equilibrado con la estructura y la provisión.",
            question: "¿Entre qué puertas importantes se situaba la de Efraín?",
            options: ["Sion y Moriah", "Vieja y del Pescado", "Ovejas y Aguas", "Cárcel y Juicio"],
            correctIndex: 1
        },
        {
            title: "El Doble Fruto",
            text: "Efraín significa 'Doble Fruto'. En el Proyecto Nehemías, esta fase busca que el agente no solo aprenda, sino que multiplique su conocimiento y efectividad táctica.",
            question: "¿Qué significa el nombre 'Efraín'?",
            options: ["Guerrero fuerte", "Doble Fruto", "Muro alto", "Piedra preciosa"],
            correctIndex: 1
        }
    ],
    12: [ // Puerta de la Cárcel
        {
            title: "El Cierre de la Muralla",
            text: "Nehemías 12:39 menciona que el desfile de dedicación se detuvo en la Puerta de la Cárcel. Era el punto final de control donde se validaba que nadie sin autorización cruzara el perímetro sagrado.",
            question: "¿Qué función principal tenía la Puerta de la Cárcel?",
            options: ["Era un mercado", "Punto final de control y seguridad", "Salida de emergencia", "Residencia real"],
            correctIndex: 1
        },
        {
            title: "Dedicación y Gozo",
            text: "Al llegar a esta puerta, los coros se detuvieron y el gozo de Jerusalén se oía desde lejos. Era el momento de celebrar que la obra, contra todo pronóstico, estaba terminada.",
            question: "¿Qué sentimiento predominaba al llegar a esta puerta en la dedicación?",
            options: ["Miedo", "Tristeza", "Gozo y celebración por la obra terminada", "Cansancio extremo"],
            correctIndex: 2
        },
        {
            title: "Blindaje Final",
            text: "La Cárcel no solo era para prisioneros, sino para custodiar lo más valioso. Simboliza que una vez que construyes tu carácter y tu fe, debes poner guardias para no perder lo ganado.",
            question: "¿Qué simboliza la Puerta de la Cárcel para el agente?",
            options: ["Que será arrestado", "El blindaje y custodia de lo que se ha construido", "Que el juego es infinito", "Que debe rendirse"],
            correctIndex: 1
        }
    ]
};
