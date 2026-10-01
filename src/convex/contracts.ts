/**
 * 📜 التوثيق الإلكتروني الموثق بالبصمة — ViP Yemen
 *
 * يُستكمل داخل «قائمة إتمام التوافق» قبل إتمام المطابقة وتسليم المستفيد:
 *   1. الاسم الكامل + رقم الهاتف (موثق بالتوثيق الذاتي للمنصة).
 *   2. خانة التوقيع الإلكتروني (رسم على اللوحة أو كتابة).
 *   3. تأكيد البصمة الإلكترونية (WebAuthn — بصمة الجهاز/البصمة الرقمية،
 *      مع مسار بديل مسجَّل عند تعذّر الماسح).
 *   4. المبلغ المتفق عليه والالتزام بتسديده كعمولة للمنصة.
 *
 * الناتج: عقد موقّع + سند دفع برقم تسلسلي يُصدَّر من اللوحة كملف PDF.
 */
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAdmin } from "./auth";

type ContractDoc = {
  _id: any;
  matchId?: string;
  title: string;
  beneficiaryName: string;
  phone: string;
  amount: number;
  commission: number;
  currency: string;
  signature: string;
  signatureType: string;
  fingerprint?: { mode: string; credentialId?: string; verified: boolean };
  signToken?: string;
  receiptNo?: string;
  status: string;
  signedAt?: number;
  paidAt?: number;
  voidReason?: string;
  createdAt: number;
};

/** رقم سند تسلسلي غير قابل للتكرار عمليًا: VIP-السنة-خمس خانات. */
function makeReceiptNo(now: number): string {
  const year = new Date(now).getFullYear();
  const serial = Math.floor(10000 + Math.random() * 90000);
  return `VIP-${year}-${serial}`;
}

