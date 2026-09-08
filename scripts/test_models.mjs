import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

const envContent = fs.readFileSync('.env.local', 'utf8');
const apiKeyMatch = envContent.match(/GEMINI_API_KEY=(.+)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : '';
console.log('Testing with API key:', apiKey ? 'Present (length ' + apiKey.length + ')' : 'MISSING');

const genAI = new GoogleGenerativeAI(apiKey);

async function testModel(modelName) {
  console.log(`\nTesting model: ${modelName}...`);
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const res = await model.generateContent('Say hello in one word.');
    console.log(`Success with ${modelName}:`, res.response.text().trim());
    return true;
  } catch (err) {
    console.log(`Failed with ${modelName}:`, err.message);
    return false;
  }
}

async function main() {
  await testModel('gemini-3.6-flash');
  await testModel('gemini-3.8-flash');
}

main();
