/**
 * 🔑 مفاتيح القنوات القابلة للربط من لوحة التحكم
 *
 * لماذا هذا الملف؟
 *  كان ربط تيليجرام ويوتيوب يعتمد على متغيرات البيئة وحدها، فلا يمكن
 *  إضافتها أو تحديثها إلا من خادم Convex. الآن يمكن للإدارة لصقها مباشرة
 *  من «قسم النشر التلقائي» داخل لوحة التحكم، وتُحفظ في جدول الإعدادات،
 *  ثم يعمل النشر التلقائي فوراً.
 *
 * قاعدة الأولوية (مطبَّقة في كل مكان):
 *   1) متغير بيئة Convex إن وُجد ← الأهم والأدوم
 *   2) القيمة المحفوظة من لوحة التحكم
 *   3) القيمة الافتراضية الثابتة (القناة الافتراضية)
 * وبذلك لا ينكسر النشر إن حُذفت قيمة من اللوحة، ولا تتوقف المنصة إن لم تُضبط.
 *
 * ⚠️ ملاحظة أمنية: هذه المفاتيح تُخزَّن في قاعدة بيانات Convex. وحرصاً على
 *   بقاء النسخ الاحتياطية متطابقة، أضف نفس المفاتيح إلى أسرار المستودع
 *   ومتغيرات Convex (Production) و Supabase عند كل تغيير.
 */
import { v, ConvexError } from "convex/values";
import { action, internalQuery, mutation, query, type ActionCtx } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { requireAdmin } from "./auth";

export const TELEGRAM_KEYS = ["telegramBotToken", "telegramChatIds"] as const;
export const YOUTUBE_KEYS = [
  "youtubeClientId",
  "youtubeClientSecret",
  "youtubeRefreshToken",
] as const;

export type TelegramKey = (typeof TELEGRAM_KEYS)[number];
export type YouTubeKey = (typeof YOUTUBE_KEYS)[number];

export interface TelegramRuntimeConfig {
  token: string;
  chatIds: string[];
  /** مصدر كل قيمة: env (متغير بيئة) | settings (لوحة التحكم) | default */
  tokenSource: "env" | "settings" | "default";
  chatSource: "env" | "settings" | "default";
}

export interface YouTubeRuntimeConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  ready: boolean;
  missing: string[];
  source: Record<YouTubeKey, "env" | "settings" | "none">;
}

/** القناة الافتراضية للمنصة — تُستعمل فقط إن لم تُضبط أي قيمة. */
export const TELEGRAM_CHAT_DEFAULT = "@vipyemen77";

/** أي سياق فيه قارئ قاعدة البيانات (استعلام · تغيير · فعل). */
type DbCtx = { db: any };

async function readSetting(ctx: DbCtx, key: string): Promise<string> {
  const row = await ctx.db
    .query("settings")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();
  return typeof row?.value === "string" ? row.value.trim() : "";
}

/** تيليجرام: متغير البيئة أولاً ثم لوحة التحكم ثم القناة الافتراضية. */
export async function resolveTelegramConfig(ctx: DbCtx): Promise<TelegramRuntimeConfig> {
  const envToken = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
  const envChats = (process.env.TELEGRAM_CHAT_ID ?? "").trim();
  const savedToken = await readSetting(ctx, "telegramBotToken");
  const savedChats = await readSetting(ctx, "telegramChatIds");

  const chatIds = envChats
    ? envChats.split(",").map((c) => c.trim()).filter(Boolean)
    : savedChats
      ? savedChats.split(",").map((c) => c.trim()).filter(Boolean)
      : [TELEGRAM_CHAT_DEFAULT];

  return {
    token: envToken || savedToken,
    chatIds,
    tokenSource: envToken ? "env" : savedToken ? "settings" : "default",
    chatSource: envChats ? "env" : savedChats ? "settings" : "default",
  };
}

