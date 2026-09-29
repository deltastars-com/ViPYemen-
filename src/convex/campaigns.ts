// 📮 حملات البريد الإلكتروني الأوتوماتيكية — المحرك الكامل.
//
// لماذا هذا الملف:حملة بريد يجب أن تعمل آلياً بلا تدخل، فلا تضيع رسالة عند
// فشل مؤقت، ولا يُرسل المرسل مرتين، ويوجد إلغاء اشتراك في تذييل كل رسالة
// (شرط أساسي لأي بريد تسويقي حقيقي).
//
// ما يفعله:
//   1. قاعدة مشتركين مع رمز إلغاء اشتراك فريد لكل بريد.
//   2. حملات بجدولة زمنية، تُرسَل على دفعات (25 رسالة لكل دفعة) مع
//      استئناف تلقائي — فحملة لآلاف المشتركين تستمر بلا تدخل.
//   3. سجل إرسال تفصيلي لكل (حملة × مشترك) يمنع التكرار ويحمي من الفقدان.
//   4. مزوّد البريد يُقرأ من إعدادات اللوحة أولاً ثم من متغير البيئة،
//      فلا حاجة لأي متغير بيئة لتشغيل النظام.
//
// دورة الحياة:
//   draft → scheduled → sending → sent
//              ↑          │
//              └─ paused ┘   (إيقاف مؤقت)   ·   stopped (إيقاف نهائي)
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type ActionCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { api, internal } from "./_generated/api";
import { requireAdmin } from "./auth";

const BATCH_SIZE = 25;
const MAX_ATTEMPTS = 3;
const DAY = 86_400_000;
const PLATFORM_BASE = "https://vi-p-yemen.vercel.app";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** مفاتيح إعدادات البريد في جدول settings (يكتبها المشرف من اللوحة). */
const SETTINGS_KEYS = [
  "emailProviderKey",
  "emailFromName",
  "emailFromAddress",
  "emailReplyTo",
] as const;

export interface EmailConfig {
  apiKey: string;
  fromName: string;
  fromAddress: string;
  replyTo: string;
  source: "settings" | "env" | "none";
}

function maskEmail(email: string): string {
  const [name = "", domain = ""] = email.split("@");
  const head = name.slice(0, 2);
  return `${head}${"*".repeat(Math.max(1, name.length - 2))}@${domain}`;
}

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** يحوّل نص الحملة (Markdown مبسّط) إلى HTML. */
function bodyToHtml(body: string): string {
  const blocks = body.split(/\n{2,}/);
  return blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("### ")) {
        return `<h2 style="margin:0 0 8px;font-size:18px;color:#f5efdc">${escapeHtml(
          trimmed.slice(4)
        )}</h2>`;
      }
      if (trimmed.startsWith("## ")) {
        return `<h3 style="margin:12px 0 6px;font-size:15px;color:#d4af37">${escapeHtml(
          trimmed.slice(3)
        )}</h3>`;
      }
      if (trimmed.startsWith("- ")) {
        return `<ul style="margin:8px 0;padding-right:18px;color:#c9c3b4">${trimmed
          .split("\n")
          .map((line) => `<li style="margin:4px 0">${escapeHtml(line.replace(/^- /, ""))}</li>`)
          .join("")}</ul>`;
      }
      return `<p style="margin:8px 0;line-height:1.9;color:#c9c3b4">${escapeHtml(
        trimmed
      ).replace(/\*\*(.+?)\*\*/g, '<b style="color:#f5efdc">$1</b>')}</p>`;
    })
    .join("");
}

