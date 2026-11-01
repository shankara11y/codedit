/**
 * Test suite for CodeFix AI isolated C++ (G++) execution.
 * Tests fixed C++ examples without any Gemini API calls.
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
  console.log('🧪 CODEFIX AI - C++ (G++) SANDBOX TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  // Test 1: Successful execution
  total++;
  if (await runTest('Test 1: Successful Execution (C++17 Vectors & Streams)', async () => {
    const code = `
#include <iostream>
#include <vector>
#include <numeric>

int main() {
    std::vector<int> nums = {1, 2, 3, 4, 5};
    int sum = std::accumulate(nums.begin(), nums.end(), 0);
    std::cout << "Sum: " << sum << std::endl;
    std::cout << "SUCCESS_CPP_OUTPUT" << std::endl;
    return 0;
}
`;
    const res = await executeCode(code, '', 5000, 'cpp');
    const hasSuccess = res.success && res.stdout.includes('Sum: 15') && res.stdout.includes('SUCCESS_CPP_OUTPUT');
    return {
      pass: hasSuccess,
      reason: `Expected success output, got: ${JSON.stringify(res)}`,
      details: `ExitCode: ${res.exitCode}, Stdout: ${res.stdout.trim().replace(/\n/g, ' ')}`
    };
  })) passed++;

  // Test 2: Compilation / Syntax Error
  total++;
  if (await runTest('Test 2: Compiler Syntax Error Handling', async () => {
    const code = `
#include <iostream>

int main() {
    std::cout << "Missing semicolon"
    return 0;
}
`;
    const res = await executeCode(code, '', 5000, 'cpp');
    const isExpected = !res.success && res.exitCode !== 0 && (res.stderr.includes('error:') || res.error?.includes('error:'));
    return {
      pass: isExpected,
      reason: `Expected compiler error, got: ${JSON.stringify(res)}`,
      details: `Status: ${res.status}, ExitCode: ${res.exitCode}, Stderr: ${res.stderr.trim().split('\n')[0]}`
    };
  })) passed++;

  // Test 3: Runtime Error (Exception/Abort)
  total++;
  if (await runTest('Test 3: Runtime Error (std::out_of_range exception)', async () => {
    const code = `
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v = {10, 20};
    std::cout << "Before exception" << std::endl;
    std::cout << v.at(99) << std::endl; // throws std::out_of_range
    return 0;
}
`;
    const res = await executeCode(code, '', 5000, 'cpp');
    const isExpected = !res.success && res.exitCode !== 0 && (res.stderr.includes('out_of_range') || res.stderr.includes('terminate called') || res.error?.includes('out_of_range'));
    return {
      pass: isExpected,
      reason: `Expected std::out_of_range exception, got: ${JSON.stringify(res)}`,
      details: `Status: ${res.status}, ExitCode: ${res.exitCode}, Stderr: ${res.stderr.trim().split('\n')[0]}`
    };
  })) passed++;

  // Test 4: Infinite Loop & Timeout Enforcement
  total++;
  if (await runTest('Test 4: Infinite Loop & Hard Timeout (2000ms)', async () => {
    const code = `
#include <iostream>

int main() {
    std::cout << "Entering infinite loop..." << std::endl;
    while (true) {}
    return 0;
}
`;
    const res = await executeCode(code, '', 2000, 'cpp');
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
#include <iostream>
#include <string>

int main() {
    std::string name;
    if (std::cin >> name) {
        std::cout << "Greetings, " << name << "!" << std::endl;
    }
    return 0;
}
`;
    const res = await executeCode(code, 'Bjarne', 5000, 'cpp');
    const isExpected = res.success && res.stdout.includes('Greetings, Bjarne!');
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
#include <iostream>
#include <fstream>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>

int main() {
    // Test 1: Try writing to /sandbox
    std::ofstream file("/sandbox/hack.txt");
    if (!file.is_open()) {
        std::cout << "SANDBOX_FS_PROTECTED" << std::endl;
    } else {
        std::cout << "FS_WRITE_ALLOWED" << std::endl;
        file.close();
    }

    // Test 2: Try network socket connect
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    struct sockaddr_in addr;
    addr.sin_family = AF_INET;
    addr.sin_port = htons(80);
    inet_pton(AF_INET, "1.1.1.1", &addr.sin_addr);
    int res = connect(sock, (struct sockaddr*)&addr, sizeof(addr));
    if (res < 0) {
        std::cout << "SANDBOX_NET_PROTECTED" << std::endl;
    }
    close(sock);

    return 0;
}
`;
    const res = await executeCode(code, '', 5000, 'cpp');
    const isExpected = res.success && res.stdout.includes('SANDBOX_FS_PROTECTED') && res.stdout.includes('SANDBOX_NET_PROTECTED');
    return {
      pass: isExpected,
      reason: `Expected sandbox protections, got: ${JSON.stringify(res)}`,
      details: `Stdout: ${res.stdout.trim().replace(/\n/g, ' ')}`
    };
  })) passed++;

  console.log(`\n🏁 Test Summary: ${passed}/${total} Passed.`);
  if (passed === total) {
    console.log('🎉 All C++ (G++) sandbox tests succeeded!\n');
    process.exit(0);
  } else {
    console.error('❌ Some C++ tests failed.\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
