export interface GeocodeResult {
  city: string;
  locality: string;
  displayName: string;
  state?: string;
  country?: string;
}

/**
 * Free Reverse Geocoding helper using OpenStreetMap Nominatim.
 * Strictly derives the location from real coordinates.
 * Never fabricates or defaults to a hardcoded city.
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number
): Promise<GeocodeResult> {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return {
      city: 'Unknown',
      locality: '',
      displayName: 'Location captured',
    };
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ProofFix-CivicApp/1.0 (civic-evidence-verification)',
        'Accept': 'application/json',
      },
      // 4 second timeout for responsive UI
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      throw new Error(`Nominatim returned status ${res.status}`);
    }

    const data = await res.json();
    const addr = data.address || {};

    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.county ||
      addr.state_district ||
      addr.state ||
      'Unknown';

    const locality =
      addr.suburb ||
      addr.neighbourhood ||
      addr.residential ||
      addr.road ||
      addr.quarter ||
      addr.city_district ||
      '';

    const state = addr.state || '';
    const country = addr.country || '';

    // Construct human-friendly clean address text
    const parts = [locality, city, state].filter(Boolean);
    const displayName = parts.length > 0 ? parts.join(', ') : data.display_name || `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

    return {
      city,
      locality,
      displayName,
      state,
      country,
    };
  } catch (err: any) {
    console.warn(`[Reverse Geocode Warning for ${lat}, ${lng}]:`, err.message);
    return {
      city: 'Unknown',
      locality: '',
      displayName: `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    };
  }
}
