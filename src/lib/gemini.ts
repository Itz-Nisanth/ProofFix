import { GoogleGenerativeAI } from '@google/generative-ai';

// Configurable free-tier multimodal model via environment variable
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Normalizes input image string:
 * - If HTTP/HTTPS URL: fetches the image and converts to base64
 * - If Data URL: strips prefix and returns clean base64
 * - If raw Base64: returns as-is
 */
export async function toCleanBase64(imageStr: string): Promise<{ base64: string; mimeType: string; byteSize: number }> {
  if (!imageStr) {
    return { base64: '', mimeType: 'image/jpeg', byteSize: 0 };
  }

  // 1. Data URL
  if (imageStr.startsWith('data:')) {
    const match = imageStr.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const mimeType = match[1];
      const base64 = match[2];
      const byteSize = Math.round((base64.length * 3) / 4);
      return { mimeType, base64, byteSize };
    }
    const clean = imageStr.replace(/^data:image\/\w+;base64,/, '');
    return { mimeType: 'image/jpeg', base64: clean, byteSize: Math.round((clean.length * 3) / 4) };
  }

  // 2. HTTP/HTTPS URL
  if (imageStr.startsWith('http://') || imageStr.startsWith('https://')) {
    try {
      const res = await fetch(imageStr);
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      return {
        base64: buffer.toString('base64'),
        mimeType: contentType,
        byteSize: buffer.length,
      };
    } catch (e) {
      console.warn('[Gemini] Failed to fetch remote image URL:', e);
      throw new Error('Unable to retrieve image from provided URL');
    }
  }

  // 3. Raw Base64 string
  const byteSize = Math.round((imageStr.length * 3) / 4);
  return { base64: imageStr, mimeType: 'image/jpeg', byteSize };
}

export interface IncidentAnalysisResult {
  title: string;
  description: string;
  category: string;
  source: 'gemini-live' | 'mock' | 'error';
  observations: {
    scene_summary: string;
    identified_issue: string;
    public_impact: string;
    is_road_blocked: boolean;
    has_live_wire_hazard: boolean;
    has_structural_fall_hazard: boolean;
    has_chemical_sewage_risk: boolean;
    has_deep_hole_cavein: boolean;
    traffic_disruption_level: 'none' | 'minor' | 'moderate' | 'severe';
    tags: string[];
  };
}

/**
 * Uses Gemini multimodal vision to extract civic observations from live captured photo.
 * Note: Gemini extracts observations, but does NOT compute the final priority number.
 */
