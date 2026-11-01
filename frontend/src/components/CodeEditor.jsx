import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Trash2, FileCode, Sparkles, BookOpen, Globe2 } from 'lucide-react';
import { SUPPORTED_LANGUAGES, getLanguageConfig } from '../utils/languages';

export default function CodeEditor({
  code,
  setCode,
  description,
  setDescription,
  language = 'python',
  onLanguageChange,
  onDebug,
  onClear,
  isLoading,
  highlightedLines = []
}) {
  const editorRef = useRef(null);
  const decorationsRef = useRef([]);

  const currentLangConfig = getLanguageConfig(language);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Apply custom dark theme adjustments
    monaco.editor.defineTheme('codefix-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'keyword', foreground: '38bdf8', fontStyle: 'bold' },
        { token: 'string', foreground: '4ade80' },
        { token: 'number', foreground: 'f59e0b' },
        { token: 'identifier', foreground: 'f8fafc' },
      ],
      colors: {
        'editor.background': '#070b14',
        'editor.foreground': '#f8fafc',
        'editorLineNumber.foreground': '#334155',
        'editorLineNumber.activeForeground': '#38bdf8',
        'editor.lineHighlightBackground': '#0f172a',
        'editorCursor.foreground': '#38bdf8',
        'editor.selectionBackground': '#1e293b'
      }
    });

    monaco.editor.setTheme('codefix-dark');
  };

  // Update line highlights when highlightedLines prop changes
  React.useEffect(() => {
    if (!editorRef.current || !window.monaco) return;

    if (highlightedLines.length > 0) {
      const newDecorations = highlightedLines.map(line => ({
        range: new window.monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: 'bg-rose-500/20 border-l-4 border-rose-500',
          glyphMarginClassName: 'text-rose-400'
        }
      }));

      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current,
        newDecorations
      );

      // Scroll to the first highlighted line
      editorRef.current.revealLineInCenter(highlightedLines[0]);
    } else {
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
    }
  }, [highlightedLines]);

  const handleSelectSample = (e) => {
    const selectedIdx = e.target.value;
    if (selectedIdx === '') return;
    const sample = currentLangConfig.samples[Number(selectedIdx)];
    if (sample) {
      setCode(sample.code);
      setDescription(sample.description);
    }
  };

  return (
    <div className="flex flex-col bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Editor Header Bar */}
      <div className="px-4 py-3 bg-[#0d1322] border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-3 flex-wrap gap-2">
          {/* Language Selector Dropdown */}
          <div className="flex items-center space-x-1.5 bg-slate-950/80 border border-cyan-500/40 rounded-lg px-2.5 py-1">
            <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] text-slate-400 font-medium">Language:</span>
            <select
              id="select-language"
              value={language}
              onChange={(e) => onLanguageChange && onLanguageChange(e.target.value)}
              className="text-xs bg-transparent text-cyan-300 font-bold focus:outline-none cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id} className="bg-slate-900 text-slate-100">
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sample Presets Dropdown */}
          <select
            id="select-sample-preset"
            onChange={handleSelectSample}
            defaultValue=""
            className="text-xs bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded px-2.5 py-1 focus:outline-none focus:border-cyan-500 transition cursor-pointer"
          >
            <option value="" disabled>Load {currentLangConfig.shortName} Buggy Sample...</option>
            {currentLangConfig.samples.map((sample, idx) => (
              <option key={idx} value={idx}>{sample.name}</option>
            ))}
          </select>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            id="btn-clear-code"
            onClick={onClear}
            disabled={isLoading || !code}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded transition disabled:opacity-40 cursor-pointer"
            title="Clear code"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          <button
            id="btn-debug-code"
            onClick={onDebug}
            disabled={isLoading || !code.trim()}
            className="flex items-center space-x-2 px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-lg shadow-cyan-500/25 transition cursor-pointer"
          >
            {isLoading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Debugging Code...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Debug {currentLangConfig.shortName} Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Optional Problem Description Input */}
      <div className="p-3 bg-[#0a0f1d] border-b border-slate-800/70">
        <div className="flex items-center space-x-2 text-slate-400 text-xs mb-1.5 font-medium">
          <BookOpen className="w-3.5 h-3.5 text-slate-400" />
          <span>Intended Behavior / Problem Description (Optional):</span>
        </div>
        <input
          id="input-problem-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={`e.g. Calculate average of numbers in ${currentLangConfig.shortName}, safely return 0 on empty input...`}
          className="w-full bg-[#070b14] border border-slate-800 text-xs text-slate-200 placeholder-slate-500 rounded px-3 py-1.5 focus:outline-none focus:border-cyan-500 font-sans"
        />
      </div>

      {/* Monaco Code Editor Area */}
      <div className="h-[380px] w-full">
        <Editor
          height="100%"
          language={currentLangConfig.monacoLang}
          value={code}
          onChange={(val) => setCode(val || '')}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            wordWrap: 'on',
            padding: { top: 12, bottom: 12 }
          }}
        />
      </div>

      {/* Editor Footer / Info */}
      <div className="px-4 py-2 bg-[#0d1322] border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span>Lines: <strong className="text-slate-200 font-mono">{code.split('\n').length}</strong></span>
          <span>Chars: <strong className="text-slate-200 font-mono">{code.length}</strong></span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="text-slate-300 font-medium">Monaco Editor &bull; {currentLangConfig.name} Mode</span>
        </div>
      </div>
    </div>
  );
}
