import { useCallback, useEffect, useMemo, useState } from 'react';
import { createProduct, deleteProduct, getMyProducts, patchProduct, PARAM_FIELDS, SELL_CATEGORIES, CATEGORY_META } from '../api';
import type { Params, Product, SellCategory } from '../api';
import { Icon } from '../components/Icons';
import { Segmented } from '../components/Segmented';
import { useToast } from '../components/Toast';
import { useI18n } from '../i18n';
import { fmtCompact } from '../utils';

const MEDIA_LABEL: Record<string, string> = {
  previewUrl: 'sell.previewPh',
  videoUrl: 'sell.videoPh',
  audioUrl: 'sell.audioPh',
  beforeUrl: 'sell.beforePh',
  afterUrl: 'sell.afterPh',
};

export function Sell({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const { t } = useI18n();
  const [listings, setListings] = useState<Product[]>([]);
  const [category, setCategory] = useState<SellCategory>('gearbox');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [price, setPrice] = useState('50');
  const [code, setCode] = useState('');
  const [media, setMedia] = useState<Record<string, string>>({});
  const [serverName, setServerName] = useState('');
  const [params, setParams] = useState<Record<string, string>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [guideUrl, setGuideUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const meta = CATEGORY_META[category];
  const mediaType = meta?.mediaType ?? 'photo';
  const fields = PARAM_FIELDS[category] ?? [];

  const mediaKeys = useMemo(() => {
    const map: Record<string, string[]> = {
      photo: ['previewUrl'],
      video: ['videoUrl'],
      audio: ['audioUrl'],
      before_after: ['beforeUrl', 'afterUrl'],
      plate: [],
    };
    return map[mediaType] ?? [];
  }, [mediaType]);

  const load = useCallback(() => getMyProducts().then(setListings).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  const reset = () => {
    setEditId(null);
    setTitle('');
    setSubtitle('');
    setPrice('50');
    setCode('');
    setMedia({});
    setServerName('');
    setParams({});
    setGuideUrl('');
  };

  const changeCategory = (c: SellCategory) => {
    setCategory(c);
    setMedia({});
    setServerName('');
    setParams({});
  };

  const submit = async () => {
    if (busy) return;
    const priceStars = Number(price);
    if (title.trim().length < 3) return toast(t('sell.errTitle'));
    if (!Number.isInteger(priceStars) || priceStars < 1 || priceStars > 1000) return toast(t('sell.errPrice'));
    if (!code.trim()) return toast(t('sell.errCode'));
    if (meta?.risk === 'high' && serverName.trim().length < 2) return toast(t('sell.errServer'));
    if (mediaType === 'video' && !media.videoUrl?.trim()) return toast(t('sell.errMedia'));
    if (mediaType === 'audio' && !media.audioUrl?.trim()) return toast(t('sell.errMedia'));
    for (const f of fields) {
      if (f.required && !(params[f.key] ?? '').trim()) return toast(t('sell.errMedia'));
    }

    const mediaObj = { type: mediaType };
    for (const k of Object.keys(media)) {
      if (media[k].trim()) (mediaObj as Record<string, string>)[k] = media[k].trim();
    }

    const p: Params = {};
    for (const f of fields) {
      const raw = (params[f.key] ?? '').trim();
      if (!raw) continue;
      if (f.type === 'number') p[f.key] = Number(raw);
      else if (f.type === 'list') p[f.key] = raw.split(',').map((s) => s.trim()).filter(Boolean);
      else p[f.key] = raw;
    }

    setBusy(true);
    try {
      const common = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        priceStars,
        configCode: code.trim(),
        media: mediaObj,
        serverName: serverName.trim() || undefined,
        params: p,
        guideUrl: guideUrl.trim() || undefined,
      };
      if (editId != null) {
        await patchProduct(editId, common);
        toast(t('sell.updated'));
      } else {
        await createProduct({ ...common, category });
        toast(meta?.requiresModeration ? t('sell.pendingNote') : t('sell.created'));
      }
      reset();
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : t('sell.failed'));
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (p: Product) => {
    setEditId(p.id);
    setTitle(p.title);
    setSubtitle(p.subtitle);
    setPrice(String(p.priceStars));
    setCode(p.configCode ?? '');
    setCategory((p.category as SellCategory) ?? 'gearbox');
    setGuideUrl(p.guideUrl ?? '');
    setMedia({
      ...(p.media?.previewUrl ? { previewUrl: p.media.previewUrl } : {}),
      ...(p.media?.videoUrl ? { videoUrl: p.media.videoUrl } : {}),
      ...(p.media?.audioUrl ? { audioUrl: p.media.audioUrl } : {}),
      ...(p.media?.beforeUrl ? { beforeUrl: p.media.beforeUrl } : {}),
      ...(p.media?.afterUrl ? { afterUrl: p.media.afterUrl } : {}),
    });
    setServerName(p.serverName ?? '');
    const pp: Record<string, string> = {};
    for (const [k, v] of Object.entries(p.params ?? {})) {
      pp[k] = Array.isArray(v) ? v.join(', ') : String(v);
    }
    setParams(pp);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggle = async (p: Product) => {
    try {
      await patchProduct(p.id, { active: !p.active });
      toast(p.active ? t('sell.hidden') : t('sell.shown'));
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : t('sell.failed'));
    }
  };

  const remove = async (p: Product) => {
    try {
      await deleteProduct(p.id);
      toast(t('sell.deleted'));
      if (editId === p.id) reset();
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : t('sell.failed'));
    }
  };

  const modChip = (m: string) => {
    const cls = m === 'approved' ? 'mod-ok' : m === 'pending' ? 'mod-wait' : 'mod-bad';
    const key = m === 'approved' ? 'sell.mod.approved' : m === 'pending' ? 'sell.mod.pending' : 'sell.mod.rejected';
    return <span className={`mod-chip ${cls}`}>{t(key as never)}</span>;
  };

  return (
    <div className="screen sell">
      <header className="top">
        <div className="top-row">
          <button className="back-btn" onClick={onBack}>‹</button>
          <div>
            <h1 className="page-title">{t('sell.title')}</h1>
            <div className="logo-sub">{t('sell.subtitle')}</div>
          </div>
        </div>
      </header>

      <div className="card">
        <h2 className="card-title">{editId != null ? t('sell.editListing') : t('sell.newListing')}</h2>

        {editId != null ? (
          <div className="sell-cat-label">{t('sell.category')}: <b>{t(`market.${category}` as never)}</b></div>
        ) : (
          <Segmented<SellCategory>
            className="seg-scroll"
            options={SELL_CATEGORIES.map((c) => ({ value: c, label: t(`market.${c}` as never) }))}
            value={category}
            onChange={changeCategory}
          />
        )}

        <div className="trade-form">
          <input className="text-input" placeholder={t('sell.titlePh')} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40} />
          <input className="text-input" placeholder={t('sell.subtitlePh')} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={80} />
          <input className="text-input" type="number" min={1} max={1000} placeholder={t('sell.pricePh')} value={price} onChange={(e) => setPrice(e.target.value)} />
          <textarea className="text-area" placeholder={t('sell.codePh')} value={code} onChange={(e) => setCode(e.target.value)} maxLength={300} rows={3} />
        </div>

        {(mediaKeys.length > 0 || meta?.risk === 'high') && (
          <div className="sell-section">
            <div className="sell-section-title">{t('sell.mediaNote')}</div>
            {meta?.risk === 'high' && (
              <input className="text-input" placeholder={t('sell.serverPh')} value={serverName} onChange={(e) => setServerName(e.target.value)} maxLength={40} />
            )}
            {mediaKeys.map((k) => (
              <input
                key={k}
                className="text-input"
                placeholder={t(MEDIA_LABEL[k] as never)}
                value={media[k] ?? ''}
                onChange={(e) => setMedia((m) => ({ ...m, [k]: e.target.value }))}
              />
            ))}
          </div>
        )}

        {fields.length > 0 && (
          <div className="sell-section">
            <div className="sell-section-title">{t('sell.params')}</div>
            {fields.map((f) => (
              <input
                key={f.key}
                className="text-input"
                type={f.type === 'number' ? 'number' : 'text'}
                placeholder={`${t(`sell.f.${f.key}` as never)}${f.required ? ' *' : ''}`}
                value={params[f.key] ?? ''}
                onChange={(e) => setParams((m) => ({ ...m, [f.key]: e.target.value }))}
              />
            ))}
          </div>
        )}

        <div className="sell-section">
          <div className="sell-section-title">{t('sell.guide')}</div>
          <input className="text-input" placeholder={t('sell.guidePh')} value={guideUrl} onChange={(e) => setGuideUrl(e.target.value)} maxLength={255} />
        </div>

        <div className="sell-form-actions">
          <button className="primary-btn" onClick={submit} disabled={busy}>
            <Icon id="i-upload" className="icon" />
            {busy ? '…' : editId != null ? t('sell.save') : t('sell.create')}
          </button>
          {editId != null && (
            <button className="sell-btn" onClick={reset}>{t('sell.cancel')}</button>
          )}
        </div>
      </div>

      <div className="list-title"><h2>{t('sell.mine')}</h2><span className="count">{listings.length}</span></div>
      {listings.length === 0 ? (
        <div className="state-empty sm"><Icon id="i-upload" className="icon" /><p>{t('sell.none')}</p></div>
      ) : (
        <div className="sell-list">
          {listings.map((p) => (
            <div key={p.id} className="sell-item">
              <div className="row">
                <div className="r-icon"><Icon id={`i-${CATEGORY_META[p.category]?.glyph ?? 'gear'}`} className="icon" /></div>
                <div className="r-mid">
                  <span className="r-title">{p.title}</span>
                  <span className="r-sub">
                    {p.priceStars} ⭐ · ↓ {fmtCompact(p.downloads)} · {modChip(p.moderationStatus)} · <b className={p.active ? 'sell-live' : 'sell-hidden'}>{p.active ? t('sell.live') : t('sell.hidden')}</b>
                  </span>
                </div>
              </div>
              <div className="sell-actions">
                <button className="sell-btn" onClick={() => startEdit(p)}>{t('sell.edit')}</button>
                <button className="sell-btn" onClick={() => toggle(p)}>{p.active ? t('sell.hide') : t('sell.show')}</button>
                <button className="sell-btn danger" onClick={() => remove(p)}>{t('sell.delete')}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
