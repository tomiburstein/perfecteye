import { useEffect, useState, type FormEvent } from 'react';
import { useI18n, type MessageKey } from '../../i18n';
import { adminAction, fetchAdmin, type AdminOverview } from '../../platform/api';
import { dayKeyToMs } from '../../platform/date';

const TOKEN_KEY = 'perfecteye.adminToken';

/** Owner-only panel: players per day, messages and ranking moderation. */
export function AdminScreen() {
  const { t, lang } = useI18n();
  const [token, setToken] = useState<string>(() => {
    try {
      return sessionStorage.getItem(TOKEN_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [input, setInput] = useState('');
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<MessageKey | null>(null);

  const load = async (tk: string) => {
    const res = await fetchAdmin(tk);
    if (typeof res === 'string') {
      setData(null);
      setError(res === 'unauthorized' ? 'admin.wrong' : res === 'disabled' ? 'admin.disabled' : 'admin.error');
      if (res === 'unauthorized') logout();
      return;
    }
    setError(null);
    setData(res);
  };

  useEffect(() => {
    if (token) void load(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = (e: FormEvent) => {
    e.preventDefault();
    try {
      sessionStorage.setItem(TOKEN_KEY, input);
    } catch {
      /* session only */
    }
    setToken(input);
    setInput('');
  };
  const logout = () => {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    setToken('');
    setData(null);
  };

  const dayFmt = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const timeFmt = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <main className="screen page admin" aria-labelledby="admin-title">
      <h1 id="admin-title" className="page__title">
        {t('admin.title')}
      </h1>
      {!data && (
        <form className="form" onSubmit={login}>
          <div className="form__field">
            <label htmlFor="admin-password">{t('admin.password')}</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          <button className="btn btn--primary" type="submit">
            {t('admin.enter')}
          </button>
          {error && (
            <p className="form__status" role="alert">
              {t(error)}
            </p>
          )}
        </form>
      )}
      {data && (
        <>
          <section className="page__section">
            <h2>{t('admin.days')}</h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">{t('admin.date')}</th>
                    <th scope="col">{t('admin.visitors')}</th>
                    <th scope="col">{t('admin.daily')}</th>
                    <th scope="col">{t('admin.practice')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.days.map((d) => (
                    <tr key={d.day}>
                      <td>{dayFmt.format(new Date(dayKeyToMs(d.day)))}</td>
                      <td>{d.visitors}</td>
                      <td>{d.daily}</td>
                      <td>{d.practice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="page__section">
            <h2>{t('admin.messages')}</h2>
            {data.feedback.length === 0 && <p className="fineprint">{t('admin.noMessages')}</p>}
            <ul className="msgs">
              {data.feedback.map((f) => (
                <li key={f.id} className={`msgs__item${f.resolved ? ' is-done' : ''}`}>
                  <div className="msgs__meta">
                    <strong>{t(`contact.kind.${f.kind}` as MessageKey)}</strong>
                    <span>{timeFmt.format(new Date(f.createdAt))}</span>
                    {f.lang && <span>{f.lang.toUpperCase()}</span>}
                  </div>
                  <p className="msgs__text">{f.message}</p>
                  {f.contact && <p className="msgs__contact">{f.contact}</p>}
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={async () => {
                      if (await adminAction(token, 'resolve', { id: f.id, resolved: !f.resolved })) void load(token);
                    }}
                  >
                    {f.resolved ? t('admin.reopen') : t('admin.resolve')}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="page__section">
            <h2>{t('admin.ranking')}</h2>
            <ul className="mod">
              {data.ranking.map((r) => (
                <li key={`${r.day}-${r.playerId}`} className={r.hidden ? 'is-hidden' : ''}>
                  <span className="mod__name">
                    {r.name} {r.hidden && <em>({t('admin.hidden')})</em>}
                  </span>
                  <span className="mod__meta">
                    {dayFmt.format(new Date(dayKeyToMs(r.day)))} · {r.total}
                  </span>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={async () => {
                      if (await adminAction(token, 'hide', { day: r.day, playerId: r.playerId, hidden: !r.hidden }))
                        void load(token);
                    }}
                  >
                    {r.hidden ? t('admin.show') : t('admin.hide')}
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <button className="btn btn--ghost" onClick={logout}>
            {t('admin.logout')}
          </button>
        </>
      )}
    </main>
  );
}
