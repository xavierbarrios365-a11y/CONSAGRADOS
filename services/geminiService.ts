import { Agent } from "../types";

const getGenAIResult = async (contents: any, modelName?: string): Promise<string> => {
  // En producción (Vercel) esto apunta a la Serverless Function
  const baseUrl = import.meta.env.DEV ? 'https://consagrados.vercel.app' : '';

  const res = await fetch(`${baseUrl}/api/gemini`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, model: modelName })
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Error en petición IA al servidor');
    (err as any).status = res.status;
    throw err;
  }
  return data.text || "";
};

// --- AI ROBUST JSON EXTRACTION ---
const extractJSON = (text: string) => {
  if (!text) {
    console.warn("⚠️ extractJSON: Recibido texto vacío.");
    return null;
  }

  try {
    // 1. Limpiar bloques de código markdown
    let cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

    // 2. Intentar parse directo
    try {
      return JSON.parse(cleanText);
    } catch (e) {
      // 3. Extracción robusta por Regex
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        const potentialJson = text.substring(firstBrace, lastBrace + 1);
        try {
          return JSON.parse(potentialJson);
        } catch (innerError) {
          console.error("❌ extractJSON: Falló parse de fragmento extraído.", potentialJson);
        }
      }

      // 4. Intento con corchetes para arreglos
      const firstBracket = text.indexOf('[');
      const lastBracket = text.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1) {
        const potentialArray = text.substring(firstBracket, lastBracket + 1);
        try {
          return JSON.parse(potentialArray);
        } catch (innerError) {
          console.error("❌ extractJSON: Falló parse de arreglo extraído.");
        }
      }
    }
    return null;
  } catch (e) {
    console.error("❌ Error FATAL en extractJSON:", e, "Texto original:", text.substring(0, 100));
    return null;
  }
};

const DEFAULT_MODEL = 'gemini-2.5-flash';

// --- AI CACHING SYSTEM (SAVE TOKENS) ---
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 Horas

const getCachedResponse = (key: string) => {
  const cached = localStorage.getItem(`ai_cache_${key}`);
  if (!cached) return null;
  try {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) return data;
    localStorage.removeItem(`ai_cache_${key}`);
  } catch (e) {
    localStorage.removeItem(`ai_cache_${key}`);
  }
  return null;
};

const saveToCache = (key: string, data: any) => {
  localStorage.setItem(`ai_cache_${key}`, JSON.stringify({ data, timestamp: Date.now() }));
};

export const getTacticalAnalysis = async (agents: Agent[]) => {
  const stats = {
    totalAgents: agents.length,
    totalXp: agents.reduce((acc, curr) => acc + curr.xp, 0),
    rankDistribution: agents.reduce((acc: any, curr) => {
      acc[curr.rank] = (acc[curr.rank] || 0) + 1;
      return acc;
    }, {})
  };

  const cacheKey = `analysis_${agents.length}_${stats.totalXp}`;
  const cached = getCachedResponse(cacheKey);
  if (cached) return cached;

  console.log(`📡 getTacticalAnalysis: Requesting for ${agents.length} agents via secure backend...`);
  try {
    const prompt = `Perform a tactical assessment of the following community status: ${JSON.stringify(stats)}. 
      Format the response as a short military-style intel report. Keep it under 100 words. 
      Use a serious, high-tech tone.`;

    const resultText = await getGenAIResult(prompt, DEFAULT_MODEL);
    console.log("✅ getTacticalAnalysis: Response received.");
    saveToCache(cacheKey, resultText);
    return resultText;
  } catch (error: any) {
    console.error("❌ Gemini detailed error (Analysis):", {
      status: error.status,
      message: error.message,
      stack: error.stack
    });
    if (error.status === 401 || error.message?.includes('API key')) {
      return "ERROR DE SEGURIDAD: LLAVE IA NO VÁLIDA O EXPIRADA.";
    }
    if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      return "⚠️ CUOTA IA EXCEDIDA. Espere unos minutos o actualice su plan en Google AI Studio.";
    }
    return "SISTEMA DE ANÁLISIS EN MANTENIMIENTO. MANTENGA POSICIONES.";
  }
};

