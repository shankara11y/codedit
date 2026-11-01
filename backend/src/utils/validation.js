export const SUPPORTED_LANGUAGES = ['python', 'javascript', 'cpp', 'java'];
export const DEFAULT_LANGUAGE = 'python';

/**
 * Validates the debug request payload.
 * @param {Object} body - Request body containing code, optional problemDescription, and language.
 * @returns {{ isValid: boolean, error?: string, sanitizedData?: { code: string, problemDescription: string, language: string } }}
 */
export function validateDebugRequest(body) {
  if (!body || typeof body !== 'object') {
    return { isValid: false, error: 'Request body must be a valid JSON object.' };
  }

  const { code, problemDescription, language } = body;

  if (typeof code !== 'string' || code.trim().length === 0) {
    return { isValid: false, error: 'The "code" field is required and must be a non-empty string.' };
  }

  if (code.length > 50000) {
    return { isValid: false, error: 'Submitted code exceeds maximum limit of 50,000 characters.' };
  }

  const sanitizedLanguage = typeof language === 'string' && language.trim()
    ? language.toLowerCase().trim()
    : DEFAULT_LANGUAGE;

  if (!SUPPORTED_LANGUAGES.includes(sanitizedLanguage)) {
    return { 
      isValid: false, 
      error: `Unsupported language "${language}". Supported languages are: ${SUPPORTED_LANGUAGES.join(', ')}.` 
    };
  }

  const sanitizedDescription = typeof problemDescription === 'string' 
    ? problemDescription.trim() 
    : '';

  return {
    isValid: true,
    sanitizedData: {
      code,
      problemDescription: sanitizedDescription,
      language: sanitizedLanguage
    }
  };
}

/**
 * Validates the code execution request payload.
 * @param {Object} body - Request body containing code, optional stdin, timeoutMs, and language.
 * @returns {{ isValid: boolean, error?: string, sanitizedData?: { code: string, stdin: string, timeoutMs: number, language: string } }}
 */
export function validateExecuteRequest(body) {
  if (!body || typeof body !== 'object') {
    return { isValid: false, error: 'Request body must be a valid JSON object.' };
  }

  const { code, stdin, timeoutMs, language } = body;

  if (typeof code !== 'string' || code.trim().length === 0) {
    return { isValid: false, error: 'The "code" field is required and must be a non-empty string.' };
  }

  if (code.length > 50000) {
    return { isValid: false, error: 'Submitted code exceeds maximum limit of 50,000 characters.' };
  }

  const sanitizedLanguage = typeof language === 'string' && language.trim()
    ? language.toLowerCase().trim()
    : DEFAULT_LANGUAGE;

  if (!SUPPORTED_LANGUAGES.includes(sanitizedLanguage)) {
    return { 
      isValid: false, 
      error: `Unsupported language "${language}". Supported languages are: ${SUPPORTED_LANGUAGES.join(', ')}.` 
    };
  }

  const sanitizedStdin = typeof stdin === 'string' ? stdin : '';
  if (sanitizedStdin.length > 50000) {
    return { isValid: false, error: 'Standard input exceeds maximum limit of 50,000 characters.' };
  }

  let sanitizedTimeout = 5000;
  if (timeoutMs !== undefined && timeoutMs !== null) {
    const num = Number(timeoutMs);
    if (isNaN(num) || num < 500 || num > 15000) {
      return { isValid: false, error: 'Timeout must be a number between 500ms and 15000ms.' };
    }
    sanitizedTimeout = num;
  }

  return {
    isValid: true,
    sanitizedData: {
      code,
      stdin: sanitizedStdin,
      timeoutMs: sanitizedTimeout,
      language: sanitizedLanguage
    }
  };
}

/**
 * Validates that the AI structured response conforms to expected schema.
 * Ensures defensive fallbacks so the frontend never crashes on missing keys.
 * @param {Object} aiResult - Parsed JSON object from Gemini.
 * @param {string} originalCode - Original submitted code for fallback.
 * @returns {Object} Normalized debugging result.
 */
export function normalizeDebugResult(aiResult, originalCode) {
  if (!aiResult || typeof aiResult !== 'object') {
    return {
      hasBugs: false,
      summary: 'Analysis completed, but response format was irregular.',
      bugs: [],
      correctedCode: originalCode,
      explanationOfChanges: 'No changes could be reliably generated.',
      suggestedCases: []
    };
  }

  const bugs = Array.isArray(aiResult.bugs) ? aiResult.bugs.map((bug, index) => ({
    id: bug.id || `BUG-${index + 1}`,
    category: ['syntax', 'runtime', 'logical'].includes(bug.category?.toLowerCase()) 
      ? bug.category.toLowerCase() 
      : 'logical',
    lineNumbers: Array.isArray(bug.lineNumbers) 
      ? bug.lineNumbers.map(n => Number(n)).filter(n => !isNaN(n)) 
      : [],
    severity: ['critical', 'warning'].includes(bug.severity?.toLowerCase())
      ? bug.severity.toLowerCase()
      : 'critical',
    title: bug.title || 'Code Issue',
    explanation: bug.explanation || 'An issue was detected in this section of code.',
    fixSuggestion: bug.fixSuggestion || 'Review and apply suggested correction.'
  })) : [];

  const suggestedCases = Array.isArray(aiResult.suggestedCases) 
    ? aiResult.suggestedCases.map((tc, index) => ({
        id: tc.id || `TEST-${index + 1}`,
        description: tc.description || `Test case ${index + 1}`,
        stdin: typeof tc.stdin === 'string' ? tc.stdin : '',
        expectedOutput: typeof tc.expectedOutput === 'string' ? tc.expectedOutput : '',
        testType: ['basic', 'edge_case', 'boundary'].includes(tc.testType?.toLowerCase())
          ? tc.testType.toLowerCase()
          : 'basic'
      }))
    : [];

  return {
    hasBugs: typeof aiResult.hasBugs === 'boolean' ? aiResult.hasBugs : bugs.length > 0,
    summary: aiResult.summary || (bugs.length > 0 ? `Found ${bugs.length} issue(s) in your Python code.` : 'No obvious bugs detected.'),
    bugs,
    correctedCode: typeof aiResult.correctedCode === 'string' && aiResult.correctedCode.trim().length > 0
      ? aiResult.correctedCode
      : originalCode,
    explanationOfChanges: aiResult.explanationOfChanges || 'Code was analyzed.',
    suggestedCases
  };
}
