import { ArrowLeft, ExternalLink, Radio } from "lucide-react";
import { CHANNELS } from "@/lib/channels";
import { cn } from "@/lib/utils";
import { TelegramIcon, WhatsAppIcon, YouTubeIcon } from "./ChannelIcons";
import type { ComponentType, SVGProps } from "react";
import { useLang } from "@/lib/i18n";

const CHANNEL_ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  whatsapp: WhatsAppIcon,
  telegram: TelegramIcon,
  youtube: YouTubeIcon,
};

export function ChannelsSection({ className }: { className?: string }) {
  const { t } = useLang();
  return (
    <div className={cn("grid gap-5 md:grid-cols-3", className)}>
      {CHANNELS.map((c) => {
        const Icon = CHANNEL_ICONS[c.id];
        return (
          <a
            key={c.id}
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${c.name} — ${c.cta}`}
            className={cn(
              "card-surface group relative flex flex-col overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)]",
              c.hover
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 top-0 h-24 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                c.bg
              )}
            />
            <div className="relative flex items-center justify-between">
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-2xl border transition-transform duration-300 group-hover:scale-110",
                  c.badge,
                  c.bg
                )}
              >
                <Icon className="h-7 w-7" />
              </div>
              <span className="flex items-center gap-1.5 rounded-full border border-ink-600/60 bg-ink-900/70 px-2.5 py-1 text-[10px] font-black text-ink-300">
                <Radio className="h-3 w-3 animate-pulse text-gold-400" />
                {t("live")}
              </span>
            </div>
            <h3 className="relative mt-5 text-lg font-black text-cream">{c.name}</h3>
            <p className="relative mt-2 flex-1 text-[13px] leading-relaxed text-ink-300">
              {c.description}
            </p>
            <div className="relative mt-5 flex items-center justify-between border-t border-ink-700/50 pt-4">
              <span className={cn("text-xs font-black", c.color)}>{c.cta}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-600/60 text-ink-300 transition-all duration-300 group-hover:border-gold-500/60 group-hover:text-gold-300">
                <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
              </span>
            </div>
          </a>
        );
      })}
    </div>
  );
}

export function ChannelIcon({ id, className }: { id: string; className?: string }) {
  const Icon = CHANNEL_ICONS[id] ?? ExternalLink;
  return <Icon className={className} />;
}
