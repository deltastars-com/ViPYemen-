import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Professional section heading: icon chip + title with gold highlight +
 * gradient underline + optional subtitle. Used across the platform's main
 * sections for a consistent, polished header language.
 */
export function SectionHeading({
  icon: Icon,
  title,
  highlight,
  subtitle,
  center = false,
  className,
}: {
  icon: LucideIcon;
  title: string;
  highlight?: string;
  subtitle?: string;
  center?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("mb-10", center && "text-center", className)}>
      <div
        className={cn(
          "relative inline-flex flex-wrap items-center gap-3 rounded-2xl border border-gold-500/20 bg-ink-950/40 px-5 py-3 backdrop-blur-md",
          center && "justify-center"
        )}
        style={{
          boxShadow:
            "0 0 40px -12px rgba(212,175,55,0.2), inset 0 1px 0 0 rgba(255,255,255,0.05)",
        }}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold-500/40 bg-gradient-to-b from-gold-500/15 to-gold-500/5 text-gold-300 shadow-[0_0_28px_-8px_rgba(212,175,55,0.55)]">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="section-title text-cream">
          {title}
          {highlight ? (
            <>
              {" "}
              <span className="gold-text">{highlight}</span>
            </>
          ) : null}
        </h2>
      </div>
      <div className={cn("mt-4 section-title-underline", center && "section-title-underline-center")} />
      {subtitle ? (
        <p className={cn("mt-4 max-w-xl text-sm leading-relaxed text-ink-300", center && "mx-auto")}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}