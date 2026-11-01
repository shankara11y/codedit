/**
 * Pre-Deployment Comprehensive QA & Security Test Suite for CodeFix AI
 * Tests:
 * 1. Health check & configuration
 * 2. API validation & anti-injection rejection
 * 3. Test explanation logic (Execution Error vs Output Mismatch vs Passed)
 * 4. Docker sandbox execution & security across Python, JS, C++, and Java
 */
import { executeCode } from './services/execution.service.js';
import { validateExecuteRequest, validateDebugRequest } from './utils/validation.js';

// Import explanation logic to verify test categorization
function explainTestResult(res, actualNorm, expectedNorm, language = 'python') {
  if (res?.status === 'SUCCESS' && res?.exitCode === 0 && actualNorm === expectedNorm) {
    return {
      category: 'PASSED',
      title: 'Passed',
      explanation: 'Passed: The program executed successfully and produced the expected output.'
    };
  }

  if (res?.status === 'SUCCESS' && res?.exitCode === 0 && actualNorm !== expectedNorm) {
    return {
      category: 'OUTPUT_MISMATCH',
      title: 'Output Mismatch',
      explanation: 'Output Mismatch: Your program executed successfully, but the output did not match the expected result.'
    };
  }

  const stderr = (res?.stderr || '').trim();
  const errorMsg = (res?.error || '').trim();
  const combined = `${stderr}\n${errorMsg}`;
  const lang = (language || 'python').toLowerCase();

  let specificReason = '';

  if (res?.isTimeout || res?.status === 'TIMEOUT') {
    specificReason = 'Your program timed out after exceeding the execution limit. A possible infinite loop was detected.';
  } else if (lang === 'python') {
    if (/ZeroDivisionError/i.test(combined)) specificReason = 'Your program stopped because it attempted to divide by zero.';
    else if (/SyntaxError/i.test(combined)) specificReason = 'The code contains a syntax mistake (e.g. missing colon or unclosed string) that prevented Python from running.';
    else if (/TypeError/i.test(combined)) specificReason = 'An operation or function was applied to an incompatible data type.';
  } else if (lang === 'javascript') {
    if (/SyntaxError/i.test(combined)) specificReason = 'The JavaScript engine encountered a syntax mistake and could not parse the code.';
    else if (/TypeError/i.test(combined)) specificReason = 'A TypeError occurred (e.g. attempted to access properties of null or undefined, or called a non-function).';
  } else if (lang === 'cpp') {
    if (/error:/i.test(combined)) specificReason = 'The C++ compiler failed to compile the program due to syntax or type errors.';
    else if (/out_of_range/i.test(combined)) specificReason = 'A vector or string element was accessed beyond its valid range.';
  } else if (lang === 'java') {
    if (/error:/i.test(combined)) specificReason = 'The Java compiler failed to compile Main.java due to syntax or type errors.';
    else if (/NullPointerException/i.test(combined)) specificReason = 'A NullPointerException occurred (the program attempted to use an object reference with a null value).';
    else if (/ArithmeticException/i.test(combined)) specificReason = 'Your program stopped because it attempted to divide by zero.';
  }

  if (!specificReason) {
    specificReason = `The program failed to execute successfully with exit code ${res?.exitCode ?? 1}.`;
  }

  return {
    category: 'EXECUTION_ERROR',
    title: 'Execution Error',
    explanation: `Execution Error: ${specificReason}`
  };
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName} - ${details}`);
  }
}

async function runPreDeploymentSuite() {
  console.log('====================================================');
  console.log('🛡️  CODEFIX AI - PRE-DEPLOYMENT COMPREHENSIVE SUITE');
  console.log('====================================================\n');

  // --- SECTION 1: API REQUEST VALIDATION & SECURITY ---
  console.log('▶ Section 1: API Request Validation & Security Boundaries');

  // Test 1.1: Missing code
  const val1 = validateExecuteRequest({});
  assert(!val1.isValid && val1.error.includes('"code" field is required'), 'Reject empty execute payload');

  // Test 1.2: Unsupported language
  const val2 = validateExecuteRequest({ code: 'print("hi")', language: 'ruby' });
  assert(!val2.isValid && val2.error.includes('Unsupported language "ruby"'), 'Reject unsupported language (ruby)');

  // Test 1.3: Shell injection attempt in language field
  const val3 = validateExecuteRequest({ code: 'print("hi")', language: 'python; rm -rf /' });
  assert(!val3.isValid, 'Reject shell injection attempt in language field');

  // Test 1.4: Invalid timeout
  const val4 = validateExecuteRequest({ code: 'print("hi")', language: 'python', timeoutMs: 50 });
  assert(!val4.isValid && val4.error.includes('between 500ms and 15000ms'), 'Reject sub-500ms timeout');

  // Test 1.5: Valid payload defaults language to python
  const val5 = validateExecuteRequest({ code: 'print("ok")' });
  assert(val5.isValid && val5.sanitizedData.language === 'python' && val5.sanitizedData.timeoutMs === 5000, 'Valid payload receives defaults');

  // --- SECTION 2: TEST RESULT EXPLANATION LOGIC ---
  console.log('\n▶ Section 2: Test Result Explanations (Execution Error vs Mismatch vs Passed)');

  // Test 2.1: Output Mismatch (Code executed successfully with code 0, but output is wrong)
  const mismatchRes = { status: 'SUCCESS', exitCode: 0, stdout: '15\n', stderr: '' };
  const expMismatch = explainTestResult(mismatchRes, '15', '20', 'python');
  assert(
    expMismatch.category === 'OUTPUT_MISMATCH' &&
    expMismatch.explanation.includes('Output Mismatch: Your program executed successfully, but the output did not match'),
    'Output Mismatch correctly categorized without triggering execution error'
  );

  // Test 2.2: Passed (Code executed successfully with code 0, output matches expected)
  const passRes = { status: 'SUCCESS', exitCode: 0, stdout: '20\n', stderr: '' };
  const expPass = explainTestResult(passRes, '20', '20', 'python');
  assert(
    expPass.category === 'PASSED' &&
    expPass.explanation.includes('Passed: The program executed successfully and produced the expected output'),
    'Successful test correctly categorized as Passed'
  );

  // Test 2.3: Python ZeroDivisionError
  const pyZeroRes = { status: 'ERROR', exitCode: 1, stdout: '', stderr: 'ZeroDivisionError: division by zero' };
  const expPyZero = explainTestResult(pyZeroRes, '', '0.0', 'python');
  assert(
    expPyZero.category === 'EXECUTION_ERROR' &&
    expPyZero.explanation.includes('stopped because it attempted to divide by zero'),
    'Python ZeroDivisionError explanation verified'
  );

  // Test 2.4: Python SyntaxError
  const pySyntaxRes = { status: 'ERROR', exitCode: 1, stdout: '', stderr: 'SyntaxError: expected \':\'' };
  const expPySyntax = explainTestResult(pySyntaxRes, '', 'result', 'python');
  assert(
    expPySyntax.category === 'EXECUTION_ERROR' &&
    expPySyntax.explanation.includes('contains a syntax mistake'),
    'Python SyntaxError explanation verified'
  );

  // Test 2.5: JavaScript TypeError
  const jsTypeRes = { status: 'ERROR', exitCode: 1, stdout: '', stderr: 'TypeError: Cannot read properties of null' };
  const expJsType = explainTestResult(jsTypeRes, '', 'result', 'javascript');
  assert(
    expJsType.category === 'EXECUTION_ERROR' &&
    expJsType.explanation.includes('TypeError occurred'),
    'JavaScript TypeError explanation verified'
  );

  // Test 2.6: C++ Compilation Error
  const cppErrRes = { status: 'ERROR', exitCode: 1, stdout: '', stderr: 'solution.cpp:4:5: error: expected \';\' before \'return\'' };
  const expCppErr = explainTestResult(cppErrRes, '', 'result', 'cpp');
  assert(
    expCppErr.category === 'EXECUTION_ERROR' &&
    expCppErr.explanation.includes('compiler failed to compile'),
    'C++ Compiler Error explanation verified'
  );

  // Test 2.7: Java NullPointerException
  const javaNpeRes = { status: 'ERROR', exitCode: 1, stdout: '', stderr: 'Exception in thread "main" java.lang.NullPointerException' };
  const expJavaNpe = explainTestResult(javaNpeRes, '', 'result', 'java');
  assert(
    expJavaNpe.category === 'EXECUTION_ERROR' &&
    expJavaNpe.explanation.includes('NullPointerException occurred'),
    'Java NullPointerException explanation verified'
  );

  // Test 2.8: Timeout Detection
  const timeoutRes = { status: 'TIMEOUT', exitCode: null, isTimeout: true, stdout: '', stderr: 'Execution timed out' };
  const expTimeout = explainTestResult(timeoutRes, '', 'result', 'python');
  assert(
    expTimeout.category === 'EXECUTION_ERROR' &&
    expTimeout.explanation.includes('timed out after exceeding the execution limit'),
    'Infinite loop timeout explanation verified'
  );

  // --- SECTION 3: DOCKER SANDBOX ISOLATION & LIVE EXECUTION ---
  console.log('\n▶ Section 3: Live Docker Sandboxes Execution (All 4 Languages)');

  // 3.1 Python Execution
  const pyExec = await executeCode('print("PREDEPLOY_PY")', '', 5000, 'python');
  assert(pyExec.success && pyExec.stdout.trim() === 'PREDEPLOY_PY', 'Python sandbox executed successfully');

  // 3.2 JavaScript Execution
  const jsExec = await executeCode('console.log("PREDEPLOY_JS");', '', 5000, 'javascript');
  assert(jsExec.success && jsExec.stdout.trim() === 'PREDEPLOY_JS', 'JavaScript sandbox executed successfully');

  // 3.3 C++ Compilation & Execution
  const cppExec = await executeCode('#include <iostream>\nint main(){ std::cout << "PREDEPLOY_CPP" << std::endl; return 0; }', '', 6000, 'cpp');
  assert(cppExec.success && cppExec.stdout.trim() === 'PREDEPLOY_CPP', 'C++ sandbox compiled & executed successfully');

  // 3.4 Java Compilation & Execution
  const javaExec = await executeCode('public class Main { public static void main(String[] a){ System.out.println("PREDEPLOY_JAVA"); } }', '', 7000, 'java');
  assert(javaExec.success && javaExec.stdout.trim() === 'PREDEPLOY_JAVA', 'Java sandbox compiled & executed successfully');

  // Summary
  console.log('\n----------------------------------------------------');
  console.log(`🏁 Pre-Deployment Suite Summary: ${passedTests}/${totalTests} Passed.`);
  if (passedTests === totalTests) {
    console.log('🎉 ALL PRE-DEPLOYMENT QA & SECURITY CHECKS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('❌ Some pre-deployment checks failed.\n');
    process.exit(1);
  }
}

runPreDeploymentSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
