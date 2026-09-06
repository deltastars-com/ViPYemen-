import { ShieldCheck, FileText, Lock, Database, Eye, Mail, Trash2 } from "lucide-react";

const SECTIONS = [
  {
    icon: Database,
    title: "1. البيانات التي نجمعها",
    body: "نجمع فقط البيانات التي تقدمها طوعاً عند التسجيل: الاسم الكامل، رقم الهاتف، العنوان، بيانات الطلب (الوظيفة، العقار، المنتج، المشروع البرمجي)، والمرفقات التي ترفعها (صور المؤهلات، السيرة الذاتية، صور المنتج أو العقار). لا نجمع أي بيانات من جهازك دون علمك.",
  },
  {
    icon: Eye,
    title: "2. كيفية استخدام البيانات",
    body: "تُستخدم بياناتك حصرياً لأغراض المنصة: مراجعة الطلبات والتدقيق عليها في لوحة التحكم، التواصل معك لضمان الجودة، ونشر الطلبات المعتمدة على واجهة المنصة. البيانات الخاصة (كالمؤهلات والسير الذاتية) لا تظهر للجمهور إلا ما يُعتمد نشره صراحة.",
  },
  {
    icon: Lock,
    title: "3. حماية البيانات",
    body: "نستخدم تشفيراً متقدماً (PBKDF2) لكلمات المرور، وجلسات آمنة محدودة الصلاحية، وتخزيناً سحابياً محمياً. لوحة التحكم محمية وتفتح فقط ببريد الإدارة وكلمة المرور، مع إمكانية تغيير كلمة المرور عند أول دخول.",
  },
  {
    icon: ShieldCheck,
    title: "4. مشاركة البيانات",
    body: "لا نبيع ولا نشارك بياناتك مع أي طرف ثالث لأغراض تسويقية. تظهر بيانات الاتصال العامة (كالهاتف في إعلانات البيع) فقط على المنشورات المعتمدة التي تتطلب ذلك. التواصل يتم عبر واتساب المنصة الرسمي 00967711780999.",
  },
  {
    icon: Mail,
    title: "5. التواصل",
    body: "لأي استفسار حول بياناتك: vipservicesyemen@gmail.com أو واتساب 00967711780999 — فريقنا يرد خلال 24 ساعة.",
  },
  {
    icon: Trash2,
    title: "6. حقوقك",
    body: "لديك الحق في طلب تصحيح أو حذف بياناتك في أي وقت. عند حذف طلبك تُزال بياناتك ومرفقاتك من قاعدة بيانات المنصة نهائياً.",
  },
];

export function PrivacyPolicyPage() {
  return (
    <div className="animate-fade-up">
      <section className="border-b border-ink-700/50 py-12 text-center">
        <span className="chip mx-auto !border-gold-500/40 !bg-gold-500/10 !text-gold-300">
          <FileText className="h-3.5 w-3.5" />
          سياسة الخصوصية
        </span>
        <h1 className="section-title mt-4 text-cream">
          سياسة <span className="gold-text">الخصوصية</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-ink-300">
          آخر تحديث: 2026 — منصة ViP Yemen تلتزم بحماية بياناتك وخصوصيتك.
        </p>
      </section>

      <section className="container-app max-w-3xl py-12">
        <div className="space-y-5">
          {SECTIONS.map((s) => (
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

        <div className="mt-10 rounded-2xl border border-gold-500/25 bg-gold-500/5 p-6 text-center">
          <p className="text-sm leading-relaxed text-ink-200">
            يُعتمد هذا النص كسياسة خصوصية رسمية للمنصة وللتطبيقات المنشورة في
            متاجر Google Play وApp Store. يتوفر نسخة بصيغة PDF/Markdown في ملفات
            المشروع (PRIVACY-POLICY.md).
          </p>
        </div>
      </section>
    </div>
  );
}