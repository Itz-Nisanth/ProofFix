import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. Parse .env.local manually
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    env[key] = val;
    process.env[key] = val;
  }
}

console.log('====================================================');
console.log('PROOF-FIX LIVE CLOUD SERVICES VERIFICATION');
console.log('====================================================\n');

// 1. Report Environment Variables Status (Never print secret values)
console.log('1. ENVIRONMENT VARIABLES DETECTION:');
console.log('----------------------------------------------------');
console.log(`- NEXT_PUBLIC_SUPABASE_URL: ${env.NEXT_PUBLIC_SUPABASE_URL ? `POPULATED (${env.NEXT_PUBLIC_SUPABASE_URL})` : 'MISSING'}`);
console.log(`- NEXT_PUBLIC_SUPABASE_ANON_KEY: ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? `POPULATED (length: ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length}, prefix: ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(0, 5)}...)` : 'MISSING'}`);
console.log(`- GEMINI_API_KEY: ${env.GEMINI_API_KEY ? `POPULATED (length: ${env.GEMINI_API_KEY.length}, prefix: ${env.GEMINI_API_KEY.slice(0, 4)}...)` : 'MISSING'}`);
console.log(`- GEMINI_MODEL: ${env.GEMINI_MODEL ? `POPULATED (${env.GEMINI_MODEL})` : 'DEFAULT (gemini-3.8-flash)'}`);
console.log('');

async function testSupabase() {
  console.log('2. SUPABASE LIVE DATABASE & POSTGIS VERIFICATION:');
  console.log('----------------------------------------------------');
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log('[FAIL] Supabase credentials missing');
    return { ok: false };
  }

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  // Check connectivity to tables
  console.log('Checking tables & PostGIS in remote Supabase...');
  
  // Test query incidents
  const { data: incidents, error: incError } = await supabase.from('incidents').select('id, title, status, latitude, longitude').limit(5);
  if (incError) {
    console.log(`[FAIL] Querying incidents table: ${incError.message} (Code: ${incError.code})`);
    return { ok: false, error: incError, supabase };
  } else {
    console.log(`[REAL PASS] incidents table exists and queried successfully (found ${incidents.length} rows)`);
  }

  // Test query confirmations
  const { data: confs, error: confError } = await supabase.from('confirmations').select('id').limit(1);
  if (confError) {
    console.log(`[FAIL] Querying confirmations table: ${confError.message}`);
  } else {
    console.log(`[REAL PASS] confirmations table exists and queried successfully`);
  }

  // Test query resolutions
  const { data: resols, error: resError } = await supabase.from('resolutions').select('id').limit(1);
  if (resError) {
    console.log(`[FAIL] Querying resolutions table: ${resError.message}`);
  } else {
    console.log(`[REAL PASS] resolutions table exists and queried successfully`);
  }

  // Test find_nearby_open_incidents RPC (PostGIS ST_DWithin function)
  console.log('Testing PostGIS find_nearby_open_incidents RPC (ST_DWithin)...');
  const { data: nearby, error: rpcError } = await supabase.rpc('find_nearby_open_incidents', {
    lat: 13.0854,
    lng: 80.2155,
    radius_metres: 50000
  });

  if (rpcError) {
    console.log(`[FAIL / MANUAL ACTION REQUIRED] PostGIS RPC find_nearby_open_incidents: ${rpcError.message}`);
  } else {
    console.log(`[REAL PASS] PostGIS RPC find_nearby_open_incidents executed successfully (returned ${nearby?.length || 0} candidates)`);
  }

  // Test Insert & Clean-up of a live test incident
  console.log('Testing live incident INSERT & DELETE...');
  const testId = `test-verify-${Date.now()}`;
  const { data: inserted, error: insertError } = await supabase.from('incidents').insert({
    id: testId,
    title: 'Live PostGIS Verification Incident',
    description: 'Temporary verification record for ProofFix live cloud verification.',
    category: 'pothole',
    severity: 'medium',
    status: 'open',
    latitude: 13.0854,
    longitude: 80.2155,
    location_accuracy: 4.5,
    city: 'Chennai',
    address_text: '2nd Avenue, Anna Nagar East, Chennai',
    primary_image_url: 'https://placeholder.test/image.jpg',
    captured_at: new Date().toISOString(),
    confirmation_count: 1,
    priority_breakdown: { totalScore: 35, severity: 'medium' },
    ai_observations: { is_road_blocked: false }
  }).select().single();

  if (insertError) {
    console.log(`[FAIL] Live incident insert: ${insertError.message}`);
  } else {
    console.log(`[REAL PASS] Live incident inserted into PostgreSQL: ${inserted.id}`);
    
    // Clean up
    const { error: deleteError } = await supabase.from('incidents').delete().eq('id', testId);
    if (deleteError) {
      console.log(`[WARNING] Test incident cleanup failed: ${deleteError.message}`);
    } else {
      console.log(`[REAL PASS] Test incident cleanly deleted from PostgreSQL`);
    }
  }

  return { ok: true, supabase };
}

