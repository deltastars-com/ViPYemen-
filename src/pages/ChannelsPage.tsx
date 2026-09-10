import { Link } from "react-router-dom";
import { LogoMark } from "@/components/Logo";
import { motion } from "framer-motion";
import { BellRing, Megaphone, MessagesSquare, ShieldCheck, Users } from "lucide-react";
import { CHANNELS } from "@/lib/channels";
import { ChannelsSection, ChannelIcon } from "@/components/ChannelsSection";
import { PLATFORM_WHATSAPP_LINK } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

export function ChannelsPage() {
  const { t } = useLang();
  const BENEFITS = [
    { icon: Megaphone, title: t("livePost"), text: t("livePostText") },
    { icon: BellRing, title: t("alerts"), text: t("alertsText") },
    { icon: Users, title: t("community"), text: t("communityText") },
    { icon: ShieldCheck, title: t("trustedContent"), text: t("trustedContentText") },
  ];

  return (
    <div className="container-app py-12">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-gold-500/25 bg-gradient-to-br from-ink-900 via-ink-950 to-ink-900 p-8 text-center sm:p-14"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle at 50% 0%, rgba(212,175,55,0.16), transparent 55%)",
          }}
        />
        <div className="relative">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-gold-500/40 bg-gold-500/10">
            <LogoMark className="h-9 w-9" />
          </div>
          <h1 className="text-2xl font-black text-cream sm:text-4xl">
            {t("channelsPageTitle").split(" ").slice(0, -1).join(" ")}{" "}
            <span className="gold-text">{t("channelsPageTitle").split(" ").slice(-1)}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ink-300 sm:text-base">
            {t("channelsPageSub")}
          </p>
        </div>
      </motion.section>

      {/* Channel cards */}
      <section className="mt-10">
        <ChannelsSection />
      </section>

      {/* Interconnection strip */}
      <section className="mt-8 rounded-2xl border border-ink-700/50 bg-ink-900/50 p-6">
        <div className="flex flex-col items-center justify-between gap-5 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-300">
              <MessagesSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-cream">{t("interlinkedChannels")}</p>
              <p className="text-xs text-ink-300">{t("interlinkedSub")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {CHANNELS.map((c) => (
              <a
                key={c.id}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${c.name} — ${c.cta}`}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black transition-all hover:-translate-y-0.5 ${c.badge}`}
              >
                <ChannelIcon id={c.id} className="h-4 w-4" />
                {c.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Why join */}
      <section className="mt-14">
        <h2 className="section-title text-center text-cream">
          {t("whyJoin").split(" ").slice(0, -1).join(" ")}{" "}
          <span className="gold-text">{t("whyJoin").split(" ").slice(-1)}</span>
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b) => (
            <div key={b.title} className="card-surface p-5 transition-all hover:-translate-y-0.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-300">
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-black text-cream">{b.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-300">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-14 rounded-3xl border border-gold-500/25 bg-gradient-to-br from-ink-900 via-ink-950 to-ink-900 p-8 text-center sm:p-12">
        <h2 className="text-xl font-black text-cream sm:text-2xl">
          {t("dontMiss")}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-ink-300">
          {t("dontMissSub")}
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {CHANNELS.map((c) => (
            <a
              key={c.id}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn-ghost !py-2.5 text-xs ${c.color}`}
            >
              <ChannelIcon id={c.id} className="h-4 w-4" />
              {c.cta}
            </a>
          ))}
          <Link to="/" className="btn-gold !py-2.5 text-xs">
            {t("browseSections")}
          </Link>
        </div>
        <p className="mt-6 text-[11px] font-semibold text-ink-400">
          {t("directContact")}{" "}
          <a
            href={PLATFORM_WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold-400 underline underline-offset-4"
          >
            {t("whatsappBusiness")} 00967711780999
          </a>
        </p>
      </section>
    </div>
  );
}
