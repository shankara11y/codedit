import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../utils/validation.js';

const execFileAsync = promisify(execFile);

export const LANGUAGE_CONFIG = {
  python: {
    id: 'python',
    name: 'Python 3.11',
    image: 'codefix-python-sandbox',
    sourceFile: 'solution.py',
    command: ['python3', '-u', '/sandbox/solution.py'],
    memory: '128m',
    memorySwap: '128m',
    cpus: '0.5',
    pidsLimit: 30,
    user: '1000:1000',
    useTmpfs: false
  },
  javascript: {
    id: 'javascript',
    name: 'JavaScript (Node.js)',
    image: 'codefix-javascript-sandbox',
    sourceFile: 'solution.js',
    command: ['node', '/sandbox/solution.js'],
    memory: '128m',
    memorySwap: '128m',
    cpus: '0.5',
    pidsLimit: 30,
    user: '1000:1000',
    useTmpfs: false
  },
  cpp: {
    id: 'cpp',
    name: 'C++ (G++)',
    image: 'codefix-cpp-sandbox',
    sourceFile: 'solution.cpp',
    command: ['/entrypoint.sh'],
    memory: '128m',
    memorySwap: '128m',
    cpus: '0.5',
    pidsLimit: 30,
    user: '1000:1000',
    useTmpfs: true
  },
  java: {
    id: 'java',
    name: 'Java (JDK 17)',
    image: 'codefix-java-sandbox',
    sourceFile: 'Main.java',
    command: ['/entrypoint.sh'],
    memory: '256m',
    memorySwap: '256m',
    cpus: '0.5',
    pidsLimit: 30,
    user: '1000:1000',
    useTmpfs: true
  }
};

const DEFAULT_TIMEOUT_MS = 5000;
const MAX_TIMEOUT_MS = 15000;
const MAX_OUTPUT_CHARS = 50000;

/**
 * Checks whether Docker CLI is installed and the Docker daemon is active.
 * @returns {Promise<boolean>}
 */
