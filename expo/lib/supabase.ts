import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

/** Max seconds to wait for any Supabase request before giving up. */
const FETCH_TIMEOUT_S = 25;

/**
 * Wraps the global fetch with a timeout AND converts network-level failures
 * ("Failed to fetch", "Network request failed", etc.) into synthetic HTTP 503
 * responses.  This lets the Supabase client (including its internal GoTrue
 * auth refresh) handle connectivity problems gracefully through the normal
 * `{ data, error }` pattern instead of throwing unhandled promise rejections
 * that the Rork error boundary displays as a full-screen crash.
 */
function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error("Request timed out")),
    FETCH_TIMEOUT_S * 1000,
  );

  // Merge signals so an upstream caller's signal can also abort.
  const mergedInit: RequestInit = { ...init };
  if (init?.signal) {
    // Chain: if EITHER our timeout OR the original signal fires, abort.
    const originalSignal = init.signal as AbortSignal;
    // Propagate the original abort, carrying its reason if available.
    originalSignal.addEventListener(
      "abort",
      () => controller.abort(originalSignal.reason ?? new Error("Aborted by caller")),
      { once: true },
    );
  }
  mergedInit.signal = controller.signal;

  return fetch(input, mergedInit)
    .catch((err: unknown) => {
      // Convert network-layer failures into a synthetic 503 so callers (and
      // the Supabase client internals) treat it as a server-unavailable error
      // rather than an unhandled exception.
      const message =
        err instanceof Error ? err.message : "Network request failed";
      return new Response(
        JSON.stringify({ message, code: "NETWORK_ERROR" }),
        { status: 503, statusText: message, headers: { "content-type": "application/json" } },
      );
    })
    .finally(() => clearTimeout(timer));
}

import type { Event, Photo, Rsvp, ScheduleItem } from "@/types/event";
import type {
  CameraStyleId,
  EventTypeId,
  TemplateId,
  TimeOfDayId,
} from "@/constants/templates";

const FALLBACK_URL = "https://ivpeowvxgbsrdtqhiavj.supabase.co";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2cGVvd3Z4Z2JzcmR0cWhpYXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MTUwNDAsImV4cCI6MjA5NTE5MTA0MH0.UeMJX0gFCiHL1KPqJsAtUIFzFywt7tAD8Iz9rhVQIV4";

const envUrl: string = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const envKey: string = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

const supabaseUrl: string = envUrl.length > 0 ? envUrl : FALLBACK_URL;
const supabaseAnonKey: string = envKey.length > 0 ? envKey : FALLBACK_ANON_KEY;

if (!envUrl || !envKey) {
  console.warn(
    "[supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY not inlined at build time. Using bundled fallback values."
  );
}

