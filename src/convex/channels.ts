"use node";

// Automatic channel publisher — every time the admin publishes a listing,
// ad or offer from the dashboard, this action posts it to the platform's
// official channels automatically:
//
//   • Telegram  — official Bot API (sendMessage). Needs TELEGRAM_BOT_TOKEN
//                 and TELEGRAM_CHAT_ID (comma-separated for several chats)
//                 set in the Convex dashboard environment.
//   • WhatsApp  — WhatsApp Cloud API broadcast to the numbers in
//                 WHATSAPP_BROADCAST_TO (comma-separated) when the admin
//                 configures WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID.
//                 The wa.me share link is always included in the text so the
//                 platform's official WhatsApp number stays reachable.
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

async function postToTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chats = (process.env.TELEGRAM_CHAT_ID ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  if (!token || chats.length === 0) return false;
  let any = false;
  for (const chatId of chats) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: false }),
      });
      if (res.ok) any = true;
    } catch {
      // best-effort
    }
  }
  return any;
}

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

/** Presence-only report of which channel keys are configured (no secrets). */
export const getChannelSetup = action({
  args: {},
  handler: async () => {
    const telegram =
      !!process.env.TELEGRAM_BOT_TOKEN?.trim() &&
      (process.env.TELEGRAM_CHAT_ID ?? "").split(",").some((c) => c.trim());
    const whatsapp =
      !!process.env.WHATSAPP_ACCESS_TOKEN?.trim() &&
      !!process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() &&
      (process.env.WHATSAPP_BROADCAST_TO ?? "").split(",").some((n) => n.trim());
    return { telegram, whatsapp };
  },
});

/**
 * Publish an item to the configured channels and record what succeeded.
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
    const done: string[] = [];
    if (await postToTelegram(text)) done.push("telegram");
    if (await postToWhatsApp(text)) done.push("whatsapp");

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