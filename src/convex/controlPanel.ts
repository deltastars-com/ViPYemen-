/**
 * 🎛️ لوحة الكنترول الشاملة — ViP Yemen
 *
 * كل ما تحتاجه الإدارة في مكان واحد:
 *   1. التحليلات الكاملة      — الأعداد، المعدّلات، الخط الزمني، الحالة لكل قسم
 *   2. الأتمتة الشاملة        — صحة طابور الملفات، المطابقات، التقييمات، المؤشرات
 *   3. الأرشفة                — أرشفة تلقائية/فورية مع سجل كامل وربط بقناة التلجرام
 *   4. الفهرسة                — بناء فهرس كلمات لكل المنشورات + بحث فوري
 *   5. التنبيهات الحية        — شاغرة / تم التوظيف / متاح / تم البيع لكل ما على الواجهة
 *   6. الإشعارات للعملاء      — عميل سابق: تنشيط الطلب أو إضافة جديد
 *   7. تقييم مقدمي التوظيف    — أرشيف بالنجوم (في employers.ts)
 *   8. المطابقة والتوافق      — محرك الترشيح التلقائي (في matching.ts)
 */
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin } from "./auth";
import { internal } from "./_generated/api";
import { tokenize, MIN_MATCH_SCORE } from "./matching";

const CATEGORIES = ["jobs", "real_estate", "emarket", "software"] as const;
const DAY = 24 * 60 * 60 * 1000;
const PUBLISHED_ARCHIVE_DAYS = 60;
const REJECTED_ARCHIVE_DAYS = 90;

export const NOTICE_STATES = ["vacant", "hired", "available", "sold", "active", "scheduled", "paused"] as const;
export type NoticeState = (typeof NOTICE_STATES)[number];

export interface NoticeRow {
  id: string;
  kind: "submission" | "ad" | "offer";
  title: string;
  category: string;
  state: NoticeState;
  label: string;
  name: string;
  phone: string;
  url: string;
  channels: string[];
  lastPush?: number;
  ageDays: number;
  matchScore?: number;
}

/** حالة الإعلان/الطلب كما تظهر للجمهور: شاغرة / تم التوظيف / متاح / تم البيع */
export function noticeStateOf(category: string, status: string): NoticeState {
  if (status === "sold") {
    return category === "real_estate" || category === "emarket" ? "sold" : "hired";
  }
  return category === "jobs" ? "vacant" : "available";
}

export function noticeLabelOf(category: string, state: NoticeState): string {
  switch (state) {
    case "vacant":
      return "شاغرة";
    case "hired":
      return "تم التوظيف";
    case "available":
      return "متاح";
    case "sold":
      return "تم البيع";
    case "active":
      return "إعلان نشط";
    case "scheduled":
      return "إعلان مجدول";
    case "paused":
      return "إعلان موقوف";
  }
}

function sectionUrl(category: string): string {
  switch (category) {
    case "jobs":
      return "/jobs";
    case "real_estate":
      return "/real-estate";
    case "emarket":
      return "/emarket";
    case "software":
      return "/software";
    default:
      return "/";
  }
}

/* ─────────────────────── الأرشفة والفهرسة (مشتركة) ─────────────────────── */

/** إدخال مرفقات الطلب في طابور التوجيه إلى قناة التلجرام (بلا تكرار). */
export async function enqueueFiles(
  ctx: MutationCtx,
  submission: {
    _id: unknown;
    title: string;
    attachments?: { name: string; storageId: string; kind: string }[];
  }
): Promise<number> {
  if (!submission.attachments || submission.attachments.length === 0) return 0;
  const existing = await ctx.db
    .query("fileQueue")
    .withIndex("by_entity", (q) =>
      q.eq("entityType", "submission").eq("entityId", String(submission._id))
    )
    .collect();
  const known = new Set(existing.map((row) => row.storageId));
  let queued = 0;
  for (const attachment of submission.attachments) {
    if (known.has(attachment.storageId)) continue;
    await ctx.db.insert("fileQueue", {
      storageId: attachment.storageId,
      fileName: attachment.name,
      fileKind: attachment.kind,
      fileSize: 0,
      mimeType:
        attachment.kind === "image"
          ? "image/jpeg"
          : attachment.kind === "video"
            ? "video/mp4"
            : attachment.kind === "audio"
              ? "audio/mpeg"
              : "application/octet-stream",
      entityType: "submission",
      entityId: String(submission._id),
      status: "pending",
      retryCount: 0,
      createdAt: Date.now(),
    });
    queued += 1;
  }
  return queued;
}

