import { useCallback, useEffect, useMemo, useState } from 'react';
import { I18nProvider, createI18n, detectLang, useI18n, type Lang } from './i18n';
import { toDayKey, type DayKey } from './platform/date';
import { loadSettings, saveSettings, type Settings } from './platform/settings';
import { createBrowserStore, isPersistentStorageAvailable } from './platform/storage';
import { findResumableDay, loadHistory, loadProgress } from './games/classic/persistence';
import { Header } from './ui/components/Header';
import { HelpDialog } from './ui/components/HelpDialog';
import { StatsDialog } from './ui/components/StatsDialog';
import { usePrefersDark } from './ui/hooks';
import { GameScreen } from './ui/screens/GameScreen';
import { HomeScreen } from './ui/screens/HomeScreen';
import { ResultsScreen } from './ui/screens/ResultsScreen';

type Screen = { name: 'home' } | { name: 'game'; day: DayKey } | { name: 'results'; day: DayKey };

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
  const [modal, setModal] = useState<'help' | 'stats' | null>(null);
  const today = useToday();
  const prefersDark = usePrefersDark();

  const lang: Lang = settings.lang ?? detectLang(navigator.languages ?? [navigator.language]);
  const dark = settings.theme ? settings.theme === 'dark' : prefersDark;

  const updateSettings = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(store, next);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0c0e14' : '#f6f7f9');
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
    let viaHistory = false;
    try {
      viaHistory = Boolean(window.history.state?.pe);
    } catch {
      /* ignore */
    }
    if (viaHistory) window.history.back();
    else setScreen({ name: 'home' });
  }, []);

  const onFinish = useCallback((day: DayKey) => go({ name: 'results', day }), [go]);

  // Fresh reads from storage whenever the screen or the day changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const history = useMemo(() => loadHistory(store), [store, screen, today, modal]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const todayProgress = useMemo(() => loadProgress(store, today), [store, screen, today]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const resumableDay = useMemo(() => findResumableDay(store, today), [store, screen, today]);

  return (
    <I18nProvider lang={lang}>
      <div className="app">
        <Header
          dark={dark}
          onHome={goHome}
          onHelp={() => setModal('help')}
          onStats={() => setModal('stats')}
          onToggleTheme={() => updateSettings({ theme: dark ? 'light' : 'dark' })}
          onLang={(l) => updateSettings({ lang: l })}
        />
        {!isPersistentStorageAvailable() && <StorageWarning />}

        {screen.name === 'home' && (
          <HomeScreen
            today={today}
            history={history}
            todayProgress={todayProgress}
            resumableDay={resumableDay}
            onPlay={(day) => go({ name: 'game', day })}
            onResults={(day) => go({ name: 'results', day })}
          />
        )}
        {screen.name === 'game' && (
          <GameScreen key={screen.day} day={screen.day} store={store} onFinish={onFinish} onExit={goHome} />
        )}
        {screen.name === 'results' && (
          <ResultsScreen day={screen.day} today={today} history={history} onHome={goHome} />
        )}

        <Footer />
        <HelpDialog open={modal === 'help'} onClose={() => setModal(null)} />
        <StatsDialog open={modal === 'stats'} onClose={() => setModal(null)} history={history} today={today} />
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
  return <footer className="footer">{t('footer.note')}</footer>;
}