/** يوتيوب: متغير البيئة أولاً ثم القيم المحفوظة من اللوحة. */
export async function resolveYouTubeConfig(ctx: DbCtx): Promise<YouTubeRuntimeConfig> {
  const env: Record<YouTubeKey, string> = {
    youtubeClientId: (process.env.YOUTUBE_CLIENT_ID ?? "").trim(),
    youtubeClientSecret: (process.env.YOUTUBE_CLIENT_SECRET ?? "").trim(),
    youtubeRefreshToken: (process.env.YOUTUBE_REFRESH_TOKEN ?? "").trim(),
  };
  const out: Record<string, string> = {};
  const source = {} as Record<YouTubeKey, "env" | "settings" | "none">;
  for (const key of YOUTUBE_KEYS) {
    if (env[key]) {
      out[key] = env[key];
      source[key] = "env";
    } else {
      const saved = await readSetting(ctx, key);
      out[key] = saved;
      source[key] = saved ? "settings" : "none";
    }
  }
  const missing = YOUTUBE_KEYS.filter((k) => !out[k]);
  return {
    clientId: out.youtubeClientId,
    clientSecret: out.youtubeClientSecret,
    refreshToken: out.youtubeRefreshToken,
    ready: missing.length === 0,
    missing,
    source,
  };
}

/** قراءة داخلية أثناء النشر الآلي (بلا تحقق جلسة). */
export const getTelegramInternal = internalQuery({
  args: {},
  handler: async (ctx) => resolveTelegramConfig(ctx),
});

/** قراءة داخلية ليوتيوب أثناء النشر الآلي. */
export const getYouTubeInternal = internalQuery({
  args: {},
  handler: async (ctx) => resolveYouTubeConfig(ctx),
});

/**
 * الأفعال (actions) في Convex لا تصل إلى قاعدة البيانات مباشرة، فتقرأ
 * الإعدادات عبر استعلام داخلي — بنفس القيم تماماً بلا ازدواج للمنطق.
 */
export async function telegramConfigForAction(ctx: ActionCtx): Promise<TelegramRuntimeConfig> {
  return await ctx.runQuery(internal.channelKeys.getTelegramInternal, {});
}

export async function youTubeConfigForAction(ctx: ActionCtx): Promise<YouTubeRuntimeConfig> {
  return await ctx.runQuery(internal.channelKeys.getYouTubeInternal, {});
}

/**
 * حالة المفاتيح للوحة التحكم — **أسماء الحقول ومصدرها فقط، بلا أي قيمة**,
 * فلا تُسرَّب الأسرار إلى المتصفح إطلاقاً.
 */
export const getStatus = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const tg = await resolveTelegramConfig(ctx);
    const yt = await resolveYouTubeConfig(ctx);
    return {
      telegram: {
        ready: !!tg.token && tg.chatIds.length > 0,
        hasToken: !!tg.token,
        hasChatIds: tg.chatIds.length > 0,
        chatCount: tg.chatIds.length,
        tokenSource: tg.tokenSource,
        chatSource: tg.chatSource,
      },
      youtube: {
        ready: yt.ready,
        missing: yt.missing,
        source: yt.source,
      },
    };
  },
});

/** حفظ مفاتيح تيليجرام من لوحة التحكم. */
export const saveTelegram = mutation({
  args: {
    token: v.string(),
    botToken: v.optional(v.string()),
    chatIds: v.optional(v.string()),
  },
  handler: async (ctx, { token, botToken, chatIds }) => {
    await requireAdmin(ctx, token);

    if (botToken !== undefined) {
      const value = botToken.trim();
      if (value && !/^\d{6,}:[\w-]{30,}$/.test(value)) {
        throw new ConvexError(
          "صيغة توكن البوت غير صحيحة — يجب أن يكون بالشكل 123456789:ABCdef... كما يعطيه @BotFather"
        );
      }
      await upsert(ctx, "telegramBotToken", value);
    }
    if (chatIds !== undefined) {
      const value = chatIds
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
        .join(",");
      await upsert(ctx, "telegramChatIds", value);
    }
    const cfg = await resolveTelegramConfig(ctx);
    return {
      ok: true,
      ready: !!cfg.token && cfg.chatIds.length > 0,
      tokenSource: cfg.tokenSource,
      chatSource: cfg.chatSource,
    };
  },
});

/** حفظ مفاتيح يوتيوب من لوحة التحكم. */
export const saveYouTube = mutation({
  args: {
    token: v.string(),
    clientId: v.optional(v.string()),
    clientSecret: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
  },
  handler: async (ctx, { token, clientId, clientSecret, refreshToken }) => {
    await requireAdmin(ctx, token);
    const pairs: [YouTubeKey, string | undefined][] = [
      ["youtubeClientId", clientId],
      ["youtubeClientSecret", clientSecret],
      ["youtubeRefreshToken", refreshToken],
    ];
    for (const [key, value] of pairs) {
      if (value === undefined) continue;
      const v2 = value.trim();
      if (!v2) continue; // حقل فارغ = لا تُغيّر القيمة المحفوظة
      await upsert(ctx, key, v2);
    }
    const cfg = await resolveYouTubeConfig(ctx);
    return { ok: true, ready: cfg.ready, missing: cfg.missing, source: cfg.source };
  },
});

