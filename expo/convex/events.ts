import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const eventDraft = {
  ownerId: v.optional(v.string()),
  name: v.string(),
  type: v.string(),
  customLabel: v.optional(v.string()),
  timeOfDay: v.optional(v.string()),
  cover: v.string(),
  date: v.number(),
  venue: v.string(),
  message: v.string(),
  dressCode: v.optional(v.string()),
  schedule: v.array(v.object({ id: v.string(), time: v.string(), title: v.string() })),
  template: v.string(),
  hostName: v.string(),
  shotsPerGuest: v.number(),
  revealAt: v.number(),
  revealMode: v.optional(v.string()),
  uploadPermission: v.optional(v.string()),
  privacy: v.optional(v.string()),
  passcode: v.optional(v.string()),
  visibility: v.optional(v.string()),
  checkInEnabled: v.optional(v.boolean()),
  isPrivate: v.boolean(),
  premium: v.optional(v.boolean()),
};

async function expandEvent(ctx: any, event: any) {
  const rsvps = await ctx.db
    .query("rsvps")
    .withIndex("by_event", (q: any) => q.eq("eventId", event._id))
    .order("desc")
    .collect();
  const photoRows = await ctx.db
    .query("photos")
    .withIndex("by_event", (q: any) => q.eq("eventId", event._id))
    .order("desc")
    .collect();
  const photos = await Promise.all(
    photoRows.map(async (photo: any) => ({
      id: photo._id,
      uri: (photo.storageId ? await ctx.storage.getUrl(photo.storageId) : photo.sourceUrl) ?? "",
      guestName: photo.guestName,
      takenAt: photo.takenAt,
      filter: photo.filter,
      style: photo.style,
      flagged: photo.flagged,
      storagePath: photo.storageId,
      uploadedAt: photo.uploadedAt,
      expiresAt: photo.expiresAt,
    })),
  );
  return {
    id: event._id,
    name: event.name,
    type: event.type,
    customLabel: event.customLabel,
    timeOfDay: event.timeOfDay,
    cover: event.cover,
    date: event.date,
    venue: event.venue,
    message: event.message,
    dressCode: event.dressCode,
    schedule: event.schedule,
    template: event.template,
    hostName: event.hostName,
    shotsPerGuest: event.shotsPerGuest,
    revealAt: event.revealAt,
    revealMode: event.revealMode,
    uploadPermission: event.uploadPermission,
    privacy: event.privacy,
    passcode: event.passcode,
    visibility: event.visibility,
    checkInEnabled: event.checkInEnabled,
    isPrivate: event.isPrivate,
    invited: event.invited,
    views: event.views,
    premium: event.premium,
    rsvps: rsvps.map((rsvp: any) => ({
      id: rsvp._id,
      name: rsvp.name,
      status: rsvp.status,
      guests: rsvp.guests,
      note: rsvp.note,
      phone: rsvp.phone,
      passCode: rsvp.passCode,
      checkedInAt: rsvp.checkedInAt,
      shotsUsed: rsvp.shotsUsed,
      rejectionReason: rsvp.rejectionReason,
      createdAt: rsvp.createdAt,
    })),
    photos,
  };
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("events").withIndex("by_date").order("asc").collect();
    return await Promise.all(rows.map((row) => expandEvent(ctx, row)));
  },
});

export const get = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    return event ? await expandEvent(ctx, event) : null;
  },
});

