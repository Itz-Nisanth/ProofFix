/**
 * Location State Management for ProofFix.
 * Isolates Report GPS Telemetry from Risks Filter State.
 * Automatically cleans up legacy or stale mock keys.
 */

export interface ReportTelemetry {
  latitude: number;
  longitude: number;
  accuracy: number;
  city: string;
  locality?: string;
  address_text: string;
  captured_at: string;
  is_gps_verified?: boolean;
}

const REPORT_TELEMETRY_KEY = 'prooffix_current_telemetry';
const RISK_FILTER_CITY_KEY = 'selectedRiskCity';

/**
 * Clean up legacy or mock location keys from sessionStorage & localStorage.
 */
export function sanitizeStaleLocationState(): void {
  if (typeof window === 'undefined') return;

  try {
    // 1. Sanitize sessionStorage telemetry
    const stored = window.sessionStorage.getItem(REPORT_TELEMETRY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // If it has legacy hardcoded coordinates or lacks real GPS verification flag
      if (
        (parsed.latitude === 13.0854 && parsed.longitude === 80.2155) ||
        parsed.address_text === 'Anna Nagar East, Chennai' ||
        parsed.address_text === 'Current Location, Chennai' ||
        (!parsed.is_gps_verified && parsed.city === 'Chennai')
      ) {
        window.sessionStorage.removeItem(REPORT_TELEMETRY_KEY);
      }
    }

    // 2. Sanitize any legacy localStorage keys
    const legacyKeys = [
      'prooffix_city',
      'user_location',
      'current_city',
      'default_city',
      'prooffix_current_city',
    ];
    for (const k of legacyKeys) {
      window.localStorage.removeItem(k);
      window.sessionStorage.removeItem(k);
    }
  } catch (err) {
    console.warn('[Sanitize Location State]:', err);
  }
}

/**
 * Get verified report GPS telemetry. Returns null if not geolocated yet.
 */
export function getReportTelemetry(): ReportTelemetry | null {
  if (typeof window === 'undefined') return null;

  try {
    sanitizeStaleLocationState();
    const stored = window.sessionStorage.getItem(REPORT_TELEMETRY_KEY);
    if (!stored) return null;
    const parsed: ReportTelemetry = JSON.parse(stored);
    if (!parsed || typeof parsed.latitude !== 'number' || typeof parsed.longitude !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Save real acquired GPS report telemetry.
 */
export function saveReportTelemetry(telemetry: ReportTelemetry): void {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(REPORT_TELEMETRY_KEY, JSON.stringify({
      ...telemetry,
      is_gps_verified: true,
    }));
  } catch (err) {
    console.warn('[Save Report Telemetry Error]:', err);
  }
}

/**
 * Clear report telemetry after submission.
 */
export function clearReportTelemetry(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(REPORT_TELEMETRY_KEY);
  } catch {}
}

/**
 * Get user-selected risk filter city. Defaults to 'All Cities'.
 */
export function getSelectedRiskCity(): string {
  if (typeof window === 'undefined') return 'All Cities';
  try {
    return window.sessionStorage.getItem(RISK_FILTER_CITY_KEY) || 'All Cities';
  } catch {
    return 'All Cities';
  }
}

/**
 * Save user-selected risk filter city.
 */
export function setSelectedRiskCity(city: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(RISK_FILTER_CITY_KEY, city);
  } catch {}
}
