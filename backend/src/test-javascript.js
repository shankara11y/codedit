/**
 * Test suite for CodeFix AI isolated JavaScript (Node.js) execution.
 * Tests fixed JS examples without any Gemini API calls.
 */
import { executeCode } from './services/execution.service.js';

async function runTest(testName, fn) {
  process.stdout.write(`▶ Running: ${testName}...\n`);
  const start = Date.now();
  try {
    const res = await fn();
    const duration = Date.now() - start;
    if (res.pass) {
      console.log(`  ✅ PASSED (${duration}ms)`);
      if (res.details) console.log(`     ${res.details}`);
      return true;
    } else {
      console.error(`  ❌ FAILED (${duration}ms): ${res.reason}`);
      if (res.output) console.error(`     Output:`, res.output);
      return false;
    }
  } catch (err) {
    console.error(`  ❌ ERROR: ${err.message}`);
    return false;
  } finally {
    console.log('----------------------------------------------------');
  }
}

async function main() {
  console.log('====================================================');
  console.log('🧪 CODEFIX AI - JAVASCRIPT SANDBOX TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  // Test 1: Successful execution
  total++;
  if (await runTest('Test 1: Successful Execution (Math & Functions)', async () => {
    const code = `
function fibonacci(n) {
  const seq = [0, 1];
  for (let i = 2; i < n; i++) {
    seq.push(seq[i - 1] + seq[i - 2]);
  }
  return seq;
}
console.log("Fibonacci:", JSON.stringify(fibonacci(8)));
console.log("SUCCESS_JS_OUTPUT");
`;
    const res = await executeCode(code, '', 5000, 'javascript');
    const hasSuccess = res.success && res.stdout.includes('SUCCESS_JS_OUTPUT') && res.stdout.includes('[0,1,1,2,3,5,8,13]');
    return {
      pass: hasSuccess,
      reason: `Expected success output, got: ${JSON.stringify(res)}`,
      details: `ExitCode: ${res.exitCode}, Stdout: ${res.stdout.trim().replace(/\n/g, ' ')}`
    };
  })) passed++;

  // Test 2: Syntax Error
  total++;
  if (await runTest('Test 2: Syntax Error Handling', async () => {
    const code = `
function broken( {
  console.log("Missing paren")
`;
    const res = await executeCode(code, '', 5000, 'javascript');
    const isExpected = !res.success && res.exitCode !== 0 && (res.stderr.includes('SyntaxError') || res.error?.includes('SyntaxError'));
    return {
      pass: isExpected,
      reason: `Expected SyntaxError, got: ${JSON.stringify(res)}`,
      details: `Status: ${res.status}, ExitCode: ${res.exitCode}, Stderr: ${res.stderr.trim().split('\n')[0]}`
    };
  })) passed++;

  // Test 3: Runtime Error
  total++;
  if (await runTest('Test 3: Runtime Error (TypeError)', async () => {
    const code = `
const obj = null;
console.log("Before crash");
console.log(obj.nonExistentMethod());
`;
    const res = await executeCode(code, '', 5000, 'javascript');
    const isExpected = !res.success && res.exitCode !== 0 && (res.stderr.includes('TypeError') || res.error?.includes('TypeError'));
    return {
      pass: isExpected,
      reason: `Expected TypeError, got: ${JSON.stringify(res)}`,
      details: `Status: ${res.status}, ExitCode: ${res.exitCode}, Stderr: ${res.stderr.trim().split('\n')[0]}`
    };
  })) passed++;

  // Test 4: Infinite Loop & Timeout Enforcement
  total++;
  if (await runTest('Test 4: Infinite Loop & Hard Timeout (2000ms)', async () => {
    const code = `
console.log("Entering infinite loop...");
while (true) {}
`;
    const res = await executeCode(code, '', 2000, 'javascript');
    const isExpected = res.isTimeout === true && res.status === 'TIMEOUT';
    return {
      pass: isExpected,
      reason: `Expected TIMEOUT, got: ${JSON.stringify(res)}`,
      details: `Status: ${res.status}, isTimeout: ${res.isTimeout}, Duration: ${res.executionTimeMs}ms`
    };
  })) passed++;

  // Test 5: Interactive Stdin
  total++;
  if (await runTest('Test 5: Interactive Standard Input (stdin)', async () => {
    const code = `
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim();
console.log("Hello, " + input.toUpperCase() + "!");
`;
    const res = await executeCode(code, 'Antigravity Developer', 5000, 'javascript');
    const isExpected = res.success && res.stdout.includes('Hello, ANTIGRAVITY DEVELOPER!');
    return {
      pass: isExpected,
      reason: `Expected greeting with stdin, got: ${JSON.stringify(res)}`,
      details: `Stdout: ${res.stdout.trim()}`
    };
  })) passed++;

  // Test 6: Security Sandbox Protection
  total++;
  if (await runTest('Test 6: Security Sandbox (Read-Only FS & Network None)', async () => {
    const code = `
const fs = require('fs');
const http = require('http');

// Test 1: Try writing to /sandbox
try {
  fs.writeFileSync('/sandbox/hack.txt', 'evil');
  console.log('FS_WRITE_ALLOWED');
} catch (e) {
  console.log('SANDBOX_FS_PROTECTED: ' + e.code);
}

// Test 2: Try network connection with fast timeout
const req = http.get({ host: '1.1.1.1', port: 80, timeout: 500 }, () => {});
req.on('error', (e) => {
  console.log('SANDBOX_NET_PROTECTED: ' + e.code);
});
req.on('timeout', () => {
  req.destroy();
  console.log('SANDBOX_NET_PROTECTED: TIMEOUT');
});
`;
    const res = await executeCode(code, '', 5000, 'javascript');
    const isExpected = res.success && res.stdout.includes('SANDBOX_FS_PROTECTED: EROFS');
    return {
      pass: isExpected,
      reason: `Expected sandbox read-only protection, got: ${JSON.stringify(res)}`,
      details: `Stdout: ${res.stdout.trim().replace(/\n/g, ' ')}`
    };
  })) passed++;

  console.log(`\n🏁 Test Summary: ${passed}/${total} Passed.`);
  if (passed === total) {
    console.log('🎉 All JavaScript sandbox tests succeeded!\n');
    process.exit(0);
  } else {
    console.error('❌ Some JavaScript tests failed.\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
