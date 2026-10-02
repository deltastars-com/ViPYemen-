"use node";

// Automatic channel publisher — every time the admin publishes a listing,
// ad or offer from the dashboard, this action posts it to the platform's
// official channels automatically:
//
//   • Telegram  — official Bot API (sendMessage). Bot: @vipyemen_bot
//                 Channel: @vipyemen77
//   • WhatsApp  — WhatsApp Cloud API: تُدار بالكامل من لوحة التحكم
//                 (الإعدادات ← تشغيل قناة واتساب) وتُقرأ من جدول الإعدادات،
//                 مع دعم متغيرات البيئة كخيار بديل فقط.
//   • Facebook Page  — Graph API posts to the official page with image+text
//   • Facebook Group — Graph API posts to the official group with text+link
//
// كل الأسرار تُقرأ من: متغيرات البيئة أولاً إن وُجدت، ثم جدول الإعدادات
// (الذي تكتبه بطاقات لوحة التحكم) — فلا تحتاج المنصة أي إعادة نشر لتشغيل قناة.
//
// Everything is best-effort: a missing key or a failed channel never breaks
// the publish flow — the item is still live on the platform, and the
// channels that succeeded are recorded on the document so the admin can see
// the status and re-push with one click.
import { action, internalAction, type ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { FacebookConfig } from "./facebookStore";
import type { WhatsAppConfig } from "./whatsapp";
import { buildMessageBody, normalizeRecipients } from "./whatsappBody";
import { pauseReasonFor } from "./channelPolicy";

export type ChannelKind = "submission" | "ad" | "offer";

const PLATFORM_BASE = "https://vi-p-yemen.vercel.app";
const PLATFORM_PHONE_DISPLAY = "00967711780999";
const PLATFORM_PHONE_LINK = "https://wa.me/967711780999";

// Official channel identifiers
export const TELEGRAM_BOT_TOKEN_LEGACY = "8876814738:AAFepkzzC0g__-xGz9JE_sqvq0JMM1kHVWM"; // legacy-leaked-secret-allowlisted
const TELEGRAM_CHAT_ID_DEFAULT = "@vipyemen77";
const FB_PAGE_ID_DEFAULT = "102672588647591";
const FB_GROUP_ID_DEFAULT = "346010664332427"; // numeric group ID

export function kindLabel(kind: ChannelKind): string {
  switch (kind) {
    case "submission":
      return "إعلان جديد في المنصة";
    case "ad":
      return "إعلان ترويجي";
    case "offer":
      return "عرض ترويجي خاص";
  }
}

function buildMessage(args: {
  kind: ChannelKind;
  title: string;
  message: string;
  url: string;
  price?: string;
}): string {
  return [
    `🔔 ${kindLabel(args.kind)}`,
    ``,
    `*${args.title}*`,
    ``,
    args.message,
    ...(args.price ? ["", `💰 ${args.price}`] : []),
    ``,
    `🌐 المنصة: ${PLATFORM_BASE}${args.url}`,
    `📱 واتساب المنصة: ${PLATFORM_PHONE_DISPLAY} (${PLATFORM_PHONE_LINK})`,
    ``,
    `#ViPYemen #اليمن`,
  ].join("\n");
}

function buildFacebookMessage(args: {
  kind: ChannelKind;
  title: string;
  message: string;
  url: string;
  price?: string;
}): string {
  return [
    `🔥 ${kindLabel(args.kind)}`,
    ``,
    `${args.title}`,
    ``,
    args.message,
    ...(args.price ? ["", `💰 ${args.price}`] : []),
    ``,
    `🌐 ${PLATFORM_BASE}${args.url}`,
    `📱 واتساب: ${PLATFORM_PHONE_DISPLAY}`,
    ``,
    `#ViPYemen #اليمن #متجر`,
  ].join("\n");
}

/**
 * ⚠️ توكن تلجرام القديم كان مكتوباً صريحاً في المستودع (تسريب) — يُستخدم كبديل
 * أخير فقط حتى يُبدَّل من @BotFather ويُضاف TELEGRAM_BOT_TOKEN في متغيرات Convex.
 * ووجود `legacy-leaked-secret-allowlisted` في هذا السطر يُعلم حاجز الأسرار الآلي
 * (`.github/workflows/secret-scan.yml`) بأن هذا التوكن معروف ومنتظر إزالته، وأن
 * أي توكن آخر يُكتشف هو تسريب جديد يجب إيقاف البناء عنده.
 */
function telegramTokenUsesLegacy(): boolean {
  const env = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (env) return false;
  return !!TELEGRAM_BOT_TOKEN_LEGACY;
}

/** توكن البوت الفعلي: متغير البيئة أولاً، ثم القديم (مع تنبيه صريح في اللوحة). */
function telegramToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || TELEGRAM_BOT_TOKEN_LEGACY;
}

