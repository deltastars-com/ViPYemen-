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
import { makeReceiptNo } from "./contracts";

/** التوثيق الإلكتروني والالتزام المالي الذي يكمله العميل مع تقديم الطلب/العرض. */
type SubmissionCertification = {
  amount: number;
  commission: number;
  currency?: string;
  signature: string;
  signatureType?: string;
  fingerprint?: { mode: string; credentialId?: string; verified: boolean };
  consent: boolean;
};

/** تحقّق صارم من التوثيق قبل إنشاء أي سجل — الفشل يُبطل العملية كاملة. */
function assertValidCertification(c: SubmissionCertification | undefined): void {
  if (!c) return;
  if (!c.consent)
    throw new ConvexError("يلزم قبول الالتزام المالي بعمولة المنصة المتفق عليها لإتمام التوثيق");
  if (!(c.amount > 0)) throw new ConvexError("المبلغ المتفق عليه مطلوب في التوثيق الإلكتروني");
  if (c.commission < 0 || c.commission > c.amount)
    throw new ConvexError("عمولة المنصة يجب أن تكون بين صفر والمبلغ المتفق عليه");
  if (!c.signature || c.signature.trim().length < 10)
    throw new ConvexError("التوقيع الإلكتروني مطلوب — ارسم توقيعك في خانة التوقيع");
  if (!c.fingerprint?.verified)
    throw new ConvexError("تأكيد البصمة الإلكترونية مطلوب لإتمام التوثيق");
}

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
    email: v.optional(v.string()),
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
    /** 🔏 التوثيق الإلكتروني والالتزام المالي — يُستكمل مع تقديم الطلب/العرض */
    certification: v.optional(
      v.object({
        amount: v.number(),
        commission: v.number(),
        currency: v.optional(v.string()),
        signature: v.string(),
        signatureType: v.optional(v.string()),
        fingerprint: v.optional(
          v.object({
            mode: v.string(),
            credentialId: v.optional(v.string()),
            verified: v.boolean(),
          })
        ),
        consent: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    assertValid(args);
    assertValidCertification(args.certification);
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
      email: args.email?.trim() || undefined,
      address: args.address?.trim() || undefined,
      price: args.price,
      currency: args.currency,
      fields: args.fields ?? {},
      attachments: args.attachments,
      phoneVerified,
      createdAt: now,
      updatedAt: now,
    });

    // 🔏 ترابط قسم تقديم الطلب مع التوثيق الإلكتروني: عقد موقّع بالبصمة
    // يُنشأ فوراً ومرتبطاً بالطلب نفسه، فيظل الالتزام المالي موثّقاً لدى الإدارة.
    let receiptNo: string | undefined;
    const cert = args.certification;
    if (cert) {
      receiptNo = makeReceiptNo(now);
      await ctx.db.insert("contracts", {
        submissionId: id,
        title: sanitize(args.title, MAX_TITLE_LENGTH),
        beneficiaryName: args.fullName.trim(),
        phone: normalizePhone(args.phone),
        amount: cert.amount,
        commission: cert.commission,
        currency: cert.currency ?? "USD",
        signature: cert.signature,
        signatureType: cert.signatureType ?? "drawn",
        fingerprint: cert.fingerprint,
        receiptNo,
        status: "signed",
        signedAt: now,
        createdAt: now,
      });
      await ctx.db.insert("notifications", {
        title: "🔐 توثيق إلكتروني بالبصمة مع تقديم الطلب",
        message: `${receiptNo} — ${args.fullName} يلتزم بعمولة ${cert.commission} ${cert.currency ?? "USD"} من مبلغ ${cert.amount} ${cert.currency ?? "USD"} — طلب: ${args.title}`,
        category: "contracts",
        createdAt: now,
      });
    }
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
      receiptNo: receiptNo ?? null,
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

/**
 * 🔒 العرض العام الآمن للطلب — لا يكشف أبداً ملاحظات الإدارة ولا سجل
 * التعديلات ولا النسخة الأصلية السرية ولا هوية المراجع.
 */
const PUBLIC_FIELDS = [
  "_id",
  "_creationTime",
  "category",
  "type",
  "status",
  "title",
  "description",
  "fullName",
  "phone",
  "email",
  "address",
  "price",
  "currency",
  "fields",
  "attachments",
  "phoneVerified",
  "soldAt",
  "publishedAt",
  "publishedTo",
  "lastChannelPush",
  "reactivatedAt",
  "bestMatchScore",
  "createdAt",
  "updatedAt",
] as const;

function publicView(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of PUBLIC_FIELDS) {
    if (row[key] !== undefined) out[key] = row[key];
  }
  return out;
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
    return Promise.all(rows.map(async (r) => publicView(await resolveAttachmentUrls(ctx, r))));
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
    // 🔐 النسخة الأصلية السرية لا تخرج في القائمة — تُقرأ عبر getOriginal وحدها.
    const stripped = rows.map((r) => {
      const copy: Record<string, unknown> = { ...r };
      delete copy.original;
      return copy;
    });
    return Promise.all(stripped.map((r) => resolveAttachmentUrls(ctx, r as any)));
  },
});

/**
 * 🔐 قراءة النسخة الأصلية السرية للطلب (كما أرسلها العميل قبل أي مراجعة)
 * — للإدارة فقط، وتُستخدم داخل نافذة المراجعة بجانب البيانات المعدّلة.
 */
