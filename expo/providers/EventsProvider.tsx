import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { STOCK_SHOTS, TEMPLATES, type TemplateId } from "@/constants/templates";
import {
  computeExpiresAt,
  deleteEventPhoto,
  isExpired,
  STORAGE_RETENTION_DAYS,
  uploadEventPhoto,
} from "@/lib/storage";
import {
  createSupabaseEvent,
  createSupabasePhoto,
  createSupabaseRsvp,
  deleteSupabaseEvent,
  deleteSupabasePhoto,
  deleteSupabaseRsvp,
  fetchAllEvents,
  fetchEventById,
  updateSupabaseEvent,
  updateSupabaseRsvp,
  isSupabaseConfigured,
} from "@/lib/supabase";
import type { Event, Photo, Rsvp, RsvpStatus, ScheduleItem } from "@/types/event";

const STORAGE_KEY = "sherehe.events.v1";
const PROFILE_KEY = "sherehe.profile.v1";

interface Profile {
  name: string;
  premium: boolean;
}

const DEFAULT_PROFILE: Profile = { name: "Host", premium: false };

function seedEvents(): Event[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return [
    {
      id: "e_demo_wedding",
      name: "Amara & Kofi",
      type: "wedding",
      cover:
        "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1600&q=80",
      date: now + 12 * day,
      venue: "The Norfolk Gardens · Nairobi",
      message:
        "Together with our families, we invite you to celebrate our union — a night of love, laughter, and dancing under the stars.",
      dressCode: "Black tie · Rose accents",
      schedule: [
        { id: "s1", time: "4:00 PM", title: "Ceremony" },
        { id: "s2", time: "5:30 PM", title: "Cocktail Hour" },
        { id: "s3", time: "7:00 PM", title: "Reception & Dinner" },
        { id: "s4", time: "10:00 PM", title: "Dancing" },
      ],
      template: "noir",
      hostName: "Amara K.",
      shotsPerGuest: 24,
      revealAt: now + 13 * day,
      revealMode: "plus24h",
      uploadPermission: "all",
      privacy: "private",
      visibility: "all_after_reveal",
      checkInEnabled: true,
      isPrivate: true,
      rsvps: [
        { id: "r1", name: "Zuri Mensah", status: "yes", guests: 2, note: "Can't wait!", createdAt: now - day, passCode: "ZURI24" },
        { id: "r2", name: "Tariq Bello", status: "yes", guests: 1, createdAt: now - day * 2, passCode: "TARI18" },
        { id: "r3", name: "Naledi Okafor", status: "maybe", guests: 1, createdAt: now - day * 3, passCode: "NALE02" },
        { id: "r4", name: "Imani Diallo", status: "yes", guests: 2, createdAt: now - day * 4, passCode: "IMAN77" },
        { id: "r5", name: "Kwame Asante", status: "no", guests: 0, note: "Sending love from Accra ❤️", createdAt: now - day * 5, passCode: "KWAM31" },
      ],
      photos: STOCK_SHOTS.slice(0, 6).map((u, i) => ({
        id: `p${i}`,
        uri: u,
        guestName: ["Zuri", "Tariq", "Imani", "Naledi", "Kojo", "Asha"][i] ?? "Guest",
        takenAt: now - i * 3600_000,
        filter: "warm",
      })),
      invited: 84,
      views: 142,
    },
    {
      id: "e_demo_bday",
      name: "Layla Turns 30",
      type: "birthday",
      cover:
        "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1600&q=80",
      date: now + 3 * day,
      venue: "Skylounge Rooftop · Lagos",
      message: "Thirty, flirty & thriving. Come sip, dance, and celebrate with me!",
      dressCode: "Glam & glitter",
      schedule: [
        { id: "s1", time: "8:00 PM", title: "Welcome cocktails" },
        { id: "s2", time: "9:30 PM", title: "Cake & toasts" },
        { id: "s3", time: "10:00 PM", title: "DJ set til late" },
      ],
      template: "rose",
      hostName: "Layla",
      shotsPerGuest: 20,
      revealAt: now + 4 * day,
      revealMode: "plus24h",
      uploadPermission: "all",
      privacy: "public",
      visibility: "all_after_reveal",
      checkInEnabled: false,
      isPrivate: false,
      rsvps: [
        { id: "r1", name: "Sade", status: "yes", guests: 1, createdAt: now - 86400000, passCode: "SADE10" },
        { id: "r2", name: "Ade", status: "yes", guests: 2, createdAt: now - 86400000, passCode: "ADE220" },
      ],
      photos: [],
      invited: 42,
      views: 67,
    },
  ];
}