/**
 * أرشفة كل ما انتهت صلاحيته: المنشور > 60 يوماً والمرفوض > 90 يوماً،
 * مع تقييد العملية في سجل الأرشفة وإرسال ملفات الطلب إلى قناة المنصة.
 */
export async function archiveExpired(
  ctx: MutationCtx,
  opts: { publishedDays?: number; rejectedDays?: number; notify?: boolean } = {}
): Promise<{ archived: number; files: number; recaps: number }> {
  const now = Date.now();
  const publishedCutoff = now - (opts.publishedDays ?? PUBLISHED_ARCHIVE_DAYS) * DAY;
  const rejectedCutoff = now - (opts.rejectedDays ?? REJECTED_ARCHIVE_DAYS) * DAY;
  let archived = 0;
  let files = 0;
  let recaps = 0;

  const all = await ctx.db.query("submissions").withIndex("by_created").order("desc").take(600);

  for (const row of all) {
    const expired =
      row.status === "published" && !!row.publishedAt && row.publishedAt <= publishedCutoff;
    const staleRejected = row.status === "rejected" && row.updatedAt <= rejectedCutoff;
    if (!expired && !staleRejected) continue;
    const history = row.history ?? [];
    history.push({
      by: "النظام",
      at: now,
      action: "archived",
      note: expired
        ? `أرشفة تلقائية بعد ${opts.publishedDays ?? PUBLISHED_ARCHIVE_DAYS} يوماً من النشر`
        : `أرشفة تلقائية بعد ${opts.rejectedDays ?? REJECTED_ARCHIVE_DAYS} يوماً من الرفض`,
    });
    const queued = expired ? await enqueueFiles(ctx, row) : 0;
    files += queued;
    await ctx.db.patch(row._id, { status: "archived", archivedAt: now, history, updatedAt: now });
    await ctx.db.insert("archiveLog", {
      kind: "submission",
      entityId: String(row._id),
      title: row.title,
      category: row.category,
      reason: expired ? "انتهاء صلاحية النشر" : "مرفوض — انتهت مدة المراجعة",
      files: queued,
      channels: queued > 0 ? ["telegram"] : [],
      createdAt: now,
    });
    archived += 1;
  }

  // عدد الملفات المرفوعة لكل رقم — تُقيَّد في كشف العميل وفي قناة المنصة
  const filesByPhone = new Map<string, number>();
  for (const row of all) {
    const count = (row.attachments ?? []).length;
    filesByPhone.set(row.phone, (filesByPhone.get(row.phone) ?? 0) + count);
  }

  // أرشفة سجل كل عميل سابق (أكثر من طلب) في قناة التلجرام — بحد أقصى 3 في الدورة
  const clients = await ctx.db.query("followups").withIndex("by_updated").order("desc").take(300);
  const MAX_RECAPS_PER_RUN = 3;
  for (const client of clients) {
    if ((client.submissionCount ?? 0) < 2) continue;
    const archivedFiles = filesByPhone.get(client.phone) ?? 0;
    if (client.archivedAt && (client.archivedFiles ?? 0) >= archivedFiles) continue;
    await ctx.db.patch(client._id, {
      archivedAt: client.archivedAt ?? now,
      archivedFiles,
      returningNotifiedAt: client.returningNotifiedAt ?? now,
    });
    await ctx.db.insert("archiveLog", {
      kind: "client",
      entityId: String(client._id),
      title: client.fullName,
      category: client.category,
      reason: "أرشفة سجل عميل سابق في قناة المنصة",
      files: archivedFiles,
      channels: ["telegram"],
      createdAt: now,
    });
    recaps += 1;
    if (recaps <= MAX_RECAPS_PER_RUN) {
      const maskedPhone = client.phone.replace(/^(\d{3})\d{3}(\d{3})$/, "$1***$2");
      await ctx.scheduler.runAfter(0, internal.channels.publishNotice, {
        title: "🗂️ أرشيف عميل سابق",
        message: [
          `👤 العميل: ${client.fullName} (${maskedPhone})`,
          `📊 عدد الطلبات السابقة: ${client.submissionCount ?? 0}`,
          client.lastSubmissionTitle ? `🆔 آخر طلب: ${client.lastSubmissionTitle}` : "",
          `📎 الملفات المؤرشفة في قناة المنصة: ${archivedFiles}`,
          "ℹ️ العميل السابق يكفي أن يُنشّط طلبه السابق أو يضيف جديداً غير ما أرسل سابقاً.",
        ].filter(Boolean).join("\n"),
        category: "clients",
      });
    }
  }

  if (opts.notify !== false && (archived > 0 || recaps > 0)) {
    await ctx.db.insert("notifications", {
      title: "أتمتة الأرشفة",
      message: `تمت أرشفة ${archived} عنصراً، و${files} ملف إلى قناة المنصة، وتقييد ${recaps} سجل عميل`,
      category: "system",
      createdAt: now,
    });
  }
  return { archived, files, recaps };
}

