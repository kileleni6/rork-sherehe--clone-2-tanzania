/**
 * SHEREHE push + local notifications.
 *
 * - `expo-notifications` ships with Expo Go for *local* notifications, but
 *   remote push tokens require a dev/prod build with the proper APNs/FCM keys.
 * - We lazy-handle that: local scheduling always works; `registerForPushAsync`
 *   returns `null` in Expo Go or on web so the UI can adapt gracefully.
 */

import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Foreground presentation — show banner + play sound when a notification
// arrives while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface PushRegistration {
  token: string | null;
  granted: boolean;
  mocked: boolean;
}

const isExpoGo = Constants.executionEnvironment === "storeClient";

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync("default", {
      name: "General",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FFD166",
    });
  } catch (e) {
    console.log("[notifications] channel failed", e);
  }
}

/**
 * Request notification permission. Safe to call repeatedly.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === "web") return false;
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return true;
    const ask = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    return ask.granted;
  } catch (e) {
    console.log("[notifications] permission failed", e);
    return false;
  }
}

/**
 * Register for push notifications and return the Expo push token. Returns
 * `null` (with `mocked: true`) when running in Expo Go / web / simulator.
 */
export async function registerForPushAsync(): Promise<PushRegistration> {
  if (Platform.OS === "web") {
    return { token: null, granted: false, mocked: true };
  }
  await ensureAndroidChannel();
  const granted = await requestNotificationPermission();
  if (!granted) return { token: null, granted: false, mocked: false };
  if (isExpoGo) {
    console.log("[notifications] running in Expo Go — push token unavailable");
    return { token: null, granted: true, mocked: true };
  }
  if (!Device.isDevice) {
    console.log("[notifications] simulator detected — skipping push token");
    return { token: null, granted: true, mocked: true };
  }
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      process.env.EXPO_PUBLIC_PROJECT_ID;
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return { token: tokenResp.data, granted: true, mocked: false };
  } catch (e) {
    console.log("[notifications] token error", e);
    return { token: null, granted: true, mocked: false };
  }
}

/**
 * Schedule a local notification (works in Expo Go too).
 */
export async function scheduleLocalNotification(args: {
  title: string;
  body: string;
  date: Date;
  data?: Record<string, unknown>;
}): Promise<string | null> {
  try {
    if (Platform.OS === "web") return null;
    if (args.date.getTime() <= Date.now()) return null;
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: args.title, body: args.body, data: args.data ?? {} },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: args.date,
      },
    });
    return id;
  } catch (e) {
    console.log("[notifications] schedule failed", e);
    return null;
  }
}

/**
 * Schedule a 24h-before event reminder. No-op if the reminder time is in
 * the past.
 */
export async function scheduleEventReminder(args: {
  eventId: string;
  title: string;
  startsAt: number;
}): Promise<string | null> {
  const remindAt = new Date(args.startsAt - 24 * 60 * 60 * 1000);
  if (remindAt.getTime() <= Date.now()) return null;
  return scheduleLocalNotification({
    title: "Tomorrow's celebration",
    body: `${args.title} starts in 24 hours.`,
    date: remindAt,
    data: { eventId: args.eventId, kind: "event_reminder" },
  });
}

export async function cancelNotification(id: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (e) {
    console.log("[notifications] cancel failed", e);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.log("[notifications] cancel-all failed", e);
  }
}
