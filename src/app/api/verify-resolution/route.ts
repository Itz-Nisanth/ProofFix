import { NextRequest, NextResponse } from 'next/server';
import { getIncidentById, addResolutionToIncident } from '@/lib/db';
import { compareVisualEvidence } from '@/lib/gemini';
import { calculateDistanceMetres } from '@/lib/duplicateEngine';
import { uploadEvidenceImage } from '@/lib/supabase/storage';
import { getAuthenticatedUser } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { incidentId, resolutionImage, latitude, longitude, accuracy } = body;

    if (!incidentId || !resolutionImage) {
      return NextResponse.json({ error: 'incidentId and resolutionImage are required' }, { status: 400 });
    }

    const incident = await getIncidentById(incidentId);
    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    // Derive verified resolver_id from authenticated session
    const authUser = await getAuthenticatedUser(req);
    const resolverId = authUser ? authUser.id : undefined;

    // Upload to Supabase Storage bucket 'resolution-evidence'
    let storedImageUrl = resolutionImage;
    if (storedImageUrl && storedImageUrl.startsWith('data:')) {
      storedImageUrl = await uploadEvidenceImage(storedImageUrl, 'resolution-evidence', 'resolution');
    }

    // Check location match
    let locationMatch = true;
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      const distance = calculateDistanceMetres(latitude, longitude, incident.latitude, incident.longitude);
      locationMatch = distance <= 50; // within 50m of incident location
    }

    // Gemini Multimodal Visual Comparison
    const comparison = await compareVisualEvidence(incident.primary_image_url, resolutionImage);

    const isVerified = Boolean(comparison.isResolved) && locationMatch;

    const { incident: updatedIncident, resolution } = await addResolutionToIncident(incidentId, {
      resolver_id: resolverId,
      resolution_image_url: storedImageUrl,
      latitude: latitude || incident.latitude,
      longitude: longitude || incident.longitude,
      location_accuracy: accuracy || 5.0,
      is_verified: isVerified,
      verification_notes: comparison.explanation,
      residual_findings: isVerified
        ? []
        : ['Obstruction partially cleared, but substantial portion remains in the street lane.'],
      ai_comparison_result: {
        is_cleared: isVerified,
        confidence: comparison.similarityRatio,
        before_summary: incident.description,
        after_summary: comparison.explanation,
        location_match_confirmed: locationMatch,
        explanation: comparison.explanation,
      },
    });

    return NextResponse.json({
      is_verified: isVerified,
      incident: updatedIncident,
      resolution,
      location_match: locationMatch,
      comparison,
    });
  } catch (err: any) {
    console.error('Verify resolution error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
