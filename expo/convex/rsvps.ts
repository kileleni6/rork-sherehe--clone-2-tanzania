import { mutation } from "./_generated/server";
import { v } from "convex/values";

function createPassCode(name: string): string {
  const prefix = name.replace(/[^a-z]/gi, "").slice(0, 4).toUpperCase() || "GUEST";
  return `${prefix}${Math.floor(Math.random() * 90) + 10}`;
}

export const create = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.optional(v.string()),
    name: v.string(),
    status: v.string(),
    guests: v.number(),
    note: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    const passCode = createPassCode(args.name);
    const id = await ctx.db.insert("rsvps", {
      ...args,
      passCode,
      shotsUsed: 0,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.eventId, {
      invited: Math.max(event.invited, event.invited + 1),
      updatedAt: Date.now(),
    });
    return { id, passCode };
  },
});

export const update = mutation({
  args: { rsvpId: v.id("rsvps"), patch: v.any() },
  handler: async (ctx, args) => {
    const rsvp = await ctx.db.get(args.rsvpId);
    if (!rsvp) throw new Error("RSVP not found");
    await ctx.db.patch(args.rsvpId, args.patch ?? {});
  },
});

export const setCheckIn = mutation({
  args: { rsvpId: v.id("rsvps"), checkedInAt: v.union(v.number(), v.null()) },
  handler: async (ctx, args) => {
    const rsvp = await ctx.db.get(args.rsvpId);
    if (!rsvp) throw new Error("RSVP not found");
    await ctx.db.patch(args.rsvpId, {
      checkedInAt: args.checkedInAt ?? undefined,
    });
  },
});

export const setRejection = mutation({
  args: { rsvpId: v.id("rsvps"), reason: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const rsvp = await ctx.db.get(args.rsvpId);
    if (!rsvp) throw new Error("RSVP not found");
    await ctx.db.patch(args.rsvpId, {
      rejectionReason: args.reason ?? undefined,
    });
  },
});

export const remove = mutation({
  args: { rsvpId: v.id("rsvps") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.rsvpId);
  },
});
