import { NextRequest, NextResponse } from 'next/server';
import { reverseGeocodeCoordinates } from '@/lib/geocode';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');

    if (!latStr || !lngStr) {
      return NextResponse.json({ error: 'lat and lng parameters are required' }, { status: 400 });
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: 'Invalid latitude or longitude values' }, { status: 400 });
    }

    const result = await reverseGeocodeCoordinates(lat, lng);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        city: 'Unknown',
        locality: '',
        displayName: 'Location captured',
        error: err.message,
      },
      { status: 500 }
    );
  }
}
