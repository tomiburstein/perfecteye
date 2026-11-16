import { useState, type FormEvent } from 'react';
import { useI18n, type MessageKey } from '../../i18n';
import { sendFeedback, type FeedbackKind } from '../../platform/api';
import type { Player } from '../../platform/player';

const KINDS: FeedbackKind[] = ['bug', 'idea', 'name', 'other'];

export function ContactScreen({ player }: { player: Player }) {
  const { t, lang } = useI18n();
  const [kind, setKind] = useState<FeedbackKind>('bug');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'too-many' | 'error' | 'short'>('idle');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 3) {
      setStatus('short');
      return;
    }
    setStatus('sending');
    const result = await sendFeedback({ playerId: player.id, kind, message, contact, lang });
    setStatus(result);
    if (result === 'ok') {
      setMessage('');
      setContact('');
    }
  };

  const statusText: Partial<Record<typeof status, MessageKey>> = {
    ok: 'contact.thanks',
    'too-many': 'contact.tooMany',
    error: 'contact.error',
    short: 'contact.short',
  };

  return (
    <main className="screen page" aria-labelledby="contact-title">
      <h1 id="contact-title" className="page__title">
        {t('contact.title')}
      </h1>
      <p className="page__lead">{t('contact.lead')}</p>
      <form className="form" onSubmit={submit} noValidate>
        <fieldset className="form__field">
          <legend>{t('contact.kind')}</legend>
          <div className="choice">
            {KINDS.map((k) => (
              <label key={k} className={`choice__item${kind === k ? ' is-active' : ''}`}>
                <input type="radio" name="kind" id={`kind-${k}`} value={k} checked={kind === k} onChange={() => setKind(k)} />
                {t(`contact.kind.${k}` as MessageKey)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="form__field">
          <label htmlFor="contact-message">{t('contact.message')}</label>
          <textarea
            id="contact-message"
            rows={5}
            maxLength={1000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            aria-describedby="contact-message-help"
          />
          <p id="contact-message-help" className="fineprint">
            {t('contact.messageHelp')}
          </p>
        </div>
        <div className="form__field">
          <label htmlFor="contact-contact">{t('contact.contact')}</label>
          <input
            id="contact-contact"
            maxLength={120}
            autoComplete="email"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            aria-describedby="contact-contact-help"
          />
          <p id="contact-contact-help" className="fineprint">
            {t('contact.contactHelp')}
          </p>
        </div>
        <button className="btn btn--primary btn--lg btn--block" type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? t('contact.sending') : t('contact.send')}
        </button>
        <p className={`form__status${status === 'ok' ? ' is-ok' : ''}`} role="status" aria-live="polite">
          {statusText[status] ? t(statusText[status] as MessageKey) : ''}
        </p>
      </form>
    </main>
  );
}