/**
 * Shared Supabase client for the SHEREHE app.
 * Uses AsyncStorage on native for session persistence; web falls back to localStorage automatically.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === "web" ? undefined : (AsyncStorage as unknown as Storage),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
  global: {
    fetch: fetchWithTimeout,
  },
});

export const isSupabaseConfigured: boolean = Boolean(supabaseUrl && supabaseAnonKey);

// ---------------------------------------------------------------------------
// Raw DB row shapes (snake_case as they come from Postgres)
// ---------------------------------------------------------------------------

interface EventRow {
  id: string;
  user_id: string;
  name: string;
  type: string;
  custom_label: string | null;
  time_of_day: string | null;
  cover: string;
  date: string;
  venue: string;
  message: string;
  dress_code: string | null;
  schedule: ScheduleItem[];
  template: string;
  host_name: string;
  shots_per_guest: number;
  reveal_at: string;
  reveal_mode: string;
  upload_permission: string;
  privacy: string;
  passcode: string | null;
  visibility: string;
  check_in_enabled: boolean;
  is_private: boolean;
  invited: number;
  views: number;
  premium: boolean;
  created_at: string;
  updated_at: string;
}

interface RsvpRow {
  id: string;
  event_id: string;
  user_id: string | null;
  name: string;
  status: string;
  guests: number;
  note: string | null;
  pass_code: string;
  checked_in_at: string | null;
  shots_used: number;
  rejection_reason: string | null;
  phone: string | null;
  created_at: string;
}

interface PhotoRow {
  id: string;
  event_id: string;
  uri: string;
  guest_name: string;
  taken_at: string;
  filter: string | null;
  style: string | null;
  flagged: boolean;
  storage_path: string | null;
  uploaded_at: string | null;
  expires_at: string | null;
  expired: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Mappers: DB row → app type
// ---------------------------------------------------------------------------

function mapEvent(row: EventRow, rsvps: Rsvp[] = [], photos: Photo[] = []): Event {
  return {
    id: row.id,
    name: row.name,
    type: row.type as EventTypeId,
    customLabel: row.custom_label ?? undefined,
    timeOfDay: (row.time_of_day as TimeOfDayId) ?? undefined,
    cover: row.cover,
    date: new Date(row.date).getTime(),
    venue: row.venue,
    message: row.message,
    dressCode: row.dress_code ?? undefined,
    schedule: row.schedule ?? [],
    template: row.template as TemplateId,
    hostName: row.host_name,
    shotsPerGuest: row.shots_per_guest,
    revealAt: new Date(row.reveal_at).getTime(),
    revealMode: row.reveal_mode as Event["revealMode"],
    uploadPermission: row.upload_permission as Event["uploadPermission"],
    privacy: row.privacy as Event["privacy"],
    passcode: row.passcode ?? undefined,
    visibility: row.visibility as Event["visibility"],
    checkInEnabled: row.check_in_enabled,
    isPrivate: row.is_private,
    rsvps,
    photos,
    invited: row.invited,
    views: row.views,
    premium: row.premium,
  };
}

function mapRsvp(row: RsvpRow): Rsvp {
  return {
    id: row.id,
    name: row.name,
    status: row.status as Rsvp["status"],
    guests: row.guests,
    note: row.note ?? undefined,
    passCode: row.pass_code,
    checkedInAt: row.checked_in_at ? new Date(row.checked_in_at).getTime() : undefined,
    shotsUsed: row.shots_used,
    rejectionReason: row.rejection_reason ?? undefined,
    phone: row.phone ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function mapPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    uri: row.uri,
    guestName: row.guest_name,
    takenAt: new Date(row.taken_at).getTime(),
    filter: (row.filter as Photo["filter"]) ?? undefined,
    style: (row.style as CameraStyleId) ?? undefined,
    flagged: row.flagged,
    storagePath: row.storage_path ?? undefined,
    uploadedAt: row.uploaded_at ? new Date(row.uploaded_at).getTime() : undefined,
    expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : undefined,
    expired: row.expired,
  };
}

// ---------------------------------------------------------------------------
// Data-access helpers (callable from UI / providers)
// ---------------------------------------------------------------------------

/** Fetch all events visible to the current user (their own + public). */
export async function fetchAllEvents(): Promise<Event[]> {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("date", { ascending: true });
    if (error) {
      console.log("[supabase] fetchAllEvents failed", error.message);
      return [];
    }
    const events: Event[] = [];
    for (const row of data as EventRow[]) {
      const [rsvps, photos] = await Promise.all([
        fetchRsvpsForEvent(row.id),
        fetchPhotosForEvent(row.id),
      ]);
      events.push(mapEvent(row, rsvps, photos));
    }
    return events;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.log("[supabase] fetchAllEvents network error", msg);
    return [];
  }
}

/** Fetch a single event by ID. */
export async function fetchEventById(eventId: string): Promise<Event | null> {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .maybeSingle();
    if (error || !data) {
      if (error) console.log("[supabase] fetchEventById failed", error.message);
      return null;
    }
    const row = data as EventRow;
    const [rsvps, photos] = await Promise.all([
      fetchRsvpsForEvent(row.id),
      fetchPhotosForEvent(row.id),
    ]);
    return mapEvent(row, rsvps, photos);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.log("[supabase] fetchEventById network error", msg);
    return null;
  }
}

/**
 * Insert a new event. Returns the created event (with server-generated id).
 * Requires the user to be authenticated.
 */
