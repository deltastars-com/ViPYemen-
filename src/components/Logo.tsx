import { cn } from "@/lib/utils";

// Official ViP Yemen crest: metallic gold ring, black field, eagle emblem.
const EAGLE = (
  <g transform="translate(256,256) scale(0.66) translate(-256,-256)">
    {/* wings */}
    <path
      d="M240 172 L200 140 L156 118 L120 124 L114 140 L136 150 L124 170 L160 166 L148 192 L186 184 L180 210 L216 200 L232 190 L242 180 Z"
      fill="url(#crestBrown)"
    />
    <path
      d="M272 172 L312 140 L356 118 L392 124 L398 140 L376 150 L388 170 L352 166 L364 192 L326 184 L332 210 L296 200 L280 190 L270 180 Z"
      fill="url(#crestBrown)"
    />
    {/* body */}
    <path
      d="M256 150 L234 166 L230 198 L242 232 L252 248 L256 254 L260 248 L270 232 L282 198 L278 166 Z"
      fill="url(#crestBrown)"
    />
    {/* head + chest */}
    <circle cx="238" cy="136" r="15" fill="#f2efe4" />
    <path d="M228 152 L250 148 L256 166 L240 176 L222 166 Z" fill="#e2ded0" />
    {/* tail */}
    <path d="M246 242 L234 258 L242 272 L254 280 L262 278 L272 268 L266 244 Z" fill="#f2efe4" />
    {/* talons + beak */}
    <path d="M248 282 L252 294 L258 282 Z" fill="#e9b93c" />
    <path d="M254 284 L259 296 L265 284 Z" fill="#e9b93c" />
    <path d="M233 131 L203 137 L215 147 L229 142 Z" fill="#e9b93c" />
    {/* eye */}
    <circle cx="230" cy="133" r="2.1" fill="#040406" />
  </g>
);

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={cn("h-10 w-10", className)} aria-hidden>
      <defs>
        <linearGradient id="crestGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f5e3a2" />
          <stop offset="45%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#8f6b22" />
        </linearGradient>
        <linearGradient id="crestBrown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9a6431" />
          <stop offset="100%" stopColor="#683f18" />
        </linearGradient>
      </defs>
      <circle cx="256" cy="256" r="221" fill="#0b0b12" />
      <circle cx="256" cy="256" r="250" fill="none" stroke="url(#crestGold)" strokeWidth="26" />
      {EAGLE}
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