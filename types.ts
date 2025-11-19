export enum AppMode {
  EDITOR = 'EDITOR',
  PRACTICE = 'PRACTICE',
}

export interface OptimizationResult {
  original: string;
  optimized: string;
  rationale: string;
  readabilityScore: number; // 0-100
  tone: string;
}

export interface SpeechAnalysis {
  wpm: number;
  fillerWordsCount: number;
  pacingScore: number; // 0-100
  clarityScore: number; // 0-100
  feedback: string[];
  emotionDetected: string;
}

export interface RecordedAudio {
  blob: Blob;
  url: string;
  duration: number; // seconds
}
