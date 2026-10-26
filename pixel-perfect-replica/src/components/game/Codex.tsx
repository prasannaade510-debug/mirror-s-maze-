import type { TKey } from "@/i18n";
import { useSettings } from "@/lib/settings";
import { X } from "lucide-react";
import { ChunkyButton } from "./ui";

export type CodexId = "sun" | "planet" | "mirror" | "prism" | "lens" | "splitter" | "filter" | "blackhole" | "whitehole" | "wind";
export const CODEX: { id: CodexId; name: TKey; def: TKey }[] = [
  { id: "sun", name: "sun", def: "defSun" },
  { id: "planet", name: "planet", def: "defPlanet" },
  { id: "mirror", name: "toolMirror", def: "defMirror" },
  { id: "prism", name: "toolPrism", def: "defPrism" },
  { id: "lens", name: "toolLens", def: "defLens" },
  { id: "splitter", name: "toolSplitter", def: "defSplitter" },
  { id: "filter", name: "toolFilterRed", def: "defFilter" },
  { id: "blackhole", name: "blackHole", def: "defBlackHole" },
  { id: "whitehole", name: "whiteHole", def: "defWhiteHole" },
  { id: "wind", name: "windStream", def: "defWind" },
];

export function CodexIcon({ id }: { id: CodexId }) {
  return (
    <svg viewBox="0 0 60 60" className="h-14 w-14 shrink-0" aria-hidden>
      {id === "sun" && <SunArt x={30} y={30} r={12} />}
      {id === "planet" && <><circle cx="30" cy="30" r="13" fill="var(--ocean-a)" /><ellipse cx="30" cy="30" rx="24" ry="6" fill="none" stroke="var(--gold)" strokeWidth="3" transform="rotate(-18 30 30)" /></>}
      {id === "mirror" && <><line x1="10" y1="50" x2="50" y2="10" stroke="var(--mirror)" strokeWidth="6" strokeLinecap="round" /><path d="M5 30 L30 30 L30 5" fill="none" stroke="var(--beam-gold)" strokeWidth="3" /></>}
      {id === "prism" && <><polygon points="30,10 50,46 10,46" fill="var(--mirror)" fillOpacity=".25" stroke="var(--mirror)" strokeWidth="3" />{["red", "green", "blue"].map((c, i) => <line key={c} x1="40" y1="34" x2="58" y2={38 + i * 7} stroke={`var(--beam-${c})`} strokeWidth="3" />)}</>}
      {id === "lens" && <><ellipse cx="30" cy="30" rx="8" ry="22" fill="var(--beam-blue)" fillOpacity=".4" stroke="var(--mirror)" strokeWidth="2" /><path d="M2 18 L30 18 L56 30 M2 42 L30 42 L56 30" fill="none" stroke="var(--beam-gold)" strokeWidth="2" /></>}
      {id === "splitter" && <><line x1="10" y1="50" x2="50" y2="10" stroke="var(--mirror)" strokeWidth="5" strokeDasharray="8 5" /><path d="M2 30 L58 30 M30 30 L30 2" fill="none" stroke="var(--beam-gold)" strokeWidth="3" /></>}
      {id === "filter" && <><rect x="25" y="8" width="10" height="44" rx="3" fill="var(--beam-red)" opacity=".8" /><line x1="2" y1="30" x2="25" y2="30" stroke="var(--beam-white)" strokeWidth="3" /><line x1="35" y1="30" x2="58" y2="30" stroke="var(--beam-red)" strokeWidth="3" /></>}
      {id === "blackhole" && <HoleArt x={30} y={30} s={0.3} black />}
      {id === "whitehole" && <HoleArt x={30} y={30} s={0.3} black={false} />}
      {id === "wind" && [14, 30, 46].map((x) => <path key={x} d={`M${x} 4 q8 9 0 18 t0 18 t0 18`} fill="none" stroke="var(--wind)" strokeWidth="3" />)}
    </svg>
  );
}

