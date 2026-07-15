import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listForEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) =>
    await ctx.db.query("invitations").withIndex("by_event", (q) => q.eq("eventId", args.eventId)).order("desc").collect(),
});

export const saveMany = mutation({
  args: {
    eventId: v.id("events"),
    guests: v.array(v.object({
      name: v.string(),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    const now = Date.now();
    const ids = [];
    for (const guest of args.guests) {
      ids.push(await ctx.db.insert("invitations", {
        eventId: args.eventId,
        ...guest,
        emailStatus: guest.email ? "pending" : undefined,
        smsStatus: guest.phone ? "pending" : undefined,
        createdAt: now,
        updatedAt: now,
      }));
    }
    await ctx.db.patch(args.eventId, {
      invited: event.invited + args.guests.length,
      updatedAt: now,
    });
    return ids;
  },
});
