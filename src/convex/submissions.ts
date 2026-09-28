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
import { api, internal } from "./_generated/api";
import { findReturningClient, touchFollowup } from "./followups";

const CATEGORIES = ["jobs", "real_estate", "emarket", "software"];
const TYPES = ["owner", "seeker", "buyer", "seller", "client", "employer"];

// ── Security constants ──────────────────────────────────────────────
const MAX_FILES = 3;
const MAX_FILE_SIZE_MB = 5;
const MAX_TITLE_LENGTH = 200;
const MAX_DESC_LENGTH = 2000;
const MAX_NAME_LENGTH = 100;

/** Sanitize text input: strip HTML tags, limit length, trim */
function sanitize(input: string, maxLen: number): string {
  return input
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // strip control chars
    .trim()
    .slice(0, maxLen);
}

function assertValid(args: {
  category: string;
  type: string;
  title: string;
  fullName: string;
  phone: string;
  attachments?: { name: string; storageId: string; kind: string }[];
}) {
  if (!CATEGORIES.includes(args.category)) throw new ConvexError("قسم غير صالح");
  if (!TYPES.includes(args.type)) throw new ConvexError("نوع غير صالح");
  if (!args.title || args.title.trim().length < 3)
    throw new ConvexError("العنوان مطلوب (3 أحرف على الأقل)");
  if (args.title.length > MAX_TITLE_LENGTH)
    throw new ConvexError(`العنوان طويل جداً (الحد الأقصى ${MAX_TITLE_LENGTH} حرف)`);
  if (!args.fullName || args.fullName.trim().length < 3)
    throw new ConvexError("الاسم الكامل مطلوب");
  if (args.fullName.length > MAX_NAME_LENGTH)
    throw new ConvexError(`الاسم طويل جداً (الحد الأقصى ${MAX_NAME_LENGTH} حرف)`);
  if (!isValidYemeniPhone(args.phone))
    throw new ConvexError("رقم الهاتف غير صحيح — أدخل رقم يمني صحيح (7xxxxxxxx)");
  // File limits: max 3 files, max 5MB each
  if (args.attachments && args.attachments.length > MAX_FILES) {
    throw new ConvexError(`الحد الأقصى ${MAX_FILES} ملفات فقط. للملفات الكبيرة تواصل عبر واتساب: 00967711780999`);
  }
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
    // 🔁 كشف العميل السابق: من أرسل عرضاً/طلباً من قبل لا يحتاج إعادة كل شيء
    const returning = await findReturningClient(ctx, normalized);
    return { code, phone: normalized, returning };
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
      title: sanitize(args.title, MAX_TITLE_LENGTH),
      description: args.description ? sanitize(args.description, MAX_DESC_LENGTH) : undefined,
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
    const client = await touchFollowup(ctx, {
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

    // 🔁 عميل سابق: إشعار تلقائي (للإدارة وفي قناة المنصة) يوضح أن العميل
    // معروف مسبقاً وأن ملفاته محفوظة — يكفي تنشيط الطلب السابق أو إضافة جديد.
    if (client.isReturning) {
      await ctx.db.insert("notifications", {
        title: "عميل سابق — إرسال جديد",
        message: `${args.fullName} (${normalizePhone(args.phone)}) عميل سابق لديه ${client.previousCount} طلب/طلبات — آخرها: ${client.previousTitle ?? "—"}. يمكنه تنشيط طلبه السابق بدل إعادة الإرسال.`,
        category: args.category,
        createdAt: now,
      });
      const maskedPhone = normalizePhone(args.phone).replace(/^(\d{3})\d{3}(\d{3})$/, "$1***$2");
      await ctx.scheduler.runAfter(0, internal.channels.publishNotice, {
        title: "عميل سابق — إرسال جديد",
        message: [
          `👤 العميل: ${args.fullName} (${maskedPhone})`,
          `📊 طلبات سابقة: ${client.previousCount}`,
          client.previousTitle ? `🆔 آخر طلب سابق: ${client.previousTitle}` : "",
          `🆕 الطلب الجديد: ${args.title}`,
          "ℹ️ ملفات العميل السابق محفوظة في قناة المنصة — يكفي تنشيط الطلب السابق أو إضافة جديد غير ما أُرسل سابقاً.",
        ].filter(Boolean).join("\n"),
        category: args.category,
      });
    }

    // Auto-enqueue all attachments for forwarding to Telegram + Facebook
    // This moves files off Convex storage to external channels asynchronously,
    // keeping the platform lightweight even with thousands of uploads.
    if (args.attachments && args.attachments.length > 0) {
      for (const att of args.attachments) {
        await ctx.db.insert("fileQueue", {
          storageId: att.storageId,
          fileName: att.name,
          fileKind: att.kind,
          fileSize: 0,
          mimeType: att.kind === "image" ? "image/jpeg"
            : att.kind === "video" ? "video/mp4"
            : att.kind === "audio" ? "audio/mpeg"
            : "application/octet-stream",
          entityType: "submission",
          entityId: id,
          status: "pending",
          retryCount: 0,
          createdAt: now,
        });
      }
    }
    return {
      id,
      returning: client.isReturning
        ? {
            previousCount: client.previousCount,
            lastTitle: client.previousTitle ?? null,
          }
        : null,
    };
  },
});