export const processAssessmentAI = async (input: string, isImage: boolean = false) => {
  try {
    let contents: string | any;

    if (isImage) {
      contents = [
        {
          inlineData: {
            data: input.split(',')[1] || input,
            mimeType: "image/jpeg"
          }
        },
        `Analiza esta imagen y conviértela en un JSON de Academia Táctica.
        
        SOPORTA 4 ESCENARIOS:
        1. CURSO: Si hay mucho texto instructivo, genera "courses" y "lessons".
        2. TEST DE PERFIL (DISC): Usa "resultAlgorithm": "HIGHEST_CATEGORY" y "optionCategories": ["A", "B", "C", "D"]. Genera "resultMappings" para cada perfil.
        3. EXAMEN: Usa "resultAlgorithm": "SCORE_PERCENTAGE". Genera "resultMappings" de Aprobado/Fallido y "correctAnswer" en cada pregunta.
        4. ENCUESTA: Si no hay respuestas correctas ni perfiles, usa "resultAlgorithm": "NONE".

        ESQUEMA REQUERIDO:
        {
          "courses": [...],
          "lessons": [
            {
              "id": "ID_AUTO",
              "title": "...",
              "resultAlgorithm": "HIGHEST_CATEGORY" | "SCORE_PERCENTAGE" | "NONE",
              "resultMappings": [...], 
              "questions": [
                {
                  "type": "TEXT" | "MULTIPLE" | "DISC",
                  "question": "...",
                  "options": ["...", "..."],
                  "optionCategories": ["A", "B"...],
                  "correctAnswer": "A"
                }
              ]
            }
          ]
        }

        Responde ÚNICAMENTE con el JSON puro.`
      ];
    } else {
      contents = `Analiza este texto y conviértelo en un JSON de Academia Táctica.
      
      TEXTO A PROCESAR:
      ${input}
      
      DETERMINA EL FORMATO ADECUADO:
      1. CURSO: Contenido educativo con lecciones.
      2. TEST DE PERFIL: Estilo DISC/Personalidad. Algoritmo: HIGHEST_CATEGORY. Requiere resultMappings por categoría.
      3. EXAMEN: Evaluación de conocimiento. Algoritmo: SCORE_PERCENTAGE. Requiere correctAnswer y resultMappings de puntaje.
      4. ENCUESTA/FEEDBACK: Recolección de datos. Algoritmo: NONE.

      ESQUEMA JSON:
      {
        "lessons": [
          {
            "id": "ID_AUTO",
            "title": "Título detectado",
            "resultAlgorithm": "...",
            "resultMappings": [
              { "category": "A", "title": "...", "content": "..." },
              { "minScore": 0, "maxScore": 60, "title": "...", "content": "..." }
            ],
            "questions": [
              {
                "type": "TEXT" | "MULTIPLE" | "DISC",
                "question": "...",
                "options": ["...", "..."],
                "optionCategories": ["A", "B"],
                "correctAnswer": "A"
              }
            ]
          }
        ]
      }

      Responde ÚNICAMENTE con el objeto JSON puro.`;
    }

    console.log(`📡 processAssessmentAI: Sending request via secure backend (isImage: ${isImage})...`);
    const text = await getGenAIResult(contents, DEFAULT_MODEL);

    console.log("✅ processAssessmentAI: Response received.");
    const resultJson = extractJSON(text);

    if (!resultJson) {
      console.error("❌ processAssessmentAI: Failed to extract JSON from text beginning with:", text.substring(0, 50));
      throw new Error("LA IA NO GENERÓ UN FORMATO JSON VÁLIDO. REINTENTE CON OTRO TEXTO.");
    }

    return resultJson;
  } catch (error: any) {
    console.error("AI Error (processAssessmentAI):", error);
    let msg = "EL CENTRO DE MANDO NO RESPONDE (ERROR DE IA).";
    if (error.message?.includes('401') || error.message?.includes('API key')) msg = "LLAVE DE IA INVÁLIDA.";
    if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      msg = "CENTRO DE MANDO SOBRECARGADO (LIMITE DE TOKENS ALCANZADO). REINTENTA EN UNOS MINUTOS.";
    }
    throw new Error(`${msg} DETALLE: ${error.message || 'Error de conexión'}`);
  }
};

