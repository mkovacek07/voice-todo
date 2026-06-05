// App configuration.
//
// AI parsing turns a spoken sentence into one or more todos and extracts dates
// intelligently (e.g. "buy milk tomorrow and call mom on Friday" -> two todos).
//
// To enable AI parsing, paste an Anthropic API key below. If left empty, the app
// falls back to an on-device parser that still splits todos and understands common
// date phrases ("today", "tomorrow", weekdays, "in 3 days", "June 5", ...).
//
// SECURITY NOTE: A key placed here ships inside the app bundle and can be extracted.
// That's fine for personal/prototype use. For a production app, proxy the request
// through your own backend instead of calling Anthropic directly from the device.
export const ANTHROPIC_API_KEY = "";

// Model used for parsing. Haiku is fast and cheap and more than capable here.
export const ANTHROPIC_MODEL = "claude-haiku-4-5";

// Languages offered for speech recognition. Add more entries here to support
// additional locales (the device must have that dictation language available).
export interface SpeechLanguage {
  code: string; // BCP-47 locale passed to the recognizer
  label: string; // shown in the UI
  flag: string; // emoji shown on the selector chip
}

export const SPEECH_LANGUAGES: SpeechLanguage[] = [
  { code: "en-US", label: "English", flag: "🇬🇧" },
  { code: "hr-HR", label: "Hrvatski", flag: "🇭🇷" },
  { code: "de-DE", label: "Deutsch", flag: "🇩🇪" },
  { code: "it-IT", label: "Italiano", flag: "🇮🇹" },
  { code: "es-ES", label: "Español", flag: "🇪🇸" },
];

// Default language used until the user picks one.
export const DEFAULT_SPEECH_LANG = SPEECH_LANGUAGES[0].code;