/**
 * 🔁 إعادة تنشيط طلب سابق من العميل نفسه (بتحقق رقم الهاتف).
 * العميل السابق لا يحتاج إعادة إرسال كل شيء: يُعاد طلبه للمراجعة فوراً.
 */
export const reactivate = mutation({
  args: { phone: v.string(), id: v.string() },
  handler: async (ctx, { phone, id }) => {
    if (!isValidYemeniPhone(phone))
      throw new ConvexError("رقم الهاتف غير صحيح — أدخل رقم يمني صحيح (7xxxxxxxx)");
    const normalized = normalizePhone(phone);
    const existing = (await ctx.db.get(id as any)) as any;
    if (!existing) throw new ConvexError("الطلب غير موجود");
    if (existing.phone !== normalized) {
      throw new ConvexError("لا يمكن تنشيط طلب لا يخص هذا الرقم");
    }
    if (existing.status === "sold") {
      throw new ConvexError("هذا الطلب مكتمل/مُغلق — أضف إعلاناً جديداً بارتياح");
    }
    const now = Date.now();
    const history = existing.history ?? [];
    history.push({
      by: existing.fullName,
      at: now,
      action: "reactivated",
      note: "إعادة تنشيط الطلب من العميل (عميل سابق) — بلا إعادة إرسال",
    });
    await ctx.db.patch(existing._id, {
      status: "pending",
      reactivatedAt: now,
      updatedAt: now,
      history,
      adminNote: "إعادة تنشيط من العميل — أولوية في المراجعة",
    });
    await ctx.db.insert("notifications", {
      title: "إعادة تنشيط طلب",
      message: `${existing.fullName} أعاد تنشيط طلبه "${existing.title}" — جاهز للمراجعة والنشر`,
      category: existing.category,
      createdAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.channels.publishNotice, {
      title: "إعادة تنشيط طلب من عميل سابق",
      message: [
        `👤 العميل: ${existing.fullName}`,
        `🆔 الطلب: ${existing.title}`,
        `📍 القسم: ${existing.category}`,
        "♻️ أُعيد التنشيط مباشرة دون إعادة إرسال الملفات.",
      ].join("\n"),
      category: existing.category,
    });
    return { ok: true, title: existing.title, category: existing.category };
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
      // 🧠 محرك التوافق: الطلب صار مفتوحاً ⇢ رشّح أفضل المطابقات له فوراً
      await ctx.scheduler.runAfter(0, internal.matching.runAutoMatchInternal, {
        category: existing.category,
        limit: 25,
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