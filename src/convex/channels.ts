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
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

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
    let fbToken = process.env.FACEBOOK_ACCESS_TOKEN?.trim() ?? "";
    if (!fbToken) {
      try {
        const settings: Record<string, unknown> = await ctx.runQuery(
          (await import("./_generated/api" as string)).api.settings.getAll,
          { token: "__channel_notice__" }
        ) as Record<string, unknown>;
        for (const key of ["facebookAccessToken", "facebook_access_token", "FB_ACCESS_TOKEN"]) {
          const val = settings[key];
          if (typeof val === "string" && val.trim().length > 10) {
            fbToken = val.trim();
            break;
          }
        }
      } catch { /* fallback: no token */ }
    }

    const text = [
      `🔔 ${args.title}`,
      "",
      args.message,
      "",
      `🌐 المنصة: ${PLATFORM_BASE}`,
      `📱 واتساب المنصة: ${PLATFORM_PHONE_DISPLAY} (${PLATFORM_PHONE_LINK})`,
    ].join("\n");

    const done: string[] = [];
    const failed: string[] = [];
    if (await postToTelegram(text)) done.push("telegram"); else failed.push("telegram");
    if (await postToWhatsApp(text)) done.push("whatsapp"); else failed.push("whatsapp");
    if (await postToFacebookPage(text, undefined, fbToken || undefined)) done.push("facebook_page");
    else failed.push("facebook_page");
    if (await postToFacebookGroup(text, fbToken || undefined)) done.push("facebook_group");
    else failed.push("facebook_group");

    console.log(`[ChannelNotice] title="${args.title}" done=[${done}] failed=[${failed}]`);
    return { ok: done.length > 0, published: done, failed };
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
    // Resolve Facebook token: env var → database fallback
    let fbToken = process.env.FACEBOOK_ACCESS_TOKEN?.trim() ?? "";
    if (!fbToken) {
      try {
        const settings: Record<string, unknown> = await ctx.runQuery(
          (await import("./_generated/api" as string)).api.settings.getAll,
          { token: "__channel_publish__" }
        ) as Record<string, unknown>;
        for (const key of ["facebookAccessToken", "facebook_access_token", "FB_ACCESS_TOKEN"]) {
          const val = settings[key];
          if (typeof val === "string" && val.trim().length > 10) {
            fbToken = val.trim();
            break;
          }
        }
      } catch { /* fallback: no token */ }
    }

    const text = buildMessage(args);
    const fbText = buildFacebookMessage(args);
    const fullUrl = `${PLATFORM_BASE}${args.url}`;
    const done: string[] = [];
    const failed: string[] = [];

    // Telegram
    if (await postToTelegram(text)) {
      done.push("telegram");
    } else {
      failed.push("telegram");
    }

    // WhatsApp
    if (await postToWhatsApp(text)) {
      done.push("whatsapp");
    } else {
      failed.push("whatsapp");
    }

    // Facebook Page (with platform link)
    if (await postToFacebookPage(fbText + `\n\n🔗 ${fullUrl}`, undefined, fbToken || undefined)) {
      done.push("facebook_page");
    } else {
      failed.push("facebook_page");
    }

    // Facebook Group (text + link)
    if (await postToFacebookGroup(fbText + `\n\n🔗 ${fullUrl}`, fbToken || undefined)) {
      done.push("facebook_group");
    } else {
      failed.push("facebook_group");
    }

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
