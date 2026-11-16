import { useI18n } from '../../i18n';

/** First-time introduction, shown once before the first daily challenge. */
export function IntroScreen({ onPractice, onStart }: { onPractice: () => void; onStart: () => void }) {
  const { t } = useI18n();
  const steps = [
    { key: 'intro.one', art: <TapArt /> },
    { key: 'intro.two', art: <ClockArt /> },
    { key: 'intro.three', art: <TrophyArt /> },
  ] as const;
  return (
    <main className="screen intro" aria-labelledby="intro-title">
      <p className="kicker">{t('intro.lead')}</p>
      <h1 id="intro-title" className="intro__title">
        {t('intro.title')}
      </h1>
      <ol className="intro__steps">
        {steps.map((s, i) => (
          <li key={s.key} className="intro__step">
            <span className="intro__num hand" aria-hidden="true">
              {i + 1}
            </span>
            <span className="intro__art" aria-hidden="true">
              {s.art}
            </span>
            <p>{t(s.key)}</p>
          </li>
        ))}
      </ol>
      <div className="intro__actions">
        <button className="btn btn--primary btn--lg btn--block" onClick={onStart}>
          {t('intro.start')}
        </button>
        <button className="btn btn--ghost btn--block" onClick={onPractice}>
          {t('intro.practice')}
        </button>
        <p className="fineprint">{t('intro.practiceNote')}</p>
      </div>
    </main>
  );
}

const art = {
  width: 52,
  height: 52,
  viewBox: '0 0 52 52',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function TapArt() {
  return (
    <svg {...art}>
      <path d="M44 25.6c-.2 10-8.3 17.8-18.2 17.6C15.9 43 8 34.9 8.2 25 8.4 15.3 16.6 7.5 26.5 7.8 36.2 8.1 43.9 16 44 25.6" />
      <path className="intro__pen" d="M20 26h12M26 20v12" />
    </svg>
  );
}
function ClockArt() {
  return (
    <svg {...art}>
      <path d="M42.5 28c-.2 9-7.6 16-16.4 15.8-8.9-.2-16-7.5-15.8-16.4.2-8.7 7.6-15.8 16.5-15.6 8.7.2 15.7 7.3 15.7 16.2" />
      <path d="M26.3 18.5V28l6 4M21 6.5h10" />
    </svg>
  );
}
function TrophyArt() {
  return (
    <svg {...art}>
      <path d="M17 9.5h18v11a9 9 0 0 1-18 0v-11Z" />
      <path d="M17 13h-6c0 6 2.6 9 6.8 9.6M35 13h6c0 6-2.6 9-6.8 9.6M26 29.5V37M19 44h14M22 37.5h8" />
    </svg>
  );
}
