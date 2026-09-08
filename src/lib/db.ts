import { Incident, IncidentConfirmation, IncidentResolution } from '@/types';
import { calculateDistanceMetres } from './duplicateEngine';
import { calculateDeterministicPriority } from './priorityEngine';
import { supabase } from './supabase/client';
import { supabaseAdmin, updateIncidentStatusAdmin } from './supabase/admin';

// Global singleton storage across hot-reloads (in-memory for runtime only, no seed data)
const globalForDb = globalThis as unknown as {
  globalIncidents: Incident[];
  globalConfirmations: IncidentConfirmation[];
  globalResolutions: IncidentResolution[];
};

if (!globalForDb.globalIncidents) {
  globalForDb.globalIncidents = [];
  globalForDb.globalConfirmations = [];
  globalForDb.globalResolutions = [];
}

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return url && !url.includes('placeholder-project');
};

export async function getIncidents(filters?: {
  city?: string;
  status?: string;
  severity?: string;
  lat?: number;
  lng?: number;
  radiusMetres?: number;
}): Promise<Incident[]> {
  if (isSupabaseConfigured()) {
    try {
      let query = supabase.from('incidents').select('*');
      if (filters?.city && filters.city !== 'All Cities') {
        query = query.ilike('city', filters.city);
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.severity && filters.severity !== 'all') {
        query = query.eq('severity', filters.severity);
      }

      const { data, error } = await query;
      if (!error && data) {
        let list: Incident[] = data.map((d: any) => ({
          ...d,
          priority_breakdown: typeof d.priority_breakdown === 'string' ? JSON.parse(d.priority_breakdown) : d.priority_breakdown,
          ai_observations: typeof d.ai_observations === 'string' ? JSON.parse(d.ai_observations) : d.ai_observations,
        }));

        if (typeof filters?.lat === 'number' && typeof filters?.lng === 'number' && filters.radiusMetres) {
          list = list.filter((i) => {
            const dist = calculateDistanceMetres(filters.lat!, filters.lng!, i.latitude, i.longitude);
            return dist <= filters.radiusMetres!;
          });
        }

        return list.sort((a, b) => {
          const scoreA = a.priority_breakdown?.totalScore || 0;
          const scoreB = b.priority_breakdown?.totalScore || 0;
          return scoreB - scoreA;
        });
      }
    } catch (err) {
      console.warn('Supabase query fallback to in-memory:', err);
    }
  }

  let list = [...globalForDb.globalIncidents];
  if (filters?.city && filters.city !== 'All Cities') {
    list = list.filter((i) => i.city.toLowerCase() === filters.city!.toLowerCase());
  }
  if (filters?.status && filters.status !== 'all') {
    list = list.filter((i) => i.status === filters.status);
  }
  if (filters?.severity && filters.severity !== 'all') {
    list = list.filter((i) => i.severity === filters.severity);
  }
  if (typeof filters?.lat === 'number' && typeof filters?.lng === 'number' && filters.radiusMetres) {
    list = list.filter((i) => {
      const d = calculateDistanceMetres(filters.lat!, filters.lng!, i.latitude, i.longitude);
      return d <= filters.radiusMetres!;
    });
  }

  return list.sort((a, b) => {
    const scoreA = a.priority_breakdown?.totalScore || 0;
    const scoreB = b.priority_breakdown?.totalScore || 0;
    return scoreB - scoreA;
  });
}

export async function getIncidentById(id: string): Promise<Incident | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('incidents').select('*').eq('id', id).single();
      if (!error && data) {
        return {
          ...data,
          priority_breakdown: typeof data.priority_breakdown === 'string' ? JSON.parse(data.priority_breakdown) : data.priority_breakdown,
          ai_observations: typeof data.ai_observations === 'string' ? JSON.parse(data.ai_observations) : data.ai_observations,
        };
      }
    } catch (e) {
      console.warn('Supabase getIncidentById fallback:', e);
    }
  }

  const found = globalForDb.globalIncidents.find((i) => i.id === id);
  return found ? { ...found } : null;
}

