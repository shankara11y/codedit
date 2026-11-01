import React from 'react';
import { 
  Bug, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  HelpCircle, 
  Wrench, 
  Hash, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export default function BugAnalysis({ debugResult, onSelectLine, selectedLine }) {
  if (!debugResult) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-900/60 border border-slate-800 rounded-xl text-center space-y-3">
        <div className="p-3 bg-slate-800/80 rounded-full text-slate-400">
          <Bug className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-slate-200 text-sm">No Analysis Yet</h3>
          <p className="text-xs text-slate-400 max-w-xs">
            Write or paste Python code in the editor and click <span className="text-cyan-400 font-medium">Debug Code</span> to analyze for syntax, runtime, and logical errors.
          </p>
        </div>
      </div>
    );
  }

  const { hasBugs, summary, bugs = [] } = debugResult;

  // Counts by category
  const syntaxCount = bugs.filter(b => b.category === 'syntax').length;
  const runtimeCount = bugs.filter(b => b.category === 'runtime').length;
  const logicalCount = bugs.filter(b => b.category === 'logical').length;

  if (!hasBugs || bugs.length === 0) {
    return (
      <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">No Bugs Detected!</h3>
            <p className="text-xs text-emerald-300">The submitted code appears syntactically and logically sound.</p>
          </div>
        </div>
        {summary && (
          <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            {summary}
          </p>
        )}
      </div>
    );
  }

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'syntax':
        return {
          label: 'Syntax Error',
          className: 'bg-rose-500/15 text-rose-400 border-rose-500/30'
        };
      case 'runtime':
        return {
          label: 'Runtime Error',
          className: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
        };
      case 'logical':
        return {
          label: 'Logical Error',
          className: 'bg-purple-500/15 text-purple-400 border-purple-500/30'
        };
      default:
        return {
          label: 'Issue',
          className: 'bg-blue-500/15 text-blue-400 border-blue-500/30'
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Header Bar */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h3 className="font-bold text-white text-sm">
              Detected {bugs.length} Issue{bugs.length > 1 ? 's' : ''}
            </h3>
          </div>

          {/* Category Counts Breakdown */}
          <div className="flex items-center space-x-2 text-xs">
            {syntaxCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 font-medium">
                {syntaxCount} Syntax
              </span>
            )}
            {runtimeCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
                {runtimeCount} Runtime
              </span>
            )}
            {logicalCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 font-medium">
                {logicalCount} Logical
              </span>
            )}
          </div>
        </div>

        {summary && (
          <p className="text-xs text-slate-300 leading-relaxed">
            {summary}
          </p>
        )}
      </div>

      {/* Bugs List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {bugs.map((bug, index) => {
          const categoryBadge = getCategoryBadge(bug.category);
          const isSelected = bug.lineNumbers.includes(selectedLine);

          return (
            <div
              key={bug.id || index}
              className={`p-4 rounded-xl border transition ${
                isSelected
                  ? 'bg-slate-800/90 border-cyan-500 shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Bug Header */}
              <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${categoryBadge.className}`}>
                    {categoryBadge.label}
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {bug.severity}
                  </span>
                </div>

                {/* Line number badges - Clickable to jump to line in editor */}
                {bug.lineNumbers && bug.lineNumbers.length > 0 && (
                  <div className="flex items-center space-x-1.5">
                    <Hash className="w-3.5 h-3.5 text-slate-500" />
                    {bug.lineNumbers.map(line => (
                      <button
                        key={line}
                        onClick={() => onSelectLine(line)}
                        className={`text-xs px-2 py-0.5 rounded font-mono font-medium transition ${
                          selectedLine === line
                            ? 'bg-cyan-500 text-white font-bold'
                            : 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700'
                        }`}
                        title={`Click to highlight line ${line} in editor`}
                      >
                        Line {line}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Bug Title */}
              <h4 className="font-semibold text-white text-sm mb-1.5">
                {bug.title}
              </h4>

              {/* Bug Explanation */}
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                {bug.explanation}
              </p>

              {/* Actionable Fix Suggestion */}
              {bug.fixSuggestion && (
                <div className="p-2.5 bg-[#070b14] border border-slate-800/80 rounded-lg flex items-start space-x-2 text-xs">
                  <Wrench className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-emerald-400 block mb-0.5">Suggested Fix:</span>
                    <span className="text-slate-300">{bug.fixSuggestion}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