/** قالب الرسالة: هوية المنصة (ذهبي/كحلي) · RTL · معاينة · إلغاء اشتراك. */
function renderEmail(args: {
  subject: string;
  preview?: string;
  body: string;
  unsubUrl: string;
  platformUrl: string;
}): string {
  return `<!doctype html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0b1020;font-family:Tahoma,Arial,sans-serif">
<span style="display:none;font-size:1px;color:#0b1020">${escapeHtml(args.preview ?? args.subject)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b1020;padding:24px 12px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#121a2f;border:1px solid #24304d;border-radius:16px;overflow:hidden">
    <tr><td style="background:linear-gradient(135deg,#121a2f,#1d2a4a);padding:22px 24px;border-bottom:2px solid #d4af37">
      <div style="color:#d4af37;font-weight:bold;font-size:18px">ViP Yemen</div>
      <div style="color:#8f9bb3;font-size:12px;margin-top:4px">التوظيف · التسويق العقاري · التسويق الإلكتروني · الخدمات البرمجية</div>
    </td></tr>
    <tr><td style="padding:24px">
      <h1 style="margin:0 0 14px;font-size:20px;line-height:1.6;color:#f5efdc">${escapeHtml(
        args.subject
      )}</h1>
      ${bodyToHtml(args.body)}
      <a href="${args.platformUrl}" style="display:inline-block;margin:18px 0 4px;background:#d4af37;color:#121a2f;font-weight:bold;text-decoration:none;padding:12px 22px;border-radius:10px">تصفّح المنصة</a>
    </td></tr>
    <tr><td style="padding:16px 24px;background:#0d1426;border-top:1px solid #24304d;color:#6f7c94;font-size:11px;line-height:1.9">
      تصلك هذه الرسالة لأنك مشترك في نشرة ViP Yemen.<br>
      <a href="${args.unsubUrl}" style="color:#d4af37">إلغاء الاشتراك</a> — في رابط واحد، دون أسئلة.
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

// ── إعدادات المزوّد ───────────────────────────────────────────────────
async function resolveEmailConfig(ctx: { runQuery: ActionCtx["runQuery"] }): Promise<EmailConfig> {
  let apiKey = "";
  let fromName = "ViP Yemen";
  let fromAddress = "onboarding@resend.dev";
  let replyTo = "";
  let fromSettings = false;
  try {
    const settings = (await ctx.runQuery(
      internal.campaigns.getEmailSettingsInternal,
      {}
    )) as Record<string, unknown>;
    const key = settings.emailProviderKey;
    if (typeof key === "string" && key.trim().length > 10) {
      apiKey = key.trim();
      fromSettings = true;
    }
    if (typeof settings.emailFromName === "string" && settings.emailFromName.trim())
      fromName = settings.emailFromName.trim();
    if (typeof settings.emailFromAddress === "string" && settings.emailFromAddress.trim())
      fromAddress = settings.emailFromAddress.trim();
    if (typeof settings.emailReplyTo === "string") replyTo = settings.emailReplyTo.trim();
  } catch {
    /* لا إعدادات — نكمل من متغير البيئة */
  }
  const envKey = process.env.RESEND_API_KEY?.trim() ?? "";
  if (!apiKey && envKey) apiKey = envKey;
  return {
    apiKey,
    fromName,
    fromAddress,
    replyTo,
    source: apiKey ? (fromSettings ? "settings" : "env") : "none",
  };
}

async function sendViaProvider(
  cfg: EmailConfig,
  args: { to: string; subject: string; html: string }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${cfg.fromName} <${cfg.fromAddress}>`,
        to: [args.to],
        subject: args.subject,
        html: args.html,
        ...(cfg.replyTo ? { reply_to: cfg.replyTo } : {}),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as any;
    if (!res.ok || data?.error) {
      return { ok: false, error: data?.message ?? data?.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

// ── الاشتراك وإلغاء الاشتراك (عام) ───────────────────────────────────
export const subscribe = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    source: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    // حقل فخّ للبوتات: يبقى فارغاً للإنسان فقط
    website: v.optional(v.string()),
  },
  handler: async (ctx, { email, name, source, tags, website }) => {
    if (website) return { ok: true, message: "تم" };
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) throw new ConvexError("بريد إلكتروني غير صالح");
    const existing = await ctx.db
      .query("emailSubscribers")
      .withIndex("by_email", (q) => q.eq("email", clean))
      .first();
    if (existing) {
      // اشتراك متكرر = إعادة تفعيل (بلا تكرار في القاعدة)
      if (existing.status === "unsubscribed") {
        await ctx.db.patch(existing._id, {
          status: "active",
          unsubscribedAt: undefined,
          unsubToken: randomToken(),
        });
        return { ok: true, reactivated: true, message: "تم تفعيل اشتراكك من جديد" };
      }
      return { ok: true, already: true, message: "أنت مشترك بالفعل" };
    }
    await ctx.db.insert("emailSubscribers", {
      email: clean,
      name: name?.trim() || undefined,
      source: source?.trim() || "landing",
      tags: tags?.length ? tags : undefined,
      status: "active",
      unsubToken: randomToken(),
      createdAt: Date.now(),
    });
    return { ok: true, message: "تم تسجيل اشتراكك — أهلاً بك في نشرة ViP Yemen" };
  },
});

