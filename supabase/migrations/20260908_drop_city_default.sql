-- Safe migration to remove hardcoded 'Chennai' default from incidents table
-- Preserves all existing incident data
ALTER TABLE public.incidents
ALTER COLUMN city DROP DEFAULT;
