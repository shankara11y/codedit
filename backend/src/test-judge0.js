/**
 * Test Suite for Phase 1: Judge0 External Execution Integration
 * 
 * Verifies code execution across Python, JavaScript, C++, and Java,
 * along with error categorization (compilation error, runtime error, timeout, success)
 * and stdin processing without invoking Docker.
 */

import { executeCodeViaJudge0, checkJudge0Health } from './services/judge0.service.js';

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
  console.log('   CodeFix AI – Phase 1: Judge0 Backend Verification   ');
  console.log('========================================================\n');

  // Test 1: Health check
  console.log('Test 1: Judge0 Health Check...');
  const health = await checkJudge0Health();
  assert(health.available === true, `Judge0 API is reachable at ${health.endpoint}`);

  // Test 2: Python 3 Execution
  console.log('\nTest 2: Python 3 Standard Execution...');
  const pyCode = 'total = sum([10, 20, 30])\nprint("Total is:", total)';
  const pyRes = await executeCodeViaJudge0(pyCode, '', 5000, 'python');
  assert(pyRes.success === true, 'Python executed successfully');
  assert(pyRes.status === 'SUCCESS', `Python status is SUCCESS (got ${pyRes.status})`);
  assert(pyRes.stdout.trim() === 'Total is: 60', `Python stdout matches "Total is: 60" (got "${pyRes.stdout.trim()}")`);
  assert(pyRes.isCompilationError === false, 'isCompilationError is false');

  // Test 3: Python Runtime Error (ZeroDivisionError)
  console.log('\nTest 3: Python Runtime Error Detection...');
  const pyErrCode = 'def div(a, b): return a / b\nprint(div(10, 0))';
  const pyErrRes = await executeCodeViaJudge0(pyErrCode, '', 5000, 'python');
  assert(pyErrRes.success === false, 'Runtime error flagged as success: false');
  assert(pyErrRes.status === 'ERROR', `Status categorized as ERROR (got ${pyErrRes.status})`);
  assert(pyErrRes.stderr.includes('ZeroDivisionError'), `stderr contains ZeroDivisionError (got: ${pyErrRes.stderr.slice(0, 80)}...)`);

  // Test 4: JavaScript Execution (Node.js)
  console.log('\nTest 4: JavaScript (Node.js) Execution...');
  const jsCode = 'const nums = [1, 2, 3, 4, 5];\nconsole.log("Sum:", nums.reduce((a, b) => a + b, 0));';
  const jsRes = await executeCodeViaJudge0(jsCode, '', 5000, 'javascript');
  assert(jsRes.success === true, 'JavaScript executed successfully');
  assert(jsRes.stdout.trim() === 'Sum: 15', `JS stdout matches "Sum: 15" (got "${jsRes.stdout.trim()}")`);

  // Test 5: C++ Successful Execution
  console.log('\nTest 5: C++ (G++) Execution...');
  const cppCode = `#include <iostream>
int main() {
    std::cout << "C++ Output: " << (5 * 9) << std::endl;
    return 0;
}`;
  const cppRes = await executeCodeViaJudge0(cppCode, '', 5000, 'cpp');
  assert(cppRes.success === true, 'C++ compiled and executed successfully');
  assert(cppRes.stdout.trim() === 'C++ Output: 45', `C++ stdout matches "C++ Output: 45" (got "${cppRes.stdout.trim()}")`);

  // Test 6: C++ Compilation Error Detection
  console.log('\nTest 6: C++ Compilation Error Detection...');
  const cppBadCode = `#include <iostream>
int main() {
    this_is_an_undeclared_syntax_error;
    return 0;
}`;
  const cppBadRes = await executeCodeViaJudge0(cppBadCode, '', 5000, 'cpp');
  assert(cppBadRes.success === false, 'Compilation error flagged as success: false');
  assert(cppBadRes.isCompilationError === true, 'isCompilationError flag is true');
  assert(cppBadRes.status === 'COMPILATION_ERROR', `Status is COMPILATION_ERROR (got ${cppBadRes.status})`);
  assert(cppBadRes.stderr.includes('error:'), 'stderr contains compiler diagnostics');

  // Test 7: Java Successful Execution
  console.log('\nTest 7: Java (JDK) Execution...');
  const javaCode = `public class Main {
    public static void main(String[] args) {
        System.out.println("Java Value: " + (100 - 25));
    }
}`;
  const javaRes = await executeCodeViaJudge0(javaCode, '', 7000, 'java');
  assert(javaRes.success === true, 'Java compiled and executed successfully');
  assert(javaRes.stdout.trim() === 'Java Value: 75', `Java stdout matches "Java Value: 75" (got "${javaRes.stdout.trim()}")`);

  // Test 8: Stdin Processing Across Sandboxes
  console.log('\nTest 8: Standard Input (stdin) Processing...');
  const stdinCode = `import sys
name = sys.stdin.read().strip()
print(f"Hello, {name}!")`;
  const stdinRes = await executeCodeViaJudge0(stdinCode, 'CodeFix Tester', 5000, 'python');
  assert(stdinRes.success === true, 'Stdin test succeeded');
  assert(stdinRes.stdout.trim() === 'Hello, CodeFix Tester!', `Output matches stdin response (got "${stdinRes.stdout.trim()}")`);

  // Test 9: Execution Timeout / Infinite Loop Handling
  console.log('\nTest 9: Infinite Loop / Execution Timeout Handling...');
  const loopCode = 'while True:\n    pass';
  const loopRes = await executeCodeViaJudge0(loopCode, '', 1500, 'python');
  assert(loopRes.success === false, 'Timed-out execution flagged as success: false');
  assert(loopRes.isTimeout === true, 'isTimeout flag is true');
  assert(loopRes.status === 'TIMEOUT', `Status is TIMEOUT (got ${loopRes.status})`);

  console.log('\n========================================================');
  console.log(`Phase 1 Test Results: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
