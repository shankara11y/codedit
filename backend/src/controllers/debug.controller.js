import dotenv from 'dotenv';
import { analyzeAndRepairCode } from '../services/gemini.service.js';
import { executeCode as executeCodeDocker, isDockerAvailable } from '../services/execution.service.js';
import { executeCodeViaJudge0, checkJudge0Health } from '../services/judge0.service.js';
import { 
  saveDebugSession, 
  getDebugSessions, 
  getDebugSessionById, 
  checkSupabaseHealth, 
  isSupabaseConfigured 
} from '../services/supabase.service.js';
import { validateDebugRequest, validateExecuteRequest } from '../utils/validation.js';

/**
 * Controller for health check endpoint.
 */
export const getHealth = async (req, res) => {
  dotenv.config({ override: true }); // Reload .env dynamically so key changes take effect immediately
  const key = process.env.GEMINI_API_KEY;
  const hasGeminiKey = Boolean(key && key.trim() !== '' && key !== 'your_gemini_api_key_here');
  
  const judge0Health = await checkJudge0Health();
  const supabaseHealth = await checkSupabaseHealth();
  const dockerReady = await isDockerAvailable();

  res.status(200).json({
    status: 'ok',
    service: 'CodeFix AI Backend',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    aiConfigured: hasGeminiKey,
    executionBackend: process.env.EXECUTION_BACKEND || 'judge0',
    judge0Available: judge0Health.available,
    judge0Endpoint: judge0Health.endpoint,
    supabaseConfigured: isSupabaseConfigured(),
    supabaseAvailable: supabaseHealth.available,
    dockerAvailable: dockerReady
  });
};

/**
 * Controller for isolated multi-language code execution.
 * POST /api/execute
 */
export const executeCode = async (req, res, next) => {
  try {
    const validation = validateExecuteRequest(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: validation.error
      });
    }

    const { code, stdin, timeoutMs, language } = validation.sanitizedData;
    const backend = (process.env.EXECUTION_BACKEND || 'judge0').toLowerCase();

    console.log(`[Execute Request] Executing ${language} code via ${backend.toUpperCase()} (${code.length} chars, timeout: ${timeoutMs}ms)...`);
    
    let result;
    if (backend === 'docker') {
      result = await executeCodeDocker(code, stdin, timeoutMs, language);
    } else {
      result = await executeCodeViaJudge0(code, stdin, timeoutMs, language);
    }

    console.log(`[Execute Result] Status: ${result.status}, Exit: ${result.exitCode}, Duration: ${result.executionTimeMs}ms`);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('[Execute Error]', err);

    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: err.code || 'EXECUTION_FAILED',
      message: err.message || 'An unexpected error occurred during code execution.'
    });
  }
};

/**
 * Controller for code debugging and repair endpoint.
 * POST /api/debug
 */
export const debugCode = async (req, res, next) => {
  try {
    const validation = validateDebugRequest(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: validation.error
      });
    }

    const { code, problemDescription, language } = validation.sanitizedData;

    console.log(`[Debug Request] Processing ${code.length} chars of ${language} code...`);
    const startTime = Date.now();

    const debugResult = await analyzeAndRepairCode(code, problemDescription, language);
    const durationMs = Date.now() - startTime;

    console.log(`[Debug Success] Analysis finished in ${durationMs}ms. Found ${debugResult.bugs.length} bugs.`);

    return res.status(200).json({
      success: true,
      meta: {
        analysisDurationMs: durationMs,
        analyzedAt: new Date().toISOString()
      },
      data: debugResult
    });
  } catch (err) {
    console.error('[Debug Error]', err);

    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: err.code || 'DEBUGGING_FAILED',
      message: err.message || 'An unexpected error occurred during code analysis.',
      details: err.details || null
    });
  }
};

/**
 * Controller to save a completed debugging & verification session in Supabase.
 * POST /api/sessions
 */
export const createSession = async (req, res) => {
  try {
    const sessionData = req.body;
    if (!sessionData || typeof sessionData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Request body must be a JSON object containing session data.'
      });
    }

    if (!sessionData.original_code || typeof sessionData.original_code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'The "original_code" field is required.'
      });
    }

    const result = await saveDebugSession(sessionData);

    return res.status(result.saved ? 201 : 200).json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('[Create Session Error]', err);
    return res.status(500).json({
      success: false,
      error: 'SESSION_SAVE_FAILED',
      message: err.message || 'Failed to save session to Supabase.'
    });
  }
};

/**
 * Controller to retrieve debugging sessions list.
 * GET /api/sessions
 */
export const getSessions = async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const language = req.query.language || null;

    const result = await getDebugSessions({ limit, offset, language });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('[Get Sessions Error]', err);
    return res.status(500).json({
      success: false,
      error: 'GET_SESSIONS_FAILED',
      message: err.message || 'Failed to retrieve sessions.'
    });
  }
};

/**
 * Controller to retrieve a single debugging session by ID.
 * GET /api/sessions/:id
 */
export const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Session ID parameter is required.'
      });
    }

    const result = await getDebugSessionById(id);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: 'SESSION_NOT_FOUND',
        message: result.error || 'Session not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: result.session
    });
  } catch (err) {
    console.error('[Get Session By ID Error]', err);
    return res.status(500).json({
      success: false,
      error: 'GET_SESSION_FAILED',
      message: err.message || 'Failed to retrieve session details.'
    });
  }
};
