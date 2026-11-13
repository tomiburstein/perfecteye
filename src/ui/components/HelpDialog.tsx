import { useI18n } from '../../i18n';
import { ROUND_IDS } from '../../games/classic/types';
import { useLocalResetTime } from './Countdown';
import { Modal } from './Modal';
import { RoundGlyph } from './RoundGlyph';

export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const local = useLocalResetTime();
  return (
    <Modal title={t('help.title')} open={open} onClose={onClose}>
      <div className="prose">
        <p>{t('help.intro')}</p>
        <ul className="help-tests">
          {ROUND_IDS.map((id) => (
            <li key={id}>
              <RoundGlyph id={id} size={22} />
              <span>
                <strong>{t(`round.${id}.name`)}</strong> — {t(`round.${id}.summary`)}
              </span>
            </li>
          ))}
        </ul>
        <p>{t('help.how')}</p>
        <p>{t('help.memory')}</p>
        <p>{t('help.daily', { local })}</p>
        <p>{t('help.scoring')}</p>
        <p>{t('help.privacy')}</p>
        <p className="fineprint">{t('help.accessibility')}</p>
      </div>
      <button className="btn btn--primary btn--block" onClick={onClose}>
        {t('help.close')}
      </button>
    </Modal>
  );
}
