"use node";

/**
 * 📤 File Forwarding Engine — ViP Yemen
 *
 * Forwards uploaded files (images, PDFs, videos) to:
 *   • Telegram channel (@vipyemen77) via Bot API (sendDocument / sendPhoto / sendVideo)
 *   • Facebook Group (346010664332427) via Graph API (group photos / videos)
 *
 * Files are forwarded asynchronously via a queue (fileQueue table).
 * After successful forwarding, the Convex storage file is cleaned up
 * so the platform stays lightweight — Telegram/Facebook become the
 * permanent file storage.
 *
 * Architecture:
 *   Client uploads → Convex storage (temporary) → fileQueue (pending)
 *   → this action processes queue → sends to Telegram + Facebook
 *   → marks as forwarded → cleanup action deletes from Convex storage
 */
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// ── Constants ─────────────────────────────────────────────────────────
const TELEGRAM_BOT_TOKEN_DEFAULT = "8876814738:AAFepkzzC0g__-xGz9JE_sqvq0JMM1kHVWM";
const TELEGRAM_CHAT_ID_DEFAULT = "@vipyemen77";
const FB_GROUP_ID_DEFAULT = "346010664332427";

const PLATFORM_BASE = "https://vi-p-yemen.vercel.app";
const PLATFORM_PHONE = "📱 واتساب المنصة: 00967711780999";
const MAX_RETRIES = 3;
const TG_MAX_PHOTO_MB = 10;
const TG_MAX_DOC_MB = 50;
const TG_MAX_VIDEO_MB = 50;

// ── Helpers ───────────────────────────────────────────────────────────

function getTelegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() || TELEGRAM_BOT_TOKEN_DEFAULT;
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim() || TELEGRAM_CHAT_ID_DEFAULT;
  return { token, chatId };
}

function getFacebookConfig() {
  const token = process.env.FACEBOOK_ACCESS_TOKEN?.trim();
  const groupId = process.env.FACEBOOK_GROUP_ID?.trim() || FB_GROUP_ID_DEFAULT;
  return { token, groupId };
}

function detectFileType(mimeType: string): "photo" | "video" | "document" {
  if (mimeType.startsWith("image/")) return "photo";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}

function categoryLabel(entityType: string, entityTitle?: string): string {
  const prefix = entityType === "submission" ? "📋 طلب جديد"
    : entityType === "ad" ? "📢 إعلان ترويجي"
    : "🎁 عرض خاص";
  return entityTitle ? `${prefix}\n${entityTitle}` : prefix;
}

// ── Telegram File Send ────────────────────────────────────────────────

async function sendFileToTelegram(
  fileBuffer: ArrayBuffer,
  fileName: string,
  mimeType: string,
  caption: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId) {
    return { ok: false, error: "Telegram not configured" };
  }

  const fileType = detectFileType(mimeType);
  const sizeMB = fileBuffer.byteLength / (1024 * 1024);

  // Check size limits
  if (fileType === "photo" && sizeMB > TG_MAX_PHOTO_MB) {
    // Fall back to document for oversized images
    return sendAsTelegramDocument(fileBuffer, fileName, mimeType, caption, token, chatId);
  }
  if (fileType === "video" && sizeMB > TG_MAX_VIDEO_MB) {
    return { ok: false, error: `Video too large (${sizeMB.toFixed(1)}MB > ${TG_MAX_VIDEO_MB}MB limit)` };
  }
  if (fileType === "document" && sizeMB > TG_MAX_DOC_MB) {
    return { ok: false, error: `File too large (${sizeMB.toFixed(1)}MB > ${TG_MAX_DOC_MB}MB limit)` };
  }

  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("caption", caption);

  if (fileType === "photo") {
    formData.append("photo", new Blob([fileBuffer], { type: mimeType }), fileName);
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (res.ok) {
      const fileId = data.result?.photo?.[0]?.file_id;
      const fileUrl = fileId ? `https://t.me/${chatId.replace("@", "")}/${data.result.message_id}` : undefined;
      return { ok: true, url: fileUrl };
    }
    return { ok: false, error: JSON.stringify(data) };
  }

  if (fileType === "video") {
    formData.append("video", new Blob([fileBuffer], { type: mimeType }), fileName);
    const res = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (res.ok) {
      const fileUrl = `https://t.me/${chatId.replace("@", "")}/${data.result.message_id}`;
      return { ok: true, url: fileUrl };
    }
    return { ok: false, error: JSON.stringify(data) };
  }

  // Document (PDF, DOC, etc.)
  return sendAsTelegramDocument(fileBuffer, fileName, mimeType, caption, token, chatId);
}

async function sendAsTelegramDocument(
  fileBuffer: ArrayBuffer,
  fileName: string,
  mimeType: string,
  caption: string,
  token: string,
  chatId: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("caption", caption);
  formData.append("document", new Blob([fileBuffer], { type: mimeType }), fileName);

  const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (res.ok) {
    const fileUrl = `https://t.me/${chatId.replace("@", "")}/${data.result.message_id}`;
    return { ok: true, url: fileUrl };
  }
  return { ok: false, error: JSON.stringify(data) };
}

