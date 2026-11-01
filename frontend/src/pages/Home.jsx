import React, { useState, useEffect } from 'react';
import { checkBackendHealth, debugCode } from '../services/api';
import CodeEditor from '../components/CodeEditor';
import BugAnalysis from '../components/BugAnalysis';
import FixedCode from '../components/FixedCode';
import TestResults from '../components/TestResults';
import { SUPPORTED_LANGUAGES, getLanguageConfig } from '../utils/languages';
import { 
  Code2, 
  RefreshCw, 
  AlertTriangle, 
  KeyRound, 
  Layers, 
  Server, 
  Bot, 
  ShieldCheck, 
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Terminal,
  Globe2
} from 'lucide-react';

export default function Home() {
  const [language, setLanguage] = useState('python');
  const initialConfig = getLanguageConfig('python');

  const [code, setCode] = useState(initialConfig.defaultCode);
  const [description, setDescription] = useState(initialConfig.defaultDescription);
  
  // Test cases per language
  const [testCasesByLang, setTestCasesByLang] = useState({
    python: getLanguageConfig('python').defaultTestCases,
    javascript: getLanguageConfig('javascript').defaultTestCases,
    cpp: getLanguageConfig('cpp').defaultTestCases,
    java: getLanguageConfig('java').defaultTestCases,
  });

  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  
  // Debugging state (Gemini)
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugResult, setDebugResult] = useState(null);
  const [debugError, setDebugError] = useState(null);
  const [highlightedLines, setHighlightedLines] = useState([]);
  const [selectedLine, setSelectedLine] = useState(null);

  // Active view tab below editor: 'tests' | 'repaired'
  const [activeTab, setActiveTab] = useState('tests');

  const currentLangConfig = getLanguageConfig(language);
  const currentTestCases = testCasesByLang[language] || [];

  const setTestCasesForCurrentLang = (updater) => {
    setTestCasesByLang(prev => {
      const currentList = prev[language] || [];
      const updatedList = typeof updater === 'function' ? updater(currentList) : updater;
      return {
        ...prev,
        [language]: updatedList
      };
    });
  };

  const handleLanguageChange = (newLangId) => {
    if (newLangId === language) return;
    setLanguage(newLangId);
    const newConfig = getLanguageConfig(newLangId);
    setCode(newConfig.defaultCode);
    setDescription(newConfig.defaultDescription);
    setDebugResult(null);
    setDebugError(null);
    setHighlightedLines([]);
    setSelectedLine(null);
  };

  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const data = await checkBackendHealth();
      setHealthData(data);
    } catch (err) {
      console.error('Failed to connect to backend:', err);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleDebug = async () => {
    // Guard against multiple simultaneous requests
    if (isDebugging || !code.trim()) return;

    setIsDebugging(true);
    setDebugError(null);
    setHighlightedLines([]);
    setSelectedLine(null);

    try {
      const response = await debugCode(code, description, language);
      if (response && response.data) {
        setDebugResult(response.data);
        setActiveTab('repaired'); // Show AI fix on completion
        // Automatically highlight lines from first bug if any
        if (response.data.bugs && response.data.bugs.length > 0) {
          const allLines = response.data.bugs.flatMap(b => b.lineNumbers || []);
          setHighlightedLines(allLines);
        }
      }
    } catch (err) {
      console.error('Debugging failed:', err);
      setDebugError(err.message || 'An error occurred during debugging.');
    } finally {
      setIsDebugging(false);
    }
  };

  const handleClear = () => {
    setCode('');
    setDescription('');
    setDebugResult(null);
    setDebugError(null);
    setHighlightedLines([]);
    setSelectedLine(null);
  };

  const handleSelectLine = (line) => {
    setSelectedLine(line);
    setHighlightedLines([line]);
  };

  const handleApplyToEditor = (repairedCode) => {
    setCode(repairedCode);
    setHighlightedLines([]);
    setSelectedLine(null);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur sticky top-0 z-50 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-lg text-white shadow-lg shadow-cyan-500/20">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold tracking-tight text-white">CodeFix AI</h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Multi-Language Edition
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                AI Debugging, Repair & Isolated Docker Sandboxes for Python, JS, C++ & Java
              </p>
            </div>
          </div>

          {/* Backend Connection, Docker & AI Status Badges */}
          <div className="flex items-center space-x-2.5 flex-wrap gap-2">
            <button
              onClick={fetchHealth}
              disabled={healthLoading}
              className="flex items-center space-x-1.5 px-3 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition cursor-pointer"
              title="Ping backend"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Ping</span>
            </button>

            {/* Docker Execution Sandbox Badge */}
            <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
              healthData?.dockerAvailable
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{healthData?.dockerAvailable ? 'Docker Sandboxes Ready' : 'Docker Offline'}</span>
            </div>

            {/* AI Key Status Badge */}
            <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
              healthData?.aiConfigured
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              <Bot className="w-3.5 h-3.5" />
              <span>{healthData?.aiConfigured ? 'Gemini Ready' : 'API Key Pending'}</span>
            </div>

            {/* Backend Connection Badge */}
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border ${
              healthData
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${healthData ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
              <span>{healthData ? 'Port 5050 Online' : 'Backend Offline'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 space-y-6">
        {/* Notice Banner if GEMINI_API_KEY is not yet in .env */}
        {!healthData?.aiConfigured && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start space-x-3 shadow-lg">
            <KeyRound className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-amber-300 text-sm">Gemini API Key Required for Live AI Debugging</p>
              <p className="text-slate-300">
                To enable live AI code analysis, paste your Google AI Studio API key into <code className="text-amber-300 bg-amber-950/40 px-1.5 py-0.5 rounded font-mono">backend/.env</code>:
              </p>
              <p className="font-mono text-cyan-300 bg-slate-900/80 px-2 py-1 rounded border border-slate-800 w-fit">
                GEMINI_API_KEY=AIzaSy...
              </p>
              <p className="text-slate-400">
                Multi-language Docker execution and the test case system work independently without needing Gemini requests.
              </p>
            </div>
          </div>
        )}

        {/* Error notification if debugging request fails */}
        {debugError && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start space-x-3 text-xs shadow-lg">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-rose-300 text-sm">Debugging Request Failed</p>
              <p className="text-rose-400 font-mono">{debugError}</p>
            </div>
          </div>
        )}

        {/* 2-Column Developer Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Monaco Code Editor & Repaired Code (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Input Code Editor */}
            <CodeEditor
              code={code}
              setCode={setCode}
              description={description}
              setDescription={setDescription}
              language={language}
              onLanguageChange={handleLanguageChange}
              onDebug={handleDebug}
              onClear={handleClear}
              isLoading={isDebugging}
              highlightedLines={highlightedLines}
            />

            {/* Results Area (Fixed Code & Test Suite) */}
            <div className="space-y-4">
              {/* Tab Navigation */}
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                <button
                  id="tab-tests"
                  onClick={() => setActiveTab('tests')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'tests'
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>{currentLangConfig.shortName} Test Cases & Sandbox</span>
                </button>

                <button
                  id="tab-repaired"
                  onClick={() => setActiveTab('repaired')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'repaired'
                      ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Corrected Code & Diff {debugResult ? '✨' : '(Debug Required)'}</span>
                </button>
              </div>

              {/* Tab Content: Tests */}
              {activeTab === 'tests' && (
                <TestResults 
                  code={code} 
                  language={language}
                  testCases={currentTestCases}
                  setTestCases={setTestCasesForCurrentLang}
                />
              )}

              {/* Tab Content: Repaired Code */}
              {activeTab === 'repaired' && (
                debugResult ? (
                  <FixedCode
                    originalCode={code}
                    correctedCode={debugResult.correctedCode}
                    explanationOfChanges={debugResult.explanationOfChanges}
                    language={language}
                    onApplyToEditor={handleApplyToEditor}
                  />
                ) : (
                  <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-xl text-center space-y-2">
                    <Sparkles className="w-6 h-6 text-purple-400 mx-auto" />
                    <p className="text-xs text-slate-300 font-medium">No AI repair generated yet.</p>
                    <p className="text-[11px] text-slate-500">
                      Click the "Debug {currentLangConfig.shortName} Code" button above to run Gemini AI analysis.
                    </p>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Right Column: Bug Analysis Panel (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
              <h3 className="font-bold text-white text-sm mb-3 flex items-center space-x-2">
                <Bot className="w-4 h-4 text-cyan-400" />
                <span>AI Diagnostics & Error Classification</span>
              </h3>
              <BugAnalysis
                debugResult={debugResult}
                onSelectLine={handleSelectLine}
                selectedLine={selectedLine}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#090d16] px-6 py-4 text-center text-xs text-slate-500">
        CodeFix AI &bull; Multi-Language Code Debugging & Docker Execution Assistant &bull; Python 3.11, Node.js, C++ G++, Java JDK 17
      </footer>
    </div>
  );
}
