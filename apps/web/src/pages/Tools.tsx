import { useMemo, useState } from 'react';
import { Icon } from '../components/Icons';
import { useToast } from '../components/Toast';
import { copyText } from '../utils';
import { gearSpeed } from '../tools/gearbox';
import { hslToHex, hslToRgb, PALETTES, pickFromPosition, rgbToHsl, wheelPoint } from '../tools/color';
import { NICK_STYLES, randomNick, renderNick } from '../tools/nick';

function GearboxCalc() {
  const [hp, setHp] = useState(400);
  const [nm, setNm] = useState(500);
  const [fd, setFd] = useState(3.2);
  const [ratio, setRatio] = useState(1.0);
  const toast = useToast();

  const chart = useMemo(() => {
    const maxRpm = 8000;
    const points: Array<[number, number]> = [];
    for (let rpm = 0; rpm <= maxRpm; rpm += 100) {
      const speed = gearSpeed(rpm, fd * ratio, 1);
      points.push([rpm, speed]);
    }
    return { points, maxSpeed: Math.max(...points.map((p) => p[1])) };
  }, [fd, ratio]);

  const svgPath = useMemo(() => {
    if (chart.points.length === 0) return '';
    let d = `M ${0} ${100 - (chart.points[0][1] / chart.maxSpeed) * 90}`;
    for (let i = 1; i < chart.points.length; i++) {
      const x = (i / (chart.points.length - 1)) * 200;
      const y = 100 - (chart.points[i][1] / chart.maxSpeed) * 90;
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  }, [chart]);

  return (
    <ToolCard icon="i-gear" title="Gearbox Calculator" sub="Tune your transmission">
      <div className="gbox-inputs">
        <label className="field-sm"><span>HP</span><input className="text-input-sm" type="number" value={hp} onChange={(e) => setHp(+e.target.value)} /></label>
        <label className="field-sm"><span>Nm</span><input className="text-input-sm" type="number" value={nm} onChange={(e) => setNm(+e.target.value)} /></label>
      </div>
      <label className="slider"><span className="sl-lbl"><em>Final Drive</em><strong>{fd.toFixed(2)}</strong></span>
        <input type="range" min={2} max={5} step={0.1} value={fd} onChange={(e) => setFd(+e.target.value)} /></label>
      <label className="slider"><span className="sl-lbl"><em>1st-7th Ratio</em><strong>{ratio.toFixed(2)}</strong></span>
        <input type="range" min={0.6} max={1.2} step={0.01} value={ratio} onChange={(e) => setRatio(+e.target.value)} /></label>
      <svg className="gearbox-chart-full" viewBox="0 0 200 100">
        {[20, 40, 60, 80].map((y) => <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="#fff" strokeOpacity="0.1" />)}
        <path d={svgPath} fill="none" stroke="#2AABEE" strokeWidth="2" strokeLinecap="round" />
        <line x1="0" y1="100" x2="200" y2="100" stroke="#fff" strokeOpacity="0.3" />
        <text x="195" y="97" fontSize="7" fill="#8E8E93">RPM</text>
        <text x="5" y="12" fontSize="7" fill="#8E8E93">{Math.round(chart.maxSpeed)} km/h</text>
      </svg>
      <button className="primary-btn wide" onClick={async () => {
        await copyText(`FINAL=${fd.toFixed(2)};RATIO=${ratio.toFixed(2)};HP=${hp};NM=${nm}`);
        toast('Config copied');
      }}>Copy Config Code</button>
    </ToolCard>
  );
}

function ColorPicker() {
  const [hsv, setHsv] = useState({ h: 0, s: 100, t: 100 });
  const toast = useToast();
  const hex = hslToHex(hsv.h, hsv.s, hsv.t);
  const [r, g, b] = hslToRgb(hsv.h, hsv.s, hsv.t);

  const onWheel = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pt = pickFromPosition(e.clientX, e.clientY, rect);
    if (pt) setHsv({ ...pt });
  };

  return (
    <ToolCard icon="i-palette" title="RGB & Color Picker" sub="Pick custom colors">
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
        <span>HEX</span>
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
        toast('Color copied');
      }}>Copy</button>
    </ToolCard>
  );
}

function NickGen() {
  const [base, setBase] = useState('FURYX');
  const [styleIdx, setStyleIdx] = useState(0);

  return (
    <ToolCard icon="i-type" title="Font & Nick Generator" sub="Create unique names">
      <div className="nick-input-row">
        <input className="text-input" placeholder="Input a nick name" value={base} maxLength={12} onChange={(e) => setBase(e.target.value.toUpperCase())} />
        <button className="shuffle-btn" onClick={() => setBase(randomNick().replace(/[^A-Z0-9_]/g, '').slice(0, 12))}><Icon id="i-shuffle" className="icon" /></button>
      </div>
      <div className="nick-chips-grid">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <button key={i} className={`nick-chip${i === styleIdx ? ' active' : ''}`} onClick={() => setStyleIdx(i)}>
            {renderNick(NICK_STYLES[i].base, base)}
          </button>
        ))}
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
  return (
    <div className="screen tools">
      <header className="top">
        <div>
          <h1 className="page-title">GARAGE TOOLS</h1>
          <div className="logo-sub">TUNE · PAINT · STAND OUT</div>
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
