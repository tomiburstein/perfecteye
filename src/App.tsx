import { useCallback, useEffect, useMemo, useState } from 'react';
import { I18nProvider, createI18n, detectLang, translate, useI18n, type Lang } from './i18n';
import { toDayKey, type DayKey } from './platform/date';
import { loadSettings, saveSettings, type Settings } from './platform/settings';
import { createBrowserStore, isPersistentStorageAvailable } from './platform/storage';
import { newPracticeId } from './games/classic/generator';
import {
  answersOf,
  findResumableDay,
  isFinished,
  loadHistory,
  loadPracticeHistory,
  loadProgress,
} from './games/classic/persistence';
import { loadPlayer, savePlayerName, type Player } from './platform/player';
import { BoardsScreen } from './ui/screens/BoardsScreen';
import { IntroScreen } from './ui/screens/IntroScreen';
import { PrivacyScreen } from './ui/screens/PrivacyScreen';
import { ContactScreen } from './ui/screens/ContactScreen';
import { AdminScreen } from './ui/screens/AdminScreen';
import { sendPracticeFinished, sendVisit } from './platform/api';
import { readJson, writeJson } from './platform/storage';
import type { GameRef } from './games/classic/types';
import { Header } from './ui/components/Header';
import { HelpDialog } from './ui/components/HelpDialog';
import { usePrefersDark } from './ui/hooks';
import { GameScreen } from './ui/screens/GameScreen';
import { HomeScreen } from './ui/screens/HomeScreen';
import { ResultsScreen } from './ui/screens/ResultsScreen';

type Screen =
  | { name: 'home' }
  | { name: 'game'; game: GameRef }
  | { name: 'results'; game: GameRef; scores: number[] }
  | { name: 'boards' }
  | { name: 'intro' };

/** Pages reachable by link (#privacy, #contact, #admin). */
type Page = 'privacy' | 'contact' | 'admin';
const PAGES: readonly Page[] = ['privacy', 'contact', 'admin'];
function pageFromHash(): Page | null {
  const h = window.location.hash.replace('#', '');
  return (PAGES as readonly string[]).includes(h) ? (h as Page) : null;
}
const LAST_VISIT_KEY = 'perfecteye.lastVisit';

/** Current UTC day; re-renders only when the day actually changes. */
function useToday(): DayKey {
  const [day, setDay] = useState(() => toDayKey(new Date()));
  useEffect(() => {
    const id = window.setInterval(() => setDay(toDayKey(new Date())), 1000);
    return () => window.clearInterval(id);
  }, []);
  return day;
}

