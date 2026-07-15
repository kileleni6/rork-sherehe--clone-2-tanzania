import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export const generateUploadUrl = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    eventId: v.id("events"),
    storageId: v.optional(v.id("_storage")),
    sourceUrl: v.optional(v.string()),
    guestName: v.string(),
    filter: v.optional(v.string()),
    style: v.optional(v.string()),
    flagged: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    if (!args.storageId && !args.sourceUrl) throw new Error("Photo file is required");
    const uploadedAt = Date.now();
    return await ctx.db.insert("photos", {
      ...args,
      flagged: args.flagged ?? false,
      takenAt: uploadedAt,
      uploadedAt,
      expiresAt: uploadedAt + RETENTION_MS,
    });
  },
});

export const remove = mutation({
  args: { photoId: v.id("photos") },
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.photoId);
    if (!photo) return;
    if (photo.storageId) await ctx.storage.delete(photo.storageId);
    await ctx.db.delete(args.photoId);
  },
});

export const purgeExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("photos")
      .withIndex("by_expiry", (q) => q.lt("expiresAt", Date.now()))
      .collect();
    for (const photo of expired) {
      if (photo.storageId) await ctx.storage.delete(photo.storageId);
      await ctx.db.delete(photo._id);
    }
    return expired.length;
  },
});
