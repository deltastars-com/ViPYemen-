/**
 * 🏷️ نصوص الحالة الحية والتنبيهات والعميل السابق (عربي/إنجليزي).
 *
 * تُستخدم في واجهة المنصة (بطاقات العروض والطلبات، شريط التنبيهات الحية،
 * ونافذة «عميل سابق») — مفصولة هنا لتُستخدم في أي مكوّن دون تكرار.
 */
export type LiveLang = "ar" | "en";

const TEXT: Record<string, { ar: string; en: string }> = {
  stateVacant: { ar: "شاغرة", en: "Vacant" },
  stateHired: { ar: "تم التوظيف", en: "Hired" },
  stateAvailable: { ar: "متاح", en: "Available" },
  stateSold: { ar: "تم البيع", en: "Sold" },
  stateActive: { ar: "إعلان نشط", en: "Active ad" },
  stateScheduled: { ar: "إعلان مجدول", en: "Scheduled ad" },

  liveNow: { ar: "مباشر", en: "Live" },
  liveNoticesTitle: {
    ar: "تنبيهات حية — قنوات المنصة والواجهة",
    en: "Live notices — platform channels & listings",
  },
  liveVacantJobs: { ar: "وظائف شاغرة", en: "Open jobs" },
  liveHiredJobs: { ar: "تم التوظيف", en: "Filled jobs" },
  liveAvailableItems: { ar: "معروضات متاحة", en: "Available listings" },
  liveSoldItems: { ar: "تم البيع", en: "Sold items" },
  liveChannelNote: {
    ar: "كل تحديث يظهر فوراً على واجهة المنصة وفي قنواتها الرسمية — والحالة تُحدَّث لحظياً.",
    en: "Every update appears instantly on the platform and its official channels — status updates live.",
  },

  returningTitle: { ar: "أنت عميل سابق في المنصة", en: "You are a returning client" },
  returningBody: {
    ar: "لديك طلبات سابقة محفوظة وملفاتها مؤرشفة في قناة المنصة. لا حاجة لإعادة كل شيء — يمكنك تنشيط طلبك السابق أو إضافة جديد غير ما أرسلت سابقاً.",
    en: "You have saved previous requests and their files are archived in the platform channel. No need to resend everything — reactivate a previous request or add something new.",
  },
  returningReactivate: { ar: "تنشيط الطلب السابق", en: "Reactivate previous request" },
  returningAddNew: { ar: "إضافة جديد", en: "Add something new" },
  returningReactivated: {
    ar: "تم تنشيط طلبك السابق — سيراجعه فريق المنصة وينشره فوراً دون إعادة إرسال أي شيء.",
    en: "Your previous request was reactivated — the team will review and publish it right away with nothing to resend.",
  },
  returningError: {
    ar: "تعذّر تنشيط الطلب — حاول مرة أخرى",
    en: "Could not reactivate the request — please try again",
  },
  returningArchived: { ar: "ملفات مؤرشفة في قناة المنصة", en: "Files archived in the platform channel" },
  returningCount: { ar: "عدد طلباتك السابقة", en: "Your previous requests" },
  returningLast: { ar: "آخر طلب سابق", en: "Last previous request" },
};

export function liveText(key: string, lang: LiveLang): string {
  return TEXT[key]?.[lang] ?? key;
}

/** وسم الحالة الحية لأي طلب أو إعلان على واجهة المنصة. */
export function liveStateLabel(category: string, status: string, lang: LiveLang): string {
  if (status === "sold") {
    return liveText(
      category === "real_estate" || category === "emarket" ? "stateSold" : "stateHired",
      lang
    );
  }
  return liveText(category === "jobs" ? "stateVacant" : "stateAvailable", lang);
}

/** أصناف Tailwind لوسم الحالة (تُكتب صراحة حتى لا تُحذف في البناء). */
export function liveStateClass(category: string, status: string): string {
  if (status === "sold") {
    return category === "real_estate" || category === "emarket"
      ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
      : "border-sky-500/40 bg-sky-500/10 text-sky-300";
  }
  return category === "jobs"
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
    : "border-gold-500/40 bg-gold-500/10 text-gold-300";
}

export function liveStateClassOfState(state: string): string {
  switch (state) {
    case "vacant":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "hired":
      return "border-sky-500/40 bg-sky-500/10 text-sky-300";
    case "available":
      return "border-gold-500/40 bg-gold-500/10 text-gold-300";
    case "sold":
      return "border-violet-500/40 bg-violet-500/10 text-violet-300";
    default:
      return "border-ink-600/60 bg-ink-800/60 text-ink-200";
  }
}