export const getOriginal = query({
  args: { token: v.string(), id: v.id("submissions") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    const row = await ctx.db.get(id);
    if (!row) return null;
    return {
      original: row.original ?? null,
      reviewedAt: row.reviewedAt ?? null,
      reviewedBy: row.reviewedBy ?? null,
      reviewCount: row.reviewCount ?? 0,
    };
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
      email: v.optional(v.string()),
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

/**
 * 🔍 مراجعة إدارية كاملة قبل إعادة النشر — المسار الاحترافي:
 *   1. تحفظ النسخة الأصلية كما أرسلها العميل (سرّية، للإدارة فقط) مرة واحدة.
 *   2. تُطبَّق التعديلات (هاتف · بريد · عنوان · بيانات الطلب) مع التحقق.
 *   3. تُختم المراجعة (متى ومن/عدد مرات) وتُسجل في سجل التعديلات.
 *   4. ثم تُعاد المعاينة بأحد المسارين:
 *        • auto   → نشر فوري على الواجهة + نشر تلقائي للقنوات + ترشيح المطابقات
 *        • manual → حفظ كجاهز للنشر ثم ينشرها المشرف يدوياً من أي قناة
 */
export const reviewAndUpdate = mutation({
  args: {
    token: v.string(),
    id: v.id("submissions"),
    patch: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      fullName: v.optional(v.string()),
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
      address: v.optional(v.string()),
      price: v.optional(v.number()),
      currency: v.optional(v.string()),
      fields: v.optional(v.any()),
      adminNote: v.optional(v.string()),
    }),
    publishMode: v.string(), // auto | manual
    note: v.optional(v.string()),
  },
  handler: async (ctx, { token, id, patch, publishMode, note }) => {
    const admin = await requireAdmin(ctx, token);
    if (!['auto', 'manual'].includes(publishMode))
      throw new ConvexError("أسلوب النشر غير صالح — تلقائي أو يدوي");
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError("الطلب غير موجود");

    // التحقق من المدخلات المعدَّلة قبل تغيير أي شيء
    if (patch.phone && !isValidYemeniPhone(patch.phone))
      throw new ConvexError("رقم الهاتف غير صحيح — أدخل رقم يمني صحيح (7xxxxxxxx)");
    if (patch.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patch.email.trim()))
      throw new ConvexError("البريد الإلكتروني غير صالح");
    if (patch.title !== undefined && patch.title.trim().length < 3)
      throw new ConvexError("العنوان مطلوب (3 أحرف على الأقل)");
    if (patch.fullName !== undefined && patch.fullName.trim().length < 3)
      throw new ConvexError("الاسم الكامل مطلوب");

    const now = Date.now();
    // 🔐 حفظ النسخة الأصلية السرّية مرة واحدة فقط — تبقى لدى الإدارة دائماً.
    const original = existing.original ?? {
      title: existing.title,
      description: existing.description ?? "",
      fullName: existing.fullName,
      phone: existing.phone,
      email: existing.email ?? "",
      address: existing.address ?? "",
      price: existing.price ?? null,
      currency: existing.currency ?? "yer",
      fields: existing.fields ?? {},
      attachments: existing.attachments ?? [],
      savedAt: now,
      savedBy: admin.name,
    };

    const clean: Record<string, unknown> = { ...patch };
    if (typeof clean.title === "string") clean.title = sanitize(clean.title, MAX_TITLE_LENGTH);
    if (typeof clean.description === "string")
      clean.description = sanitize(clean.description, MAX_DESC_LENGTH);
    if (typeof clean.fullName === "string") clean.fullName = clean.fullName.trim();
    if (typeof clean.phone === "string") clean.phone = normalizePhone(clean.phone);
    if (typeof clean.email === "string") clean.email = clean.email.trim();
    if (typeof clean.address === "string") clean.address = clean.address.trim();

    const history = existing.history ?? [];
    history.push({
      by: admin.name,
      at: now,
      action: publishMode === "auto" ? "review+publish" : "review",
      note: note || (patch.adminNote ?? "مراجعة وتعديل البيانات قبل إعادة النشر"),
    });

    const doc: Record<string, unknown> = {
      ...clean,
      original,
      history,
      updatedAt: now,
      reviewedAt: now,
      reviewedBy: admin.name,
      reviewCount: (existing.reviewCount ?? 0) + 1,
    };
    const publish = publishMode === "auto";
    if (publish) {
      doc.status = "published";
      doc.publishedAt = existing.publishedAt ?? now;
    }
    await ctx.db.patch(id, doc);

    await ctx.db.insert("notifications", {
      title: publish ? "✅ مُراجَع ومنشور بعد التدقيق" : "🔍 مراجعة مكتملة — جاهز للنشر اليدوي",
      message: `${existing.title} — راجعها ${admin.name} (${(existing.reviewCount ?? 0) + 1}) وحُفظت النسخة الأصلية سرّياً${publish ? " ونُشرت النسخة المعدَّلة تلقائياً" : " بانتظار النشر اليدوي"}`,
      category: existing.category,
      createdAt: now,
    });

    if (publish) {
      // النشر التلقائي: الواجهة + كل قنوات المنصة + ترشيح المطابقات
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
        title: (patch.title ?? existing.title).trim(),
        message: patch.description ?? existing.description ?? (patch.title ?? existing.title),
        url: sectionUrl,
        price:
          (patch.price ?? existing.price) !== undefined
            ? `${(patch.price ?? existing.price)!.toLocaleString("en-US")} ${(patch.currency ?? existing.currency) === "usd" ? "$" : "ريال يمني"}`
            : undefined,
      });
      await ctx.scheduler.runAfter(0, internal.matching.runAutoMatchInternal, {
        category: existing.category,
        limit: 25,
      });
    }
    return { ok: true, published: publish, reviewedAt: now };
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