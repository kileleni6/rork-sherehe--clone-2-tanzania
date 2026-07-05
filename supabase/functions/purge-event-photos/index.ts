// SHEREHE — 30-day photo retention edge function.
//
// Deletes every object in the `event-photos` Supabase Storage bucket whose
// `created_at` is older than the retention window. Designed to be invoked by
// the `sherehe-purge-event-photos` pg_cron job (see migrations/0002), but is
// safe to trigger manually for testing.
//
// Deploy with:
//   supabase functions deploy purge-event-photos --no-verify-jwt
//
// Schedule with the SQL migration (pg_cron + pg_net) so the worker runs hourly.
//
// Required env (set with `supabase secrets set`):
//   SUPABASE_URL                — your project URL
//   SUPABASE_SERVICE_ROLE_KEY   — service role key (server-side only)
//   PURGE_SHARED_SECRET         — optional bearer token guarding the endpoint.
//                                 If set, callers must pass it as
//                                 `Authorization: Bearer <secret>`.
//
// Behaviour:
//   - Lists objects in pages of 1000 (Storage API limit).
//   - Deletes any older than RETENTION_DAYS in batches of 100.
//   - Returns `{ scanned, purged }` for observability.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const BUCKET = "event-photos";
const RETENTION_DAYS = 30;
const PAGE_SIZE = 1000;
const DELETE_BATCH = 100;

interface StorageObject {
  name: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, unknown>;
}

function isExpired(createdAt: string | undefined, cutoffMs: number): boolean {
  if (!createdAt) return false;
  const ts = Date.parse(createdAt);
  if (Number.isNaN(ts)) return false;
  return ts < cutoffMs;
}

async function purge(): Promise<{ scanned: number; purged: number; error?: string }> {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return { scanned: 0, purged: 0, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" };
  }
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

  let scanned = 0;
  let purged = 0;

  // Recursively walk top-level "folders" (eventId prefixes).
  const { data: roots, error: rootErr } = await supabase
    .storage
    .from(BUCKET)
    .list("", { limit: PAGE_SIZE });
  if (rootErr) {
    return { scanned, purged, error: rootErr.message };
  }

  const prefixes = (roots ?? [])
    .filter((entry: any) => entry && !entry.id) // folders have id === null
    .map((entry: any) => entry.name as string);

  for (const prefix of prefixes) {
    let offset = 0;
    // Page through this prefix.
    while (true) {
      const { data, error } = await supabase
        .storage
        .from(BUCKET)
        .list(prefix, { limit: PAGE_SIZE, offset, sortBy: { column: "created_at", order: "asc" } });
      if (error) {
        return { scanned, purged, error: error.message };
      }
      const items = (data ?? []) as StorageObject[];
      if (items.length === 0) break;

      const expired = items.filter((it) => isExpired(it.created_at, cutoff));
      scanned += items.length;

      if (expired.length > 0) {
        for (let i = 0; i < expired.length; i += DELETE_BATCH) {
          const slice = expired
            .slice(i, i + DELETE_BATCH)
            .map((it) => `${prefix}/${it.name}`);
          const { error: delErr } = await supabase.storage.from(BUCKET).remove(slice);
          if (delErr) {
            return { scanned, purged, error: delErr.message };
          }
          purged += slice.length;
        }
      }

      if (items.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }

  return { scanned, purged };
}

Deno.serve(async (req: Request) => {
  const shared = Deno.env.get("PURGE_SHARED_SECRET");
  if (shared) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${shared}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
  }

  try {
    const result = await purge();
    const status = result.error ? 500 : 200;
    return new Response(JSON.stringify(result), {
      status,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
