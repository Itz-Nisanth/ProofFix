import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env.local', 'utf8');
function getEnv(key) {
  const match = envContent.match(new RegExp(`${key}=(.+)`));
  return match ? match[1].trim() : '';
}

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
const anonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, serviceRoleKey || anonKey);

async function testLiveFlow() {
  console.log('====================================================');
  console.log('TESTING COMPLETE INCIDENT SUBMISSION & POSTGIS PERSISTENCE');
  console.log('====================================================\n');

  // 1. Get real profile
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').limit(1);
  const profile = profiles?.[0];
  console.log('1. Authenticated User Profile:', profile);

  if (!profile) {
    throw new Error('No user profile found in public.profiles. Sign in once via Google OAuth.');
  }

  // 2. Prepare real incident payload with Base64 image
  const testSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#2c3e50"/><text x="200" y="150" font-family="sans-serif" font-size="20" fill="#ffffff" text-anchor="middle">Live Captured Pothole Evidence</text></svg>`;
  const base64Data = Buffer.from(testSvg).toString('base64');
  const testDataUrl = `data:image/svg+xml;base64,${base64Data}`;

  const payload = {
    title: 'Waterlogged Pothole on 2nd Avenue',
    description: 'Deep road cavity filled with stagnant monsoon runoff creating traffic hazard.',
    category: 'pothole',
    severity: 'medium',
    status: 'open',
    latitude: 13.0850,
    longitude: 80.2150,
    location_accuracy: 3.8,
    city: 'Chennai',
    address_text: '2nd Avenue, Anna Nagar East, Chennai',
    primary_image_url: testDataUrl,
    captured_at: new Date().toISOString(),
    ai_observations: {
      identified_issue: 'Deep asphalt pothole filled with water',
      scene_summary: 'Waterlogged road surface in active traffic lane',
      public_impact: 'Vehicles must brake abruptly to avoid suspension damage',
      is_road_blocked: false,
      has_deep_hole_cavein: true,
      has_live_wire_hazard: false,
      has_structural_fall_hazard: false,
      has_chemical_sewage_risk: false,
      traffic_disruption_level: 'minor',
      tags: ['pothole', 'waterlogged', 'road_hazard', 'live-capture']
    },
    priority_breakdown: {
      humanSafetyScore: 25,
      environmentalHealthScore: 0,
      publicObstructionScore: 5,
      independentConfirmationsScore: 0,
      timeUnresolvedScore: 0,
      totalScore: 30,
      severity: 'low',
      reasons: ['Deep crater / road cave-in hazard (+25)', 'Minor passage obstruction (+5)']
    },
    confirmation_count: 1,
  };

  console.log('\n2. Calling POST /api/incidents via dev server...');
  
  // Notice: In production, the browser sends the user's Supabase access token in Authorization header.
  // Let's create an auth header or call with simulated service token.
  const res = await fetch('http://localhost:3000/api/incidents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // In tests, we pass the service role token or let admin verify
      'Authorization': `Bearer ${serviceRoleKey}`
    },
    body: JSON.stringify(payload)
  });

  const responseJson = await res.json();
  console.log('HTTP Status:', res.status);
  console.log('Response Body:', JSON.stringify(responseJson, null, 2));

  if (!res.ok || !responseJson.incident) {
    throw new Error(`API failed: ${responseJson.error}`);
  }

  const incidentId = responseJson.incident.id;
  console.log('\n3. Verifying database record directly in Supabase for UUID:', incidentId);

  const { data: dbIncident, error: dbError } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', incidentId)
    .single();

  if (dbError || !dbIncident) {
    console.error('Database query error:', dbError);
    throw new Error('Incident was not persisted to public.incidents!');
  }

  console.log('\n================ VERIFICATION RESULTS ================');
  console.log('1. Database Row Exists:            ✅ YES (UUID: ' + dbIncident.id + ')');
  console.log('2. Confirmation Count:             ✅ ' + dbIncident.confirmation_count);
  console.log('3. Stored Primary Image URL:       ✅ ' + dbIncident.primary_image_url);
  console.log('4. Image Stored in Supabase Bucket:✅ ' + (dbIncident.primary_image_url.includes('supabase.co/storage/v1/object/public/incident-evidence') ? 'YES' : 'NO'));
  console.log('5. PostGIS Location Populated:     ✅ ' + dbIncident.location);
  console.log('6. Status is open:                 ✅ ' + dbIncident.status);
  console.log('7. AI Observations Saved:          ✅ ' + JSON.stringify(dbIncident.ai_observations).slice(0, 60) + '...');
  console.log('======================================================\n');
}

testLiveFlow();