export const create = mutation({
  args: eventDraft,
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("events", {
      ...args,
      invited: 0,
      views: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: { eventId: v.id("events"), patch: v.any() },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    const { id: _id, rsvps: _rsvps, photos: _photos, ...patch } = args.patch ?? {};
    await ctx.db.patch(args.eventId, { ...patch, updatedAt: Date.now() });
  },
});

export const importLegacy = mutation({
  args: { legacyEvent: v.any() },
  handler: async (ctx, args) => {
    const legacy = args.legacyEvent ?? {};
    const legacyId = String(legacy.id ?? "");
    if (!legacyId) throw new Error("Legacy event ID is required");
    const existing = await ctx.db
      .query("events")
      .withIndex("by_legacy_id", (q) => q.eq("legacyId", legacyId))
      .unique();
    if (existing) return existing._id;

    const now = Date.now();
    const eventId = await ctx.db.insert("events", {
      legacyId,
      ownerId: typeof legacy.ownerId === "string" ? legacy.ownerId : undefined,
      name: String(legacy.name ?? "Untitled event"),
      type: String(legacy.type ?? "custom"),
      customLabel: legacy.customLabel,
      timeOfDay: legacy.timeOfDay,
      cover: String(legacy.cover ?? ""),
      date: Number(legacy.date ?? now),
      venue: String(legacy.venue ?? "TBD"),
      message: String(legacy.message ?? ""),
      dressCode: legacy.dressCode,
      schedule: Array.isArray(legacy.schedule) ? legacy.schedule : [],
      template: String(legacy.template ?? "noir"),
      hostName: String(legacy.hostName ?? "Host"),
      shotsPerGuest: Number(legacy.shotsPerGuest ?? 10),
      revealAt: Number(legacy.revealAt ?? now),
      revealMode: legacy.revealMode,
      uploadPermission: legacy.uploadPermission,
      privacy: legacy.privacy,
      passcode: legacy.passcode,
      visibility: legacy.visibility,
      checkInEnabled: legacy.checkInEnabled,
      isPrivate: Boolean(legacy.isPrivate ?? true),
      invited: Number(legacy.invited ?? 0),
      views: Number(legacy.views ?? 0),
      premium: legacy.premium,
      createdAt: now,
      updatedAt: now,
    });

    for (const rsvp of Array.isArray(legacy.rsvps) ? legacy.rsvps : []) {
      await ctx.db.insert("rsvps", {
        eventId,
        name: String(rsvp.name ?? "Guest"),
        status: String(rsvp.status ?? "yes"),
        guests: Number(rsvp.guests ?? 0),
        note: rsvp.note,
        phone: rsvp.phone,
        passCode: String(rsvp.passCode ?? "GUEST00"),
        checkedInAt: rsvp.checkedInAt,
        shotsUsed: Number(rsvp.shotsUsed ?? 0),
        rejectionReason: rsvp.rejectionReason,
        createdAt: Number(rsvp.createdAt ?? now),
      });
    }
    for (const photo of Array.isArray(legacy.photos) ? legacy.photos : []) {
      if (!photo.uri) continue;
      const uploadedAt = Number(photo.uploadedAt ?? photo.takenAt ?? now);
      await ctx.db.insert("photos", {
        eventId,
        sourceUrl: String(photo.uri),
        guestName: String(photo.guestName ?? "Guest"),
        takenAt: Number(photo.takenAt ?? uploadedAt),
        filter: photo.filter,
        style: photo.style,
        flagged: Boolean(photo.flagged ?? false),
        uploadedAt,
        expiresAt: Number(photo.expiresAt ?? uploadedAt + 30 * 24 * 60 * 60 * 1000),
      });
    }
    return eventId;
  },
});

export const remove = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const [rsvps, photos, invitations] = await Promise.all([
      ctx.db.query("rsvps").withIndex("by_event", (q) => q.eq("eventId", args.eventId)).collect(),
      ctx.db.query("photos").withIndex("by_event", (q) => q.eq("eventId", args.eventId)).collect(),
      ctx.db.query("invitations").withIndex("by_event", (q) => q.eq("eventId", args.eventId)).collect(),
    ]);
    for (const photo of photos) {
      if (photo.storageId) await ctx.storage.delete(photo.storageId);
      await ctx.db.delete(photo._id);
    }
    for (const rsvp of rsvps) await ctx.db.delete(rsvp._id);
    for (const invitation of invitations) await ctx.db.delete(invitation._id);
    await ctx.db.delete(args.eventId);
  },
});