// ── Telegram ──────────────────────────────────────────────────────────
async function postToTelegram(text: string): Promise<boolean> {
  const token = telegramToken();
  const envChats = (process.env.TELEGRAM_CHAT_ID ?? "").trim();
  const chats = envChats
    ? envChats.split(",").map((c) => c.trim()).filter(Boolean)
    : [TELEGRAM_CHAT_ID_DEFAULT];
  if (!token || chats.length === 0) {
    console.log("[Channel:Telegram] SKIP — no token or chat ID");
    return false;
  }
  let any = false;
  for (const chatId of chats) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "Markdown",
          disable_web_page_preview: false,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        any = true;
        console.log(`[Channel:Telegram] OK → ${chatId}`);
      } else {
        console.error(`[Channel:Telegram] FAIL → ${chatId}: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      console.error(`[Channel:Telegram] ERROR → ${chatId}:`, err);
    }
  }
  return any;
}

// ── WhatsApp ──────────────────────────────────────────────────────────
/** معرّف محادثة واتساب بصيغة OpenWA: `771234567@c.us` للمجموعة `…@g.us`. */
function openwaChatId(to: string): string {
  if (to.includes("@")) return to;
  const digits = to.replace(/\D/g, "");
  return digits.includes("-") || digits.length > 15 ? `${digits}@g.us` : `${digits}@c.us`;
}

/** النشر عبر بوابة OpenWA المجانية (بديل بلا توكن Meta). */
async function postViaOpenWA(
  text: string,
  recipients: string[],
  openwa: NonNullable<WhatsAppRuntimeConfig["openwa"]>
): Promise<boolean> {
  const base = openwa.baseUrl.replace(/\/+$/, "");
  let any = false;
  for (const to of recipients) {
    try {
      const res = await fetch(`${base}/api/sessions/${openwa.sessionId}/messages/send-text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": openwa.apiKey,
        },
        body: JSON.stringify({ chatId: openwaChatId(to), text }),
      });
      if (res.ok) {
        any = true;
        console.log(`[Channel:WhatsApp/OpenWA] OK → ${to}`);
      } else {
        const body = await res.text();
        console.error(`[Channel:WhatsApp/OpenWA] FAIL → ${to}: ${res.status} ${body.slice(0, 200)}`);
      }
    } catch (err) {
      console.error(`[Channel:WhatsApp/OpenWA] ERROR → ${to}:`, err);
    }
  }
  return any;
}

async function postToWhatsApp(text: string, wa: WhatsAppRuntimeConfig): Promise<boolean> {
  if ((!wa.token || !wa.phoneNumberId) && wa.openwa && wa.recipients.length > 0) {
    // مسار مجاني بالكامل: بوابة OpenWA بدل Cloud API.
    return postViaOpenWA(text, wa.recipients, wa.openwa);
  }
  if (!wa.token || !wa.phoneNumberId || wa.recipients.length === 0) {
    console.log(
      "[Channel:WhatsApp] SKIP — القناة غير مهيأة (لوحة التحكم ← الإعدادات ← تشغيل قناة واتساب أو بوابة OpenWA)"
    );
    return false;
  }
  let any = false;
  for (const to of wa.recipients) {
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${wa.phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${wa.token}`,
        },
        body: JSON.stringify(
          buildMessageBody(to, text, wa.templateName || undefined, wa.templateLang)
        ),
      });
      const data = await res.json();
      if (res.ok) {
        any = true;
        console.log(`[Channel:WhatsApp] OK → ${to}`);
      } else {
        console.error(`[Channel:WhatsApp] FAIL → ${to}: ${JSON.stringify(data?.error ?? data)}`);
      }
    } catch (err) {
      console.error(`[Channel:WhatsApp] ERROR → ${to}:`, err);
    }
  }
  return any;
}

// ── Facebook Page ─────────────────────────────────────────────────────
async function postToFacebookPage(
  text: string,
  imageUrl: string | undefined,
  fb: FacebookRuntimeConfig
): Promise<boolean> {
  const token = fb.token;
  const pageId = fb.pageId || FB_PAGE_ID_DEFAULT;
  if (!token) {
    console.log(
      "[Channel:FacebookPage] SKIP — لا يوجد توكن (لوحة التحكم ← الإعدادات ← ربط فيسبوك)"
    );
    return false;
  }

  try {
    // التوكن المحفوظ من اللوحة هو توكن صفحة جاهز. أما توكن البيئة فقد يكون توكن
    // مستخدم — فنستخرج منه توكن الصفحة مرة واحدة قبل النشر.
    let pageToken = token;
    if (fb.source === "env") {
      try {
        const pagesRes = await fetch(
          `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${token}`
        );
        const pagesData = await pagesRes.json();
        const pages = Array.isArray(pagesData?.data) ? pagesData.data : [];
        const matched =
          pages.find(
            (p: { id: string; name?: string }) =>
              p.id === pageId || /vip\s*yemen/i.test(p.name ?? "")
          ) ?? pages.find((p: { access_token?: string }) => p.access_token);
        if (matched?.access_token) {
          pageToken = matched.access_token;
          console.log(`[Channel:FacebookPage] Resolved page token for: ${matched.name} (${matched.id})`);
        }
      } catch {
        console.log("[Channel:FacebookPage] Using token directly (could not resolve pages)");
      }
    }

    if (imageUrl) {
      // Post with photo
      const photoRes = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/photos`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            url: imageUrl,
            access_token: pageToken,
          }),
        }
      );
      const photoData = await photoRes.json();
      if (photoRes.ok) {
        console.log(`[Channel:FacebookPage] Photo OK → ${pageId}`);
        return true;
      }
      console.error(`[Channel:FacebookPage] Photo FAIL: ${JSON.stringify(photoData)}`);
    }

    // Fallback: text-only post to page feed
    const feedRes = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/feed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          access_token: pageToken,
        }),
      }
    );
    const feedData = await feedRes.json();
    if (feedRes.ok) {
      console.log(`[Channel:FacebookPage] Feed OK → ${pageId}`);
      return true;
    }
    console.error(`[Channel:FacebookPage] Feed FAIL: ${JSON.stringify(feedData)}`);
    return false;
  } catch (err) {
    console.error(`[Channel:FacebookPage] ERROR:`, err);
    return false;
  }
}

