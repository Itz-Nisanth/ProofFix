import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export interface NormalizedLocation {
  label: string;
  city: string;
  locality: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || searchParams.get('text') || '').trim();

    // Query behavior: minimum 3 typed characters
    if (!query || query.length < 3) {
      return NextResponse.json({ results: [] });
    }

    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!apiKey) {
      console.warn('[Location Search] GEOAPIFY_API_KEY is not configured in server environment.');
      return NextResponse.json({
        results: [],
        error: 'Location search service is not configured with an API key.',
      });
    }

    // Call Geoapify Address Autocomplete API
    // Restrict results to India (filter=countrycode:in), max 5 suggestions (limit=5)
    const geoapifyUrl = new URL('https://api.geoapify.com/v1/geocode/autocomplete');
    geoapifyUrl.searchParams.set('text', query);
    geoapifyUrl.searchParams.set('apiKey', apiKey);
    geoapifyUrl.searchParams.set('filter', 'countrycode:in');
    geoapifyUrl.searchParams.set('limit', '5');
    geoapifyUrl.searchParams.set('format', 'json');

    const res = await fetch(geoapifyUrl.toString(), {
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate: 3600 }, // Cache search queries for 1 hour
    });

    if (!res.ok) {
      console.warn(`[Location Search] Geoapify returned HTTP ${res.status}`);
      return NextResponse.json({
        results: [],
        error: 'Location autocomplete service temporarily unavailable',
      });
    }

    const data = await res.json();
    const rawResults = data.results || [];

    // Normalize each result
    const normalized: NormalizedLocation[] = rawResults.map((item: any) => {
      const city = item.city || item.county || item.state_district || '';
      const locality = item.suburb || item.district || item.neighbourhood || item.locality || item.name || '';
      const state = item.state || item.province || '';
      const country = item.country || 'India';

      // Build intuitive display label e.g., "White Town, Puducherry" or "Bengaluru, Karnataka"
      let label = '';
      if (locality && city && locality.toLowerCase() !== city.toLowerCase()) {
        label = `${locality}, ${city}`;
      } else if (city && state) {
        label = `${city}, ${state}`;
      } else if (locality && state) {
        label = `${locality}, ${state}`;
      } else if (item.formatted) {
        label = item.formatted;
      } else {
        label = item.name || city || state || query;
      }

      return {
        label,
        city: city || locality || '',
        locality: locality || '',
        state,
        country,
        latitude: typeof item.lat === 'number' ? item.lat : 0,
        longitude: typeof item.lon === 'number' ? item.lon : 0,
      };
    });

    return NextResponse.json({ results: normalized });
  } catch (err: any) {
    console.error('[Location Search API Error]:', err);
    return NextResponse.json(
      { results: [], error: 'Failed to process location search' },
      { status: 500 }
    );
  }
}
