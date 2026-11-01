import dotenv from 'dotenv';
import { analyzeAndRepairCode } from '../services/gemini.service.js';
import { executeCode as executeCodeSandbox, executePythonCode, isDockerAvailable } from '../services/execution.service.js';
import { validateDebugRequest, validateExecuteRequest } from '../utils/validation.js';

/**
 * Controller for health check endpoint.
 */
export const getHealth = async (req, res) => {
  dotenv.config(); // Reload .env dynamically so key changes take effect immediately
  const key = process.env.GEMINI_API_KEY;
  const hasGeminiKey = Boolean(key && key.trim() !== '' && key !== 'your_gemini_api_key_here');
  const dockerReady = await isDockerAvailable();

  res.status(200).json({
    status: 'ok',
    service: 'CodeFix AI Backend',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    aiConfigured: hasGeminiKey,
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

    console.log(`[Execute Request] Executing ${language} code (${code.length} chars, timeout: ${timeoutMs}ms)...`);
    const result = await executeCodeSandbox(code, stdin, timeoutMs, language);

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
