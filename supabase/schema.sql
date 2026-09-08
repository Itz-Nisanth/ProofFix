-- ==============================================================================
-- ProofFix — Final Supabase + PostGIS Schema
-- ==============================================================================
-- ==============================================================================
-- 1. EXTENSIONS
-- ==============================================================================
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
-- ==============================================================================
-- 2. USER PROFILES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Automatically create/update a profile when a Supabase Auth user is created.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url
  )
VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.email
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO
UPDATE
SET email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  avatar_url = EXCLUDED.avatar_url,
  updated_at = NOW();
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- ==============================================================================
-- 3. INCIDENTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE
  SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (
      severity IN ('critical', 'high', 'medium', 'low')
    ),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    -- Real PostGIS geographic point.
    location extensions.geography(Point, 4326) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (
      latitude BETWEEN -90 AND 90
    ),
    longitude DOUBLE PRECISION NOT NULL CHECK (
      longitude BETWEEN -180 AND 180
    ),
    location_accuracy DOUBLE PRECISION NOT NULL CHECK (location_accuracy >= 0),
    city TEXT,
    address_text TEXT,
    -- Live evidence
    primary_image_url TEXT NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Gemini observations only.
    ai_observations JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- ProofFix deterministic 100-point engine.
    priority_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Original reporter counts as confirmation #1.
    confirmation_count INT NOT NULL DEFAULT 1 CHECK (confirmation_count >= 1)
);
-- Spatial index for nearby incident lookup.
CREATE INDEX IF NOT EXISTS incidents_geo_idx ON public.incidents USING GIST(location);
-- Useful for Risks page city/severity/status filters.
CREATE INDEX IF NOT EXISTS incidents_city_status_idx ON public.incidents(city, status, severity);
-- ==============================================================================
-- 4. INDEPENDENT INCIDENT CONFIRMATIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.incident_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE
  SET NULL,
    image_url TEXT,
    location extensions.geography(Point, 4326) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (
      latitude BETWEEN -90 AND 90
    ),
    longitude DOUBLE PRECISION NOT NULL CHECK (
      longitude BETWEEN -180 AND 180
    ),
    location_accuracy DOUBLE PRECISION NOT NULL CHECK (location_accuracy >= 0),
    captured_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS confirmations_geo_idx ON public.incident_confirmations USING GIST(location);
CREATE INDEX IF NOT EXISTS confirmations_incident_idx ON public.incident_confirmations(incident_id);
-- One signed-in user can strengthen an incident only once.
CREATE UNIQUE INDEX IF NOT EXISTS one_confirmation_per_user_per_incident ON public.incident_confirmations(incident_id, user_id)
WHERE user_id IS NOT NULL;
-- ==============================================================================
-- 5. AUTOMATIC CONFIRMATION COUNT
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.update_incident_confirmation_count() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
UPDATE public.incidents
SET confirmation_count = 1 + (
    SELECT COUNT(*)::INT
    FROM public.incident_confirmations
    WHERE incident_id = NEW.incident_id
  ),
  updated_at = NOW()
WHERE id = NEW.incident_id;
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_incident_confirmation_created ON public.incident_confirmations;
CREATE TRIGGER on_incident_confirmation_created
AFTER
INSERT ON public.incident_confirmations FOR EACH ROW EXECUTE FUNCTION public.update_incident_confirmation_count();
-- ==============================================================================
-- 6. INCIDENT RESOLUTION EVIDENCE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.incident_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  resolver_id UUID REFERENCES public.profiles(id) ON DELETE
  SET NULL,
    resolution_image_url TEXT NOT NULL,
    location extensions.geography(Point, 4326) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (
      latitude BETWEEN -90 AND 90
    ),
    longitude DOUBLE PRECISION NOT NULL CHECK (
      longitude BETWEEN -180 AND 180
    ),
    location_accuracy DOUBLE PRECISION NOT NULL CHECK (location_accuracy >= 0),
    -- Must initially be FALSE.
    -- Only trusted server-side verification should change this.
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_notes TEXT,
    residual_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    ai_comparison_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS resolutions_incident_idx ON public.incident_resolutions(incident_id);
-- ==============================================================================
-- 7. POSTGIS NEARBY INCIDENT RPC
-- ==============================================================================
-- Stage 1 of duplicate detection.
--
-- This DOES NOT declare something a duplicate.
-- It only retrieves unresolved candidate incidents close to the new capture.
--
-- Stage 2 in Next.js performs:
-- Location 30%
-- Category 25%
-- Gemini visual comparison 35%
-- Time relationship 10%
CREATE OR REPLACE FUNCTION public.find_nearby_open_incidents(
    target_lat DOUBLE PRECISION,
    target_lng DOUBLE PRECISION,
    radius_metres DOUBLE PRECISION DEFAULT 30.0
  ) RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    category TEXT,
    severity TEXT,
    status TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_accuracy DOUBLE PRECISION,
    city TEXT,
    address_text TEXT,
    primary_image_url TEXT,
    captured_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    ai_observations JSONB,
    priority_breakdown JSONB,
    confirmation_count INT,
    distance_metres DOUBLE PRECISION
  ) LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = '' AS $$
SELECT i.id,
  i.title,
  i.description,
  i.category,
  i.severity,
  i.status,
  i.latitude,
  i.longitude,
  i.location_accuracy,
  i.city,
  i.address_text,
  i.primary_image_url,
  i.captured_at,
  i.created_at,
  i.ai_observations,
  i.priority_breakdown,
  i.confirmation_count,
  extensions.ST_Distance(
    i.location,
    extensions.ST_SetSRID(
      extensions.ST_MakePoint(target_lng, target_lat),
      4326
    )::extensions.geography
  ) AS distance_metres
