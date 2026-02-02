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
  if (!apiKey) return null;
  if (!genAIInstance) {
    genAIInstance = new GoogleGenAI({ apiKey });
  }
  return genAIInstance;
};

export const getTacticalAnalysis = async (agents: Agent[]) => {
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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Perform a tactical assessment of the following community status: ${JSON.stringify(stats)}. 
      Format the response as a short military-style intel report. Keep it under 100 words. 
      Use a serious, high-tech tone.`
    });

    return response.text || "ANÁLISIS COMPLETADO SIN TEXTO.";
  } catch (error: any) {
    console.error("❌ Gemini detailed error (Analysis):", {
      status: error.status,
      message: error.message,
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
        `Analiza esta evaluación (imagen) y conviértela a nuestro formato JSON de Academia.
        
        ESQUEMA REQUERIDO:
        {
          "lessons": [
            {
              "id": "ID_GENERICO",
              "title": "Título detectado",
              "content": "Resumen o intro en HTML",
              "questions": [
                {
                  "type": "TEXT" | "MULTIPLE" | "DISC",
                  "question": "Texto de la pregunta",
                  "options": ["Opción A", "Opción B"...],
                  "correctAnswer": "X"
                }
              ]
            }
          ]
        }

        Responde ÚNICAMENTE con el objeto JSON puro.`
      ];
    } else {
      contents = `Analiza esta evaluación y conviértela a nuestro formato JSON de Academia.
      
      TEXTO A ANALIZAR:
      ${input}
      
      ESQUEMA REQUERIDO:
      {
        "lessons": [
          {
            "id": "ID_GENERICO",
            "title": "Título detectado",
            "content": "Resumen o intro en HTML",
            "questions": [
              {
                "type": "TEXT" | "MULTIPLE" | "DISC",
                "question": "Texto de la pregunta",
                "options": ["Opción A", "Opción B"...],
                "correctAnswer": "X"
              }
            ]
          }
        ]
      }

      Responde ÚNICAMENTE con el objeto JSON puro.`;
    }

    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents
    });

    const text = result.text || "";
    // Limpieza más robusta de bloques de código markdown
    const jsonStr = text.replace(/```(?:json)?/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error: any) {
    console.error("❌ Gemini detailed error (Importer):", {
      status: error.status,
      message: error.message,
    });
    let msg = "FALLO ESTRUCTURAL IA.";
    if (error.status === 401 || error.message?.includes('API key')) msg = "LLAVE DE IA INVÁLIDA.";
    if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      msg = "CUOTA IA EXCEDIDA. Espere unos minutos.";
    }
    throw new Error(`${msg} DETALLE: ${error.message || 'Error de conexión'}`);
  }
};

export const generateTacticalProfile = async (agent: Agent, academyProgress: any[]) => {
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

    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt
    });

    const text = result.text || "";
    const jsonStr = text.replace(/```(?:json)?/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error: any) {
    console.error("❌ Gemini detailed error (Profile):", {
      status: error.status,
      message: error.message,
    });
    return null;
  }
};
