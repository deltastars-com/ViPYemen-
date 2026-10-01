/**
 * 🧾 استخراج «سند الدفع» كملف PDF — ViP Yemen
 *
 * يفتح مستنداً عربياً (RTL) منسّقاً بمعاينة الطباعة ثم يستدعي طابعة
 * المتصفح ليختار المدير «حفظ كـ PDF» — موثوق على كل الأجهزة ولا يحتاج
 * مكتبات ثقيلة، والنتيجة ملف PDF عربي بحروف حقيقية قابلة للتحديد.
 */

export type PrintableContract = {
  receiptNo?: string;
  title: string;
  beneficiaryName: string;
  phone: string;
  amount: number;
  commission: number;
  currency: string;
  signature: string;
  signatureType?: string;
  fingerprint?: { mode: string; credentialId?: string; verified: boolean };
  status: string;
  signedAt?: number;
  paidAt?: number;
  createdAt: number;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة — بانتظار التوقيع",
  signed: "موقّعة إلكترونياً بالبصمة",
  paid: "مسدَّدة — سند دفع نهائي",
  void: "ملغاة",
};

const CURRENCY_LABELS: Record<string, string> = {
  USD: "دولار أميركي",
  YER: "ريال يمني",
  SAR: "ريال سعودي",
  EUR: "يورو",
};

function fmtDate(ms?: number): string {
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleString("ar-YE", { dateStyle: "full", timeStyle: "short" });
  } catch {
    return new Date(ms).toISOString();
  }
}

