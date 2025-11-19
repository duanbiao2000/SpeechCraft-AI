import React, { useState, useRef } from 'react';
import { Wand2, ArrowRight, Copy, Check, Loader2, X } from 'lucide-react';
import { optimizeScript } from '../services/geminiService';
import { OptimizationResult } from '../types';

interface ScriptEditorProps {
  currentScript: string;
  onScriptChange: (script: string) => void;
  onOptimizationComplete: (result: OptimizationResult) => void;
}

const quickPrompts = [
  { label: '/English output', desc: '（英文输出）', value: 'Output in English' },
  { label: '/Simplify logic', desc: '（简化逻辑）', value: 'Simplify logic' },
  { label: '/Add comments', desc: '（补充注释）', value: 'Add comments' },
  { label: '/Improve readability', desc: '（提升可读性）', value: 'Improve readability' },
  { label: '/Fix syntax errors', desc: '（修复语法错误）', value: 'Fix syntax errors' },
];

const ScriptEditor: React.FC<ScriptEditorProps> = ({ currentScript, onScriptChange, onOptimizationComplete }) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Pre-Prompt State
  const [customInstruction, setCustomInstruction] = useState("");
  const [showQuickPrompts, setShowQuickPrompts] = useState(false);
  const promptInputRef = useRef<HTMLInputElement>(null);

  const handleOptimize = async () => {
    // Allow optimizing if script exists, even if customInstruction is empty
    if (!currentScript.trim()) return;
    
    setIsOptimizing(true);
    try {
      const data = await optimizeScript(currentScript, customInstruction);
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

  const handlePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomInstruction(val);
    
    // Interaction Logic:
    // 1. Show if user types exactly '/' at the end (or is just starting with '/')
    // 2. "Input non-/ other characters -> if panel already popped up then automatically close"
    if (val.endsWith('/')) {
      setShowQuickPrompts(true);
    } else {
      if (showQuickPrompts) setShowQuickPrompts(false);
    }
  };

  const selectQuickPrompt = (promptValue: string) => {
    // Replace the triggering '/' with the selected prompt
    // If the instruction ends with '/', replace it. Otherwise just append or replace (simple logic: replace trailing /)
    let newVal = customInstruction;
    if (newVal.endsWith('/')) {
      newVal = newVal.slice(0, -1) + promptValue;
    } else {
      newVal = promptValue;
    }
    
    setCustomInstruction(newVal);
    setShowQuickPrompts(false);
    promptInputRef.current?.focus();
  };

  const clearInstruction = () => {
    setCustomInstruction('');
    setShowQuickPrompts(false);
    promptInputRef.current?.focus();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full p-4 lg:p-8">
      {/* Input Section */}
      <div className="flex flex-col gap-4 h-full">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-800">Original Draft</h2>
          <span className="text-xs text-slate-500 font-mono">{currentScript.length} chars</span>
        </div>

        {/* Pre-Prompt Input Area */}
        <div className="relative z-20">
          <div className="relative">
            <input
              ref={promptInputRef}
              type="text"
              value={customInstruction}
              onChange={handlePromptChange}
              onBlur={() => {
                // Delay hiding to allow clicking the dropdown items
                setTimeout(() => setShowQuickPrompts(false), 200);
              }}
              placeholder='输入优化指令（例如："用英语输出"），按 / 呼出常用提示词'
              className="w-full h-[40px] px-3 py-2 pr-8 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-700 shadow-sm transition-shadow placeholder:text-slate-400"
            />
            
            {/* Clear Button - visible when there is content */}
            {customInstruction && (
              <button
                onClick={clearInstruction}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors z-10"
                title="清除指令"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Prompts Dropdown */}
          {showQuickPrompts && (
            <div className="absolute top-full left-0 mt-[2px] w-full bg-white border border-slate-200 rounded-md shadow-lg py-1 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
              {quickPrompts.map((p, i) => (
                <button
                  key={i}
                  onMouseDown={(e) => { e.preventDefault(); selectQuickPrompt(p.value); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[#f5f5f5] active:bg-[#e8f0fe] flex items-center flex-wrap gap-2 group transition-colors"
                >
                  <span className="font-medium text-slate-700 group-hover:text-indigo-700">{p.label}</span>
                  <span className="text-slate-400 text-xs group-hover:text-indigo-400">{p.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <textarea
          className="flex-1 w-full p-4 rounded-xl border border-slate-200 bg-white resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-700 leading-relaxed shadow-sm font-sans"
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