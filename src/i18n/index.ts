import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import it from "./locales/it.json";
import en from "./locales/en.json";

export const SUPPORTED_LANGUAGES = ["it", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      it: { translation: it },
      en: { translation: en },
    },
    fallbackLng: "it",
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: "erga_lang",
      caches: ["localStorage"],
    },
  });

export function currentLanguage(): SupportedLanguage {
  const lng = (i18n.resolvedLanguage || i18n.language || "it").slice(0, 2);
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lng)
    ? (lng as SupportedLanguage)
    : "it";
}

export default i18n;