/** بناء فهرس الكلمات لكل الطلبات (يُستخدم في البحث الفوري بلوحة الكنترول). */
export async function buildPlatformIndex(
  ctx: MutationCtx
): Promise<{ indexed: number; keys: number }> {
  const now = Date.now();
  const rows = await ctx.db.query("submissions").withIndex("by_created").order("desc").take(600);
  let keys = 0;
  for (const row of rows) {
    const fieldValues = Object.values((row.fields ?? {}) as Record<string, unknown>).map(String);
    const indexKeys = Array.from(
      new Set(
        tokenize(
          [
            row.title,
            row.description ?? "",
            row.address ?? "",
            row.fullName,
            row.phone,
            row.category,
            row.type,
            row.status,
            ...fieldValues,
          ].join(" ")
        )
      )
    ).slice(0, 60);
    keys += indexKeys.length;
    await ctx.db.patch(row._id, { indexKeys, indexedAt: now });
  }
  const settings = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", "platformIndex"))
    .first();
  const value = { count: rows.length, keys, builtAt: now };
  if (settings) await ctx.db.patch(settings._id, { value });
  else await ctx.db.insert("settings", { key: "platformIndex", value });
  await ctx.db.insert("archiveLog", {
    kind: "index",
    entityId: "platformIndex",
    title: "بناء فهرس المنصة",
    reason: `فهرسة ${rows.length} عنصراً (${keys} كلمة مفتاحية)`,
    files: 0,
    channels: [],
    createdAt: now,
  });
  return { indexed: rows.length, keys };
}

/* ─────────────────────────── التحليلات الكاملة ─────────────────────────── */

