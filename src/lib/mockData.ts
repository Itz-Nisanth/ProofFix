// Deprecated: All seed incidents removed from production.
// Live application reads strictly from Supabase.
// Test fixtures are isolated in src/lib/__fixtures__/mockIncidents.ts
import { Incident } from '@/types';

export const INITIAL_INCIDENTS: Incident[] = [];
