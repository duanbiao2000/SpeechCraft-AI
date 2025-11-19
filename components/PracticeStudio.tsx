import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, RefreshCcw, Award, BarChart2, Volume2, Loader2, StopCircle, ChevronDown, Download, Check } from 'lucide-react';
import { analyzeSpeech, generateDemonstrationAudio, playRawAudio, VOICE_OPTIONS, base64ToWavBlob } from '../services/geminiService';
import { SpeechAnalysis } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PracticeStudioProps {
  script: string;
}

const PracticeStudio: React.FC<PracticeStudioProps> = ({ script }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<SpeechAnalysis | null>(null);
  
  // Demo Audio State
  const [demoAudioData, setDemoAudioData] = useState<string | null>(null);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const stopDemoRef = useRef<(() => void) | null>(null);

  // Voice Selection State
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0]);
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsVoiceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (stopDemoRef.current) {
        stopDemoRef.current();
      }
    };
  }, []);

  const startRecording = async () => {
    // Stop demo if playing
    if (isPlayingDemo && stopDemoRef.current) {
      stopDemoRef.current();
      setIsPlayingDemo(false);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        handleAnalysis(blob);
      };

      mediaRecorderRef.current.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setAnalysis(null);
    } catch (err) {
      console.error("Error accessing microphone", err);
      alert("Microphone access required for practice mode.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleAnalysis = async (blob: Blob) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeSpeech(blob, script);
      setAnalysis(result);
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePreviewVoice = async (e: React.MouseEvent, voice: typeof VOICE_OPTIONS[0]) => {
    e.stopPropagation(); // Prevent selection when clicking preview
    if (previewingVoiceId === voice.id) return;

    setPreviewingVoiceId(voice.id);
    try {
      // Simple bilingual preview text
      const previewText = "Hello, this is a voice preview. 您好，这是语音示例。";
      const audioData = await generateDemonstrationAudio(previewText, voice.id);
      await playRawAudio(audioData);
    } catch (e) {
      console.error("Preview failed", e);
    } finally {
      setPreviewingVoiceId(null);
    }
  };

  const handleGenerateAndPlayDemo = async () => {
    if (isPlayingDemo && stopDemoRef.current) {
      stopDemoRef.current();
      setIsPlayingDemo(false);
      return;
    }

    if (demoAudioData) {
      // Play existing
      setIsPlayingDemo(true);
      const stopFn = await playRawAudio(demoAudioData, () => setIsPlayingDemo(false));
      stopDemoRef.current = stopFn;
      return;
    }

    if (!script.trim()) return;
    
    setIsGeneratingDemo(true);
    try {
      const base64Data = await generateDemonstrationAudio(script.substring(0, 500), selectedVoice.id); // Limit length for demo
      setDemoAudioData(base64Data);
      
      // Auto play after generation
      setIsPlayingDemo(true);
      const stopFn = await playRawAudio(base64Data, () => setIsPlayingDemo(false));
      stopDemoRef.current = stopFn;
    } catch (e) {
      alert("Could not generate AI demo.");
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  const handleDownload = () => {
    if (!demoAudioData) return;
    const blob = base64ToWavBlob(demoAudioData);
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
    a.href = url;
    a.download = `ai_voice_${timestamp}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const scoreData = analysis ? [
    { name: 'Pacing', score: analysis.pacingScore, color: '#8884d8' },
    { name: 'Clarity', score: analysis.clarityScore, color: '#82ca9d' },
  ] : [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 h-full overflow-hidden">
        
        {/* Left: Teleprompter */}
        <div className="lg:col-span-2 p-6 lg:p-8 bg-slate-50 flex flex-col h-full border-r border-slate-200 overflow-hidden">
          
          {/* Toolbar Header */}
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-700 uppercase tracking-wide">Teleprompter</h3>
            </div>

            {/* AI Voice Toolbar */}
            <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
              
              {/* Voice Selector Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsVoiceDropdownOpen(!isVoiceDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors border border-transparent hover:border-slate-200"
                >
                  <Volume2 className="w-4 h-4 text-indigo-500" />
                  <span>{selectedVoice.name}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
                
                {isVoiceDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                    <div className="p-2 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Select Voice
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {VOICE_OPTIONS.map((voice) => (
                        <div 
                          key={voice.id}
                          onClick={() => {
                            setSelectedVoice(voice);
                            setIsVoiceDropdownOpen(false);
                            // Clear previous demo if voice changes
                            if (demoAudioData) setDemoAudioData(null);
                          }}
                          className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${selectedVoice.id === voice.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'}`}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{voice.name}</span>
                            <span className="text-xs opacity-70">{voice.label.split('(')[1].replace(')', '')}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {selectedVoice.id === voice.id && <Check className="w-4 h-4 text-indigo-600" />}
                            <button
                              onClick={(e) => handlePreviewVoice(e, voice)}
                              className="p-1.5 rounded-full hover:bg-indigo-100 text-indigo-600 transition-colors"
                              title="Preview Voice"
                            >
                              {previewingVoiceId === voice.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Play className="w-3 h-3 fill-current" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="h-6 w-px bg-slate-200 mx-1"></div>

              {/* Generate / Play Button */}
              <button 
                onClick={handleGenerateAndPlayDemo}
                disabled={isGeneratingDemo || !script}
                className={`text-sm px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2 ${
                  isPlayingDemo 
                    ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                    : !demoAudioData 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md'
                      : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none`}
              >
                {isGeneratingDemo ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin"/>
                    <span>Generating...</span>
                  </>
                ) : isPlayingDemo ? (
                  <>
                    <StopCircle className="w-4 h-4 fill-current" />
                    <span>Stop</span>
                  </>
                ) : demoAudioData ? (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Play Demo</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Generate Audio</span>
                  </>
                )}
              </button>

              {/* Download Button (Visible only if audio exists) */}
              {demoAudioData && (
                <button
                  onClick={handleDownload}
                  className="p-2 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Download Audio (WAV)"
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 bg-white rounded-2xl shadow-inner p-8 overflow-y-auto border border-slate-200">
             <p className="text-3xl lg:text-4xl font-medium text-slate-800 leading-relaxed">
               {script || <span className="text-slate-300">Enter a script in the Editor tab to start practicing...</span>}
             </p>
          </div>

          <div className="mt-6 flex justify-center items-center gap-6">
             {!isRecording ? (
               <button 
                onClick={startRecording}
                disabled={!script}
                className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 transition-all shadow-lg hover:shadow-red-200 disabled:bg-slate-300 disabled:cursor-not-allowed"
               >
                 <Mic className="w-8 h-8 text-white" />
                 <span className="absolute -bottom-8 text-xs font-medium text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">Record</span>
               </button>
             ) : (
               <button 
                onClick={stopRecording}
                className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-white border-4 border-red-500 animate-pulse"
               >
                 <Square className="w-6 h-6 text-red-500 fill-current" />
                 <span className="absolute -bottom-8 text-xs font-medium text-slate-500">Stop</span>
               </button>
             )}
          </div>
        </div>

        {/* Right: Feedback Panel */}
        <div className="bg-white p-6 lg:p-8 overflow-y-auto h-full scrollbar-hide">
           <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
             <Award className="w-5 h-5 text-indigo-500" />
             Performance Analysis
           </h3>

           {isAnalyzing && (
             <div className="flex flex-col items-center justify-center py-12 text-slate-500">
               <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
               <p>Gemini is analyzing your speech...</p>
             </div>
           )}

           {!isAnalyzing && !analysis && !isRecording && (
             <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
               <BarChart2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
               <p>Record yourself to see metrics.</p>
             </div>
           )}

           {analysis && !isAnalyzing && (
             <div className="space-y-8">
               {/* Audio Playback */}
               {audioUrl && (
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                   <p className="text-xs font-bold text-slate-500 uppercase mb-2">Your Recording</p>
                   <audio src={audioUrl} controls className="w-full h-8" />
                 </div>
               )}

               {/* Key Metrics */}
               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-indigo-50 p-4 rounded-xl text-center">
                   <p className="text-2xl font-bold text-indigo-700">{analysis.wpm}</p>
                   <p className="text-xs text-indigo-500 uppercase tracking-wider">WPM / CPM</p>
                 </div>
                 <div className="bg-rose-50 p-4 rounded-xl text-center">
                   <p className="text-2xl font-bold text-rose-700">{analysis.fillerWordsCount}</p>
                   <p className="text-xs text-rose-500 uppercase tracking-wider">Filler Words</p>
                 </div>
               </div>

               {/* Chart */}
               <div className="h-48 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={scoreData} layout="vertical" margin={{ left: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                     <XAxis type="number" domain={[0, 100]} hide />
                     <YAxis dataKey="name" type="category" width={60} tick={{fontSize: 12}} />
                     <Tooltip />
                     <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                      {scoreData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
               </div>

               {/* Qualitative Feedback */}
               <div>
                  <h4 className="font-medium text-slate-700 mb-3">Coach's Feedback</h4>
                  <ul className="space-y-2">
                    {analysis.feedback.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                        <div className="min-w-[6px] h-[6px] rounded-full bg-indigo-50 mt-1.5"></div>
                        {tip}
                      </li>
                    ))}
                  </ul>
               </div>

               {/* Tone */}
               <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                 <h4 className="text-xs font-bold text-amber-600 uppercase mb-1">Detected Emotion</h4>
                 <p className="text-slate-800 capitalize">{analysis.emotionDetected}</p>
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default PracticeStudio;