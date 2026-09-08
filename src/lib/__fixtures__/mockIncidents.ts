/**
 * Development & Unit Test Fixtures only.
 * NOT imported or used by any production route or live feed.
 */
import { Incident } from '@/types';
import { calculateDeterministicPriority } from '../priorityEngine';

export const TEST_FIXTURE_INCIDENTS: Incident[] = [
  {
    id: 'test-inc-001',
    title: 'Test Asphalt Pothole Hazard',
    description: 'Fixture data for test assertions and engine verification.',
    category: 'pothole',
    severity: 'medium',
    status: 'open',
    latitude: 11.9338,
    longitude: 79.8359,
    location_accuracy: 4.5,
    city: 'Puducherry',
    address_text: 'Goubert Avenue, Puducherry',
    primary_image_url: 'https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?auto=format&fit=crop&w=800&q=80',
    captured_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ai_observations: {
      scene_summary: 'Test scene observation',
      identified_issue: 'Test pothole',
      public_impact: 'Test impact',
      is_road_blocked: false,
      has_live_wire_hazard: false,
      has_structural_fall_hazard: false,
      has_chemical_sewage_risk: false,
      has_deep_hole_cavein: true,
      tags: ['Test', 'Pothole'],
    },
    priority_breakdown: calculateDeterministicPriority({
      is_road_blocked: false,
      has_live_wire_hazard: false,
      has_structural_fall_hazard: false,
      has_chemical_sewage_risk: false,
      has_deep_hole_cavein: true,
      traffic_disruption_level: 'minor',
      confirmation_count: 1,
    }),
    confirmation_count: 1,
  },
];
