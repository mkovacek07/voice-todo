// Local notification scheduling for per-todo reminders.
//
// A todo with `reminderTime` ("HH:MM") gets a notification scheduled on its
// date at that time. The returned id is stored on the todo so it can be
// cancelled/rescheduled later.

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { fromISODate } from "./dateUtils";
import type { Todo } from "./types";

const CHANNEL_ID = "reminders";

// Show reminders even when the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let permissionAsked = false;

export async function ensurePermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  // Only prompt once per session to avoid nagging.
  if (permissionAsked && !current.canAskAgain) return false;
  permissionAsked = true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Todo reminders",
    importance: Notifications.AndroidImportance.HIGH,
  });
}

// Combine an ISO date ("YYYY-MM-DD") and time ("HH:MM") into a local Date.
export function reminderDate(dateIso: string, time: string): Date {
  const d = fromISODate(dateIso);
  const [hh, mm] = time.split(":").map(Number);
  d.setHours(hh || 0, mm || 0, 0, 0);
  return d;
}

// Schedule a reminder for a todo. Returns the notification id, or undefined if
// nothing was scheduled (no reminder, time already passed, or permission
// denied).
export async function scheduleTodoReminder(
  todo: Todo
): Promise<string | undefined> {
  if (!todo.reminderTime || todo.done) return undefined;

  const when = reminderDate(todo.date, todo.reminderTime);
  if (when.getTime() <= Date.now()) return undefined; // in the past

  if (!(await ensurePermissions())) return undefined;
  await ensureAndroidChannel();

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Todo reminder",
      body: todo.text,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
      channelId: CHANNEL_ID,
    },
  });
}

export async function cancelReminder(id?: string): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already fired or unknown id — nothing to do.
  }
}
