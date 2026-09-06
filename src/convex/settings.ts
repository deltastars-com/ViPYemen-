import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

export const PUBLIC_KEYS = [
  "brandName",
  "brandTagline",
  "whatsappNumber",
  "phone",
  "email",
  "address",
  "facebook",
  "tiktok",
  "instagram",
  "twitter",
  "linkedin",
  "youtube",
  "telegram",
  "beacons",
  "linkfly",
  "taplink",
  "allmylinks",
] as const;

export const getPublicSettings = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("settings").collect();
    const out: Record<string, unknown> = {};
    for (const key of PUBLIC_KEYS) {
      const row = all.find((s) => s.key === key);
      if (row) out[key] = row.value;
    }
    return out;
  },
});

export const getAll = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const all = await ctx.db.query("settings").collect();
    return Object.fromEntries(all.map((s) => [s.key, s.value]));
  },
});

export const updateSetting = mutation({
  args: { token: v.string(), key: v.string(), value: v.any() },
  handler: async (ctx, { token, key, value }) => {
    await requireAdmin(ctx, token);
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value });
    } else {
      await ctx.db.insert("settings", { key, value });
    }
    return { ok: true };
  },
});

export const ensureDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const defaults: Record<string, unknown> = {
      brandName: "ViP Yemen",
      brandTagline: "التوظيف · التسويق العقاري · التسويق الإلكتروني · الخدمات البرمجية",
      whatsappNumber: "00967711780999",
      phone: "773597404",
      email: "vipservicesyemen@gmail.com",
      address: "اليمن · صنعاء · حي شميلة",
      facebook: "https://www.facebook.com/ViPservicesYemen/",
      tiktok: "https://www.tiktok.com/@vipservicesyemen1",
      instagram: "https://www.instagram.com/vipservicesyemen",
      twitter: "https://twitter.com/ViPservicesYeme",
      linkedin: "https://www.linkedin.com/in/ali-aldahan-57b5a2231",
      youtube: "https://youtube.com/channel/UCJGfi4S63-Nm2rSXpBqzHtw",
      telegram: "https://chat.whatsapp.com/i5vycbmxwyykhctc8tsn9x",
      beacons: "https://beacons.ai/vipservicesyemen",
      linkfly: "https://linkfly.to/vipservicesyemen",
      taplink: "https://taplink.cc/vipservicesyemen",
      allmylinks: "https://allmylinks.com/vipservicesyemen",
    };
    for (const [key, value] of Object.entries(defaults)) {
      const existing = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      if (!existing) {
        await ctx.db.insert("settings", { key, value });
      }
    }
    return { ok: true };
  },
});