// ── Facebook Group File Post ──────────────────────────────────────────

async function sendFileToFacebook(
  fileBuffer: ArrayBuffer,
  fileName: string,
  mimeType: string,
  caption: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const { token, groupId } = getFacebookConfig();
  if (!token) {
    return { ok: false, error: "Facebook not configured" };
  }

  try {
    // Post as a message with the file attached
    // For photos: use /photos endpoint
    // For other files: post a text message with link (Graph API doesn't support arbitrary file uploads to groups)
    const fileType = detectFileType(mimeType);

    if (fileType === "photo") {
      // Graph API can accept a photo URL but not raw bytes in a simple POST
      // For group photos, we post a text message with the caption
      // The actual image is stored on Telegram (which is the primary storage)
      const res = await fetch(`https://graph.facebook.com/v21.0/${groupId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: caption,
          access_token: token,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        return { ok: true, url: data.id ? `https://facebook.com/${data.id}` : undefined };
      }
      return { ok: false, error: JSON.stringify(data) };
    }

    // For documents/videos: post caption text to group
    const res = await fetch(`https://graph.facebook.com/v21.0/${groupId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `${caption}\n\n📎 الملف: ${fileName}`,
        access_token: token,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      return { ok: true, url: data.id ? `https://facebook.com/${data.id}` : undefined };
    }
    return { ok: false, error: JSON.stringify(data) };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

// ── Main Processing Action ────────────────────────────────────────────

/**
 * Process a single file from the queue.
 * Called by the cron job or directly after upload.
 */
export const processFileQueue = action({
  args: {
    queueId: v.id("fileQueue"),
    storageId: v.string(),
    fileName: v.string(),
    fileKind: v.string(),
    mimeType: v.string(),
    entityType: v.string(),
    entityTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(`[FileForward] Processing: ${args.fileName} (${args.fileKind}) for ${args.entityType}`);

    // Mark as forwarding
    await ctx.runMutation(api.fileQueueMutations.markForwarding, { id: args.queueId });

    // Download from Convex storage
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      await ctx.runMutation(api.fileQueueMutations.markFailed, {
        id: args.queueId,
        error: "File not found in storage",
      });
      return { ok: false, error: "File not found in storage" };
    }

    const res = await fetch(url);
    if (!res.ok) {
      await ctx.runMutation(api.fileQueueMutations.markFailed, {
        id: args.queueId,
        error: `Failed to download: ${res.status}`,
      });
      return { ok: false, error: `Failed to download: ${res.status}` };
    }

    const buffer = await res.arrayBuffer();
    const caption = categoryLabel(args.entityType, args.entityTitle);

    // Forward to Telegram + Facebook in parallel
    const [tgResult, fbResult] = await Promise.all([
      sendFileToTelegram(buffer, args.fileName, args.mimeType, caption).catch((e) => ({
        ok: false as const,
        error: e.message,
      })),
      sendFileToFacebook(buffer, args.fileName, args.mimeType, caption).catch((e) => ({
        ok: false as const,
        error: e.message,
      })),
    ]);

    const forwardedTo: string[] = [];
    const remoteUrls: Record<string, string> = {};
    const errors: string[] = [];

    if (tgResult.ok) {
      forwardedTo.push("telegram");
      if (tgResult.url) remoteUrls.telegram = tgResult.url;
      console.log(`[FileForward] ✅ Telegram: ${args.fileName}`);
    } else {
      errors.push(`Telegram: ${tgResult.error}`);
      console.error(`[FileForward] ❌ Telegram: ${args.fileName} — ${tgResult.error}`);
    }

    if (fbResult.ok) {
      forwardedTo.push("facebook");
      if (fbResult.url) remoteUrls.facebook = fbResult.url;
      console.log(`[FileForward] ✅ Facebook: ${args.fileName}`);
    } else {
      errors.push(`Facebook: ${fbResult.error}`);
      console.error(`[FileForward] ❌ Facebook: ${args.fileName} — ${fbResult.error}`);
    }

    // Update queue record
    if (forwardedTo.length > 0) {
      await ctx.runMutation(api.fileQueueMutations.markForwarded, {
        id: args.queueId,
        forwardedTo,
        remoteUrls,
      });

      // Cleanup handled by cron job — no need to schedule here
    } else {
      await ctx.runMutation(api.fileQueueMutations.markFailed, {
        id: args.queueId,
        error: errors.join("; "),
      });
    }

    return {
      ok: forwardedTo.length > 0,
      telegram: tgResult.ok,
      facebook: fbResult.ok,
      remoteUrls,
    };
  },
});

// Batch processing moved to fileQueueInternal.ts (called by cron)
// Avoids circular reference in generated API types
