"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Mic, MicOff, Loader2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MeasurementContext } from "@/lib/diabetes-types";

interface VoiceInputProps {
  onVoiceData: (data: {
    value?: number;
    time?: string;
    context?: MeasurementContext;
    notes?: string;
  }) => void;
}

// Context keywords mapping
const CONTEXT_KEYWORDS: Record<string, MeasurementContext> = {
  "צום": "fasting",
  "התעוררתי": "fasting",
  "התעוררות": "fasting",
  "קמתי": "fasting",
  "לפני ארוחה": "before-meal",
  "לפני אוכל": "before-meal",
  "לפני האוכל": "before-meal",
  "לפני הארוחה": "before-meal",
  "אחרי ארוחה": "after-meal",
  "אחרי אוכל": "after-meal",
  "אחרי האוכל": "after-meal",
  "אחרי הארוחה": "after-meal",
  "לפני שינה": "before-sleep",
  "לפני השינה": "before-sleep",
  "לפני לישון": "before-sleep",
  "לילה": "before-sleep",
  "ערב": "before-sleep",
};

// Remove duplicate words
function removeDuplicateWords(text: string): string {
  const words = text.split(/\s+/);
  const result: string[] = [];

  for (let i = 0; i < words.length; i++) {
    if (i === 0 || words[i].toLowerCase() !== words[i - 1].toLowerCase()) {
      result.push(words[i]);
    }
  }

  return result.join(" ");
}

// Hebrew word to number mapping
const HEBREW_NUMBERS: Record<string, number> = {
  "אפס": 0, "אחת": 1, "אחד": 1, "שתיים": 2, "שניים": 2, "שתים": 2,
  "שלוש": 3, "שלושה": 3, "ארבע": 4, "ארבעה": 4, "חמש": 5, "חמישה": 5,
  "שש": 6, "שישה": 6, "שבע": 7, "שבעה": 7, "שמונה": 8, "תשע": 9, "תשעה": 9,
  "עשר": 10, "עשרה": 10, "אחת עשרה": 11, "שתים עשרה": 12,
  "עשרים": 20, "שלושים": 30, "ארבעים": 40, "חמישים": 50,
  "שישים": 60, "שבעים": 70, "שמונים": 80, "תשעים": 90,
  "מאה": 100, "מאתיים": 200, "שלוש מאות": 300, "ארבע מאות": 400,
};

function convertHebrewToNumber(text: string): number | null {
  // First try direct number
  const directMatch = text.match(/\d+/);
  if (directMatch) {
    return parseInt(directMatch[0], 10);
  }
  
  // Try Hebrew word numbers
  let total = 0;
  let found = false;
  
  for (const [word, value] of Object.entries(HEBREW_NUMBERS)) {
    if (text.includes(word)) {
      total += value;
      found = true;
    }
  }
  
  return found ? total : null;
}

function parseVoiceInput(text: string): {
  value?: number;
  time?: string;
  context?: MeasurementContext;
  notes?: string;
} {
  const result: {
    value?: number;
    time?: string;
    context?: MeasurementContext;
    notes?: string;
  } = {};

  // Clean text
  let cleanText = text
    .replace(/[.,!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  cleanText = removeDuplicateWords(cleanText);

  // Find blood sugar value - first try explicit patterns
  const sugarPatterns = [
    /סוכר\s*[:=]?\s*(\d+)/,
    /רמת\s*(?:ה)?סוכר\s*[:=]?\s*(\d+)/,
    /(\d+)\s*מ"?ג/,
    /(\d{2,3})/,
  ];
  
  for (const pattern of sugarPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const value = parseInt(match[1], 10);
      if (value >= 20 && value <= 600) {
        result.value = value;
        break;
      }
    }
  }
  
  // If no number found, try Hebrew words
  if (!result.value) {
    const hebrewValue = convertHebrewToNumber(cleanText);
    if (hebrewValue && hebrewValue >= 20 && hebrewValue <= 600) {
      result.value = hebrewValue;
    }
  }

  // Fallback: find any number between 20-600
  if (!result.value) {
    const numberMatches = cleanText.match(/\d+/g);
    if (numberMatches) {
      for (const num of numberMatches) {
        const value = parseInt(num, 10);
        if (value >= 20 && value <= 600) {
          result.value = value;
          break;
        }
      }
    }
  }

  // Find time - format XX:XX or X:XX
  const timeMatch = cleanText.match(/(\d{1,2})[:\s](\d{2})/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      result.time = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    }
  } else {
    // Find time in words
    const hourWordMatch = cleanText.match(/(?:ב?שעה\s*)(\d{1,2})(?:\s*(?:ו|:|\s)?(\d{1,2})?)?/);
    if (hourWordMatch) {
      let hours = parseInt(hourWordMatch[1], 10);
      const minutes = hourWordMatch[2] ? parseInt(hourWordMatch[2], 10) : 0;

      if ((cleanText.includes("בערב") || cleanText.includes("לילה")) && hours < 12) {
        hours += 12;
      }

      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        result.time = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      }
    }

    // Handle "half" and "quarter"
    if (result.time) {
      if (cleanText.includes("וחצי")) {
        const [h] = result.time.split(":");
        result.time = `${h}:30`;
      } else if (cleanText.includes("ורבע")) {
        const [h] = result.time.split(":");
        result.time = `${h}:15`;
      }
    }
  }

  // Find context
  const sortedContexts = Object.entries(CONTEXT_KEYWORDS).sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, context] of sortedContexts) {
    if (cleanText.includes(keyword)) {
      result.context = context;
      break;
    }
  }

  // Detect context by time if not found
  if (!result.context && result.time) {
    const hours = parseInt(result.time.split(":")[0], 10);
    if (hours >= 5 && hours <= 9) {
      result.context = "fasting";
    } else if (hours >= 22 || hours <= 4) {
      result.context = "before-sleep";
    }
  }

  // Detect morning as fasting
  if (!result.context && (cleanText.includes("בוקר") || cleanText.includes("בבוקר"))) {
    result.context = "fasting";
  }

  return result;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

