// Channel-publish bookkeeping (regular mutations — NOT node actions).
// The node actions in `channels.ts` do the actual sending; these mutations
// record which channels received an item, keep a durable delivery outbox so a
// failed channel API never loses a post, and let the admin re-push any live
// item with one click.
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin } from "./auth";
import { api, internal } from "./_generated/api";
import { DEFAULT_PAUSE_REASON, isPausedByDefault } from "./channelPolicy";

/** كل قنوات المنصة الرسمية. */
export const CHANNEL_NAMES = [
  "telegram",
  "whatsapp",
  "whatsapp_group",
  "facebook_page",
  "facebook_group",
] as const;
export type ChannelName = (typeof CHANNEL_NAMES)[number];

const MAX_ATTEMPTS = 5;

/**
 * 📴 القنوات المتوقفة افتراضياً عند أول تشغيل للنظام.
 * السياسة معرّفة في channelPolicy.ts حتى تشاركها قناة النشر ولوحة التحكم.
 */
type PauseMap = Record<string, boolean>;

/** قراءة القنوات المتوقفة (داخلي). */
export const getPausedInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "channelPaused"))
      .first();
    const stored = (row?.value ?? {}) as PauseMap;
    const out: PauseMap = {};
    for (const channel of CHANNEL_NAMES) {
      // القاعدة: فيسبوك متوقّف افتراضياً، إلا إذا خُزّن قرار صريح
      const defaultPaused = isPausedByDefault(channel);
      out[channel] = typeof stored[channel] === "boolean" ? stored[channel] : defaultPaused;
    }
    return out;
  },
});

/** ضبط حالة قناة (متوقفة/مفعّلة) من لوحة التحكم. */
export const setChannelPaused = mutation({
  args: {
    token: v.string(),
    channel: v.string(),
    paused: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { token, channel, paused, reason }) => {
    await requireAdmin(ctx, token);
    if (!(CHANNEL_NAMES as readonly string[]).includes(channel)) {
      throw new ConvexError("قناة غير معروفة");
    }
    const existing = (await ctx.runQuery(internal.channelPush.getPausedInternal, {})) as PauseMap;
    const next: PauseMap = { ...existing, [channel]: paused };
    await ctx.db.insert("channelPauseLog", {
      channel,
      paused,
      reason: reason?.trim() || (paused ? "إيقاف يدوي من لوحة التحكم" : "تشغيل يدوي من لوحة التحكم"),
      at: Date.now(),
    });
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "channelPaused"))
      .first();
    if (row) await ctx.db.patch(row._id, { value: next });
    else await ctx.db.insert("settings", { key: "channelPaused", value: next });
    // فحص صحة فوري حتى تنعكس الحالة في اللوحة فوراً
    await ctx.scheduler.runAfter(0, internal.channels.checkChannels, {});
    return { ok: true, paused: next };
  },
});

/** حالة القنوات (مفعّلة/متوقفة) للمشرف. */
export const getChannelSwitches = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const paused = (await ctx.runQuery(internal.channelPush.getPausedInternal, {})) as PauseMap;
    return {
      channels: CHANNEL_NAMES.map((channel) => ({
        channel,
        paused: paused[channel] === true,
        reason: paused[channel] === true ? DEFAULT_PAUSE_REASON[channel] ?? "" : "",
      })),
    };
  },
});

