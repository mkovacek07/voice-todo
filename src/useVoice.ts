// Hook wrapping expo-speech-recognition for on-device speech-to-text.
//
// Exposes listening state, the live (interim) transcript, and start/stop
// controls. When a recognition session ends, `onResult` is called with the
// final transcript text.

import { useCallback, useRef, useState } from "react";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { DEFAULT_SPEECH_LANG } from "./config";

export interface UseVoiceOptions {
  onResult?: (transcript: string) => void;
  lang?: string; // BCP-47 locale, e.g. "en-US" or "hr-HR"
}

export interface UseVoiceResult {
  isListening: boolean;
  transcript: string;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

export function useVoice({
  onResult,
  lang = DEFAULT_SPEECH_LANG,
}: UseVoiceOptions = {}): UseVoiceResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const finalRef = useRef(""); // last transcript flagged isFinal
  const latestRef = useRef(""); // most recent transcript of any kind
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const langRef = useRef(lang); // always-current language for start()
  langRef.current = lang;

  useSpeechRecognitionEvent("start", () => setIsListening(true));

  useSpeechRecognitionEvent("result", (event) => {
    const t = event.results?.[0]?.transcript ?? "";
    setTranscript(t);
    latestRef.current = t;
    if (event.isFinal) finalRef.current = t;
  });

  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
    const text = (finalRef.current || latestRef.current).trim();
    if (text && onResultRef.current) onResultRef.current(text);
  });

  useSpeechRecognitionEvent("error", (event) => {
    // "no-speech" just means the user didn't say anything; not worth surfacing.
    if (event.error && event.error !== "no-speech") {
      setError(event.message || event.error);
    }
    setIsListening(false);
  });

  const start = useCallback(async () => {
    setError(null);
    setTranscript("");
    finalRef.current = "";
    latestRef.current = "";

    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setError("Microphone and speech permission are required.");
      return;
    }

    ExpoSpeechRecognitionModule.start({
      lang: langRef.current,
      interimResults: true,
      continuous: false,
    });
  }, []);

  const stop = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  return { isListening, transcript, error, start, stop };
}