// ── Facebook Group ────────────────────────────────────────────────────
async function postToFacebookGroup(text: string, fb: FacebookRuntimeConfig): Promise<boolean> {
  const token = fb.token;
  const groupId = fb.groupId || FB_GROUP_ID_DEFAULT;
  if (!token) {
    console.log(
      "[Channel:FacebookGroup] SKIP — لا يوجد توكن (لوحة التحكم ← الإعدادات ← ربط فيسبوك)"
    );
    return false;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${groupId}/feed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          access_token: token,
        }),
      }
    );
    const data = await res.json();
    if (res.ok) {
      console.log(`[Channel:FacebookGroup] OK → ${groupId}`);
      return true;
    }
    console.error(`[Channel:FacebookGroup] FAIL: ${JSON.stringify(data)}`);
    return false;
  } catch (err) {
    console.error(`[Channel:FacebookGroup] ERROR:`, err);
    return false;
  }
}

// ── Presence-only report (no secrets) ─────────────────────────────────
export const getChannelSetup = action({
  args: {},
  handler: async (ctx) => {
    const fb = await resolveFacebookConfig(ctx);
    const wa = await resolveWhatsAppConfig(ctx);
    // نفس منطق الإرسال الفعلي: توكن البوت من البيئة أو الافتراضي، والقناة من
    // البيئة أو الافتراضية — فلا تناقض بين بطاقة الإعداد وفحص الصحة.
    const telegram =
      !!telegramToken() &&
      !!(process.env.TELEGRAM_CHAT_ID?.trim() || TELEGRAM_CHAT_ID_DEFAULT);
    const whatsapp = !!wa.token && !!wa.phoneNumberId;
    const facebook = !!fb.token;
    const facebookGroup = !!fb.token;
    return {
      telegram,
      whatsapp,
      facebook,
      facebookGroup,
      whatsappRecipients: wa.recipients.length,
      whatsappTemplate: wa.templateName || "",
      whatsappNumber: wa.displayPhone || "",
      whatsappSource: wa.source,
      facebookPageName: fb.pageName || "",
      facebookCanPost: fb.canPost,
      _diag: {
        fbTokenPresent: !!fb.token,
        fbTokenLen: fb.token.length,
        fbTokenPrefix: fb.token.length > 4 ? fb.token.slice(0, 4) : "",
        fbTokenSource: fb.source,
        fbPageIdPresent: !!fb.pageId,
        fbGroupIdPresent: !!fb.groupId,
        fbGroupIdDefault: !!FB_GROUP_ID_DEFAULT,
        fbPageIdDefault: !!FB_PAGE_ID_DEFAULT,
        envFbToken: !!process.env.FACEBOOK_ACCESS_TOKEN?.trim(),
        waTokenSource: wa.source,
        waTokenLen: wa.token.length,
      },
    };
  },
});

// ── صندوق الإرسال الموثوق ─────────────────────────────────────────────

// ── إعدادات القنوات: متغيرات البيئة أولاً ثم جدول الإعدادات (لوحة التحكم) ──

export interface FacebookRuntimeConfig {
  token: string;
  pageId: string;
  groupId: string;
  pageName: string;
  source: "env" | "settings" | "none";
  /** هل يمنح التوكن صلاحية النشر على الصفحة (pages_manage_posts)؟ */
  canPost: boolean | null;
  postingDetail: string;
}

/** إعدادات فيسبوك من البيئة أو من الإعدادات المحفوظة في اللوحة. */
async function resolveFacebookConfig(ctx: ActionCtx): Promise<FacebookRuntimeConfig> {
  // الأولوية لإعدادات اللوحة (توكن صفحة دائم + تجديد ذاتي) — ثم متغيرات البيئة
  // كاحتياط. بهذا لا يحجب توكن بيئة قصير الأجل التوكن الدائم المحفوظ.
  try {
    const cfg = (await ctx.runQuery(
      internal.facebookStore.getConfigInternal,
      {}
    )) as FacebookConfig;
    const token = cfg.facebookAccessToken?.trim() ?? "";
    if (token) {
      return {
        token,
        pageId: cfg.facebookPageId?.trim() || FB_PAGE_ID_DEFAULT,
        groupId: cfg.facebookGroupId?.trim() || FB_GROUP_ID_DEFAULT,
        pageName: cfg.facebookPageName ?? "",
        source: "settings",
        canPost: typeof cfg.facebookCanPost === "boolean" ? cfg.facebookCanPost : null,
        postingDetail: cfg.facebookPostingDetail ?? "",
      };
    }
  } catch {
    /* نكمل لمسار البيئة */
  }
  const envToken = process.env.FACEBOOK_ACCESS_TOKEN?.trim() ?? "";
  if (envToken) {
    return {
      token: envToken,
      pageId: process.env.FACEBOOK_PAGE_ID?.trim() || FB_PAGE_ID_DEFAULT,
      groupId: process.env.FACEBOOK_GROUP_ID?.trim() || FB_GROUP_ID_DEFAULT,
      pageName: "",
      source: "env",
      canPost: null,
      postingDetail: "",
    };
  }
  return {
    token: "",
    pageId: FB_PAGE_ID_DEFAULT,
    groupId: FB_GROUP_ID_DEFAULT,
    pageName: "",
    source: "none",
    canPost: null,
    postingDetail: "",
  };
}

