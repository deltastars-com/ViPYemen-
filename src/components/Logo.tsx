import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

// Official ViP Yemen seal — permanent, matches the generated app icons:
// scalloped gold edge, polished disc, engraved seed-of-life pattern,
// crown chevron motif, and engraved "VIP YEMEN" lettering on black.
const CX = 256, CY = 256;
const TEETH = 36;
const EDGE_MIN = 234, EDGE_AMP = 14;
const PATTERN_R = 95, PATTERN_D = 95;

function edgeR(a: number) {
  return EDGE_MIN + EDGE_AMP * (0.5 + 0.5 * Math.cos(TEETH * a));
}
function scallopPath() {
  const pts: string[] = [];
  for (let i = 0; i <= 360; i++) {
    const a = (i / 360) * 2 * Math.PI;
    const r = edgeR(a);
    pts.push(`${i === 0 ? "M" : "L"}${(CX + r * Math.cos(a)).toFixed(1)} ${(CY + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ") + " Z";
}
const PATTERN_CIRCLES = [
  { cx: CX, cy: CY },
  ...Array.from({ length: 6 }, (_, i) => {
    const a = i * 60 * (Math.PI / 180) + 30 * (Math.PI / 180);
    return { cx: CX + PATTERN_D * Math.cos(a), cy: CY + PATTERN_D * Math.sin(a) };
  }),
];
const CHEVRON = "M148 272 L256 190 L364 272 L364 240 L256 158 L148 240 Z";
const BARB_L = "M148 272 L112 242 L154 244 Z";
const BARB_R = "M364 272 L400 242 L358 244 Z";
const SMALL_CROWN = "M232 152 L244 130 L256 146 L268 130 L280 152 Z";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={cn("h-10 w-10", className)} aria-hidden>
      <defs>
        <linearGradient id="medalGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8e496" />
          <stop offset="45%" stopColor="#d8b244" />
          <stop offset="100%" stopColor="#8a6622" />
        </linearGradient>
      </defs>
      <path d={scallopPath()} fill="url(#medalGold)" />
      <circle cx={CX} cy={CY} r="214" fill="none" stroke="#684a12" strokeWidth="2.4" />
      <circle cx={CX} cy={CY} r="202" fill="none" stroke="#7c5c1a" strokeWidth="2" />
      {PATTERN_CIRCLES.map((c, i) => (
        <circle key={i} cx={c.cx} cy={c.cy} r={PATTERN_R} fill="none" stroke="#7c5c1a" strokeWidth="3" />
      ))}
      <path d={CHEVRON} fill="#684a12" />
      <path d={BARB_L} fill="#684a12" />
      <path d={BARB_R} fill="#684a12" />
      <path d={SMALL_CROWN} fill="#684a12" />
      <text x={CX} y={318} fontSize="66" fontWeight="900" letterSpacing="4" textAnchor="middle" fill="#684a12">
        VIP
      </text>
      <text x={CX} y={380} fontSize="50" fontWeight="900" letterSpacing="3" textAnchor="middle" fill="#684a12">
        YEMEN
      </text>
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
  const { lang } = useLang();
  const subtitle = lang === "ar"
    ? "توظيف · عقارات · تسويق · برمجيات"
    : "Jobs · Real Estate · Marketing · Software";
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="h-9 w-9 shrink-0" />
      {!compact && (
        <span className="leading-tight">
          <span className="block text-lg font-black tracking-tight text-cream">
            ViP <span className="gold-text">Yemen</span>
          </span>
          <span className="block text-[10px] font-semibold text-gold-400/80">
            {subtitle}
          </span>
        </span>
      )}
    </span>
  );
}
