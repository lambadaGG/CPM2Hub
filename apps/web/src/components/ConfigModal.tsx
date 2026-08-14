import { useI18n } from '../i18n';
import { copyText, downloadText } from '../utils';
import { Icon } from './Icons';
import { useToast } from './Toast';

export function ConfigModal({ title, code, onClose }: { title: string; code: string; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();

  const copy = async () => {
    const ok = await copyText(code);
    toast(ok ? t('market.copied') : t('market.copy'));
  };

  const download = () => {
    downloadText(`${title.replace(/[^\wа-яА-ЯЁё -]/g, '').trim() || 'config'}.txt`, code);
    toast(t('market.downloaded'));
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-code"><pre>{code}</pre></div>
        <div className="modal-acts">
          <button className="primary-btn" onClick={copy}>
            <Icon id="i-copy" className="icon" />
            {t('market.copy')}
          </button>
          <button className="primary-btn" onClick={download}>
            <Icon id="i-dl" className="icon" />
            {t('market.download')}
          </button>
        </div>
      </div>
    </div>
  );
}
