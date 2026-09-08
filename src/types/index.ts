export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'open' | 'in_progress' | 'resolved';

export interface GeoLocationTelemetry {
  latitude: number;
  longitude: number;
  accuracy: number; // in metres
  captured_at: string; // ISO string client timestamp
  server_time?: string; // ISO string server timestamp
  address_text?: string;
  city?: string;
}

export interface IncidentObservation {
  label: string;
  detected: boolean;
  notes?: string;
  confidence?: number;
}

export interface PriorityBreakdown {
  humanSafetyScore: number; // max 40
  environmentalHealthScore: number; // max 25
  publicObstructionScore: number; // max 15
  independentConfirmationsScore: number; // max 10
  timeUnresolvedScore: number; // max 10
  totalScore: number; // max 100
  severity: SeverityLevel;
  reasons: string[];
}

export interface Incident {
  id: string;
  reporter_id?: string;
  title: string;
  description: string;
  category: string; // e.g. 'fallen_tree', 'pothole', 'waterlogging', 'debris', 'hazardous_wiring'
  severity: SeverityLevel;
  status: IncidentStatus;
  
  // Location & Telemetry
  latitude: number;
  longitude: number;
  location_accuracy: number;
  city: string;
  address_text: string;
  
  // Visual Evidence
  primary_image_url: string;
  captured_at: string;
  created_at: string;
  updated_at: string;
  
  // AI Observations & Deterministic Priority
  ai_observations: {
    scene_summary: string;
    identified_issue: string;
    public_impact: string;
    is_road_blocked: boolean;
    has_live_wire_hazard: boolean;
    has_structural_fall_hazard: boolean;
    has_chemical_sewage_risk: boolean;
    has_deep_hole_cavein: boolean;
    tags: string[];
  };
  priority_breakdown: PriorityBreakdown;
  
  // Confirmations & Activity
  confirmation_count: number;
  confirmations?: IncidentConfirmation[];
  resolutions?: IncidentResolution[];
}

export interface IncidentConfirmation {
  id: string;
  incident_id: string;
  user_id?: string;
  image_url?: string;
  latitude: number;
  longitude: number;
  location_accuracy: number;
  captured_at: string;
  created_at: string;
}

export interface IncidentResolution {
  id: string;
  incident_id: string;
  resolver_id?: string;
  resolution_image_url: string;
  latitude: number;
  longitude: number;
  location_accuracy: number;
  is_verified: boolean;
  verification_notes?: string;
  residual_findings?: string[];
  ai_comparison_result?: {
    is_cleared: boolean;
    confidence: number;
    before_summary: string;
    after_summary: string;
    location_match_confirmed: boolean;
    explanation: string;
  };
  resolved_at: string;
}

export interface DuplicateEvaluationResult {
  isCandidate: boolean;
  score: number; // 0 - 100
  recommendation: 'likely_duplicate' | 'uncertain' | 'different';
  proximityScore: number; // max 30
  categoryScore: number; // max 25
  visualScore: number; // max 35
  timeScore: number; // max 10
  distanceMetres: number;
  candidateIncident: Incident;
  explanation: string;
}
