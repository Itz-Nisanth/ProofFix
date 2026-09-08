import { PriorityBreakdown, SeverityLevel } from '@/types';

export interface RawObservations {
  is_road_blocked?: boolean;
  has_live_wire_hazard?: boolean;
  has_structural_fall_hazard?: boolean;
  has_chemical_sewage_risk?: boolean;
  has_deep_hole_cavein?: boolean;
  traffic_disruption_level?: 'none' | 'minor' | 'moderate' | 'severe';
  confirmation_count?: number;
  created_at?: string;
}

/**
 * Deterministic 100-Point Civic Priority Engine
 * 
 * Rules:
 * 1. Human safety: max 40 points
 * 2. Environmental / health risk: max 25 points
 * 3. Public obstruction / impact: max 15 points
 * 4. Independent confirmations: max 10 points
 * 5. Time unresolved: max 10 points
 * 
 * Gemini extracts observations from the image, but does NOT compute the final score.
 * This TypeScript function deterministically evaluates the observations.
 */
export function calculateDeterministicPriority(obs: RawObservations): PriorityBreakdown {
  const reasons: string[] = [];

  // 1. Human Safety (Max 40)
  let humanSafetyScore = 0;
  if (obs.has_live_wire_hazard) {
    humanSafetyScore += 30;
    reasons.push('Live/hanging electrical wire hazard (+30)');
  }
  if (obs.has_deep_hole_cavein) {
    humanSafetyScore += 25;
    reasons.push('Deep crater / road cave-in hazard (+25)');
  }
  if (obs.has_structural_fall_hazard) {
    humanSafetyScore += 20;
    reasons.push('Unstable overhead/structural fall hazard (+20)');
  }
  // Clamp to max 40
  humanSafetyScore = Math.min(40, humanSafetyScore);

  // 2. Environmental & Health Risk (Max 25)
  let environmentalHealthScore = 0;
  if (obs.has_chemical_sewage_risk) {
    environmentalHealthScore += 25;
    reasons.push('Contaminated wastewater / chemical hazard (+25)');
  }
  environmentalHealthScore = Math.min(25, environmentalHealthScore);

  // 3. Public Obstruction / Impact (Max 15)
  let publicObstructionScore = 0;
  if (obs.is_road_blocked || obs.traffic_disruption_level === 'severe') {
    publicObstructionScore += 15;
    reasons.push('Major vehicular road or thoroughfare completely blocked (+15)');
  } else if (obs.traffic_disruption_level === 'moderate') {
    publicObstructionScore += 10;
    reasons.push('Sidewalk or single lane obstructed (+10)');
  } else if (obs.traffic_disruption_level === 'minor') {
    publicObstructionScore += 5;
    reasons.push('Minor passage obstruction (+5)');
  }
  publicObstructionScore = Math.min(15, publicObstructionScore);

  // 4. Independent Confirmations (Max 10)
  // +2 points per independent neighbor confirmation up to 10 points
  const confirmations = obs.confirmation_count || 1;
  const independentConfirmationsScore = Math.min(10, Math.max(0, (confirmations - 1) * 2));
  if (independentConfirmationsScore > 0) {
    reasons.push(`${confirmations - 1} independent community confirmation(s) (+${independentConfirmationsScore})`);
  }

  // 5. Time Unresolved (Max 10)
  // Escalates +2.5 points for every 24 hours open
  let timeUnresolvedScore = 0;
  if (obs.created_at) {
    const hoursElapsed = Math.max(0, (Date.now() - new Date(obs.created_at).getTime()) / (1000 * 60 * 60));
    const daysElapsed = Math.floor(hoursElapsed / 24);
    timeUnresolvedScore = Math.min(10, daysElapsed * 2.5);
    if (timeUnresolvedScore > 0) {
      reasons.push(`Open for ${daysElapsed} day(s) without resolution (+${timeUnresolvedScore})`);
    }
  }

  const totalScore = Math.round(
    humanSafetyScore +
    environmentalHealthScore +
    publicObstructionScore +
    independentConfirmationsScore +
    timeUnresolvedScore
  );

  // Severity Tier Mapping
  let severity: SeverityLevel = 'low';
  if (totalScore >= 80) {
    severity = 'critical';
  } else if (totalScore >= 60) {
    severity = 'high';
  } else if (totalScore >= 35) {
    severity = 'medium';
  } else {
    severity = 'low';
  }

  return {
    humanSafetyScore,
    environmentalHealthScore,
    publicObstructionScore,
    independentConfirmationsScore,
    timeUnresolvedScore,
    totalScore,
    severity,
    reasons,
  };
}