export async function analyzeIncidentPhoto(
  imageSource: string,
  mimeType: string = 'image/jpeg'
): Promise<IncidentAnalysisResult> {
  const { base64: cleanBase64, mimeType: resolvedMime, byteSize } = await toCleanBase64(imageSource);

  // Server logging (NO secrets)
  console.log('----------------------------------------------------');
  console.log('[Gemini Analysis] Image received:', Boolean(cleanBase64));
  console.log('[Gemini Analysis] Image MIME type:', resolvedMime || mimeType);
  console.log('[Gemini Analysis] Image byte size:', `${(byteSize / 1024).toFixed(1)} KB`);

  if (!cleanBase64 || byteSize === 0) {
    console.error('[Gemini Analysis] Empty or invalid image bytes provided.');
    throw new Error('Empty or invalid image data provided.');
  }

  const client = getGeminiClient();

  if (!client) {
    console.warn('[Gemini Analysis] No GEMINI_API_KEY detected in environment.');
    throw new Error('Gemini API is not configured. Please set GEMINI_API_KEY.');
  }

  console.log(`[Gemini Analysis] Gemini request attempted with model: "${MODEL_NAME}"`);

  const model = client.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = `
You are an expert civic incident visual understanding model for ProofFix.
Analyze the provided live photo evidence of a civic, environmental, or neighborhood scene.

Extract specific, factual observations strictly based on what is visible in this exact image.
Do not assume it is a fallen tree unless a fallen tree or branch is actually present.
If the image shows an indoor object, room, person, pothole, street, garbage, or clean area, describe exactly what is shown.

Return a valid JSON object ONLY adhering to this exact schema:

{
  "title": "Short, accurate human-readable title describing what is in this image (e.g. 'Deep Asphalt Pothole', 'Discarded Plastic Waste Pile', 'Indoor Room / Person', 'Overgrown Vegetation')",
  "description": "2-3 conversational sentences accurately describing what is seen in the image and its immediate environment.",
  "category": "One of: 'fallen_tree', 'pothole', 'waterlogging', 'debris', 'hazardous_wiring', 'sanitation', 'other'",
  "observations": {
    "scene_summary": "Summary of visual evidence seen in image",
    "identified_issue": "Specific primary issue or subject identified",
    "public_impact": "Plain-language description of impact on pedestrians, vehicles, or neighborhood",
    "is_road_blocked": true/false (true ONLY if road/lane is visibly obstructed),
    "has_live_wire_hazard": true/false (true ONLY if broken/hanging electrical wires visible),
    "has_structural_fall_hazard": true/false (true ONLY if heavy leaning limb, unstable wall collapse risk),
    "has_chemical_sewage_risk": true/false (true ONLY if raw sewage, chemicals, medical waste),
    "has_deep_hole_cavein": true/false (true ONLY if large road sinkhole, open manhole, deep pothole),
    "traffic_disruption_level": "severe" | "moderate" | "minor" | "none",
    "tags": ["array", "of", "4-6", "specific", "descriptive", "tags"]
  }
}
`;

  let lastError: any = null;
  const modelsToTry = [MODEL_NAME, 'gemini-3.6-flash'].filter((v, i, a) => a.indexOf(v) === i);

  for (const currentModelName of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini Analysis] Attempt with model: "${currentModelName}" (try ${attempt})...`);
        const model = client.getGenerativeModel({
          model: currentModelName,
          generationConfig: {
            responseMimeType: 'application/json',
          },
        });

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: cleanBase64,
              mimeType: resolvedMime || mimeType,
            },
          },
        ]);

        const responseText = result.response.text();
        console.log('[Gemini Analysis] Gemini response received.');

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error('[Gemini Analysis] Failed to parse JSON from response:', responseText);
          throw new Error('Gemini response did not contain valid JSON.');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        console.log(`[Gemini Analysis] Parsed title: "${parsed.title}" | category: "${parsed.category}"`);
        console.log('[Gemini Analysis] fallbackUsed: false');
        console.log('----------------------------------------------------');

        return {
          title: parsed.title || 'Civic Scene Observation',
          description: parsed.description || 'Observed visual evidence.',
          category: parsed.category || 'other',
          source: 'gemini-live',
          observations: {
            scene_summary: parsed.observations?.scene_summary || 'Visual evidence observed.',
            identified_issue: parsed.observations?.identified_issue || 'Civic observation',
            public_impact: parsed.observations?.public_impact || 'Impact assessed from image evidence.',
            is_road_blocked: Boolean(parsed.observations?.is_road_blocked),
            has_live_wire_hazard: Boolean(parsed.observations?.has_live_wire_hazard),
            has_structural_fall_hazard: Boolean(parsed.observations?.has_structural_fall_hazard),
            has_chemical_sewage_risk: Boolean(parsed.observations?.has_chemical_sewage_risk),
            has_deep_hole_cavein: Boolean(parsed.observations?.has_deep_hole_cavein),
            traffic_disruption_level: parsed.observations?.traffic_disruption_level || 'none',
            tags: Array.isArray(parsed.observations?.tags) ? parsed.observations.tags : ['live-capture'],
          },
        };
      } catch (error: any) {
        lastError = error;
        const isQuotaExceeded = error.message?.includes('Quota exceeded') || error.message?.includes('exceeded your current quota');
        const isTransient =
          !isQuotaExceeded &&
          (error.message?.includes('503') ||
            error.message?.includes('429') ||
            error.status === 503 ||
            error.status === 429);

        if (isQuotaExceeded) {
          console.warn(`[Gemini Analysis] Model ${currentModelName} daily quota reached. Switching model immediately...`);
          break; // Try next model immediately
        }

        if (isTransient && attempt < 2) {
          const delayMs = 1500;
          console.warn(`[Gemini Analysis] Transient rate limit with ${currentModelName}. Retrying in ${delayMs}ms...`);
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        break;
      }
    }
  }

  console.error('[Gemini Analysis Error] Live analysis failed on all models:', lastError?.message);
  throw new Error(`Unable to analyze this image. Please retry. (${lastError?.message || 'Unknown error'})`);
}

/**
 * Compare two images for visual similarity in duplicate detection or resolution verification.
 */
export async function compareVisualEvidence(
  image1Source: string,
  image2Source: string
): Promise<{
  similarityRatio: number; // 0.0 to 1.0
  isResolved?: boolean;
  explanation: string;
  source: 'gemini-live' | 'mock' | 'error';
}> {
  const client = getGeminiClient();

  if (!client) {
    throw new Error('Gemini API is not configured.');
  }

  const [img1, img2] = await Promise.all([
    toCleanBase64(image1Source),
    toCleanBase64(image2Source),
  ]);

  if (!img1.base64 || !img2.base64) {
    throw new Error('Invalid images provided for comparison.');
  }

  const model = client.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = `
Compare these two civic evidence photos.
Image 1 is the original reported incident.
Image 2 is a new live photo captured at approximately the same location.

Evaluate:
1. Visual Similarity: Are these two photos taken at the exact same physical scene/street angle? (0.0 to 1.0)
2. Resolution Status: Has the civic issue in Image 1 been cleared or resolved in Image 2? (true/false)

Return valid JSON ONLY:
{
  "similarityRatio": 0.85,
  "isResolved": true,
  "explanation": "Clear explanation of differences or similarities observed between both images."
}
`;

  try {
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: img1.base64, mimeType: img1.mimeType } },
      { inlineData: { data: img2.base64, mimeType: img2.mimeType } },
    ]);

    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        similarityRatio: typeof parsed.similarityRatio === 'number' ? parsed.similarityRatio : 0.75,
        isResolved: Boolean(parsed.isResolved),
        explanation: parsed.explanation || 'Visual comparison complete.',
        source: 'gemini-live',
      };
    }

    throw new Error('Invalid JSON response from Gemini visual comparison.');
  } catch (err: any) {
    console.error('[Gemini Visual Comparison Error]:', err.message);
    throw new Error(`Visual comparison failed: ${err.message}`);
  }
}