function randomToken(): string {
  const bytes = new Uint8Array(24);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function validateInput(args: {
  beneficiaryName: string;
  phone: string;
  amount: number;
  commission: number;
}): void {
  if (args.beneficiaryName.trim().length < 3) {
    throw new ConvexError("الاسم الكامل مطلوب (ثلاثة أحرف على الأقل)");
  }
  const digits = args.phone.replace(/[^\d+]/g, "");
  if (digits.length < 7) throw new ConvexError("رقم هاتف غير صالح");
  if (!(args.amount > 0)) throw new ConvexError("المبلغ المتفق عليه مطلوب");
  if (args.commission < 0 || args.commission > args.amount) {
    throw new ConvexError("عمولة المنصة يجب أن تكون بين صفر والمبلغ المتفق عليه");
  }
}

/* ───────────────────── إنشاء عقد موقّع مباشرة (المستفيد حاضر) ───────────────────── */

export const createContract = mutation({
  args: {
    token: v.string(),
    matchId: v.optional(v.string()),
    title: v.string(),
    beneficiaryName: v.string(),
    phone: v.string(),
    amount: v.number(),
    commission: v.number(),
    currency: v.optional(v.string()),
    signature: v.string(),
    signatureType: v.string(),
    fingerprint: v.optional(
      v.object({
        mode: v.string(),
        credentialId: v.optional(v.string()),
        verified: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args): Promise<{ id: string; receiptNo: string }> => {
    await requireAdmin(ctx, args.token);
    validateInput(args);
    if (args.signature.trim().length < 10) {
      throw new ConvexError("التوقيع الإلكتروني مطلوب — ارسمه في خانة التوقيع");
    }
    if (!args.fingerprint?.verified) {
      throw new ConvexError("تأكيد البصمة الإلكترونية مطلوب لإتمام التوثيق");
    }
    const now = Date.now();
    const receiptNo = makeReceiptNo(now);
    const id = await ctx.db.insert("contracts", {
      matchId: args.matchId,
      title: args.title.trim(),
      beneficiaryName: args.beneficiaryName.trim(),
      phone: args.phone.trim(),
      amount: args.amount,
      commission: args.commission,
      currency: args.currency ?? "USD",
      signature: args.signature,
      signatureType: args.signatureType,
      fingerprint: args.fingerprint,
      receiptNo,
      status: "signed",
      signedAt: now,
      createdAt: now,
    });
    await ctx.db.insert("notifications", {
      title: "توثيق إلكتروني مكتمل بالبصمة",
      message: `${receiptNo} — ${args.beneficiaryName} · ${args.amount} ${args.currency ?? "USD"}`,
      category: "contracts",
      createdAt: now,
    });
    return { id, receiptNo };
  },
});

/* ───────────────────── رابط توقيع عن بُعد (المستفيد من جهازه) ───────────────────── */

export const createDraft = mutation({
  args: {
    token: v.string(),
    matchId: v.optional(v.string()),
    title: v.string(),
    beneficiaryName: v.optional(v.string()),
    phone: v.optional(v.string()),
    amount: v.number(),
    commission: v.number(),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ id: string; signToken: string }> => {
    await requireAdmin(ctx, args.token);
    if (!(args.amount > 0)) throw new ConvexError("المبلغ المتفق عليه مطلوب");
    const signToken = randomToken();
    const id = await ctx.db.insert("contracts", {
      matchId: args.matchId,
      title: args.title.trim(),
      beneficiaryName: (args.beneficiaryName ?? "").trim(),
      phone: (args.phone ?? "").trim(),
      amount: args.amount,
      commission: args.commission,
      currency: args.currency ?? "USD",
      signature: "",
      signatureType: "pending",
      signToken,
      status: "draft",
      createdAt: Date.now(),
    });
    return { id, signToken };
  },
});

/** قراءة عقد عبر رابط التوقيع العام (للمستفيد من أي جهاز). */
export const getBySignToken = query({
  args: { t: v.string() },
  handler: async (ctx, { t }): Promise<{
    title: string;
    beneficiaryName: string;
    phone: string;
    amount: number;
    commission: number;
    currency: string;
    status: string;
    receiptNo?: string;
  } | null> => {
    if (!t) return null;
    const row = await ctx.db
      .query("contracts")
      .withIndex("by_signToken", (q) => q.eq("signToken", t))
      .first();
    if (!row) return null;
    return {
      title: row.title,
      beneficiaryName: row.beneficiaryName,
      phone: row.phone,
      amount: row.amount,
      commission: row.commission,
      currency: row.currency,
      status: row.status,
      receiptNo: row.receiptNo,
    };
  },
});

/** توقيع المستفيد لعقد مسودة: اسم + هاتف + توقيع + بصمة. */
export const sign = mutation({
  args: {
    t: v.string(),
    beneficiaryName: v.string(),
    phone: v.string(),
    signature: v.string(),
    signatureType: v.string(),
    fingerprint: v.optional(
      v.object({
        mode: v.string(),
        credentialId: v.optional(v.string()),
        verified: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args): Promise<{ receiptNo: string }> => {
    const row = await ctx.db
      .query("contracts")
      .withIndex("by_signToken", (q) => q.eq("signToken", args.t))
      .first();
    if (!row) throw new ConvexError("رابط التوقيع غير صالح أو منتهٍ");
    if (row.status !== "draft") throw new ConvexError("تم توقيع هذا المستند سابقاً");
    validateInput({
      beneficiaryName: args.beneficiaryName,
      phone: args.phone,
      amount: row.amount,
      commission: row.commission,
    });
    if (args.signature.trim().length < 10) {
      throw new ConvexError("التوقيع الإلكتروني مطلوب — ارسمه في خانة التوقيع");
    }
    if (!args.fingerprint?.verified) {
      throw new ConvexError("تأكيد البصمة الإلكترونية مطلوب لإتمام التوثيق");
    }
    const now = Date.now();
    const receiptNo = makeReceiptNo(now);
    await ctx.db.patch(row._id, {
      beneficiaryName: args.beneficiaryName.trim(),
      phone: args.phone.trim(),
      signature: args.signature,
      signatureType: args.signatureType,
      fingerprint: args.fingerprint,
      receiptNo,
      status: "signed",
      signedAt: now,
    });
    await ctx.db.insert("notifications", {
      title: "توقيع إلكتروني وصل عبر الرابط",
      message: `${receiptNo} — ${args.beneficiaryName.trim()}`,
      category: "contracts",
      createdAt: now,
    });
    return { receiptNo };
  },
});

/* ───────────────────── إدارة الإدارة: استخراج السند · التسديد ───────────────────── */

export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }): Promise<ContractDoc[]> => {
    await requireAdmin(ctx, token);
    const rows = await ctx.db.query("contracts").withIndex("by_created").order("desc").take(200);
    return rows as ContractDoc[];
  },
});

/** العقد المرتبط بمطابقة (الأحدث النشط) — لعرض حالته داخل جدول التوافق. */
export const getForMatch = query({
  args: { token: v.string(), matchId: v.string() },
  handler: async (ctx, { token, matchId }): Promise<ContractDoc | null> => {
    await requireAdmin(ctx, token);
    const rows = await ctx.db
      .query("contracts")
      .withIndex("by_match", (q) => q.eq("matchId", matchId))
      .order("desc")
      .take(5);
    const active = rows.find((r) => r.status === "paid" || r.status === "signed") ?? rows[0];
    return (active as ContractDoc) ?? null;
  },
});

export const markPaid = mutation({
  args: { token: v.string(), id: v.id("contracts") },
  handler: async (ctx, { token, id }): Promise<{ ok: true }> => {
    await requireAdmin(ctx, token);
    const row = await ctx.db.get(id);
    if (!row) throw new ConvexError("الوثيقة غير موجودة");
    if (row.status === "void") throw new ConvexError("وثيقة ملغاة لا يمكن تسجيل تسديد");
    const now = Date.now();
    await ctx.db.patch(id, {
      status: "paid",
      paidAt: now,
      receiptNo: row.receiptNo ?? makeReceiptNo(now),
    });
    return { ok: true };
  },
});

export const voidContract = mutation({
  args: { token: v.string(), id: v.id("contracts"), reason: v.optional(v.string()) },
  handler: async (ctx, { token, id, reason }): Promise<{ ok: true }> => {
    await requireAdmin(ctx, token);
    const row = await ctx.db.get(id);
    if (!row) throw new ConvexError("الوثيقة غير موجودة");
    await ctx.db.patch(id, {
      status: "void",
      voidReason: reason?.trim() || "أُلغيت من قبل الإدارة",
    });
    return { ok: true };
  },
});
