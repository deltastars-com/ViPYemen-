import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const CATEGORIES = [
  "jobs",
  "real_estate",
  "emarket",
  "software",
] as const;

export const STATUSES = [
  "pending",
  "published",
  "rejected",
  "sold",
  "archived",
] as const;

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    passwordSalt: v.string(),
    passwordHash: v.string(),
    role: v.string(),
    mustChangePassword: v.boolean(),
    lastLoginAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  sessions: defineTable({
    tokenHash: v.string(),
    userId: v.id("users"),
    expiresAt: v.number(),
    createdAt: v.number(),
  }).index("by_token", ["tokenHash"]),

  passwordResets: defineTable({
    email: v.string(),
    codeHash: v.string(),
    expiresAt: v.number(),
    used: v.boolean(),
  }).index("by_email", ["email"]),

  phoneOtps: defineTable({
    phone: v.string(),
    codeHash: v.string(),
    expiresAt: v.number(),
    used: v.boolean(),
    createdAt: v.number(),
  }).index("by_phone", ["phone"]),

  submissions: defineTable({
    category: v.string(),
    type: v.string(),
    status: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    fullName: v.string(),
    phone: v.string(),
    address: v.optional(v.string()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    fields: v.any(),
    attachments: v.optional(
      v.array(
        v.object({
          name: v.string(),
          storageId: v.string(),
          kind: v.string(),
        })
      )
    ),
    adminNote: v.optional(v.string()),
    history: v.optional(v.array(v.any())),
    phoneVerified: v.boolean(),
    soldAt: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category_status", ["category", "status"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  ads: defineTable({
    title: v.string(),
    message: v.string(),
    status: v.string(),
    priority: v.number(),
    link: v.optional(v.string()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_status", ["status"]),

  offers: defineTable({
    title: v.string(),
    description: v.string(),
    imageUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    originalPrice: v.optional(v.number()),
    offerPrice: v.optional(v.number()),
    discountPercent: v.optional(v.number()),
    isFeatured: v.boolean(),
    status: v.string(),
    createdAt: v.number(),
  }).index("by_status", ["status"]),

  finance: defineTable({
    type: v.string(),
    amount: v.number(),
    description: v.string(),
    category: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]),

  notifications: defineTable({
    title: v.string(),
    message: v.string(),
    category: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]),

  releases: defineTable({
    version: v.string(),
    title: v.string(),
    description: v.string(),
    platform: v.string(),
    fileUrl: v.optional(v.string()),
    size: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]),

  settings: defineTable({
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),
});