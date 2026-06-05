# Voice Todo

A React Native (Expo) app that turns your voice into a dated todo checklist.

Speak naturally — e.g. _"Buy milk tomorrow and call mom on Friday"_ — and the app
splits it into separate todos and assigns each a date. When you don't mention a
date, today's date is used. You can also check off, edit, delete, and manually
add todos.

## Features

- 🎤 **Voice capture** via on-device speech recognition (`expo-speech-recognition`).
- 🤖 **Smart parsing**: optionally uses the Anthropic API to split one sentence into
  multiple todos and resolve dates ("next Friday", "in 3 days", "June 5"). Falls
  back to a built-in on-device parser when no API key is set.
- ✅ Checkbox, task text, and a date chip per item.
- ✏️ Edit text and date, 🗑️ delete, and ➕ manually add todos.
- 💾 Todos persist locally on the device (`AsyncStorage`).

## Project structure

```
App.tsx                      Main screen: list, mic button, status, modal wiring
src/types.ts                 Shared Todo / ParsedTodo types
src/config.ts                API key / model / language settings
src/useVoice.ts              Speech-recognition hook (start/stop, transcript)
src/parser.ts                Transcript -> [{ text, date }] (AI + local fallback)
src/dateUtils.ts             ISO date helpers + natural-language date extraction
src/storage.ts               AsyncStorage load/save
src/components/TodoItem.tsx       A single todo row
src/components/TodoEditModal.tsx  Add/edit modal with date picker
```

The project is written in **TypeScript**. Run `npx tsc --noEmit` to type-check.

## Running the app

> ⚠️ **Important:** `expo-speech-recognition` includes native code, so the voice
> feature does **not** work in the prebuilt Expo Go app. You need a *development
> build* (run on a simulator/device or via EAS).

```bash
# Install dependencies (already done if you scaffolded this repo)
npm install

# iOS (requires Xcode)
npx expo run:ios

# Android (requires Android Studio / SDK)
npx expo run:android
```

The first `run:ios` / `run:android` compiles a native dev build that includes the
microphone and speech-recognition permissions. After that you can iterate with
just the JS bundler (`npx expo start`).

On first use the app asks for microphone and speech-recognition permission.

## Enabling AI parsing (optional)

The app works out of the box with the on-device parser. To enable smarter parsing,
add an Anthropic API key in [`src/config.ts`](src/config.ts):

```ts
export const ANTHROPIC_API_KEY = "sk-ant-...";
```

> Security note: a key placed in `config.ts` ships inside the app bundle and can be
> extracted. That's fine for personal/prototype use. For production, proxy the
> request through your own backend instead of calling the API directly from the
> device.
