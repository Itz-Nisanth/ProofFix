import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
}

const client = new GoogleGenerativeAI(env.GEMINI_API_KEY);

async function testModels() {
  const modelsToTest = [
    env.GEMINI_MODEL || 'gemini-3.8-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.5-flash'
  ];

  const sampleFrame = 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FAAhKDveksOjuAAAAAElFTkSuQmCC';

  for (const m of modelsToTest) {
    try {
      console.log(`Testing model: ${m}...`);
      const model = client.getGenerativeModel({
        model: m,
        generationConfig: { responseMimeType: 'application/json' }
      });
      const res = await model.generateContent([
        'Return valid JSON: {"status": "success", "model": "' + m + '"}',
        { inlineData: { data: sampleFrame, mimeType: 'image/png' } }
      ]);
      console.log(`[REAL PASS] ${m} responded successfully:`, res.response.text().trim());
      return m;
    } catch (e) {
      console.log(`[ERROR] ${m}:`, e.message);
    }
  }
}

testModels();