export interface WhatsAppRuntimeConfig {
  token: string;
  phoneNumberId: string;
  recipients: string[];
  templateName: string;
  templateLang: string;
  displayPhone: string;
  source: "env" | "settings" | "none";
  /** بوابة OpenWA المجانية (بديل مجاني عن Cloud API). */
  openwa: { baseUrl: string; apiKey: string; sessionId: string } | null;
}

/** إعدادات واتساب من البيئة أو من الإعدادات المحفوظة في اللوحة. */
async function resolveWhatsAppConfig(ctx: ActionCtx): Promise<WhatsAppRuntimeConfig> {
  // بوابة OpenWA المجانية (إن كانت مهيأة) تُستخدم كمسار بديل بلا توكن Meta.
  let openwa: WhatsAppRuntimeConfig["openwa"] = null;
  try {
    const ow = (await ctx.runQuery(internal.openwa.getConfigInternal, {})) as {
      baseUrl: string;
      apiKey: string;
      sessionId: string;
    };
    if (ow?.baseUrl && ow?.apiKey && ow?.sessionId) openwa = ow;
  } catch {
    /* البوابة غير مهيأة */
  }
  const envToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() ?? "";
  if (envToken) {
    return {
      token: envToken,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? "",
      recipients: normalizeRecipients([process.env.WHATSAPP_BROADCAST_TO ?? ""]),
      templateName: process.env.WHATSAPP_TEMPLATE_NAME?.trim() ?? "",
      templateLang: process.env.WHATSAPP_TEMPLATE_LANG?.trim() || "ar",
      displayPhone: "",
      source: "env",
      openwa,
    };
  }
  try {
    const cfg = (await ctx.runQuery(
      internal.whatsapp.getConfigInternal,
      {}
    )) as WhatsAppConfig;
    const token = cfg.whatsappAccessToken?.trim() ?? "";
    return {
      token,
      phoneNumberId: cfg.whatsappPhoneNumberId?.trim() ?? "",
      recipients: normalizeRecipients(cfg.whatsappBroadcastTo ?? []),
      templateName: cfg.whatsappTemplateName?.trim() ?? "",
      templateLang: cfg.whatsappTemplateLang?.trim() || "ar",
      displayPhone: cfg.whatsappDisplayPhone ?? "",
      source: token ? "settings" : "none",
      openwa,
    };
  } catch {
    return {
      token: "",
      phoneNumberId: "",
      recipients: [],
      templateName: "",
      templateLang: "ar",
      displayPhone: "",
      source: "none",
      openwa,
    };
  }
}

export type ChannelName = "telegram" | "whatsapp" | "facebook_page" | "facebook_group";

export const ALL_CHANNELS: ChannelName[] = [
  "telegram",
  "whatsapp",
  "facebook_page",
  "facebook_group",
];

/** إرسال نص واحد إلى قناة واحدة — يُستخدم للإرسال المباشر وإعادة المحاولة. */
async function sendToChannel(ctx: ActionCtx, channel: string, text: string): Promise<boolean> {
  const paused = (await ctx.runQuery(internal.channelPush.getPausedInternal, {})) as Record<
    string,
    boolean
  >;
  if (paused[channel] === true) {
    console.log(`[Channel] SKIP ${channel} — القناة متوقفة (${pauseReasonFor(channel)})`);
    return false;
  }
  switch (channel) {
    case "telegram":
      return postToTelegram(text);
    case "whatsapp":
      return postToWhatsApp(text, await resolveWhatsAppConfig(ctx));
    case "facebook_page":
      return postToFacebookPage(text, undefined, await resolveFacebookConfig(ctx));
    case "facebook_group":
      return postToFacebookGroup(text, await resolveFacebookConfig(ctx));
    default:
      return false;
  }
}

/**
 * 📮 الإرسال الموثوق إلى كل قنوات المنصة:
 *   1. تُسجَّل الرسالة لكل قناة في الصندوق (لا شيء يُفقد)
 *   2. تُحاول الإرسال فوراً
 *   3. ما يفشل يبقى في الصندوق ويُعاد تلقائياً في دورة الأتمتة (حتى 5 محاولات)
 */
