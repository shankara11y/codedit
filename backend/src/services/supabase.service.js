/**
 * Supabase Service for CodeFix AI
 * 
 * Manages persistent storage of AI debugging sessions, repaired code,
 * test cases, and evaluation results. Kept strictly on the backend.
 */

import { createClient } from '@supabase/supabase-js';

let cachedClient = null;

/**
 * Returns true if Supabase credentials are present in process.env.
 */
export function isSupabaseConfigured() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  return Boolean(
    url && 
    key && 
    url.trim() !== '' && 
    key.trim() !== '' && 
    !url.includes('your-project.supabase.co') &&
    key !== 'your_supabase_anon_or_service_key'
  );
}

/**
 * Returns an initialized Supabase client singleton, or null if unconfigured.
 */
export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.SUPABASE_URL.trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY).trim();

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    return cachedClient;
  } catch (err) {
    console.error('[Supabase Init Error]', err);
    return null;
  }
}

/**
 * Checks connectivity to the Supabase database.
 * @returns {Promise<{ configured: boolean, available: boolean, error?: string }>}
 */
export async function checkSupabaseHealth() {
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      available: false,
      message: 'Supabase credentials not configured in backend/.env'
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      configured: true,
      available: false,
      error: 'Failed to initialize Supabase client.'
    };
  }

  try {
    // Quick test query to verify connection and table existence
    const { error } = await client
      .from('debug_sessions')
      .select('id')
      .limit(1);

    if (error) {
      // If table doesn't exist yet, connection is still valid, but table is missing
      if (error.code === '42P01') {
        return {
          configured: true,
          available: false,
          error: 'Table "debug_sessions" does not exist yet. Please run backend/supabase_schema.sql in your Supabase SQL editor.'
        };
      }
      return { configured: true, available: false, error: error.message };
    }

    return { configured: true, available: true };
  } catch (err) {
    return { configured: true, available: false, error: err.message };
  }
}

/**
 * Saves a complete debugging and verification session to Supabase.
 * 
 * @param {Object} sessionData
 * @param {string} sessionData.language - Programming language ('python', 'javascript', 'cpp', 'java').
 * @param {string} sessionData.original_code - Submitted code.
 * @param {string} [sessionData.problem_description=''] - Problem statement.
 * @param {string} [sessionData.repaired_code=''] - AI corrected code.
 * @param {Array} [sessionData.bug_analysis=[]] - Structured bugs array from Gemini.
 * @param {Array} [sessionData.test_cases=[]] - Inputs and expected outputs.
 * @param {Object} [sessionData.evaluation_results={}] - Pass/fail summary, metrics, and logs.
 * @param {string} [sessionData.workflow_stage='verification_completed'] - Current stage.
 * @returns {Promise<{ saved: boolean, id?: string, data?: Object, warning?: string, error?: string }>}
 */
export async function saveDebugSession(sessionData) {
  if (!sessionData || typeof sessionData !== 'object') {
    throw new Error('Session data must be an object.');
  }

  const {
    language = 'python',
    original_code,
    problem_description = '',
    repaired_code = '',
    bug_analysis = [],
    test_cases = [],
    evaluation_results = {},
    workflow_stage = 'verification_completed'
  } = sessionData;

  if (!original_code || typeof original_code !== 'string') {
    throw new Error('original_code is required to save a debugging session.');
  }

  // Graceful fallback if Supabase is not configured
  if (!isSupabaseConfigured()) {
    console.log('[Supabase Notice] Supabase is unconfigured; skipping persistent record.');
    return {
      saved: false,
      warning: 'Supabase credentials not configured in backend. Session was executed successfully but not stored remotely.',
      data: null
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      saved: false,
      warning: 'Unable to initialize Supabase client.',
      data: null
    };
  }

  const payload = {
    language: String(language).toLowerCase().trim(),
    original_code: original_code.trim(),
    problem_description: typeof problem_description === 'string' ? problem_description.trim() : '',
    repaired_code: typeof repaired_code === 'string' ? repaired_code.trim() : '',
    bug_analysis: Array.isArray(bug_analysis) ? bug_analysis : [],
    test_cases: Array.isArray(test_cases) ? test_cases : [],
    evaluation_results: typeof evaluation_results === 'object' && evaluation_results !== null ? evaluation_results : {},
    workflow_stage: String(workflow_stage)
  };

  try {
    const { data, error } = await client
      .from('debug_sessions')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('[Supabase Insert Error]', error);
      return {
        saved: false,
        error: error.message,
        details: error
      };
    }

    return {
      saved: true,
      id: data.id,
      data
    };
  } catch (err) {
    console.error('[Supabase Exception]', err);
    return {
      saved: false,
      error: err.message
    };
  }
}

/**
 * Retrieves recent debugging sessions from Supabase.
 * 
 * @param {Object} options
 * @param {number} [options.limit=20] - Number of records to fetch.
 * @param {number} [options.offset=0] - Offset for pagination.
 * @param {string} [options.language] - Optional language filter.
 * @returns {Promise<{ success: boolean, sessions: Array, total?: number, error?: string }>}
 */
export async function getDebugSessions({ limit = 20, offset = 0, language = null } = {}) {
  if (!isSupabaseConfigured()) {
    return {
      success: true,
      sessions: [],
      warning: 'Supabase is not configured.'
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client unavailable.' };
  }

  try {
    let query = client
      .from('debug_sessions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (language && typeof language === 'string') {
      query = query.eq('language', language.toLowerCase().trim());
    }

    const { data, count, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      total: count,
      sessions: data || []
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Retrieves a single session by UUID.
 * 
 * @param {string} id - UUID of the session.
 * @returns {Promise<{ success: boolean, session?: Object, error?: string }>}
 */
export async function getDebugSessionById(id) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client unavailable.' };
  }

  try {
    const { data, error } = await client
      .from('debug_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, session: data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