export const getControlPanel = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const now = Date.now();
    const submissions = await ctx.db.query("submissions").withIndex("by_created").order("desc").take(600);
    const ads = await ctx.db.query("ads").collect();
    const offers = await ctx.db.query("offers").collect();
    const clients = await ctx.db.query("followups").collect();
    const payments = await ctx.db.query("payments").collect();
    const matches = await ctx.db.query("matchSuggestions").collect();
    const ratings = await ctx.db.query("employerRatings").collect();
    const files = await ctx.db.query("fileQueue").collect();
    const archive = await ctx.db.query("archiveLog").withIndex("by_created").order("desc").take(200);
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_created")
      .order("desc")
      .take(40);
    const indexSettings = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "platformIndex"))
      .first();

    const byStatus: Record<string, number> = {
      pending: 0, published: 0, rejected: 0, sold: 0, archived: 0,
    };
    for (const row of submissions) {
      byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    }

    const byCategory = CATEGORIES.map((category) => {
      const rows = submissions.filter((row) => row.category === category);
      const open = rows.filter((row) => row.status === "published").length;
      const closed = rows.filter((row) => row.status === "sold").length;
      return {
        category,
        total: rows.length,
        pending: rows.filter((row) => row.status === "pending").length,
        open,
        closed,
        archived: rows.filter((row) => row.status === "archived").length,
        matches: matches.filter((match) => match.category === category).length,
      };
    });

    const timeline: { day: number; count: number }[] = [];
    for (let offset = 13; offset >= 0; offset -= 1) {
      const start = new Date(now - offset * DAY);
      start.setHours(0, 0, 0, 0);
      const startMs = start.getTime();
      const endMs = startMs + DAY;
      timeline.push({
        day: startMs,
        count: submissions.filter((row) => row.createdAt >= startMs && row.createdAt < endMs).length,
      });
    }

    const total = submissions.length;
    const decided = byStatus.published + byStatus.sold;
    const oldestPublished = submissions
      .filter((row) => row.status === "published" && row.publishedAt)
      .sort((a, b) => (a.publishedAt ?? 0) - (b.publishedAt ?? 0))[0];
    const stalePending = submissions.filter(
      (row) => row.status === "pending" && row.createdAt < now - 7 * DAY
    ).length;

    const fileStates: Record<string, number> = { pending: 0, forwarding: 0, forwarded: 0, cleaned: 0, failed: 0 };
    for (const row of files) fileStates[row.status] = (fileStates[row.status] ?? 0) + 1;

    const matchStates: Record<string, number> = { all: matches.length };
    for (const row of matches) matchStates[row.status] = (matchStates[row.status] ?? 0) + 1;

    return {
      generatedAt: now,
      totals: {
        submissions: total,
        pending: byStatus.pending ?? 0,
        published: byStatus.published ?? 0,
        rejected: byStatus.rejected ?? 0,
        sold: byStatus.sold ?? 0,
        archived: byStatus.archived ?? 0,
        ads: ads.length,
        activeAds: ads.filter((ad) => ad.status === "active").length,
        offers: offers.length,
        publishedOffers: offers.filter((offer) => offer.status === "published").length,
        clients: clients.length,
        returningClients: clients.filter((client) => (client.submissionCount ?? 0) >= 2).length,
        payments: payments.length,
        pendingPayments: payments.filter((payment) => payment.status === "pending").length,
        files: files.length,
        archivedTotal: byStatus.archived,
        matchSuggestions: matches.length,
        employers: ratings.length,
      },
      rates: {
        approval: total > 0 ? Math.round((decided / total) * 100) : 0,
        closeRate: decided > 0 ? Math.round((byStatus.sold / decided) * 100) : 0,
        verified: total > 0
          ? Math.round((submissions.filter((row) => row.phoneVerified).length / total) * 100)
          : 0,
        indexed: submissions.filter((row) => (row.indexKeys ?? []).length > 0).length,
        fileDelivery: files.length > 0
          ? Math.round((((fileStates.forwarded ?? 0) + (fileStates.cleaned ?? 0)) / files.length) * 100)
          : 100,
      },
      byCategory,
      timeline,
      automation: {
        fileStates,
        matchStates,
        index: indexSettings?.value ?? null,
        archiveCount: archive.length,
        lastArchive: archive.slice(0, 6),
        events: notifications.filter((row) => row.category === "system").slice(0, 8),
        recentEvents: notifications.slice(0, 10),
        stalePending,
        oldestPublishedAt: oldestPublished?.publishedAt ?? null,
        archiveDueIn: oldestPublished?.publishedAt
          ? Math.max(
              0,
              Math.ceil(
                (oldestPublished.publishedAt + PUBLISHED_ARCHIVE_DAYS * DAY - now) / DAY
              )
            )
          : null,
      },
      notices: {
        vacant: submissions.filter((row) => row.status === "published" && row.category === "jobs").length,
        hired: submissions.filter((row) => row.status === "sold" && row.category === "jobs").length,
        available: submissions.filter(
          (row) => row.status === "published" && row.category !== "jobs"
        ).length,
        sold: submissions.filter((row) => row.status === "sold" && row.category !== "jobs").length,
        activeAds: ads.filter((ad) => ad.status === "active").length,
        scheduledAds: ads.filter((ad) => ad.status === "scheduled").length,
        liveOffers: offers.filter((offer) => offer.status === "published").length,
      },
      policy: {
        publishedArchiveDays: PUBLISHED_ARCHIVE_DAYS,
        rejectedArchiveDays: REJECTED_ARCHIVE_DAYS,
        minMatchScore: MIN_MATCH_SCORE,
      },
    };
  },
});

/* ─────────────────────── التنبيهات الحية على الواجهة ─────────────────────── */

