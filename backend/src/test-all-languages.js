/**
 * Comprehensive Multi-Language Verification Suite for CodeFix AI
 * Runs isolated sandbox tests for Python, JavaScript, C++, and Java.
 * Does not make any Gemini API requests.
 */
import { executeCode } from './services/execution.service.js';

const TEST_CASES = [
  {
    language: 'python',
    name: 'Python 3.11',
    code: `
def greet(name):
    return f"Hello, {name}!"

import sys
line = sys.stdin.read().strip()
print(greet(line or "World"))
`,
    stdin: 'Guido',
    expectedStdout: 'Hello, Guido!'
  },
  {
    language: 'javascript',
    name: 'JavaScript (Node.js)',
    code: `
const fs = require('fs');
const name = fs.readFileSync(0, 'utf-8').trim() || 'World';
console.log(\`Hello, \${name}!\`);
`,
    stdin: 'Brendan',
    expectedStdout: 'Hello, Brendan!'
  },
  {
    language: 'cpp',
    name: 'C++ (G++)',
    code: `
#include <iostream>
#include <string>

int main() {
    std::string name;
    if (std::cin >> name) {
        std::cout << "Hello, " << name << "!" << std::endl;
    } else {
        std::cout << "Hello, World!" << std::endl;
    }
    return 0;
}
`,
    stdin: 'Bjarne',
    expectedStdout: 'Hello, Bjarne!'
  },
  {
    language: 'java',
    name: 'Java (JDK 17)',
    code: `
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String name = sc.hasNextLine() ? sc.nextLine().trim() : "World";
        System.out.println("Hello, " + name + "!");
    }
}
`,
    stdin: 'James',
    expectedStdout: 'Hello, James!'
  }
];

async function runMultiLanguageTests() {
  console.log('====================================================');
  console.log('🚀 CODEFIX AI - ALL SUPPORTED LANGUAGES VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  for (const tc of TEST_CASES) {
    process.stdout.write(`▶ Testing [${tc.name}] isolated execution... `);
    const start = Date.now();
    try {
      const result = await executeCode(tc.code, tc.stdin, 6000, tc.language);
      const duration = Date.now() - start;

      const matched = result.success && result.stdout.trim() === tc.expectedStdout;
      if (matched) {
        console.log(`✅ PASSED (${duration}ms)`);
        console.log(`   Output: "${result.stdout.trim()}" | ExitCode: ${result.exitCode}`);
        passed++;
      } else {
        console.log(`❌ FAILED (${duration}ms)`);
        console.log(`   Expected: "${tc.expectedStdout}"`);
        console.log(`   Actual:   "${result.stdout}"`);
        console.log(`   Stderr:   "${result.stderr}"`);
      }
    } catch (err) {
      console.log(`❌ ERROR: ${err.message}`);
    }
    console.log('----------------------------------------------------');
  }

  console.log(`\n🏁 Result: ${passed}/${TEST_CASES.length} Languages fully operational!`);
  if (passed === TEST_CASES.length) {
    console.log('🎉 Multi-language backend sandbox verification 100% SUCCESSFUL.\n');
  } else {
    process.exit(1);
  }
}

runMultiLanguageTests().catch(err => {
  console.error(err);
  process.exit(1);
});
