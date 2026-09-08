import fs from 'fs';
import path from 'path';

// Let's create 3 distinct SVG images and convert them to base64 data URLs to test Gemini Multimodal vision
function createIndoorSceneSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <rect width="800" height="600" fill="#f0ece1"/>
    <!-- Office Desk -->
    <rect x="100" y="350" width="600" height="200" fill="#8B5A2B" rx="8"/>
    <!-- Laptop -->
    <rect x="250" y="240" width="220" height="130" fill="#333333" rx="6"/>
    <rect x="260" y="250" width="200" height="110" fill="#4A90E2"/>
    <polygon points="230,370 490,370 470,390 250,390" fill="#555555"/>
    <!-- Ceramic Coffee Mug -->
    <rect x="520" y="320" width="50" height="60" fill="#e74c3c" rx="4"/>
    <path d="M570 335 C 585 335, 585 365, 570 365" stroke="#e74c3c" stroke-width="6" fill="none"/>
    <!-- Person silhouette at desk -->
    <circle cx="360" cy="160" r="40" fill="#2c3e50"/>
    <path d="M300 240 C 300 200, 420 200, 420 240 Z" fill="#2c3e50"/>
    <text x="400" y="550" font-family="sans-serif" font-size="28" font-weight="bold" fill="#333333" text-anchor="middle">Indoor Office Desk with Laptop, Coffee Mug &amp; Person</text>
  </svg>`;
}

function createOutdoorPotholeSceneSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <!-- Asphalt Road Surface -->
    <rect width="800" height="600" fill="#3b3f46"/>
    <!-- Yellow center dashed lines -->
    <line x1="400" y1="0" x2="400" y2="120" stroke="#f1c40f" stroke-width="12" stroke-dasharray="40,30"/>
    <line x1="400" y1="180" x2="400" y2="300" stroke="#f1c40f" stroke-width="12" stroke-dasharray="40,30"/>
    <line x1="400" y1="360" x2="400" y2="600" stroke="#f1c40f" stroke-width="12" stroke-dasharray="40,30"/>
    <!-- Concrete Sidewalk -->
    <rect x="0" y="0" width="100" height="600" fill="#95a5a6"/>
    <rect x="700" y="0" width="100" height="600" fill="#95a5a6"/>
    <!-- Large Deep Pothole with Cracks -->
    <ellipse cx="320" cy="380" rx="140" ry="75" fill="#1a1c1e"/>
    <ellipse cx="320" cy="380" rx="110" ry="55" fill="#0d0e0f"/>
    <!-- Water inside pothole -->
    <ellipse cx="330" cy="390" rx="80" ry="35" fill="#2980b9" opacity="0.6"/>
    <!-- Crack lines -->
    <path d="M180 380 L130 360 M460 380 L520 400 M320 455 L340 510 M300 305 L280 250" stroke="#1a1c1e" stroke-width="5"/>
    <text x="400" y="80" font-family="sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">Asphalt Street with Deep Pothole and Cracks</text>
  </svg>`;
}

function createSanitationWasteSceneSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <!-- Pavement Background -->
    <rect width="800" height="600" fill="#d5dbdb"/>
    <!-- Overflowing Green Garbage Dumpster Bin -->
    <rect x="150" y="200" width="300" height="280" fill="#27ae60" rx="10"/>
    <rect x="130" y="180" width="340" height="30" fill="#1e8449" rx="5"/>
    <!-- Overflowing garbage bags & discarded plastic waste -->
    <circle cx="230" cy="150" r="45" fill="#2c3e50"/>
    <circle cx="320" cy="140" r="55" fill="#7f8c8d"/>
    <circle cx="390" cy="160" r="40" fill="#e67e22"/>
    <!-- Spilled Trash on Ground -->
    <ellipse cx="300" cy="510" rx="220" ry="60" fill="#bdc3c7"/>
    <rect x="200" y="490" width="60" height="40" fill="#e74c3c" transform="rotate(15 200 490)"/>
    <rect x="310" y="500" width="70" height="30" fill="#f39c12" transform="rotate(-10 310 500)"/>
    <circle cx="420" cy="510" r="25" fill="#3498db"/>
    <circle cx="160" cy="500" r="20" fill="#9b59b6"/>
    <text x="400" y="80" font-family="sans-serif" font-size="28" font-weight="bold" fill="#2c3e50" text-anchor="middle">Overflowing Municipal Garbage Bin &amp; Plastic Waste Pile</text>
  </svg>`;
}

function svgToDataUrl(svgString) {
  const base64 = Buffer.from(svgString).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

async function testImage(testName, svgContent, lat, lng) {
  console.log(`\n======================================================`);
  console.log(`TEST: ${testName}`);
  console.log(`======================================================`);

  const dataUrl = svgToDataUrl(svgContent);

  const payload = {
    image: dataUrl,
    latitude: lat,
    longitude: lng,
    accuracy: 3.5,
    capturedAt: new Date().toISOString()
  };

  try {
    const res = await fetch('http://localhost:3000/api/analyze-incident', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    console.log(`Status Code: ${res.status}`);
    console.log(`Source: ${data.source}`);
    console.log(`Title: "${data.title}"`);
    console.log(`Category: "${data.category}"`);
    console.log(`Description: "${data.description}"`);
    console.log(`Priority Score: ${data.priority_breakdown?.totalScore}/100 (${data.priority_breakdown?.severity})`);
    console.log(`Tags:`, data.ai_observations?.tags);

    return data;
  } catch (err) {
    console.error(`Error testing ${testName}:`, err);
    throw err;
  }
}

async function runAllTests() {
  console.log('Starting 3-Image Live Gemini Analysis Verification...');

  // Test 1: Indoor Office / Person Scene
  const result1 = await testImage(
    '1. Indoor Scene (Office Desk, Laptop, Coffee Mug, Person)',
    createIndoorSceneSVG(),
    13.0827,
    80.2707
  );

  console.log('Waiting 8s before next test image to observe free-tier quota window...');
  await new Promise((r) => setTimeout(r, 8000));

  // Test 2: Outdoor Asphalt Road Pothole Scene
  const result2 = await testImage(
    '2. Outdoor Road Scene (Deep Road Pothole & Water)',
    createOutdoorPotholeSceneSVG(),
    13.0835,
    80.2715
  );

  console.log('Waiting 8s before next test image to observe free-tier quota window...');
  await new Promise((r) => setTimeout(r, 8000));

  // Test 3: Sanitation / Garbage Waste Pile Scene
  const result3 = await testImage(
    '3. Distinct Object Scene (Overflowing Garbage Dumpster & Waste)',
    createSanitationWasteSceneSVG(),
    13.0850,
    80.2730
  );

  console.log('\n================ SUMMARY OF 3 RUNS ================');
  console.log(`Run 1 (Indoor):     Title: "${result1.title}" | Category: "${result1.category}" | Source: "${result1.source}"`);
  console.log(`Run 2 (Pothole):    Title: "${result2.title}" | Category: "${result2.category}" | Source: "${result2.source}"`);
  console.log(`Run 3 (Sanitation): Title: "${result3.title}" | Category: "${result3.category}" | Source: "${result3.source}"`);
  
  const allDifferent = result1.title && result2.title && result3.title &&
    result1.title !== result2.title && result2.title !== result3.title;
  const noFallenTreeFallback = !result1.title?.includes('Fallen Tree') && !result3.title?.includes('Fallen Tree');
  
  console.log(`\nVerification Results:`);
  console.log(`- Titles dynamically vary by image: ${allDifferent ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`- No hardcoded Fallen Tree fallback: ${noFallenTreeFallback ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`- Source returned as gemini-live: ${result1.source === 'gemini-live' && result2.source === 'gemini-live' && result3.source === 'gemini-live' ? 'PASSED ✅' : 'FAILED ❌'}`);
}

runAllTests();