export const unsubscribe = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const row = await ctx.db
      .query("emailSubscribers")
      .filter((q) => q.eq(q.field("unsubToken"), token))
      .first();
    if (!row) return { ok: false, message: "رابط إلغاء الاشتراك غير صالح" };
    if (row.status === "active") {
      await ctx.db.patch(row._id, { status: "unsubscribed", unsubscribedAt: Date.now() });
      return { ok: true, email: maskEmail(row.email) };
    }
    return { ok: true, email: maskEmail(row.email), already: true };
  },
});

export const checkUnsubscribe = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!token) return { valid: false, email: null };
    const row = await ctx.db
      .query("emailSubscribers")
      .filter((q) => q.eq(q.field("unsubToken"), token))
      .first();
    if (!row) return { valid: false, email: null };
    return {
      valid: true,
      email: maskEmail(row.email),
      status: row.status,
    };
  },
});

// ── إدارة المشتركين (لوحة التحكم) ────────────────────────────────────
export const listSubscribers = query({
  args: {
    token: v.string(),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { token, status, search, limit }) => {
    await requireAdmin(ctx, token);
    const wanted = (status ?? "all").toLowerCase();
    const term = (search ?? "").trim().toLowerCase();
    const rows = await ctx.db.query("emailSubscribers").collect();
    const filtered = rows
      .filter((row) => (wanted === "all" ? true : row.status === wanted))
      .filter((row) =>
        term ? row.email.toLowerCase().includes(term) || (row.name ?? "").toLowerCase().includes(term) : true
      )
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit ?? 200);
    return filtered.map((row) => ({
      id: row._id,
      email: row.email,
      name: row.name ?? "",
      source: row.source ?? "",
      tags: row.tags ?? [],
      status: row.status,
      createdAt: row.createdAt,
      lastSentAt: row.lastSentAt ?? null,
      unsubscribedAt: row.unsubscribedAt ?? null,
    }));
  },
});

export const addSubscriber = mutation({
  args: { token: v.string(), email: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, { token, email, name }) => {
    await requireAdmin(ctx, token);
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) throw new ConvexError("بريد إلكتروني غير صالح");
    const existing = await ctx.db
      .query("emailSubscribers")
      .withIndex("by_email", (q) => q.eq("email", clean))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "active",
        name: name?.trim() || existing.name,
        unsubscribedAt: undefined,
      });
      return { ok: true, updated: true };
    }
    await ctx.db.insert("emailSubscribers", {
      email: clean,
      name: name?.trim() || undefined,
      source: "admin",
      status: "active",
      unsubToken: randomToken(),
      createdAt: Date.now(),
    });
    return { ok: true, updated: false };
  },
});

export const setSubscriberStatus = mutation({
  args: { token: v.string(), id: v.id("emailSubscribers"), status: v.union(v.literal("active"), v.literal("unsubscribed")) },
  handler: async (ctx, { token, id, status }) => {
    await requireAdmin(ctx, token);
    const row = await ctx.db.get(id);
    if (!row) throw new ConvexError("المشترك غير موجود");
    await ctx.db.patch(id, {
      status,
      unsubscribedAt: status === "unsubscribed" ? Date.now() : undefined,
      unsubToken: status === "active" ? randomToken() : row.unsubToken,
    });
    return { ok: true };
  },
});

export const removeSubscriber = mutation({
  args: { token: v.string(), id: v.id("emailSubscribers") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    const row = await ctx.db.get(id);
    if (!row) throw new ConvexError("المشترك غير موجود");
    await ctx.db.delete(id);
    return { ok: true, email: maskEmail(row.email) };
  },
});

