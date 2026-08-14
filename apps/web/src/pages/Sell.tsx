import { useEffect, useState } from 'react';
import { createProduct, deleteProduct, getMyProducts, patchProduct } from '../api';
import type { Product, SellCategory } from '../api';
import { Icon } from '../components/Icons';
import { Segmented } from '../components/Segmented';
import { useToast } from '../components/Toast';
import { useI18n } from '../i18n';
import { fmtCompact } from '../utils';

const SELL_CATS: Array<{ value: SellCategory; glyph: string }> = [
  { value: 'gearbox', glyph: 'i-gear' },
  { value: 'vinyl', glyph: 'i-disc' },
  { value: 'tune', glyph: 'i-gauge' },
];

export function Sell({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const { t } = useI18n();
  const [listings, setListings] = useState<Product[]>([]);
  const [category, setCategory] = useState<SellCategory>('gearbox');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [price, setPrice] = useState('50');
  const [code, setCode] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => getMyProducts().then(setListings).catch(() => {});
  useEffect(() => { load(); }, []);

  const reset = () => {
    setEditId(null);
    setTitle('');
    setSubtitle('');
    setPrice('50');
    setCode('');
  };

  const submit = async () => {
    if (busy) return;
    const priceStars = Number(price);
    if (title.trim().length < 3) return toast(t('sell.errTitle'));
    if (!Number.isInteger(priceStars) || priceStars < 1 || priceStars > 1000) return toast(t('sell.errPrice'));
    if (!code.trim()) return toast(t('sell.errCode'));

    setBusy(true);
    try {
      if (editId != null) {
        await patchProduct(editId, { title: title.trim(), subtitle: subtitle.trim(), priceStars, configCode: code.trim() });
        toast(t('sell.updated'));
      } else {
        await createProduct({ category, title: title.trim(), subtitle: subtitle.trim(), priceStars, configCode: code.trim() });
        toast(t('sell.created'));
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
    setCode(p.configCode);
    setCategory((p.category as SellCategory) ?? 'gearbox');
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
            options={SELL_CATS.map((c) => ({ value: c.value, label: t(`market.${c.value}` as never) }))}
            value={category}
            onChange={setCategory}
          />
        )}

        <div className="trade-form">
          <input className="text-input" placeholder={t('sell.titlePh')} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40} />
          <input className="text-input" placeholder={t('sell.subtitlePh')} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={80} />
          <input className="text-input" type="number" min={1} max={1000} placeholder={t('sell.pricePh')} value={price} onChange={(e) => setPrice(e.target.value)} />
          <textarea className="text-area" placeholder={t('sell.codePh')} value={code} onChange={(e) => setCode(e.target.value)} maxLength={300} rows={4} />
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
                <div className="r-icon"><Icon id={SELL_CATS.find((c) => c.value === p.category)?.glyph ?? 'i-gear'} className="icon" /></div>
                <div className="r-mid">
                  <span className="r-title">{p.title}</span>
                  <span className="r-sub">
                    {p.priceStars} ⭐ · ↓ {fmtCompact(p.downloads)} · <b className={p.active ? 'sell-live' : 'sell-hidden'}>{p.active ? t('sell.live') : t('sell.hidden')}</b>
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
