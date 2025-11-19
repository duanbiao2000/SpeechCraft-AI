import { GoogleGenAI, Modality, Type } from "@google/genai";

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

const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
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

export const generateDemonstrationAudio = async (text: string): Promise<string> => {
  const ai = getAiClient();
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' }, // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio generated");
    
    return `data:audio/wav;base64,${base64Audio}`;
  } catch (error) {
    console.error("TTS error:", error);
    throw error;
  }
};