/**
 * 📜 نص الالتزام الرسمي — ViP Yemen
 *
 * مصدر واحد لبناء نص الإقرار والالتزام الذي يقرّ به المستفيد (يُستخدم في
 * الواجهة، في صفحة التوقيع عن بُعد، وفي سند الـPDF، ويُجمَّد نصّه لحظة
 * التوقيع داخل الوثيقة كي يبقى إثباتاً لا يتغيّر بعدها).
 *
 * يقرأ كما يلي (مع التعبئة آلياً):
 *   «أنا {الاسم} أقرّ والتزم بأن عندي مبلغ {المبلغ} {العملة} المتفق معه،
 *    وذلك عمولة منصة ViPYemen ممثّلة بمديرها العام المهندس علي درهم الدحان،
 *    وذلك عمولة خدمة {نوع الخدمة} — {عنوان الاتفاق}.»
 */

/** مدير المنصة العام المذكور في نص الالتزام (ثابت). */
export const PLATFORM_MANAGER = "المهندس علي درهم الدحان";

/** أنواع الخدمات المعتمدة — تظهر في نص الالتزام وفي قائمة الاختيار. */
export const SERVICE_TYPES: { value: string; label: string }[] = [
  { value: "employment", label: "توظيف" },
  { value: "property_sale", label: "بيع عقار" },
  { value: "property_rent", label: "إيجار عقار" },
  { value: "product_sale", label: "بيع منتج" },
  { value: "software_service", label: "قيمة خدمة برمجية" },
  { value: "marketing", label: "تسويق" },
  { value: "other", label: "خدمة أخرى" },
];

export function serviceTypeLabel(value?: string): string {
  if (!value) return "خدمة أخرى";
  return SERVICE_TYPES.find((s) => s.value === value)?.label ?? "خدمة أخرى";
}

/** رمز/اسم العملة في نص الالتزام. */
function currencyName(currency: string): string {
  switch (currency) {
    case "USD":
      return "دولار أميركي";
    case "YER":
    case "yer":
      return "ريال يمني";
    case "SAR":
      return "ريال سعودي";
    case "EUR":
      return "يورو";
    default:
      return currency;
  }
}

function money(value: number, currency: string): string {
  const symbol = currency === "USD" ? "$" : "";
  return `${symbol}${value.toLocaleString("en-US")} ${currencyName(currency)}`;
}

export type CommitmentInput = {
  beneficiaryName: string;
  amount: number;
  commission: number;
  currency: string;
  /** نوع الخدمة (قيمة من SERVICE_TYPES) */
  serviceType?: string;
  /** عنوان الاتفاق / موضوع السند */
  title?: string;
};

/**
 * يبني نص الالتزام الكامل المعبّأ. النص ثابت الصياغة (_legal_ ) مع تعبئة
 * البيانات فقط — لا يُترك للمستخدم تعديله فيُخفَّف أثر التلاعب.
 */
export function buildCommitmentText(input: CommitmentInput): string {
  const name = input.beneficiaryName.trim() || "............";
  const amount = money(input.amount || 0, input.currency || "USD");
  const commission = money(input.commission || 0, input.currency || "USD");
  const service = serviceTypeLabel(input.serviceType);
  const subject = input.title?.trim();

  return [
    `أنا ${name} أقرّ والتزم بأن لديّ مبلغ ${amount} المتفق عليه،`,
    `وذلك عمولة منصة ViPYemen ممثّلة بمديرها العام ${PLATFORM_MANAGER}،`,
    `وذلك عن خدمة ${service}${subject ? ` — (${subject})` : ""}.`,
    ``,
    `وأتعهّد بتسديد مبلغ العمولة البالغ ${commission} ${currencyName(
      input.currency || "USD"
    )} للمنصة،`,    `وأقرّ بأن هذا الإقرار والتزام موثّق إلكترونياً بالتوقيع والبصمة` +
    ` ويساوي في حجّته ما قرأته يدوياً ووقّعته بيدّي.`,
  ].join("\n");
}
