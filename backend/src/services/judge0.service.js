/**
 * Judge0 Code Execution Service for CodeFix AI.
 * 
 * Executes untrusted Python, JavaScript, C++, and Java code inside Judge0 sandboxes
 * via HTTPS, eliminating local Docker dependencies for hosting on platforms like Render.
 */

// Default to the free, public Judge0 CE official endpoint
const DEFAULT_JUDGE0_URL = 'https://ce.judge0.com';

/**
 * Default Language IDs for Judge0 CE:
 * - Python 3: 71 (Python 3.8.1) or 92 (Python 3.11.2)
 * - JavaScript: 93 (Node.js 18.15.0) or 63 (Node.js 12.14.0)
 * - C++: 54 (GCC 9.2.0) or 105 (GCC 14.1.0)
 * - Java: 91 (JDK 17.0.6) or 62 (OpenJDK 13.0.1)
 */
export const DEFAULT_LANGUAGE_MAP = {
  python: 71,
  javascript: 93,
  cpp: 54,
  java: 91
};

/**
 * Returns Judge0 configuration from environment variables.
 */
export function getJudge0Config() {
  const apiUrl = (process.env.JUDGE0_API_URL || DEFAULT_JUDGE0_URL).replace(/\/$/, '');
  const apiKey = process.env.JUDGE0_API_KEY || '';
  const apiHost = process.env.JUDGE0_API_HOST || '';

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  if (apiKey) {
    // RapidAPI format
    headers['X-RapidAPI-Key'] = apiKey;
    if (apiHost) {
      headers['X-RapidAPI-Host'] = apiHost;
    }
    // Also attach standard Bearer / Auth token for self-hosted instances
    headers['X-Auth-Token'] = apiKey;
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const languageMap = {
    python: Number(process.env.JUDGE0_PYTHON_ID) || DEFAULT_LANGUAGE_MAP.python,
    javascript: Number(process.env.JUDGE0_JS_ID) || DEFAULT_LANGUAGE_MAP.javascript,
    cpp: Number(process.env.JUDGE0_CPP_ID) || DEFAULT_LANGUAGE_MAP.cpp,
    java: Number(process.env.JUDGE0_JAVA_ID) || DEFAULT_LANGUAGE_MAP.java
  };

  return { apiUrl, headers, languageMap, isConfigured: true };
}

/**
 * Helper to safely decode a base64 string from Judge0.
 */
function decodeBase64(str) {
  if (!str || typeof str !== 'string') return '';
  try {
    return Buffer.from(str, 'base64').toString('utf8');
  } catch (_) {
    return str;
  }
}

/**
 * Helper to safely encode a string to base64 for Judge0.
 */
function encodeBase64(str) {
  if (typeof str !== 'string') return '';
  return Buffer.from(str, 'utf8').toString('base64');
}

/**
 * Checks Judge0 API connectivity and availability.
 * @returns {Promise<{ available: boolean, endpoint: string, error?: string }>}
 */
export async function checkJudge0Health() {
  const { apiUrl, headers } = getJudge0Config();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${apiUrl}/languages`, {
      method: 'GET',
      headers,
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      return { available: true, endpoint: apiUrl };
    }

    if (res.status === 429) {
      return { available: false, endpoint: apiUrl, error: 'Rate limit reached (HTTP 429)' };
    }

    return { available: false, endpoint: apiUrl, error: `HTTP ${res.status}` };
  } catch (err) {
    return { available: false, endpoint: apiUrl, error: err.message };
  }
}

/**
 * Polls for a submission token until execution finishes or timeout is reached.
 */
async function pollSubmission(apiUrl, token, headers, maxWaitMs = 12000) {
  const startTime = Date.now();
  const pollIntervalMs = 400;

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(r => setTimeout(r, pollIntervalMs));

    const res = await fetch(`${apiUrl}/submissions/${token}?base64_encoded=true`, {
      method: 'GET',
      headers
    });

    if (res.status === 429) {
      throw new Error('Judge0 API rate limit exceeded during polling. Please wait a moment.');
    }

    if (!res.ok) {
      throw new Error(`Failed to poll Judge0 submission ${token}: HTTP ${res.status}`);
    }

    const data = await res.json();
    // Status ID: 1 = In Queue, 2 = Processing
    if (data.status && data.status.id > 2) {
      return data;
    }
  }

  throw new Error(`Submission polling exceeded timeout of ${maxWaitMs}ms.`);
}

/**
 * Executes source code via the Judge0 API.
 * 
 * @param {string} code - Source code to execute.
 * @param {string} [stdin=''] - Standard input.
 * @param {number} [timeoutMs=5000] - Timeout in milliseconds.
 * @param {string} [language='python'] - Target programming language ('python', 'javascript', 'cpp', 'java').
 * @returns {Promise<Object>} Uniform execution result object.
 */
export async function executeCodeViaJudge0(code, stdin = '', timeoutMs = 5000, language = 'python') {
  const { apiUrl, headers, languageMap } = getJudge0Config();
  const langKey = language.toLowerCase();
  const languageId = languageMap[langKey] || languageMap.python;

  const startTime = Date.now();
  const cpuTimeLimit = Math.max(1, Math.min(15, Math.ceil(timeoutMs / 1000)));

  // Binary-safe base64 encoding avoids UTF-8 conversion errors on compiler outputs
  const payload = {
    language_id: languageId,
    source_code: encodeBase64(code),
    stdin: encodeBase64(stdin || ''),
    cpu_time_limit: cpuTimeLimit
  };

  let responseData = null;

  try {
    // Attempt synchronous execution first (?wait=true)
    const postRes = await fetch(`${apiUrl}/submissions?base64_encoded=true&wait=true`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (postRes.status === 429) {
      const durationMs = Date.now() - startTime;
      return {
        success: false,
        status: 'RATE_LIMITED',
        isTimeout: false,
        isCompilationError: false,
        exitCode: null,
        executionTimeMs: durationMs,
        stdout: '',
        stderr: 'Judge0 API rate limit exceeded. Please wait a few seconds before retrying.',
        error: 'Judge0 Rate Limit Exceeded'
      };
    }

    if (!postRes.ok) {
      const errText = await postRes.text().catch(() => '');
      throw new Error(`Judge0 API submission error (HTTP ${postRes.status}): ${errText}`);
    }

    responseData = await postRes.json();

    // If Judge0 returned without completing (status.id <= 2), fall back to polling
    if (responseData.status && responseData.status.id <= 2 && responseData.token) {
      responseData = await pollSubmission(apiUrl, responseData.token, headers, timeoutMs + 5000);
    }
  } catch (err) {
    const durationMs = Date.now() - startTime;
    return {
      success: false,
      status: 'EXECUTION_FAILED',
      isTimeout: false,
      isCompilationError: false,
      exitCode: null,
      executionTimeMs: durationMs,
      stdout: '',
      stderr: `Execution service error: ${err.message}`,
      error: err.message
    };
  }

  const durationMs = Date.now() - startTime;
  const statusId = responseData.status?.id || 0;
  const statusDescription = responseData.status?.description || 'Unknown Status';

  const decodedStdout = decodeBase64(responseData.stdout);
  const decodedStderr = decodeBase64(responseData.stderr);
  const decodedCompileOutput = decodeBase64(responseData.compile_output);
  const decodedMessage = decodeBase64(responseData.message);

  // Status mapping:
  // 3 = Accepted (Successful execution)
  // 5 = Time Limit Exceeded
  // 6 = Compilation Error
  // 7-12 = Runtime Errors (SIGSEGV, NZEC, etc.)
  if (statusId === 3) {
    return {
      success: true,
      status: 'SUCCESS',
      isTimeout: false,
      isCompilationError: false,
      exitCode: 0,
      executionTimeMs: Math.round(Number(responseData.time || 0) * 1000) || durationMs,
      stdout: decodedStdout,
      stderr: decodedStderr,
      error: null,
      judge0Status: { id: statusId, description: statusDescription },
      memoryKb: responseData.memory || null
    };
  }

  if (statusId === 6) {
    return {
      success: false,
      status: 'COMPILATION_ERROR',
      isTimeout: false,
      isCompilationError: true,
      exitCode: 1,
      executionTimeMs: durationMs,
      stdout: decodedStdout,
      stderr: decodedCompileOutput || decodedStderr || 'Compilation failed.',
      error: decodedCompileOutput || 'Compilation Error',
      judge0Status: { id: statusId, description: statusDescription }
    };
  }

  if (statusId === 5) {
    return {
      success: false,
      status: 'TIMEOUT',
      isTimeout: true,
      isCompilationError: false,
      exitCode: null,
      executionTimeMs: durationMs,
      stdout: decodedStdout,
      stderr: `Execution timed out after ${cpuTimeLimit}s. Possible infinite loop detected.`,
      error: 'Time Limit Exceeded',
      judge0Status: { id: statusId, description: statusDescription }
    };
  }

  // Runtime error or other fatal signal (IDs 7–14)
  const combinedError = decodedStderr || decodedMessage || decodedCompileOutput || statusDescription;
  return {
    success: false,
    status: 'ERROR',
    isTimeout: false,
    isCompilationError: false,
    exitCode: 1,
    executionTimeMs: Math.round(Number(responseData.time || 0) * 1000) || durationMs,
    stdout: decodedStdout,
    stderr: combinedError,
    error: combinedError,
    judge0Status: { id: statusId, description: statusDescription },
    memoryKb: responseData.memory || null
  };
}
