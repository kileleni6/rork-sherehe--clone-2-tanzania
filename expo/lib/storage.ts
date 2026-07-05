import { Platform } from "react-native";

import { supabase } from "@/lib/supabase";

/**
 * Bucket used to store guest-captured event photos.
 *
 * The bucket itself, RLS policies and the 30-day retention pg_cron job
 * are provisioned by `supabase/migrations/0001_event_photos.sql`.
 *
 * Layout: `<eventId>/<photoId>.<ext>`
 */
export const EVENT_PHOTOS_BUCKET = "event-photos" as const;

/** How long a photo is retained on the server after upload. */
export const STORAGE_RETENTION_DAYS = 30 as const;
const STORAGE_RETENTION_MS = STORAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export interface UploadedPhoto {
  /** Public URL that can be rendered directly */
  publicUrl: string;
  /** Object path inside the bucket, used for deletion / signed URLs */
  storagePath: string;
  /** Epoch ms when the upload completed */
  uploadedAt: number;
  /** Epoch ms when the server will delete the object */
  expiresAt: number;
}

interface UploadOptions {
  eventId: string;
  photoId: string;
  /** Local file URI (e.g. from expo-image-picker / camera) or a remote URL */
  uri: string;
  contentType?: string;
}

/** Compute the absolute deadline for a photo uploaded at `uploadedAt`. */
export function computeExpiresAt(uploadedAt: number): number {
  return uploadedAt + STORAGE_RETENTION_MS;
}

/** True when `expiresAt` is in the past (i.e. the server will/has purged it). */
export function isExpired(expiresAt: number | undefined, now: number = Date.now()): boolean {
  if (!expiresAt) return false;
  return expiresAt <= now;
}

function inferContentType(uri: string, fallback: string = "image/jpeg"): string {
  const lower = uri.split("?")[0].toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return fallback;
}

function extFromContentType(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("heic")) return "heic";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

async function uriToBlob(uri: string): Promise<Blob | null> {
  try {
    const res = await fetch(uri);
    if (!res.ok) {
      console.log(`[storage] fetch photo ${res.status} from ${uri.slice(0, 60)}`);
      return null;
    }
    return await res.blob();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.log("[storage] uriToBlob error:", msg);
    return null;
  }
}

async function safeFetchArrayBuffer(uri: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(uri);
    if (!res.ok) {
      console.log(`[storage] fetch arrayBuffer ${res.status} from ${uri.slice(0, 60)}`);
      return null;
    }
    return await res.arrayBuffer();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.log("[storage] safeFetchArrayBuffer error:", msg);
    return null;
  }
}

/**
 * Upload a guest photo to Supabase Storage.
 *
 * Falls back to the original URI (no storagePath) if the upload fails so a
 * flaky network never blocks the guest from "taking" the shot — we just keep
 * the local copy until they retry.
 */
export async function uploadEventPhoto(opts: UploadOptions): Promise<UploadedPhoto | null> {
  const { eventId, photoId, uri } = opts;
  try {
    const contentType = opts.contentType ?? inferContentType(uri);
    const ext = extFromContentType(contentType);
    const storagePath = `${eventId}/${photoId}.${ext}`;

    const rawBody: Blob | ArrayBuffer | null = Platform.OS === "web"
      ? (await uriToBlob(uri))
      : (await safeFetchArrayBuffer(uri));

    if (!rawBody) {
      console.log("[storage] failed to fetch photo binary, skipping upload");
      return null;
    }

    const body = rawBody;

    const { error } = await supabase.storage
      .from(EVENT_PHOTOS_BUCKET)
      .upload(storagePath, body as Blob, {
        contentType,
        upsert: false,
        cacheControl: "3600",
      });
    if (error) {
      console.log("[storage] upload failed", error.message);
      return null;
    }

    const { data } = supabase.storage.from(EVENT_PHOTOS_BUCKET).getPublicUrl(storagePath);
    const uploadedAt = Date.now();
    return {
      publicUrl: data.publicUrl,
      storagePath,
      uploadedAt,
      expiresAt: computeExpiresAt(uploadedAt),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.log("[storage] uploadEventPhoto error", msg);
    return null;
  }
}

/** Best-effort delete (used when the host removes a photo before retention kicks in). */
export async function deleteEventPhoto(storagePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage.from(EVENT_PHOTOS_BUCKET).remove([storagePath]);
    if (error) {
      console.log("[storage] delete failed", error.message);
      return false;
    }
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.log("[storage] deleteEventPhoto error", msg);
    return false;
  }
}
