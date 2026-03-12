require('ts-node').register();
const { getRandomFallbackVerse } = require('./utils/versesFallback.ts');

console.log("Verse for today:", getRandomFallbackVerse());
