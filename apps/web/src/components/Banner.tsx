import { Icon } from './Icons';

export function Banner() {
  return (
    <div className="banner">
      <svg className="bgimg" viewBox="0 0 640 320" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#050508" /><stop offset="1" stopColor="#0d0d11" /></linearGradient>
          <radialGradient id="moon" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#2a2a33" /><stop offset="1" stopColor="transparent" /></radialGradient>
          <radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#2AABEE" stopOpacity=".28" /><stop offset="1" stopColor="#2AABEE" stopOpacity="0" /></radialGradient>
        </defs>
        <rect width="640" height="320" fill="url(#sky)" />
        <circle cx="522" cy="50" r="92" fill="url(#moon)" />
        <circle cx="320" cy="176" r="40" fill="url(#glow)" />
        <g stroke="#fff" strokeOpacity="0.05">
          <line x1="0" y1="168" x2="640" y2="168" />
          <line x1="80" y1="60" x2="120" y2="168" />
          <line x1="560" y1="60" x2="520" y2="168" />
        </g>
        <g stroke="#fff" strokeOpacity="0.06"><line x1="40" y1="230" x2="70" y2="230" /><line x1="90" y1="250" x2="140" y2="250" /><line x1="470" y1="240" x2="520" y2="240" /><line x1="540" y1="258" x2="600" y2="258" /></g>
        <path d="M208 320 L274 168 L366 168 L432 320 Z" fill="#101014" />
        <path d="M208 320 L274 168" stroke="#fff" strokeOpacity=".14" />
        <path d="M432 320 L366 168" stroke="#fff" strokeOpacity=".14" />
        <g stroke="#fff" strokeOpacity=".3" strokeLinecap="round" strokeWidth="2.5">
          <line x1="286" y1="306" x2="320" y2="306" /><line x1="292" y1="288" x2="320" y2="288" /><line x1="297" y1="270" x2="320" y2="270" /><line x1="302" y1="252" x2="320" y2="252" /><line x1="307" y1="234" x2="320" y2="234" /><line x1="311" y1="216" x2="320" y2="216" /><line x1="314" y1="200" x2="320" y2="200" /><line x1="316" y1="188" x2="320" y2="188" />
          <line x1="320" y1="306" x2="354" y2="306" /><line x1="320" y1="288" x2="348" y2="288" /><line x1="320" y1="270" x2="343" y2="270" /><line x1="320" y1="252" x2="338" y2="252" /><line x1="320" y1="234" x2="333" y2="234" /><line x1="320" y1="216" x2="329" y2="216" /><line x1="320" y1="200" x2="326" y2="200" />
        </g>
        <g transform="translate(232,208)">
          <ellipse cx="66" cy="72" rx="96" ry="13" fill="url(#glow)" />
          <path d="M-6 70 L-4 54 L10 46 L40 34 Q54 29 64 29 L86 31 Q110 34 118 46 L130 60 L132 70 Z" fill="#040406" stroke="#fff" strokeOpacity=".08" />
          <path d="M40 35 L52 47 L86 48 L98 37 Q78 31 40 35 Z" fill="#0e0e12" />
          <path d="M128 60 L130 70 L124 70 Z" fill="#fff" fillOpacity=".5" />
          <circle cx="30" cy="74" r="18" fill="#000" /><circle cx="100" cy="74" r="18" fill="#000" />
          <circle cx="30" cy="74" r="9.5" fill="#1a1a1f" /><circle cx="100" cy="74" r="9.5" fill="#1a1a1f" />
        </g>
      </svg>
      <div className="shade" />
      <div className="cnt">
        <div className="eyebrow"><span className="dot" />GLOBAL MARKETPLACE</div>
        <div>
          <h1>Instant Gearbox<br />& Livery Delivery</h1>
          <button className="cta-white" style={{ marginTop: 14 }}>
            Explore Marketplace
            <Icon id="i-bolt" />
          </button>
        </div>
      </div>
    </div>
  );
}
