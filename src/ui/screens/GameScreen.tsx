import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import type { DayKey } from '../../platform/date';
import type { KeyValueStore } from '../../platform/storage';
import { describeError, gradeKey } from '../../games/classic/describe';
import { evaluateRound } from '../../games/classic/evaluate';
import { generateDailyChallenge } from '../../games/classic/generator';
import {
  confirmRound,
  currentRoundIndex,
  isFinished,
  loadProgress,
  markPreviewed,
  newProgress,
  recordFinished,
  saveProgress,
  type GameProgress,
} from '../../games/classic/persistence';
import { ROUNDS, type RoundMode } from '../../games/classic/rounds';
import { ROUND_EMOJI } from '../../games/classic/share';
import {
  ROUND_COUNT,
  ROUND_IDS,
  type AnswerMap,
  type DailyChallenge,
  type RoundId,
} from '../../games/classic/types';
import { useCountUp } from '../hooks';
import { BackIcon } from '../components/Icons';

interface Props {
  day: DayKey;
  store: KeyValueStore;
  onFinish: (day: DayKey) => void;
  onExit: () => void;
}

export function GameScreen({ day, store, onFinish, onExit }: Props) {
  const { t } = useI18n();
  // The day is fixed for the whole game, even if midnight UTC passes.
  const challenge = useMemo(() => generateDailyChallenge(day), [day]);
  const [progress, setProgress] = useState<GameProgress>(
    () => loadProgress(store, day) ?? newProgress(day, Date.now()),
  );
  const [view, setView] = useState(() => currentRoundIndex(progress));

  useEffect(() => saveProgress(store, progress), [store, progress]);

  useEffect(() => {
    if (view >= ROUND_COUNT && isFinished(progress)) onFinish(day);
  }, [view, progress, day, onFinish]);

  if (view >= ROUND_COUNT) return null;

  const id = ROUND_IDS[view];

  const update = (next: GameProgress) => {
    setProgress(next);
    saveProgress(store, next); // write immediately: a reload must not allow a retry
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
          if (isFinished(next)) recordFinished(store, next, Date.now());
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
          <span aria-hidden="true">{ROUND_EMOJI[id]}</span> {t(`round.${id}.name`)}
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
        <strong>{t(gradeKey(score))}</strong>
        <span>{text}</span>
        <span className="legend">
          <i className="legend__dot legend__dot--user" /> {t('game.legendYours')}
          <i className="legend__dot legend__dot--target" /> {t('game.legendTarget')}
        </span>
      </div>
    </div>
  );
}
