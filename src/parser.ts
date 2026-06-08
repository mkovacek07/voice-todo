// Turns a raw speech transcript into one or more structured todos.
//
// Each todo is { text: string, date: "YYYY-MM-DD" }. When the speaker doesn't
// mention a date, the current date is used.
//
// Two strategies:
//   1. AI parsing via the Anthropic Messages API (when an API key is configured).
//   2. An on-device fallback that splits the sentence and extracts common dates.

import { ANTHROPIC_API_KEY, ANTHROPIC_MODEL } from "./config";
import { extractDate, extractTime, todayISO } from "./dateUtils";
import type { ParsedTodo } from "./types";

// Shape of the bits of the Anthropic Messages API response we rely on.
interface AnthropicResponse {
  content?: { text?: string }[];
}

// Split a transcript into individual todo phrases on common spoken separators.
function splitPhrases(transcript: string): string[] {
  return transcript
    .split(/\s+and then\s+|\s*[,;]\s*|\.\s+|\s+and\s+/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

// Tidy a phrase into a checklist item: trim filler and capitalize.
function tidyText(text: string): string {
  let t = text.replace(
    /^\s*(?:then|and|also|i need to|i have to|remember to|please|to)\s+/i,
    ""
  );
  t = t.replace(/\s{2,}/g, " ").trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// On-device fallback parser. No network required. `lang` is a 2-letter code
// (e.g. "en", "hr", "de") used to pick which date words to recognize.
export function parseLocally(transcript: string, lang: string = "en"): ParsedTodo[] {
  const today = todayISO();
  return splitPhrases(transcript)
    .map((phrase) => {
      const { iso, cleanedText } = extractDate(phrase, lang);
      const { time, cleanedText: noTime } = extractTime(cleanedText, lang);
      const text = tidyText(noTime);
      return {
        text,
        date: iso || today,
        ...(time ? { reminderTime: time } : {}),
      };
    })
    .filter((todo) => todo.text.length > 0);
}

// AI parser. Throws on any failure so the caller can fall back.
async function parseWithAI(transcript: string): Promise<ParsedTodo[]> {
  const today = todayISO();
  const system =
    "You convert a spoken sentence into a JSON array of todo items. " +
    "Each item is an object with fields: `text` (a short, cleaned-up task " +
    "description), `date` (an ISO date string YYYY-MM-DD), and optionally " +
    "`time` (a 24-hour clock string HH:MM) when the user mentions a time of " +
    'day (e.g. "at 9 am" -> "09:00", "at 5pm" -> "17:00", "at noon" -> ' +
    '"12:00"). Omit `time` if no time is mentioned. ' +
    `Today's date is ${today}. Resolve relative dates like "tomorrow", ` +
    '"next friday", or "in 3 days" against today. If an item has no date, use ' +
    `today (${today}). Split multiple tasks into separate items. ` +
    "Keep each task's text in the same language the user spoke (and do not " +
    "include the date or time words in `text`). " +
    "Respond with ONLY the JSON array, no prose, no markdown fences.";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      // Allows calling the API from a browser context (Expo web).
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: transcript }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error ${response.status}`);
  }

  const data = (await response.json()) as AnthropicResponse;
  const raw = data?.content?.[0]?.text ?? "";
  // Be lenient: pull the JSON array out even if the model adds stray text.
  const match = raw.match(/\[[\s\S]*\]/);
  const parsed: unknown = JSON.parse(match ? match[0] : raw);

  if (!Array.isArray(parsed)) throw new Error("Unexpected AI response shape");

  return (parsed as { text?: unknown; date?: unknown; time?: unknown }[])
    .map((item) => {
      const validTime =
        typeof item.time === "string" && /^\d{2}:\d{2}$/.test(item.time)
          ? item.time
          : undefined;
      return {
        text: String(item.text ?? "").trim(),
        date:
          typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
            ? item.date
            : today,
        ...(validTime ? { reminderTime: validTime } : {}),
      };
    })
    .filter((todo) => todo.text.length > 0);
}

// Public entry point. Always resolves to an array of todos. Uses AI when a key
// is configured and falls back to local parsing on any error.
export async function parseTranscript(
  transcript: string,
  lang: string = "en"
): Promise<ParsedTodo[]> {
  const trimmed = (transcript || "").trim();
  if (!trimmed) return [];

  if (ANTHROPIC_API_KEY) {
    try {
      const todos = await parseWithAI(trimmed);
      if (todos.length > 0) return todos;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("AI parsing failed, using local parser:", message);
    }
  }
  return parseLocally(trimmed, lang);
}
