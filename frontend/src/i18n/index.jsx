import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import bn from './locales/bn.js';
import en from './locales/en.js';
import { setFormatLocale } from '../utils/format.js';

/**
 * Storefront translations.
 *
 * Adding a language: create locales/<code>.js with the same keys as en.js,
 * import it into DICTIONARIES, and flip `enabled` on its LANGUAGES entry.
 * Missing keys fall back to English, then Bangla, then the key itself, so a
 * half-finished dictionary never renders blanks. `dir: 'rtl'` (Arabic) flips
 * the document direction automatically.
 */
export const LANGUAGES = [
  { code: 'bn', label: 'বাংলা', short: 'বাং', dir: 'ltr', enabled: true },
  { code: 'en', label: 'English', short: 'EN', dir: 'ltr', enabled: true },
  { code: 'hi', label: 'हिन्दी', short: 'हि', dir: 'ltr', enabled: false },
  { code: 'ar', label: 'العربية', short: 'ع', dir: 'rtl', enabled: false },
];

const DICTIONARIES = { bn, en };
const STORAGE_KEY = 'auracraft-lang';
const DEFAULT_LANG = 'bn';

const readLang = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (DICTIONARIES[saved]) return saved;
  } catch {
    /* storage blocked — use the default */
  }
  return DEFAULT_LANG;
};

// Set before the first render so the very first money() call uses the right digits.
setFormatLocale(readLang());

const lookup = (dict, key) => key.split('.').reduce((node, part) => (node == null ? node : node[part]), dict);

const interpolate = (text, vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (_, name) => (vars[name] ?? `{${name}}`)) : text;

const I18nContext = createContext(null);

export const I18nProvider = ({ children }) => {
  const [lang, setLangState] = useState(readLang);

  useEffect(() => {
    const meta = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
    setFormatLocale(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = meta.dir;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* the choice still applies for this visit */
    }
  }, [lang]);

  const setLang = useCallback((code) => {
    if (!DICTIONARIES[code]) return;
    setFormatLocale(code);
    setLangState(code);
  }, []);

  const t = useCallback(
    (key, vars) => {
      const value = lookup(DICTIONARIES[lang], key) ?? lookup(en, key) ?? lookup(bn, key);
      return typeof value === 'string' ? interpolate(value, vars) : key;
    },
    [lang]
  );

  /** Picks the language-appropriate field of bilingual content, e.g. name/name_bn. */
  const localName = useCallback(
    (item, field = 'name') => (lang === 'bn' ? item?.[`${field}_bn`] || item?.[field] : item?.[field] || item?.[`${field}_bn`]) || '',
    [lang]
  );

  /** Settings like hero_title have optional *_en variants for the English site. */
  const setting = useCallback(
    (settings, key, fallbackKey) => {
      if (lang !== 'bn' && settings?.[`${key}_${lang}`]) return settings[`${key}_${lang}`];
      if (lang !== 'bn' && fallbackKey) return t(fallbackKey);
      return settings?.[key] || (fallbackKey ? t(fallbackKey) : '');
    },
    [lang, t]
  );

  const value = useMemo(() => ({ lang, setLang, t, localName, setting, languages: LANGUAGES }), [lang, setLang, t, localName, setting]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
};