export async function createIncident(incidentData: Omit<Incident, 'id' | 'created_at' | 'updated_at'>): Promise<Incident> {
  if (isSupabaseConfigured()) {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('incidents')
      .insert({
        ...incidentData,
        location: `POINT(${incidentData.longitude} ${incidentData.latitude})`,
      })
      .select()
      .single();

    if (error) {
      console.error('[Supabase createIncident DB Error]:', error.code, error.message, error.details);
      throw new Error(`Database insert failed: ${error.message} (${error.code || 'UNKNOWN'})`);
    }

    if (data) {
      const parsedIncident: Incident = {
        ...data,
        priority_breakdown: typeof data.priority_breakdown === 'string' ? JSON.parse(data.priority_breakdown) : data.priority_breakdown,
        ai_observations: typeof data.ai_observations === 'string' ? JSON.parse(data.ai_observations) : data.ai_observations,
      };
      globalForDb.globalIncidents.unshift(parsedIncident);
      return parsedIncident;
    }
  }

  // Local/dev fallback only if Supabase is completely unconfigured
  const newIncident: Incident = {
    ...incidentData,
    id: `inc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  globalForDb.globalIncidents.unshift(newIncident);
  return newIncident;
}

/**
 * Stage 1: PostGIS ST_DWithin candidate search for OPEN incidents within specified radius (~30-35m)
 */
export async function findOpenCandidatesWithinRadius(
  lat: number,
  lng: number,
  radiusMetres: number = 35
): Promise<Incident[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('find_nearby_open_incidents', {
        target_lat: lat,
        target_lng: lng,
        radius_metres: radiusMetres,
      });

      if (!error && data && Array.isArray(data)) {
        return data;
      }
    } catch (e) {
      console.warn('Supabase findOpenCandidatesWithinRadius RPC fallback:', e);
    }
  }

  return globalForDb.globalIncidents.filter((inc) => {
    if (inc.status === 'resolved') return false;
    const d = calculateDistanceMetres(lat, lng, inc.latitude, inc.longitude);
    return d <= radiusMetres;
  });
}

/**
 * Confirm an existing incident with a new live capture from an independent neighbor.
 * Database trigger `on_incident_confirmation_created` is the SINGLE SOURCE OF TRUTH for confirmation_count.
 * Application code DOES NOT manually increment confirmation_count.
 */
export async function addConfirmationToIncident(
  incidentId: string,
  confirmationData: {
    user_id?: string;
    image_url?: string;
    latitude: number;
    longitude: number;
    location_accuracy: number;
    captured_at: string;
  }
): Promise<Incident | null> {
  const conf: IncidentConfirmation = {
    id: `conf-${Date.now()}`,
    incident_id: incidentId,
    ...confirmationData,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const client = supabaseAdmin || supabase;
      
      // 1. Insert row into incident_confirmations table
      // (PostgreSQL trigger automatically recalculates confirmation_count as 1 + COUNT(incident_confirmations))
      const { error: insertError } = await client.from('incident_confirmations').insert({
        ...conf,
        location: `POINT(${confirmationData.longitude} ${confirmationData.latitude})`,
      });

      if (!insertError) {
        // 2. Read the updated incident record (with trigger-computed confirmation_count)
        const { data: updatedInc, error: readError } = await client
          .from('incidents')
          .select('*')
          .eq('id', incidentId)
          .single();

        if (!readError && updatedInc) {
          const parsedObs = typeof updatedInc.ai_observations === 'string'
            ? JSON.parse(updatedInc.ai_observations)
            : updatedInc.ai_observations;

          // 3. Recalculate deterministic priority using the new trigger-calculated count
          const updatedPriority = calculateDeterministicPriority({
            ...parsedObs,
            confirmation_count: updatedInc.confirmation_count,
            created_at: updatedInc.created_at,
          });

          // 4. Server/admin client updates deterministic priority_breakdown
          if (supabaseAdmin) {
            await updateIncidentStatusAdmin(incidentId, {
              priority_breakdown: updatedPriority,
            });
          }

          return {
            ...updatedInc,
            priority_breakdown: updatedPriority,
            ai_observations: parsedObs,
          };
        }
      }
    } catch (e) {
      console.warn('Supabase addConfirmationToIncident fallback:', e);
    }
  }

  // Fallback in-memory singleton
  const index = globalForDb.globalIncidents.findIndex((i) => i.id === incidentId);
  if (index === -1) return null;

  globalForDb.globalConfirmations.push(conf);

  const inc = globalForDb.globalIncidents[index];
  const triggerCount = 1 + globalForDb.globalConfirmations.filter((c) => c.incident_id === incidentId).length;

  const updatedPriority = calculateDeterministicPriority({
    ...inc.ai_observations,
    confirmation_count: triggerCount,
    created_at: inc.created_at,
  });

  globalForDb.globalIncidents[index] = {
    ...inc,
    confirmation_count: triggerCount,
    priority_breakdown: updatedPriority,
    updated_at: new Date().toISOString(),
  };

  return globalForDb.globalIncidents[index];
}

/**
 * Record a resolution attempt and update incident status using trusted server admin client.
 */
export async function addResolutionToIncident(
  incidentId: string,
  resolution: {
    resolver_id?: string;
    resolution_image_url: string;
    latitude: number;
    longitude: number;
    location_accuracy: number;
    is_verified: boolean;
    verification_notes?: string;
    residual_findings?: string[];
    ai_comparison_result?: any;
  }
): Promise<{ incident: Incident | null; resolution: IncidentResolution }> {
  const res: IncidentResolution = {
    id: `res-${Date.now()}`,
    incident_id: incidentId,
    ...resolution,
    resolved_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const client = supabaseAdmin || supabase;
      
      // 1. Insert resolution record
      await client.from('incident_resolutions').insert({
        ...res,
        location: `POINT(${resolution.longitude} ${resolution.latitude})`,
      });

      // 2. Execute trusted status transition via server-only admin client
      if (resolution.is_verified) {
        if (supabaseAdmin) {
          await updateIncidentStatusAdmin(incidentId, {
            status: 'resolved',
          });
        } else {
          await client.from('incidents').update({
            status: 'resolved',
            updated_at: new Date().toISOString(),
          }).eq('id', incidentId);
        }
      }

      const { data: updatedInc } = await client
        .from('incidents')
        .select('*')
        .eq('id', incidentId)
        .single();

      if (updatedInc) {
        return {
          incident: {
            ...updatedInc,
            priority_breakdown: typeof updatedInc.priority_breakdown === 'string' ? JSON.parse(updatedInc.priority_breakdown) : updatedInc.priority_breakdown,
            ai_observations: typeof updatedInc.ai_observations === 'string' ? JSON.parse(updatedInc.ai_observations) : updatedInc.ai_observations,
          },
          resolution: res,
        };
      }
    } catch (e) {
      console.warn('Supabase addResolutionToIncident fallback:', e);
    }
  }

  // In-memory fallback
  const index = globalForDb.globalIncidents.findIndex((i) => i.id === incidentId);
  globalForDb.globalResolutions.push(res);

  if (index !== -1 && resolution.is_verified) {
    globalForDb.globalIncidents[index] = {
      ...globalForDb.globalIncidents[index],
      status: 'resolved',
      updated_at: new Date().toISOString(),
    };
  }

  return {
    incident: index !== -1 ? globalForDb.globalIncidents[index] : null,
    resolution: res,
  };
}
