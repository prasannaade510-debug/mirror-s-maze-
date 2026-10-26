import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, useState, type ButtonHTMLAttributes } from "react";
import { Music, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings";
import { speak, sfx } from "@/lib/audio";
import { LANG_LABEL, SPEECH_LANG, type Lang, type TKey } from "@/i18n";

export const chunky = cva(
  "inline-flex select-none items-center justify-center gap-2 rounded-2xl font-display font-bold transition-transform active:translate-y-1 active:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:opacity-50 min-h-14 min-w-14",
  {
    variants: {
      variant: {
        gold: "bg-gold-grad text-primary-foreground shadow-chunky",
        teal: "bg-teal-grad text-secondary-foreground shadow-chunky",
        soft: "bg-muted text-foreground shadow-chunky",
        ghost: "bg-transparent text-foreground",
        danger: "bg-destructive text-destructive-foreground shadow-chunky",
      },
      size: {
        icon: "h-14 w-14 text-xl",
        md: "h-14 px-5 text-xl",
        lg: "h-20 px-10 text-3xl rounded-3xl",
      },
    },
    defaultVariants: { variant: "soft", size: "icon" },
  },
);

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof chunky>;
export const ChunkyButton = forwardRef<HTMLButtonElement, BtnProps>(({ className, variant, size, ...p }, ref) => (
  <button ref={ref} className={cn(chunky({ variant, size }), className)} {...p} />
));
ChunkyButton.displayName = "ChunkyButton";

/** Big speaker that reads an instruction aloud; shows text when no voice exists. */
export function SpeakButton({ textKey, auto = false }: { textKey: TKey; auto?: boolean }) {
  const { t, lang } = useSettings();
  const [fallback, setFallback] = useState<string | null>(null);
  const run = () => {
    const text = t(textKey);
    if (!speak(text, SPEECH_LANG[lang])) {
      setFallback(text);
      window.setTimeout(() => setFallback(null), 5000);
    }
  };
  void auto;
  return (
    <div className="relative">
      <ChunkyButton variant="teal" aria-label={t("speak")} onClick={run}>
        <Volume2 className="h-7 w-7" />
      </ChunkyButton>
      {fallback && (
        <div role="status" className="fade-in absolute right-0 top-16 z-40 w-64 rounded-2xl bg-card p-3 text-lg leading-snug text-card-foreground shadow-chunky">
          {fallback}
        </div>
      )}
    </div>
  );
}

export function MuteButton() {
  const { muted, toggleMute, t } = useSettings();
  return (
    <ChunkyButton aria-label={t("sound")} aria-pressed={!muted} onClick={() => { toggleMute(); if (muted) sfx.pop(); }}>
      {muted ? <VolumeX className="h-7 w-7" /> : <Music className="h-7 w-7 text-gold" />}
    </ChunkyButton>
  );
}

export function LangToggle() {
  const { lang, setLang, t } = useSettings();
  return (
    <div role="radiogroup" aria-label={t("language")} className="flex gap-2 rounded-3xl bg-muted/70 p-1.5">
      {(Object.keys(LANG_LABEL) as Lang[]).map((l) => (
        <button
          key={l}
          role="radio"
          aria-checked={lang === l}
          onClick={() => setLang(l)}
          className={cn(
            "min-h-14 rounded-2xl px-4 text-xl font-bold transition-colors",
            lang === l ? "bg-gold-grad text-primary-foreground shadow-chunky" : "text-muted-foreground",
          )}
        >
          {LANG_LABEL[l]}
        </button>
      ))}
    </div>
  );
}
