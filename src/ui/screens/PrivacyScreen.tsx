import { useI18n, type MessageKey } from '../../i18n';

const SECTIONS: [MessageKey, MessageKey][] = [
  ['privacy.deviceTitle', 'privacy.device'],
  ['privacy.serverTitle', 'privacy.server'],
  ['privacy.notTitle', 'privacy.not'],
  ['privacy.whereTitle', 'privacy.where'],
  ['privacy.rightsTitle', 'privacy.rights'],
];

export function PrivacyScreen() {
  const { t } = useI18n();
  return (
    <main className="screen page" aria-labelledby="privacy-title">
      <h1 id="privacy-title" className="page__title">
        {t('privacy.title')}
      </h1>
      {SECTIONS.map(([title, body]) => (
        <section key={title} className="page__section">
          <h2>{t(title)}</h2>
          <p>{t(body)}</p>
        </section>
      ))}
      <p className="fineprint">{t('privacy.updated')}</p>
      <a className="btn btn--ghost" href="#contact">
        {t('footer.contact')}
      </a>
    </main>
  );
}