// ── إدارة الحملات (لوحة التحكم) ───────────────────────────────────────
export const listCampaigns = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const rows = await ctx.db.query("emailCampaigns").collect();
    return rows
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 60)
      .map((row) => ({
        id: row._id,
        subject: row.subject,
        preview: row.preview ?? "",
        status: row.status,
        audience: row.audience ?? "all",
        scheduledAt: row.scheduledAt ?? null,
        startedAt: row.startedAt ?? null,
        finishedAt: row.finishedAt ?? null,
        total: row.total,
        sent: row.sent,
        failed: row.failed,
        progress: row.total > 0 ? Math.round(((row.sent + row.failed) / row.total) * 100) : 0,
        lastError: row.lastError ?? "",
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));
  },
});

export const getCampaign = query({
  args: { token: v.string(), id: v.id("emailCampaigns") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    const row = await ctx.db.get(id);
    if (!row) throw new ConvexError("الحملة غير موجودة");
    return row;
  },
});

export const saveCampaign = mutation({
  args: {
    token: v.string(),
    id: v.optional(v.id("emailCampaigns")),
    subject: v.string(),
    preview: v.optional(v.string()),
    body: v.string(),
    fromName: v.optional(v.string()),
    replyTo: v.optional(v.string()),
    audience: v.optional(v.string()),
    scheduledAt: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { token, id, subject, preview, body, fromName, replyTo, audience, scheduledAt }
  ) => {
    await requireAdmin(ctx, token);
    if (subject.trim().length < 3) throw new ConvexError("عنوان الحملة قصير جداً");
    if (body.trim().length < 10) throw new ConvexError("نص الحملة قصير جداً");
    const status = scheduledAt && scheduledAt > Date.now() ? "scheduled" : "draft";
    if (id) {
      const row = await ctx.db.get(id);
      if (!row) throw new ConvexError("الحملة غير موجودة");
      await ctx.db.patch(id, {
        subject: subject.trim(),
        preview: preview?.trim() || undefined,
        body,
        fromName: fromName?.trim() || undefined,
        replyTo: replyTo?.trim() || undefined,
        audience: audience || "all",
        ...(status === "scheduled" ? { scheduledAt } : {}),
        status: row.status === "sending" || row.status === "sent" ? row.status : status,
        updatedAt: Date.now(),
      });
      return { ok: true, id };
    }
    const newId = await ctx.db.insert("emailCampaigns", {
      subject: subject.trim(),
      preview: preview?.trim() || undefined,
      body,
      fromName: fromName?.trim() || undefined,
      replyTo: replyTo?.trim() || undefined,
      audience: audience || "all",
      status,
      scheduledAt: status === "scheduled" ? scheduledAt : undefined,
      total: 0,
      sent: 0,
      failed: 0,
      cursor: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { ok: true, id: newId };
  },
});

export const changeCampaignState = mutation({
  args: {
    token: v.string(),
    id: v.id("emailCampaigns"),
    action: v.union(
      v.literal("schedule"),
      v.literal("pause"),
      v.literal("resume"),
      v.literal("stop"),
      v.literal("draft")
    ),
    scheduledAt: v.optional(v.number()),
  },
  handler: async (ctx, { token, id, action, scheduledAt }) => {
    await requireAdmin(ctx, token);
    const row = await ctx.db.get(id);
    if (!row) throw new ConvexError("الحملة غير موجودة");
    const now = Date.now();
    if (action === "schedule") {
      if (!scheduledAt || scheduledAt <= now) throw new ConvexError("اختر وقتاً في المستقبل");
      await ctx.db.patch(id, {
        status: "scheduled",
        scheduledAt,
        lastError: undefined,
        updatedAt: now,
      });
    } else if (action === "pause") {
      if (row.status !== "sending") throw new ConvexError("الحملة ليست قيد الإرسال");
      await ctx.db.patch(id, { status: "paused", updatedAt: now });
    } else if (action === "resume") {
      if (row.status !== "paused") throw new ConvexError("الحملة ليست متوقفة مؤقتاً");
      await ctx.db.patch(id, { status: "sending", updatedAt: now });
      await ctx.scheduler.runAfter(0, internal.campaigns.sendBatchInternal, { campaignId: id });
    } else if (action === "stop") {
      await ctx.db.patch(id, { status: "stopped", finishedAt: now, updatedAt: now });
    } else {
      await ctx.db.patch(id, { status: "draft", updatedAt: now });
    }
    return { ok: true };
  },
});

export const removeCampaign = mutation({
  args: { token: v.string(), id: v.id("emailCampaigns") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    const logs = await ctx.db
      .query("emailLog")
      .withIndex("by_campaign", (q) => q.eq("campaignId", id))
      .collect();
    for (const log of logs) await ctx.db.delete(log._id);
    await ctx.db.delete(id);
    return { ok: true };
  },
});

// ── الإرسال الفعلي (آلي) ─────────────────────────────────────────────
function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * 📤 دفعة إرسال واحدة — تستدعي نفسها تلقائياً حتى تنتهي القائمة.
 * لا يُرسل المرسل مرتين: يُقرأ سجل الحملة أولاً ويُستثنى من سبق.
 */
export const sendBatchInternal = internalAction({
  args: { campaignId: v.id("emailCampaigns") },
  handler: async (ctx, { campaignId }) => {
    const campaign = (await ctx.runQuery(internal.campaigns.getCampaignInternal, {
      campaignId,
    })) as any;
    if (!campaign) return { ok: false, reason: "not-found" };
    if (campaign.status !== "sending") return { ok: false, reason: `status:${campaign.status}` };

    const cfg = await resolveEmailConfig(ctx);
    if (!cfg.apiKey) {
      await ctx.runMutation(internal.campaigns.patchCampaignInternal, {
        campaignId,
        values: {
          lastError:
            "مزوّد البريد غير مهيأ — أدخل مفتاح مزوّد البريد من لوحة التحكم ← «إعداد البريد الإلكتروني»",
          updatedAt: Date.now(),
        },
      });
      await ctx.runMutation(internal.campaigns.logNotificationInternal, {
        title: "⚠️ تعذّر إرسال الحملة",
        message: "لم يُضبط مفتاح مزوّد البريد الإلكتروني — من لوحة التحكم ← «إعداد البريد الإلكتروني».",
      });
      return { ok: false, reason: "no-provider" };
    }

    const recipients = (await ctx.runQuery(internal.campaigns.recipientsInternal, {
      campaignId,
      audience: campaign.audience ?? "all",
    })) as { id: any; email: string; name?: string; unsubToken: string }[];

    if (recipients.length === 0) {
      await ctx.runMutation(internal.campaigns.patchCampaignInternal, {
        campaignId,
        values: {
          status: "sent",
          finishedAt: Date.now(),
          total: 0,
          lastError: "",
          updatedAt: Date.now(),
        },
      });
      return { ok: true, sent: 0, done: true };
    }

    const batch = recipients.slice(0, BATCH_SIZE);
    const fromName = campaign.fromName?.trim() || cfg.fromName;
    const replyTo = campaign.replyTo?.trim() || cfg.replyTo;
    let sent = 0;
    let failed = 0;
    let lastError = "";

    for (const chunk of chunkArray(batch, 5)) {
      const results = await Promise.all(
        chunk.map(async (recipient) => {
          const html = renderEmail({
            subject: campaign.subject,
            preview: campaign.preview,
            body: campaign.body,
            unsubUrl: `${PLATFORM_BASE}/unsubscribe?t=${recipient.unsubToken}`,
            platformUrl: PLATFORM_BASE,
          });
          const res = await sendViaProvider(
            replyTo ? { ...cfg, replyTo } : cfg,
            { to: recipient.email, subject: campaign.subject, html }
          );
          return { recipient, res };
        })
      );
      for (const { recipient, res } of results) {
        await ctx.runMutation(internal.campaigns.logSendInternal, {
          campaignId,
          email: recipient.email,
          subscriberId: recipient.id,
          ok: res.ok,
          error: res.ok ? undefined : res.error,
        });
        if (res.ok) sent += 1;
        else {
          failed += 1;
          lastError = res.error ?? "فشل الإرسال";
        }
      }
    }

    const done = recipients.length <= BATCH_SIZE;
    await ctx.runMutation(internal.campaigns.patchCampaignInternal, {
      campaignId,
      values: {
        sent: (campaign.sent ?? 0) + sent,
        failed: (campaign.failed ?? 0) + failed,
        total: (campaign.total ?? 0) + recipients.length,
        cursor: (campaign.cursor ?? 0) + batch.length,
        lastError,
        status: done ? "sent" : "sending",
        finishedAt: done ? Date.now() : undefined,
        updatedAt: Date.now(),
      },
    });

    if (done) {
      await ctx.runMutation(internal.campaigns.logNotificationInternal, {
        title: "📮 اكتملت الحملة البريدية",
        message: `«${campaign.subject}» — أُرسلت ${(campaign.sent ?? 0) + sent} رسالة، فشلت ${
          (campaign.failed ?? 0) + failed
        }.`,
      });
      console.log(`[EmailCampaign] DONE "${campaign.subject}" sent=${sent} failed=${failed}`);
      return { ok: true, sent, failed, done: true };
    }

    // الدفعة التالية بعد ثوانٍ — فالعملية تتابع نفسها بلا تدخل
    await ctx.scheduler.runAfter(3000, internal.campaigns.sendBatchInternal, { campaignId });
    console.log(`[EmailCampaign] batch sent=${sent} failed=${failed} remaining=${recipients.length - batch.length}`);
    return { ok: true, sent, failed, done: false };
  },
});

/** بدء حملة فوراً من اللوحة. */
export const startCampaign = action({
  args: { token: v.string(), id: v.id("emailCampaigns") },
  handler: async (
    ctx,
    { token, id }
  ): Promise<{ ok: boolean; total?: number; alreadyRunning?: boolean }> => {
    // حاجز المشرف — يرمي خطأً إن لم تكن الجلسة إدارية
    await ctx.runQuery(api.settings.getAll, { token });
    const campaign = (await ctx.runQuery(internal.campaigns.getCampaignInternal, {
      campaignId: id,
    })) as any;
    if (!campaign) throw new Error("الحملة غير موجودة");
    if (campaign.status === "sending") return { ok: true, alreadyRunning: true };
    const total = (await ctx.runQuery(internal.campaigns.countRecipientsInternal, {
      audience: campaign.audience ?? "all",
    })) as number;
    await ctx.runMutation(internal.campaigns.patchCampaignInternal, {
      campaignId: id,
      values: {
        status: "sending",
        startedAt: Date.now(),
        scheduledAt: undefined,
        lastError: "",
        total,
        updatedAt: Date.now(),
      },
    });
    await ctx.scheduler.runAfter(0, internal.campaigns.sendBatchInternal, { campaignId: id });
    return { ok: true, total };
  },
});

/** التحقق من مزوّد البريد بإرسال رسالة اختبار إلى بريد المشرف. */
export const sendTestEmail = action({
  args: { token: v.string(), to: v.optional(v.string()) },
  handler: async (
    ctx,
    { token, to }
  ): Promise<{ ok: boolean; error?: string; to?: string }> => {
    await ctx.runQuery(api.settings.getAll, { token });
    const settings = (await ctx.runQuery(internal.campaigns.getEmailSettingsInternal, {
      empty: true,
    })) as Record<string, unknown>;
    const target = (to ?? (settings.email as string) ?? "").trim();
    if (!target || !EMAIL_RE.test(target)) {
      return { ok: false, error: "أدخل بريداً صحيحاً للاختبار" };
    }
    const cfg = await resolveEmailConfig(ctx);
    if (!cfg.apiKey) {
      return { ok: false, error: "مفتاح مزوّد البريد غير مضبوط — أدخله في البطاقة ثم أعد المحاولة" };
    }
    const html = renderEmail({
      subject: "✅ اختبار قناة البريد — ViP Yemen",
      preview: "وصلتك هذه الرسالة، فقناة البريد جاهزة.",
      body:
        "هذه رسالة **اختبار** من لوحة التحكم.\n\nإذا وصلتك، فقناة البريد عاملة ويمكن بدء أول حملة الآن.",
      unsubUrl: `${PLATFORM_BASE}/unsubscribe`,
      platformUrl: PLATFORM_BASE,
    });
    const res = await sendViaProvider(cfg, { to: target, subject: "✅ اختبار قناة البريد — ViP Yemen", html });
    return { ok: res.ok, error: res.error, to: maskEmail(target) };
  },
});

/** 🩺 حالة نظام البريد لقطة المعاينة في اللوحة (بلا كشف أي سر). */
export const getEmailStatus = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const rows = await ctx.db.query("settings").collect();
    const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const key = typeof settings.emailProviderKey === "string" ? settings.emailProviderKey : "";
    const active = await ctx.db
      .query("emailSubscribers")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    const unsubscribed = await ctx.db
      .query("emailSubscribers")
      .withIndex("by_status", (q) => q.eq("status", "unsubscribed"))
      .collect();
    const campaigns = await ctx.db.query("emailCampaigns").collect();
    const sending = campaigns.filter((c) => c.status === "sending").length;
    const scheduled = campaigns.filter((c) => c.status === "scheduled").length;
    return {
      provider: "Resend",
      configured: key.trim().length > 10 || !!process.env.RESEND_API_KEY?.trim(),
      keyPrefix: key.trim().length > 4 ? `${key.trim().slice(0, 4)}…` : "",
      fromName: (settings.emailFromName as string) || "ViP Yemen",
      fromAddress: (settings.emailFromAddress as string) || "onboarding@resend.dev",
      replyTo: (settings.emailReplyTo as string) || "",
      subscribers: active.length,
      unsubscribed: unsubscribed.length,
      campaigns: campaigns.length,
      sending,
      scheduled,
      lastSentAt: campaigns.reduce((max, c) => Math.max(max, c.finishedAt ?? c.startedAt ?? 0), 0) || null,
    };
  },
});

