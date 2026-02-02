import { GoogleGenAI } from "@google/genai";
import { Agent } from "../types";

const getApiKey = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY || '';
  if (!key) {
    console.warn("🚨 VITE_GEMINI_API_KEY no encontrada en .env.local");
  }
  return key;
};

let genAIInstance: any = null;

const getGenAI = () => {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  if (!genAIInstance) {
    genAIInstance = new GoogleGenAI({ apiKey });
  }
  return genAIInstance;
};

export const getTacticalAnalysis = async (agents: Agent[]) => {
  const genAI = getGenAI();
  if (!genAI) {
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
    const response = await genAI.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{
        role: 'user',
        parts: [{
          text: `Perform a tactical assessment of the following community status: ${JSON.stringify(stats)}. 
          Format the response as a short military-style intel report. Keep it under 100 words. 
          Use a serious, high-tech tone.`
        }]
      }]
    });

    return response.text || "ANÁLISIS COMPLETADO SIN TEXTO.";
  } catch (error: any) {
    console.error("❌ Gemini detailed error (Analysis):", {
      status: error.status,
      message: error.message,
      details: error.details,
      sdkResponse: error.sdkHttpResponse
    });
    if (error.status === 401 || error.message?.includes('API key')) {
      return "ERROR DE SEGURIDAD: LLAVE IA NO VÁLIDA O EXPIRADA.";
    }
    return "SISTEMA DE ANÁLISIS EN MANTENIMIENTO. MANTENGA POSICIONES.";
  }
};

export const processAssessmentAI = async (input: string, isImage: boolean = false) => {
  const genAI = getGenAI();
  if (!genAI) {
    throw new Error("SISTEMA IA NO CONFIGURADO. FALTA LLAVE VITE_GEMINI_API_KEY.");
  }

  try {
    let parts: any[] = [];
    if (isImage) {
      parts.push({
        inlineData: {
          data: input.split(',')[1] || input,
          mimeType: "image/jpeg"
        }
      });
    }

    parts.push({
      text: `Analiza esta evaluación (texto o imagen) y conviértela a nuestro formato JSON de Academia.
      
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
    });

    const result = await genAI.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts }]
    });

    const text = result.text || "";
    // Limpieza más robusta de bloques de código markdown
    const jsonStr = text.replace(/```(?:json)?/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error: any) {
    console.error("❌ Gemini detailed error (Importer):", {
      status: error.status,
      message: error.message,
      details: error.details,
      sdkResponse: error.sdkHttpResponse
    });
    let msg = "FALLO ESTRUCTURAL IA.";
    if (error.status === 401 || error.message?.includes('API key')) msg = "LLAVE DE IA INVÁLIDA.";
    throw new Error(`${msg} DETALLE: ${error.message || 'Error de conexión'}`);
  }
};

export const generateTacticalProfile = async (agent: Agent, academyProgress: any[]) => {
  const genAI = getGenAI();
  if (!genAI) {
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

    const result = await genAI.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const text = result.text || "";
    const jsonStr = text.replace(/```(?:json)?/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error: any) {
    console.error("❌ Gemini detailed error (Profile):", {
      message: error.message,
      sdkResponse: error.sdkHttpResponse
    });
    return null;
  }
};