async function deliverEverywhere(
  ctx: ActionCtx,
  payload: {
    title: string;
    kind?: string;
    category?: string;
    entityId?: string;
    texts: Record<ChannelName, string>;
  }
): Promise<{ done: string[]; failed: string[]; paused: string[] }> {
  // 📴 القنوات المتوقفة لا تُجعل في الصندوق أصلاً — لا محاولة فاشلة ولا
  // إعادة محاولة على قناة أوقفها المشرف عمداً (فيسبوك حالياً بانتظار التوكن الجديد).
  const pausedMap = (await ctx.runQuery(
    internal.channelPush.getPausedInternal,
    {}
  )) as Record<string, boolean>;
  const skipped = ALL_CHANNELS.filter((c) => pausedMap[c] === true);
  const active = ALL_CHANNELS.filter((c) => pausedMap[c] !== true);

  const rows = (await ctx.runMutation(internal.channelPush.enqueueOutbox, {
    title: payload.title,
    // الرسالة المحفوظة في الصندوق تُستخدم حرفياً في إعادة المحاولة
    message: payload.texts.telegram,
    category: payload.category,
    kind: payload.kind,
    entityId: payload.entityId,
    channels: active,
  })) as { id: string; channel: string }[];

  const done: string[] = [];
  const failed: string[] = [];
  for (const row of rows) {
    const text = payload.texts[row.channel as ChannelName] ?? payload.texts.telegram;
    let ok = false;
    let error: string | undefined;
    try {
      ok = await sendToChannel(ctx, row.channel, text);
    } catch (err: any) {
      ok = false;
      error = err?.message ?? String(err);
    }
    try {
      await ctx.runMutation(internal.channelPush.markOutboxResult, {
        id: row.id,
        ok,
        error: ok ? undefined : (error ?? "send failed"),
      });
    } catch {
      /* bookkeeping must never break publishing */
    }
    if (ok) done.push(row.channel);
    else failed.push(row.channel);
  }
  console.log(
    `[ChannelOutbox] title="${payload.title}" done=[${done}] failed=[${failed}] paused=[${skipped}]`
  );
  return { done, failed, paused: skipped };
}

/** إعادة محاولة رسالة من الصندوق (تُستدعى من دورة الأتمتة أو من لوحة الكنترول). */
export const deliverOutboxItem = internalAction({
  args: {
    id: v.string(),
    channel: v.string(),
    title: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    let ok = false;
    let error: string | undefined;
    try {
      ok = await sendToChannel(ctx, args.channel, args.message);
    } catch (err: any) {
      ok = false;
      error = err?.message ?? String(err);
    }
    try {
      await ctx.runMutation(internal.channelPush.markOutboxResult, {
        id: args.id,
        ok,
        error: ok ? undefined : (error ?? "send failed"),
      });
    } catch {
      /* ignore */
    }
    console.log(`[ChannelRetry] ${args.channel} ${ok ? "OK" : "FAIL"} — ${args.title}`);
    return { ok };
  },
});

/**
 * 📣 تنبيه نصي إلى كل قنوات المنصة (تلجرام · واتساب · فيسبوك)
 *
 * داخلي فقط (internalAction): يُستدعى من النظام عبر المجدول — لا يمكن
 * لأي زائر استدعاؤه مباشرة، فلا يمكن استخدامه لإغراق قنوات المنصة.
 * يُستخدم في: تنبيهات المطابقة، أرشفة العملاء السابقين، التنبيهات الحية.
 */
export const publishNotice = internalAction({
  args: {
    title: v.string(),
    message: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const text = [
      `🔔 ${args.title}`,
      "",
      args.message,
      "",
      `🌐 المنصة: ${PLATFORM_BASE}`,
      `📱 واتساب المنصة: ${PLATFORM_PHONE_DISPLAY} (${PLATFORM_PHONE_LINK})`,
    ].join("\n");

    const { done, failed, paused } = await deliverEverywhere(ctx, {
      title: args.title,
      kind: "notice",
      category: args.category,
      texts: {
        telegram: text,
        whatsapp: text,
        facebook_page: text,
        facebook_group: text,
      },
    });

    console.log(
      `[ChannelNotice] title="${args.title}" done=[${done}] failed=[${failed}] paused=[${paused}]`
    );
    return { ok: done.length > 0, published: done, failed, paused };
  },
});

/** تشخيص القناة عند فشل النشر اليدوي — نفس منطق فحص الصحة. */
async function explainChannelFailure(
  ctx: ActionCtx,
  channel: string
): Promise<string> {
  try {
    if (channel === "telegram") return (await checkTelegram()).detail;
    if (channel === "whatsapp") return (await checkWhatsApp(await resolveWhatsAppConfig(ctx))).detail;
    const fb = await resolveFacebookConfig(ctx);
    if (channel === "facebook_page") {
      return (await checkFacebookTarget(channel, fb.pageId || FB_PAGE_ID_DEFAULT, fb)).detail;
    }
    if (channel === "facebook_group") {
      return (await checkFacebookTarget(channel, fb.groupId || FB_GROUP_ID_DEFAULT, fb)).detail;
    }
  } catch (err: any) {
    return `تعذّر الفحص — ${err?.message ?? String(err)}`;
  }
  return "القناة غير معروفة";
}

/**
 * 🛠️ نشر يدوي احتياطي إلى قنوات المنصة (لوحة التحكم ← «نشر يدوي في القنوات»)
 *
 * المسار الآلي يبقى الأولوية (كل طلب/عرض/إعلان يُنشر تلقائياً فور اعتماده)،
 * وهذا المسار الاحتياطي يمنح المشرف زراً واحداً ينشر نصاً حرفياً إلى أي قناة
 * أو إلى كل القنوات دفعة واحدة مع النتيجة الحقيقية لكل قناة.
 *
 * لا يخضع لمفتاح الإيقاف اليدوي: intention المشرف صريح، فيُحاول الإرسال
 * ويُعاد التحقق من صحة القناة وتُعرض النتيجة الدقيقة لكل قناة.
 */