export async function createSupabaseEvent(
  draft: Omit<Event, "id" | "rsvps" | "photos" | "invited" | "views">
): Promise<Event | null> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) {
      console.log("[supabase] createSupabaseEvent: not authenticated");
      return null;
    }

    const { data, error } = await supabase
      .from("events")
      .insert({
        user_id: userId,
        name: draft.name,
        type: draft.type,
        custom_label: draft.customLabel ?? null,
        time_of_day: draft.timeOfDay ?? null,
        cover: draft.cover,
        date: new Date(draft.date).toISOString(),
        venue: draft.venue,
        message: draft.message,
        dress_code: draft.dressCode ?? null,
        schedule: draft.schedule,
        template: draft.template,
        host_name: draft.hostName,
        shots_per_guest: draft.shotsPerGuest,
        reveal_at: new Date(draft.revealAt).toISOString(),
        reveal_mode: draft.revealMode,
        upload_permission: draft.uploadPermission ?? "all",
        privacy: draft.privacy ?? "private",
        passcode: draft.passcode ?? null,
        visibility: draft.visibility ?? "all_after_reveal",
        check_in_enabled: draft.checkInEnabled ?? false,
        is_private: draft.isPrivate,
        premium: draft.premium ?? false,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.log("[supabase] createSupabaseEvent failed", error?.message);
      return null;
    }
    return mapEvent(data as EventRow, [], []);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.log("[supabase] createSupabaseEvent network error", msg);
    return null;
  }
}

/** Update an event (owner only — enforced by RLS). */
export async function updateSupabaseEvent(
  eventId: string,
  patch: Partial<Event>
): Promise<boolean> {
  try {
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.type !== undefined) dbPatch.type = patch.type;
    if (patch.customLabel !== undefined) dbPatch.custom_label = patch.customLabel || null;
    if (patch.timeOfDay !== undefined) dbPatch.time_of_day = patch.timeOfDay || null;
    if (patch.cover !== undefined) dbPatch.cover = patch.cover;
    if (patch.date !== undefined) dbPatch.date = new Date(patch.date).toISOString();
    if (patch.venue !== undefined) dbPatch.venue = patch.venue;
    if (patch.message !== undefined) dbPatch.message = patch.message;
    if (patch.dressCode !== undefined) dbPatch.dress_code = patch.dressCode || null;
    if (patch.schedule !== undefined) dbPatch.schedule = patch.schedule;
    if (patch.template !== undefined) dbPatch.template = patch.template;
    if (patch.hostName !== undefined) dbPatch.host_name = patch.hostName;
    if (patch.shotsPerGuest !== undefined) dbPatch.shots_per_guest = patch.shotsPerGuest;
    if (patch.revealAt !== undefined) dbPatch.reveal_at = new Date(patch.revealAt).toISOString();
    if (patch.revealMode !== undefined) dbPatch.reveal_mode = patch.revealMode;
    if (patch.uploadPermission !== undefined) dbPatch.upload_permission = patch.uploadPermission;
    if (patch.privacy !== undefined) dbPatch.privacy = patch.privacy;
    if (patch.passcode !== undefined) dbPatch.passcode = patch.passcode || null;
    if (patch.visibility !== undefined) dbPatch.visibility = patch.visibility;
    if (patch.checkInEnabled !== undefined) dbPatch.check_in_enabled = patch.checkInEnabled;
    if (patch.isPrivate !== undefined) dbPatch.is_private = patch.isPrivate;
    if (patch.invited !== undefined) dbPatch.invited = patch.invited;
    if (patch.views !== undefined) dbPatch.views = patch.views;
    if (patch.premium !== undefined) dbPatch.premium = patch.premium;

    const { error } = await supabase
      .from("events")
      .update(dbPatch)
      .eq("id", eventId);

    if (error) {
      console.log("[supabase] updateSupabaseEvent failed", error.message);
      return false;
    }
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.log("[supabase] updateSupabaseEvent network error", msg);
    return false;
  }
}

/** Delete an event (owner only — enforced by RLS). Cascade deletes RSVPs + photos. */
export async function deleteSupabaseEvent(eventId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) {
      console.log("[supabase] deleteSupabaseEvent failed", error.message);
      return false;
    }
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.log("[supabase] deleteSupabaseEvent network error", msg);
    return false;
  }
}

// ---------------------------------------------------------------------------
// RSVPs
// ---------------------------------------------------------------------------

async function fetchRsvpsForEvent(eventId: string): Promise<Rsvp[]> {
  try {
    const { data, error } = await supabase
      .from("rsvps")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    if (error) {
      console.log("[supabase] fetchRsvpsForEvent failed", error.message);
      return [];
    }
    return (data as RsvpRow[]).map(mapRsvp);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.log("[supabase] fetchRsvpsForEvent network error", msg);
    return [];
  }
}

/**
 * Create an RSVP (public — no auth required, but if the user is signed in we
 * link it to their account).
 */
