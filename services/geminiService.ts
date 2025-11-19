import { GoogleGenAI, Modality, Type } from "@google/genai";

// Voice definitions
export const VOICE_OPTIONS = [
  { id: 'Puck', name: 'Puck', label: 'Puck (Male, Neutral)' },
  { id: 'Charon', name: 'Charon', label: 'Charon (Male, Deep)' },
  { id: 'Kore', name: 'Kore', label: 'Kore (Female, Calm)' },
  { id: 'Fenrir', name: 'Fenrir', label: 'Fenrir (Male, Intense)' },
  { id: 'Zephyr', name: 'Zephyr', label: 'Zephyr (Female, Gentle)' },
];

// Helper to convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Helper to write string to DataView for WAV header
const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

export const base64ToWavBlob = (base64: string, sampleRate: number = 24000): Blob => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // WAV Header Construction
  const buffer = new ArrayBuffer(44 + bytes.length);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + bytes.length, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (1 is PCM) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sampleRate * blockAlign) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, bytes.length, true);

  // Write PCM samples
  const wavBytes = new Uint8Array(buffer);
  wavBytes.set(bytes, 44);

  return new Blob([buffer], { type: 'audio/wav' });
};

const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return audioContext;
};

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodePCM16(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert PCM16 to Float32
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const playRawAudio = async (base64String: string, onEnded?: () => void): Promise<() => void> => {
  try {
    const ctx = getAudioContext();
    
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const bytes = decode(base64String);
    const buffer = await decodePCM16(bytes, ctx);
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    
    if (onEnded) {
      source.addEventListener('ended', onEnded);
    }

    source.start();

    return () => {
      try { 
        source.stop(); 
        source.disconnect();
      } catch(e) {}
    };
  } catch (e) {
    console.error("Audio playback error", e);
    if (onEnded) onEnded();
    return () => {};
  }
};

export const optimizeScript = async (text: string, customInstruction?: string): Promise<any> => {
  const ai = getAiClient();
  
  const prompt = `
    You are an expert speechwriter and copywriter. Analyze the following text and optimize it for oral delivery (spoken word/video script).
    
    Input Text: "${text}"
    ${customInstruction ? `\nUser Custom Instruction: "${customInstruction}"` : ''}
    
    Instructions:
    1. Detect the language of the input text (English or Chinese).
    2. If the input is Chinese, optimize it for natural spoken Chinese (口语化), avoiding written-style stiffness (书面语). The "optimized" text and "rationale" MUST be in Chinese.
    3. If the input is English, optimize for natural spoken English. The "optimized" text and "rationale" MUST be in English.
    ${customInstruction ? '4. STRICTLY follow the User Custom Instruction provided above. It overrides default language behavior if conflicting.' : ''}

    Return a JSON object with the following structure:
    {
      "optimized": "The rewritten version, more conversational, shorter sentences, punchy.",
      "rationale": "Why you made these changes (e.g., removed jargon, improved rhythm).",
      "readabilityScore": number (0-100, where 100 is very easy to speak),
      "tone": "The detected tone (e.g., Formal, Casual, Urgent)"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            optimized: { type: Type.STRING },
            rationale: { type: Type.STRING },
            readabilityScore: { type: Type.NUMBER },
            tone: { type: Type.STRING },
          },
        },
      },
    });
    
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Optimization error:", error);
    throw error;
  }
};

export const analyzeSpeech = async (audioBlob: Blob, scriptText: string): Promise<any> => {
  const ai = getAiClient();
  const base64Audio = await blobToBase64(audioBlob);

  const prompt = `
    You are a professional voice coach. Listen to the user reading the following script.
    
    Target Script: "${scriptText}"
    
    Analyze the audio for:
    1. Pacing (Is it too fast? Too slow? For Chinese, standard is ~200-260 chars/min; for English ~130-150 wpm).
    2. Clarity (Are words/characters mumbled?)
    3. Emotion (Does it match the text?)
    4. Filler words (e.g., "um", "uh" in English; "那个", "然后", "呃" in Chinese).
    
    Return a JSON object:
    {
      "wpm": number (estimated words or characters per minute),
      "fillerWordsCount": number (count of detected filler words),
      "pacingScore": number (0-100),
      "clarityScore": number (0-100),
      "feedback": ["tip 1 (in the language of the script)", "tip 2", "tip 3"],
      "emotionDetected": "string description of emotion"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Multimodal capable
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: audioBlob.type,
              data: base64Audio,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Speech analysis error:", error);
    throw error;
  }
};

export const generateDemonstrationAudio = async (text: string, voiceName: string = 'Puck'): Promise<string> => {
  const ai = getAiClient();
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName }, 
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio generated");
    
    // Return raw base64 string (PCM) instead of data URI
    return base64Audio;
  } catch (error) {
    console.error("TTS error:", error);
    throw error;
  }
};