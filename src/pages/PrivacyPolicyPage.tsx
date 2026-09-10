import { ShieldCheck, FileText, Lock, Database, Eye, Mail, Trash2 } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function PrivacyPolicyPage() {
  const { t } = useLang();
  const SECTIONS = [
    { icon: Database, title: t("privacySection1Title"), body: t("privacySection1Body") },
    { icon: Eye, title: t("privacySection2Title"), body: t("privacySection2Body") },
    { icon: Lock, title: t("privacySection3Title"), body: t("privacySection3Body") },
    { icon: ShieldCheck, title: t("privacySection4Title"), body: t("privacySection4Body") },
    { icon: Mail, title: t("privacySection5Title"), body: t("privacySection5Body") },
    { icon: Trash2, title: t("privacySection6Title"), body: t("privacySection6Body") },
  ];

  return (
    <div className="animate-fade-up">
      <section className="border-b border-ink-700/50 py-12 text-center">
        <span className="chip mx-auto !border-gold-500/40 !bg-gold-500/10 !text-gold-300">
          <FileText className="h-3.5 w-3.5" />
          {t("privacyBadge")}
        </span>
        <h1 className="section-title mt-4 text-cream">
          {t("privacyTitle").split(" ").slice(0, -1).join(" ")}{" "}
          <span className="gold-text">{t("privacyTitle").split(" ").slice(-1)}</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-ink-300">
          {t("privacyLastUpdated")}
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