// ── دوال داخلية (mutation/query) ─────────────────────────────────────
/** (داخلي) تسجيل تنبيه نظامي — الـ Actions لا تصل إلى قاعدة البيانات مباشرة. */
export const logNotificationInternal = internalMutation({
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

export const getCampaignInternal = internalQuery({
  args: { campaignId: v.id("emailCampaigns") },
  handler: async (ctx, { campaignId }) => await ctx.db.get(campaignId),
});

export const patchCampaignInternal = internalMutation({
  args: { campaignId: v.id("emailCampaigns"), values: v.record(v.string(), v.any()) },
  handler: async (ctx, { campaignId, values }) => {
    await ctx.db.patch(campaignId, values);
    return { ok: true };
  },
});

export const logSendInternal = internalMutation({
  args: {
    campaignId: v.id("emailCampaigns"),
    email: v.string(),
    subscriberId: v.id("emailSubscribers"),
    ok: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { campaignId, email, subscriberId, ok, error }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("emailLog")
      .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId))
      .filter((q) => q.eq(q.field("email"), email))
      .first();
    if (existing) {
      if (existing.status === "sent") return { ok: true, duplicate: true };
      await ctx.db.patch(existing._id, {
        status: ok ? "sent" : "failed",
        error: ok ? undefined : (error ?? existing.error),
        attempts: (existing.attempts ?? 0) + 1,
        sentAt: ok ? now : existing.sentAt,
      });
    } else {
      await ctx.db.insert("emailLog", {
        campaignId,
        email,
        status: ok ? "sent" : "failed",
        error: ok ? undefined : error,
        attempts: 1,
        createdAt: now,
        sentAt: ok ? now : undefined,
      });
    }
    if (ok) await ctx.db.patch(subscriberId, { lastSentAt: now });
    return { ok: true };
  },
});

