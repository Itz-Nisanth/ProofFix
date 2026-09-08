import { NextRequest, NextResponse } from 'next/server';
import { getIncidentById } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const incident = await getIncidentById(params.id);
    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }
    return NextResponse.json({ incident });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
