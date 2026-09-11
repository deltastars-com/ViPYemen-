import { FileText, Scale, ShieldCheck, AlertTriangle, Lightbulb, Copyright, RefreshCw, Mail } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function TermsPage() {
  const { t } = useLang();
  const SECTIONS = [
    { icon: ShieldCheck, title: t("terms1Title"), body: t("terms1Body") },
    { icon: Scale, title: t("terms2Title"), body: t("terms2Body") },
    { icon: AlertTriangle, title: t("terms3Title"), body: t("terms3Body") },
    { icon: FileText, title: t("terms4Title"), body: t("terms4Body") },
    { icon: Copyright, title: t("terms5Title"), body: t("terms5Body") },
    { icon: Lightbulb, title: t("terms6Title"), body: t("terms6Body") },
    { icon: RefreshCw, title: t("terms7Title"), body: t("terms7Body") },
    { icon: Mail, title: t("terms8Title"), body: t("terms8Body") },
  ];

  return (
    <div className="animate-fade-up">
      <section className="border-b border-ink-700/50 py-12 text-center">
        <span className="chip mx-auto !border-gold-500/40 !bg-gold-500/10 !text-gold-300">
          <FileText className="h-3.5 w-3.5" />
          {t("termsBadge")}
        </span>
        <h1 className="section-title mt-4 text-cream">
          {t("termsTitle").split(" ").slice(0, -1).join(" ")}{" "}
          <span className="gold-text">{t("termsTitle").split(" ").slice(-1)}</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-ink-300">
          {t("termsLastUpdated")}
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
            {t("privacyNote")}
          </p>
        </div>
      </section>
    </div>
  );
}
