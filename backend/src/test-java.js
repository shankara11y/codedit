/**
 * Test suite for CodeFix AI isolated Java (JDK 17) execution.
 * Tests fixed Java examples without any Gemini API calls.
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
  console.log('🧪 CODEFIX AI - JAVA (JDK 17) SANDBOX TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  // Test 1: Successful execution
  total++;
  if (await runTest('Test 1: Successful Execution (Streams & Math)', async () => {
    const code = `
import java.util.List;

public class Main {
    public static void main(String[] args) {
        List<Integer> numbers = List.of(1, 2, 3, 4, 5);
        int sum = numbers.stream().mapToInt(Integer::intValue).sum();
        System.out.println("Sum: " + sum);
        System.out.println("SUCCESS_JAVA_OUTPUT");
    }
}
`;
    const res = await executeCode(code, '', 7000, 'java');
    const hasSuccess = res.success && res.stdout.includes('Sum: 15') && res.stdout.includes('SUCCESS_JAVA_OUTPUT');
    return {
      pass: hasSuccess,
      reason: `Expected success output, got: ${JSON.stringify(res)}`,
      details: `ExitCode: ${res.exitCode}, Stdout: ${res.stdout.trim().replace(/\n/g, ' ')}`
    };
  })) passed++;

  // Test 2: Compiler Syntax Error
  total++;
  if (await runTest('Test 2: Compiler Syntax Error Handling', async () => {
    const code = `
public class Main {
    public static void main(String[] args) {
        System.out.println("Missing semicolon")
    }
}
`;
    const res = await executeCode(code, '', 7000, 'java');
    const isExpected = !res.success && res.exitCode !== 0 && (res.stderr.includes('error:') || res.error?.includes('error:'));
    return {
      pass: isExpected,
      reason: `Expected compiler error, got: ${JSON.stringify(res)}`,
      details: `Status: ${res.status}, ExitCode: ${res.exitCode}, Stderr: ${res.stderr.trim().split('\n')[0]}`
    };
  })) passed++;

  // Test 3: Runtime Error (NullPointerException)
  total++;
  if (await runTest('Test 3: Runtime Error (NullPointerException)', async () => {
    const code = `
public class Main {
    public static void main(String[] args) {
        String str = null;
        System.out.println("Before crash");
        System.out.println(str.length());
    }
}
`;
    const res = await executeCode(code, '', 7000, 'java');
    const isExpected = !res.success && res.exitCode !== 0 && (res.stderr.includes('NullPointerException') || res.error?.includes('NullPointerException'));
    return {
      pass: isExpected,
      reason: `Expected NullPointerException, got: ${JSON.stringify(res)}`,
      details: `Status: ${res.status}, ExitCode: ${res.exitCode}, Stderr: ${res.stderr.trim().split('\n')[0]}`
    };
  })) passed++;

  // Test 4: Infinite Loop & Timeout Enforcement
  total++;
  if (await runTest('Test 4: Infinite Loop & Hard Timeout (2000ms)', async () => {
    const code = `
public class Main {
    public static void main(String[] args) {
        System.out.println("Entering infinite loop...");
        while (true) {}
    }
}
`;
    const res = await executeCode(code, '', 2000, 'java');
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
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (scanner.hasNextLine()) {
            String name = scanner.nextLine();
            System.out.println("Welcome, " + name + "!");
        }
    }
}
`;
    const res = await executeCode(code, 'James Gosling', 7000, 'java');
    const isExpected = res.success && res.stdout.includes('Welcome, James Gosling!');
    return {
      pass: isExpected,
      reason: `Expected welcome greeting with stdin, got: ${JSON.stringify(res)}`,
      details: `Stdout: ${res.stdout.trim()}`
    };
  })) passed++;

  // Test 6: Security Sandbox Protection
  total++;
  if (await runTest('Test 6: Security Sandbox (Read-Only FS & Network None)', async () => {
    const code = `
import java.io.File;
import java.io.FileWriter;
import java.net.Socket;
import java.net.InetSocketAddress;

public class Main {
    public static void main(String[] args) {
        // Test 1: Try writing to /sandbox
        try {
            FileWriter writer = new FileWriter("/sandbox/hack.txt");
            writer.write("evil");
            writer.close();
            System.out.println("FS_WRITE_ALLOWED");
        } catch (Exception e) {
            System.out.println("SANDBOX_FS_PROTECTED: " + e.getClass().getSimpleName());
        }

        // Test 2: Try network socket
        try {
            Socket socket = new Socket();
            socket.connect(new InetSocketAddress("1.1.1.1", 80), 500);
            System.out.println("NET_ALLOWED");
            socket.close();
        } catch (Exception e) {
            System.out.println("SANDBOX_NET_PROTECTED: " + e.getClass().getSimpleName());
        }
    }
}
`;
    const res = await executeCode(code, '', 7000, 'java');
    const isExpected = res.success && res.stdout.includes('SANDBOX_FS_PROTECTED') && res.stdout.includes('SANDBOX_NET_PROTECTED');
    return {
      pass: isExpected,
      reason: `Expected sandbox protections, got: ${JSON.stringify(res)}`,
      details: `Stdout: ${res.stdout.trim().replace(/\n/g, ' ')}`
    };
  })) passed++;

  console.log(`\n🏁 Test Summary: ${passed}/${total} Passed.`);
  if (passed === total) {
    console.log('🎉 All Java (JDK 17) sandbox tests succeeded!\n');
    process.exit(0);
  } else {
    console.error('❌ Some Java tests failed.\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
