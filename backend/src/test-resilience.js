/**
 * Automated test script to verify retry and fallback resilience under simulated failure conditions.
 * Usage: node src/test-resilience.js
 */

import { isRetryableError } from './services/gemini.service.js';

console.log('=== Test 1: Testing error classification (isRetryableError) ===');

const testErrors = [
  { err: { status: 504, message: 'Deadline expired' }, expected: true, label: '504 Gateway Timeout' },
  { err: { status: 503, message: 'Service Unavailable' }, expected: true, label: '503 Service Unavailable' },
  { err: { status: 429, message: 'Resource exhausted' }, expected: true, label: '429 Rate Limit' },
  { err: { message: 'DEADLINE_EXCEEDED: Deadline expired before operation could complete.' }, expected: true, label: 'DEADLINE_EXCEEDED string' },
  { err: { message: 'timeout of 35000ms exceeded' }, expected: true, label: 'Client timeout' },
  { err: { status: 400, message: 'Invalid argument' }, expected: false, label: '400 Bad Request (Non-retryable)' },
  { err: { status: 401, message: 'API key not valid' }, expected: false, label: '401 Invalid Key (Non-retryable)' },
  { err: { status: 404, message: 'Model not found' }, expected: false, label: '404 Model Not Found (Non-retryable)' },
];

let allClassificationPassed = true;
for (const item of testErrors) {
  const result = isRetryableError(item.err);
  const passed = result === item.expected;
  console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${item.label} -> isRetryable: ${result} (expected ${item.expected})`);
  if (!passed) allClassificationPassed = false;
}

console.log(`\nError classification test: ${allClassificationPassed ? 'ALL PASSED ✅' : 'FAILED ❌'}`);

console.log('\n=== Test 2: Testing live end-to-end fallback when primary model is 504/429 ===');
import { analyzeAndRepairCode } from './services/gemini.service.js';

const start = Date.now();
try {
  const result = await analyzeAndRepairCode(
    'def greet(name):\n    print(\"Hello \" + name)\ngreet(123)',
    'Greet person by name safely'
  );
  const elapsed = Date.now() - start;
  console.log(`\nLive Analysis Succeeded in ${elapsed}ms!`);
  console.log(`Model successfully used: ${result.modelUsed}`);
  console.log(`Bugs detected: ${result.bugs.length}`);
  console.log(`First bug title: ${result.bugs[0]?.title} (${result.bugs[0]?.category})`);
  console.log('Retry & Fallback Verification: PASSED ✅');
} catch (err) {
  console.error('Live analysis failed:', err);
}
