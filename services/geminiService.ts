import { GoogleGenAI } from "@google/genai";
import { Agent } from "../types";

const getApiKey = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY || '';
  if (!key) {
    console.warn("🚨 VITE_GEMINI_API_KEY no encontrada en .env.local");
  }
  return key;
};

let genAIInstance: GoogleGenAI | null = null;

const getGenAI = (): GoogleGenAI | null => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("❌ getGenAI: No API Key available.");
    return null;
  }
  if (!genAIInstance) {
    console.log("🤖 Initializing GoogleGenAI instance...");
    genAIInstance = new GoogleGenAI({ apiKey });
  }
  return genAIInstance;
};

// --- AI ROBUST JSON EXTRACTION ---
const extractJSON = (text: string) => {
  try {
    // Try to find the block of JSON
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("❌ Error parsing extracted JSON:", e);
    return null;
  }
};

const DEFAULT_MODEL = 'gemini-1.5-flash'; // More stable for general use cases

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
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `Perform a tactical assessment of the following community status: ${JSON.stringify(stats)}. 
      Format the response as a short military-style intel report. Keep it under 100 words. 
      Use a serious, high-tech tone.`
    });

    console.log("✅ getTacticalAnalysis: Response received.");
    const resultText = response.text || "ANÁLISIS COMPLETADO SIN TEXTO.";
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
    const result = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents
    });

    console.log("✅ processAssessmentAI: Response received.");
    const text = result.text || "";
    const resultJson = extractJSON(text);

    if (!resultJson) {
      console.error("❌ processAssessmentAI: Failed to extract JSON from:", text);
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

export const generateTacticalProfile = async (agent: Agent, academyProgress: any[]) => {
  const cacheKey = `profile_${agent.id}_${agent.xp}`;
  const cached = getCachedResponse(cacheKey);
  if (cached) return cached;

  const ai = getGenAI();
  if (!ai) {
    return null;
  }

  try {
    const prompt = `Analiza el desempeño de este agente y genera un perfil táctico de videojuego (estilo FIFA/RPG).
    
    DATOS DEL AGENTE:
    - Nombre: ${agent.name}
    - Rango: ${agent.rank}
    - XP Total: ${agent.xp}
    - Progreso Academia: ${JSON.stringify(academyProgress)}
    - Talento: ${agent.talent}

    REQUERIMIENTO:
    1. Calcula 5 estadísticas de 0 a 100: Liderazgo, Servicio, Análisis, Potencial y Adaptabilidad.
    2. Genera un "Resumen Táctico" de máximo 40 palabras con tono militar de élite.
    
    Responde ÚNICAMENTE en este formato JSON:
    {
      "stats": {
        "liderazgo": 85,
        "servicio": 70,
        "analisis": 90,
        "potencial": 95,
        "adaptabilidad": 80
      },
      "summary": "Resumen aquí..."
    }`;

    console.log(`📡 generateTacticalProfile: Requesting for agent ${agent.name} (${agent.id})...`);
    const result = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt
    });

    console.log("✅ generateTacticalProfile: Response received.");
    const text = result.text || "";
    const resultJson = extractJSON(text);

    if (!resultJson) {
      console.error("❌ generateTacticalProfile: Failed to extract JSON from:", text);
      throw new Error("ERROR DE FORMATO IA: No se pudo extraer datos tácticos válidos.");
    }

    saveToCache(cacheKey, resultJson);
    return resultJson;
  } catch (error: any) {
    console.error("❌ Gemini detailed error (Profile):", {
      status: error.status,
      message: error.message,
      stack: error.stack
    });
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

    const result = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt
    });

    return result.text || "NO SE PUDO GENERAR EL ANÁLISIS PROFUNDO.";
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

    const result = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt
    });

    return result.text || "CENTRO DE COMANDO FUERA DE LÍNEA. MANTÉN LA FE.";
  } catch (error: any) {
    console.error("❌ Gemini detailed error (Counseling):", error.message);
    return "ERROR DE TRANSMISIÓN EN EL CANAL DE ASESORÍA. SIGA EL PROTOCOLO ESTÁNDAR.";
  }
};