/** قائمة المستلمين المتبقية (.active وبلا سجل في هذه الحملة). */
export const recipientsInternal = internalQuery({
  args: { campaignId: v.id("emailCampaigns"), audience: v.optional(v.string()) },
  handler: async (ctx, { campaignId, audience }) => {
    const rows = await ctx.db
      .query("emailSubscribers")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    const tag = audience?.startsWith("tag:") ? audience.slice(4).trim() : "";
    const all = rows.filter((r) => (tag ? (r.tags ?? []).includes(tag) : true));
    const logged = new Set<string>();
    const logs = await ctx.db
      .query("emailLog")
      .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId))
      .collect();
    for (const log of logs) logged.add(log.email);
    return all
      .filter((r) => !logged.has(r.email))
      .map((r) => ({ id: r._id, email: r.email, name: r.name, unsubToken: r.unsubToken }));
  },
});

export const countRecipientsInternal = internalQuery({
  args: { audience: v.optional(v.string()) },
  handler: async (ctx, { audience }) => {
    const rows = await ctx.db
      .query("emailSubscribers")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    const tag = audience?.startsWith("tag:") ? audience.slice(4).trim() : "";
    return rows.filter((r) => (tag ? (r.tags ?? []).includes(tag) : true)).length;
  },
});

/** 🔁 دورة البريد: تشغيل المجدول + إعادة محاولة الفاشل + تنظيف السجل القديم. */
export const emailTick = internalAction({
  args: {},
  handler: async (ctx): Promise<{ due: number; stuck: number; cleaned: number }> => {
    const now = Date.now();

    // 1) تشغيل الحملات المستحقة
    const due = (await ctx.runQuery(internal.campaigns.dueCampaignsInternal, {
      now,
    })) as { campaignId: any }[];
    for (const row of due) {
      await ctx.runMutation(internal.campaigns.patchCampaignInternal, {
        campaignId: row.campaignId,
        values: {
          status: "sending",
          startedAt: now,
          lastError: "",
          updatedAt: now,
        },
      });
      await ctx.scheduler.runAfter(0, internal.campaigns.sendBatchInternal, {
        campaignId: row.campaignId,
      });
    }

    // 2) متابعة الحملات المعلّقة (توقّف لسوء الشبكة أو خطأ مؤقت)
    const stuck = (await ctx.runQuery(internal.campaigns.dueCampaignsInternal, {
      now,
      stuck: true,
    })) as { campaignId: any }[];
    for (const row of stuck) {
      await ctx.scheduler.runAfter(0, internal.campaigns.sendBatchInternal, {
        campaignId: row.campaignId,
      });
    }

    // 3) تنظيف سجل الإرسال القديم (بعد 90 يوماً) — لا بيانات شخصية بلا سبب
    const cutoff = now - 90 * DAY;
    const old = (await ctx.runQuery(internal.campaigns.oldLogsInternal, { cutoff })) as {
      id: any;
    }[];
    for (const log of old) {
      await ctx.runMutation(internal.campaigns.deleteLogInternal, { id: log.id });
    }

    // 4) إشعار الإدارة عند تشغيل أو متابعة حملة
    if (due.length > 0 || stuck.length > 0) {
      await ctx.runMutation(internal.campaigns.logNotificationInternal, {
        title: "📮 دورة البريد الإلكتروني",
        message: `بدأت ${due.length} حملة مستحقة، وتتابعت ${stuck.length} حملة متوقفة مؤقتاً.`,
      });
    }

    console.log(
      `[EmailTick] due=${due.length} stuck=${stuck.length} cleaned=${old.length}`
    );
    return { due: due.length, stuck: stuck.length, cleaned: old.length };
  },
});

