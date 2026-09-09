import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import {
  isValidYemeniPhone,
  normalizePhone,
  randomCode,
  requireAdmin,
  sha256Hex,
} from "./auth";
import { api } from "./_generated/api";
import { touchFollowup } from "./followups";

const CATEGORIES = ["jobs", "real_estate", "emarket", "software"];
const TYPES = ["owner", "seeker", "buyer", "seller", "client", "employer"];

function assertValid(args: {
  category: string;
  type: string;
  title: string;
  fullName: string;
  phone: string;
}) {
  if (!CATEGORIES.includes(args.category)) throw new ConvexError("قسم غير صالح");
  if (!TYPES.includes(args.type)) throw new ConvexError("نوع غير صالح");
  if (!args.title || args.title.trim().length < 3)
    throw new ConvexError("العنوان مطلوب (3 أحرف على الأقل)");
  if (!args.fullName || args.fullName.trim().length < 3)
    throw new ConvexError("الاسم الكامل مطلوب");
  if (!isValidYemeniPhone(args.phone))
    throw new ConvexError("رقم الهاتف غير صحيح — أدخل رقم يمني صحيح (7xxxxxxxx)");
}

export const requestPhoneOtp = mutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    if (!isValidYemeniPhone(phone))
      throw new ConvexError("رقم الهاتف غير صحيح — أدخل رقم يمني صحيح (7xxxxxxxx)");
    const normalized = normalizePhone(phone);
    const code = randomCode(6);
    const now = Date.now();
    // Rate limit: max 3 OTP per phone per hour
    const recent = await ctx.db
      .query("phoneOtps")
      .withIndex("by_phone", (q) => q.eq("phone", normalized))
      .order("desc")
      .take(5);
    const lastHour = recent.filter((r) => r.createdAt > now - 60 * 60 * 1000);
    if (lastHour.length >= 3) {
      throw new ConvexError("تم تجاوز عدد محاولات التحقق — حاول بعد ساعة");
    }
    await ctx.db.insert("phoneOtps", {
      phone: normalized,
      codeHash: await sha256Hex(code),
      expiresAt: now + 10 * 60 * 1000,
      used: false,
      createdAt: now,
    });
    return { code, phone: normalized };
  },
});

export const submit = mutation({
  args: {
    category: v.string(),
    type: v.string(),
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
    otpCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertValid(args);
    const now = Date.now();
    let phoneVerified = false;
    if (args.otpCode) {
      const normalized = normalizePhone(args.phone);
      const otps = await ctx.db
        .query("phoneOtps")
        .withIndex("by_phone", (q) => q.eq("phone", normalized))
        .order("desc")
        .take(5);
      const otpHash = await sha256Hex(args.otpCode.trim());
      const match = otps.find(
        (o) => !o.used && o.expiresAt > now && o.codeHash === otpHash
      );
      if (match) {
        phoneVerified = true;
        await ctx.db.patch(match._id, { used: true });
      }
    }
    const id = await ctx.db.insert("submissions", {
      category: args.category,
      type: args.type,
      status: "pending",
      title: args.title.trim(),
      description: args.description?.trim() || undefined,
      fullName: args.fullName.trim(),
      phone: normalizePhone(args.phone),
      address: args.address?.trim() || undefined,
      price: args.price,
      currency: args.currency,
      fields: args.fields ?? {},
      attachments: args.attachments,
      phoneVerified,
      createdAt: now,
      updatedAt: now,
    });
    await touchFollowup(ctx, {
      fullName: args.fullName.trim(),
      phone: normalizePhone(args.phone),
      address: args.address?.trim() || undefined,
      category: args.category,
      submissionTitle: args.title.trim(),
    });
    await ctx.db.insert("notifications", {
      title: "طلب جديد بانتظار المراجعة",
      message: `طلب جديد في قسم ${args.category} — ${args.fullName}: ${args.title}`,
      category: args.category,
      createdAt: now,
    });
    return { id };
  },
});

async function resolveAttachmentUrls<T extends { attachments?: { name: string; storageId: string; kind: string }[] }>(
  ctx: { storage: { getUrl(storageId: string): Promise<string | null> } },
  row: T
) {
  const attachments = await Promise.all(
    (row.attachments ?? []).map(async (a) => ({
      name: a.name,
      kind: a.kind,
      url: await ctx.storage.getUrl(a.storageId),
    }))
  );
  return { ...row, attachments };
}

export const listPublished = query({
  args: {
    category: v.optional(v.string()),
    type: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { category, type, limit }) => {
    let rows = await ctx.db
      .query("submissions")
      .withIndex("by_category_status", (q) =>
        q.eq("category", category ?? "jobs")
      )
      .filter((q) => q.or(q.eq(q.field("status"), "published"), q.eq(q.field("status"), "sold")))
      .order("desc")
      .take(limit ?? 100);
    if (type) rows = rows.filter((r) => r.type === type);
    return Promise.all(rows.map((r) => resolveAttachmentUrls(ctx, r)));
  },
});

export const getPublicStats = query({
  args: {},
  handler: async (ctx) => {
    const counts: Record<string, number> = {};
    for (const category of CATEGORIES) {
      const rows = await ctx.db
        .query("submissions")
        .withIndex("by_category_status", (q) => q.eq("category", category))
        .collect();
      counts[category] = rows.filter((r) => r.status === "published" || r.status === "sold").length;
    }
    const offers = await ctx.db.query("offers").withIndex("by_status", (q) => q.eq("status", "published")).collect();
    return { counts, offers: offers.length };
  },
});

