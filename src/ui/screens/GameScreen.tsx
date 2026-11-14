import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import type { DayKey } from '../../platform/date';
import type { KeyValueStore } from '../../platform/storage';
import { describeError, gradeKey } from '../../games/classic/describe';
import { evaluateRound } from '../../games/classic/evaluate';
import { generateDailyChallenge, generatePracticeChallenge } from '../../games/classic/generator';
import {
  confirmRound,
  currentRoundIndex,
  isFinished,
  loadProgress,
  markPreviewed,
  newProgress,
  recordFinished,
  saveProgress,
  scoresFor,
  type GameProgress,
} from '../../games/classic/persistence';
import { ROUNDS, type RoundMode } from '../../games/classic/rounds';
import {
  ROUND_COUNT,
  ROUND_IDS,
  type AnswerMap,
  type DailyChallenge,
  type GameRef,
  type RoundId,
} from '../../games/classic/types';
import { useCountUp } from '../hooks';
import { BackIcon } from '../components/Icons';
import { RoundGlyph } from '../components/RoundGlyph';

interface Props {
  game: GameRef;
  store: KeyValueStore;
  onFinish: (game: GameRef, scores: number[]) => void;
  onExit: () => void;
}

export function GameScreen({ game, store, onFinish, onExit }: Props) {
  const { t } = useI18n();
  const daily = game.kind === 'daily';
  const day: DayKey = game.day;
  // The game is fixed for its whole duration, even if midnight UTC passes.
  const challenge = useMemo(
    () => (game.kind === 'daily' ? generateDailyChallenge(game.day) : generatePracticeChallenge(game.id, game.day)),
    [game],
  );
  // Only the daily challenge is saved: free play is unlimited and never counted.
  const [progress, setProgress] = useState<GameProgress>(
    () => (daily ? loadProgress(store, day) : null) ?? newProgress(day, Date.now()),
  );
  const [view, setView] = useState(() => currentRoundIndex(progress));

  useEffect(() => {
    if (daily) saveProgress(store, progress);
  }, [daily, store, progress]);

  useEffect(() => {
    if (view >= ROUND_COUNT && isFinished(progress)) onFinish(game, scoresFor(challenge, progress) as number[]);
  }, [view, progress, game, challenge, onFinish]);

  if (view >= ROUND_COUNT) return null;

  const id = ROUND_IDS[view];

  const update = (next: GameProgress) => {
    setProgress(next);
    if (daily) saveProgress(store, next); // write immediately: a reload must not allow a retry
  };

  return (
    <main className="screen game" aria-labelledby="round-title">
      <div className="game__top">
        <button className="icon-btn" onClick={onExit} aria-label={t('game.back')}>
          <BackIcon />
        </button>
        <ol className="progress" aria-label={t('game.progress', { i: view + 1, n: ROUND_COUNT })}>
          {ROUND_IDS.map((rid, i) => (
            <li
              key={rid}
              className={`progress__seg${i < view || progress.rounds[i] ? ' is-done' : ''}${i === view ? ' is-current' : ''}`}
            />
          ))}
        </ol>
        <span className="game__count">
          {view + 1}/{ROUND_COUNT}
        </span>
      </div>
      {!daily && <p className="mode-tag hand">{t('mode.practice')}</p>}
      <RoundStage
        key={view}
        id={id}
        index={view}
        challenge={challenge}
        progress={progress}
        onPreviewStart={() => update(markPreviewed(progress, view))}
        onConfirm={(answer) => {
          const next = confirmRound(progress, view, answer, Date.now());
          if (!next) return;
          update(next);
          if (daily && isFinished(next)) recordFinished(store, next, Date.now());
        }}
        onNext={() => setView(view + 1)}
        isLast={view === ROUND_COUNT - 1}
      />
    </main>
  );
}

interface StageProps<K extends RoundId> {
  id: K;
  index: number;
  challenge: DailyChallenge;
  progress: GameProgress;
  onPreviewStart: () => void;
  onConfirm: (answer: AnswerMap[K]) => void;
  onNext: () => void;
  isLast: boolean;
}

