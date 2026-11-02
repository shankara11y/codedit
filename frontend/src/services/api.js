/**
 * API service for communicating with the CodeFix AI backend.
 */

// Base API endpoint: uses VITE_API_URL when deployed (e.g. on Vercel), or defaults to '/api' for local proxy
const rawApiUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL ? import.meta.env.VITE_API_URL : '';
const API_BASE_URL = rawApiUrl ? `${rawApiUrl.replace(/\/$/, '')}/api` : '/api';


/**
 * Checks the health and connection status of the backend server.
 * @returns {Promise<Object>} Backend health info or throws error.
 */
export async function checkBackendHealth() {
  const response = await fetch(`${API_BASE_URL}/health`, {
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Backend responded with HTTP status ${response.status}`);
  }

  return response.json();
}

/**
 * Submits source code to the Gemini AI debugging service.
 * @param {string} code - Source code.
 * @param {string} [problemDescription] - Optional description of problem/intent.
 * @param {string} [language='python'] - Programming language (python, javascript, cpp, java).
 * @returns {Promise<Object>} Structured debugging report with bugs, correctedCode, and testCases.
 */
export async function debugPythonCode(code, problemDescription = '', language = 'python') {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s client timeout

  try {
    const response = await fetch(`${API_BASE_URL}/debug`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ code, problemDescription, language }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.success) {
      const error = new Error(data.message || `Request failed with status ${response.status}`);
      error.code = data.error || 'DEBUG_ERROR';
      error.details = data.details;
      throw error;
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Analysis timed out after 90 seconds. Please check your network connection and try again.');
    }
    throw err;
  }
}

export const debugCode = debugPythonCode;

/**
 * Executes source code in the backend Docker sandbox.
 * @param {string} code - Source code.
 * @param {string} [stdin=''] - Optional standard input.
 * @param {number} [timeoutMs=5000] - Execution timeout in ms.
 * @param {string} [language='python'] - Programming language.
 * @returns {Promise<Object>} Execution result (stdout, stderr, exitCode, executionTimeMs, status, isTimeout).
 */
export async function executePythonCode(code, stdin = '', timeoutMs = 5000, language = 'python') {
  const controller = new AbortController();
  // Allow slightly more than container timeout for network travel
  const clientTimeout = (Number(timeoutMs) || 5000) + 5000;
  const timeoutId = setTimeout(() => controller.abort(), clientTimeout);

  try {
    const response = await fetch(`${API_BASE_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ code, stdin, timeoutMs, language }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.success) {
      const error = new Error(data.message || `Execution request failed with status ${response.status}`);
      error.code = data.error || 'EXECUTION_ERROR';
      throw error;
    }

    return data.data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Code execution request timed out on the client.');
    }
    throw err;
  }
}

export const executeCode = executePythonCode;

/**
 * Saves a completed debugging and verification session to Supabase.
 * @param {Object} sessionData
 * @returns {Promise<Object>} Save result with record id and status.
 */
export async function saveSessionToSupabase(sessionData) {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(sessionData)
    });

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Failed to save session to Supabase:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetches recent sessions from Supabase.
 * @param {Object} [options]
 * @param {number} [options.limit=10]
 * @param {string} [options.language]
 * @returns {Promise<Object>} Sessions array and total count.
 */
export async function fetchRecentSessions({ limit = 10, language = null } = {}) {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (language) params.append('language', language);

    const response = await fetch(`${API_BASE_URL}/sessions?${params.toString()}`);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Failed to fetch sessions:', err);
    return { success: false, error: err.message, data: { sessions: [] } };
  }
}
