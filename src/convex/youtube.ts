"use node";

// 🎬 نشر الفيديوهات على قناة يوتيوب الرسمية للمنصة — ViP Yemen
//
// المسار الاحترافي (زر واحد في لوحة التحكم):
//   1. يُحوَّل الفيديو العمودي آلياً في المتصفح إلى صيغة يوتيوب الأفقية 16:9
//      (src/lib/videoLandscape.ts) ثم يُرفع إلى تخزين المنصة.
//   2. تُستدعى هذه الوحدة لرفعه فعلياً إلى يوتيوب عبر Data API v3
//      (Resumable Upload) بواجهة OAuth2 المتجددة.
//
// متطلبات البيئة (بدون قيم مسرّبة في الكود):
//   YOUTUBE_CLIENT_ID      معرّف عميل OAuth من Google Cloud Console
//   YOUTUBE_CLIENT_SECRET  سرّ عميل OAuth
//   YOUTUBE_REFRESH_TOKEN  رمز التحديث (يُولَّد مرة واحدة ويظل دائماً)
//
// كل الفشل يُبلَّغ عنه بالعربية ولا يُسقط بقية عمليات النشر.
import { action, type ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { YOUTUBE_URL } from "../lib/socialLinks";
import { youTubeConfigForAction, type YouTubeRuntimeConfig } from "./channelKeys";

const YOUTUBE_SCOPES = "https://www.googleapis.com/auth/youtube.upload";

/** أسماء مفاتيح يوتيوب في متغيرات البيئة (أسماء فقط — لا تُعرض قيمها أبداً). */
export const REQUIRED_ENV_KEYS = [
  "YOUTUBE_CLIENT_ID",
  "YOUTUBE_CLIENT_SECRET",
  "YOUTUBE_REFRESH_TOKEN",
] as const;

/**
 * إعدادات يوتيوب الفعلية: متغير البيئة أولاً ثم ما حُفظ من لوحة التحكم
 * («قسم النشر التلقائي» ← بطاقة يوتيوب). بهما يمكن ربط يوتيوب من اللوحة
 * دون لمس الخادم، والأولوية لبيئة Convex متى ضُبطت.
 */
async function youtubeConfig(ctx: ActionCtx) {
  return await youTubeConfigForAction(ctx);
}

/** استخراج توكن وصول قصير العمر من رمز التحديث (يتجدد آلياً مع كل استدعاء). */
async function getAccessToken(
  cfg: YouTubeRuntimeConfig
): Promise<{ token?: string; error?: string }> {
  const clientId = cfg.clientId;
  const clientSecret = cfg.clientSecret;
  const refreshToken = cfg.refreshToken;
  if (!clientId || !clientSecret || !refreshToken) {
    return {
      error: `مفاتيح يوتيوب غير مكتملة: ${cfg.missing.join(" · ")} — أضفها من لوحة التحكم (قسم النشر التلقائي) أو في متغيرات بيئة Convex`,
    };
  }
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!res.ok || !data.access_token) {
      return {
        error:
          data.error_description ??
          data.error ??
          "تعذر الحصول على توكن الوصول من يوتيوب — تحقق من رمز التحديث",
      };
    }
    return { token: data.access_token };
  } catch (err: any) {
    return { error: err?.message ?? "خطأ شبكة أثناء الاتصال بيوتيوب" };
  }
}

/** جاهزية النشر (أسماء مفاتيح فقط — بلا أي سر). */
export const getSetup = action({
  args: {},
  handler: async (ctx: ActionCtx) => {
    const cfg = await youtubeConfig(ctx);
    return {
      ready: cfg.ready,
      missing: cfg.missing,
      envKeys: [...REQUIRED_ENV_KEYS],
      source: cfg.source,
      channel: YOUTUBE_URL,
      note: cfg.ready
        ? "جاهز لرفع الفيديوهات — يوتيوب مربوط عبر OAuth متجدد."
        : `أضف ${cfg.missing.join(" · ")} من لوحة التحكم ← قسم النشر التلقائي ← بطاقة يوتيوب، أو في متغيرات بيئة Convex.`,
    };
  },
});

