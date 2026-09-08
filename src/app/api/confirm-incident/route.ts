import { NextRequest, NextResponse } from 'next/server';
import { addConfirmationToIncident } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { incidentId, latitude, longitude, accuracy, image, capturedAt } = body;

    if (!incidentId) {
      return NextResponse.json({ error: 'incidentId is required' }, { status: 400 });
    }

    // Derive verified user from authenticated Supabase session if available
    const authUser = await getAuthenticatedUser(req);
    const userId = authUser ? authUser.id : undefined;

    const updatedIncident = await addConfirmationToIncident(incidentId, {
      user_id: userId,
      latitude: typeof latitude === 'number' ? latitude : 0,
      longitude: typeof longitude === 'number' ? longitude : 0,
      location_accuracy: accuracy || 5.0,
      image_url: image,
      captured_at: capturedAt || new Date().toISOString(),
    });

    if (!updatedIncident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      incident: updatedIncident,
      confirmation_count: updatedIncident.confirmation_count,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
