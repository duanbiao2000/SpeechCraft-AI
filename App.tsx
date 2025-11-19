import React, { useState, useEffect } from 'react';
import { PenTool, Mic2, Sparkles, Menu, X, Settings } from 'lucide-react';
import ScriptEditor from './components/ScriptEditor';
import PracticeStudio from './components/PracticeStudio';
import { AppMode, OptimizationResult } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.EDITOR);
  const [script, setScript] = useState<string>("");
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  useEffect(() => {
    // Check if API key is present in env
    if (process.env.API_KEY) {
      setHasApiKey(true);
    }
  }, []);

  const handleOptimizationComplete = (result: OptimizationResult) => {
    // Optional: Automatically switch to practice mode or just notify
    // For now, we stay in editor but show results
  };

  if (!hasApiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200">
          <Sparkles className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">SpeechCraft AI</h1>
          <p className="text-slate-500 mb-6">
            Please configure your Google Gemini API Key in the environment variables to proceed.
          </p>
          <div className="bg-slate-100 p-4 rounded-lg text-sm font-mono text-slate-600 break-all">
            process.env.API_KEY
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            SpeechCraft AI
          </h1>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setMode(AppMode.EDITOR)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              mode === AppMode.EDITOR
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <PenTool className="w-4 h-4" />
            Write & Optimize
          </button>
          <button
            onClick={() => setMode(AppMode.PRACTICE)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              mode === AppMode.PRACTICE
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Mic2 className="w-4 h-4" />
            Practice & Analyze
          </button>
        </nav>

        {/* Mobile Nav Toggle (Visual Only for this demo) */}
        <button className="md:hidden p-2 text-slate-500">
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {mode === AppMode.EDITOR ? (
          <ScriptEditor 
            currentScript={script} 
            onScriptChange={setScript}
            onOptimizationComplete={handleOptimizationComplete}
          />
        ) : (
          <PracticeStudio script={script} />
        )}
      </main>

      {/* Footer/Mobile Nav */}
      <div className="md:hidden bg-white border-t border-slate-200 p-2 flex justify-around shrink-0">
         <button
            onClick={() => setMode(AppMode.EDITOR)}
            className={`flex flex-col items-center p-2 ${mode === AppMode.EDITOR ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            <PenTool className="w-5 h-5" />
            <span className="text-xs mt-1">Editor</span>
          </button>
          <button
            onClick={() => setMode(AppMode.PRACTICE)}
            className={`flex flex-col items-center p-2 ${mode === AppMode.PRACTICE ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            <Mic2 className="w-5 h-5" />
            <span className="text-xs mt-1">Practice</span>
          </button>
      </div>
    </div>
  );
};

export default App;
