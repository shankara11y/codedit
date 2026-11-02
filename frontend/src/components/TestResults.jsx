import React, { useState } from 'react';
import { Play, Plus, Trash2, CheckCircle2, XCircle, AlertCircle, Terminal, Clock } from 'lucide-react';
import { executeCode } from '../services/api';
import { getLanguageConfig } from '../utils/languages';
import { explainTestResult } from '../utils/testExplanation';

/**
 * Normalizes output string by standardizing line breaks and trimming whitespace.
 */
function normalizeOutput(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/\r\n/g, '\n').trim();
}

export default function TestResults({ 
  code = '', 
  language = 'python',
  testCases = [],
  setTestCases,
  onTestComplete
}) {
  const currentLangConfig = getLanguageConfig(language);

  // Form state for adding new test case
  const [inputVal, setInputVal] = useState('');
  const [expectedVal, setExpectedVal] = useState('');

  // Results state: map of testCase.id -> explanation & execution details
  const [results, setResults] = useState({});
  const [isRunning, setIsRunning] = useState(false);

  // Add new test case
  const handleAddTest = (e) => {
    e.preventDefault();
    if (!expectedVal.trim()) {
      alert('Please enter the expected output.');
      return;
    }

    const newCase = {
      id: `tc-${Date.now()}`,
      input: inputVal,
      expectedOutput: expectedVal
    };

    setTestCases(prev => [...prev, newCase]);
    setInputVal('');
    setExpectedVal('');
  };

  // Remove test case
  const handleRemoveTest = (id) => {
    setTestCases(prev => prev.filter(tc => tc.id !== id));
    setResults(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  // Run all tests against current code in the selected language sandbox
  const handleRunAllTests = async () => {
    if (!code || !code.trim()) {
      alert(`Please enter ${currentLangConfig.shortName} code in the editor first.`);
      return;
    }

    if (testCases.length === 0) {
      alert('No test cases to run. Add a test case first.');
      return;
    }

    setIsRunning(true);
    const newResults = {};

    for (const tc of testCases) {
      try {
        const res = await executeCode(code, tc.input || '', 6000, language);
        const actualNorm = normalizeOutput(res?.stdout);
        const expectedNorm = normalizeOutput(tc.expectedOutput);

        const explanation = explainTestResult(res, actualNorm, expectedNorm, language);

        newResults[tc.id] = {
          pass: explanation.category === 'PASSED',
          category: explanation.category,
          title: explanation.title,
          explanation: explanation.explanation,
          badgeClass: explanation.badgeClass,
          boxClass: explanation.boxClass,
          stdout: res?.stdout || '',
          stderr: res?.stderr || '',
          exitCode: res?.exitCode,
          isTimeout: Boolean(res?.isTimeout),
          executionTimeMs: res?.executionTimeMs || 0
        };
      } catch (err) {
        newResults[tc.id] = {
          pass: false,
          category: 'RUNTIME_ERROR',
          title: 'Runtime Error',
          explanation: `Runtime Error: ${err.message || 'The test could not be executed.'}`,
          badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
          boxClass: 'bg-rose-950/20 border-rose-500/30 text-rose-300',
          stdout: '',
          stderr: err.message || 'Execution error',
          exitCode: null,
          isTimeout: false,
          executionTimeMs: 0
        };
      }
    }

    setResults(newResults);
    setIsRunning(false);

    if (typeof onTestComplete === 'function') {
      const total = testCases.length;
      const passed = testCases.filter(tc => newResults[tc.id]?.pass).length;
      const failed = total - passed;
      onTestComplete({
        results: newResults,
        totalCount: total,
        passedCount: passed,
        failedCount: failed,
        completedAt: new Date().toISOString()
      });
    }
  };

  // Counts
  const totalCount = testCases.length;
  const executedCount = testCases.filter(tc => results[tc.id] !== undefined).length;
  const passedCount = testCases.filter(tc => results[tc.id]?.pass).length;
  const failedCount = executedCount - passedCount;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-5 shadow-xl">
      {/* Top Header and Run All Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2">
          <Terminal className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-white text-sm">
            {currentLangConfig.name} Test Cases (Isolated Sandbox)
          </h3>
        </div>

        <button
          id="btn-run-all-tests"
          onClick={handleRunAllTests}
          disabled={isRunning || testCases.length === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-600/20 transition cursor-pointer"
        >
          <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? `Executing ${currentLangConfig.shortName} via Judge0...` : `Run All ${currentLangConfig.shortName} Tests`}</span>
        </button>
      </div>

      {/* Test Counts Summary */}
      <div className="grid grid-cols-3 gap-3 p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-center text-xs">
        <div>
          <span className="text-slate-400 block text-[11px]">Total Tests</span>
          <span className="text-base font-bold text-white">{totalCount}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Passed</span>
          <span className="text-base font-bold text-emerald-400">{passedCount}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Failed</span>
          <span className="text-base font-bold text-rose-400">{failedCount}</span>
        </div>
      </div>

      {/* Add Test Case Form */}
      <form onSubmit={handleAddTest} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-lg space-y-3">
        <span className="text-xs font-semibold text-slate-300 block">Add Test Case</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Input (stdin):</label>
            <input
              id="input-test-stdin"
              type="text"
              placeholder="e.g. 5 or leave empty"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-xs text-cyan-300 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Expected Output (stdout) *:</label>
            <input
              id="input-test-expected"
              type="text"
              placeholder="e.g. Average is: 0.0"
              value={expectedVal}
              onChange={(e) => setExpectedVal(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-xs text-emerald-300 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            id="btn-add-test-case"
            type="submit"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-md transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Test Case</span>
          </button>
        </div>
      </form>

      {/* Test Cases List */}
      <div className="space-y-3">
        {testCases.map((tc, index) => {
          const res = results[tc.id];

          return (
            <div
              key={tc.id}
              className={`p-3.5 rounded-lg border text-xs transition ${
                res?.category === 'PASSED'
                  ? 'bg-emerald-950/15 border-emerald-500/30'
                  : res?.category === 'OUTPUT_MISMATCH'
                  ? 'bg-amber-950/15 border-amber-500/30'
                  : res?.category === 'COMPILATION_ERROR'
                  ? 'bg-purple-950/15 border-purple-500/30'
                  : res?.category === 'TIMEOUT'
                  ? 'bg-orange-950/15 border-orange-500/30'
                  : res?.category === 'RUNTIME_ERROR'
                  ? 'bg-rose-950/15 border-rose-500/30'
                  : 'bg-[#070b14] border-slate-800'
              }`}
            >
              {/* Header: Test number + Categorized Badge + Remove Button */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/60 flex-wrap gap-2">
                <div className="flex items-center space-x-2 flex-wrap gap-1">
                  <span className="font-bold text-slate-300">Test #{index + 1}</span>
                  
                  {tc.isEdgeCase && (
                    <span className="text-[9px] uppercase font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-800/70 px-1.5 py-0.5 rounded tracking-wide">
                      Edge Case
                    </span>
                  )}
                  {tc.label && (
                    <span className="text-[10px] text-slate-400 font-normal bg-slate-800/60 px-1.5 py-0.5 rounded hidden sm:inline">
                      {tc.label}
                    </span>
                  )}
                  
                  {/* Categorized PASS / OUTPUT MISMATCH / COMPILATION / TIMEOUT / RUNTIME ERROR Badge */}
                  {res ? (
                    <span
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${res.badgeClass}`}
                    >
                      {res.category === 'PASSED' && <CheckCircle2 className="w-3 h-3" />}
                      {res.category === 'OUTPUT_MISMATCH' && <AlertCircle className="w-3 h-3" />}
                      {res.category === 'COMPILATION_ERROR' && <AlertCircle className="w-3 h-3" />}
                      {res.category === 'TIMEOUT' && <Clock className="w-3 h-3" />}
                      {res.category === 'RUNTIME_ERROR' && <XCircle className="w-3 h-3" />}
                      <span>{res.title}</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] text-slate-500 bg-slate-800/80 border border-slate-700/60 font-semibold">
                      NOT RUN
                    </span>
                  )}

                  {/* Execution time & exit code if available */}
                  {res && (
                    <span className="text-[10px] text-slate-400 font-mono flex items-center space-x-1 ml-2">
                      <Clock className="w-2.5 h-2.5 text-slate-400" />
                      <span>{res.executionTimeMs}ms</span>
                      <span>&bull;</span>
                      <span>Exit {res.exitCode ?? '—'}</span>
                    </span>
                  )}
                </div>

                {/* Remove Test Case Button */}
                <button
                  onClick={() => handleRemoveTest(tc.id)}
                  title="Remove Test Case"
                  className="flex items-center space-x-1 px-2 py-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded border border-transparent hover:border-rose-900/40 transition cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="text-[11px]">Remove</span>
                </button>
              </div>

              {/* Input & Expected Output Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2.5 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-sans">Input:</span>
                  <span className="text-cyan-300">{tc.input ? tc.input : '<empty>'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-sans">Expected Output:</span>
                  <span className="text-emerald-300">{tc.expectedOutput}</span>
                </div>
              </div>

              {/* Execution Result Details & Beginner-Friendly Explanation */}
              {res && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/60 space-y-2">
                  {/* Distinct Explanation Banner */}
                  <div className={`p-2.5 rounded-md border text-xs font-medium leading-relaxed ${res.boxClass}`}>
                    {res.explanation}
                  </div>

                  {/* Actual Output */}
                  <div className="text-[11px]">
                    <span className="text-slate-500 font-sans">Actual Output: </span>
                    <span className={res.pass ? 'text-emerald-300 font-mono' : 'text-slate-200 font-mono'}>
                      {res.stdout ? res.stdout.trim() : '<no stdout>'}
                    </span>
                  </div>

                  {/* Raw Stderr (if execution error) */}
                  {res.stderr && (
                    <div className="mt-1 p-2 bg-slate-950/80 border border-slate-800 rounded font-mono text-[10px] text-rose-300 overflow-x-auto whitespace-pre-wrap max-h-32">
                      {res.stderr.trim()}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
