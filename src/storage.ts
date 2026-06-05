// Local persistence for todos using AsyncStorage.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Todo } from "./types";

const STORAGE_KEY = "@voice_todo/todos";
const LANG_KEY = "@voice_todo/lang";

export async function loadTodos(): Promise<Todo[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Todo[]) : [];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("Failed to load todos:", message);
    return [];
  }
}

export async function saveTodos(todos: Todo[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("Failed to save todos:", message);
  }
}

export async function loadLang(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LANG_KEY);
  } catch {
    return null;
  }
}

export async function saveLang(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LANG_KEY, code);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("Failed to save language:", message);
  }
}
