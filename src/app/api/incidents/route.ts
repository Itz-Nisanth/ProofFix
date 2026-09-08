import { NextRequest, NextResponse } from 'next/server';
import { getIncidents, createIncident } from '@/lib/db';
import { uploadEvidenceImage } from '@/lib/supabase/storage';
import { getAuthenticatedUser } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city') || undefined;
    const status = searchParams.get('status') || undefined;
    const severity = searchParams.get('severity') || undefined;

    const incidents = await getIncidents({ city, status, severity });
    return NextResponse.json({ incidents });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const isSupabaseLive = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder-project'));

    // 1. Authenticate user from session token (do NOT trust reporter_id from client body)
    const authUser = await getAuthenticatedUser(req);
    const reporterId = authUser ? authUser.id : null;

    console.log('----------------------------------------------------');
    console.log('[Incident Submit] Authenticated user found:', Boolean(reporterId));
    if (reporterId) {
      console.log('[Incident Submit] Reporter User ID:', reporterId);
    }

    if (isSupabaseLive && !reporterId) {
      console.warn('[Incident Submit] Rejected unauthenticated submission in live mode.');
      console.log('----------------------------------------------------');
      return NextResponse.json(
        { error: 'You must be signed in with Google to submit an incident report.' },
        { status: 401 }
      );
    }

    // 2. Upload image to Supabase Storage bucket 'incident-evidence'
    let imageUrl = body.primary_image_url;
    let uploadSuccess = false;
    if (imageUrl && imageUrl.startsWith('data:')) {
      const uploaded = await uploadEvidenceImage(imageUrl, 'incident-evidence', 'incident');
      uploadSuccess = Boolean(uploaded && !uploaded.startsWith('data:'));
      imageUrl = uploaded;
    } else if (imageUrl) {
      uploadSuccess = true;
    }

    console.log('[Incident Submit] Storage upload success:', uploadSuccess);
    console.log('[Incident Submit] Incident insert attempted: true');

    // 3. Insert into Supabase public.incidents
    const newIncident = await createIncident({
      title: body.title,
      description: body.description,
      category: body.category,
      severity: body.severity,
      status: 'open',
      reporter_id: reporterId || undefined,
      latitude: body.latitude,
      longitude: body.longitude,
      location_accuracy: body.location_accuracy || 5.0,
      city: body.city && body.city !== 'Unknown' ? body.city : null,
      address_text: body.address_text || (body.city && body.city !== 'Unknown' ? `${body.city}, Location verified` : 'Location captured'),
      primary_image_url: imageUrl,
      captured_at: body.captured_at || new Date().toISOString(),
      ai_observations: body.ai_observations || {},
      priority_breakdown: body.priority_breakdown || {},
      confirmation_count: 1,
    });

    console.log('[Incident Submit] Database insert success: true');
    console.log('[Incident Submit] Returned incident UUID:', newIncident.id);
    console.log('----------------------------------------------------');

    return NextResponse.json({ incident: newIncident }, { status: 201 });
  } catch (err: any) {
    console.error('[Incident Submit] Database insert success: false');
    console.error('[Incident Submit] Database error code/message:', err.code || 'ERR', err.message);
    console.log('----------------------------------------------------');
    return NextResponse.json(
      { error: err.message || 'Database incident creation failed.', code: err.code || 'DB_ERROR' },
      { status: 500 }
    );
  }
}
