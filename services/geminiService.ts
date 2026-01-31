
import { GoogleGenAI } from "@google/genai";
import { Agent } from "../types";

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const getTacticalAnalysis = async (agents: Agent[]) => {
  const stats = {
    totalAgents: agents.length,
    totalXp: agents.reduce((acc, curr) => acc + curr.xp, 0),
    rankDistribution: agents.reduce((acc: any, curr) => {
      acc[curr.rank] = (acc[curr.rank] || 0) + 1;
      return acc;
    }, {})
  };

  if (!ai) return "TACTICAL ANALYSIS UNAVAILABLE. CONFIGURE API KEY.";

  try {
    const response = await ai.models.generateContent({
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
    return response.text;
  } catch (error) {
    console.error("Gemini analysis failed", error);
    return "TACTICAL ANALYSIS UNAVAILABLE. SYSTEMS NOMINAL. MAINTAIN OPERATIONAL SECURITY.";
  }
};
