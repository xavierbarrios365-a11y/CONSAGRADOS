export const config = {
    runtime: 'edge',
};

// Se importa el modelo localmente a traves del import dinamico si es posible,
// pero @google/generative-ai se puede importar estatico en Edge.
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(request: Request) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        return new Response(
            JSON.stringify({ error: "SISTEMA IA NO CONFIGURADO. FALTA LLAVE VITE_GEMINI_API_KEY." }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    try {
        const body = await request.json();
        const { contents, model: modelName } = body;

        if (!contents) {
            return new Response(
                JSON.stringify({ error: "Falta el contenido para la IA." }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const DEFAULT_MODEL = 'gemini-2.5-flash';
        const model = genAI.getGenerativeModel({ model: modelName || DEFAULT_MODEL });

        const result = await model.generateContent(contents);
        const response = await result.response;
        const text = response.text() || "";

        return new Response(JSON.stringify({ text }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error("Endpoint Gemini Error:", error.message);
        const status = error.status || 500;
        return new Response(
            JSON.stringify({ error: error.message || "Error interno del servidor IA." }),
            { status: status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
}
