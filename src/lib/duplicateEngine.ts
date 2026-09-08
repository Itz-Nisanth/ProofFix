import { Incident, DuplicateEvaluationResult } from '@/types';

/**
 * Calculates Haversine distance in metres between two coordinate pairs
 */
export function calculateDistanceMetres(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export interface CandidateEvaluationInput {
  newLat: number;
  newLng: number;
  newCategory: string;
  newCapturedAt: string;
  visualSimilarityRatio?: number; // 0 to 1 (from Gemini comparison)
  existingCandidate: Incident;
  maxRadiusMetres?: number;
}

/**
 * Stage 2: 4-Factor Weighted Multi-Modal Duplicate Evaluation
 * 
 * Weights:
 * - Location proximity: 30% (max 30 pts)
 * - Category similarity: 25% (max 25 pts)
 * - Visual similarity: 35% (max 35 pts via Gemini)
 * - Time relationship: 10% (max 10 pts)
 * 
 * Thresholds:
 * - 80+  : likely_duplicate → prompt user to confirm
 * - 50-79: uncertain → show comparison to user
 * - <50  : different → treat as separate incident
 * 
 * Core rule: GPS proximity alone must NEVER merge incidents!
 */
export function evaluateDuplicateCandidate(
  input: CandidateEvaluationInput
): DuplicateEvaluationResult {
  const maxRadius = input.maxRadiusMetres || 35; // approx 30-35 metres
  const dist = calculateDistanceMetres(
    input.newLat,
    input.newLng,
    input.existingCandidate.latitude,
    input.existingCandidate.longitude
  );

  // 1. Location Proximity (30% weight)
  let proximityScore = 0;
  if (dist <= maxRadius) {
    // 0 metres = 30 pts, maxRadius metres = 0 pts
    proximityScore = Math.max(0, (1 - dist / maxRadius) * 30);
  }

  // 2. Category Similarity (25% weight)
  let categoryScore = 0;
  const cat1 = (input.newCategory || '').toLowerCase().trim();
  const cat2 = (input.existingCandidate.category || '').toLowerCase().trim();
  if (cat1 === cat2 && cat1.length > 0) {
    categoryScore = 25;
  } else if (
    (cat1.includes('tree') && cat2.includes('tree')) ||
    (cat1.includes('road') && cat2.includes('pothole')) ||
    (cat1.includes('water') && cat2.includes('drain'))
  ) {
    categoryScore = 15;
  }

  // 3. Visual Similarity via Gemini (35% weight)
  // visualSimilarityRatio is 0.0 to 1.0
  const visualRatio = typeof input.visualSimilarityRatio === 'number' 
    ? input.visualSimilarityRatio 
    : (categoryScore > 0 ? 0.7 : 0.2); // graceful heuristic if offline
  const visualScore = Math.round(visualRatio * 35);

  // 4. Time Relationship (10% weight)
  // Incidents reported close in time (within 48 hours) are more likely duplicates
  const newTime = new Date(input.newCapturedAt).getTime() || Date.now();
  const existingTime = new Date(input.existingCandidate.created_at).getTime() || Date.now();
  const hoursDiff = Math.abs(newTime - existingTime) / (1000 * 60 * 60);
  let timeScore = 0;
  if (hoursDiff <= 12) {
    timeScore = 10;
  } else if (hoursDiff <= 48) {
    timeScore = 7;
  } else if (hoursDiff <= 120) {
    timeScore = 4;
  } else {
    timeScore = 1;
  }

  // Total Composite Score (0 - 100)
  const totalScore = Math.round(proximityScore + categoryScore + visualScore + timeScore);

  let recommendation: 'likely_duplicate' | 'uncertain' | 'different' = 'different';
  if (totalScore >= 80) {
    recommendation = 'likely_duplicate';
  } else if (totalScore >= 50) {
    recommendation = 'uncertain';
  } else {
    recommendation = 'different';
  }

  const isCandidate = totalScore >= 50;

  return {
    isCandidate,
    score: totalScore,
    recommendation,
    proximityScore: Math.round(proximityScore),
    categoryScore: Math.round(categoryScore),
    visualScore,
    timeScore,
    distanceMetres: Math.round(dist),
    candidateIncident: input.existingCandidate,
    explanation: `Located ~${Math.round(dist)}m away in ${input.existingCandidate.address_text || 'the same area'}. Category matching score: ${categoryScore}/25, Visual similarity: ${visualScore}/35, Time correlation: ${timeScore}/10.`,
  };
}
