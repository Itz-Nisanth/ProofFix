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

console.log('Supabase URL:', supabaseUrl);
console.log('Service Role Key Present:', Boolean(serviceRoleKey));

const supabase = createClient(supabaseUrl, serviceRoleKey || anonKey);

async function testPipeline() {
  console.log('\n--- 1. Testing Storage Bucket (incident-evidence) ---');
  const testBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const testFileName = `test-capture-${Date.now()}.png`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('incident-evidence')
    .upload(testFileName, testBuffer, { contentType: 'image/png', upsert: true });

  if (uploadError) {
    console.error('Storage Upload Failed:', uploadError.message);
  } else {
    const { data: publicUrlData } = supabase.storage.from('incident-evidence').getPublicUrl(testFileName);
    console.log('Storage Upload Success! Public URL:', publicUrlData.publicUrl);
  }

  console.log('\n--- 2. Testing Profiles & Incidents Insertion ---');
  // Check if any profile exists or get existing users
  const { data: profiles, error: profError } = await supabase.from('profiles').select('id, full_name, email').limit(1);
  console.log('Existing Profiles:', profiles, 'Error:', profError?.message);

  let reporterId = null;
  if (profiles && profiles.length > 0) {
    reporterId = profiles[0].id;
    console.log('Using real profile ID:', reporterId);
  }

  const testIncident = {
    reporter_id: reporterId,
    title: 'Test Asphalt Pothole Hazard',
    description: 'A deep pothole discovered during live camera test.',
    category: 'pothole',
    severity: 'medium',
    status: 'open',
    latitude: 13.0827,
    longitude: 80.2707,
    location_accuracy: 4.2,
    city: 'Chennai',
    address_text: 'Anna Nagar West, Chennai',
    primary_image_url: 'https://satwmsygrtlxfortxcws.supabase.co/storage/v1/object/public/incident-evidence/' + testFileName,
    captured_at: new Date().toISOString(),
    ai_observations: {
      identified_issue: 'Deep asphalt road pothole',
      is_road_blocked: false,
      traffic_disruption_level: 'minor',
      tags: ['pothole', 'road_hazard', 'live-test']
    },
    priority_breakdown: {
      totalScore: 40,
      severity: 'medium',
      reasons: ['Deep road pothole (+25)', 'Minor passage obstruction (+5)']
    },
    confirmation_count: 1,
    location: 'POINT(80.2707 13.0827)'
  };

  console.log('Attempting insert into public.incidents...');
  const { data: incData, error: incError } = await supabase
    .from('incidents')
    .insert(testIncident)
    .select()
    .single();

  if (incError) {
    console.error('Incident Insert Failed:', incError);
  } else {
    console.log('Incident Insert SUCCESS! Created Row:', incData.id, incData.title, incData.location);
  }
}

testPipeline();
