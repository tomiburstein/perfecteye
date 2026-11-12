import { useState } from 'react';
import { useI18n } from '../../i18n';
import { buildShareText, shareLinks } from '../../games/classic/share';
import { siteUrl } from '../../platform/site';
import { CopyIcon, ShareIcon } from './Icons';

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy method */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function ShareBox({ number, scores }: { number: number; scores: number[] }) {
  const i18n = useI18n();
  const { t } = i18n;
  const url = siteUrl();
  const text = buildShareText(i18n, number, scores, url);
  const links = shareLinks(text, url);
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copy = async () => setStatus((await copyText(text)) ? 'copied' : 'failed');

  return (
    <section className="share" aria-labelledby="share-title">
      <h2 id="share-title" className="section-title">
        {t('share.title')}
      </h2>
      <pre className="share__preview" data-testid="share-text">{text}</pre>
      <div className="share__buttons">
        {canNativeShare && (
          <button
            className="btn btn--primary"
            onClick={() => {
              navigator.share({ text }).catch(() => {
                /* user cancelled */
              });
            }}
          >
            <ShareIcon /> {t('share.native')}
          </button>
        )}
        <button className={`btn ${canNativeShare ? 'btn--ghost' : 'btn--primary'}`} onClick={copy}>
          <CopyIcon /> {t('share.copy')}
        </button>
        <a className="btn btn--ghost btn--whatsapp" href={links.whatsapp} target="_blank" rel="noopener noreferrer">
          {t('share.whatsapp')}
        </a>
        <a className="btn btn--ghost" href={links.x} target="_blank" rel="noopener noreferrer">
          {t('share.x')}
        </a>
        <a className="btn btn--ghost" href={links.telegram} target="_blank" rel="noopener noreferrer">
          {t('share.telegram')}
        </a>
      </div>
      <p className="share__status" role="status" aria-live="polite">
        {status === 'copied' ? t('share.copied') : status === 'failed' ? t('share.copyFailed') : ''}
      </p>
    </section>
  );
}