export function App() {
  const store = useMemo(() => createBrowserStore(), []);
  const [settings, setSettings] = useState<Settings>(() => loadSettings(store));
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [modal, setModal] = useState<'help' | null>(null);
  const today = useToday();
  const [page, setPage] = useState<Page | null>(() => pageFromHash());
  useEffect(() => {
    const onHash = () => {
      setPage(pageFromHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const prefersDark = usePrefersDark();

  const lang: Lang = settings.lang ?? detectLang(navigator.languages ?? [navigator.language]);
  const dark = settings.theme ? settings.theme === 'dark' : prefersDark;
  const [player, setPlayer] = useState<Player>(() => loadPlayer(store, translate(lang, 'player.defaultName')));
  const rename = (name: string) => setPlayer((p) => savePlayerName(store, p, name));

  // Count unique visitors per day (anonymous id, once per day per device).
  useEffect(() => {
    if (readJson(store, LAST_VISIT_KEY) === today) return;
    writeJson(store, LAST_VISIT_KEY, today);
    sendVisit(today, player.id);
  }, [store, today, player.id]);

  const updateSettings = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(store, next);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#171c19' : '#e7e8e0');
  }, [dark]);

  useEffect(() => {
    const i18n = createI18n(lang);
    document.documentElement.lang = lang;
    document.title = i18n.t('meta.title');
    document.querySelector('meta[name="description"]')?.setAttribute('content', i18n.t('meta.description'));
  }, [lang]);

  // Mobile "back" gesture returns to the home screen instead of leaving the site.
  useEffect(() => {
    const onPop = () => setScreen({ name: 'home' });
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = useCallback((next: Screen) => {
    if (pageFromHash()) {
      try {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      } catch {
        window.location.hash = '';
      }
      setPage(null);
    }
    setScreen((prev) => {
      if (prev.name === 'home' && next.name !== 'home') {
        try {
          window.history.pushState({ pe: next.name }, '');
        } catch {
          /* history not available (e.g. embedded preview): back button just won't be intercepted */
        }
      }
      return next;
    });
    window.scrollTo({ top: 0 });
  }, []);

  const goHome = useCallback(() => {
    if (pageFromHash()) {
      window.location.hash = '';
      setScreen({ name: 'home' });
      return;
    }
    let viaHistory = false;
    try {
      viaHistory = Boolean(window.history.state?.pe);
    } catch {
      /* ignore */
    }
    if (viaHistory) window.history.back();
    else setScreen({ name: 'home' });
  }, []);

  const onFinish = useCallback(
    (game: GameRef, scores: number[]) => {
      if (game.kind === 'practice') sendPracticeFinished(game.day, player.id);
      go({ name: 'results', game, scores });
    },
    [go, player.id],
  );
  const startDaily = useCallback((day: DayKey) => go({ name: 'game', game: { kind: 'daily', day } }), [go]);
  const playPractice = useCallback(
    () => go({ name: 'game', game: { kind: 'practice', id: newPracticeId(), day: toDayKey(new Date()) } }),
    [go],
  );
  // First visit: a short introduction before the first daily challenge.
  const playDaily = (day: DayKey) => (settings.onboarded ? startDaily(day) : go({ name: 'intro' }));
  const finishIntro = (then: () => void) => {
    updateSettings({ onboarded: true });
    then();
  };

  // Fresh reads from storage whenever the screen or the day changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const history = useMemo(() => loadHistory(store), [store, screen, today, modal]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const todayProgress = useMemo(() => loadProgress(store, today), [store, screen, today]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const practiceHistory = useMemo(() => loadPracticeHistory(store), [store, screen]);
  const dailyAnswers = useMemo(() => {
    if (screen.name !== 'results' || screen.game.kind !== 'daily') return null;
    const p = loadProgress(store, screen.game.day);
    return p && isFinished(p) ? answersOf(p) : null;
  }, [store, screen]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const resumableDay = useMemo(() => findResumableDay(store, today), [store, screen, today]);

  return (
    <I18nProvider lang={lang}>
      <div className="app">
        <Header
          dark={dark}
          onHome={goHome}
          onHelp={() => setModal('help')}
          onStats={() => go({ name: 'boards' })}
          onToggleTheme={() => updateSettings({ theme: dark ? 'light' : 'dark' })}
          onLang={(l) => updateSettings({ lang: l })}
        />
        {!isPersistentStorageAvailable() && <StorageWarning />}

        {page === 'privacy' && <PrivacyScreen />}
        {page === 'contact' && <ContactScreen player={player} />}
        {page === 'admin' && <AdminScreen />}

        {!page && screen.name === 'home' && (
          <HomeScreen
            today={today}
            history={history}
            todayProgress={todayProgress}
            resumableDay={resumableDay}
            onPlay={playDaily}
            onPractice={playPractice}
            onResults={(day) => go({ name: 'results', game: { kind: 'daily', day }, scores: history[day]?.scores ?? [] })}
          />
        )}
        {!page && screen.name === 'game' && (
          <GameScreen
            key={screen.game.kind === 'daily' ? screen.game.day : screen.game.id}
            game={screen.game}
            store={store}
            onFinish={onFinish}
            onExit={goHome}
          />
        )}
        {!page && screen.name === 'results' && (
          <ResultsScreen
            game={screen.game}
            scores={screen.scores}
            today={today}
            history={history}
            onHome={goHome}
            onPractice={playPractice}
            onDaily={() => playDaily(today)}
            player={player}
            answers={dailyAnswers}
            onRename={rename}
          />
        )}
        {!page && screen.name === 'intro' && (
          <IntroScreen onStart={() => finishIntro(() => startDaily(today))} onPractice={() => finishIntro(playPractice)} />
        )}
        {!page && screen.name === 'boards' && (
          <BoardsScreen today={today} player={player} history={history} practice={practiceHistory} />
        )}

        <Footer />
        <HelpDialog open={modal === 'help'} onClose={() => setModal(null)} />
      </div>
    </I18nProvider>
  );
}

function StorageWarning() {
  const { t } = useI18n();
  return (
    <p className="banner" role="alert">
      {t('error.storage')}
    </p>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="footer">
      <nav className="footer__links">
        <a href="#privacy">{t('footer.privacy')}</a>
        <span aria-hidden="true">·</span>
        <a href="#contact">{t('footer.contact')}</a>
      </nav>
      <p>{t('footer.note')}</p>
    </footer>
  );
}
