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
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export type ChannelKind = "submission" | "ad" | "offer";

const PLATFORM_BASE = "https://vi-p-yemen.vercel.app";
const PLATFORM_PHONE_DISPLAY = "00967711780999";
const PLATFORM_PHONE_LINK = "https://wa.me/967711780999";

// Official channel identifiers
const TELEGRAM_BOT_TOKEN_DEFAULT = "8876814738:AAFEpkzzC0g__-xGz9JE_sqvq0JMM1kHVWM";
const TELEGRAM_CHAT_ID_DEFAULT = "@vipyemen77";
const FB_PAGE_ID_DEFAULT = "vipyemen1";
const FB_GROUP_ID_DEFAULT = "346010664332427";

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

// ── Telegram ──────────────────────────────────────────────────────────
async function postToTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() || TELEGRAM_BOT_TOKEN_DEFAULT;
  const envChats = (process.env.TELEGRAM_CHAT_ID ?? "").trim();
  const chats = envChats
    ? envChats.split(",").map((c) => c.trim()).filter(Boolean)
    : [TELEGRAM_CHAT_ID_DEFAULT];
  if (!token || chats.length === 0) return false;
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
      if (res.ok) any = true;
    } catch {
      // best-effort
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
  if (!token || !phoneNumberId || recipients.length === 0) return false;
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
      if (res.ok) any = true;
    } catch {
      // best-effort
    }
  }
  return any;
}

// ── Facebook Page ─────────────────────────────────────────────────────
async function postToFacebookPage(text: string, imageUrl?: string): Promise<boolean> {
  const token = process.env.FACEBOOK_ACCESS_TOKEN?.trim();
  const pageId = process.env.FACEBOOK_PAGE_ID?.trim() || FB_PAGE_ID_DEFAULT;
  if (!token) return false;

  try {
    if (imageUrl) {
      // Post with photo (Graph API v21.0 — page photos endpoint)
      const photoRes = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/photos`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            url: imageUrl,
            access_token: token,
          }),
        }
      );
      if (photoRes.ok) return true;
    }

    // Fallback: text-only post to page feed
    const feedRes = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/feed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          access_token: token,
        }),
      }
    );
    return feedRes.ok;
  } catch {
    return false;
  }
}

// ── Facebook Group ────────────────────────────────────────────────────
async function postToFacebookGroup(text: string): Promise<boolean> {
  const token = process.env.FACEBOOK_ACCESS_TOKEN?.trim();
  const groupId = process.env.FACEBOOK_GROUP_ID?.trim() || FB_GROUP_ID_DEFAULT;
  if (!token) return false;

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
    return res.ok;
  } catch {
    return false;
  }
}

// ── Presence-only report (no secrets) ─────────────────────────────────
export const getChannelSetup = action({
  args: {},
  handler: async () => {
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
    const facebook =
      !!process.env.FACEBOOK_ACCESS_TOKEN?.trim() &&
      (!!process.env.FACEBOOK_PAGE_ID?.trim() || !!FB_PAGE_ID_DEFAULT);
    const facebookGroup =
      !!process.env.FACEBOOK_ACCESS_TOKEN?.trim() &&
      (!!process.env.FACEBOOK_GROUP_ID?.trim() || !!FB_GROUP_ID_DEFAULT);
    return { telegram, whatsapp, facebook, facebookGroup };
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
    const fullUrl = `${PLATFORM_BASE}${args.url}`;
    const done: string[] = [];

    // Telegram
    if (await postToTelegram(text)) done.push("telegram");

    // WhatsApp
    if (await postToWhatsApp(text)) done.push("whatsapp");

    // Facebook Page (with platform link as image caption)
    if (await postToFacebookPage(text + `\n\n🔗 ${fullUrl}`)) done.push("facebook_page");

    // Facebook Group (text + link)
    if (await postToFacebookGroup(text + `\n\n🔗 ${fullUrl}`)) done.push("facebook_group");

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
    return { ok: true, published: done };
  },
});
