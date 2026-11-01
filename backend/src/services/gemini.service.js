import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { normalizeDebugResult } from '../utils/validation.js';

/**
 * Structured schema defining the expected JSON response from Gemini.
 * Enforces strong typing and eliminates unstructured text parsing.
 */
const debugResponseSchema = {
  type: Type.OBJECT,
  properties: {
    hasBugs: { 
      type: Type.BOOLEAN, 
      description: 'True if any syntax, runtime, or logical bug is detected in the code.' 
    },
    summary: { 
      type: Type.STRING, 
      description: 'A 1-2 sentence high-level assessment of the code.' 
    },
    bugs: {
      type: Type.ARRAY,
      description: 'List of detected bugs categorized into syntax, runtime, or logical.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'Unique identifier, e.g., BUG-1' },
          category: { 
            type: Type.STRING, 
            description: 'Must be exactly one of: syntax, runtime, logical' 
          },
          lineNumbers: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER },
            description: 'The 1-indexed line numbers where the bug occurs or is caused.'
          },
          severity: { 
            type: Type.STRING, 
            description: 'Severity level: critical or warning' 
          },
          title: { type: Type.STRING, description: 'Short technical title, e.g., ZeroDivisionError' },
          explanation: { 
            type: Type.STRING, 
            description: 'Clear, plain-language explanation of why this bug happens.' 
          },
          fixSuggestion: { 
            type: Type.STRING, 
            description: 'Actionable suggestion to resolve this issue.' 
          }
        },
        required: ['id', 'category', 'lineNumbers', 'severity', 'title', 'explanation', 'fixSuggestion']
      }
    },
    correctedCode: { 
      type: Type.STRING, 
      description: 'The complete, fully corrected, and executable Python code.' 
    },
    explanationOfChanges: { 
      type: Type.STRING, 
      description: 'Detailed explanation of all modifications made to repair the code.' 
    },
    suggestedCases: {
      type: Type.ARRAY,
      description: '2 to 4 recommended test cases to verify the program.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'Test ID, e.g., TEST-1' },
          description: { type: Type.STRING, description: 'What this test validates' },
          stdin: { 
            type: Type.STRING, 
            description: 'Standard input provided to the program, or empty string if none needed.' 
          },
          expectedOutput: { 
            type: Type.STRING, 
            description: 'Exact expected stdout produced by running the program.' 
          },
          testType: { 
            type: Type.STRING, 
            description: 'Must be one of: basic, edge_case, boundary' 
          }
        },
        required: ['id', 'description', 'stdin', 'expectedOutput', 'testType']
      }
    }
  },
  required: ['hasBugs', 'summary', 'bugs', 'correctedCode', 'explanationOfChanges', 'suggestedCases']
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Checks whether an error is transient/retryable (504, 503, 429, timeout, network error).
 * Non-retryable errors (invalid key, 400 bad request, 404 model not found) return false.
 */
export function isRetryableError(err) {
  if (!err) return false;
  const status = err.status || err.statusCode;
  if ([504, 503, 429].includes(status)) return true;

  const msg = `${err.message || ''} ${err.details || ''} ${err.name || ''}`;
  return /504|503|429|DEADLINE_EXCEEDED|RESOURCE_EXHAUSTED|UNAVAILABLE|high demand|timeout|ETIMEDOUT|ECONNRESET/i.test(msg);
}

/**
 * Generates structured content from Gemini with optimized tokens and low thinking depth.
 */
async function executeGeneration(ai, model, prompt) {
  return await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: debugResponseSchema,
      temperature: 0.1,
      maxOutputTokens: 2500,
      thinkingConfig: {
        thinkingLevel: 'low' // Optimize latency and token budget
      }
    }
  });
}

/**
 * Service to analyze Python code with Google Gemini API.
 * Uses primary model (gemini-3.8-flash) with 1-2 retries on temporary 504/503/429
 * and automatic fallback to gemini-3.6-flash if primary remains unavailable.
 * 
 * @param {string} code - The submitted Python code.
 * @param {string} [problemDescription] - Optional user description of intended behavior.
 * @returns {Promise<Object>} Structured debugging report.
 */
