import { useI18n } from '../../i18n';
import type { DayKey } from '../../platform/date';
import { challengeNumber } from '../../games/classic/config';
import type { GameProgress, History } from '../../games/classic/persistence';
import { ROUND_EMOJI } from '../../games/classic/share';
import { ROUND_IDS } from '../../games/classic/types';
import { AdSlot } from '../components/AdSlot';
import { Countdown, useLocalResetTime } from '../components/Countdown';
import { LogoMark } from '../components/Logo';

interface Props {
  today: DayKey;
  history: History;
  todayProgress: GameProgress | null;
  resumableDay: DayKey | null;
  onPlay: (day: DayKey) => void;
  onResults: (day: DayKey) => void;
}

export function HomeScreen({ today, history, todayProgress, resumableDay, onPlay, onResults }: Props) {
  const { t } = useI18n();
  const resetLocal = useLocalResetTime();
  const done = history[today];
  const started = todayProgress?.rounds.some((r) => r !== null) ?? false;

  return (
    <main className="screen home">
      <section className="hero">
        <div className="hero__mark">
          <LogoMark size={76} />
        </div>
        <p className="kicker">{t('home.challenge', { n: challengeNumber(today) })}</p>
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

        {done ? (
          <>
            <p className="hero__done">{t('home.doneToday', { score: done.total })}</p>
            <button className="btn btn--primary btn--lg btn--cta" onClick={() => onResults(today)}>
              {t('home.results')}
            </button>
          </>
        ) : (
          <button className="btn btn--primary btn--lg btn--cta" onClick={() => onPlay(today)}>
            {started ? t('home.continue') : t('home.play')}
          </button>
        )}
        <p className="hero__meta">{t('home.meta')}</p>
      </section>

      <section className="tests" aria-labelledby="tests-title">
        <h2 id="tests-title" className="section-title">
          {t('home.testsTitle')}
        </h2>
        <ol className="tests__list">
          {ROUND_IDS.map((id) => (
            <li key={id} className="tests__item">
              <span className="tests__emoji" aria-hidden="true">
                {ROUND_EMOJI[id]}
              </span>
              <span>
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