FROM public.incidents AS i
WHERE i.status <> 'resolved'
  AND extensions.ST_DWithin(
    i.location,
    extensions.ST_SetSRID(
      extensions.ST_MakePoint(target_lng, target_lat),
      4326
    )::extensions.geography,
    radius_metres
  )
ORDER BY distance_metres ASC;
$$;
REVOKE ALL ON FUNCTION public.find_nearby_open_incidents(
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION
)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_nearby_open_incidents(
    DOUBLE PRECISION,
    DOUBLE PRECISION,
    DOUBLE PRECISION
  ) TO anon,
  authenticated;
-- ==============================================================================
-- 8. STORAGE BUCKETS
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES (
    'incident-evidence',
    'incident-evidence',
    TRUE
  ) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public)
VALUES (
    'resolution-evidence',
    'resolution-evidence',
    TRUE
  ) ON CONFLICT (id) DO NOTHING;
-- ==============================================================================
-- 9. ROW LEVEL SECURITY
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_resolutions ENABLE ROW LEVEL SECURITY;
-- ==============================================================================
-- 10. PROFILE POLICIES
-- ==============================================================================
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles FOR
SELECT TO authenticated USING (
    id = (
      SELECT auth.uid()
    )
  );
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR
UPDATE TO authenticated USING (
    id = (
      SELECT auth.uid()
    )
  ) WITH CHECK (
    id = (
      SELECT auth.uid()
    )
  );
-- ==============================================================================
-- 11. INCIDENT POLICIES
-- ==============================================================================
-- Anyone can explore reported risks.
DROP POLICY IF EXISTS "Anyone can read incidents" ON public.incidents;
CREATE POLICY "Anyone can read incidents" ON public.incidents FOR
SELECT TO anon,
  authenticated USING (TRUE);
-- Only authenticated users can create reports.
-- They may only create reports under their own user ID.
DROP POLICY IF EXISTS "Authenticated users can create incidents" ON public.incidents;
CREATE POLICY "Authenticated users can create incidents" ON public.incidents FOR
INSERT TO authenticated WITH CHECK (
    reporter_id = (
      SELECT auth.uid()
    )
  );
-- IMPORTANT:
-- There is intentionally NO broad client-side UPDATE policy for incidents.
--
-- A normal authenticated user must not be able to directly change:
-- severity
-- confirmation_count
-- status
-- AI observations
--
-- Resolution/status changes should happen through trusted server-side logic.
-- ==============================================================================
-- 12. CONFIRMATION POLICIES
-- ==============================================================================
DROP POLICY IF EXISTS "Anyone can read confirmations" ON public.incident_confirmations;
CREATE POLICY "Anyone can read confirmations" ON public.incident_confirmations FOR
SELECT TO anon,
  authenticated USING (TRUE);
DROP POLICY IF EXISTS "Authenticated users can confirm incidents" ON public.incident_confirmations;
CREATE POLICY "Authenticated users can confirm incidents" ON public.incident_confirmations FOR
INSERT TO authenticated WITH CHECK (
    user_id = (
      SELECT auth.uid()
    ) -- The original reporter cannot artificially confirm their own report again.
    AND NOT EXISTS (
      SELECT 1
      FROM public.incidents AS i
      WHERE i.id = incident_id
        AND i.reporter_id = (
          SELECT auth.uid()
        )
    )
  );
-- ==============================================================================
-- 13. RESOLUTION POLICIES
-- ==============================================================================
DROP POLICY IF EXISTS "Anyone can read resolutions" ON public.incident_resolutions;
CREATE POLICY "Anyone can read resolutions" ON public.incident_resolutions FOR
SELECT TO anon,
  authenticated USING (TRUE);
DROP POLICY IF EXISTS "Authenticated users can submit resolutions" ON public.incident_resolutions;
CREATE POLICY "Authenticated users can submit resolutions" ON public.incident_resolutions FOR
INSERT TO authenticated WITH CHECK (
    resolver_id = (
      SELECT auth.uid()
    ) -- Client cannot submit an already-"verified" resolution.
    -- Verification must happen on the trusted server.
    AND is_verified = FALSE
  );
-- ==============================================================================
-- 14. STORAGE POLICIES
-- ==============================================================================
DROP POLICY IF EXISTS "Public Read Incident Evidence" ON storage.objects;
CREATE POLICY "Public Read Incident Evidence" ON storage.objects FOR
SELECT TO anon,
  authenticated USING (
    bucket_id IN (
      'incident-evidence',
      'resolution-evidence'
    )
  );
DROP POLICY IF EXISTS "Authenticated Insert Evidence" ON storage.objects;
CREATE POLICY "Authenticated Insert Evidence" ON storage.objects FOR
INSERT TO authenticated WITH CHECK (
    bucket_id IN (
      'incident-evidence',
      'resolution-evidence'
    )
  );
-- ==============================================================================
-- 15. TABLE PRIVILEGES
-- ==============================================================================
GRANT SELECT ON public.incidents TO anon,
  authenticated;
GRANT INSERT ON public.incidents TO authenticated;
GRANT SELECT ON public.incident_confirmations TO anon,
  authenticated;
GRANT INSERT ON public.incident_confirmations TO authenticated;
GRANT SELECT ON public.incident_resolutions TO anon,
  authenticated;
GRANT INSERT ON public.incident_resolutions TO authenticated;
GRANT SELECT,
  UPDATE ON public.profiles TO authenticated;
-- ==============================================================================
-- END OF PROOFFIX SCHEMA
-- ==============================================================================
ALTER TABLE public.incidents
ALTER COLUMN city DROP DEFAULT;