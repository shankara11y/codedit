import React, { useState } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { 
  Check, 
  Copy, 
  Download, 
  ArrowLeftRight, 
  Code, 
  FileCheck, 
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { getLanguageConfig } from '../utils/languages';

export default function FixedCode({
  originalCode,
  correctedCode,
  explanationOfChanges,
  language = 'python',
  onApplyToEditor
}) {
  const [viewMode, setViewMode] = useState('standard'); // 'standard' | 'diff'
  const [copied, setCopied] = useState(false);

  const currentLangConfig = getLanguageConfig(language);

  if (!correctedCode) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-900/60 border border-slate-800 rounded-xl text-center space-y-3">
        <div className="p-3 bg-slate-800/80 rounded-full text-slate-400">
          <FileCheck className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-slate-200 text-sm">No Repaired Code Yet</h3>
          <p className="text-xs text-slate-400 max-w-xs">
            Once you submit {currentLangConfig.shortName} code for debugging, the AI will generate the fully corrected, executable code here.
          </p>
        </div>
      </div>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(correctedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([correctedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `corrected_code${currentLangConfig.ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-4 p-4">
      {/* Header with Mode Toggles & Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-white text-sm">Corrected {currentLangConfig.name} Code</h3>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex items-center space-x-2 flex-wrap gap-1">
          {/* Toggle between standard view and side-by-side diff */}
          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700 text-xs">
            <button
              onClick={() => setViewMode('standard')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded transition ${
                viewMode === 'standard'
                  ? 'bg-cyan-500 text-white font-medium shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Code</span>
            </button>
            <button
              onClick={() => setViewMode('diff')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded transition ${
                viewMode === 'diff'
                  ? 'bg-cyan-500 text-white font-medium shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Compare original code vs repaired code"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Diff View</span>
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-md transition"
            title="Copy repaired code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="flex items-center space-x-1.5 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-md transition"
            title={`Download corrected ${currentLangConfig.shortName} file`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>

          {/* Apply to main editor */}
          {onApplyToEditor && (
            <button
              onClick={() => onApplyToEditor(correctedCode)}
              className="flex items-center space-x-1.5 px-3 py-1 text-xs bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-md transition font-medium cursor-pointer"
              title="Replace original code with corrected code in editor"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Load Into Editor</span>
            </button>
          )}
        </div>
      </div>

      {/* Editor / Diff Container */}
      <div className="h-[360px] w-full border border-slate-800 rounded-lg overflow-hidden bg-[#070b14]">
        {viewMode === 'standard' ? (
          <Editor
            height="100%"
            language={currentLangConfig.monacoLang}
            value={correctedCode}
            theme="vs-dark"
            options={{
              readOnly: true,
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
        ) : (
          <DiffEditor
            height="100%"
            language={currentLangConfig.monacoLang}
            original={originalCode}
            modified={correctedCode}
            theme="vs-dark"
            options={{
              readOnly: true,
              fontSize: 12,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              renderSideBySide: true,
              automaticLayout: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              padding: { top: 8, bottom: 8 }
            }}
          />
        )}
      </div>

      {/* Changes Summary Card */}
      {explanationOfChanges && (
        <div className="p-3.5 bg-[#0a0f1d] border border-slate-800 rounded-lg space-y-1.5">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Summary of Modifications Made:</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {explanationOfChanges}
          </p>
        </div>
      )}
    </div>
  );
}