/** (داخلي) رفع الإيقاف تلقائياً بعد ربط توكن صالح — يُستدعى عند الربط. */
export const unpauseIfTokenHealthy = internalMutation({
  args: {},
  handler: async (ctx) => {
    const fb = (await ctx.runQuery(internal.facebookStore.getConfigInternal, {})) as {
      facebookAccessToken?: string;
      facebookCanPost?: boolean;
      facebookTokenExpiresAt?: number;
      facebookTokenType?: string;
    };
    const token = fb.facebookAccessToken?.trim() ?? "";
    if (!token) return { ok: false, changed: [] };
    // نرفع الإيقاف عند تأكيد صلاحية النشر، أو عند توكن صفحة دائم (لا ينتهي)
    // وصلاحيته غير مؤكدة — لأن تأكيدها العملي الوحيد هو محاولة نشر فعلية،
    // وأي فشل يُسجّل فوراً في سجل القنوات مع سببه الدقيق.
    const pageTokenUnverified =
      fb.facebookTokenType === "PAGE" &&
      fb.facebookCanPost === null &&
      Number(fb.facebookTokenExpiresAt ?? 0) === 0;
    if (fb.facebookCanPost !== true && !pageTokenUnverified) return { ok: false, changed: [] };
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "channelPaused"))
      .first();
    const stored = ((row?.value ?? {}) as PauseMap) ?? {};
    const next: PauseMap = { ...stored, facebook_page: false, facebook_group: false };
    if (row) await ctx.db.patch(row._id, { value: next });
    else await ctx.db.insert("settings", { key: "channelPaused", value: next });
    return { ok: true, changed: ["facebook_page", "facebook_group"] };
  },
});

/** Internal — records which channels received the item. */
export const recordChannelPublish = mutation({
  args: {
    kind: v.union(v.literal("submission"), v.literal("ad"), v.literal("offer")),
    itemId: v.string(),
    channels: v.array(v.string()),
    at: v.number(),
  },
  handler: async (ctx, { kind, itemId, channels, at }) => {
    const id = itemId as any;
    const doc = (await ctx.db.get(id)) as any;
    if (!doc) return { ok: false };
    const existing = new Set<string>((doc.publishedTo ?? []) as string[]);
    channels.forEach((c) => existing.add(c));
    await ctx.db.patch(id, { publishedTo: [...existing], lastChannelPush: at });
    return { ok: true };
  },
});

/**
 * 📮 إدخال رسالة في صندوق القنوات الموثوق: تُسجَّل أولاً لكل قناة، ثم تُحاول
 * الإرسال. أي فشل يبقى في الصندوق ويُعاد تلقائياً في دورة الأتمتة — فلا يضيع
 * منشور أبداً بسبب انقطاع في واجهة قناة.
 */
export const enqueueOutbox = internalMutation({
  args: {
    title: v.string(),
    message: v.string(),
    category: v.optional(v.string()),
    kind: v.optional(v.string()),
    entityId: v.optional(v.string()),
    channels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { title, message, category, kind, entityId, channels }) => {
    const now = Date.now();
    const targets = (channels ?? [...CHANNEL_NAMES]).filter((c) =>
      (CHANNEL_NAMES as readonly string[]).includes(c)
    );
    const rows: { id: string; channel: string }[] = [];
    for (const channel of targets) {
      const id = await ctx.db.insert("channelOutbox", {
        channel,
        title,
        message,
        category,
        kind,
        entityId,
        status: "pending",
        attempts: 0,
        createdAt: now,
        updatedAt: now,
      });
      rows.push({ id: String(id), channel });
    }
    return rows;
  },
});

/** Internal — نتيجة محاولة الإرسال لقناة واحدة. */
export const markOutboxResult = internalMutation({
  args: {
    id: v.string(),
    ok: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { id, ok, error }) => {
    const row = (await ctx.db.get(id as any)) as any;
    if (!row) return { ok: false };
    const now = Date.now();
    await ctx.db.patch(row._id, {
      status: ok ? "sent" : "failed",
      attempts: (row.attempts ?? 0) + 1,
      lastError: ok ? undefined : (error ?? "send failed"),
      sentAt: ok ? now : row.sentAt,
      updatedAt: now,
    });
    return { ok: true };
  },
});

/** يطلب فحصاً فورياً لقنوات المنصة من لوحة الكنترول (يعمل في الخلفية). */
export const requestChannelCheck = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    await ctx.scheduler.runAfter(0, internal.channels.checkChannels, {});
    return { ok: true };
  },
});