export async function createSupabaseRsvp(
  eventId: string,
  rsvp: Omit<Rsvp, "id" | "createdAt" | "passCode" | "checkedInAt" | "shotsUsed" | "rejectionReason">
): Promise<Rsvp | null> {
  try {
    const passCode =
      (rsvp.name.replace(/[^a-z]/gi, "").slice(0, 4).toUpperCase() || "GUEST") +
      String(Math.floor(Math.random() * 90) + 10);

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id ?? null;

    const { data, error } = await supabase
      .from("rsvps")
      .insert({
        event_id: eventId,
        user_id: userId,
        name: rsvp.name,
        status: rsvp.status,
        guests: rsvp.guests,
        note: rsvp.note ?? null,
        phone: rsvp.phone ?? null,
        pass_code: passCode,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.log("[supabase] createSupabaseRsvp failed", error?.message);
      return null;
    }
    return mapRsvp(data as RsvpRow);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.log("[supabase] createSupabaseRsvp network error", msg);
    return null;
  }
}

/**
 * Update an RSVP (check-in, reject, increment shots).
 * Requires auth — RLS enforces event ownership.
 */
export async function updateSupabaseRsvp(
  rsvpId: string,
  patch: Partial<Pick<Rsvp, "checkedInAt" | "shotsUsed" | "rejectionReason" | "guests" | "status" | "note">>
): Promise<boolean> {
  try {
    const dbPatch: Record<string, unknown> = {};
    if (patch.checkedInAt !== undefined) {
      dbPatch.checked_in_at = patch.checkedInAt ? new Date(patch.checkedInAt).toISOString() : null;
    }
    if (patch.shotsUsed !== undefined) dbPatch.shots_used = patch.shotsUsed;
    if (patch.rejectionReason !== undefined) dbPatch.rejection_reason = patch.rejectionReason || null;
    if (patch.guests !== undefined) dbPatch.guests = patch.guests;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (patch.note !== undefined) dbPatch.note = patch.note || null;

    const { error } = await supabase
      .from("rsvps")
      .update(dbPatch)
      .eq("id", rsvpId);

    if (error) {
      console.log("[supabase] updateSupabaseRsvp failed", error.message);
      return false;
    }
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.log("[supabase] updateSupabaseRsvp network error", msg);
    return false;
  }
}

/** Delete an RSVP. */
export async function deleteSupabaseRsvp(rsvpId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("rsvps").delete().eq("id", rsvpId);
    if (error) {
      console.log("[supabase] deleteSupabaseRsvp failed", error.message);
      return false;
    }
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.log("[supabase] deleteSupabaseRsvp network error", msg);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

async function fetchPhotosForEvent(eventId: string): Promise<Photo[]> {
  try {
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .eq("event_id", eventId)
      .order("taken_at", { ascending: false });
    if (error) {
      console.log("[supabase] fetchPhotosForEvent failed", error.message);
      return [];
    }
    return (data as PhotoRow[]).map(mapPhoto);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.log("[supabase] fetchPhotosForEvent network error", msg);
    return [];
  }
}

/** Add a photo record. */
export async function createSupabasePhoto(
  eventId: string,
  photo: Omit<Photo, "id" | "takenAt">
): Promise<Photo | null> {
  try {
    const now = Date.now();
    const { data, error } = await supabase
      .from("photos")
      .insert({
        event_id: eventId,
        uri: photo.uri,
        guest_name: photo.guestName,
        taken_at: new Date(now).toISOString(),
        filter: photo.filter ?? null,
        style: photo.style ?? null,
        flagged: photo.flagged ?? false,
        storage_path: photo.storagePath ?? null,
        uploaded_at: photo.uploadedAt ? new Date(photo.uploadedAt).toISOString() : null,
        expires_at: photo.expiresAt ? new Date(photo.expiresAt).toISOString() : null,
        expired: photo.expired ?? false,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.log("[supabase] createSupabasePhoto failed", error?.message);
      return null;
    }
    return mapPhoto(data as PhotoRow);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.log("[supabase] createSupabasePhoto network error", msg);
    return null;
  }
}

/** Delete a photo record by ID. */
export async function deleteSupabasePhoto(photoId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("photos").delete().eq("id", photoId);
    if (error) {
      console.log("[supabase] deleteSupabasePhoto failed", error.message);
      return false;
    }
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.log("[supabase] deleteSupabasePhoto network error", msg);
    return false;
  }
}
