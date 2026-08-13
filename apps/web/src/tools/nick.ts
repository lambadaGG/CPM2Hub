export const NICK_BASES = [
  'FURYX', 'N1TRO', 'VELOCE', 'RAVEN', 'KAIZEN', 'APEX9',
  'BLAZE', 'CYPHER', 'DRIFT', 'EMBER', 'HAVOC', 'TITAN',
];

export interface NickStyle {
  name: string;
  render: (base: string) => string;
}

const FULLWIDTH_MAP: Record<string, string> = {
  A: 'Ａ', B: 'Ｂ', C: 'Ｃ', D: 'Ｄ', E: 'Ｅ', F: 'Ｆ', G: 'Ｇ', H: 'Ｈ', I: 'Ｉ',
  J: 'Ｊ', K: 'Ｋ', L: 'Ｌ', M: 'Ｍ', N: 'Ｎ', O: 'Ｏ', P: 'Ｐ', Q: 'Ｑ', R: 'Ｒ',
  S: 'Ｓ', T: 'Ｔ', U: 'Ｕ', V: 'Ｖ', W: 'Ｗ', X: 'Ｘ', Y: 'Ｙ', Z: 'Ｚ',
  '0': '０', '1': '１', '2': '２', '3': '３', '4': '４', '5': '５', '6': '６',
  '7': '７', '8': '８', '9': '９',
};

const LEET_MAP: Record<string, string> = {
  A: '4', E: '3', I: '1', O: '0', S: '5', T: '7', B: '8',
};

const MIRROR_MAP: Record<string, string> = {
  A: 'Д', B: 'ʙ', E: 'Ǝ', K: 'ʞ', M: 'w', R: 'Я', U: '∩', W: 'M', X: 'χ', Y: 'ʎ',
};

const toFullwidth = (s: string) => s.split('').map((ch) => FULLWIDTH_MAP[ch] ?? ch).join('');
const toLeet = (s: string) => s.split('').map((ch) => LEET_MAP[ch] ?? ch).join('');
const toMirror = (s: string) => s.split('').map((ch) => MIRROR_MAP[ch] ?? ch).join('');
const toAlternate = (s: string) =>
  s.split('').map((ch, i) => (i % 2 ? ch.toLowerCase() : ch)).join('');
const toSqueeze = (s: string) => s.split('').join('_');
const toDots = (s: string) => s.split('').join('·');

export const NICK_STYLES: NickStyle[] = [
  { name: 'classic', render: (b) => `xX_${b}_Xx` },
  { name: 'fullwidth', render: (b) => toFullwidth(b) },
  { name: 'leet', render: (b) => toLeet(b) },
  { name: 'mirror', render: (b) => toMirror(b) },
  { name: 'altcase', render: (b) => toAlternate(b) },
  { name: 'accents', render: (b) => b.replace(/A/g, 'Á').replace(/E/g, 'É').replace(/O/g, 'Ó').replace(/U/g, 'Ú').replace(/Y/g, 'Ý') },
  { name: 'spaced', render: (b) => toSqueeze(b) },
  { name: 'dotted', render: (b) => toDots(b) },
  { name: 'wrapped', render: (b) => `【${b}】` },
  { name: 'double', render: (b) => `${b}${b[b.length - 1]}${b[b.length - 1]}` },
  { name: 'creepy', render: (b) => `卍${b}卍` },
  { name: 'star', render: (b) => `✦${b}✦` },
];

export function renderNick(style: NickStyle, base: string): string {
  const clean = base.replace(/[^A-Za-z0-9_]/g, '').toUpperCase() || 'FURYX';
  return style.render(clean);
}

export function randomNick(): string {
  const base = NICK_BASES[Math.floor(Math.random() * NICK_BASES.length)];
  const style = NICK_STYLES[Math.floor(Math.random() * NICK_STYLES.length)];
  return renderNick(style, base);
}