/** تنبيه نظامي عند تغيّر حالة قنوات المنصة (انقطاع/تعافي). */
export const logChannelEvent = internalMutation({
  args: { title: v.string(), message: v.string() },
  handler: async (ctx, { title, message }) => {
    await ctx.db.insert("notifications", {
      title,
      message,
      category: "system",
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

/** 🩺 يُسجّل نتيجة فحص صحة القنوات (تُحدَّث صفاً بصَف، فلا تتضخّم البيانات). */
export const saveChannelStatus = internalMutation({
  args: {
    rows: v.array(
      v.object({
        channel: v.string(),
        status: v.string(),
        detail: v.string(),
        latencyMs: v.optional(v.number()),
      })
    ),
    checkedAt: v.number(),
  },
  handler: async (ctx, { rows, checkedAt }) => {
    for (const row of rows) {
      const existing = await ctx.db
        .query("channelStatus")
        .withIndex("by_channel", (q) => q.eq("channel", row.channel))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, {
          status: row.status,
          detail: row.detail,
          latencyMs: row.latencyMs,
          checkedAt,
        });
      } else {
        await ctx.db.insert("channelStatus", { ...row, checkedAt });
      }
    }
    return { saved: rows.length };
  },
});

/** حالة القنوات بشكل نظيف للاستهلاك العام (بلا معرّفات داخلية). */
export const listChannelStatusPublic = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("channelStatus").collect();
    return rows.map((row) => ({
      channel: row.channel,
      status: row.status,
      detail: row.detail,
      checkedAt: row.checkedAt,
    }));
  },
});

/**
 * (عام) حالة آخر تشغيل لاستيراد توكن فيسبوك من البيئة — أرقام وحالة فقط،
 * لا تحتوي أي سر: هل البيئة تحوي توكناً؟ ما القرار الذي اتُّخذ؟ هل النشر ممنوح؟
 */
export const getBootstrapStatePublic = internalQuery({
  args: {},
  handler: async (ctx): Promise<Record<string, unknown> | null> => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "facebookBootstrapState"))
      .first();
    return (row?.value as Record<string, unknown>) ?? null;
  },
});

/**
 * 🔄 حالة التجديد الذاتي لتوكن فيسبوك — بلا كشف أي سر (قيم منطقية فقط).
 * تُستخدم في نقطة التشخيص `/channels` ليعرف المشرف فوراً:
 *   • هل بيانات اعتماد التطبيق (App ID + App Secret) موجودة؟
 *   • هل التجديد الآلي مُفعّل فعلاً؟ وكم يوماً متبقياً على التوكن؟
 */
export const getRenewalStatePublic = internalQuery({
  args: {},
  handler: async (ctx): Promise<Record<string, unknown>> => {
    const keys = [
      "facebookAppId",
      "facebookAppSecret",
      "facebookUserToken",
      "facebookAccessToken",
      "facebookTokenExpiresAt",
      "facebookUserTokenExpiresAt",
      "facebookCanPost",
      "facebookPageName",
      // مفاتيح التشخيص التي كانت ناقصة هنا، فكانت نقطة /channels تُعلنها
      // «غير موجودة» حتى لو كانت محفوظة فعلاً (رسائل مضلّلة).
      "facebookPageId",
      "facebookTokenType",
      "facebookLastProbeAt",
      "facebookPostingDetail",
    ];
    const config: Record<string, string | number | boolean | undefined> = {};
    for (const key of keys) {
      const row = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", `facebook${key.slice("facebook".length)}`))
        .first();
      config[key] = row?.value as string | number | boolean | undefined;
    }
    const appId = (config.facebookAppId as string | undefined)?.trim() ?? "";
    const appSecret = (config.facebookAppSecret as string | undefined)?.trim() ?? "";
    const userToken = (config.facebookUserToken as string | undefined)?.trim() ?? "";
    const token = (config.facebookAccessToken as string | undefined)?.trim() ?? "";
    const tokenExpiresAt = Number(config.facebookTokenExpiresAt ?? 0);
    const now = Date.now();
    // وجود الأسرار في بيئة Convex نفسه (قيم منطقية فقط — لا تُكشف أي قيمة).
    const appCredsInEnv =
      (process.env.FACEBOOK_APP_ID ?? "").trim().length > 0 &&
      (process.env.FACEBOOK_APP_SECRET ?? "").trim().length > 0;
    const pageTokenInEnv = (process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? "").trim().length > 0;
    return {
      hasAppCredentials: appId.length > 0 && appSecret.length > 0,
      appCredentialsInEnv: appCredsInEnv,
      pageTokenInEnv,
      tokenType: (config.facebookTokenType as string | undefined) ?? "",
      hasUserToken: userToken.length > 0,
      hasToken: token.length > 0,
      autoRenew: appId.length > 0 && appSecret.length > 0 && userToken.length > 0,
      permanent: token.length > 0 && tokenExpiresAt === 0,
      tokenDaysLeft: tokenExpiresAt > 0 ? Math.ceil((tokenExpiresAt - now) / 86_400_000) : null,
      canPost: typeof config.facebookCanPost === "boolean" ? config.facebookCanPost : null,
      pageName: (config.facebookPageName as string | undefined) ?? "",
      // نتيجة آخر اختبار نشر فعلي (لا تحوي أي سر — رسالة Graph نفسها).
      lastProbeAt: Number(config.facebookLastProbeAt ?? 0) || null,
      probeDetail: (config.facebookPostingDetail as string | undefined) ?? "",
      pageIdSaved: ((config.facebookPageId as string | undefined) ?? "").length > 0,
    };
  },
});

