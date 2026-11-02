/**
 * Programmatic explanation helper for CodeFix AI test case execution.
 * Distinguishes between:
 * - PASSED: program exited cleanly with code 0 and actual stdout matches expected
 * - OUTPUT_MISMATCH: program exited cleanly with code 0, but output differs from expected
 * - EXECUTION_ERROR: compiler failure, runtime crash, exception, or timeout
 * 
 * Works across Python, JavaScript, C++, and Java without any Gemini API calls.
 */

export function explainTestResult(res, actualNorm, expectedNorm, language = 'python') {
  // 1. Successful test: exit code 0, status SUCCESS, and output matches expected exactly
  if (res?.status === 'SUCCESS' && res?.exitCode === 0 && actualNorm === expectedNorm) {
    return {
      category: 'PASSED',
      title: 'Passed',
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      boxClass: 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300',
      explanation: 'Passed: The program executed successfully and produced the expected output.'
    };
  }

  // 2. Output Mismatch: program executed to completion (exit code 0), but output differed
  if (res?.status === 'SUCCESS' && res?.exitCode === 0 && actualNorm !== expectedNorm) {
    return {
      category: 'OUTPUT_MISMATCH',
      title: 'Output Mismatch',
      badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      boxClass: 'bg-amber-950/20 border-amber-500/30 text-amber-300',
      explanation: 'Output Mismatch: Your program executed successfully, but the output did not match the expected result.'
    };
  }

  // 3. Execution Error: timeout, compiler error, syntax error, or runtime crash
  const stderr = (res?.stderr || '').trim();
  const errorMsg = (res?.error || '').trim();
  const combined = `${stderr}\n${errorMsg}`;
  const lang = (language || 'python').toLowerCase();

  let specificReason = '';

  // Case 3a: Execution Timeout
  if (res?.isTimeout || res?.status === 'TIMEOUT') {
    specificReason = 'Your program timed out after exceeding the execution limit. A possible infinite loop was detected.';
  }
  // Case 3b: Python Errors
  else if (lang === 'python') {
    if (/ZeroDivisionError/i.test(combined)) {
      specificReason = 'Your program stopped because it attempted to divide by zero.';
    } else if (/IndentationError/i.test(combined)) {
      specificReason = 'The code contains an indentation mistake that prevented Python from running.';
    } else if (/SyntaxError/i.test(combined)) {
      specificReason = 'The code contains a syntax mistake (e.g. missing colon or unclosed string) that prevented Python from running.';
    } else if (/NameError/i.test(combined)) {
      specificReason = 'Your program referenced a variable or function that has not been defined.';
    } else if (/TypeError/i.test(combined)) {
      specificReason = 'An operation or function was applied to an incompatible data type.';
    } else if (/IndexError/i.test(combined)) {
      specificReason = 'Your program tried to access a list or sequence index that is out of range.';
    } else if (/KeyError/i.test(combined)) {
      specificReason = 'Your program tried to access a dictionary key that does not exist.';
    } else if (/AttributeError/i.test(combined)) {
      specificReason = 'Your program attempted to access an attribute or method that does not exist on this object.';
    } else if (/ValueError/i.test(combined)) {
      specificReason = 'A function received an argument with the right type but an inappropriate value.';
    } else if (/RecursionError/i.test(combined)) {
      specificReason = 'Maximum recursion depth exceeded (likely infinite recursion).';
    }
  }
  // Case 3c: JavaScript Errors
  else if (lang === 'javascript') {
    if (/SyntaxError/i.test(combined)) {
      specificReason = 'The JavaScript engine encountered a syntax mistake and could not parse the code.';
    } else if (/TypeError/i.test(combined)) {
      specificReason = 'A TypeError occurred (e.g. attempted to access properties of null or undefined, or called a non-function).';
    } else if (/ReferenceError/i.test(combined)) {
      specificReason = 'Your code referenced a variable or function that does not exist in scope.';
    } else if (/RangeError/i.test(combined)) {
      specificReason = 'A value or recursion depth was outside the allowable range.';
    }
  }
  // Case 3d: C++ Errors
  else if (lang === 'cpp') {
    if (/error:/i.test(combined)) {
      specificReason = 'The C++ compiler failed to compile the program due to syntax or type errors.';
    } else if (/out_of_range/i.test(combined)) {
      specificReason = 'A vector or string element was accessed beyond its valid range.';
    } else if (/segmentation fault/i.test(combined) || res?.exitCode === 139) {
      specificReason = 'Segmentation fault (the program attempted to access invalid or unallocated memory).';
    } else if (/Floating point exception/i.test(combined) || res?.exitCode === 136) {
      specificReason = 'Arithmetic exception (e.g. integer division by zero).';
    } else if (/terminate called/i.test(combined)) {
      specificReason = 'The C++ runtime terminated the program due to an uncaught exception.';
    }
  }
  // Case 3e: Java Errors
  else if (lang === 'java') {
    if (/error:/i.test(combined)) {
      specificReason = 'The Java compiler failed to compile Main.java due to syntax or type errors.';
    } else if (/NullPointerException/i.test(combined)) {
      specificReason = 'A NullPointerException occurred (the program attempted to use an object reference with a null value).';
    } else if (/ArithmeticException/i.test(combined) || /\/ by zero/i.test(combined)) {
      specificReason = 'Your program stopped because it attempted to divide by zero.';
    } else if (/IndexOutOfBoundsException/i.test(combined)) {
      specificReason = 'An array or list element was accessed using an index out of bounds.';
    } else if (/NoSuchElementException/i.test(combined)) {
      specificReason = 'Your program attempted to read input via Scanner, but no input was provided.';
    } else if (/StackOverflowError/i.test(combined)) {
      specificReason = 'The program ran out of call stack memory (likely infinite recursion).';
    }
  }

  // 3a. Compilation Error
  if (res?.isCompilationError || res?.status === 'COMPILATION_ERROR' || /syntax\s*error|error:/i.test(combined)) {
    let reason = 'The program failed to compile due to syntax, typing, or structure errors.';
    if (lang === 'cpp') reason = 'The C++ compiler failed to compile the program due to syntax or type errors.';
    if (lang === 'java') reason = 'The Java compiler failed to compile Main.java due to syntax or type errors.';
    if (lang === 'python' && /SyntaxError/i.test(combined)) reason = 'Python detected a syntax error that prevented the script from compiling.';
    if (lang === 'javascript' && /SyntaxError/i.test(combined)) reason = 'Node.js detected a syntax error that prevented the script from compiling.';

    return {
      category: 'COMPILATION_ERROR',
      title: 'Compilation Error',
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      boxClass: 'bg-purple-950/25 border-purple-500/30 text-purple-200',
      explanation: `Compilation Error: ${reason}`
    };
  }

  // 3b. Execution Timeout
  if (res?.isTimeout || res?.status === 'TIMEOUT') {
    return {
      category: 'TIMEOUT',
      title: 'Time Limit Exceeded',
      badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
      boxClass: 'bg-orange-950/25 border-orange-500/30 text-orange-300',
      explanation: 'Time Limit Exceeded: Your program timed out after exceeding the execution limit. A possible infinite loop was detected.'
    };
  }

  // 3c. Runtime Error
  if (!specificReason) {
    if (res?.exitCode !== null && res?.exitCode !== undefined) {
      specificReason = `The program crashed during execution with exit code ${res.exitCode}.`;
    } else {
      specificReason = 'The program encountered an unhandled exception during execution.';
    }
  }

  return {
    category: 'RUNTIME_ERROR',
    title: 'Runtime Error',
    badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
    boxClass: 'bg-rose-950/20 border-rose-500/30 text-rose-300',
    explanation: `Runtime Error: ${specificReason}`
  };
}
