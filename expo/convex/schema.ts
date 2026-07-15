import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const scheduleItem = v.object({
  id: v.string(),
  time: v.string(),
  title: v.string(),
});

export default defineSchema({
  events: defineTable({
    ownerId: v.optional(v.string()),
    legacyId: v.optional(v.string()),
    name: v.string(),
    type: v.string(),
    customLabel: v.optional(v.string()),
    timeOfDay: v.optional(v.string()),
    cover: v.string(),
    date: v.number(),
    venue: v.string(),
    message: v.string(),
    dressCode: v.optional(v.string()),
    schedule: v.array(scheduleItem),
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
    invited: v.number(),
    views: v.number(),
    premium: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_legacy_id", ["legacyId"])
    .index("by_date", ["date"]),

  rsvps: defineTable({
    eventId: v.id("events"),
    userId: v.optional(v.string()),
    name: v.string(),
    status: v.string(),
    guests: v.number(),
    note: v.optional(v.string()),
    phone: v.optional(v.string()),
    passCode: v.string(),
    checkedInAt: v.optional(v.number()),
    shotsUsed: v.number(),
    rejectionReason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_pass_code", ["passCode"]),

  photos: defineTable({
    eventId: v.id("events"),
    storageId: v.optional(v.id("_storage")),
    sourceUrl: v.optional(v.string()),
    guestName: v.string(),
    takenAt: v.number(),
    filter: v.optional(v.string()),
    style: v.optional(v.string()),
    flagged: v.boolean(),
    uploadedAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_expiry", ["expiresAt"]),

  invitations: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    emailStatus: v.optional(v.string()),
    smsStatus: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_event", ["eventId"]),
});