/**
 * 🏠 نشر إشعار داخل المنصة — قناة منصة كاملة (تظهر لكل المستخدمين في التطبيق)
 * تُستخدم من النشر اليدوي الاحتياطي إلى جانب القنوات الخارجية.
 */
export const publishPlatformNotice = internalMutation({
  args: { title: v.string(), message: v.string() },
  handler: async (ctx, { title, message }) => {
    await ctx.db.insert("notifications", {
      title: title.trim().slice(0, 120) || "إعلان من المنصة",
      message: message.trim().slice(0, 4000),
      category: "announcement",
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

/** آخر حالة مسجّلة لكل قناة (داخلي — يُستخدم لكشف التحوّل من انقطاع إلى تعافي). */
export const getStatusesInternal = internalQuery({
  args: {},
  handler: async (ctx) => await ctx.db.query("channelStatus").collect(),
});

/** 🩺 صحة قنوات المنصة الرسمية — تُعرض في لوحة الكنترول. */
export const getChannelHealth = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const rows = await ctx.db.query("channelStatus").collect();
    const order = [...CHANNEL_NAMES] as readonly string[];
    const sorted = [...rows].sort(
      (a, b) => order.indexOf(a.channel) - order.indexOf(b.channel)
    );
    const checkedAt = sorted.reduce((max, row) => Math.max(max, row.checkedAt), 0);
    return {
      rows: sorted.map((row) => ({
        channel: row.channel,
        status: row.status,
        detail: row.detail,
        latencyMs: row.latencyMs ?? null,
        checkedAt: row.checkedAt,
      })),
      checkedAt: checkedAt || null,
      healthy: sorted.filter((row) => row.status === "ok").length,
      total: sorted.length,
    };
  },
});

/** التقاط صفوف فشلت (أو تعطلت) لإعادة المحاولة — يُستخدم في دورة الأتمتة. */
export async function collectRetryableOutbox(
  ctx: MutationCtx,
  limit = 8
): Promise<{ _id: unknown; channel: string; title: string; message: string }[]> {
  const now = Date.now();
  const failed = await ctx.db
    .query("channelOutbox")
    .withIndex("by_status", (q) => q.eq("status", "failed"))
    .order("asc")
    .take(limit);
  const retryable = failed.filter((row) => (row.attempts ?? 0) < MAX_ATTEMPTS);
  if (retryable.length >= limit) return retryable.slice(0, limit);
  // صفوف عالقة في «قيد الإرسال» منذ أكثر من 5 دقائق (انقطاع أثناء الإرسال)
  const stuckCutoff = now - 5 * 60 * 1000;
  const pending = await ctx.db
    .query("channelOutbox")
    .withIndex("by_status", (q) => q.eq("status", "pending"))
    .order("asc")
    .take(limit);
  const stuck = pending.filter((row) => row.updatedAt < stuckCutoff);
  return [...retryable, ...stuck].slice(0, limit);
}

/** إحصائيات الصندوق للوحة الكنترول. */
export const getOutboxStats = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const rows = await ctx.db.query("channelOutbox").collect();
    const byStatus: Record<string, number> = { pending: 0, sent: 0, failed: 0 };
    const byChannel: Record<string, number> = {};
    let lastSentAt = 0;
    let lastError: string | undefined;
    for (const row of rows) {
      byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
      byChannel[row.channel] = (byChannel[row.channel] ?? 0) + 1;
      if (row.sentAt && row.sentAt > lastSentAt) lastSentAt = row.sentAt;
      if (row.status === "failed" && (row.lastError || row.title)) {
        lastError = `${row.channel}: ${row.lastError ?? row.title}`;
      }
    }
    return { total: rows.length, byStatus, byChannel, lastSentAt, lastError };
  },
});

