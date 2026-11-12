import { useI18n } from '../../i18n';
import { formatCountdown, msUntilNextDay } from '../../platform/date';
import { useNow } from '../hooks';

export function Countdown() {
  const { t } = useI18n();
  const now = useNow(1000);
  return (
    <div className="countdown">
      <span className="countdown__label">{t('home.nextIn')}</span>
      <span className="countdown__time" role="timer" aria-live="off">
        {formatCountdown(msUntilNextDay(now))}
      </span>
    </div>
  );
}

/** Local wall-clock time of the next 00:00 UTC (e.g. "21:00"). */
export function useLocalResetTime(): string {
  const { lang } = useI18n();
  const midnightUtc = new Date();
  midnightUtc.setUTCHours(24, 0, 0, 0);
  return new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' }).format(midnightUtc);
}
