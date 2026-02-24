import { GoogleGenerativeAI } from "@google/generative-ai";
import { Agent } from "../types";

const getApiKey = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY || '';
  if (!key) {
    console.warn("🚨 VITE_GEMINI_API_KEY no encontrada en .env.local");
  }
  return key;
};

let genAIInstance: GoogleGenerativeAI | null = null;

const getGenAI = (): GoogleGenerativeAI | null => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("❌ getGenAI: No API Key available.");
    return null;
  }
  if (!genAIInstance) {
    console.log("🤖 Initializing GoogleGenerativeAI instance...");
    genAIInstance = new GoogleGenerativeAI(apiKey);
  }
  return genAIInstance;
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
      // Buscamos el primer '{' y el último '}' para capturar el objeto
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

const DEFAULT_MODEL = 'gemini-2.5-flash'; // High performance model for 2026 standards

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
  const cacheKey = `analysis_${agents.length}_${agents.reduce((acc, curr) => acc + curr.xp, 0)}`;
  const cached = getCachedResponse(cacheKey);
  if (cached) return cached;

  const ai = getGenAI();
  if (!ai) {
    return "TACTICAL ANALYSIS UNAVAILABLE. SISTEMA SIN LLAVE DE ACCESO IA.";
  }

  const stats = {
    totalAgents: agents.length,
    totalXp: agents.reduce((acc, curr) => acc + curr.xp, 0),
    rankDistribution: agents.reduce((acc: any, curr) => {
      acc[curr.rank] = (acc[curr.rank] || 0) + 1;
      return acc;
    }, {})
  };

  console.log(`📡 getTacticalAnalysis: Requesting for ${agents.length} agents...`);
  try {
    const model = ai.getGenerativeModel({ model: DEFAULT_MODEL });
    const result = await model.generateContent(`Perform a tactical assessment of the following community status: ${JSON.stringify(stats)}. 
      Format the response as a short military-style intel report. Keep it under 100 words. 
      Use a serious, high-tech tone.`);

    console.log("✅ getTacticalAnalysis: Response received.");
    const response = await result.response;
    const resultText = response.text() || "ANÁLISIS COMPLETADO SIN TEXTO.";
    saveToCache(cacheKey, resultText);
    return resultText;
  } catch (error: any) {
    console.error("❌ Gemini detailed error (Analysis):", {
      status: error.status,
      message: error.message,
      stack: error.stack
    });
    // ... rest same
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
  const ai = getGenAI();
  if (!ai) {
    throw new Error("SISTEMA IA NO CONFIGURADO. FALTA LLAVE VITE_GEMINI_API_KEY.");
  }

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
          "courses": [...], // Solo si es un curso completo
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
                  "options": ["...", "..."], // Si aplica
                  "optionCategories": ["A", "B"...], // Solo para perfiles
                  "correctAnswer": "A" // Solo para exámenes
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
                "optionCategories": ["A", "B"], // Requerido para perfiles
                "correctAnswer": "A" // Requerido para exámenes
              }
            ]
          }
        ]
      }

      Responde ÚNICAMENTE con el objeto JSON puro.`;
    }

    console.log(`📡 processAssessmentAI: Sending request (isImage: ${isImage})...`);
    const model = ai.getGenerativeModel({ model: DEFAULT_MODEL });
    const result = await model.generateContent(contents);

    console.log("✅ processAssessmentAI: Response received.");
    const response = await result.response;
    const text = response.text() || "";
    const resultJson = extractJSON(text);

    if (!resultJson) {
      console.error("❌ processAssessmentAI: Failed to extract JSON from text beginning with:", text.substring(0, 50));
      throw new Error("LA IA NO GENERÓ UN FORMATO JSON VÁLIDO. REINTENTE CON OTRO TEXTO.");
    }

    return resultJson;
  } catch (error: any) {
    console.error("AI Error (processAssessmentAI):", error);
    // ...
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

  const ai = getGenAI();
  if (!ai) return null;

  try {
    const prompt = `INFORME DE EVALUACIÓN TÁCTICA DE ÉLITE - CONSAGRADOS 2026
    
    ESTRICTO SENTIDO DE EVALUACIÓN: Eres un evaluador de alto rango del Estado Mayor. Tu análisis debe ser CRÍTICO, FRÍO y TÉCNICO. Evita la inflación de puntuaciones; un 90+ debe ser excepcional.
    
    SUJETO:
    - Identidad: ${agent.name}
    - Rango: ${agent.rank} | XP: ${agent.xp} | Talento: ${agent.talent}
    
    MATERIAL DE EVALUACIÓN:
    - Progreso Académico: ${JSON.stringify(academyProgress)}
    - Respuestas Test de Élite (Psicometría y Casos): ${testAnswers ? JSON.stringify(testAnswers) : 'NO SUMINISTRADO (PENALIZAR)'}

    RÚBRICA DE ESTADO MAYOR (0-100):
    1. LIDERAZGO: Evaluar coherencia entre rango y respuestas de mando en crisis. Si el rango es alto pero la respuesta fue delegar responsabilidad, castigar la nota.
    2. SERVICIO: Basado en consistencia DISC y participación real en academia. El desinterés en casos situacionales = nota baja.
    3. ANÁLISIS: Precisión en resolución de dilemas éticos y técnicos. No permitas respuestas tibias.
    4. POTENCIAL: Proyección basada en velocidad de ascenso y perfil psicológico detectado.
    5. ADAPTABILIDAD: Respuesta ante cambios de protocolo y diversidad de áreas dominadas.

    FORMATO DE SALIDA (ESTRICTO JSON):
    {
      "stats": {
        "liderazgo": [VALOR],
        "servicio": [VALOR],
        "analisis": [VALOR],
        "potencial": [VALOR],
        "adaptabilidad": [VALOR]
      },
      "summary": "[REPORTE DE INTELIGENCIA DE MÁXIMO 45 PALABRAS. TONO SECO, MILITAR Y PROFESIONAL. NO USES ADJETIVOS POSITIVOS SI NO ESTÁN RESPALDADOS POR DATOS.]"
    }`;

    console.log(`📡 generateTacticalProfile V2: Procesando inteligencia para ${agent.name}...`);
    const model = ai.getGenerativeModel({ model: DEFAULT_MODEL });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const resultJson = extractJSON(response.text());

    if (!resultJson) throw new Error("ERROR DE PARSE EN REPORTE TÁCTICO.");

    saveToCache(cacheKey, resultJson);
    return resultJson;
  } catch (error: any) {
    console.error("❌ generateTacticalProfile Error:", error.message);
    throw error;
  }
};
export const getDeepTestAnalysis = async (lessonTitle: string, userAnswers: any[], resultProfile?: any) => {
  const ai = getGenAI();
  if (!ai) return null;

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

    const model = ai.getGenerativeModel({ model: DEFAULT_MODEL });
    const result = await model.generateContent(prompt);
    const response = await result.response;

    return response.text() || "NO SE PUDO GENERAR EL ANÁLISIS PROFUNDO.";
  } catch (error: any) {
    console.error("❌ Gemini detailed error (Deep Analysis):", error.message);
    return "ERROR EN EL SISTEMA DE ANÁLISIS PROFUNDO. REINTENTE MÁS TARDE.";
  }
};

export const getSpiritualCounseling = async (agent: Agent, userMessage: string) => {
  const ai = getGenAI();
  if (!ai) return null;

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

    const model = ai.getGenerativeModel({ model: DEFAULT_MODEL });
    const result = await model.generateContent(prompt);
    const response = await result.response;

    return response.text() || "CENTRO DE COMANDO FUERA DE LÍNEA. MANTÉN LA FE.";
  } catch (error: any) {
    console.error("❌ Gemini detailed error (Counseling):", error.message);
    return "ERROR DE TRANSMISIÓN EN EL CANAL DE ASESORÍA. SIGA EL PROTOCOLO ESTÁNDAR.";
  }
};

export const generateCourseFinalReport = async (agent: Agent, course: any, progressData: any[]) => {
  const ai = getGenAI();
  if (!ai) return null;

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

    const model = ai.getGenerativeModel({ model: DEFAULT_MODEL });
    const result = await model.generateContent(prompt);
    const response = await result.response;

    return response.text() || "CENTRO DE COMANDO: REPORTE GENERADO EN BLANCO.";
  } catch (error: any) {
    console.error("❌ Gemini detailed error (Course Final Report):", error.message);
    return "ERROR AL CONSOLIDAR REPORTE CRÍTICO. CONTACTE AL COMANDO.";
  }
};

export const generateCommunityIntelReport = async (agents: Agent[]) => {
  const ai = getGenAI();
  if (!ai) return null;

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

    const model = ai.getGenerativeModel({ model: DEFAULT_MODEL });
    const result = await model.generateContent(prompt);
    const response = await result.response;

    return response.text() || "REPORTE ESTRATÉGICO NO DISPONIBLE.";
  } catch (error: any) {
    console.error("❌ Gemini detailed error (Community Report):", error.message);
    return "ERROR EN LA CONSOLIDACIÓN ESTRATÉGICA GLOBAL.";
  }
};