function money(value: number, currency: string): string {
  const symbol = currency === "USD" ? "$" : "";
  return `${symbol}${value.toLocaleString("en-US")} ${CURRENCY_LABELS[currency] ?? currency}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** يفتح سند الدفع في نافذة طباعة جاهزة للحفظ كملف PDF. */
export function printContractPdf(contract: PrintableContract): void {
  const win = window.open("", "_blank", "width=820,height=980");
  if (!win) {
    alert("تعذّر فتح نافذة الطباعة — اسمح بالنوافذ المنبثقة ثم أعد المحاولة.");
    return;
  }
  const isPaid = contract.status === "paid";
  const fpMode =
    contract.fingerprint?.mode === "webauthn"
      ? "بصمة إلكترونية موثّقة (WebAuthn)"
      : contract.fingerprint
        ? "تأكيد إلكتروني مسجَّل (مسار بديل)"
        : "—";

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>سند دفع ${escapeHtml(contract.receiptNo ?? "")} — ViP Yemen</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #101528; margin: 0; background: #fff; }
  .sheet { max-width: 760px; margin: 0 auto; padding: 28px; border: 2px solid #c9a227; border-radius: 14px; }
  header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0b1b33; padding-bottom: 14px; }
  .brand { font-size: 22px; font-weight: 900; color: #0b1b33; }
  .brand span { color: #b98a12; }
  .no { text-align: left; font-size: 13px; color: #444; }
  .no b { display: block; font-size: 17px; color: #0b1b33; letter-spacing: 1px; }
  h1 { text-align: center; font-size: 20px; margin: 18px 0 4px; color: #0b1b33; }
  .sub { text-align: center; font-size: 12px; color: #6b7280; margin-bottom: 16px; }
  .pill { display: inline-block; padding: 4px 14px; border-radius: 999px; font-size: 12px; font-weight: 800;
          background: ${isPaid ? "#065f46" : "#713f12"}; color: #fff; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
  th, td { border: 1px solid #d7dce5; padding: 9px 12px; text-align: right; }
  th { background: #f4f6fb; color: #0b1b33; width: 34%; font-weight: 800; }
  .clause { margin-top: 16px; font-size: 13px; line-height: 1.9; background: #fbf8ef; border: 1px dashed #c9a227;
            border-radius: 10px; padding: 12px 14px; }
  .sign { display: flex; gap: 18px; margin-top: 20px; align-items: flex-start; }
  .box { flex: 1; border: 1px solid #d7dce5; border-radius: 10px; padding: 10px; min-height: 110px; }
  .box h4 { margin: 0 0 6px; font-size: 12px; color: #6b7280; }
  .box img { max-width: 100%; max-height: 90px; }
  .stamp { text-align: center; border: 2px solid #059669; color: #059669; border-radius: 10px; padding: 10px;
           font-weight: 900; font-size: 13px; width: 210px; }
  footer { margin-top: 18px; border-top: 1px solid #d7dce5; padding-top: 10px; font-size: 11px; color: #6b7280;
           display: flex; justify-content: space-between; }
  @media print { .noprint { display: none !important; } .sheet { border: none; padding: 0; } }
  .noprint { text-align: center; margin: 16px 0; }
  .noprint button { background: #0b1b33; color: #fff; border: 0; border-radius: 10px; padding: 12px 28px;
                    font-size: 15px; font-weight: 800; cursor: pointer; }
</style>
</head>
<body>
<div class="sheet">
  <header>
    <div class="brand">ViP <span>Yemen</span> — منصة التوظيف والتسويق والعقار والبرمجيات</div>
    <div class="no">رقم السند<br><b>${escapeHtml(contract.receiptNo ?? "—")}</b></div>
  </header>
  <h1>${isPaid ? "سند دفع" : "وثيقة توثيق إلكتروني"} ببصمة إلكترونية</h1>
  <div class="sub"><span class="pill">${STATUS_LABELS[contract.status] ?? contract.status}</span></div>

  <table>
    <tr><th>المستفيد الكامل</th><td>${escapeHtml(contract.beneficiaryName)}</td></tr>
    <tr><th>رقم الهاتف</th><td dir="ltr">${escapeHtml(contract.phone)}</td></tr>
    <tr><th>موضوع الاتفاق</th><td>${escapeHtml(contract.title)}</td></tr>
    <tr><th>المبلغ المتفق عليه</th><td><b>${money(contract.amount, contract.currency)}</b></td></tr>
    <tr><th>عمولة المنصة</th><td><b>${money(contract.commission, contract.currency)}</b></td></tr>
    <tr><th>تاريخ التوقيع</th><td>${fmtDate(contract.signedAt)}</td></tr>
    <tr><th>${isPaid ? "تاريخ التسديد" : "حالة السند"}</th><td>${isPaid ? fmtDate(contract.paidAt) : "بانتظار التسديد"}</td></tr>
  </table>

  <div class="clause">
    يُقرّ ويتعهّد المستفيد أعلاه إقراراً نهائياً موثّقاً بالبصمة الإلكترونية والتوقيع الإلكتروني
    بالتزامه بتسديد المبلغ المتفق عليه أعلاه كعمولة للمنصة، ويُعدّ هذا السند وثيقة إثبات حق
    في مواجهة الطرفين والمنصة، موقّعة إلكترونياً عبر أنظمة المنصة الموثّقة.
  </div>

  <div class="sign">
    <div class="box">
      <h4>التوقيع الإلكتروني</h4>
      ${contract.signature ? `<img src="${contract.signature}" alt="توقيع" />` : "—"}
      <div style="font-size:11px;color:#6b7280;margin-top:6px">
        ${contract.signatureType === "drawn" ? "مُرسَم على اللوحة" : "مكتوب إلكترونياً"}
      </div>
    </div>
    <div class="box" style="display:flex;flex-direction:column;justify-content:space-between">
      <h4>البصمة الإلكترونية</h4>
      <div style="font-size:13px;font-weight:800">${fpMode}</div>
      ${contract.fingerprint?.credentialId ? `<div dir="ltr" style="font-size:10px;color:#6b7280;word-break:break-all">${escapeHtml(contract.fingerprint.credentialId.slice(0, 48))}…</div>` : ""}
      <div class="stamp">✔ موثّق بواسطة<br />منصة ViP Yemen</div>
    </div>
  </div>

  <footer>
    <span>vi-p-yemen.vercel.app · وثيقة مُولّدة آلياً من نظام التوثيق الإلكتروني</span>
    <span>أُنشئ: ${fmtDate(Date.now())}</span>
  </footer>
</div>
<div class="noprint"><button onclick="window.print()">🖨️ حفظ / طباعة سند الدفع (PDF)</button></div>
<script>window.onload = function () { setTimeout(function () { window.focus(); }, 300); };</script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}
