import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translate, type Lang, type TKey } from "@/i18n";
import { primeVoices, setMuted } from "./audio";

const STORE_KEY = "mirror-maze-v1";

interface Saved {
  lang: Lang;
  muted: boolean;
  patterns: boolean;
  progress: Record<number, number>;
  sym: Record<number, boolean>;
  space: Record<number, number>;
}
const DEFAULTS: Saved = { lang: "en", muted: false, patterns: false, progress: {}, sym: {}, space: {} };

function load(): Saved {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}
function save(s: Saved) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: keep playing */
  }
}

interface Ctx extends Saved {
  t: (k: TKey, vars?: Record<string, string | number>) => string;
  setLang: (l: Lang) => void;
  toggleMute: () => void;
  togglePatterns: () => void;
  recordLevel: (id: number, stars: number) => void;
  recordSym: (id: number) => void;
  recordSpace: (id: number, stars: number) => void;
  resetProgress: () => void;
}

const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Saved>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setS(load());
    setLoaded(true);
    primeVoices();
  }, []);
  useEffect(() => {
    if (loaded) save(s);
    setMuted(s.muted);
    if (typeof document !== "undefined") document.documentElement.lang = s.lang;
  }, [s, loaded]);

  const t = useCallback((k: TKey, vars?: Record<string, string | number>) => translate(s.lang, k, vars), [s.lang]);

  const value = useMemo<Ctx>(
    () => ({
      ...s,
      t,
      setLang: (lang) => setS((p) => ({ ...p, lang })),
      toggleMute: () => setS((p) => ({ ...p, muted: !p.muted })),
      togglePatterns: () => setS((p) => ({ ...p, patterns: !p.patterns })),
      recordLevel: (id, stars) =>
        setS((p) => ({ ...p, progress: { ...p.progress, [id]: Math.max(p.progress[id] ?? 0, stars) } })),
      recordSpace: (id, stars) =>
        setS((p) => ({ ...p, space: { ...p.space, [id]: Math.max(p.space[id] ?? 0, stars) } })),
      recordSym: (id) => setS((p) => ({ ...p, sym: { ...p.sym, [id]: true } })),
      resetProgress: () => setS((p) => ({ ...p, progress: {}, sym: {}, space: {} })),
    }),
    [s, t],
  );
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

export function useSettings() {
  const c = useContext(SettingsCtx);
  if (!c) throw new Error("useSettings outside provider");
  return c;
}
