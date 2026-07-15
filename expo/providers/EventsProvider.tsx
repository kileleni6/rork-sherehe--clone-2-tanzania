import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation as useConvexMutation, useQuery as useConvexQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { TEMPLATES, type TemplateId } from "@/constants/templates";
import { fetchAllEvents } from "@/lib/supabase";
import type { Event, Photo, Rsvp, RsvpStatus, ScheduleItem } from "@/types/event";

const PROFILE_KEY = "sherehe.profile.v1";
const MIGRATION_KEY = "sherehe.convex.migrated.v1";
export const STORAGE_RETENTION_DAYS = 30 as const;

interface Profile {
  name: string;
  premium: boolean;
}

const DEFAULT_PROFILE: Profile = { name: "Host", premium: false };

function asEventId(id: string): Id<"events"> {
  return id as Id<"events">;
}

function asRsvpId(id: string): Id<"rsvps"> {
  return id as Id<"rsvps">;
}

function asPhotoId(id: string): Id<"photos"> {
  return id as Id<"photos">;
}

function inferContentType(uri: string): string {
  const lower = uri.split("?")[0].toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

/** Primary reactive data provider backed by Convex database and file storage. */
export const [EventsProvider, useEvents] = createContextHook(() => {
  const remoteEvents = useConvexQuery(api.events.list, {}) as Event[] | undefined;
  const createRemoteEvent = useConvexMutation(api.events.create);
  const updateRemoteEvent = useConvexMutation(api.events.update);
  const deleteRemoteEvent = useConvexMutation(api.events.remove);
  const importLegacyEvent = useConvexMutation(api.events.importLegacy);
  const createRemoteRsvp = useConvexMutation(api.rsvps.create);
  const setRemoteCheckIn = useConvexMutation(api.rsvps.setCheckIn);
  const setRemoteRejection = useConvexMutation(api.rsvps.setRejection);
  const generateUploadUrl = useConvexMutation(api.photos.generateUploadUrl);
  const createRemotePhoto = useConvexMutation(api.photos.create);
  const deleteRemotePhoto = useConvexMutation(api.photos.remove);

  const [profile, setProfileState] = useState<Profile>(DEFAULT_PROFILE);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(PROFILE_KEY)
      .then((raw) => {
        if (!cancelled && raw) setProfileState({ ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<Profile>) });
      })
      .catch((error: unknown) => console.log("[profile] load failed", error))
      .finally(() => {
        if (!cancelled) setIsProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // One-time bridge: copy existing Supabase records into an empty Convex deployment.
  useEffect(() => {
    if (remoteEvents === undefined || remoteEvents.length > 0) return;
    let cancelled = false;
    const migrate = async (): Promise<void> => {
      const alreadyMigrated = await AsyncStorage.getItem(MIGRATION_KEY);
      if (alreadyMigrated === "1" || cancelled) return;
      try {
        const legacyEvents = await fetchAllEvents();
        for (const event of legacyEvents) {
          if (cancelled) return;
          await importLegacyEvent({ legacyEvent: event });
        }
        await AsyncStorage.setItem(MIGRATION_KEY, "1");
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown migration error";
        console.log("[convex] legacy migration deferred", message);
      }
    };
    migrate().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [remoteEvents, importLegacyEvent]);

  const events = useMemo<Event[]>(() => remoteEvents ?? [], [remoteEvents]);

  const createEvent = useCallback(async (
    draft: Omit<Event, "id" | "rsvps" | "photos" | "invited" | "views">,
  ): Promise<Event> => {
    setIsCreating(true);
    try {
      const id = await createRemoteEvent({
        name: draft.name,
        type: draft.type,
        customLabel: draft.customLabel,
        timeOfDay: draft.timeOfDay,
        cover: draft.cover,
        date: draft.date,
        venue: draft.venue,
        message: draft.message,
        dressCode: draft.dressCode,
        schedule: draft.schedule,
        template: draft.template,
        hostName: draft.hostName,
        shotsPerGuest: draft.shotsPerGuest,
        revealAt: draft.revealAt,
        revealMode: draft.revealMode,
        uploadPermission: draft.uploadPermission,
        privacy: draft.privacy,
        passcode: draft.passcode,
        visibility: draft.visibility,
        checkInEnabled: draft.checkInEnabled,
        isPrivate: draft.isPrivate,
        premium: draft.premium,
      });
      return { ...draft, id, rsvps: [], photos: [], invited: 0, views: 0 };
    } finally {
      setIsCreating(false);
    }
  }, [createRemoteEvent]);

  const updateEvent = useCallback(async (id: string, patch: Partial<Event>): Promise<void> => {
    await updateRemoteEvent({ eventId: asEventId(id), patch });
  }, [updateRemoteEvent]);

  const deleteEvent = useCallback(async (id: string): Promise<void> => {
    await deleteRemoteEvent({ eventId: asEventId(id) });
  }, [deleteRemoteEvent]);

  const addRsvp = useCallback(async (
    eventId: string,
    draft: Omit<Rsvp, "id" | "createdAt" | "passCode">,
  ): Promise<Rsvp> => {
    const result = await createRemoteRsvp({
      eventId: asEventId(eventId),
      name: draft.name,
      status: draft.status,
      guests: draft.guests,
      note: draft.note,
      phone: draft.phone,
    });
    return {
      ...draft,
      id: result.id,
      passCode: result.passCode,
      shotsUsed: 0,
      createdAt: Date.now(),
    };
  }, [createRemoteRsvp]);

  const checkInGuest = useCallback(async (
    _eventId: string,
    rsvpId: string,
    at: number = Date.now(),
  ): Promise<void> => {
    await setRemoteCheckIn({ rsvpId: asRsvpId(rsvpId), checkedInAt: at > 0 ? at : null });
  }, [setRemoteCheckIn]);

  const rejectGuest = useCallback(async (
    _eventId: string,
    rsvpId: string,
    reason: string | null = "",
  ): Promise<void> => {
    await setRemoteRejection({
      rsvpId: asRsvpId(rsvpId),
      reason: reason === null ? null : reason || "(no reason)",
    });
  }, [setRemoteRejection]);

  const addPhoto = useCallback(async (
    eventId: string,
    draft: Omit<Photo, "id" | "takenAt">,
  ): Promise<Photo> => {
    const uploadedAt = Date.now();
    const expiresAt = uploadedAt + STORAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    let storageId: Id<"_storage"> | undefined;
    try {
      const uploadUrl = await generateUploadUrl({ eventId: asEventId(eventId) });
      const fileResponse = await fetch(draft.uri);
      if (!fileResponse.ok) throw new Error(`Could not read photo (${fileResponse.status})`);
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": inferContentType(draft.uri) },
        body: await fileResponse.blob(),
      });
      if (!uploadResponse.ok) throw new Error(`Photo upload failed (${uploadResponse.status})`);
      const payload = await uploadResponse.json() as { storageId: Id<"_storage"> };
      storageId = payload.storageId;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown upload error";
      console.log("[convex-storage] using source URL fallback", message);
    }

    const photoId = await createRemotePhoto({
      eventId: asEventId(eventId),
      storageId,
      sourceUrl: storageId ? undefined : draft.uri,
      guestName: draft.guestName,
      filter: draft.filter,
      style: draft.style,
      flagged: draft.flagged,
    });
    return {
      ...draft,
      id: photoId,
      takenAt: uploadedAt,
      storagePath: storageId,
      uploadedAt,
      expiresAt,
    };
  }, [createRemotePhoto, generateUploadUrl]);

  const removePhoto = useCallback(async (_eventId: string, photoId: string): Promise<void> => {
    await deleteRemotePhoto({ photoId: asPhotoId(photoId) });
  }, [deleteRemotePhoto]);

  const reconcileRetention = useCallback(async (): Promise<void> => {
    // Convex runs the authoritative purge hourly; reactive queries update automatically.
  }, []);

  const unlockGallery = useCallback(async (eventId: string): Promise<void> => {
    await updateEvent(eventId, { revealAt: Date.now() - 1000 });
  }, [updateEvent]);

  const setProfile = useCallback(async (patch: Partial<Profile>): Promise<void> => {
    const next = { ...profile, ...patch };
    setProfileState(next);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  }, [profile]);

  const upcoming = useMemo<Event[]>(
    () => [...events].sort((a, b) => a.date - b.date),
    [events],
  );

  const findById = useCallback(
    (id: string | undefined): Event | undefined => events.find((event) => event.id === id),
    [events],
  );

  return {
    events,
    upcoming,
    profile,
    loading: remoteEvents === undefined || isProfileLoading,
    findById,
    createEvent,
    creating: isCreating,
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
  return TEMPLATES.find((template) => template.id === id) ?? TEMPLATES[0];
}

export function rsvpStats(rsvps: Rsvp[]) {
  const yes = rsvps.filter((rsvp) => rsvp.status === "yes");
  const maybe = rsvps.filter((rsvp) => rsvp.status === "maybe");
  const no = rsvps.filter((rsvp) => rsvp.status === "no");
  const attendingCount = yes.reduce((sum, rsvp) => sum + 1 + rsvp.guests, 0);
  return { yes: yes.length, maybe: maybe.length, no: no.length, attendingCount, total: rsvps.length };
}

export type { RsvpStatus, ScheduleItem };
