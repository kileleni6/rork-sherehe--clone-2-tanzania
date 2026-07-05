import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { Alert, Platform } from "react-native";

/** Pad a number to 2 digits */
function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format epoch ms to iCal UTC string: YYYYMMDDTHHMMSSZ */
function toICalUtc(ts: number): string {
  const d = new Date(ts);
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTs: number;
  /** Duration in minutes. Defaults to 3h. */
  durationMin?: number;
  venue?: string;
  description?: string;
  url?: string;
}

/**
 * Add the event to the user's calendar. Strategy:
 *  - Try the Google Calendar render URL (works everywhere; opens in browser/app picker)
 *  - On failure, copy the .ics text + URL to clipboard with a friendly alert
 */
export async function addToCalendar(ev: CalendarEvent): Promise<void> {
  const dur = (ev.durationMin ?? 180) * 60 * 1000;
  const startUtc = toICalUtc(ev.startTs);
  const endUtc = toICalUtc(ev.startTs + dur);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${startUtc}/${endUtc}`,
    details: [ev.description ?? "", ev.url ?? ""].filter(Boolean).join("\n\n"),
    location: ev.venue ?? "",
  });
  const url = `https://calendar.google.com/calendar/render?${params.toString()}`;

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return;
    }
  } catch (e) {
    console.log("[calendar] openURL failed", e);
  }

  try {
    await Clipboard.setStringAsync(url);
    Alert.alert(
      "Add to calendar",
      Platform.OS === "web"
        ? "We've copied a calendar link. Paste it in your browser to add the event."
        : "We've copied a calendar link. Open it in Safari or Chrome to add the event."
    );
  } catch {
    Alert.alert("Add to calendar", url);
  }
}

/** Build the ICS text (kept for future native sharing of .ics files). */
export function buildIcs(ev: CalendarEvent): string {
  const dur = (ev.durationMin ?? 180) * 60 * 1000;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SHEREHE//EN",
    "BEGIN:VEVENT",
    `UID:${ev.id}@sherehe.app`,
    `DTSTAMP:${toICalUtc(Date.now())}`,
    `DTSTART:${toICalUtc(ev.startTs)}`,
    `DTEND:${toICalUtc(ev.startTs + dur)}`,
    `SUMMARY:${(ev.title ?? "").replace(/\n/g, " ")}`,
    `DESCRIPTION:${(ev.description ?? "").replace(/\n/g, "\\n")}`,
    `LOCATION:${(ev.venue ?? "").replace(/\n/g, " ")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
