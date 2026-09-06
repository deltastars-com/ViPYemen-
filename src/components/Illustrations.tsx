import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

/**
 * Theme-matched flat illustrations (navy + gold + white accents) used to
 * enrich the landing experience. Each variant renders a complete scene.
 */
export function HeroIllustration({ variant, ...props }: P & { variant: "survey" | "store" | "search" }) {
  if (variant === "survey") return <SurveyScene {...props} />;
  if (variant === "store") return <StoreScene {...props} />;
  return <SearchScene {...props} />;
}

const GOLD = "#d4af37";
const GOLD_DARK = "#8f6b22";
const NAVY = "#262c47";
const NAVY_DEEP = "#1a1f33";
const CREAM = "#f2efe4";

/** Checked survey / quality-choice scene (happy ✓, neutral, sad). */
function SurveyScene(props: P) {
  return (
    <svg viewBox="0 0 220 170" fill="none" aria-hidden {...props}>
      {/* glow */}
      <ellipse cx="110" cy="158" rx="86" ry="7" fill={GOLD} opacity="0.08" />
      {/* checked row */}
      <g>
        <circle cx="64" cy="34" r="21" stroke={CREAM} strokeWidth="4" />
        <circle cx="57" cy="29" r="2.6" fill={CREAM} />
        <circle cx="71" cy="29" r="2.6" fill={CREAM} />
        <path d="M56 41c2.5 3.4 5.3 5 8 5s5.5-1.6 8-5" stroke={CREAM} strokeWidth="3.4" strokeLinecap="round" />
        <rect x="96" y="26" width="20" height="20" rx="3.5" fill={CREAM} />
        <path d="M99 36l6 6 11-13" stroke="#0a0e1a" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M104 12l8 6 9-11" stroke={GOLD} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* neutral row */}
      <g opacity="0.85">
        <circle cx="64" cy="86" r="21" stroke={CREAM} strokeWidth="4" />
        <circle cx="57" cy="81" r="2.6" fill={CREAM} />
        <circle cx="71" cy="81" r="2.6" fill={CREAM} />
        <path d="M57 93h14" stroke={CREAM} strokeWidth="3.4" strokeLinecap="round" />
        <rect x="96" y="78" width="20" height="20" rx="3.5" stroke={CREAM} strokeWidth="3" />
      </g>
      {/* sad row */}
      <g opacity="0.65">
        <circle cx="64" cy="138" r="21" stroke={CREAM} strokeWidth="4" />
        <circle cx="57" cy="133" r="2.6" fill={CREAM} />
        <circle cx="71" cy="133" r="2.6" fill={CREAM} />
        <path d="M56 148c2.5-3.4 5.3-5 8-5s5.5 1.6 8 5" stroke={CREAM} strokeWidth="3.4" strokeLinecap="round" />
        <rect x="96" y="130" width="20" height="20" rx="3.5" stroke={CREAM} strokeWidth="3" />
      </g>
      {/* quality stars */}
      <g>
        <path d="M138 30l3.2 6.5 7.2 1-5.2 5 1.2 7.1-6.4-3.4-6.4 3.4 1.2-7.1-5.2-5 7.2-1z" fill={GOLD} />
        <path d="M170 30l3.2 6.5 7.2 1-5.2 5 1.2 7.1-6.4-3.4-6.4 3.4 1.2-7.1-5.2-5 7.2-1z" fill={GOLD} />
        <path d="M202 30l3.2 6.5 7.2 1-5.2 5 1.2 7.1-6.4-3.4-6.4 3.4 1.2-7.1-5.2-5 7.2-1z" fill={GOLD} />
      </g>
      {/* gold circuit branch */}
      <path d="M140 96h34l12-12" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="140" cy="96" r="3.4" fill={GOLD} />
      <circle cx="186" cy="84" r="3.4" fill={GOLD} />
      <rect x="146" y="110" width="34" height="26" rx="5" stroke={GOLD} strokeWidth="2.4" />
      <path d="M152 123h22M152 129h14" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/** Storefront / marketplace scene — browser window, product rows, cart. */
function StoreScene(props: P) {
  return (
    <svg viewBox="0 0 260 190" fill="none" aria-hidden {...props}>
      <ellipse cx="130" cy="180" rx="100" ry="7" fill={GOLD} opacity="0.08" />
      {/* browser card */}
      <rect x="42" y="18" width="176" height="120" rx="10" fill={NAVY} stroke={GOLD} strokeWidth="2" />
      <path d="M42 44h176" stroke={GOLD} strokeWidth="1.6" opacity="0.7" />
      <circle cx="56" cy="31" r="3" fill={GOLD} />
      <circle cx="67" cy="31" r="3" fill={GOLD} opacity="0.6" />
      <circle cx="78" cy="31" r="3" fill={GOLD} opacity="0.35" />
      {/* product rows */}
      <rect x="56" y="56" width="86" height="9" rx="4.5" fill={GOLD} opacity="0.9" />
      <rect x="56" y="74" width="64" height="9" rx="4.5" fill={GOLD} opacity="0.55" />
      <rect x="56" y="92" width="76" height="9" rx="4.5" fill={GOLD} opacity="0.35" />
      {/* price tag */}
      <rect x="152" y="58" width="50" height="24" rx="6" fill={GOLD} />
      <circle cx="164" cy="70" r="3" fill={NAVY_DEEP} />
      <rect x="172" y="67" width="22" height="6" rx="3" fill={NAVY_DEEP} opacity="0.85" />
      {/* magnifier over content */}
      <circle cx="182" cy="104" r="22" stroke={GOLD} strokeWidth="6" />
      <path d="M198 120l16 16" stroke={GOLD} strokeWidth="8" strokeLinecap="round" />
      <circle cx="182" cy="104" r="15" fill={CREAM} opacity="0.1" />
      {/* network pad */}
      <rect x="60" y="150" width="120" height="22" rx="5" fill={NAVY_DEEP} stroke={GOLD} strokeWidth="1.6" />
      <g stroke={GOLD} strokeWidth="1.6" opacity="0.85">
        <path d="M76 161h20M110 161h18M142 161h22" />
        <circle cx="76" cy="161" r="3" fill={GOLD} />
        <circle cx="110" cy="161" r="3" fill={GOLD} />
        <circle cx="142" cy="161" r="3" fill={GOLD} />
      </g>
      {/* floating cubes */}
      <path d="M232 38l8-5v10l-8 5z" fill={GOLD} opacity="0.8" />
      <path d="M28 96l7-4v9l-7 4z" fill={GOLD} opacity="0.5" />
    </svg>
  );
}

/** Code-search / development scene — terminal window, code lines, gear. */
function SearchScene(props: P) {
  return (
    <svg viewBox="0 0 220 170" fill="none" aria-hidden {...props}>
      <ellipse cx="110" cy="158" rx="80" ry="7" fill={GOLD} opacity="0.08" />
      {/* terminal card */}
      <rect x="34" y="22" width="152" height="104" rx="10" fill={NAVY} stroke={GOLD} strokeWidth="2" />
      <path d="M34 48h152" stroke={GOLD} strokeWidth="1.6" opacity="0.7" />
      <circle cx="48" cy="35" r="3" fill={GOLD} />
      <circle cx="59" cy="35" r="3" fill={GOLD} opacity="0.6" />
      <circle cx="70" cy="35" r="3" fill={GOLD} opacity="0.35" />
      {/* code lines */}
      <g strokeLinecap="round">
        <path d="M50 62l8 5-8 5" stroke={GOLD} strokeWidth="3" />
        <path d="M66 67h58" stroke={CREAM} strokeWidth="4" opacity="0.9" />
        <path d="M58 82h70" stroke={CREAM} strokeWidth="4" opacity="0.6" />
        <path d="M58 96h44" stroke={CREAM} strokeWidth="4" opacity="0.35" />
        <path d="M50 108l8 5-8 5" stroke={GOLD} strokeWidth="3" opacity="0.8" />
      </g>
      {/* gear */}
      <g transform="translate(168,96)">
        <circle r="16" stroke={GOLD} strokeWidth="4" />
        <circle r="6" stroke={GOLD} strokeWidth="3" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <path key={a} d="M0-24v-6" stroke={GOLD} strokeWidth="4" strokeLinecap="round" transform={`rotate(${a})`} />
        ))}
      </g>
      {/* database coins */}
      <g transform="translate(30,120)">
        <ellipse cx="12" cy="4" rx="12" ry="5" fill={GOLD} />
        <path d="M0 4v9c0 2.8 5.4 5 12 5s12-2.2 12-5V4" fill={GOLD} opacity="0.85" />
        <ellipse cx="12" cy="13" rx="12" ry="5" fill={GOLD_DARK} opacity="0.6" />
      </g>
      {/* lightning chips */}
      <path d="M148 22l10-8-4 12h8l-12 10 4-11z" fill={GOLD} />
      <path d="M26 36l8-6-3 9h6l-9 8 3-8z" fill={GOLD} opacity="0.7" />
    </svg>
  );
}

/** Blue verified seal badge (starburst + check). */
export function VerifiedSeal(props: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M12 1.5l2.1 1.6 2.6-.5 1.3 2.3 2.5.9-.2 2.7 1.9 1.9-1.6 2.1.5 2.6-2.3 1.3-.9 2.5-2.7-.2-1.9 1.9-2.1-1.6-2.6.5-1.3-2.3-2.5-.9.2-2.7L1.6 12l1.6-2.1-.5-2.6 2.3-1.3.9-2.5 2.7.2z"
        fill="#1e40ff"
      />
      <path d="M7.8 12.4l2.9 2.9 5.5-6.2" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}