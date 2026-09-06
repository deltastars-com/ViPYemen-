import { cn } from "@/lib/utils";

// Official ViP Yemen crest — permanent, matches the generated app icons:
// metallic gold ring with engraved name arc, black field with crescent
// accents, tagline ring with upright ( ViP ), bottom gold ribbon carrying
// the Arabic tagline, and the eagle emblem.
const DEG = Math.PI / 180;

function arcPoints(rOuter: number, a1: number, a2: number, innerAt: (a: number) => number, N = 60) {
  const pts: string[] = [];
  for (let i = 0; i <= N; i++) {
    const a = a1 + ((a2 - a1) * i) / N;
    pts.push(`${(256 + rOuter * Math.cos(a)).toFixed(1)} ${(256 + rOuter * Math.sin(a)).toFixed(1)}`);
  }
  for (let i = N; i >= 0; i--) {
    const a = a1 + (a2 - a1) * (i / N);
    const d = innerAt(a);
    pts.push(`${(256 + d * Math.cos(a)).toFixed(1)} ${(256 + d * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
}

// black crescent accents on the upper sides (same math as the icon generator)
const crescentPath = (a1: number, a2: number) => {
  const N = 30;
  const pts: string[] = [];
  for (let i = 0; i <= N; i++) {
    const a = a1 + ((a2 - a1) * i) / N;
    pts.push(`${(256 + 219.5 * Math.cos(a)).toFixed(1)} ${(256 + 219.5 * Math.sin(a)).toFixed(1)}`);
  }
  for (let i = N; i >= 0; i--) {
    const t = i / N;
    const a = a1 + (a2 - a1) * t;
    const d = 219.5 - 20 * Math.sin(Math.PI * t);
    pts.push(`${(256 + d * Math.cos(a)).toFixed(1)} ${(256 + d * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
};
const CRESCENT_L = crescentPath(205 * DEG, 245 * DEG);
const CRESCENT_R = crescentPath(295 * DEG, 335 * DEG);

// bottom gold ribbon: outer arc r=251 from 42°→138°, inner edge arc r≈196–202
const ribbonInnerAt = (a: number) => {
  const b = 2 * 20 * Math.sin(a);
  const c = 400 - 216 * 216;
  return (-b + Math.sqrt(b * b - 4 * c)) / 2;
};
const RIBBON_PATH = arcPoints(251, 42 * DEG, 138 * DEG, ribbonInnerAt);

const EAGLE = (
  <g transform="translate(256,256) scale(0.78) translate(-256,-256)">
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
        <linearGradient id="crestRibbon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fce06c" />
          <stop offset="100%" stopColor="#d8a62c" />
        </linearGradient>
        {/* name arc on the band: r=227 baseline, spanning 223° across the top */}
        <path
          id="crestNameArc"
          d="M 44.7 339.2 A 227 227 0 1 1 467.3 339.2"
          fill="none"
        />
        {/* tagline arc: r=168, spanning 238° across the top */}
        <path
          id="crestTagArc"
          d="M 109.1 337.4 A 168 168 0 1 1 402.9 337.5"
          fill="none"
        />
      </defs>
      {/* black field */}
      <circle cx="256" cy="256" r="221" fill="#0b0b12" />
      {/* gold ring band */}
      <circle cx="256" cy="256" r="237" fill="none" stroke="url(#crestGold)" strokeWidth="26" />
      {/* black crescent accents */}
      <path d={CRESCENT_L} fill="#050509" />
      <path d={CRESCENT_R} fill="#050509" />
      {/* engraved name arc on the band */}
      <text fontSize="31" fontWeight="900" letterSpacing="5" fill="#3e2c0b">
        <textPath href="#crestNameArc" startOffset="50%" textAnchor="middle">
          VIPSERVICESYEMEN
        </textPath>
      </text>
      {/* thin middle rings */}
      <circle cx="256" cy="256" r="191" fill="none" stroke="#d4af37" strokeWidth="1.7" />
      <circle cx="256" cy="256" r="145" fill="none" stroke="#d4af37" strokeWidth="1.6" />
      <circle cx="256" cy="256" r="136" fill="none" stroke="#d4af37" strokeWidth="2.1" />
      {/* tagline ring */}
      <text fontSize="19.5" fontWeight="700" fill="#e2c45c">
        <textPath href="#crestTagArc" startOffset="50%" textAnchor="middle">
          For Employment, E-Marketing &amp; General Services
        </textPath>
      </text>
      {/* upright ( ViP ) at the bottom of the tagline ring */}
      <text x="256" y="424" fontSize="24" fontWeight="900" textAnchor="middle" fill="#f0d678">
        ★ ( ViP ) ★
      </text>
      {EAGLE}
      {/* bottom gold ribbon with the Arabic tagline */}
      <path d={RIBBON_PATH} fill="url(#crestRibbon)" />
      <text x="256" y="490" fontSize="26" fontWeight="700" textAnchor="middle" fill="#171207">
        للتوفيق والثقة الإلكتروني والخدمات العامة
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