// ---------------- Admin ----------------

export const listAll = query({
  args: {
    token: v.string(),
    category: v.optional(v.string()),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  handler: async (ctx, { token, category, status, search, type }) => {
    await requireAdmin(ctx, token);
    let rows = await ctx.db.query("submissions").withIndex("by_created").order("desc").take(500);
    if (category) rows = rows.filter((r) => r.category === category);
    if (status) rows = rows.filter((r) => r.status === status);
    if (type) rows = rows.filter((r) => r.type === type);
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.fullName.toLowerCase().includes(s) ||
          r.title.toLowerCase().includes(s) ||
          r.phone.includes(s) ||
          (r.description ?? "").toLowerCase().includes(s)
      );
    }
    return Promise.all(rows.map((r) => resolveAttachmentUrls(ctx, r)));
  },
});

export const updateSubmission = mutation({
  args: {
    token: v.string(),
    id: v.id("submissions"),
    patch: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      fullName: v.optional(v.string()),
      phone: v.optional(v.string()),
      address: v.optional(v.string()),
      price: v.optional(v.number()),
      currency: v.optional(v.string()),
      fields: v.optional(v.any()),
      adminNote: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { token, id, patch }) => {
    const admin = await requireAdmin(ctx, token);
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError("الطلب غير موجود");
    const history = existing.history ?? [];
    history.push({
      by: admin.name,
      at: Date.now(),
      action: "edit",
      note: patch.adminNote || "تعديل البيانات",
    });
    await ctx.db.patch(id, {
      ...patch,
      history,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

export const setStatus = mutation({
  args: {
    token: v.string(),
    id: v.id("submissions"),
    status: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { token, id, status, note }) => {
    const admin = await requireAdmin(ctx, token);
    if (!["pending", "published", "rejected", "sold", "archived"].includes(status)) {
      throw new ConvexError("حالة غير صالحة");
    }
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError("الطلب غير موجود");
    const history = existing.history ?? [];
    history.push({
      by: admin.name,
      at: Date.now(),
      action: status,
      note: note || undefined,
    });
    const now = Date.now();
    const patch: Record<string, unknown> = {
      status,
      history,
      updatedAt: now,
      adminNote: note !== undefined ? note : existing.adminNote,
    };
    if (status === "published") patch.publishedAt = existing.publishedAt ?? now;
    if (status === "sold") patch.soldAt = existing.soldAt ?? now;
    if (status === "archived" && existing.soldAt) patch.soldAt = undefined;
    await ctx.db.patch(id, patch);
    if (status === "published") {
      await ctx.db.insert("notifications", {
        title: "تم نشر إعلان",
        message: `تم نشر "${existing.title}" على واجهة المنصة`,
        category: existing.category,
        createdAt: now,
      });
      // Auto-publish to the platform channels (Telegram / WhatsApp)
      const sectionUrl =
        existing.category === "jobs"
          ? "/jobs"
          : existing.category === "real_estate"
            ? "/real-estate"
            : existing.category === "emarket"
              ? "/emarket"
              : "/software";
      await ctx.scheduler.runAfter(0, api.channels.publishToChannels, {
        kind: "submission",
        itemId: id,
        title: existing.title,
        message: existing.description ?? existing.title,
        url: sectionUrl,
        price:
          existing.price !== undefined
            ? `${existing.price.toLocaleString("en-US")} ${existing.currency === "usd" ? "$" : "ريال يمني"}`
            : undefined,
      });
    }
    return { ok: true };
  },
});

export const deleteSubmission = mutation({
  args: { token: v.string(), id: v.id("submissions") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    await ctx.db.delete(id);
    return { ok: true };
  },
});

export const togglePhoneVerified = mutation({
  args: { token: v.string(), id: v.id("submissions"), verified: v.boolean() },
  handler: async (ctx, { token, id, verified }) => {
    await requireAdmin(ctx, token);
    await ctx.db.patch(id, { phoneVerified: verified });
    return { ok: true };
  },
});

export const getAdminStats = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const all = await ctx.db.query("submissions").collect();
    const stats = {
      total: all.length,
      pending: all.filter((s) => s.status === "pending").length,
      published: all.filter((s) => s.status === "published").length,
      rejected: all.filter((s) => s.status === "rejected").length,
      sold: all.filter((s) => s.status === "sold").length,
      archived: all.filter((s) => s.status === "archived").length,
      byCategory: Object.fromEntries(
        CATEGORIES.map((c) => [c, all.filter((s) => s.category === c).length])
      ),
      phoneVerified: all.filter((s) => s.phoneVerified).length,
    };
    const ads = await ctx.db.query("ads").collect();
    const offers = await ctx.db.query("offers").collect();
    const finance = await ctx.db.query("finance").collect();
    const followups = await ctx.db.query("followups").collect();
    return {
      ...stats,
      ads: ads.length,
      offers: offers.length,
      financeTotal: finance.reduce((acc, f) => acc + (f.type === "income" ? f.amount : -f.amount), 0),
      clientsTotal: followups.length,
      clientsPending: followups.filter((f) => f.status === "pending").length,
      clientsResolved: followups.filter((f) => f.status === "resolved").length,
    };
  },
});