export async function isDockerAvailable() {
  try {
    await execFileAsync('docker', ['info', '--format', '{{.ServerVersion}}'], { timeout: 3000 });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Executes source code inside a restricted, isolated Docker container for a given language.
 * 
 * Strict Security controls:
 * - Language allowlist enforced against LANGUAGE_CONFIG
 * - Read-only mounted temporary directory containing only the user's source code (/sandbox:ro)
 * - Zero network access (--network none)
 * - Strict memory limits (128m for Python/JS/C++, 256m for Java)
 * - Strict CPU limit (--cpus=0.5)
 * - Process limit (--pids-limit=30)
 * - Non-root unprivileged execution (--user 1000:1000)
 * - In-memory execution tmpfs for compilation (/tmp)
 * - Automatic container cleanup (--rm)
 * - Enforced execution timeout with forced SIGKILL and docker kill
 * - Output truncation to prevent memory exhaustion
 * 
 * @param {string} code - Source code to execute.
 * @param {string} [stdin=''] - Standard input to feed into the program.
 * @param {number} [timeoutMs=5000] - Maximum execution time in milliseconds.
 * @param {string} [language='python'] - Programming language key.
 * @returns {Promise<Object>} Execution result (stdout, stderr, exitCode, executionTimeMs, status, isTimeout).
 */
export async function executeCode(code, stdin = '', timeoutMs = DEFAULT_TIMEOUT_MS, language = DEFAULT_LANGUAGE) {
  // Validate language against strict allowlist
  const selectedLang = typeof language === 'string' ? language.toLowerCase().trim() : DEFAULT_LANGUAGE;
  const config = LANGUAGE_CONFIG[selectedLang];

  if (!config) {
    const error = new Error(`Unsupported execution language "${language}". Supported languages: ${SUPPORTED_LANGUAGES.join(', ')}`);
    error.statusCode = 400;
    error.code = 'UNSUPPORTED_LANGUAGE';
    throw error;
  }

  // Validate timeout
  const timeout = Math.min(Math.max(Number(timeoutMs) || DEFAULT_TIMEOUT_MS, 1000), MAX_TIMEOUT_MS);

  // Check Docker daemon availability
  const dockerReady = await isDockerAvailable();
  if (!dockerReady) {
    const error = new Error('Docker is not running. CodeFix AI requires Docker for isolated code execution. Please start Docker Desktop on your machine.');
    error.statusCode = 503;
    error.code = 'DOCKER_UNAVAILABLE';
    throw error;
  }

  // Create an ephemeral temporary directory on host
  const executionId = `codefix-${crypto.randomBytes(8).toString('hex')}`;
  const tempDir = path.join(os.tmpdir(), executionId);
  const scriptPath = path.join(tempDir, config.sourceFile);
  const containerName = `codefix-run-${executionId}`;

  await fs.mkdir(tempDir, { recursive: true });
  await fs.writeFile(scriptPath, code, { encoding: 'utf8', mode: 0o644 });

  const startTime = Date.now();
  let timedOut = false;
  let stdoutData = '';
  let stderrData = '';

  // Arguments passed to Docker without shell interpolation (prevents shell injection)
  const dockerArgs = [
    'run',
    '--name', containerName,
    '--rm',
    '--interactive',
    '--network', 'none',
    '--memory', config.memory,
    '--memory-swap', config.memorySwap,
    '--cpus', config.cpus,
    '--pids-limit', String(config.pidsLimit),
    '--user', config.user,
    '--volume', `${tempDir}:/sandbox:ro` // Mounted read-only!
  ];

  if (config.useTmpfs) {
    dockerArgs.push('--tmpfs', '/tmp:rw,exec,size=64m');
  }

  dockerArgs.push(config.image, ...config.command);

  try {
    return await new Promise((resolve) => {
      const child = spawn('docker', dockerArgs, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Timer to enforce hard execution timeout
      const timer = setTimeout(async () => {
        timedOut = true;
        try {
          // Forcefully kill the container by name
          await execFileAsync('docker', ['kill', containerName]).catch(() => {});
        } catch (_) {}
        try {
          child.kill('SIGKILL');
        } catch (_) {}
      }, timeout);

      // Feed stdin if provided
      if (stdin && typeof stdin === 'string') {
        child.stdin.write(stdin);
      }
      child.stdin.end();

      child.stdout.on('data', (chunk) => {
        if (stdoutData.length < MAX_OUTPUT_CHARS) {
          stdoutData += chunk.toString();
        }
      });

      child.stderr.on('data', (chunk) => {
        if (stderrData.length < MAX_OUTPUT_CHARS) {
          stderrData += chunk.toString();
        }
      });

      child.on('close', (code, signal) => {
        clearTimeout(timer);
        const executionTimeMs = Date.now() - startTime;

        if (timedOut) {
          return resolve({
            success: false,
            status: 'TIMEOUT',
            isTimeout: true,
            exitCode: null,
            executionTimeMs,
            stdout: stdoutData.trimEnd(),
            stderr: `Execution timed out after ${timeout}ms. Possible infinite loop detected.`,
            error: 'Execution Timed Out'
          });
        }

        const isSuccess = code === 0;

        resolve({
          success: isSuccess,
          status: isSuccess ? 'SUCCESS' : 'ERROR',
          isTimeout: false,
          exitCode: code,
          executionTimeMs,
          stdout: stdoutData,
          stderr: stderrData,
          error: isSuccess ? null : (stderrData.trim() || `Process exited with code ${code}`)
        });
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          success: false,
          status: 'ERROR',
          isTimeout: false,
          exitCode: null,
          executionTimeMs: Date.now() - startTime,
          stdout: stdoutData,
          stderr: err.message,
          error: err.message
        });
      });
    });
  } finally {
    // Ephemeral cleanup: Remove the temporary directory on the host machine
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Backward compatibility wrapper for existing Python callers.
 */
export async function executePythonCode(code, stdin = '', timeoutMs = DEFAULT_TIMEOUT_MS) {
  return executeCode(code, stdin, timeoutMs, 'python');
}

