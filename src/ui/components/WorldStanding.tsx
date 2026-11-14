import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useI18n } from '../../i18n';
import { submitDay, fetchDay, type ApiResult } from '../../platform/api';
import type { DayKey } from '../../platform/date';
import type { Player } from '../../platform/player';
import { cleanName } from '../../games/classic/submission';
import { ROUND_IDS, type AnyAnswer } from '../../games/classic/types';
import { RoundGlyph } from './RoundGlyph';

interface Props {
  day: DayKey;
  player: Player;
  /** Answers of the finished game, if still on this device (needed to submit). */
  answers: (AnyAnswer | null)[] | null;
  onRename: (name: string) => void;
}

/** "Where am I in the world today": percentile overall and per test. */
export function WorldStanding({ day, player, answers, onRename }: Props) {
  const { t } = useI18n();
  const [state, setState] = useState<ApiResult | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(player.name);
  const [nameError, setNameError] = useState(false);

  const load = useCallback(
    async (name: string) => {
      setState(null);
      setState(answers ? await submitDay(day, player.id, name, answers) : await fetchDay(day, player.id));
    },
    [day, player.id, answers],
  );

  useEffect(() => {
    void load(player.name);
    // Only on mount / when the game changes; renames call load() themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, player.id]);

  const saveName = (e: FormEvent) => {
    e.preventDefault();
    const clean = cleanName(draftName);
    if (!clean) {
      setNameError(true);
      return;
    }
    setNameError(false);
    setEditing(false);
    onRename(clean);
    void load(clean);
  };

  const me = state?.ok ? state.summary.me : null;

  return (
    <section className="world" aria-labelledby="world-title" aria-busy={state === null}>
      <h2 id="world-title" className="section-title">
        {t('world.title')}
      </h2>

      {state === null && <p className="world__status">{t('world.loading')}</p>}

      {state && !state.ok && (
        <div className="world__status">
          <p>{t(state.reason === 'offline' ? 'world.offline' : 'world.unavailable')}</p>
          <button className="btn btn--ghost btn--sm" onClick={() => void load(player.name)}>
            {t('world.retry')}
          </button>
        </div>
      )}

      {state?.ok && me && (
        <>
          <div className="world__head">
            {me.percentiles.total === null ? (
              <p className="world__big">{t('world.first')}</p>
            ) : (
              <p className="world__big">
                {t('world.better', { p: me.percentiles.total })}
              </p>
            )}
            <p className="world__rank">{t('world.rank', { rank: me.rank, n: state.summary.players })}</p>
          </div>
          <ul className="world__rounds">
            {ROUND_IDS.map((id, i) => {
              const p = me.percentiles.rounds[i];
              return (
                <li key={id}>
                  <span className="world__name">
                    <RoundGlyph id={id} size={20} /> {t(`round.${id}.name`)}
                  </span>
                  <span className="world__meter" aria-hidden="true">
                    <span style={{ width: `${p ?? 100}%` }} />
                  </span>
                  <span className="world__pct">
                    {p === null ? t('world.firstShort') : t('world.betterShort', { p })}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div className="world__player">
        {editing ? (
          <form className="name-form" onSubmit={saveName}>
            <label htmlFor="player-name">{t('world.playingAs')}</label>
            <div className="name-form__row">
              <input
                id="player-name"
                value={draftName}
                maxLength={20}
                autoComplete="nickname"
                onChange={(e) => setDraftName(e.target.value)}
                aria-invalid={nameError}
                aria-describedby="player-name-help"
              />
              <button className="btn btn--primary btn--sm" type="submit">
                {t('world.save')}
              </button>
              <button className="btn btn--ghost btn--sm" type="button" onClick={() => setEditing(false)}>
                {t('world.cancel')}
              </button>
            </div>
            <p id="player-name-help" className={`fineprint${nameError ? ' is-error' : ''}`}>
              {nameError ? t('world.nameInvalid') : t('world.nameHelp')}
            </p>
          </form>
        ) : (
          <p className="world__as">
            {t('world.playingAs')}: <strong>{player.name}</strong>{' '}
            <button
              className="link-btn"
              onClick={() => {
                setDraftName(player.name);
                setEditing(true);
              }}
            >
              {t('world.change')}
            </button>
          </p>
        )}
        <p className="fineprint">{t('world.privacy')}</p>
      </div>
    </section>
  );
}
