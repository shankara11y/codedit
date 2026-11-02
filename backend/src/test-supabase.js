/**
 * Test Suite for Phase 2: Supabase Session Storage Integration
 * 
 * Verifies payload validation, serialization, health reporting,
 * and graceful fallback mechanisms for persistent database sessions.
 */

import { 
  isSupabaseConfigured, 
  saveDebugSession, 
  getDebugSessions, 
  checkSupabaseHealth 
} from './services/supabase.service.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('========================================================');
  console.log('   CodeFix AI – Phase 2: Supabase Storage Verification   ');
  console.log('========================================================\n');

  // Test 1: Configuration check
  console.log('Test 1: Supabase Configuration Detection...');
  const configured = isSupabaseConfigured();
  console.log(`  Current environment Supabase configured: ${configured}`);
  assert(typeof configured === 'boolean', 'isSupabaseConfigured returns boolean');

  // Test 2: Health check response format
  console.log('\nTest 2: Supabase Health Check Structure...');
  const health = await checkSupabaseHealth();
  assert(typeof health === 'object' && health !== null, 'checkSupabaseHealth returns an object');
  assert('configured' in health, 'health response includes "configured" status');
  assert('available' in health, 'health response includes "available" status');

  // Test 3: Validation - Reject missing original_code
  console.log('\nTest 3: Reject Session Without original_code...');
  let caughtValidation = false;
  try {
    await saveDebugSession({ language: 'python' });
  } catch (err) {
    caughtValidation = true;
    assert(err.message.includes('original_code is required'), 'Throws specific error when original_code is missing');
  }
  assert(caughtValidation, 'Validation correctly prevents invalid session insert');

  // Test 4: Graceful behavior when unconfigured or configured
  console.log('\nTest 4: Session Storage Execution & Fallback...');
  const sampleSession = {
    language: 'python',
    original_code: 'def div(a, b): return a / b\nprint(div(1, 0))',
    problem_description: 'Fix ZeroDivisionError',
    repaired_code: 'def div(a, b):\n    if b == 0: return 0\n    return a / b\nprint(div(1, 0))',
    bug_analysis: [
      {
        id: 1,
        title: 'Zero Division Crash',
        description: 'Division by zero occurs when b is 0.',
        lineNumbers: [1, 2]
      }
    ],
    test_cases: [
      { id: 'tc-1', input: '', expectedOutput: '0' },
      { id: 'tc-2', input: '', expectedOutput: '5' }
    ],
    evaluation_results: {
      totalTests: 2,
      passedCount: 2,
      failedCount: 0,
      summary: 'All test cases passed.'
    },
    workflow_stage: 'verification_completed'
  };

  const saveRes = await saveDebugSession(sampleSession);
  assert(typeof saveRes === 'object', 'saveDebugSession returns result object');
  assert('saved' in saveRes, 'Result contains "saved" boolean indicator');
  
  if (!configured) {
    assert(saveRes.saved === false, 'When unconfigured, saved is false');
    assert(typeof saveRes.warning === 'string', 'When unconfigured, provides a clear warning without crashing');
  } else {
    assert(saveRes.saved === true, 'When configured, successfully saves to Supabase');
    assert(typeof saveRes.id === 'string', 'Returns inserted UUID record ID');
  }

  // Test 5: Querying sessions list
  console.log('\nTest 5: Querying Sessions List...');
  const queryRes = await getDebugSessions({ limit: 5 });
  assert(queryRes.success === true, 'getDebugSessions returns success: true');
  assert(Array.isArray(queryRes.sessions), 'Sessions is an array');

  // Test 6: Verify Live HTTP API via Express
  console.log('\nTest 6: Live HTTP API Endpoints via Express (port 5050)...');
  try {
    const healthFetch = await fetch('http://127.0.0.1:5050/api/health');
    const healthData = await healthFetch.json();
    assert(healthData.status === 'ok', 'GET /api/health returned 200 OK');
    assert('supabaseConfigured' in healthData, 'GET /api/health includes supabaseConfigured');
    assert('supabaseAvailable' in healthData, 'GET /api/health includes supabaseAvailable');

    // POST /api/sessions
    const postSessionFetch = await fetch('http://127.0.0.1:5050/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleSession)
    });
    const postData = await postSessionFetch.json();
    assert(postSessionFetch.status === 200 || postSessionFetch.status === 201, `POST /api/sessions returned status ${postSessionFetch.status}`);
    assert(postData.success === true, 'POST /api/sessions returned success: true');

    // GET /api/sessions
    const getSessionsFetch = await fetch('http://127.0.0.1:5050/api/sessions');
    const getSessionsData = await getSessionsFetch.json();
    assert(getSessionsFetch.status === 200, 'GET /api/sessions returned 200 OK');
    assert(getSessionsData.success === true, 'GET /api/sessions returned success: true');
  } catch (err) {
    assert(false, `Express endpoint test error: ${err.message}`);
  }

  console.log('\n========================================================');
  console.log(`Phase 2 Test Results: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