function RoundStage<K extends RoundId>({
  id,
  index,
  challenge,
  progress,
  onPreviewStart,
  onConfirm,
  onNext,
  isLast,
}: StageProps<K>) {
  const i18n = useI18n();
  const { t } = i18n;
  const def = ROUNDS[id];
  const confirmed = progress.rounds[index];
  const hasPreview = def.previewMs !== undefined;
  const alreadyPreviewedOnMount = useRef(progress.previewed[index] && !confirmed);

  const [draft, setDraft] = useState<AnswerMap[K] | null>(() =>
    confirmed ? (confirmed.answer as AnswerMap[K]) : def.initialAnswer(challenge),
  );
  const [stage, setStage] = useState<RoundMode>(() => {
    if (confirmed) return 'result';
    if (hasPreview && !progress.previewed[index]) return 'ready';
    return 'input';
  });
  const nextBtn = useRef<HTMLButtonElement>(null);

  // Preview timer for memory rounds.
  useEffect(() => {
    if (stage !== 'preview' || !def.previewMs) return;
    const timer = window.setTimeout(() => setStage('input'), def.previewMs);
    return () => window.clearTimeout(timer);
  }, [stage, def.previewMs]);

  useEffect(() => {
    if (stage === 'result') nextBtn.current?.focus({ preventScroll: true });
  }, [stage]);

  const result = useMemo(
    () => (confirmed ? evaluateRound(challenge, id, confirmed.answer as AnswerMap[K]) : null),
    [confirmed, challenge, id],
  );

  const submit = () => {
    if (stage !== 'input' || !draft) return;
    onConfirm(draft);
    setStage('result');
  };

  const Board = def.Board;
  const instructions =
    (stage === 'ready' || stage === 'preview') && hasPreview
      ? t(`round.${id}.ready` as 'round.angle.ready')
      : t(`round.${id}.instructions`);

  return (
    <>
      <header className="game__head">
        <h1 id="round-title" className="game__title">
          <RoundGlyph id={id} size={28} />
          <span>{t(`round.${id}.name`)}</span>
        </h1>
        <p className="game__instructions">{instructions}</p>
      </header>

      <div className={`board-wrap board-wrap--${stage}`}>
        <Board
          challenge={challenge}
          mode={stage}
          answer={draft}
          onChange={setDraft}
          onSubmit={submit}
          result={result}
        />
        {stage === 'ready' && (
          <div className="board-overlay">
            <button
              className="btn btn--primary btn--lg"
              onClick={() => {
                onPreviewStart();
                setStage('preview');
              }}
            >
              {t('game.show')}
            </button>
          </div>
        )}
        {stage === 'preview' && (
          <div className="preview-timer" role="status">
            <span>{t('game.memorise')}</span>
            <span className="preview-timer__bar">
              <span style={{ animationDuration: `${def.previewMs}ms` }} />
            </span>
          </div>
        )}
      </div>

      <footer className="game__foot">
        {stage === 'result' && result ? (
          <ResultPanel id={id} score={result.score} text={describeError(i18n, id, result)} />
        ) : (
          <p className="game__hint" aria-live="polite">
            {stage === 'input' && alreadyPreviewedOnMount.current
              ? t('game.alreadyShown')
              : stage === 'input' && !draft
                ? t('game.placeFirst')
                : ' '}
          </p>
        )}
        {stage === 'input' && (
          <p className="kbd-hint">
            {t(id === 'shape' ? 'game.keysShape' : id === 'angle' ? 'game.keysAngle' : 'game.keys')}
          </p>
        )}
        {stage === 'result' ? (
          <button ref={nextBtn} className="btn btn--primary btn--lg btn--block" onClick={onNext}>
            {isLast ? t('game.finish') : t('game.next')}
          </button>
        ) : (
          <button
            className="btn btn--primary btn--lg btn--block"
            onClick={submit}
            disabled={stage !== 'input' || !draft}
          >
            {t('game.confirm')}
          </button>
        )}
      </footer>
    </>
  );
}

function ResultPanel({ id, score, text }: { id: RoundId; score: number; text: string }) {
  const { t } = useI18n();
  const shown = useCountUp(score);
  return (
    <div className="result" role="status" aria-live="polite" data-round={id}>
      <div className="result__score">
        <span className="result__num" aria-hidden="true">{shown}</span>
        <span className="result__max" aria-hidden="true">/100</span>
        <span className="sr-only">
          {score} {t('game.points')}
        </span>
      </div>
      <div className="result__text">
        <strong className="hand">{t(gradeKey(score))}</strong>
        <span>{text}</span>
        <span className="legend">
          <i className="legend__dot legend__dot--user" /> {t('game.legendYours')}
          <i className="legend__dot legend__dot--target" /> {t('game.legendTarget')}
        </span>
      </div>
    </div>
  );
}