/**
 * Primary data provider for events, RSVPs, passes, check-ins, and guest
 * permissions. Uses Supabase as the canonical store with AsyncStorage as a
 * local cache / offline fallback.
 *
 * Read path:
 *   1. Try Supabase → returns fresh server data.
 *   2. If Supabase fails → read from AsyncStorage cache.
 *   3. If cache is empty → seed demo events.
 *
 * Write path (mutations):
 *   1. Try Supabase → on success invalidate the query cache so the UI
 *      refreshes from the server.
 *   2. If Supabase fails → write to AsyncStorage only, keeping the app
 *      functional offline.
 */
export const [EventsProvider, useEvents] = createContextHook(() => {
  const qc = useQueryClient();

  // -- read cached events from AsyncStorage (used as fallback) ----------
  const readCache = useCallback(async (): Promise<Event[]> => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Event[];
    } catch (e) {
      console.log("[events] cache read failed", e);
    }
    return [];
  }, []);

  const writeCache = useCallback(async (events: Event[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch (e) {
      console.log("[events] cache write failed", e);
    }
  }, []);

  // -- main events query -------------------------------------------------
  const eventsQuery = useQuery({
    queryKey: ["events"],
    queryFn: async (): Promise<Event[]> => {
      // 1. Try Supabase
      if (isSupabaseConfigured) {
        try {
          const server = await fetchAllEvents();
          if (server.length > 0) {
            await writeCache(server);
            return server;
          }
          // Server returned empty (new user). Check cache.
        } catch (e) {
          console.log("[events] Supabase fetch failed, falling back to cache", e);
        }
      }

      // 2. Fall back to AsyncStorage cache
      const cached = await readCache();
      if (cached.length > 0) return cached;

      // 3. Ultimate fallback: seed demo data
      const seeded = seedEvents();
      await writeCache(seeded);
      return seeded;
    },
  });

  // -- profile (stays in AsyncStorage — not part of core tables) ---------
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile> => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        if (raw) return JSON.parse(raw) as Profile;
      } catch {}
      return DEFAULT_PROFILE;
    },
  });

  const persistProfile = useCallback(async (p: Profile) => {
    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    } catch {}
  }, []);

  // -- derived data ------------------------------------------------------
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const profile = profileQuery.data ?? DEFAULT_PROFILE;

  // -- mutations ----------------------------------------------------------

  /** Create a new event. Supabase-first, AsyncStorage fallback. */
  const createMutation = useMutation({
    mutationFn: async (
      draft: Omit<Event, "id" | "rsvps" | "photos" | "invited" | "views">
    ) => {
      // Try Supabase
      if (isSupabaseConfigured) {
        const serverEv = await createSupabaseEvent(draft);
        if (serverEv) return serverEv;
      }

      // Fallback: local-only event
      const ev: Event = {
        ...draft,
        id: `e_${Date.now()}`,
        rsvps: [],
        photos: [],
        invited: 0,
        views: 0,
      };
      const next = [ev, ...events];
      await writeCache(next);
      return ev;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });

  /** Update an event (and optionally its cached copy). */
  const updateEvent = useCallback(
    async (id: string, patch: Partial<Event>) => {
      let serverOk = false;
      if (isSupabaseConfigured) {
        serverOk = await updateSupabaseEvent(id, patch);
      }

      if (serverOk) {
        // Let the server become the source of truth on next fetch
        qc.invalidateQueries({ queryKey: ["events"] });
      } else {
        // Offline fallback: patch the local cache
        const next = events.map((e) => (e.id === id ? { ...e, ...patch } : e));
        await writeCache(next);
        qc.setQueryData(["events"], next);
      }

      // Also eagerly update the specific event if it's the one being viewed
      if (serverOk) {
        // Refresh from server after a brief delay to let replication settle
        setTimeout(() => {
          qc.invalidateQueries({ queryKey: ["events"] });
        }, 500);
      }
    },
    [events, writeCache, qc]
  );

  /** Delete an event. */
  const deleteEvent = useCallback(
    async (id: string) => {
      let serverOk = false;
      if (isSupabaseConfigured) {
        serverOk = await deleteSupabaseEvent(id);
      }

      if (serverOk) {
        qc.invalidateQueries({ queryKey: ["events"] });
      } else {
        const next = events.filter((e) => e.id !== id);
        await writeCache(next);
        qc.setQueryData(["events"], next);
      }
    },
    [events, writeCache, qc]
  );

  /** Add an RSVP for an event. */
  const addRsvp = useCallback(
    async (
      eventId: string,
      rsvp: Omit<Rsvp, "id" | "createdAt" | "passCode">
    ): Promise<Rsvp> => {
      let serverRsvp: Rsvp | null = null;
      if (isSupabaseConfigured) {
        serverRsvp = await createSupabaseRsvp(eventId, rsvp);
      }

      const fallbackId = `r_${Date.now()}`;
      const fallbackCode =
        (rsvp.name.replace(/[^a-z]/gi, "").slice(0, 4).toUpperCase() || "GUEST") +
        String(Math.floor(Math.random() * 90) + 10);
      const now = Date.now();

      if (serverRsvp) {
        // Server succeeded — also update local cache so the UI is instant
        const next = events.map((e) =>
          e.id === eventId
            ? {
                ...e,
                rsvps: [serverRsvp!, ...e.rsvps],
                invited: Math.max(e.invited, e.rsvps.length + 1),
              }
            : e
        );
        await writeCache(next);
        qc.setQueryData(["events"], next);
        return serverRsvp;
      }

      // Offline fallback
      const r: Rsvp = {
        ...rsvp,
        id: fallbackId,
        createdAt: now,
        passCode: fallbackCode,
        shotsUsed: 0,
      };
      const next = events.map((e) =>
        e.id === eventId
          ? { ...e, rsvps: [r, ...e.rsvps], invited: Math.max(e.invited, e.rsvps.length + 1) }
          : e
      );
      await writeCache(next);
      qc.setQueryData(["events"], next);
      return r;
    },
    [events, writeCache, qc]
  );

  /** Mark a guest checked-in (or undo). Pass `at = 0` to undo. */
  const checkInGuest = useCallback(
    async (eventId: string, rsvpId: string, at: number = Date.now()) => {
      let serverOk = false;
      if (isSupabaseConfigured) {
        serverOk = await updateSupabaseRsvp(rsvpId, {
          checkedInAt: at > 0 ? at : undefined,
        });
      }

      if (serverOk) {
        qc.invalidateQueries({ queryKey: ["events"] });
      } else {
        const next = events.map((e) =>
          e.id === eventId
            ? {
                ...e,
                rsvps: e.rsvps.map((r) =>
                  r.id === rsvpId ? { ...r, checkedInAt: at > 0 ? at : undefined } : r
                ),
              }
            : e
        );
        await writeCache(next);
        qc.setQueryData(["events"], next);
      }
    },
    [events, writeCache, qc]
  );

  /** Reject a guest at the door with an optional reason. Pass `null` to undo. */
  const rejectGuest = useCallback(
    async (eventId: string, rsvpId: string, reason: string | null = "") => {
      let serverOk = false;
      if (isSupabaseConfigured) {
        serverOk = await updateSupabaseRsvp(rsvpId, {
          rejectionReason: reason === null ? undefined : reason || "(no reason)",
        });
      }

      if (serverOk) {
        qc.invalidateQueries({ queryKey: ["events"] });
      } else {
        const next = events.map((e) =>
          e.id === eventId
            ? {
                ...e,
                rsvps: e.rsvps.map((r) =>
                  r.id === rsvpId
                    ? {
                        ...r,
                        rejectionReason:
                          reason === null ? undefined : reason || "(no reason)",
                      }
                    : r
                ),
              }
            : e
        );
        await writeCache(next);
        qc.setQueryData(["events"], next);
      }
    },
    [events, writeCache, qc]
  );

  /** Add a photo to an event (with Supabase Storage upload + DB record). */
  const addPhoto = useCallback(
    async (eventId: string, photo: Omit<Photo, "id" | "takenAt">) => {
      const id = `p_${Date.now()}`;
      const takenAt = Date.now();

      // Upload to Supabase Storage
      const uploaded = await uploadEventPhoto({ eventId, photoId: id, uri: photo.uri });

      const p: Photo = {
        ...photo,
        id,
        takenAt,
        uri: uploaded?.publicUrl ?? photo.uri,
        storagePath: uploaded?.storagePath,
        uploadedAt: uploaded?.uploadedAt,
        expiresAt: uploaded?.expiresAt ?? computeExpiresAt(takenAt),
      };

      // Try Supabase DB record
      let dbOk = false;
      if (isSupabaseConfigured) {
        const dbPhoto = await createSupabasePhoto(eventId, p);
        if (dbPhoto) {
          dbOk = true;
          p.id = dbPhoto.id; // use server-generated ID
        }
      }

      // Local cache — always update so UI reflects immediately
      const next = events.map((e) =>
        e.id === eventId ? { ...e, photos: [p, ...e.photos] } : e
      );
      await writeCache(next);

      if (dbOk) {
        qc.invalidateQueries({ queryKey: ["events"] });
      } else {
        qc.setQueryData(["events"], next);
      }

      return p;
    },
    [events, writeCache, qc]
  );

  /** Remove a photo. */
  const removePhoto = useCallback(
    async (eventId: string, photoId: string) => {
      const target = events
        .find((e) => e.id === eventId)
        ?.photos.find((p) => p.id === photoId);

      // Delete from Storage bucket
      if (target?.storagePath) {
        deleteEventPhoto(target.storagePath).catch(() => {});
      }

      // Try Supabase DB delete
      let dbOk = false;
      if (isSupabaseConfigured) {
        dbOk = await deleteSupabasePhoto(photoId);
      }

      const next = events.map((e) =>
        e.id === eventId
          ? { ...e, photos: e.photos.filter((p) => p.id !== photoId) }
          : e
      );
      await writeCache(next);

      if (dbOk) {
        qc.invalidateQueries({ queryKey: ["events"] });
      } else {
        qc.setQueryData(["events"], next);
      }
    },
    [events, writeCache, qc]
  );

  /** Strip purged photos from local cache. */
  const reconcileRetention = useCallback(async () => {
    const now = Date.now();
    let changed = false;
    const next = events.map((e) => {
      const kept = e.photos.filter((p) => !isExpired(p.expiresAt, now));
      if (kept.length !== e.photos.length) changed = true;
      return kept.length !== e.photos.length ? { ...e, photos: kept } : e;
    });
    if (changed) {
      await writeCache(next);
      qc.setQueryData(["events"], next);
    }
  }, [events, writeCache, qc]);

  /** Immediately unlock the gallery. */
  const unlockGallery = useCallback(
    async (eventId: string) => {
      await updateEvent(eventId, { revealAt: Date.now() - 1000 });
    },
    [updateEvent]
  );

  /** Update profile (AsyncStorage only). */
  const setProfile = useCallback(
    async (p: Partial<Profile>) => {
      const next = { ...profile, ...p };
      await persistProfile(next);
      qc.setQueryData(["profile"], next);
    },
    [profile, persistProfile, qc]
  );

  // -- convenience ---------------------------------------------------------

  const upcoming = useMemo(
    () => [...events].sort((a, b) => a.date - b.date),
    [events]
  );

  const findById = useCallback(
    (id: string | undefined): Event | undefined =>
      events.find((e) => e.id === id),
    [events]
  );

  return {
    events,
    upcoming,
    profile,
    loading: eventsQuery.isLoading,
    findById,
    createEvent: createMutation.mutateAsync,
    creating: createMutation.isPending,
    updateEvent,
    deleteEvent,
    addRsvp,
    checkInGuest,
    rejectGuest,
    addPhoto,
    removePhoto,
    reconcileRetention,
    retentionDays: STORAGE_RETENTION_DAYS,
    unlockGallery,
    setProfile,
  };
});

export function getTemplate(id: TemplateId) {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export function rsvpStats(rsvps: Rsvp[]) {
  const yes = rsvps.filter((r) => r.status === "yes");
  const maybe = rsvps.filter((r) => r.status === "maybe");
  const no = rsvps.filter((r) => r.status === "no");
  const attendingCount = yes.reduce((s, r) => s + 1 + r.guests, 0);
  return {
    yes: yes.length,
    maybe: maybe.length,
    no: no.length,
    attendingCount,
    total: rsvps.length,
  };
}

export type { RsvpStatus, ScheduleItem };