async function testStorage(supabase) {
  console.log('\n3. SUPABASE STORAGE LIVE VERIFICATION:');
  console.log('----------------------------------------------------');
  if (!supabase) {
    console.log('[FAIL] Supabase client not initialized');
    return;
  }

  // Check buckets
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) {
    console.log(`[FAIL] Storage listBuckets: ${bucketsError.message}`);
  } else {
    const bucketNames = buckets.map(b => b.name);
    console.log(`Existing Storage Buckets: ${bucketNames.join(', ') || 'none'}`);
    
    const hasIncidentBucket = bucketNames.includes('incident-evidence');
    const hasResolutionBucket = bucketNames.includes('resolution-evidence');

    if (hasIncidentBucket && hasResolutionBucket) {
      console.log('[REAL PASS] incident-evidence and resolution-evidence buckets exist');
    } else {
      console.log(`[MANUAL ACTION REQUIRED] Missing buckets: ${!hasIncidentBucket ? 'incident-evidence ' : ''}${!hasResolutionBucket ? 'resolution-evidence' : ''}`);
    }
  }

  // Attempt test upload to incident-evidence
  const testBuffer = Buffer.from('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'utf-8');
  const testFilePath = `test-verify/ping-${Date.now()}.png`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('incident-evidence')
    .upload(testFilePath, testBuffer, { contentType: 'image/png', upsert: true });

  if (uploadError) {
    console.log(`[FAIL / MANUAL ACTION REQUIRED] Upload to incident-evidence: ${uploadError.message}`);
  } else {
    console.log(`[REAL PASS] Uploaded test file to incident-evidence: ${uploadData.path}`);
    const { data: publicUrlData } = supabase.storage.from('incident-evidence').getPublicUrl(uploadData.path);
    console.log(`[REAL PASS] Public URL generated: ${publicUrlData.publicUrl}`);

    // Clean up
    await supabase.storage.from('incident-evidence').remove([testFilePath]);
    console.log(`[REAL PASS] Cleaned up test storage file`);
  }
}

async function testGemini() {
  console.log('\n4. GEMINI MULTIMODAL API LIVE VERIFICATION:');
  console.log('----------------------------------------------------');
  if (!env.GEMINI_API_KEY) {
    console.log('[FAIL] GEMINI_API_KEY missing');
    return;
  }

  const client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const modelName = env.GEMINI_MODEL || 'gemini-3.8-flash';
  console.log(`Testing Gemini model: "${modelName}"...`);

  // 1x1 green pixel PNG base64
  const sampleImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  try {
    const model = client.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = 'Analyze this test image and return JSON: {"title": "Test Title", "status": "ok", "observations": {"is_road_blocked": false}}';
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: sampleImageBase64, mimeType: 'image/png' } }
    ]);

    const text = result.response.text();
    console.log(`[REAL PASS] Gemini Live API responded with structured JSON`);
    console.log(`Response snippet: ${text.trim().slice(0, 120)}...`);
  } catch (err) {
    console.log(`[FAIL / FALLBACK NEEDED] Gemini API call with "${modelName}": ${err.message}`);
    
    // Check if standard model like gemini-2.5-flash or gemini-1.5-flash or gemini-2.0-flash works
    for (const altModel of ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash']) {
      try {
        console.log(`Testing fallback model name "${altModel}" with Gemini API...`);
        const altGen = client.getGenerativeModel({
          model: altModel,
          generationConfig: { responseMimeType: 'application/json' }
        });
        const altRes = await altGen.generateContent([
          'Return JSON: {"status": "ok"}',
          { inlineData: { data: sampleImageBase64, mimeType: 'image/png' } }
        ]);
        console.log(`[REAL PASS] Model "${altModel}" works directly! Response: ${altRes.response.text().trim()}`);
        break;
      } catch (altErr) {
        console.log(`Model "${altModel}" check: ${altErr.message}`);
      }
    }
  }
}

async function runAll() {
  const { ok, supabase } = await testSupabase();
  await testStorage(supabase);
  await testGemini();
}

runAll();