export function VoiceInput({ onVoiceData }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsedInfo, setParsedInfo] = useState<string>("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      setIsSupported(true);
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = "he-IL";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptText = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptText;
          } else {
            interimTranscript += transcriptText;
          }
        }

        const currentTranscript = finalTranscript || interimTranscript;
        const cleanedTranscript = removeDuplicateWords(currentTranscript);
        setTranscript(cleanedTranscript);

        if (finalTranscript) {
          const parsedData = parseVoiceInput(finalTranscript);
          onVoiceData(parsedData);

          const parts: string[] = [];
          if (parsedData.value) parts.push(`סוכר: ${parsedData.value}`);
          if (parsedData.time) parts.push(`שעה: ${parsedData.time}`);
          if (parsedData.context) {
            const contextLabels: Record<MeasurementContext, string> = {
              fasting: "צום",
              "before-meal": "לפני ארוחה",
              "after-meal": "אחרי ארוחה",
              "before-sleep": "לפני שינה",
              other: "אחר",
            };
            parts.push(`הקשר: ${contextLabels[parsedData.context]}`);
          }
          setParsedInfo(parts.join(" | "));
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onVoiceData]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      setParsedInfo("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  if (!isSupported) {
    return (
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
        <p className="text-sm text-amber-700">
          הדפדפן שלך אינו תומך בזיהוי קולי. אנא השתמש בהזנה ידנית.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant={isListening ? "destructive" : "outline"}
        size="lg"
        onClick={toggleListening}
        className={`w-full h-12 sm:h-16 text-sm sm:text-lg font-semibold gap-2 sm:gap-3 transition-all rounded-xl ${
          isListening
            ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30"
            : "bg-gradient-to-l from-teal-50 to-emerald-50 border-2 border-dashed border-teal-300 hover:border-teal-400 hover:from-teal-100 hover:to-emerald-100 text-teal-700"
        }`}
      >
        {isListening ? (
          <>
            <div className="relative">
              <MicOff className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping" />
            </div>
            <span>לחץ לעצירה</span>
          </>
        ) : (
          <>
            <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
            <span>הקלט בקול</span>
            <Volume2 className="w-4 h-4 opacity-50" />
          </>
        )}
      </Button>

      {isListening && (
        <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-l from-red-50 to-orange-50 border border-red-200 space-y-2">
          <div className="flex items-center gap-2 text-red-700">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="font-medium">מקשיב...</span>
          </div>
          {transcript && (
            <p className="text-red-600 text-sm sm:text-base leading-relaxed">
              &quot;{transcript}&quot;
            </p>
          )}
        </div>
      )}

      {parsedInfo && !isListening && (
        <div className="p-3 rounded-xl bg-gradient-to-l from-emerald-50 to-teal-50 border border-emerald-200">
          <p className="text-xs sm:text-sm text-emerald-700 font-medium text-center">
            {parsedInfo}
          </p>
        </div>
      )}

      <p className="text-[10px] sm:text-xs text-muted-foreground text-center leading-relaxed">
        דוגמה: &quot;שעה 6 וחצי בבוקר אחרי שהתעוררתי, סוכר 120&quot;
      </p>
    </div>
  );
}
