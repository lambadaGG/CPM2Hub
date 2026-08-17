import { useCallback, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icons';
import { Segmented } from '../components/Segmented';
import { useToast } from '../components/Toast';
import { useI18n } from '../i18n';
import { copyText } from '../utils';
import { gearSpeed } from '../tools/gearbox';
import { CARS, maxSpeedKmh, powerWeight, zeroTo100Kmh, type CarSpec } from '../tools/compare';
import { fitmentTag, suspensionCode } from '../tools/suspension';
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

function SuspensionCalc() {
  const [ride, setRide] = useState(-35);
  const [cf, setCf] = useState(-3.5);
  const [cr, setCr] = useState(-2.0);
  const [spring, setSpring] = useState(6);
  const toast = useToast();
  const { t } = useI18n();

  const code = useMemo(() => suspensionCode({ rideMm: ride, camberFront: cf, camberRear: cr, spring }), [ride, cf, cr, spring]);
  const tag = fitmentTag(ride, cf);
  const ridePx = ((ride + 50) / 60) * 8;
  const bodyY = 84 - 2 - ridePx;

  return (
    <ToolCard icon="i-gauge" title={t('tools.suspension')} sub={t('tools.suspension.sub')}>
      <div className="sus-tags">
        <span className="sus-tag">{t(`tools.fitment.${tag}` as never)}</span>
        <span className="sus-tag dim">{ride} mm</span>
      </div>
      <svg className="sus-visual" viewBox="0 0 220 122">
        <line x1="16" y1="106" x2="204" y2="106" stroke="#fff" strokeOpacity="0.16" strokeWidth="1" strokeDasharray="3 4" />
        <rect x="30" y={bodyY} width="160" height="16" rx="8" fill="#1c1c1e" stroke="#2AABEE" strokeOpacity="0.35" strokeWidth="1" />
        <rect x="78" y={bodyY - 15} width="64" height="16" rx="6" fill="#17191d" stroke="#2AABEE" strokeOpacity="0.25" strokeWidth="1" />
        <line x1="90" y1={bodyY - 15} x2="103" y2={bodyY} stroke="#2AABEE" strokeOpacity="0.45" strokeWidth="1.4" />
        <rect x="32" y={bodyY + 3} width="4" height="5" rx="1" fill="#FFD60A" />
        <rect x="184" y={bodyY + 3} width="4" height="5" rx="1" fill="#FF453A" />
        <g transform={`translate(62 100) rotate(${cf})`}>
          <circle r="16" fill="#0d0d0d" stroke="#5AC8FA" strokeWidth="1.6" />
          <circle r="8" fill="#1c1c1e" stroke="#2AABEE" strokeWidth="1" />
          <line x1="-14" y1="0" x2="14" y2="0" stroke="#5AC8FA" strokeWidth="1.3" strokeOpacity="0.8" />
          <line x1="0" y1="-14" x2="0" y2="14" stroke="#5AC8FA" strokeWidth="1.3" strokeOpacity="0.8" />
          <circle r="2.4" fill="#5AC8FA" />
        </g>
        <g transform={`translate(158 100) rotate(${cr})`}>
          <circle r="16" fill="#0d0d0d" stroke="#5AC8FA" strokeWidth="1.6" />
          <circle r="8" fill="#1c1c1e" stroke="#2AABEE" strokeWidth="1" />
          <line x1="-14" y1="0" x2="14" y2="0" stroke="#5AC8FA" strokeWidth="1.3" strokeOpacity="0.8" />
          <line x1="0" y1="-14" x2="0" y2="14" stroke="#5AC8FA" strokeWidth="1.3" strokeOpacity="0.8" />
          <circle r="2.4" fill="#5AC8FA" />
        </g>
        <text x="62" y="118" fontSize="8" fill="#8E8E93" textAnchor="middle">{cf.toFixed(1)}°</text>
        <text x="158" y="118" fontSize="8" fill="#8E8E93" textAnchor="middle">{cr.toFixed(1)}°</text>
      </svg>
      <label className="slider"><span className="sl-lbl"><em>{t('tools.rideHeight')}</em><strong>{ride} mm</strong></span>
        <input type="range" min={-50} max={10} step={1} value={ride} onChange={(e) => setRide(+e.target.value)} /></label>
      <label className="slider"><span className="sl-lbl"><em>{t('tools.camberFront')}</em><strong>{cf.toFixed(1)}°</strong></span>
        <input type="range" min={-8} max={0} step={0.1} value={cf} onChange={(e) => setCf(+e.target.value)} /></label>
      <label className="slider"><span className="sl-lbl"><em>{t('tools.camberRear')}</em><strong>{cr.toFixed(1)}°</strong></span>
        <input type="range" min={-8} max={0} step={0.1} value={cr} onChange={(e) => setCr(+e.target.value)} /></label>
      <label className="slider"><span className="sl-lbl"><em>{t('tools.spring')}</em><strong>{spring}/10</strong></span>
        <input type="range" min={1} max={10} step={1} value={spring} onChange={(e) => setSpring(+e.target.value)} /></label>
      <div className="sus-ends"><span>{t('tools.soft')}</span><span>{t('tools.hard')}</span></div>
      <button className="primary-btn wide" onClick={async () => {
        await copyText(code);
        toast(t('tools.configCopied'));
      }}>{t('tools.copyConfig')}</button>
    </ToolCard>
  );
}

function CompareCars() {
  const [a, setA] = useState('gtr');
  const [b, setB] = useState('golfR');
  const { t } = useI18n();

  const carA = CARS.find((c) => c.id === a) ?? CARS[0];
  const carB = CARS.find((c) => c.id === b) ?? CARS[1];

  const rows: Array<{ label: string; lower: boolean; a: number; b: number; fmt: (v: number) => string }> = [
    { label: t('tools.metric.power'), lower: false, a: carA.hp, b: carB.hp, fmt: (v) => `${v} hp` },
    { label: t('tools.metric.torque'), lower: false, a: carA.nm, b: carB.nm, fmt: (v) => `${v} Nm` },
    { label: t('tools.metric.weight'), lower: true, a: carA.weightKg, b: carB.weightKg, fmt: (v) => `${v} kg` },
    { label: t('tools.metric.pwr'), lower: false, a: powerWeight(carA), b: powerWeight(carB), fmt: (v) => `${Math.round(v)} hp/t` },
    { label: t('tools.metric.accel'), lower: true, a: zeroTo100Kmh(carA), b: zeroTo100Kmh(carB), fmt: (v) => `${v.toFixed(1)} s` },
    { label: t('tools.metric.vmax'), lower: false, a: maxSpeedKmh(carA), b: maxSpeedKmh(carB), fmt: (v) => `${Math.round(v)} km/h` },
  ];

  return (
    <ToolCard icon="i-bolt" title={t('tools.compare')} sub={t('tools.compare.sub')}>
      <div className="cmp-selects">
        <select className="cmp-select" value={a} onChange={(e) => setA(e.target.value)}>
          {CARS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="cmp-swap" onClick={() => { setA(b); setB(a); }} aria-label={t('tools.swap')}>
          <Icon id="i-shuffle" className="icon" />
        </button>
        <select className="cmp-select" value={b} onChange={(e) => setB(e.target.value)}>
          {CARS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <table className="cmp-table">
        <thead>
          <tr>
            <th className="cmp-th" />
            <th className="cmp-name">{carA.name}</th>
            <th className="cmp-name">{carB.name}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const winA = r.a === r.b ? null : r.lower ? r.a < r.b : r.a > r.b;
            return (
              <tr key={r.label}>
                <td className="cmp-label">{r.label}</td>
                <td className={`cmp-val${winA === true ? ' win' : winA === false ? ' lose' : ''}`}>{r.fmt(r.a)}</td>
                <td className={`cmp-val${winA === false ? ' win' : winA === true ? ' lose' : ''}`}>{r.fmt(r.b)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="cmp-note">{t('tools.est')}</p>
    </ToolCard>
  );
}

function ColorPicker() {
  const [hsv, setHsv] = useState({ h: 0, s: 100, t: 100 });
  const toast = useToast();
  const { t } = useI18n();
  const hex = hslToHex(hsv.h, hsv.s, hsv.t);
  const [r, g, b] = hslToRgb(hsv.h, hsv.s, hsv.t);

  const update = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pt = pickFromPosition(e.clientX, e.clientY, rect);
    if (pt) setHsv({ ...pt });
  };

  const onWheelDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    update(e);
  };

  const onWheelMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) update(e);
  };

  return (
    <ToolCard icon="i-palette" title={t('tools.color')} sub={t('tools.color.sub')}>
        <div className="cp-wrap" style={{ '--picked-hue': String(hsv.h) } as React.CSSProperties}>
        <div className="wheel" style={{ background: `conic-gradient(from 0deg, red, yellow, lime, cyan, blue, magenta, red)` }} onPointerDown={onWheelDown} onPointerMove={onWheelMove}>
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

function TuningCarousel() {
  const { t } = useI18n();
  const trackRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);

  const onScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
    setIdx(Math.min(Math.max(i, 0), 1));
  }, []);

  const go = useCallback((i: number) => {
    const el = trackRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  }, []);

  const slides = [
    { label: t('tools.gearbox'), node: <GearboxCalc /> },
    { label: t('tools.suspension'), node: <SuspensionCalc /> },
  ];

  return (
    <div className="tcar">
      <div className="tcar-progress" role="tablist" aria-label={t('tools.tab.tuning')}>
        {slides.map((s, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === idx}
            aria-label={s.label}
            className={`tcar-seg${i <= idx ? ' on' : ''}`}
            style={{ '--si': i } as React.CSSProperties}
            onClick={() => go(i)}
          />
        ))}
      </div>
      <div className="tcar-track" ref={trackRef} onScroll={onScroll}>
        {slides.map((s, i) => (
          <div key={i} className="tcar-slide">
            {s.node}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Tools() {
  const { t } = useI18n();
  const [tab, setTab] = useState<'tuning' | 'style'>('tuning');
  return (
    <div className="screen tools">
      <header className="top">
        <div>
          <h1 className="page-title">{t('tools.title')}</h1>
          <div className="logo-sub">{t('tools.subtitle')}</div>
        </div>
      </header>
      <Segmented<'tuning' | 'style'>
        options={[
          { value: 'tuning', label: t('tools.tab.tuning') },
          { value: 'style', label: t('tools.tab.style') },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'tuning' ? (
        <div className="tool-list">
          <TuningCarousel />
          <CompareCars />
        </div>
      ) : (
        <div className="tool-list">
          <ColorPicker />
          <NickGen />
        </div>
      )}
    </div>
  );
}
