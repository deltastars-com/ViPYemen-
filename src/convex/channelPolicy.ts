// 📴 سياسة القنوات: أي القنوات متوقفة افتراضياً، ولماذا. (وحدة نقية — يستوردها
// ناشر القنوات وسجلّ القنوات معاً حتى لا تختلف القواعد في مكانين).

/**
 * فيسبوك هو القناة الوحيدة المتوقفة افتراضياً: توكنه المخزَّن قد يكون قديماً
 * أو بلا صلاحية نشر، فلا داعي لمحاولة فاشلة كل خمس دقائق. وتعود القناتان
 * للعمل تلقائياً فور ربط توكن صالح يمنح صلاحية النشر (pages_manage_posts).
 */
export const DEFAULT_PAUSED_CHANNELS: readonly string[] = [
  "facebook_page",
  "facebook_group",
  "whatsapp_group",
];

export const DEFAULT_PAUSE_REASON: Record<string, string> = {
  facebook_page:
    "متوقفة — بانتظار ربط توكن فيسبوك الجديد الذي يمنح صلاحية النشر (pages_manage_posts). باقي القنوات تعمل طبيعياً.",
  facebook_group:
    "متوقفة — النشر على المجموعات عبر API موقوف من Meta. الصفحة وبقية القنوات تنشر طبيعياً.",
  whatsapp_group:
    "متوقفة — بانتظار ضبط WHATSAPP_GROUP_ID (معرّف المجتمع/المجموعة) و بوابة OpenWA، ثم فعّلها من لوحة التحكم.",
};

/** هل هذه القناة متوقفة؟ (الافتراضي من السياسة، وقرار صريح يتجاوزه) */
export function isPausedByDefault(channel: string): boolean {
  return DEFAULT_PAUSED_CHANNELS.includes(channel);
}

export function pauseReasonFor(channel: string): string {
  return DEFAULT_PAUSE_REASON[channel] ?? "متوقفة من لوحة التحكم";
}