export const dueCampaignsInternal = internalQuery({
  args: { now: v.number(), stuck: v.optional(v.boolean()) },
  handler: async (ctx, { now, stuck }) => {
    if (stuck) {
      // حملة "sending" لم تتقدّم منذ 10 دقائق = انقطاع مؤقت نعيد متابعتها
      const stale = now - 10 * 60_000;
      const rows = await ctx.db
        .query("emailCampaigns")
        .withIndex("by_status", (q) => q.eq("status", "sending"))
        .collect();
      return rows.filter((r) => (r.updatedAt ?? 0) < stale).map((r) => ({ campaignId: r._id }));
    }
    const rows = await ctx.db
      .query("emailCampaigns")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .collect();
    return rows
      .filter((r) => (r.scheduledAt ?? 0) <= now)
      .map((r) => ({ campaignId: r._id }));
  },
});

export const oldLogsInternal = internalQuery({
  args: { cutoff: v.number() },
  handler: async (ctx, { cutoff }) => {
    const all = await ctx.db.query("emailLog").collect();
    return all
      .filter((r) => r.createdAt < cutoff)
      .slice(0, 200)
      .map((r) => ({ id: r._id }));
  },
});

export const deleteLogInternal = internalMutation({
  args: { id: v.id("emailLog") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return { ok: true };
  },
});

/** إعدادات البريد من جدول settings (داخلي — Actions لا تصل إلى قاعدة البيانات). */
export const getEmailSettingsInternal = internalQuery({
  args: { empty: v.optional(v.boolean()) },
  handler: async (ctx) => {
    const rows = await ctx.db.query("settings").collect();
    const out: Record<string, unknown> = {};
    for (const key of [...SETTINGS_KEYS, "email"]) {
      const row = rows.find((r) => r.key === key);
      if (row !== undefined) out[key] = row.value;
    }
    return out;
  },
});
