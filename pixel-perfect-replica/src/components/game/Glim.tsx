export type GlimMood = "idle" | "wave" | "happy" | "tilt";

/** Glim, the friendly light-sprite. */
export function Glim({ mood = "idle", size = 96 }: { mood?: GlimMood; size?: number }) {
  const happy = mood === "happy" || mood === "wave";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className="anim-float overflow-visible">
      <defs>
        <radialGradient id="glim-body" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="var(--color-foreground)" />
          <stop offset="55%" stopColor="var(--color-glim)" />
          <stop offset="100%" stopColor="var(--color-primary)" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="55" r="42" fill="var(--color-glim)" opacity="0.18" />
      <g key={mood} className={mood === "tilt" ? "anim-tilt" : undefined}>
        <path d="M50 8 L56 22 L44 22 Z" fill="var(--color-gold)" />
        <circle cx="50" cy="55" r="32" fill="url(#glim-body)" />
        {/* eyes */}
        {mood === "happy" ? (
          <>
            <path d="M36 50 q5 -7 10 0" stroke="var(--color-primary-foreground)" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M54 50 q5 -7 10 0" stroke="var(--color-primary-foreground)" strokeWidth="4" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="41" cy="50" r="5" fill="var(--color-primary-foreground)" />
            <circle cx="59" cy="50" r="5" fill="var(--color-primary-foreground)" />
            <circle cx="43" cy="48" r="1.6" fill="var(--color-foreground)" />
            <circle cx="61" cy="48" r="1.6" fill="var(--color-foreground)" />
          </>
        )}
        <circle cx="33" cy="62" r="4" fill="var(--color-accent)" opacity="0.6" />
        <circle cx="67" cy="62" r="4" fill="var(--color-accent)" opacity="0.6" />
        {happy ? (
          <path d="M40 64 q10 12 20 0" stroke="var(--color-primary-foreground)" strokeWidth="4" fill="none" strokeLinecap="round" />
        ) : mood === "tilt" ? (
          <path d="M43 67 q7 -4 14 0" stroke="var(--color-primary-foreground)" strokeWidth="4" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M43 64 q7 6 14 0" stroke="var(--color-primary-foreground)" strokeWidth="4" fill="none" strokeLinecap="round" />
        )}
        {/* arms */}
        <path d="M20 60 q-8 4 -10 12" stroke="var(--color-glim)" strokeWidth="6" fill="none" strokeLinecap="round" />
        <g key={`arm-${mood}`} className={mood === "wave" ? "anim-wave" : undefined}>
          <path d={mood === "happy" ? "M80 55 q8 -10 6 -20" : "M80 60 q8 4 10 12"} stroke="var(--color-glim)" strokeWidth="6" fill="none" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}
