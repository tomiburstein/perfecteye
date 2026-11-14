import { useMemo } from 'react';
import { useI18n } from '../../i18n';
import type { DayKey } from '../../platform/date';
import { gradeKey } from '../../games/classic/describe';
import type { History } from '../../games/classic/persistence';
import { computeStats } from '../../games/classic/stats';
import { MAX_TOTAL_SCORE, ROUND_IDS, type AnyAnswer, type GameRef } from '../../games/classic/types';
import { AdSlot } from '../components/AdSlot';
import { Countdown } from '../components/Countdown';
import { RoundGlyph } from '../components/RoundGlyph';
import { ShareBox } from '../components/ShareBox';
import { WorldStanding } from '../components/WorldStanding';
import type { Player } from '../../platform/player';
import { useCountUp } from '../hooks';

interface Props {
  game: GameRef;
  scores: number[];
  today: DayKey;
  history: History;
  onHome: () => void;
  onPractice: () => void;
  onDaily: () => void;
  player: Player;
  /** Answers of the daily game, when still stored on this device. */
  answers: (AnyAnswer | null)[] | null;
  onRename: (name: string) => void;
}

function ScoreRows({ scores }: { scores: number[] }) {
  const { t } = useI18n();
  return (
    <ul className="rows">
      {ROUND_IDS.map((id, i) => (
        <li key={id} className="row" style={{ animationDelay: `${i * 60}ms` }}>
          <span className="row__name">
            <RoundGlyph id={id} size={22} /> <span>{t(`round.${id}.name`)}</span>
          </span>
          <span className="row__bar" aria-hidden="true">
            <span style={{ width: `${scores[i]}%` }} />
          </span>
          <span className="row__score">{scores[i]}</span>
        </li>
      ))}
    </ul>
  );
}

function Total({ total }: { total: number }) {
  const { t } = useI18n();
  const shown = useCountUp(total, 900);
  return (
    <>
      <h1 id="results-title" className="sr-only">
        {t('results.total')}: {total}/{MAX_TOTAL_SCORE}
      </h1>
      <div className="total" aria-hidden="true">
        <span className="total__num">{shown}</span>
        <span className="total__max">/{MAX_TOTAL_SCORE}</span>
      </div>
      <p className="total__label">
        {t('results.total')} ·{' '}
        <span className="hand total__remark">{t(gradeKey(Math.round(total / 5)))}</span>
      </p>
    </>
  );
}

export function ResultsScreen(props: Props) {
  return props.game.kind === 'daily' ? <DailyResults {...props} day={props.game.day} /> : <PracticeResults {...props} />;
}

function PracticeResults({ scores, today, history, onHome, onPractice, onDaily }: Props) {
  const { t } = useI18n();
  const total = scores.reduce((a, b) => a + b, 0);
  const dailyDone = Boolean(history[today]);
  return (
    <main className="screen results" aria-labelledby="results-title">
      <p className="kicker">{t('results.practiceTitle')}</p>
      <Total total={total} />
      <ScoreRows scores={scores} />
      <div className="results__actions">
        <button className="btn btn--primary btn--lg btn--block" onClick={onPractice}>
          {t('results.playAgain')}
        </button>
        {!dailyDone && (
          <button className="btn btn--ghost btn--block" onClick={onDaily}>
            {t('results.toDaily')}
          </button>
        )}
        <button className="btn btn--ghost btn--block" onClick={onHome}>
          {t('results.home')}
        </button>
      </div>
      <p className="fineprint">{t('results.practiceNote')}</p>
    </main>
  );
}

function DailyResults({ day, today, history, onHome, onPractice, player, answers, onRename }: Props & { day: DayKey }) {
  const { t, num } = useI18n();
  const entry = history[day];
  const stats = useMemo(() => computeStats(history, today), [history, today]);
  const previous = useMemo(() => {
    const others = Object.values(history).filter((e) => e.day !== day);
    if (!others.length) return null;
    return {
      average: others.reduce((a, e) => a + e.total, 0) / others.length,
      best: Math.max(...others.map((e) => e.total)),
    };
  }, [history, day]);

  if (!entry) return null;

  const diff = previous ? entry.total - previous.average : 0;

  return (
    <main className="screen results" aria-labelledby="results-title">
      <p className="kicker">{t('results.title', { n: entry.number })}</p>
      <Total total={entry.total} />
      <ScoreRows scores={entry.scores} />

      <WorldStanding day={day} player={player} answers={answers} onRename={onRename} />

      <div className="compare">
        <div className="compare__item">
          <span className="compare__value">{stats.currentStreak}</span>
          <span className="compare__label">{t('results.streak')}</span>
        </div>
        <div className="compare__text">
          {!previous && <p>{t('results.firstGame')}</p>}
          {previous && entry.total > previous.best && <p className="accent">{t('results.newBest')}</p>}
          {previous && entry.total <= previous.best && <p>{t('results.best', { best: previous.best })}</p>}
          {previous && (
            <p>
              {t('results.vsAverage', {
                diff: `${diff >= 0 ? '+' : '−'}${num(Math.abs(diff), 0)}`,
                avg: num(previous.average, 0),
              })}
            </p>
          )}
        </div>
      </div>

      <ShareBox number={entry.number} scores={entry.scores} />

      <Countdown />
      <AdSlot placement="results" />
      <div className="results__actions">
        <button className="btn btn--primary btn--block" onClick={onPractice}>
          {t('results.playAgain')} · {t('mode.practice')}
        </button>
        <button className="btn btn--ghost btn--block" onClick={onHome}>
          {t('results.home')}
        </button>
      </div>
    </main>
  );
}
