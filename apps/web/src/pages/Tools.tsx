import { useMemo, useState } from 'react';
import { Icon } from '../components/Icons';
import { useToast } from '../components/Toast';
import { useI18n } from '../i18n';
import { copyText } from '../utils';
import { gearSpeed } from '../tools/gearbox';
import { hslToHex, hslToRgb, PALETTES, pickFromPosition, rgbToHsl, wheelPoint } from '../tools/color';
import { NICK_BASES, NICK_STYLES, renderNick } from '../tools/nick';

const GEAR_RATIOS = [3.1, 2.0, 1.5, 1.15, 0.95, 0.8, 0.7];

function GearboxCalc() {
  const [hp, setHp] = useState(400);
  const [nm, setNm] = useState(500);
  const [fd, setFd] = useState(3.2);
  const [ratio, setRatio] = useState(1.0);
  const toast = useToast();
  const { t } = useI18n();

  const chart = useMemo(() => {
    const maxRpm = 8000;
    const allSpeeds: number[] = [];
    const curves = GEAR_RATIOS.map((g) => {
      const points: Array<[number, number]> = [];
      for (let rpm = 0; rpm <= maxRpm; rpm += 200) {
        const speed = gearSpeed(rpm, fd * (ratio * g), 1);
        points.push([rpm, speed]);
        allSpeeds.push(speed);
      }
      return points;
    });
    const maxSpeed = Math.max(...allSpeeds);
    const y = (speed: number) => 100 - (speed / maxSpeed) * 90;
    const x = (i: number) => (i / (curves[0].length - 1)) * 200;
    const paths = curves.map((points) =>
      points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p[1]).toFixed(1)}`).join(' '),
    );
    return { paths, maxSpeed };
  }, [fd, ratio]);

  return (
    <ToolCard icon="i-gear" title={t('tools.gearbox')} sub={t('tools.gearbox.sub')}>
      <div className="gbox-inputs">
        <label className="field-sm"><span>{t('tools.hp')}</span><input className="text-input-sm" type="number" value={hp} onChange={(e) => setHp(+e.target.value)} /></label>
        <label className="field-sm"><span>{t('tools.nm')}</span><input className="text-input-sm" type="number" value={nm} onChange={(e) => setNm(+e.target.value)} /></label>
      </div>
      <label className="slider"><span className="sl-lbl"><em>{t('tools.finalDrive')}</em><strong>{fd.toFixed(2)}</strong></span>
        <input type="range" min={2} max={5} step={0.1} value={fd} onChange={(e) => setFd(+e.target.value)} /></label>
      <label className="slider"><span className="sl-lbl"><em>{t('tools.ratio')}</em><strong>{ratio.toFixed(2)}</strong></span>
        <input type="range" min={0.6} max={1.2} step={0.01} value={ratio} onChange={(e) => setRatio(+e.target.value)} /></label>
      <svg className="gearbox-chart-full" viewBox="0 0 200 100">
        {[20, 40, 60, 80].map((y) => <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="#fff" strokeOpacity="0.1" />)}
        {chart.paths.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={i === chart.paths.length - 1 ? '#5AC8FA' : '#2AABEE'} strokeWidth={i === chart.paths.length - 1 ? 2.2 : 1.2} strokeLinecap="round" strokeOpacity={i === chart.paths.length - 1 ? 1 : 0.55} />
        ))}
        <line x1="0" y1="100" x2="200" y2="100" stroke="#fff" strokeOpacity="0.3" />
        <text x="195" y="97" fontSize="9" fill="#8E8E93">{t('tools.rpm')}</text>
        <text x="5" y="12" fontSize="9" fill="#8E8E93">{Math.round(chart.maxSpeed)} km/h</text>
      </svg>
      <button className="primary-btn wide" onClick={async () => {
        await copyText(`FINAL=${fd.toFixed(2)};RATIO=${ratio.toFixed(2)};HP=${hp};NM=${nm}`);
        toast(t('tools.configCopied'));
      }}>{t('tools.copyConfig')}</button>
    </ToolCard>
  );
}

function ColorPicker() {
  const [hsv, setHsv] = useState({ h: 0, s: 100, t: 100 });
  const toast = useToast();
  const { t } = useI18n();
  const hex = hslToHex(hsv.h, hsv.s, hsv.t);
  const [r, g, b] = hslToRgb(hsv.h, hsv.s, hsv.t);

  const onWheel = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pt = pickFromPosition(e.clientX, e.clientY, rect);
    if (pt) setHsv({ ...pt });
  };

  return (
    <ToolCard icon="i-palette" title={t('tools.color')} sub={t('tools.color.sub')}>
      <div className="cp-wrap">
        <div className="wheel" style={{ background: `conic-gradient(from 0deg, red, yellow, lime, cyan, blue, magenta, red)` }} onPointerDown={onWheel}>
          <div className="wheel-shade" />
          <div className="wheel-mark" style={{ left: wheelPoint(hsv.h, hsv.s).left, top: wheelPoint(hsv.h, hsv.s).top, borderColor: hex }} />
        </div>
      </div>
      <div className="cp-sliders">
        <label className="slider"><span className="sl-lbl"><em>H</em><strong>{hsv.h}</strong></span>
          <input type="range" min={0} max={360} value={hsv.h} onChange={(e) => setHsv({ ...hsv, h: +e.target.value })} /></label>
        <label className="slider"><span className="sl-lbl"><em>S</em><strong>{hsv.s}%</strong></span>
          <input type="range" min={0} max={100} value={hsv.s} onChange={(e) => setHsv({ ...hsv, s: +e.target.value })} /></label>
        <label className="slider"><span className="sl-lbl"><em>T</em><strong>{hsv.t}%</strong></span>
          <input type="range" min={0} max={100} value={hsv.t} onChange={(e) => setHsv({ ...hsv, t: +e.target.value })} /></label>
      </div>
      <div className="cp-values">
        <span>{t('tools.hex')}</span>
        <span>{hex}</span>
        <span>RGB({r}, {g}, {b})</span>
      </div>
      <div className="palette-row">
        {PALETTES.map((c) => (
          <button key={c} className="swatch" style={{ background: c }} onClick={() => setHsv(rgbToHsl(c))} />
        ))}
      </div>
      <button className="primary-btn wide" onClick={async () => {
        await copyText(hex);
        toast(t('tools.colorCopied'));
      }}>{t('tools.copy')}</button>
    </ToolCard>
  );
}

function NickGen() {
  const [base, setBase] = useState('FURYX');
  const [styleIdx, setStyleIdx] = useState(0);
  const toast = useToast();
  const { t } = useI18n();

  return (
    <ToolCard icon="i-type" title={t('tools.nick')} sub={t('tools.nick.sub')}>
      <div className="nick-input-row">
        <input className="text-input" placeholder={t('tools.nick.placeholder')} value={base} maxLength={12} onChange={(e) => setBase(e.target.value.toUpperCase())} />
        <button className="shuffle-btn" onClick={() => setBase(NICK_BASES[Math.floor(Math.random() * NICK_BASES.length)])}><Icon id="i-shuffle" className="icon" /></button>
      </div>
      <div className="nick-chips-grid">
        {NICK_STYLES.map((s, i) => (
          <button key={s.name} className={`nick-chip${i === styleIdx ? ' active' : ''}`} onClick={() => setStyleIdx(i)}>
            {renderNick(s, base)}
          </button>
        ))}
      </div>
      <div className="nick-actions">
        <button className="primary-btn wide" onClick={async () => {
          await copyText(renderNick(NICK_STYLES[styleIdx], base));
          toast(t('tools.nick.copied'));
        }}>{t('tools.nick.copy')}</button>
      </div>
    </ToolCard>
  );
}

function ToolCard({ icon, title, sub, children }: { icon: string; title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="tool-card">
      <div className="tc-head">
        <div className="tc-ico"><Icon id={icon} className="icon" /></div>
        <div>
          <h3>{title}</h3>
          <p>{sub}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function Tools() {
  const { t } = useI18n();
  return (
    <div className="screen tools">
      <header className="top">
        <div>
          <h1 className="page-title">{t('tools.title')}</h1>
          <div className="logo-sub">{t('tools.subtitle')}</div>
        </div>
      </header>
      <div className="tool-list">
        <GearboxCalc />
        <ColorPicker />
        <NickGen />
      </div>
    </div>
  );
}
