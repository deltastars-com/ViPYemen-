import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin, normalizePhone, isValidYemeniPhone } from "./auth";

/**
 * 💳 سندات الدفع — بنك الكريمي / محفظة جوالي / محفظة جيب
 * Payment receipt archive. Public: submit + attach proof image.
 * Admin: list, review (confirm/reject), settle (auto income in finance ledger), delete.
 */

export const PAYMENT_METHODS = ["kuraimi", "jawali", "jaib"] as const;

export const submitPayment = mutation({
  args: {
    method: v.string(),
    amount: v.number(),
    currency: v.string(),
    payerName: v.string(),
    payerPhone: v.string(),
    reference: v.string(),
    purpose: v.optional(v.string()),
    notes: v.optional(v.string()),
    proofStorageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!PAYMENT_METHODS.includes(args.method as any)) {
      throw new ConvexError("طريقة الدفع غير معروفة");
    }
    if (args.amount <= 0) throw new ConvexError("أدخل مبلغاً صحيحاً");
    if (args.payerName.trim().length < 2) throw new ConvexError("أدخل اسم المُرسل");
    const phone = normalizePhone(args.payerPhone);
    if (!isValidYemeniPhone(args.payerPhone)) throw new ConvexError("رقم الهاتف اليمني غير صحيح");
    if (args.reference.trim().length < 3) throw new ConvexError("أدخل رقم السند / المرجع");

    const now = Date.now();
    const id = await ctx.db.insert("payments", {
      method: args.method,
      amount: args.amount,
      currency: args.currency || "YER",
      payerName: args.payerName.trim(),
      payerPhone: phone,
      reference: args.reference.trim(),
      purpose: args.purpose?.trim() || undefined,
      notes: args.notes?.trim() || undefined,
      proofStorageId: args.proofStorageId || undefined,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Admin notification for instant review
    await ctx.db.insert("notifications", {
      title: "💳 سند دفع جديد بانتظار التدقيق",
      message: `${args.payerName.trim()} — ${args.amount.toLocaleString("en-US")} ${args.currency} عبر ${
        args.method === "kuraimi" ? "بنك الكريمي" : args.method === "jawali" ? "محفظة جوالي" : "محفظة جيب"
      } (مرجع: ${args.reference.trim()})`,
      category: "payments",
      createdAt: now,
    });

    return { ok: true as const, id };
  },
});

export const listPayments = query({
  args: { token: v.string(), status: v.optional(v.string()) },
  handler: async (ctx, { token, status }) => {
    await requireAdmin(ctx, token);
    const rows = status
      ? await ctx.db
          .query("payments")
          .withIndex("by_status", (q) => q.eq("status", status))
          .collect()
      : await ctx.db.query("payments").withIndex("by_created").order("desc").collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const reviewPayment = mutation({
  args: { token: v.string(), id: v.id("payments"), status: v.string(), adminNote: v.optional(v.string()) },
  handler: async (ctx, { token, id, status, adminNote }) => {
    await requireAdmin(ctx, token);
    const doc = await ctx.db.get(id);
    if (!doc) throw new ConvexError("السند غير موجود");
    if (!["confirmed", "rejected"].includes(status)) throw new ConvexError("حالة غير صالحة");
    await ctx.db.patch(id, {
      status,
      adminNote: adminNote?.trim() || doc.adminNote,
      reviewedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { ok: true as const };
  },
});

/** Settle: archive as income and auto-record into the finance ledger. */
export const settlePayment = mutation({
  args: { token: v.string(), id: v.id("payments") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    const doc = await ctx.db.get(id);
    if (!doc) throw new ConvexError("السند غير موجود");
    if (doc.status === "settled") return { ok: true as const };
    if (doc.status === "rejected") throw new ConvexError("لا يمكن تسوية سند مرفوض");

    const now = Date.now();
    const financeId = await ctx.db.insert("finance", {
      type: "income",
      amount: doc.amount,
      description: `دفع معتمد — ${doc.payerName} (${doc.reference}) عبر ${
        doc.method === "kuraimi" ? "بنك الكريمي" : doc.method === "jawali" ? "محفظة جوالي" : "محفظة جيب"
      }`,
      category: "payments",
      createdAt: now,
    });
    await ctx.db.patch(id, {
      status: "settled",
      settledAt: now,
      financeId,
      updatedAt: now,
    });
    return { ok: true as const };
  },
});

export const deletePayment = mutation({
  args: { token: v.string(), id: v.id("payments") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    await ctx.db.delete(id);
    return { ok: true as const };
  },
});

/** Public lookup: a payer can track their own receipts by phone number. */
export const myPayments = query({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const normalized = normalizePhone(phone);
    if (!normalized) return [];
    const rows = await ctx.db
      .query("payments")
      .withIndex("by_payer_phone", (q) => q.eq("payerPhone", normalized))
      .collect();
    // Only minimal public fields — no admin notes.
    return rows
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((p) => ({
        _id: p._id,
        method: p.method,
        amount: p.amount,
        currency: p.currency,
        reference: p.reference,
        status: p.status,
        createdAt: p.createdAt,
      }));
  },
});