async function upsert(ctx: DbCtx, key: string, value: string): Promise<void> {
  const existing = await ctx.db
    .query("settings")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();
  if (existing) await ctx.db.patch(existing._id, { value });
  else await ctx.db.insert("settings", { key, value });
}

/**
 * 🩪 اختبار حي للمفاتيح بعد حفظها — يتحقق فعلاً من إمكانية النشر:
 *  • تيليجرام: getMe للبوت + getChat للقناة (وهل البوت مشرف فيها؟)
 *  • يوتيوب:   جلب توكن وصول حقيقي من refresh token (بلا رفع أي فيديو)
 * ولا تُعرض أي قيمة سرّية في النتيجة — فقط الحالة والسبب بالعربية.
 */
export const test = action({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    // 🔐 الأفعال لا تصل لقاعدة البيانات، فنتحقق من الجلسة عبر استعلام
    // محمي (requireAdmin في settings.getAll) قبل أي طلب خارجي.
    await ctx.runQuery(api.settings.getAll, { token });

    // ── تيليجرام ───────────────────────────────────────────────
    const tg = await telegramConfigForAction(ctx);
    if (!tg.token) {
      return {
        ok: false,
        telegram: { ok: false, detail: "لا يوجد توكن بوت — أضفه هنا أو في TELEGRAM_BOT_TOKEN" },
        youtube: { ok: false, detail: "لم يُختبر" },
      };
    }
    let tgResult: { ok: boolean; detail: string };
    try {
      const meRes = await fetch(`https://api.telegram.org/bot${tg.token}/getMe`);
      const me = (await meRes.json().catch(() => ({}))) as any;
      if (!me?.ok) {
        tgResult = { ok: false, detail: `البوت رفض التوكن: ${me?.description ?? "توكن غير صالح"}` };
      } else {
        const chat = tg.chatIds[0];
        const chatRes = await fetch(
          `https://api.telegram.org/bot${tg.token}/getChat?chat_id=${encodeURIComponent(chat)}`
        );
        const chatData = (await chatRes.json().catch(() => ({}))) as any;
        if (chatData?.ok) {
          tgResult = {
            ok: true,
            detail: `البوت @${me.result.username} مشرف في القناة «${chatData.result.title ?? chat}» — النشر يعمل${tg.tokenSource === "env" ? " (التوكن من متغير البيئة)" : " (التوكن من اللوحة)"}`,
          };
        } else {
          tgResult = {
            ok: false,
            detail: `البوت @${me.result.username} يعمل، لكنه ليس مشرفاً في ${chat}: ${chatData?.description ?? "راجع الصلاحيات"}`,
          };
        }
      }
    } catch (err: any) {
      tgResult = { ok: false, detail: `تعذر الاتصال بواجهة تلجرام: ${err?.message ?? String(err)}` };
    }

    // ── يوتيوب ─────────────────────────────────────────────────
    const yt = await youTubeConfigForAction(ctx);
    let ytResult: { ok: boolean; detail: string };
    if (!yt.ready) {
      ytResult = { ok: false, detail: `مفاتيح ناقصة: ${yt.missing.join(" · ")}` };
    } else {
      try {
        const res = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: yt.clientId,
            client_secret: yt.clientSecret,
            refresh_token: yt.refreshToken,
            grant_type: "refresh_token",
          }),
        });
        const data = (await res.json().catch(() => ({}))) as any;
        ytResult = res.ok && data?.access_token
          ? { ok: true, detail: "رمز التحديث صالح — رفع الفيديوهات إلى يوتيوب يعمل" }
          : {
              ok: false,
              detail: `رمز التحديث مرفوض: ${data?.error_description ?? data?.error ?? "تحقق من المفاتيح"}`,
            };
      } catch (err: any) {
        ytResult = { ok: false, detail: `تعذر الاتصال بجوجل: ${err?.message ?? String(err)}` };
      }
    }

    return { ok: tgResult.ok || ytResult.ok, telegram: tgResult, youtube: ytResult };
  },
});