export const generateTacticalProfile = async (agent: Agent, academyProgress: any[], testAnswers?: any) => {
  const cacheKey = `profile_v2_${agent.id}_${agent.xp}_${testAnswers ? JSON.stringify(testAnswers).length : 'no_test'}`;
  const cached = getCachedResponse(cacheKey);
  if (cached) return cached;

  try {
    const prompt = `EXHORTACIÓN ESTRATÉGICA Y PERFIL TÁCTICO - CONSAGRADOS 2026
    
    ESTILO DE COMUNICACIÓN: Eres un mentor espiritual con mentalidad estratégica ("Mentor Táctico"). Tu tono debe ser EMPÁTICO, MOTIVADOR y HUMANO, pero manteniendo la disciplina del proyecto Consagrados. Habla a los jóvenes (chamos) con energía y visión, como un hermano mayor que ve su potencial en Dios.
    
    OBJETIVO: Identificar FORTALEZAS y DEBILIDADES de forma constructiva. Usa el lenguaje del proyecto (misión, servicio, campo de batalla espiritual) pero con amor y esperanza.
    
    SUJETO:
    - Identidad: ${agent.name}
    - Rango: ${agent.rank} | XP: ${agent.xp} | Talento: ${agent.talent}
    
    MATERIAL DE EVALUACIÓN:
    - Progreso Académico: ${JSON.stringify(academyProgress)}
    - Respuestas Test de Élite (Psicometría y Casos): ${testAnswers ? JSON.stringify(testAnswers) : 'Sincronización rápida (sin test)'}

    CRITERIOS DE VALORACIÓN (0-100):
    1. LIDERAZGO: Capacidad de guiar a otros con el ejemplo y humildad.
    2. SERVICIO: Corazón dispuesto a ayudar en lo que se necesite.
    3. ANÁLISIS: Sabiduría para tomar decisiones según la palabra.
    4. POTENCIAL: Qué tan lejos puede llegar este activo con mentoría.
    5. ADAPTABILIDAD: Flexibilidad para servir en distintas misiones.

    FORMATO DE SALIDA (ESTRICTO JSON):
    {
      "stats": {
        "liderazgo": [VALOR],
        "servicio": [VALOR],
        "analisis": [VALOR],
        "potencial": [VALOR],
        "adaptabilidad": [VALOR]
      },
      "summary": "[REPORTE MOTIVACIONAL DE MÁXIMO 50 PALABRAS. Identifica algo admirable y un área de crecimiento con sabiduría. Tono: Inspirador, Cristiano, Táctico-Juvenil.]"
    }`;

    console.log(`📡 generateTacticalProfile V2: Procesando inteligencia para ${agent.name} via backend...`);
    const text = await getGenAIResult(prompt, DEFAULT_MODEL);
    const resultJson = extractJSON(text);

    if (!resultJson) throw new Error("ERROR DE PARSE EN REPORTE TÁCTICO.");

    // COMPLEMENTAR CON STATS MANUALES EXISTENTES
    if (agent.tacticalStats) {
      resultJson.stats = {
        liderazgo: Math.round(((agent.tacticalStats.liderazgo || 0) + (resultJson.stats.liderazgo || 0)) / (agent.tacticalStats.liderazgo ? 2 : 1)),
        servicio: Math.round(((agent.tacticalStats.servicio || 0) + (resultJson.stats.servicio || 0)) / (agent.tacticalStats.servicio ? 2 : 1)),
        analisis: Math.round(((agent.tacticalStats.analisis || 0) + (resultJson.stats.analisis || 0)) / (agent.tacticalStats.analisis ? 2 : 1)),
        potencial: Math.round(((agent.tacticalStats.potencial || 0) + (resultJson.stats.potencial || 0)) / (agent.tacticalStats.potencial ? 2 : 1)),
        adaptabilidad: Math.round(((agent.tacticalStats.adaptabilidad || 0) + (resultJson.stats.adaptabilidad || 0)) / (agent.tacticalStats.adaptabilidad ? 2 : 1))
      };
    }

    saveToCache(cacheKey, resultJson);
    return resultJson;
  } catch (error: any) {
    console.error("❌ generateTacticalProfile Error:", error.message);
    throw error;
  }
};

export const getDeepTestAnalysis = async (lessonTitle: string, userAnswers: any[], resultProfile?: any) => {
  try {
    const prompt = `Analiza profundamente los resultados de este agente en la evaluación: "${lessonTitle}".
    
    DATOS DE LA EVALUACIÓN:
    - Perfil detectado por algoritmo: ${JSON.stringify(resultProfile || 'N/A')}
    - Respuestas del agente: ${JSON.stringify(userAnswers)}

    REQUERIMIENTO:
    Genera un "Reporte de Inteligencia Táctica" que incluya:
    1. Interpretación de su perfil psicológico y conductual basado en sus respuestas.
    2. Fortalezas detectadas en su proceso de toma de decisiones.
    3. Áreas de riesgo o cegueras tácticas.
    4. Recomendación de despliegue (en qué área del equipo encajaría mejor).
    
    Mantén un tono de inteligencia militar de élite ("The Analyst"). Máximo 150 palabras.
    Formato: HTML limpio (usa tags como <b>, <p>, <br>).`;

    const text = await getGenAIResult(prompt, DEFAULT_MODEL);
    return text || "NO SE PUDO GENERAR EL ANÁLISIS PROFUNDO.";
  } catch (error: any) {
    console.error("❌ Gemini detailed error (Deep Analysis):", error.message);
    return "ERROR EN EL SISTEMA DE ANÁLISIS PROFUNDO. REINTENTE MÁS TARDE.";
  }
};

