import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("h-10 w-10", className)} aria-hidden>
      <defs>
        <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0d98c" />
          <stop offset="50%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#a8862a" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="45" height="45" rx="12" fill="#0a0e1a" stroke="url(#goldGrad)" strokeWidth="2" />
      {/* Eagle wing / V mark */}
      <path
        d="M9 32 L19 13 L24 24 L29 13 L39 32 L31 32 L27 23 L24 30 L21 23 L17 32 Z"
        fill="url(#goldGrad)"
      />
      <circle cx="24" cy="10" r="2.4" fill="#d4af37" />
    </svg>
  );
}

export function Logo({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="h-9 w-9 shrink-0" />
      {!compact && (
        <span className="leading-tight">
          <span className="block text-lg font-black tracking-tight text-cream">
            ViP <span className="gold-text">Yemen</span>
          </span>
          <span className="block text-[10px] font-semibold text-gold-400/80">
            توظيف · عقارات · تسويق · برمجيات
          </span>
        </span>
      )}
    </span>
  );
}