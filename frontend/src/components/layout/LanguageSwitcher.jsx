import { useI18n } from '../../i18n/index.jsx';

/** Native select: keyboard/screen-reader friendly, and it opens a proper picker on phones. */
const LanguageSwitcher = ({ className = '' }) => {
  const { lang, setLang, languages, t } = useI18n();
  return (
    <select
      className={`select lang-select ${className}`.trim()}
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      aria-label={t('common.language')}
      title={t('common.language')}
    >
      {languages.map((l) => (
        <option key={l.code} value={l.code} disabled={!l.enabled}>
          {l.label}
          {l.enabled ? '' : ` (${t('common.comingSoon')})`}
        </option>
      ))}
    </select>
  );
};

export default LanguageSwitcher;
