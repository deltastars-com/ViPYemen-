"use node";

// Automatic channel publisher — every time the admin publishes a listing,
// ad or offer from the dashboard, this action posts it to the platform's
// official channels automatically:
//
//   • Telegram  — official Bot API (sendMessage). Bot: @vipyemen_bot
//                 Channel: @vipyemen77
//   • WhatsApp  — WhatsApp Cloud API broadcast to the numbers in
//                 WHATSAPP_BROADCAST_TO when the admin configures
//                 WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID.
//   • Facebook Page  — Graph API posts to page vipyemen1 with image+text
//   • Facebook Group — Graph API posts to group 346010664332427 with text+link
//
// Everything is best-effort: a missing key or a failed channel never breaks
// the publish flow — the item is still live on the platform, and the
// channels that succeeded are recorded on the document so the admin can see
// the status and re-push with one click.
import { action, internalAction, type ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

export type ChannelKind = "submission" | "ad" | "offer";

const PLATFORM_BASE = "https://vi-p-yemen.vercel.app";
const PLATFORM_PHONE_DISPLAY = "00967711780999";
const PLATFORM_PHONE_LINK = "https://wa.me/967711780999";

// Official channel identifiers
const TELEGRAM_BOT_TOKEN_DEFAULT = "8876814738:AAFepkzzC0g__-xGz9JE_sqvq0JMM1kHVWM";
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

// ── Telegram ──────────────────────────────────────────────────────────
async function postToTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() || TELEGRAM_BOT_TOKEN_DEFAULT;
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
async function postToWhatsApp(text: string): Promise<boolean> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const recipients = (process.env.WHATSAPP_BROADCAST_TO ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  if (!token || !phoneNumberId || recipients.length === 0) {
    console.log("[Channel:WhatsApp] SKIP — missing token/phone/recipients");
    return false;
  }
  let any = false;
  for (const to of recipients) {
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: text },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        any = true;
        console.log(`[Channel:WhatsApp] OK → ${to}`);
      } else {
        console.error(`[Channel:WhatsApp] FAIL → ${to}: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      console.error(`[Channel:WhatsApp] ERROR → ${to}:`, err);
    }
  }
  return any;
}

// ── Facebook Page ─────────────────────────────────────────────────────
async function postToFacebookPage(text: string, imageUrl?: string, overrideToken?: string): Promise<boolean> {
  const token = overrideToken || process.env.FACEBOOK_ACCESS_TOKEN?.trim();
  const pageId = process.env.FACEBOOK_PAGE_ID?.trim() || FB_PAGE_ID_DEFAULT;
  if (!token) {
    console.log("[Channel:FacebookPage] SKIP — no FACEBOOK_ACCESS_TOKEN");
    return false;
  }

  try {
    // Try to get the page access token from the user token first
    let pageToken = token;
    try {
      const pagesRes = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?access_token=${token}`
      );
      const pagesData = await pagesRes.json();
      if (pagesData.data && pagesData.data.length > 0) {
        // Find the page that matches or use the first one
        const matched = pagesData.data.find(
          (p: { id: string; name: string }) =>
            p.id === pageId || p.name?.toLowerCase().includes("vipyemen")
        );
        if (matched) {
          pageToken = matched.access_token;
          console.log(`[Channel:FacebookPage] Resolved page token for: ${matched.name} (${matched.id})`);
        } else {
          pageToken = pagesData.data[0].access_token;
          console.log(`[Channel:FacebookPage] Using first page: ${pagesData.data[0].name}`);
        }
      }
    } catch {
      // If we can't resolve pages, use the token directly (might be a page token already)
      console.log("[Channel:FacebookPage] Using token directly (could not resolve pages)");
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
async function postToFacebookGroup(text: string, overrideToken?: string): Promise<boolean> {
  const token = overrideToken || process.env.FACEBOOK_ACCESS_TOKEN?.trim();
  const groupId = process.env.FACEBOOK_GROUP_ID?.trim() || FB_GROUP_ID_DEFAULT;
  if (!token) {
    console.log("[Channel:FacebookGroup] SKIP — no FACEBOOK_ACCESS_TOKEN");
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
    const telegram =
      !!(
        process.env.TELEGRAM_BOT_TOKEN?.trim() || TELEGRAM_BOT_TOKEN_DEFAULT
      ) &&
      !!(
        process.env.TELEGRAM_CHAT_ID?.trim() || TELEGRAM_CHAT_ID_DEFAULT
      );
    const whatsapp =
      !!process.env.WHATSAPP_ACCESS_TOKEN?.trim() &&
      !!process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() &&
      (process.env.WHATSAPP_BROADCAST_TO ?? "").split(",").some((n) => n.trim());

    // Facebook: try env var first, fallback to database settings
    let fbToken = process.env.FACEBOOK_ACCESS_TOKEN?.trim() ?? "";
    let fbTokenSource: string = fbToken ? "env" : "none";
    if (!fbToken) {
      try {
        const settings: Record<string, unknown> = await ctx.runQuery(
          (await import("./_generated/api" as string)).api.settings.getAll,
          { token: "__channel_setup__" }
        ) as Record<string, unknown>;
        // Check common key patterns for the Facebook token in settings
        for (const key of ["facebookAccessToken", "facebook_access_token", "FB_ACCESS_TOKEN"]) {
          const val = settings[key];
          if (typeof val === "string" && val.trim().length > 10) {
            fbToken = val.trim();
            fbTokenSource = "db:" + key;
            break;
          }
        }
      } catch {
        // query might fail if not admin — that's fine, use env only
      }
    }

    const fbTokenLen = fbToken.length;
    const fbTokenPrefix = fbTokenLen > 4 ? fbToken.slice(0, 4) : "";
    const facebook =
      fbTokenLen > 0 &&
      (!!process.env.FACEBOOK_PAGE_ID?.trim() || !!FB_PAGE_ID_DEFAULT);
    const facebookGroup =
      fbTokenLen > 0 &&
      (!!process.env.FACEBOOK_GROUP_ID?.trim() || !!FB_GROUP_ID_DEFAULT);
    return {
      telegram,
      whatsapp,
      facebook,
      facebookGroup,
      _diag: {
        fbTokenPresent: fbTokenLen > 0,
        fbTokenLen,
        fbTokenPrefix,
        fbTokenSource,
        fbPageIdPresent: !!(process.env.FACEBOOK_PAGE_ID?.trim()),
        fbGroupIdPresent: !!(process.env.FACEBOOK_GROUP_ID?.trim()),
        fbGroupIdDefault: !!FB_GROUP_ID_DEFAULT,
        fbPageIdDefault: !!FB_PAGE_ID_DEFAULT,
        envFbToken: !!process.env.FACEBOOK_ACCESS_TOKEN?.trim(),
      },
    };
  },
});

// ── صندوق الإرسال الموثوق ─────────────────────────────────────────────

/** توكن فيسبوك: متغير البيئة أولاً ثم قاعدة بيانات الإعدادات (بدون أسرار عرضة). */
async function resolveFacebookToken(ctx: ActionCtx): Promise<string> {
  let token = process.env.FACEBOOK_ACCESS_TOKEN?.trim() ?? "";
  if (!token) {
    try {
      const settings = (await ctx.runQuery(api.settings.getAll, {
        token: "__channel_publish__",
      })) as Record<string, unknown>;
      for (const key of ["facebookAccessToken", "facebook_access_token", "FB_ACCESS_TOKEN"]) {
        const value = settings[key];
        if (typeof value === "string" && value.trim().length > 10) {
          token = value.trim();
          break;
        }
      }
    } catch {
      /* fallback: no token */
    }
  }
  return token;
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
  const fbToken = await resolveFacebookToken(ctx);
  switch (channel) {
    case "telegram":
      return postToTelegram(text);
    case "whatsapp":
      return postToWhatsApp(text);
    case "facebook_page":
      return postToFacebookPage(text, undefined, fbToken || undefined);
    case "facebook_group":
      return postToFacebookGroup(text, fbToken || undefined);
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
): Promise<{ done: string[]; failed: string[] }> {
  const rows = (await ctx.runMutation(internal.channelPush.enqueueOutbox, {
    title: payload.title,
    // الرسالة المحفوظة في الصندوق تُستخدم حرفياً في إعادة المحاولة
    message: payload.texts.telegram,
    category: payload.category,
    kind: payload.kind,
    entityId: payload.entityId,
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
  console.log(`[ChannelOutbox] title="${payload.title}" done=[${done}] failed=[${failed}]`);
  return { done, failed };
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

    const { done, failed } = await deliverEverywhere(ctx, {
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

    console.log(`[ChannelNotice] title="${args.title}" done=[${done}] failed=[${failed}]`);
    return { ok: done.length > 0, published: done, failed };
  },
});

// ── 🩺 فحص صحة قنوات المنصة (سيرفرات التواصل الاجتماعي) ──────────────────

type ChannelHealthRow = {
  channel: string;
  status: "ok" | "degraded" | "down";
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
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() || TELEGRAM_BOT_TOKEN_DEFAULT;
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
      detail: `البوت @${me.data.result.username} — القناة: ${chat.data.result.title ?? chatId}`,
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

async function checkWhatsApp(): Promise<ChannelHealthRow> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const recipients = (process.env.WHATSAPP_BROADCAST_TO ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  if (!token || !phoneNumberId) {
    return {
      channel: "whatsapp",
      status: "down",
      detail: "غير مهيأ — يحتاج WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID",
    };
  }
  const res = await timedJson(
    `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=display_phone_number,verified_name&access_token=${encodeURIComponent(token)}`
  );
  if (res.ok) {
    return {
      channel: "whatsapp",
      status: "ok",
      detail: `Cloud API — ${res.data.verified_name ?? "الحساب"} (${res.data.display_phone_number ?? phoneNumberId}) · ${recipients.length} مستلم`,
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
  token: string
): Promise<ChannelHealthRow> {
  const label = channel === "facebook_page" ? "صفحة فيسبوك" : "مجموعة فيسبوك";
  if (!token) {
    return {
      channel,
      status: "down",
      detail: `غير مهيأ — يحتاج FACEBOOK_ACCESS_TOKEN للنشر على ${label}`,
    };
  }
  const res = await timedJson(
    `https://graph.facebook.com/v21.0/${id}?fields=name&access_token=${encodeURIComponent(token)}`
  );
  if (res.ok) {
    return {
      channel,
      status: "ok",
      detail: `${label}: ${res.data.name ?? id}`,
      latencyMs: res.latencyMs,
    };
  }
  return {
    channel,
    status: "degraded",
    detail: `التوكن سليم لكن الوصول لـ${label} (${id}) فشل — ${res.data?.error?.message ?? res.error ?? "راجع صلاحيات التوكن"}`,
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
    const fbToken = await resolveFacebookToken(ctx);
    const rows: ChannelHealthRow[] = [
      await checkTelegram(),
      await checkWhatsApp(),
      await checkFacebookTarget(
        "facebook_page",
        process.env.FACEBOOK_PAGE_ID?.trim() || FB_PAGE_ID_DEFAULT,
        fbToken
      ),
      await checkFacebookTarget(
        "facebook_group",
        process.env.FACEBOOK_GROUP_ID?.trim() || FB_GROUP_ID_DEFAULT,
        fbToken
      ),
    ];

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
      await ctx.runMutation(internal.channelPush.saveChannelStatus, { rows, checkedAt });
    } catch (err) {
      console.error("[ChannelHealth] save failed:", err);
    }

    const healthy = rows.filter((row) => row.status === "ok").length;
    const broken = rows.filter((row) => row.status !== "ok");
    const healed = rows.filter(
      (row) => row.status === "ok" && previous[row.channel] && previous[row.channel] !== "ok"
    );
    const broke = rows.filter(
      (row) => row.status !== "ok" && previous[row.channel] === "ok"
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
    return { checkedAt, healthy, total: rows.length, rows };
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

    const { done, failed } = await deliverEverywhere(ctx, {
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

    console.log(`[ChannelPublish] kind=${args.kind} title="${args.title}" done=[${done}] failed=[${failed}]`);

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
    return { ok: done.length > 0, published: done, failed };
  },
});
