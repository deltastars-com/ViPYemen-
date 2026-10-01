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

  loginAttempts: defineTable({
    email: v.string(),
    count: v.number(),
    lockedUntil: v.optional(v.number()),
    updatedAt: v.number(),
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
    publishedTo: v.optional(v.array(v.string())),
    lastChannelPush: v.optional(v.number()),
    /** كلمات الفهرس — يبنيها محرك الفهرسة في لوحة الكنترول */
    indexKeys: v.optional(v.array(v.string())),
    indexedAt: v.optional(v.number()),
    /** وقت الأرشفة التلقائية/اليدوية */
    archivedAt: v.optional(v.number()),
    /** آخر تنشيط من العميل (عميل سابق أعاد تنشيط طلبه) */
    reactivatedAt: v.optional(v.number()),
    /** أفضل نتيجة مطابقة محسوبة من محرك التوافق (0..100) */
    bestMatchScore: v.optional(v.number()),
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
    publishedTo: v.optional(v.array(v.string())),
    lastChannelPush: v.optional(v.number()),
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
    publishedTo: v.optional(v.array(v.string())),
    lastChannelPush: v.optional(v.number()),
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

  /**
   * سجل العملاء — كل عميل يظهر في كشف متكامل للجودة:
   * أحدث نشاط، حالة المتابعة (تمت/لم تتم)، السبب، والملاحظات.
   */
  followups: defineTable({
    fullName: v.string(),
    phone: v.string(),
    address: v.optional(v.string()),
    category: v.optional(v.string()),
    source: v.string(), // submission | manual | whatsapp
    lastSubmissionTitle: v.optional(v.string()),
    submissionCount: v.number(),
    status: v.string(), // pending | contacted | resolved | unreachable
    reason: v.optional(v.string()),
    note: v.optional(v.string()),
    history: v.optional(v.array(v.any())),
    /** آخر إرسال من هذا العميل — أساس كشف «العميل السابق» */
    lastSubmissionAt: v.optional(v.number()),
    /** وقت إشعار العميل بأنه عميل سابق (تنشيط أو إضافة جديد) */
    returningNotifiedAt: v.optional(v.number()),
    /** عدد الملفات المؤرشفة في قناة التلجرام لصالح هذا العميل */
    archivedFiles: v.optional(v.number()),
    archivedAt: v.optional(v.number()),
    /** متوسط/أفضل تقييم نجوم لمقدم التوظيف */
    stars: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_phone", ["phone"])
    .index("by_status", ["status"])
    .index("by_updated", ["updatedAt"]),

  /**
   * 🔐 الخزنة — الوثائق ومفاتيح التوقيع والأسرار (للإدارة فقط).
   * Secure vault for signing keys, credentials, and secrets.
   * All access is admin-gated through src/convex/secureDocs.ts.
   */
  secureDocs: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(), // signing | firebase | play | vercel | supabase | apple | general
    isSecret: v.boolean(),
    value: v.string(),
    updatedAt: v.number(),
  }).index("by_name", ["name"]),

  /**
   * 💳 سندات الدفع — أرشيف كامل للإيصالات البنكية والمحافظ.
   * Payment receipts archive: bank transfer (Al-Kuraimi), Jawali & Jaib wallets.
   * Status: pending → confirmed → settled (or rejected). Admin-gated review.
   */
  payments: defineTable({
    method: v.string(), // kuraimi | jawali | jaib
    amount: v.number(),
    currency: v.string(),
    payerName: v.string(),
    payerPhone: v.string(),
    reference: v.string(), // receipt / transfer reference number
    purpose: v.optional(v.string()),
    notes: v.optional(v.string()),
    proofStorageId: v.optional(v.string()),
    status: v.string(), // pending | confirmed | settled | rejected
    adminNote: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    settledAt: v.optional(v.number()),
    financeId: v.optional(v.id("finance")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_payer_phone", ["payerPhone"])
    .index("by_created", ["createdAt"]),

  /**
   * 📁 ملفات الانتظار — طابور توجيه الملفات إلى Telegram + Facebook.
   * Status: pending → forwarding → forwarded → cleaned | failed
   * يضمن عدم تثقل التطبيق: الملفات تُوجَّه بشكل غير متزامن ثم تُحذف من التخزين المحلي.
   */
  fileQueue: defineTable({
    storageId: v.string(),
    fileName: v.string(),
    fileKind: v.string(), // image | document | video | audio | other
    fileSize: v.number(),
    mimeType: v.string(),
    // Which submission/ad/offer this belongs to
    entityType: v.string(), // submission | ad | offer
    entityId: v.string(),
    // Forwarding targets
    forwardedTo: v.optional(v.array(v.string())), // ["telegram", "facebook"]
    remoteUrls: v.optional(v.any()), // { telegram: "...", facebook: "..." }
    status: v.string(), // pending | forwarding | forwarded | cleaned | failed
    error: v.optional(v.string()),
    retryCount: v.number(),
    createdAt: v.number(),
    forwardedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_created", ["createdAt"]),

  /**
   * 📮 صندوق القنوات الموثوق — كل رسالة تُسجَّل لقناة المنصة قبل الإرسال،
   * وأي فشل يُعاد تلقائياً (حتى 5 محاولات) فلا يضيع منشور بسبب انقطاع واجهة.
   * channel: telegram | whatsapp | facebook_page | facebook_group
   * status:  pending | sent | failed
   */
  channelOutbox: defineTable({
    channel: v.string(),
    title: v.string(),
    message: v.string(),
    category: v.optional(v.string()),
    kind: v.optional(v.string()),
    entityId: v.optional(v.string()),
    status: v.string(),
    attempts: v.number(),
    lastError: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"])
    .index("by_channel", ["channel"]),

  /**
   * 🩺 صحة قنوات المنصة الرسمية — فحص دوري مباشر لواجهات القنوات
   * (تلجرام · واتساب · صفحة فيسبوك · مجموعة فيسبوك) مع زمن الاستجابة
   * وسبب أي خلل، فيعرف المشرف من لوحة الكنترول أي قناة متوقفة فوراً.
   * status: ok | degraded | down
   */
  channelStatus: defineTable({
    channel: v.string(),
    status: v.string(),
    detail: v.string(),
    latencyMs: v.optional(v.number()),
    checkedAt: v.number(),
  }).index("by_channel", ["channel"]),

  /**
   * 🧠 محرك التوافق والمطابقة — أفضل التطابقات بين العروض والطلبات.
   * يبنيها النظام تلقائياً (وعند الطلب من لوحة الكنترول) فتُحفظ كأرشيف
   * قابل للتتبع: من أُبلغ، من تم التواصل معه، ومن اكتمل توافقه.
   * status: new | notified | contacted | matched | closed
   */
  matchSuggestions: defineTable({
    category: v.string(),
    requestId: v.string(),
    requestTitle: v.string(),
    requestName: v.string(),
    requestPhone: v.string(),
    offerId: v.string(),
    offerTitle: v.string(),
    offerName: v.string(),
    offerPhone: v.string(),
    score: v.number(),
    reasons: v.array(v.string()),
    status: v.string(),
    notifiedAt: v.optional(v.number()),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_created", ["createdAt"])
    .index("by_category", ["category"])
    .index("by_status", ["status"])
    .index("by_pair", ["requestId", "offerId"]),

  /**
   * ⭐ أرشيف مقدمي التوظيف وتقييمهم بالنجوم (مؤهلات + خبرات + موثوقية).
   * يُحتسب آلياً من طلبات المنشأة، ويمكن للإدارة تعديله يدوياً.
   */
  employerRatings: defineTable({
    name: v.string(),
    phone: v.string(),
    stars: v.number(),
    score: v.number(),
    qualifications: v.number(),
    experience: v.number(),
    reliability: v.number(),
    jobsPosted: v.number(),
    jobsFilled: v.number(),
    verified: v.boolean(),
    manual: v.boolean(),
    note: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_phone", ["phone"])
    .index("by_stars", ["stars"])
    .index("by_updated", ["updatedAt"]),

  /**
   * 🗂️ سجل الأرشفة والفهرسة — كل عملية أرشفة أو بناء فهرس تُقيّد هنا
   * كي يُظهر لوحة الكنترول أثراً كاملاً وقابلاً للتتبع.
   */
  archiveLog: defineTable({
    kind: v.string(), // submission | ad | offer | client | index
    entityId: v.string(),
    title: v.string(),
    category: v.optional(v.string()),
    reason: v.string(),
    files: v.number(),
    channels: v.array(v.string()),
    createdAt: v.number(),
  })
    .index("by_created", ["createdAt"])
    .index("by_kind", ["kind"]),

  /**
   * 📮 مشتركو النشرة البريدية — قاعدة حملات البريد الأوتوماتيكية.
   * unsubToken: رمز إلغاء اشتراك فريد يُوضع في تذييل كل رسالة
   * (رابط إلغاء الاشتراك إلزامي في أي حملة بريد حقيقية).
   */
  emailSubscribers: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    source: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    status: v.union(v.literal("active"), v.literal("unsubscribed")),
    unsubToken: v.string(),
    createdAt: v.number(),
    lastSentAt: v.optional(v.number()),
    unsubscribedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  /**
   * 📣 حملة بريد — من الإنشاء إلى الإرسال الكامل، على دفعات مع إعادة محاولة،
   * فلا تضيع رسالة ولا يُرسل المرسل مرتين في الحملة نفسها.
   */
  emailCampaigns: defineTable({
    subject: v.string(),
    preview: v.optional(v.string()),
    body: v.string(),
    fromName: v.optional(v.string()),
    replyTo: v.optional(v.string()),
    audience: v.optional(v.string()), // all | tag:<name>
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("sending"),
      v.literal("paused"),
      v.literal("sent"),
      v.literal("stopped")
    ),
    scheduledAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    total: v.number(),
    sent: v.number(),
    failed: v.number(),
    cursor: v.number(),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_scheduled", ["scheduledAt"])
    .index("by_created", ["createdAt"]),

  /** 📴 سجل تغيّرات حالة القنوات (إيقاف/تشغيل) — أثر تدقيق واضح. */
  channelPauseLog: defineTable({
    channel: v.string(),
    paused: v.boolean(),
    reason: v.string(),
    at: v.number(),
  })
    .index("by_channel", ["channel"])
    .index("by_at", ["at"]),

  /** 📋 سجل الإرسال التفصيلي لكل حملة — يضمن عدم التكرار ويكشف الفشل. */
  emailLog: defineTable({
    campaignId: v.id("emailCampaigns"),
    email: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    error: v.optional(v.string()),
    attempts: v.number(),
    createdAt: v.number(),
    sentAt: v.optional(v.number()),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_status", ["status"])
    .index("by_email", ["email"])
    .index("by_created", ["createdAt"]),

  /**
   * 📜 التوثيق الإلكتروني الموثق بالبصمة — يُستكمل داخل قائمة إتمام التوافق
   *    قبل إتمام المطابقة وتسليم الطالب/العميل. يثبت الحقوق المالية:
   *    الاسم الكامل · الهاتف · التوقيع الإلكتروني · البصمة (WebAuthn) ·
   *    والمبلغ المتفق عليه كعمولة للمنصة، ويُصدر منه سند الدفع (PDF).
   *    status: draft (بانتظار توقيع المستفيد عن بُعد) | signed | paid | void
   */
  contracts: defineTable({
    matchId: v.optional(v.string()),
    title: v.string(),
    beneficiaryName: v.string(),
    phone: v.string(),
    amount: v.number(),
    commission: v.number(),
    currency: v.string(),
    signature: v.string(),
    signatureType: v.string(),
    fingerprint: v.optional(
      v.object({
        mode: v.string(),
        credentialId: v.optional(v.string()),
        verified: v.boolean(),
      })
    ),
    signToken: v.optional(v.string()),
    receiptNo: v.optional(v.string()),
    status: v.string(),
    signedAt: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    voidReason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_match", ["matchId"])
    .index("by_status", ["status"])
    .index("by_signToken", ["signToken"])
    .index("by_created", ["createdAt"]),
});