export const getSpiritualCounseling = async (agent: Agent, userMessage: string) => {
  try {
    const prompt = `Actúa como el "Consejero Táctico Espiritual" de CONSAGRADOS 2026.
    
    PERFIL DEL PROYECTO:
    - Misión: Formar líderes de élite con carácter inquebrantable.
    - Valores: Disciplina, Compromiso, Santidad y Visión Estratégica.
    - Tono: Firme, inspirador, directo y con terminología militar/táctica.

    DATOS DEL AGENTE QUE SOLICITA GUÍA:
    - Nombre: ${agent.name}
    - Rango: ${agent.rank}
    - Talentos: ${agent.talent}
    - XP: ${agent.xp}

    MENSAJE DEL AGENTE:
    "${userMessage}"

    REQUERIMIENTO:
    Genera una respuesta de consejería que:
    1. Se dirija al agente por su rango y nombre.
    2. Use analogías tácticas/militares para dar un consejo espiritual o de vida.
    3. Esté alineado con la misión de ser "Consagrado".
    4. Sea breve (máximo 120 palabras).
    
    RESPONDE CON UN MENSAJE DIRECTO QUE INSPIRE A LA ACCIÓN.`;

    const text = await getGenAIResult(prompt, DEFAULT_MODEL);
    return text || "CENTRO DE COMANDO FUERA DE LÍNEA. MANTÉN LA FE.";
  } catch (error: any) {
    console.error("❌ Gemini detailed error (Counseling):", error.message);
    return "ERROR DE TRANSMISIÓN EN EL CANAL DE ASESORÍA. SIGA EL PROTOCOLO ESTÁNDAR.";
  }
};

export const generateCourseFinalReport = async (agent: Agent, course: any, progressData: any[]) => {
  try {
    const prompt = `Analiza el expediente de graduación del Agente ${agent.name} para el curso "${course.title}".
    
    ESTADÍSTICAS DE DESPLIEGUE:
    - Agente: ${agent.name} (Rango: ${agent.rank})
    - Curso: ${course.title}
    - Datos de Progreso (Lecciones, Intentos, Estados): ${JSON.stringify(progressData)}
    
    REQUERIMIENTO TÁCTICO:
    Genera un "REPORTE DE FINALIZACIÓN DE CUARTEL" que incluya:
    1. RESUMEN DE PERSISTENCIA: Menciona cuántos intentos totales fueron necesarios y destaca las lecciones que presentaron mayor resistencia (fallos previos).
    2. ANÁLISIS DE FALLO: Si hubo rechazos previos, identifica el patrón de error (ej: falta de atención al detalle, debilidad en teoría, etc.).
    3. PERFIL DEL GRADUADO: Una descripción de 30-40 palabras sobre su nueva capacidad operativa tras completar este curso.
    4. RECOMENDACIÓN DEL COMANDO: Una instrucción directa para su próximo despliegue.

    TONO: Reporte de inteligencia militar de alto nivel. Directo, crudo pero profesional. Máximo 120 palabras.
    FORMATO: Texto plano con estructura de reporte militar.`;

    const text = await getGenAIResult(prompt, DEFAULT_MODEL);
    return text || "CENTRO DE COMANDO: REPORTE GENERADO EN BLANCO.";
  } catch (error: any) {
    console.error("❌ Gemini detailed error (Course Final Report):", error.message);
    return "ERROR AL CONSOLIDAR REPORTE CRÍTICO. CONTACTE AL COMANDO.";
  }
};

export const generateCommunityIntelReport = async (agents: Agent[]) => {
  try {
    const stats = {
      totalAgentes: agents.length,
      distribucionRangos: agents.reduce((acc: any, curr) => {
        acc[curr.rank] = (acc[curr.rank] || 0) + 1;
        return acc;
      }, {}),
      xpPromedio: agents.reduce((acc, curr) => acc + curr.xp, 0) / agents.length,
      topAgentes: agents.sort((a, b) => b.xp - a.xp).slice(0, 3).map(a => ({ nombre: a.name, xp: a.xp, rango: a.rank }))
    };

    const prompt = `Actúa como el Analista Jefe del comando central. Realiza un REPORTE ESTRATÉGICO DE LA FUERZA BASADO EN ESTOS DATOS:
    ${JSON.stringify(stats)}
    
    REQUERIMIENTO:
    1. RESUMEN OPERATIVO: Estado actual de la moral y capacidad de la fuerza.
    2. DESTACADOS: Menciona a los top agentes como "Activos de Alto Valor".
    3. RECOMENDACIÓN ESTRATÉGICA: ¿Cuál debería ser el siguiente objetivo del comando para fortalecer el equipo?
    
    TONO: Inteligencia militar de élite. Conciso, visionario y autoritario. Máximo 150 palabras.
    FORMATO: HTML limpio (usa tags como <b>, <p>, <br>).`;

    const text = await getGenAIResult(prompt, DEFAULT_MODEL);
    return text || "REPORTE ESTRATÉGICO NO DISPONIBLE.";
  } catch (error: any) {
    console.error("❌ Gemini detailed error (Community Report):", error.message);
    return "ERROR EN LA CONSOLIDACIÓN ESTRATÉGICA GLOBAL.";
  }
};