/** Kid-drawing sun: core plus rays all around. */
export function SunArt({ x, y, r, spin = false }: { x: number; y: number; r: number; spin?: boolean }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r * 1.9} fill="var(--sun-glow)" opacity=".25" />
      <g style={spin ? { transformOrigin: `${x}px ${y}px`, animation: "spin 24s linear infinite" } : undefined}>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * 30 * Math.PI) / 180, r1 = r * 1.25, r2 = r * (i % 2 ? 1.65 : 1.95);
          return <line key={i} x1={x + Math.cos(a) * r1} y1={y + Math.sin(a) * r1} x2={x + Math.cos(a) * r2} y2={y + Math.sin(a) * r2}
            stroke="var(--sun-core)" strokeWidth={r * 0.18} strokeLinecap="round" />;
        })}
      </g>
      <circle cx={x} cy={y} r={r} fill="var(--sun-core)" />
      <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.35} fill="var(--beam-white)" opacity=".5" />
    </g>
  );
}

/** Black hole: dark core, fiery tilted accretion disk, photon ring. White hole: bright core with outward rays. */
export function HoleArt({ x, y, s = 1, black }: { x: number; y: number; s?: number; black: boolean }) {
  if (!black) {
    return (
      <g>
        <circle cx={x} cy={y} r={90 * s} fill="var(--beam-blue)" opacity=".15" />
        <g style={{ transformOrigin: `${x}px ${y}px`, animation: "spin 10s linear infinite reverse" }}>
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i * 22.5 * Math.PI) / 180;
            return <line key={i} x1={x + Math.cos(a) * 32 * s} y1={y + Math.sin(a) * 32 * s} x2={x + Math.cos(a) * 80 * s} y2={y + Math.sin(a) * 80 * s}
              stroke="var(--beam-white)" strokeWidth={4 * s} opacity=".6" strokeLinecap="round" />;
          })}
        </g>
        <circle cx={x} cy={y} r={28 * s} fill="var(--beam-white)" />
      </g>
    );
  }
  return (
    <g>
      <circle cx={x} cy={y} r={95 * s} fill="var(--hole-ring)" opacity=".08" />
      <g transform={`rotate(-20 ${x} ${y})`}>
        <ellipse cx={x} cy={y} rx={88 * s} ry={24 * s} fill="none" stroke="var(--disk-outer)" strokeWidth={14 * s} opacity=".55" />
        <ellipse cx={x} cy={y} rx={70 * s} ry={17 * s} fill="none" stroke="var(--disk-inner)" strokeWidth={8 * s}
          strokeDasharray={`${30 * s} ${12 * s}`} style={{ animation: "drift 1.2s linear infinite" }} />
      </g>
      <circle cx={x} cy={y} r={34 * s} fill="none" stroke="var(--disk-inner)" strokeWidth={4 * s} opacity=".9" />
      <circle cx={x} cy={y} r={30 * s} fill="var(--space-void)" />
      <path d={`M${x - 88 * s} ${y + 6 * s} Q${x} ${y + 40 * s} ${x + 88 * s} ${y - 6 * s}`} transform={`rotate(-20 ${x} ${y})`}
        fill="none" stroke="var(--disk-outer)" strokeWidth={10 * s} opacity=".7" />
    </g>
  );
}

export function CodexList({ only }: { only?: CodexId[] | undefined }) {
  const { t } = useSettings();
  const items = only ? CODEX.filter((c) => only.includes(c.id)) : CODEX;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((c) => (
        <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-muted p-3">
          <CodexIcon id={c.id} />
          <div>
            <p className="font-display text-xl font-bold text-gold">{t(c.name)}</p>
            <p className="text-base leading-snug">{t(c.def)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CodexPanel({ only, onClose }: { only?: CodexId[]; onClose: () => void }) {
  const { t } = useSettings();
  return (
    <div role="dialog" aria-modal="true" aria-label={t("codex")} className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-card-grad p-5 shadow-chunky" style={{ animation: "pop-in .3s ease-out" }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-3xl font-extrabold text-gold">{t("codex")}</h2>
          <ChunkyButton onClick={onClose} aria-label={t("close")}><X /></ChunkyButton>
        </div>
        <CodexList only={only} />
      </div>
    </div>
  );
}