export const publishManual = action({
  args: {
    token: v.string(),
    text: v.string(),
    title: v.optional(v.string()),
    channels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // 🔐 لا يُنشر نص حرفي في قنوات المنصة إلا لجلسة إدارية صالحة.
    await ctx.runQuery(api.settings.getAll, { token: args.token });
    const text = args.text.trim();
    if (!text) {
      return { ok: false as const, error: "اكتب نص المنشور أولاً.", results: [] };
    }
    // 🏠 «platform» قناة إضافية: إشعار داخل المنصة يظهر لكل مستخدمي التطبيق.
    const targets = (args.channels?.length ? args.channels : ALL_CHANNELS).filter(
      (c): c is ChannelName | "platform" =>
        c === "platform" || (ALL_CHANNELS as readonly string[]).includes(c)
    );
    if (targets.length === 0) {
      return { ok: false as const, error: "اختر قناة واحدة على الأقل.", results: [] };
    }
    const title = args.title?.trim() || "نشر يدوي من لوحة التحكم";
    const pausedMap = (await ctx.runQuery(internal.channelPush.getPausedInternal, {})) as Record<
      string,
      boolean
    >;

    const results: {
      channel: string;
      ok: boolean;
      paused: boolean;
      detail: string;
    }[] = [];
    for (const channel of targets) {
      let ok = false;
      let detail = "";
      if (channel === "platform") {
        // إشعار داخل المنصة — لا يحتاج أي توكن ولا يخضع للإيقاف الآلي.
        try {
          await ctx.runMutation(internal.channelPush.publishPlatformNotice, {
            title,
            message: text,
          });
          results.push({
            channel,
            ok: true,
            paused: false,
            detail: "نُشر إشعاراً داخل المنصة لكل المستخدمين ✅",
          });
        } catch (err: any) {
          results.push({
            channel,
            ok: false,
            paused: false,
            detail: err?.message ?? "تعذّر إنشاء الإشعار",
          });
        }
        continue;
      }
      try {
        ok = await sendToChannel(ctx, channel, text);
      } catch (err: any) {
        ok = false;
        detail = err?.message ?? String(err);
      }
      if (ok) {
        detail = pausedMap[channel] === true ? "تم النشر (القناة متوقفة آلياً — أُوقف النشر التلقائي)" : "تم النشر بنجاح ✅";
      } else {
        detail = detail || (await explainChannelFailure(ctx, channel));
      }
      results.push({ channel, ok, paused: pausedMap[channel] === true, detail });
      console.log(`[ChannelManual] ${channel} ${ok ? "OK" : "FAIL"} — ${detail}`);
    }

    const anyOk = results.some((r) => r.ok);
    try {
      await ctx.runMutation(internal.channelPush.logChannelEvent, {
        title: anyOk ? "✅ نشر يدوي في قنوات المنصة" : "⚠️ فشل نشر يدوي في قناة",
        message: results
          .map((r) => `${r.channel}: ${r.ok ? "نجح" : "فشل"} — ${r.detail}`)
          .join(" | "),
      });
    } catch {
      /* التوثيق لا يُسقط النشر */
    }

    return { ok: anyOk, error: undefined as string | undefined, results };
  },
});

// ── 🩺 فحص صحة قنوات المنصة (سيرفرات التواصل الاجتماعي) ──────────────────

type ChannelHealthRow = {
  channel: string;
  status: "ok" | "degraded" | "down" | "paused";
  detail: string;
  latencyMs?: number;
};

async function timedJson(
  url: string
): Promise<{ ok: boolean; latencyMs: number; data: any; error?: string }> {
  const started = Date.now();
  try {
    const res = await fetch(url, { cache: "no-store" as RequestCache });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data?.error === undefined, latencyMs: Date.now() - started, data };
  } catch (err: any) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      data: {},
      error: err?.message ?? String(err),
    };
  }
}

async function checkTelegram(): Promise<ChannelHealthRow> {
  const token = telegramToken();
  const envChats = (process.env.TELEGRAM_CHAT_ID ?? "").trim();
  const chatId = envChats ? envChats.split(",")[0].trim() : TELEGRAM_CHAT_ID_DEFAULT;
  if (!token) {
    return { channel: "telegram", status: "down", detail: "لا يوجد توكن بوت (TELEGRAM_BOT_TOKEN)" };
  }
  const me = await timedJson(`https://api.telegram.org/bot${token}/getMe`);
  if (!me.ok || !me.data?.ok) {
    return {
      channel: "telegram",
      status: "down",
      detail: `تعذر الوصول لواجهة تلجرام — ${me.data?.description ?? me.error ?? "خطأ غير معروف"}`,
      latencyMs: me.latencyMs,
    };
  }
  const chat = await timedJson(
    `https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(chatId)}`
  );
  if (chat.ok && chat.data?.ok) {
    return {
      channel: "telegram",
      status: "ok",
      detail: telegramTokenUsesLegacy()
        ? `البوت @${me.data.result.username} — القناة: ${chat.data.result.title ?? chatId} · ⚠️ يعمل بتوكن قديم مسرّب: بدّله من @BotFather وأضف TELEGRAM_BOT_TOKEN في متغيرات Convex الآن`
        : `البوت @${me.data.result.username} — القناة: ${chat.data.result.title ?? chatId}`,

      latencyMs: me.latencyMs,
    };
  }
  return {
    channel: "telegram",
    status: "degraded",
    detail: `البوت يعمل لكن الوصول للقناة (${chatId}) فشل — ${chat.data?.description ?? "تأكد أن البوت مشرف في القناة"}`,
    latencyMs: me.latencyMs,
  };
}

