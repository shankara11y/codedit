/**
 * Phase 4 Test Suite for CodeFix AI Isolated Python Execution.
 * Runs 6 real test cases directly against the Execution Service and HTTP API.
 * 
 * IMPORTANT: This test makes NO Gemini API calls.
 */

import { executePythonCode } from './services/execution.service.js';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 CODEFIX AI - PHASE 4 DOCKER EXECUTION TEST SUITE');
  console.log('====================================================\n');

  const testCases = [
    {
      name: 'Test 1: Successful Execution (Math & Output)',
      code: `
def fibonacci(n):
    a, b = 0, 1
    result = []
    for _ in range(n):
        result.append(a)
        a, b = b, a + b
    return result

print("Fibonacci sequence:", fibonacci(8))
print("SUCCESS_OUTPUT")
`,
      stdin: '',
      timeoutMs: 4000,
      expectedStatus: 'SUCCESS',
      validate: (res) => res.stdout.includes('Fibonacci sequence: [0, 1, 1, 2, 3, 5, 8, 13]') && res.exitCode === 0
    },
    {
      name: 'Test 2: Syntax Error Handling',
      code: `
def faulty_syntax(x)
    return x * 2
print(faulty_syntax(10))
`,
      stdin: '',
      timeoutMs: 4000,
      expectedStatus: 'ERROR',
      validate: (res) => res.stderr.includes('SyntaxError') && res.exitCode !== 0
    },
    {
      name: 'Test 3: Runtime Error Handling (ZeroDivisionError)',
      code: `
def compute(x):
    return 100 / x

print("Starting compute...")
compute(0)
`,
      stdin: '',
      timeoutMs: 4000,
      expectedStatus: 'ERROR',
      validate: (res) => res.stderr.includes('ZeroDivisionError') && res.exitCode !== 0
    },
    {
      name: 'Test 4: Infinite Loop & Hard Timeout Enforcement',
      code: `
import time
print("Entering infinite loop...")
counter = 0
while True:
    counter += 1
`,
      stdin: '',
      timeoutMs: 2000, // 2s timeout
      expectedStatus: 'TIMEOUT',
      validate: (res) => res.isTimeout === true && res.status === 'TIMEOUT' && res.stderr.includes('timed out')
    },
    {
      name: 'Test 5: Interactive Standard Input (stdin)',
      code: `
first_name = input()
last_name = input()
print(f"User: {last_name.upper()}, {first_name.upper()}")
`,
      stdin: 'Ada\nLovelace\n',
      timeoutMs: 4000,
      expectedStatus: 'SUCCESS',
      validate: (res) => res.stdout.trim() === 'User: LOVELACE, ADA' && res.exitCode === 0
    },
    {
      name: 'Test 6: Security Sandbox Enforcement (Read-Only Mount & Network None)',
      code: `
import socket

# Test 1: File write to mounted sandbox dir should fail (Read-only file system)
try:
    with open('/sandbox/exploit.txt', 'w') as f:
        f.write('forbidden')
    print("FILE_WRITE_VULNERABLE")
except OSError as e:
    print(f"SANDBOX_FS_PROTECTED: {type(e).__name__}")

# Test 2: Network socket should fail (Network none)
try:
    s = socket.create_connection(("1.1.1.1", 53), timeout=1)
    print("NETWORK_VULNERABLE")
except Exception as e:
    print(f"SANDBOX_NET_PROTECTED: {type(e).__name__}")
`,
      stdin: '',
      timeoutMs: 4000,
      expectedStatus: 'SUCCESS',
      validate: (res) => res.stdout.includes('SANDBOX_FS_PROTECTED: OSError') && 
                         res.stdout.includes('SANDBOX_NET_PROTECTED') && 
                         !res.stdout.includes('VULNERABLE')
    }
  ];

  let passedCount = 0;

  for (const tc of testCases) {
    console.log(`▶ Running: ${tc.name}...`);
    try {
      const res = await executePythonCode(tc.code, tc.stdin, tc.timeoutMs);
      const isStatusMatch = res.status === tc.expectedStatus;
      const isCustomValid = tc.validate(res);

      if (isStatusMatch && isCustomValid) {
        console.log(`  ✅ PASSED (${res.executionTimeMs}ms)`);
        console.log(`     Status: ${res.status}, ExitCode: ${res.exitCode}`);
        if (res.stdout.trim()) {
          console.log(`     Stdout:\n${res.stdout.trim().split('\n').map(l => '       ' + l).join('\n')}`);
        }
        if (res.stderr.trim()) {
          console.log(`     Stderr:\n${res.stderr.trim().split('\n').map(l => '       ' + l).join('\n')}`);
        }
        passedCount++;
      } else {
        console.error(`  ❌ FAILED`);
        console.error(`     Expected Status: ${tc.expectedStatus}, Got: ${res.status}`);
        console.error(`     Response:`, res);
      }
    } catch (err) {
      console.error(`  💥 ERROR during test execution:`, err);
    }
    console.log('----------------------------------------------------');
  }

  console.log(`\n🏁 Test Summary: ${passedCount}/${testCases.length} Passed.`);
  if (passedCount === testCases.length) {
    console.log('🎉 All Phase 4 execution and security sandbox tests succeeded!\n');
    process.exit(0);
  } else {
    console.error('⚠️ Some tests failed!\n');
    process.exit(1);
  }
}

runTests();
