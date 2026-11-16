import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n';
import { fetchDay, type ApiResult } from '../../platform/api';
import { dayKeyToMs, type DayKey } from '../../platform/date';
import type { Player } from '../../platform/player';
import type { History, PracticeEntry } from '../../games/classic/persistence';
import { ROUND_IDS } from '../../games/classic/types';
import { RoundGlyph } from '../components/RoundGlyph';
import { StatsPanel } from '../components/StatsPanel';

interface Props {
  today: DayKey;
  player: Player;
  history: History;
  practice: PracticeEntry[];
}

export type BoardsTab = 'world' | 'mine' | 'stats';

export function BoardsScreen({ today, player, history, practice }: Props) {
  const { t } = useI18n();
  const [tab, setTab] = useState<BoardsTab>('world');
  const label: Record<BoardsTab, 'boards.world' | 'boards.mine' | 'stats.title'> = {
    world: 'boards.world',
    mine: 'boards.mine',
    stats: 'stats.title',
  };
  return (
    <main className="screen boards" aria-labelledby="boards-title">
      <h1 id="boards-title" className="boards__title">
        {t('boards.title')}
      </h1>
      <div className="tabs" role="tablist">
        {(['world', 'mine', 'stats'] as const).map((id) => (
          <button
            key={id}
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            className={`tabs__btn${tab === id ? ' is-active' : ''}`}
            onClick={() => setTab(id)}
          >
            {t(label[id])}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'world' && <WorldBoard today={today} player={player} />}
        {tab === 'mine' && <MyGames history={history} practice={practice} />}
        {tab === 'stats' && <StatsPanel history={history} today={today} />}
      </div>
    </main>
  );
}

function WorldBoard({ today, player }: { today: DayKey; player: Player }) {
  const { t } = useI18n();
  const [state, setState] = useState<ApiResult | null>(null);
  const load = async () => {
    setState(null);
    setState(await fetchDay(today, player.id));
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, player.id]);

  if (state === null) return <p className="world__status">{t('world.loading')}</p>;
  if (!state.ok)
    return (
      <div className="world__status">
        <p>{t(state.reason === 'offline' ? 'world.offline' : 'world.unavailable')}</p>
        <button className="btn btn--ghost btn--sm" onClick={() => void load()}>
          {t('world.retry')}
        </button>
      </div>
    );
  const { summary } = state;
  if (summary.players === 0) return <p className="world__status">{t('boards.empty')}</p>;
  const meInTop = summary.top.some((r) => r.me);
  return (
    <>
      <p className="boards__meta">
        {summary.players === 1 ? t('boards.players1') : t('boards.players', { n: summary.players })}
      </p>
      <ol className="ranking">
        {summary.top.map((r, i) => (
          <li key={`${r.rank}-${i}`} className={`ranking__row${r.me ? ' is-me' : ''}`}>
            <span className="ranking__rank">{r.rank}</span>
            <span className="ranking__name">
              {r.name}
              {r.me && <span className="hand ranking__you"> ← {t('boards.you')}</span>}
            </span>
            <span className="ranking__total">{r.total}</span>
          </li>
        ))}
      </ol>
      {summary.me && !meInTop && (
        <div className="ranking__row is-me ranking__mine">
          <span className="ranking__rank">{summary.me.rank}</span>
          <span className="ranking__name">
            {summary.me.name}
            <span className="hand ranking__you"> ← {t('boards.you')}</span>
          </span>
          <span className="ranking__total">{summary.me.total}</span>
        </div>
      )}
    </>
  );
}

interface Game {
  key: string;
  label: string;
  when: number;
  dayLabel: string;
  scores: number[];
  total: number;
  daily: boolean;
}

function MyGames({ history, practice }: { history: History; practice: PracticeEntry[] }) {
  const { t, lang } = useI18n();
  const [sort, setSort] = useState<'recent' | 'best'>('recent');
  const fmt = useMemo(
    () => new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }),
    [lang],
  );
  const games: Game[] = useMemo(() => {
    const all: Game[] = [
      ...Object.values(history).map((e) => ({
        key: `d-${e.day}`,
        label: t('boards.daily', { n: e.number }),
        when: e.finishedAt,
        dayLabel: fmt.format(new Date(dayKeyToMs(e.day))),
        scores: e.scores,
        total: e.total,
        daily: true,
      })),
      ...practice.map((e) => ({
        key: `p-${e.id}`,
        label: t('boards.practice'),
        when: e.finishedAt,
        dayLabel: fmt.format(new Date(dayKeyToMs(e.day))),
        scores: e.scores,
        total: e.total,
        daily: false,
      })),
    ];
    return all.sort((a, b) => (sort === 'best' ? b.total - a.total || b.when - a.when : b.when - a.when));
  }, [history, practice, sort, t, fmt]);

  if (!games.length) return <p className="world__status">{t('boards.mineEmpty')}</p>;

  return (
    <>
      <div className="seg" role="group">
        {(['recent', 'best'] as const).map((s) => (
          <button key={s} className={`seg__btn${sort === s ? ' is-active' : ''}`} aria-pressed={sort === s} onClick={() => setSort(s)}>
            {t(s === 'recent' ? 'boards.recent' : 'boards.best')}
          </button>
        ))}
      </div>
      <ol className="games">
        {games.map((g) => (
          <li key={g.key} className={`games__row${g.daily ? ' is-daily' : ''}`}>
            <div className="games__info">
              <strong>{g.label}</strong>
              <span>{g.dayLabel}</span>
            </div>
            <ul className="games__scores">
              {ROUND_IDS.map((id, i) => (
                <li key={id} title={t(`round.${id}.name`)}>
                  <RoundGlyph id={id} size={14} />
                  <span>{g.scores[i]}</span>
                </li>
              ))}
            </ul>
            <span className="games__total">{g.total}</span>
          </li>
        ))}
      </ol>
    </>
  );
}