async function checkWhatsApp(wa: WhatsAppRuntimeConfig): Promise<ChannelHealthRow> {
  if ((!wa.token || !wa.phoneNumberId) && wa.openwa) {
    // بوابة OpenWA المجانية — فحص مباشر للجلسة.
    const base = wa.openwa.baseUrl.replace(/\/+$/, "");
    const started = Date.now();
    try {
      const res = await fetch(`${base}/api/sessions/${wa.openwa.sessionId}`, {
        headers: { "X-API-Key": wa.openwa.apiKey, Accept: "application/json" },
        cache: "no-store" as RequestCache,
      });
      const latencyMs = Date.now() - started;
      if (res.ok) {
        return {
          channel: "whatsapp",
          status: "ok",
          detail: `بوابة OpenWA المجانية — جلسة نشطة · ${wa.recipients.length} مستلم · بلا تكاليف Meta`,
          latencyMs,
        };
      }
      return {
        channel: "whatsapp",
        status: "down",
        detail: `بوابة OpenWA لا تستجيب (${res.status}) — تأكد أن الخادم يعمل والجلسة مُصرَّحة`,
        latencyMs,
      };
    } catch (err) {
      return {
        channel: "whatsapp",
        status: "down",
        detail: `تعذّر الوصول إلى بوابة OpenWA — ${err instanceof Error ? err.message : "خطأ شبكة"}`,
        latencyMs: Date.now() - started,
      };
    }
  }
  if (!wa.token || !wa.phoneNumberId) {
    return {
      channel: "whatsapp",
      status: "down",
      detail:
        "غير مهيأ — أدخل توكن Meta ومعرّف رقم الإرسال من لوحة التحكم ← الإعدادات ← «تشغيل قناة واتساب»",
    };
  }
  const res = await timedJson(
    `https://graph.facebook.com/v21.0/${wa.phoneNumberId}?fields=display_phone_number,verified_name&access_token=${encodeURIComponent(wa.token)}`
  );
  if (res.ok) {
    const tpl = wa.templateName
      ? `قالب مُعتمد: ${wa.templateName}`
      : "بلا قالب (تسليم الرسائل الحرة محدود بـ 24 ساعة)";
    return {
      channel: "whatsapp",
      status: "ok",
      detail: `Cloud API — ${res.data.verified_name ?? "الحساب"} (${res.data.display_phone_number ?? wa.phoneNumberId}) · ${wa.recipients.length} مستلم · ${tpl}`,
      latencyMs: res.latencyMs,
    };
  }
  return {
    channel: "whatsapp",
    status: "down",
    detail: `فشل الوصول إلى WhatsApp Cloud API — ${res.data?.error?.message ?? res.error ?? "توكن غير صالح"}`,
    latencyMs: res.latencyMs,
  };
}

async function checkFacebookTarget(
  channel: "facebook_page" | "facebook_group",
  id: string,
  fb: FacebookRuntimeConfig
): Promise<ChannelHealthRow> {
  const label = channel === "facebook_page" ? "صفحة فيسبوك" : "مجموعة فيسبوك";
  const token = fb.token;
  if (!token) {
    return {
      channel,
      status: "down",
      detail: `غير مهيأ — اربط ${label} من لوحة التحكم ← الإعدادات ← «ربط فيسبوك» (بلا أي متغيرات بيئة)`,
    };
  }
  const res = await timedJson(
    `https://graph.facebook.com/v21.0/${id}?fields=name&access_token=${encodeURIComponent(token)}`
  );
  if (!res.ok) {
    const raw = String(res.data?.error?.message ?? res.error ?? "راجع صلاحيات التوكن");
    const expired = /expired|session has expired|invalid oauth|OAuthException/i.test(raw);
    return {
      channel,
      status: "degraded",
      detail: expired
        ? `التوكن منتهي الصلاحية — أعد الربط من لوحة التحكم ← الإعدادات ← «ربط فيسبوك بتوكن طويل الأجل» (التبديل والتجديد الآلي بضغطة)`
        : `التوكن سليم لكن الوصول لـ${label} (${id}) فشل — ${raw}`,
      latencyMs: res.latencyMs,
    };
  }
  const name = res.data.name ?? id;
  if (channel === "facebook_group") {
    return {
      channel,
      status: "ok",
      detail: `${label}: ${name} — الوصول متاح؛ النشر التلقائي على المجموعات عبر API موقوف من Meta لمعظم التطبيقات (الصفحة والقنوات الأخرى تنشر طبيعياً)`,
      latencyMs: res.latencyMs,
    };
  }
  if (fb.canPost === false) {
    return {
      channel,
      status: "degraded",
      detail: `الصفحة: ${name} — التوكن لا يمنح صلاحية النشر (pages_manage_posts). أعد توليد التوكن مع تحديد هذا الخيار ثم اربطه من لوحة التحكم`,
      latencyMs: res.latencyMs,
    };
  }
  return {
    channel,
    status: "ok",
    detail: `${label}: ${name}`,
    latencyMs: res.latencyMs,
  };
}

