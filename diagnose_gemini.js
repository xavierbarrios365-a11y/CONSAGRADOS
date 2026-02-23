import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const apiKeyMatch = envContent.match(/VITE_GEMINI_API_KEY=(.*)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

if (!apiKey) {
    console.error("No API key found in .env.local");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function testModel(modelName) {
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("test");
        const response = await result.response;
        console.log(`✅ ${modelName}: WORKING - ${response.text().substring(0, 20)}...`);
    } catch (e) {
        console.log(`❌ ${modelName}: FAILED - ${e.message}`);
    }
}

testModel('gemini-2.5-flash');