/** رفع فيديو من تخزين المنصة إلى قناة يوتيوب — بضغطة زر واحدة. */
export const uploadVideo = action({
  args: {
    token: v.string(),
    storageId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    tags: v.optional(v.string()),
    privacyStatus: v.optional(v.string()),
    makeShort: v.optional(v.boolean()),
  },
  handler: async (ctx: ActionCtx, args) => {
    // 🔐 جلسة إدارية إلزامية — لا رفع لمن ليس إدارياً.
    await ctx.runQuery(api.settings.getAll, { token: args.token });

    const title = args.title.trim();
    if (title.length < 3) {
      return { ok: false as const, error: "عنوان الفيديو مطلوب (3 أحرف على الأقل)" };
    }
    const ytCfg = await youtubeConfig(ctx);
    if (!ytCfg.ready) {
      return {
        ok: false as const,
        error: `مفاتيح يوتيوب غير مضبوطة: ${ytCfg.missing.join(" · ")} — أضفها من لوحة التحكم ← قسم النشر التلقائي ← بطاقة يوتيوب`,
      };
    }

    const blob = await ctx.storage.get(args.storageId);
    if (!blob) {
      return { ok: false as const, error: "ملف الفيديو غير موجود في تخزين المنصة" };
    }
    const mimeType = blob.type || "video/webm";
    const auth = await getAccessToken(ytCfg);
    if (!auth.token) {
      return { ok: false as const, error: auth.error ?? "تعذر الاتصال بيوتيوب" };
    }

    const tags = (args.tags ?? "")
      .split(/[,،]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 25);
    const metadata = {
      snippet: {
        title,
        description:
          (args.description?.trim() || title) +
          "\n\n🌐 منصة ViP Yemen — التوظيف والعقارات والتسويق الإلكتروني والخدمات البرمجية\n📱 واتساب: 00967711780999",
        tags: tags.length > 0 ? tags : ["ViP Yemen", "اليمن", "توظيف", "عقارات"],
        categoryId: "28", // Science & Technology (مناسب للمنصة/الخدمات البرمجية)
      },
      status: {
        privacyStatus: args.privacyStatus ?? "public",
        selfDeclaredMadeForKids: false,
      },
    };

    try {
      // 1) بدء جلسة رفع متجددة (resumable session)
      const initRes = await fetch(
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${auth.token}`,
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Length": String(blob.size),
            "X-Upload-Content-Type": mimeType,
          },
          body: JSON.stringify(metadata),
        }
      );
      const uploadUrl = initRes.headers.get("location");
      if (!initRes.ok || !uploadUrl) {
        const detail = await initRes.text().catch(() => "");
        return {
          ok: false as const,
          error: `رفض يوتيوب بدء الرفع (${initRes.status}) — ${detail.slice(0, 300)}`,
        };
      }

      // 2) إرسال ملف الفيديو نفسه
      const bytes = Buffer.from(await blob.arrayBuffer());
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": mimeType,
          "Content-Length": String(bytes.length),
        },
        body: bytes,
      });
      const data = (await putRes.json().catch(() => ({}))) as {
        id?: string;
        error?: { message?: string };
      };
      if (!putRes.ok || !data.id) {
        return {
          ok: false as const,
          error: `فشل رفع الفيديو إلى يوتيوب (${putRes.status}) — ${
            data.error?.message ?? "خطأ غير معروف"
          }`,
        };
      }

      const url = `https://youtu.be/${data.id}`;
      try {
        await ctx.runMutation(internal.channelPush.logChannelEvent, {
          title: "🎬 نشر فيديو على قناة يوتيوب",
          message: `تم رفع «${title}» بنجاح — ${url} · الصلاحية: ${metadata.status.privacyStatus}`,
        });
      } catch {
        /* التوثيق لا يُسقط النشر */
      }
      return {
        ok: true as const,
        videoId: data.id,
        url,
        title,
        privacyStatus: metadata.status.privacyStatus,
        size: blob.size,
        scope: YOUTUBE_SCOPES,
      };
    } catch (err: any) {
      return { ok: false as const, error: err?.message ?? "خطأ غير متوقع أثناء الرفع" };
    }
  },
});