/**
 * 🩺 فحص شامل لقنوات المنصة (تُلجرام · واتساب · صفحة فيسبوك · مجموعة فيسبوك):
 * يتحقق فعلياً من التوكن والوصول وزمن الاستجابة، يحفظ النتيجة في صحة القنوات،
 * ويُشعر الإدارة عند أي انقطاع أو عند تعافي قناة كانت متوقفة.
 */
export const checkChannels = internalAction({
  args: {},
  handler: async (ctx) => {
    const checkedAt = Date.now();
    const fb = await resolveFacebookConfig(ctx);
    const wa = await resolveWhatsAppConfig(ctx);
    const rows: ChannelHealthRow[] = [
      await checkTelegram(),
      await checkWhatsApp(wa),
      await checkFacebookTarget("facebook_page", fb.pageId || FB_PAGE_ID_DEFAULT, fb),
      await checkFacebookTarget("facebook_group", fb.groupId || FB_GROUP_ID_DEFAULT, fb),
    ];

    // 📴 القنوات المتوقفة (إيقاف يدوي أو انتظار توكن صالح) تُعرض بحالة
    // «متوقفة» لا «معطوبة» — فلا تنبيه إنذار ولا تكرار محاولة.
    const pausedMap = (await ctx.runQuery(
      internal.channelPush.getPausedInternal,
      {}
    )) as Record<string, boolean>;
    const finalRows: ChannelHealthRow[] = rows.map((row) =>
      pausedMap[row.channel] === true
        ? { ...row, status: "paused", detail: pauseReasonFor(row.channel) }
        : row
    );

    // آخر حالة معروفة قبل التحديث — لكشف التحوّل (انقطاع/تعافي)
    let previous: Record<string, string> = {};
    try {
      const stored = (await ctx.runQuery(internal.channelPush.getStatusesInternal, {})) as {
        channel: string;
        status: string;
      }[];
      previous = Object.fromEntries(stored.map((row) => [row.channel, row.status]));
    } catch {
      /* أول فحص — لا سجل سابق */
    }

    try {
      await ctx.runMutation(internal.channelPush.saveChannelStatus, {
        rows: finalRows,
        checkedAt,
      });
    } catch (err) {
      console.error("[ChannelHealth] save failed:", err);
    }

    // ♻️ تجديد ذاتي لتوكن فيسبوك عند اقتراب انتهاء توكن المستخدم (لا يعمل إلا عند الحاجة)
    try {
      if (fb.token) {
        await ctx.scheduler.runAfter(0, internal.facebook.refreshTokenInternal, {});
      }
    } catch {
      /* التجديد إضافة — لا يُسقط الفحص */
    }

    // «متوقفة» ليست عطلاً: لا تُحتسب معطوبة ولا تُطلق إنذار انقطاع.
    const isLive = (row: { status: string }) => row.status !== "paused";
    const healthy = finalRows.filter((row) => row.status === "ok").length;
    const broken = finalRows.filter((row) => row.status !== "ok" && isLive(row));
    const healed = finalRows.filter(
      (row) => row.status === "ok" && previous[row.channel] && previous[row.channel] !== "ok"
    );
    const broke = finalRows.filter(
      (row) => row.status !== "ok" && isLive(row) && previous[row.channel] === "ok"
    );

    if (broke.length > 0 || healed.length > 0) {
      try {
        await ctx.runMutation(internal.channelPush.logChannelEvent, {
          title: broke.length > 0 ? "⚠️ انقطاع في إحدى قنوات المنصة" : "✅ تعافي قنوات المنصة",
          message:
            broke.length > 0
              ? broke.map((row) => `${row.channel}: ${row.detail}`).join(" | ")
              : healed.map((row) => `${row.channel}: ${row.detail}`).join(" | "),
        });
      } catch {
        /* التنبيه إضافة — لا يُسقط الفحص */
      }
    }

    console.log(
      `[ChannelHealth] ${healthy}/${rows.length} healthy — ${broken
        .map((row) => `${row.channel}=${row.status}`)
        .join(", ")}`
    );
    return { checkedAt, healthy, total: finalRows.length, rows: finalRows };
  },
});

/**
 * Publish an item to all configured channels and record what succeeded.
 * Called automatically via ctx.scheduler.runAfter whenever an item becomes
 * live (published submission / active ad / published offer).
 */
export const publishToChannels = action({
  args: {
    kind: v.union(v.literal("submission"), v.literal("ad"), v.literal("offer")),
    itemId: v.string(),
    title: v.string(),
    message: v.string(),
    url: v.string(),
    price: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const text = buildMessage(args);
    const fbText = buildFacebookMessage(args) + `\n\n🔗 ${PLATFORM_BASE}${args.url}`;

    const { done, failed, paused } = await deliverEverywhere(ctx, {
      title: args.title,
      kind: args.kind,
      entityId: args.itemId,
      texts: {
        telegram: text,
        whatsapp: text,
        facebook_page: fbText,
        facebook_group: fbText,
      },
    });

    console.log(
      `[ChannelPublish] kind=${args.kind} title="${args.title}" done=[${done}] failed=[${failed}] paused=[${paused}]`
    );

    if (done.length > 0) {
      try {
        await ctx.runMutation(api.channelPush.recordChannelPublish, {
          kind: args.kind,
          itemId: args.itemId,
          channels: done,
          at: Date.now(),
        });
      } catch {
        // recording is best-effort too
      }
    }
    return { ok: done.length > 0, published: done, failed, paused };
  },
});
