import { useI18n } from '../../i18n';
import { dayKeyToMs, type DayKey } from '../../platform/date';
import { challengeNumber } from '../../games/classic/config';
import type { GameProgress, History } from '../../games/classic/persistence';
import { ROUND_IDS } from '../../games/classic/types';
import { AdSlot } from '../components/AdSlot';
import { Countdown, useLocalResetTime } from '../components/Countdown';
import { RoundGlyph } from '../components/RoundGlyph';

interface Props {
  today: DayKey;
  history: History;
  todayProgress: GameProgress | null;
  resumableDay: DayKey | null;
  onPlay: (day: DayKey) => void;
  onPractice: () => void;
  onResults: (day: DayKey) => void;
}

/** Hand-drawn arrow pointing from the margin note to the button. */
function NoteArrow() {
  return (
    <svg className="note__arrow" width="46" height="34" viewBox="0 0 46 34" aria-hidden="true">
      <path d="M44 30C33 31 17 27 8 9" />
      <path d="M3.5 15.5 7.6 7.8l8.3 3.3" />
    </svg>
  );
}

export function HomeScreen({ today, history, todayProgress, resumableDay, onPlay, onPractice, onResults }: Props) {
  const { t, lang } = useI18n();
  const resetLocal = useLocalResetTime();
  const done = history[today];
  const started =
    (todayProgress?.rounds.some((r) => r !== null) || todayProgress?.inputStartedAt.some((t) => t !== null)) ?? false;
  const dateLabel = new Intl.DateTimeFormat(lang, {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(dayKeyToMs(today)));

  return (
    <main className="screen home">
      <section className="hero">
        <p className="kicker">
          {t('home.challenge', { n: challengeNumber(today) })} <span className="kicker__date">· {dateLabel}</span>
        </p>
        <h1 className="hero__title">{t('home.title')}</h1>
        <p className="hero__desc">{t('home.description')}</p>

        {resumableDay && !done && (
          <div className="notice">
            <span>{t('home.resume', { n: challengeNumber(resumableDay) })}</span>
            <button className="btn btn--ghost btn--sm" onClick={() => onPlay(resumableDay)}>
              {t('home.resumeCta')}
            </button>
          </div>
        )}

        <div className="hero__action">
          {done ? (
            <div className="hero__done-wrap">
              <p className="hero__done">{t('home.doneToday', { score: done.total })}</p>
              <button className="btn btn--primary btn--lg btn--cta" onClick={() => onResults(today)}>
                {t('home.results')}
              </button>
            </div>
          ) : (
            <button className="btn btn--primary btn--lg btn--cta" onClick={() => onPlay(today)}>
              {started ? t('home.continue') : t('home.play')}
            </button>
          )}
          <p className="note hand">
            <NoteArrow />
            <span>
              {t('home.note')}
              <br />
              {t('home.meta')}
            </span>
          </p>
        </div>
      </section>

      <section className="practice" aria-labelledby="practice-title">
        <div className="practice__text">
          <h2 id="practice-title" className="practice__title">
            {t('home.practice')}
          </h2>
          <p>{t('home.practiceDesc')}</p>
        </div>
        <button className="btn btn--ghost" onClick={onPractice}>
          {t('home.practiceCta')}
        </button>
      </section>

      <section className="tests" aria-labelledby="tests-title">
        <h2 id="tests-title" className="section-title">
          {t('home.testsTitle')}
        </h2>
        <ol className="tests__list">
          {ROUND_IDS.map((id, i) => (
            <li key={id} className="tests__item">
              <span className="tests__num hand" aria-hidden="true">
                {i + 1}
              </span>
              <RoundGlyph id={id} />
              <span className="tests__text">
                <strong>{t(`round.${id}.name`)}</strong>
                <span className="tests__desc">{t(`round.${id}.summary`)}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="home__clock">
        <Countdown />
        <p className="fineprint">{t('home.resetInfo', { local: resetLocal })}</p>
      </section>
      <AdSlot placement="home" />
    </main>
  );
}
