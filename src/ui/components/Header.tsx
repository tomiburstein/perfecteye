import { LANGS, useI18n, type Lang } from '../../i18n';
import { HelpIcon, MoonIcon, StatsIcon, SunIcon } from './Icons';
import { Logo } from './Logo';

export function Header({
  dark,
  onHome,
  onHelp,
  onStats,
  onToggleTheme,
  onLang,
}: {
  dark: boolean;
  onHome: () => void;
  onHelp: () => void;
  onStats: () => void;
  onToggleTheme: () => void;
  onLang: (lang: Lang) => void;
}) {
  const { t, lang } = useI18n();
  return (
    <header className="topbar">
      <button className="topbar__brand" onClick={onHome} aria-label={t('header.home')}>
        <Logo />
      </button>
      <nav className="topbar__actions">
        <button className="icon-btn" onClick={onHelp} aria-label={t('header.help')} title={t('header.help')}>
          <HelpIcon />
        </button>
        <button className="icon-btn" onClick={onStats} aria-label={t('header.stats')} title={t('header.stats')}>
          <StatsIcon />
        </button>
        <button
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label={dark ? t('header.toLight') : t('header.toDark')}
          title={dark ? t('header.toLight') : t('header.toDark')}
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
        <div className="lang" role="group" aria-label={t('header.language')}>
          {LANGS.map((l) => (
            <button
              key={l}
              className={`lang__btn${l === lang ? ' is-active' : ''}`}
              aria-pressed={l === lang}
              onClick={() => onLang(l)}
              lang={l}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </nav>
    </header>
  );
}