async function buildNotices(
  ctx: QueryCtx,
  opts: { limit?: number } = {}
): Promise<NoticeRow[]> {
  const now = Date.now();
  const rows: NoticeRow[] = [];
  const submissions = await ctx.db
    .query("submissions")
    .withIndex("by_created")
    .order("desc")
    .take(300);
  for (const row of submissions) {
    if (row.status !== "published" && row.status !== "sold") continue;
    const state = noticeStateOf(row.category, row.status);
    rows.push({
      id: String(row._id),
      kind: "submission",
      title: row.title,
      category: row.category,
      state,
      label: noticeLabelOf(row.category, state),
      name: row.fullName,
      phone: row.phone,
      url: sectionUrl(row.category),
      channels: (row.publishedTo ?? []) as string[],
      lastPush: row.lastChannelPush,
      ageDays: Math.floor((now - (row.publishedAt ?? row.createdAt)) / DAY),
      matchScore: row.bestMatchScore,
    });
  }
  const ads = await ctx.db.query("ads").collect();
  for (const ad of ads) {
    if (ad.status !== "active" && ad.status !== "scheduled" && ad.status !== "paused") continue;
    const state = ad.status as NoticeState;
    rows.push({
      id: String(ad._id),
      kind: "ad",
      title: ad.title,
      category: "ads",
      state,
      label: noticeLabelOf("ads", state),
      name: "إعلان المنصة",
      phone: "00967711780999",
      url: "/",
      channels: (ad.publishedTo ?? []) as string[],
      lastPush: ad.lastChannelPush,
      ageDays: Math.floor((now - ad.createdAt) / DAY),
    });
  }
  const offers = await ctx.db.query("offers").collect();
  for (const offer of offers) {
    if (offer.status !== "published") continue;
    rows.push({
      id: String(offer._id),
      kind: "offer",
      title: offer.title,
      category: "offers",
      state: "available",
      label: noticeLabelOf("offers", "available"),
      name: "عرض المنصة",
      phone: "00967711780999",
      url: "/offers",
      channels: (offer.publishedTo ?? []) as string[],
      lastPush: offer.lastChannelPush,
      ageDays: Math.floor((now - offer.createdAt) / DAY),
    });
  }
  return rows.sort((a, b) => b.ageDays - a.ageDays).slice(0, opts.limit ?? 400);
}

export const listLiveNotices = query({
  args: {
    token: v.string(),
    state: v.optional(v.string()),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { token, state, category, limit }) => {
    await requireAdmin(ctx, token);
    let rows = await buildNotices(ctx, { limit: 400 });
    if (state && state !== "all") rows = rows.filter((row) => row.state === state);
    if (category && category !== "all") rows = rows.filter((row) => row.category === category);
    return rows.slice(0, limit ?? 300);
  },
});

/** ملخّص عام (بدون أي بيانات شخصية) يظهر للزوار: ما هو شاغر وما تم التوظيف/البيع. */
export const publicState = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, { category }) => {
    const now = Date.now();
    const scoped = category && category !== "all";
    const rows = scoped
      ? await ctx.db
          .query("submissions")
          .withIndex("by_category_status", (q) => q.eq("category", category as string))
          .take(300)
      : await ctx.db.query("submissions").withIndex("by_created").order("desc").take(300);
    const live = rows.filter((row) => row.status === "published" || row.status === "sold");
    const open = live.filter((row) => row.status === "published");
    const closed = live.filter((row) => row.status === "sold");
    const notices = live
      .sort((a, b) => (b.publishedAt ?? b.createdAt) - (a.publishedAt ?? a.createdAt))
      .slice(0, 5)
      .map((row) => {
        const state = noticeStateOf(row.category, row.status);
        return {
          title: row.title,
          category: row.category,
          state,
          label: noticeLabelOf(row.category, state),
          url: sectionUrl(row.category),
          ageDays: Math.floor((now - (row.publishedAt ?? row.createdAt)) / DAY),
        };
      });
    const ads = await ctx.db.query("ads").withIndex("by_status").collect();
    const offers = await ctx.db
      .query("offers")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();
    return {
      counts: {
        open: open.length,
        closed: closed.length,
        vacant: open.filter((row) => row.category === "jobs").length,
        hired: closed.filter((row) => row.category === "jobs").length,
        available: open.filter((row) => row.category !== "jobs").length,
        sold: closed.filter((row) => row.category !== "jobs").length,
      },
      notices,
      activeAds: ads.filter((ad) => ad.status === "active").length,
      liveOffers: offers.length,
      updatedAt: now,
    };
  },
});

/* ───────────────────────────── أوامر الكنترول ───────────────────────────── */