export async function analyzeAndRepairCode(code, problemDescription = '', language = 'python') {
  dotenv.config();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    const error = new Error('GEMINI_API_KEY is not configured in backend/.env. Please add your Google AI Studio API key.');
    error.statusCode = 503;
    error.code = 'MISSING_API_KEY';
    throw error;
  }

  // 35s timeout gives ample time to generate tokens without triggering premature 504s
  const ai = new GoogleGenAI({ 
    apiKey,
    httpOptions: { timeout: 35000 }
  });

  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const fallbackModel = 'gemini-3.6-flash';

  const languageNames = {
    python: 'Python 3.11',
    javascript: 'JavaScript (Node.js)',
    cpp: 'C++ (G++ C++17)',
    java: 'Java (JDK 17)'
  };
  const targetLanguage = languageNames[language?.toLowerCase()] || 'Python';

  const prompt = `
You are a senior compiler and software debugging engineer specializing in ${targetLanguage}.
Analyze the following ${targetLanguage} program and return a structured JSON report.

### INTENDED BEHAVIOR:
${problemDescription ? problemDescription.trim() : `Infer intent from the ${targetLanguage} code.`}

### SOURCE CODE (${targetLanguage}):
\`\`\`${language || 'python'}
${code.trim()}
\`\`\`

### INSTRUCTIONS:
1. Detect all syntax, runtime, and logical bugs.
2. If no bugs are present, set hasBugs to false and return empty bugs array.
3. If bugs are found:
   - Categorize each into: "syntax", "runtime", or "logical".
   - Provide 1-indexed line numbers.
   - Explain the root cause clearly.
   - Provide the complete, working, corrected code in "correctedCode" STRICTLY written in ${targetLanguage}. DO NOT translate to a different language.
   - Detail changes made in "explanationOfChanges".
4. Suggest 2-4 test cases (stdin, expected stdout, type: basic/edge_case/boundary).
`;

  let response;
  let activeModel = primaryModel;
  let lastError;

  // Phase 1: Attempt primary model with up to 1 retry on retryable errors
  const maxPrimaryAttempts = 2;
  for (let attempt = 1; attempt <= maxPrimaryAttempts; attempt++) {
    try {
      console.log(`[Gemini Service] Requesting ${primaryModel} (attempt ${attempt}/${maxPrimaryAttempts})...`);
      response = await executeGeneration(ai, primaryModel, prompt);
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini Service] ${primaryModel} attempt ${attempt} failed:`, err.status || err.message);

      if (!isRetryableError(err)) {
        // Non-retryable error (e.g. invalid API key, bad request) - abort immediately
        console.error(`[Gemini Service] Non-retryable error encountered: ${err.message}`);
        throw err;
      }

      if (attempt < maxPrimaryAttempts) {
        const backoffMs = attempt * 1200;
        console.log(`[Gemini Service] Backing off for ${backoffMs}ms before retrying ${primaryModel}...`);
        await delay(backoffMs);
      }
    }
  }

  // Phase 2: If primary model failed with retryable error, fallback to gemini-3.6-flash
  if (!response && lastError && isRetryableError(lastError) && primaryModel !== fallbackModel) {
    console.warn(`[Gemini Service] Primary model ${primaryModel} failed with retryable error (${lastError.status || lastError.message}). Switching to fallback model ${fallbackModel}...`);
    activeModel = fallbackModel;

    const maxFallbackAttempts = 2;
    for (let attempt = 1; attempt <= maxFallbackAttempts; attempt++) {
      try {
        console.log(`[Gemini Service] Requesting fallback ${fallbackModel} (attempt ${attempt}/${maxFallbackAttempts})...`);
        response = await executeGeneration(ai, fallbackModel, prompt);
        lastError = null;
        break;
      } catch (fallbackErr) {
        lastError = fallbackErr;
        console.warn(`[Gemini Service] Fallback model ${fallbackModel} attempt ${attempt} failed:`, fallbackErr.status || fallbackErr.message);

        if (!isRetryableError(fallbackErr)) {
          throw fallbackErr;
        }

        if (attempt < maxFallbackAttempts) {
          const backoffMs = attempt * 1500;
          console.log(`[Gemini Service] Backing off for ${backoffMs}ms before retrying ${fallbackModel}...`);
          await delay(backoffMs);
        }
      }
    }
  }

  if (!response) {
    console.error('Gemini Service Failure:', lastError);
    if (lastError?.statusCode) throw lastError;

    const error = new Error(`AI Analysis failed: ${lastError?.message || 'All model attempts failed.'}`);
    error.statusCode = lastError?.status || 502;
    error.details = lastError?.message;
    throw error;
  }

  const responseText = response.text;
  if (!responseText) {
    throw new Error('Gemini API returned an empty response.');
  }

  const rawJson = JSON.parse(responseText);
  const normalized = normalizeDebugResult(rawJson, code);
  normalized.modelUsed = activeModel;
  return normalized;
}
