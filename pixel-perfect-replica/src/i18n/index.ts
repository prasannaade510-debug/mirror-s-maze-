import { en, type Dict } from "./en";
import { hi } from "./hi";
import { mr } from "./mr";

export type Lang = "en" | "hi" | "mr";
export type TKey = keyof Dict;
export const DICTS: Record<Lang, Dict> = { en, hi, mr };
export const LANG_LABEL: Record<Lang, string> = { en: "English", hi: "हिन्दी", mr: "मराठी" };
export const SPEECH_LANG: Record<Lang, string> = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" };

export function translate(lang: Lang, k: TKey, vars?: Record<string, string | number>): string {
  let s = DICTS[lang][k] ?? DICTS.en[k];
  if (vars) for (const [n, v] of Object.entries(vars)) s = s.replaceAll(`{${n}}`, String(v));
  return s;
}