/** بثّ تنبيه حي إلى قنوات المنصة من لوحة الكنترول. */
export const publishLiveNotice = mutation({
  args: { token: v.string(), title: v.string(), message: v.string() },
  handler: async (ctx, { token, title, message }) => {
    await requireAdmin(ctx, token);
    if (title.trim().length < 3 || message.trim().length < 3) {
      throw new ConvexError("العنوان والرسالة مطلوبان");
    }
    await ctx.scheduler.runAfter(0, internal.channels.publishNotice, {
      title: title.trim(),
      message: message.trim(),
      category: "notice",
    });
    await ctx.db.insert("notifications", {
      title: "تنبيه حي من لوحة الكنترول",
      message: title.trim(),
      category: "system",
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const runArchiveNow = mutation({
  args: { token: v.string(), publishedDays: v.optional(v.number()), rejectedDays: v.optional(v.number()) },
  handler: async (ctx, { token, publishedDays, rejectedDays }) => {
    await requireAdmin(ctx, token);
    return archiveExpired(ctx, { publishedDays, rejectedDays });
  },
});

export const buildIndexNow = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const result = await buildPlatformIndex(ctx);
    return { ok: true, ...result };
  },
});

export const listArchive = query({
  args: { token: v.string(), kind: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { token, kind, limit }) => {
    await requireAdmin(ctx, token);
    let rows = await ctx.db
      .query("archiveLog")
      .withIndex("by_created")
      .order("desc")
      .take(limit ?? 200);
    if (kind && kind !== "all") rows = rows.filter((row) => row.kind === kind);
    return rows;
  },
});

/** فهرس المنصة: بحث فوري بكلمات مفتاحية في الطلبات + الإعلانات + العروض. */
export const searchIndex = query({
  args: {
    token: v.string(),
    q: v.string(),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { token, q, category, limit }) => {
    await requireAdmin(ctx, token);
    const terms = tokenize(q).slice(0, 8);
    if (terms.length === 0) return { terms, results: [] };
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_created")
      .order("desc")
      .take(500);
    const results: {
      id: string;
      kind: string;
      title: string;
      category: string;
      status: string;
      name: string;
      phone: string;
      hits: number;
      keys: string[];
      createdAt: number;
    }[] = [];
    for (const row of submissions) {
      if (category && category !== "all" && row.category !== category) continue;
      const keys = (row.indexKeys ?? []).length > 0
        ? (row.indexKeys as string[])
        : tokenize(
            [
              row.title,
              row.description ?? "",
              row.address ?? "",
              row.fullName,
              row.phone,
              ...Object.values((row.fields ?? {}) as Record<string, unknown>).map(String),
            ].join(" ")
          );
      const keySet = new Set(keys);
      const hits = terms.filter((term) => keySet.has(term)).length;
      if (hits === 0) continue;
      results.push({
        id: String(row._id),
        kind: "submission",
        title: row.title,
        category: row.category,
        status: row.status,
        name: row.fullName,
        phone: row.phone,
        hits,
        keys: keys.slice(0, 12),
        createdAt: row.createdAt,
      });
    }
    const ads = await ctx.db.query("ads").collect();
    for (const ad of ads) {
      const keySet = new Set(tokenize(`${ad.title} ${ad.message}`));
      const hits = terms.filter((term) => keySet.has(term)).length;
      if (hits === 0) continue;
      results.push({
        id: String(ad._id),
        kind: "ad",
        title: ad.title,
        category: "ads",
        status: ad.status,
        name: "إعلان المنصة",
        phone: "",
        hits,
        keys: [...keySet].slice(0, 12),
        createdAt: ad.createdAt,
      });
    }
    const offers = await ctx.db.query("offers").collect();
    for (const offer of offers) {
      const keySet = new Set(tokenize(`${offer.title} ${offer.description}`));
      const hits = terms.filter((term) => keySet.has(term)).length;
      if (hits === 0) continue;
      results.push({
        id: String(offer._id),
        kind: "offer",
        title: offer.title,
        category: "offers",
        status: offer.status,
        name: "عرض المنصة",
        phone: "",
        hits,
        keys: [...keySet].slice(0, 12),
        createdAt: offer.createdAt,
      });
    }
    results.sort((a, b) => b.hits - a.hits || b.createdAt - a.createdAt);
    return { terms, results: results.slice(0, limit ?? 60) };
  },
});

/** كشف العملاء العائدين: من أرسل أكثر من مرة، ومتى، وهل أُرشف، وكيف يتصرف. */
export const listReturningClients = query({
  args: { token: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { token, limit }) => {
    await requireAdmin(ctx, token);
    const rows = await ctx.db
      .query("followups")
      .withIndex("by_updated")
      .order("desc")
      .take(500);
    return rows
      .filter((row) => (row.submissionCount ?? 0) >= 2)
      .slice(0, limit ?? 200)
      .map((row) => ({
        id: String(row._id),
        fullName: row.fullName,
        phone: row.phone,
        category: row.category,
        submissionCount: row.submissionCount ?? 0,
        lastSubmissionTitle: row.lastSubmissionTitle,
        lastSubmissionAt: row.lastSubmissionAt ?? row.updatedAt,
        archivedAt: row.archivedAt,
        archivedFiles: row.archivedFiles ?? 0,
        returningNotifiedAt: row.returningNotifiedAt,
        stars: row.stars,
        status: row.status,
      }));
  },
});