/** إعادة محاولة كل الرسائل الفاشلة بضغطة واحدة من لوحة الكنترول. */
export const retryFailed = mutation({
  args: { token: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { token, limit }) => {
    await requireAdmin(ctx, token);
    const rows = await collectRetryableOutbox(ctx, limit ?? 20);
    for (const row of rows) {
      await ctx.db.patch(row._id as any, { status: "pending", updatedAt: Date.now() });
      await ctx.scheduler.runAfter(0, internal.channels.deliverOutboxItem, {
        id: String(row._id),
        channel: row.channel,
        title: row.title,
        message: row.message,
      });
    }
    return { ok: true, retried: rows.length };
  },
});

/** آخر رسائل الصندوق (لعرضها في لوحة الكنترول). */
export const listOutbox = query({
  args: { token: v.string(), status: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { token, status, limit }) => {
    await requireAdmin(ctx, token);
    const rows = await ctx.db
      .query("channelOutbox")
      .withIndex("by_created")
      .order("desc")
      .take(limit ?? 60);
    return status && status !== "all" ? rows.filter((row) => row.status === status) : rows;
  },
});

/** Admin action: re-push a live item to the channels with one click. */
export const repush = mutation({
  args: {
    token: v.string(),
    kind: v.union(v.literal("submission"), v.literal("ad"), v.literal("offer")),
    itemId: v.string(),
  },
  handler: async (ctx, { token, kind, itemId }) => {
    await requireAdmin(ctx, token);
    const id = itemId as any;
    const doc = (await ctx.db.get(id)) as any;
    if (!doc) throw new ConvexError("العنصر غير موجود");
    let title = "";
    let message = "";
    let url = "/";
    let price: string | undefined;

    if (kind === "submission") {
      if (doc.status !== "published" && doc.status !== "sold")
        throw new ConvexError("لا يمكن النشر للقنوات — العنصر غير منشور");
      title = doc.title;
      message = doc.description ?? doc.title;
      url =
        doc.category === "jobs"
          ? "/jobs"
          : doc.category === "real_estate"
            ? "/real-estate"
            : doc.category === "emarket"
              ? "/emarket"
              : "/software";
      if (doc.price !== undefined)
        price = `${doc.price.toLocaleString("en-US")} ${doc.currency === "usd" ? "$" : "ريال يمني"}`;
    } else if (kind === "ad") {
      if (doc.status !== "active") throw new ConvexError("الإعلان غير نشط");
      title = doc.title;
      message = doc.message;
      url = "/";
    } else {
      if (doc.status !== "published") throw new ConvexError("العرض غير منشور");
      title = doc.title;
      message = doc.description;
      url = "/offers";
      if (doc.offerPrice !== undefined)
        price = `${doc.offerPrice.toLocaleString("en-US")} ريال يمني${doc.discountPercent !== undefined ? ` — خصم ${doc.discountPercent}%` : ""}`;
    }

    await ctx.scheduler.runAfter(0, api.channels.publishToChannels, {
      kind,
      itemId,
      title,
      message,
      url,
      price,
    });
    return { ok: true };
  },
});
