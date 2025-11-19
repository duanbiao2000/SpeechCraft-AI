import React, { useState } from 'react';
import { Wand2, ArrowRight, Copy, Check, Loader2 } from 'lucide-react';
import { optimizeScript } from '../services/geminiService';
import { OptimizationResult } from '../types';

interface ScriptEditorProps {
  currentScript: string;
  onScriptChange: (script: string) => void;
  onOptimizationComplete: (result: OptimizationResult) => void;
}

const ScriptEditor: React.FC<ScriptEditorProps> = ({ currentScript, onScriptChange, onOptimizationComplete }) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleOptimize = async () => {
    if (!currentScript.trim()) return;
    
    setIsOptimizing(true);
    try {
      const data = await optimizeScript(currentScript);
      const optimizationResult: OptimizationResult = {
        original: currentScript,
        optimized: data.optimized,
        rationale: data.rationale,
        readabilityScore: data.readabilityScore,
        tone: data.tone,
      };
      setResult(optimizationResult);
      onOptimizationComplete(optimizationResult);
    } catch (e) {
      alert("Failed to optimize script. Please check your API key.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const applyOptimization = () => {
    if (result) {
      onScriptChange(result.optimized);
      setResult(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full p-4 lg:p-8">
      {/* Input Section */}
      <div className="flex flex-col gap-4 h-full">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-800">Original Draft</h2>
          <span className="text-xs text-slate-500 font-mono">{currentScript.length} chars</span>
        </div>
        <textarea
          className="flex-1 w-full p-4 rounded-xl border border-slate-200 bg-white resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-700 leading-relaxed shadow-sm"
          placeholder="Paste your script here (English or Chinese)..."
          value={currentScript}
          onChange={(e) => onScriptChange(e.target.value)}
        />
        <button
          onClick={handleOptimize}
          disabled={isOptimizing || !currentScript.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
        >
          {isOptimizing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing with Gemini...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Optimize Script
            </>
          )}
        </button>
      </div>

      {/* Output Section */}
      <div className="flex flex-col gap-4 h-full">
        <h2 className="text-xl font-semibold text-slate-800">AI Suggestion</h2>
        <div className={`flex-1 rounded-xl border ${result ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-slate-50'} relative flex flex-col overflow-hidden`}>
          {result ? (
            <>
              <div className="p-4 flex-1 overflow-y-auto">
                <p className="text-slate-800 text-lg leading-relaxed whitespace-pre-wrap">{result.optimized}</p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm p-4 border-t border-indigo-100 space-y-3">
                <div className="flex items-center gap-2 text-sm text-indigo-800 font-medium">
                  <span className="bg-indigo-100 px-2 py-1 rounded text-xs uppercase tracking-wide">Rationale</span>
                  {result.rationale}
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex gap-4 text-sm">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500">Readability</span>
                      <span className="font-bold text-slate-700">{result.readabilityScore}/100</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500">Tone</span>
                      <span className="font-bold text-slate-700">{result.tone}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => copyToClipboard(result.optimized)}
                      className="p-2 text-slate-600 hover:text-indigo-600 transition-colors"
                      title="Copy"
                    >
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                    <button 
                      onClick={applyOptimization}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                    >
                      Use This <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <Wand2 className="w-12 h-12 mb-4 opacity-50" />
              <p>Your optimized script will appear here.</p>
              <p className="text-sm mt-2">Gemini analyzes tone, sentence length, and breath patterns.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScriptEditor;