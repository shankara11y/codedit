-- ==============================================================================
-- CodeFix AI – Supabase Database Schema
-- Run this script in the Supabase Dashboard SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Create debug_sessions table
CREATE TABLE IF NOT EXISTS public.debug_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    language VARCHAR(30) NOT NULL,
    original_code TEXT NOT NULL,
    problem_description TEXT DEFAULT '',
    repaired_code TEXT DEFAULT '',
    bug_analysis JSONB DEFAULT '[]'::jsonb,
    test_cases JSONB DEFAULT '[]'::jsonb,
    evaluation_results JSONB DEFAULT '{}'::jsonb,
    workflow_stage VARCHAR(50) DEFAULT 'verification_completed'
);

-- 2. Create index on created_at for fast descending history queries
CREATE INDEX IF NOT EXISTS idx_debug_sessions_created_at 
ON public.debug_sessions (created_at DESC);

-- 3. Create index on language for filtering by language
CREATE INDEX IF NOT EXISTS idx_debug_sessions_language 
ON public.debug_sessions (language);

-- 4. Enable Row Level Security (RLS) for data protection
ALTER TABLE public.debug_sessions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: Allow backend to read and insert sessions
-- Drop old policies if they exist to prevent duplication errors
DROP POLICY IF EXISTS "Allow anon and service role insert" ON public.debug_sessions;
DROP POLICY IF EXISTS "Allow anon and service role select" ON public.debug_sessions;

-- Allow insert
CREATE POLICY "Allow anon and service role insert" 
ON public.debug_sessions 
FOR INSERT 
WITH CHECK (true);

-- Allow read
CREATE POLICY "Allow anon and service role select" 
ON public.debug_sessions 
FOR SELECT 
USING (true);

COMMENT ON TABLE public.debug_sessions IS 'Stores AI debugging sessions, code repairs, and test evaluations.';
