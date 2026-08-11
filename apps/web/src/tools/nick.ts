export const NICK_BASES = ['FURYX', 'N1TRO', 'VELOCE', 'RAVEN_', 'KAIZEN', 'APEX9'];

export interface NickStyle {
  base: string;
  cssClass?: string;
}

export const NICK_STYLES: NickStyle[] = [
  { base: 'xX_FURYX_Xx' },
  { base: 'ＦＵＲＹＸ' },
  { base: 'FuRyX_' },
  { base: 'FÚRÝX' },
  { base: 'FURYX_DRIFT' },
  { base: 'FUЯYX' },
];

export function renderNick(style: string, base: string): string {
  return style.replace('FURYX', base);
}

export function randomNick(): string {
  const base = NICK_BASES[Math.floor(Math.random() * NICK_BASES.length)];
  const style = NICK_STYLES[Math.floor(Math.random() * NICK_STYLES.length)];
  return renderNick(style.base, base);
}
