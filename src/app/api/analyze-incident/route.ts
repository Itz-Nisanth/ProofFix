import { NextRequest, NextResponse } from 'next/server';
import { analyzeIncidentPhoto, compareVisualEvidence } from '@/lib/gemini';
import { calculateDeterministicPriority } from '@/lib/priorityEngine';
import { findOpenCandidatesWithinRadius } from '@/lib/db';
import { evaluateDuplicateCandidate } from '@/lib/duplicateEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, latitude, longitude, accuracy, capturedAt } = body;

    if (!image) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    // 1. Gemini Multimodal Observation Extraction (Visual scene understanding)
    const analysis = await analyzeIncidentPhoto(image);

    // 2. Deterministic 100-Point Civic Priority Engine (TypeScript rule calculation)
    const priorityBreakdown = calculateDeterministicPriority({
      is_road_blocked: analysis.observations.is_road_blocked,
      has_live_wire_hazard: analysis.observations.has_live_wire_hazard,
      has_structural_fall_hazard: analysis.observations.has_structural_fall_hazard,
      has_chemical_sewage_risk: analysis.observations.has_chemical_sewage_risk,
      has_deep_hole_cavein: analysis.observations.has_deep_hole_cavein,
      traffic_disruption_level: analysis.observations.traffic_disruption_level,
      confirmation_count: 1,
    });

    // 3. Stage 1: PostGIS / Haversine Spatial Candidate Search (~35m radius for open incidents)
    let duplicateResult = null;
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      const candidates = await findOpenCandidatesWithinRadius(latitude, longitude, 35);

      if (candidates.length > 0) {
        const topCandidate = candidates[0];

        // 4. Stage 2: 4-Factor Weighted Multi-Modal Duplicate Evaluation
        // Compare new capture with candidate incident photo
        let visualRatio = 0.75;
        try {
          if (topCandidate.primary_image_url) {
            const visualComp = await compareVisualEvidence(topCandidate.primary_image_url, image);
            visualRatio = visualComp.similarityRatio;
          }
        } catch (e) {
          console.warn('Visual comparison fallback:', e);
        }

        duplicateResult = evaluateDuplicateCandidate({
          newLat: latitude,
          newLng: longitude,
          newCategory: analysis.category,
          newCapturedAt: capturedAt || new Date().toISOString(),
          visualSimilarityRatio: visualRatio,
          existingCandidate: topCandidate,
          maxRadiusMetres: 35,
        });
      }
    }

    return NextResponse.json({
      title: analysis.title,
      description: analysis.description,
      category: analysis.category,
      ai_observations: analysis.observations,
      priority_breakdown: priorityBreakdown,
      duplicate_candidate: duplicateResult,
      source: analysis.source || 'gemini-live',
      telemetry: {
        latitude,
        longitude,
        location_accuracy: accuracy || 5.0,
        captured_at: capturedAt || new Date().toISOString(),
        server_time: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[Analyze Incident Route Error]:', err.message);
    return NextResponse.json(
      {
        error: 'Unable to analyze this image. Please retry.',
        details: err.message,
        source: 'error',
      },
      { status: 500 }
    );
  }
}
