import { Trash2, Mail, MessageCircle, ShieldCheck, Clock, FileText, ListChecks } from "lucide-react";

/**
 * 🗑️ صفحة «حذف البيانات» — رابط إلزامي لمنصات التطبيقات:
 *   • Meta تشترطه لإكمال «تجديد صلاحية الوصول إلى البيانات» (Data Access Renewal)
 *     في لوحة المطوّرين (حقل: Data Deletion Instructions URL).
 *   • Google Play تشترطه ضمن سياسة البيانات عند وجود حسابات.
 *
 * الرابط الثابت: https://vi-p-yemen.vercel.app/data-deletion
 */
export function DataDeletionPage() {
  const STEPS = [
    {
      icon: MessageCircle,
      title: "١) أرسل طلب الحذف",
      body:
        "من واتساب المنصة 00967711780999 أو من البريد info@vipyemen.com، واذكر «طلب حذف بيانات» مع رقم هاتفك أو بريد حسابك في المنصة. وإن سجّلت الدخول عبر فيسبوك، أرسل الطلب من نفس الحساب كي نتحقق منه.",
    },
    {
      icon: ListChecks,
      title: "٢) ما الذي يُحذف",
      body:
        "حسابك وبياناته (الاسم · الهاتف · البريد · الصورة) · طلباتك وعروضك وملفاتها المرفوعة · سجل رسائلك مع تقديم الخدمة · معرّفك لدى فيسبوك إن ربطته · بيانات الجلسات والأجهزة. تُحذف الصور والملفات من التخزين السحابي كذلك، ولا نُبقي نسخاً بعد الحذف.",
    },
    {
      icon: Clock,
      title: "٣) المدة",
      body:
        "نُنفّذ الحذف خلال ٣٠ يوماً كحد أقصى من التحقق من الطلب، ونرسل لك تأكيداً بالتنفيذ. وبعض السجلات المالية المرتبطة بوثيقة سند دفع يفرض القانون الاحتفاظ بها مدة أقصاها سنتان ثم تُحذف، وتُحفظ مجرّدة من أي بيانات اتصال.",
    },
    {
      icon: ShieldCheck,
      title: "٤) لا حاجة لتطبيق أو حساب لإتمام الحذف",
      body:
        "يمكنك طلب الحذف بلا فتح التطبيق: أرسل رسالة من الرقم المسجّل نفسه إلى واتساب المنصة أو إلى البريد، وسنعالج الطلب ونؤكده لك كتابةً. وإن حذفت حسابك من داخل المنصة، يُحذف فوراً مع بياناته.",
    },
  ];

  const META_NOTE =
    "إذا طلبت حذف بياناتك المرتبطة بتسجيل الدخول عبر فيسبوك، أرسل لنا رمز الحذف (Confirmation Code) في الرسالة نفسها، وسنؤكد لك اكتمال الحذف برمز حالة (Status URL) عبر البريد — كما تشترط Meta في سياسة حذف البيانات.";

  return (
    <div className="animate-fade-up">
      <section className="border-b border-ink-700/50 py-12 text-center">
        <span className="chip mx-auto !border-gold-500/40 !bg-gold-500/10 !text-gold-300">
          <Trash2 className="h-3.5 w-3.5" />
          حذف البيانات
        </span>
        <h1 className="section-title mt-4 text-cream">
          سياسة وطريقة <span className="gold-text">حذف البيانات</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-ink-300">
          حقّك محفوظ: تحذف بياناتك متى شئت، بطلب واحد ومن أي جهاز.
        </p>
      </section>

      <section className="container-app max-w-3xl py-12">
        <div className="space-y-5">
          {STEPS.map((s) => (
            <div key={s.title} className="card-surface p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-300">
                  <s.icon className="h-5 w-5" />
                </div>
                <h2 className="text-base font-extrabold text-cream">{s.title}</h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-300">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <a
            href="https://wa.me/967711780999"
            target="_blank"
            rel="noreferrer"
            className="card-surface flex items-center gap-3 p-4 text-sm font-bold text-cream transition-colors hover:border-gold-500/40"
          >
            <MessageCircle className="h-5 w-5 text-emerald-300" />
            واتساب المنصة: 00967711780999
          </a>
          <a
            href="mailto:info@vipyemen.com?subject=%D8%B7%D9%84%D8%A8%20%D8%AD%D8%B0%D9%81%20%D8%A8%D9%8A%D8%A7%D9%86%D8%A7%D8%AA"
            className="card-surface flex items-center gap-3 p-4 text-sm font-bold text-cream transition-colors hover:border-gold-500/40"
          >
            <Mail className="h-5 w-5 text-gold-300" />
            info@vipyemen.com
          </a>
        </div>

        <div className="mt-6 rounded-2xl border border-gold-500/25 bg-gold-500/5 p-6">
          <p className="flex items-start gap-2 text-sm leading-relaxed text-ink-200">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
            {META_NOTE}
          </p>
        </div>
      </section>
    </div>
  );
}
