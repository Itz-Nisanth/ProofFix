import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

// Server-only Supabase Admin Client using SUPABASE_SERVICE_ROLE_KEY
// IMPORTANT: Never prefix with NEXT_PUBLIC_ and never import this into client components ('use client').

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

/**
 * Verifies the actual authenticated Supabase user from the request headers.
 * Derive user ID strictly from the verified session/token, never trusting
 * user_id, reporter_id, or resolver_id from untrusted client JSON bodies.
 */
export async function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;

  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  // Support service-role authorization (for automated tests / backend jobs)
  if (supabaseServiceRoleKey && token === supabaseServiceRoleKey) {
    if (supabaseAdmin) {
      const { data: profile } = await supabaseAdmin.from('profiles').select('id, email').limit(1).single();
      if (profile) {
        return { id: profile.id, email: profile.email };
      }
    }
  }

  const client = supabaseAdmin || createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return null;

  return user;
}

/**
 * Executes a trusted server-side update on an incident record bypassing client RLS.
 * Used for:
 * - Updating status to 'resolved' or 'in_progress' after verified resolution
 * - Updating deterministic priority scores after confirmation count recalculation
 * - Recording verified resolution metadata
 */
export async function updateIncidentStatusAdmin(
  incidentId: string,
  updates: {
    status?: 'open' | 'in_progress' | 'resolved';
    priority_breakdown?: any;
    updated_at?: string;
  }
) {
  if (!supabaseAdmin) {
    return { error: new Error('SUPABASE_SERVICE_ROLE_KEY is not configured on server.') };
  }

  return await supabaseAdmin
    .from('incidents')
    .update({
      ...updates,
      updated_at: updates.updated_at || new Date().toISOString(),
    })
    .eq('id', incidentId)
    .select()
    .single();
}
