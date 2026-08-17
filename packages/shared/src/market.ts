export type RiskLevel = 'low' | 'medium' | 'high';

export type MediaType = 'photo' | 'video' | 'audio' | 'before_after' | 'plate';

export type Category =
  | 'gearbox'
  | 'vinyl'
  | 'tune'
  | 'nick'
  | 'bodykit'
  | 'wheels'
  | 'engine'
  | 'suspension'
  | 'plates'
  | 'exhaust'
  | 'neon'
  | 'garage'
  | 'account'
  | 'service'
  | 'smoke'
  | 'character'
  | 'bundle';

/** Categories introduced in the v2 market — shown with a NEW badge. */
export const NEW_CATEGORIES: Category[] = ['service', 'smoke', 'character', 'bundle'];

export type SellCategory = Exclude<Category, 'account'>;

export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export type ParamType = 'text' | 'number' | 'list';

export interface ParamField {
  key: string;
  type: ParamType;
  required?: boolean;
  label: string;
}

export interface CategoryMeta {
  glyph: string;
  risk: RiskLevel;
  mediaType: MediaType;
  escrowOnly: boolean;
  requiresModeration: boolean;
  label: string;
}

const LOW: Category[] = ['gearbox', 'vinyl', 'tune', 'bodykit', 'wheels', 'suspension', 'exhaust', 'neon', 'service', 'smoke', 'character', 'bundle'];
const MEDIUM: Category[] = ['nick', 'plates', 'engine'];
const HIGH: Category[] = ['garage', 'account'];

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  gearbox: { glyph: 'gear', risk: 'low', mediaType: 'photo', escrowOnly: false, requiresModeration: false, label: 'Gearbox' },
  vinyl: { glyph: 'disc', risk: 'low', mediaType: 'photo', escrowOnly: false, requiresModeration: false, label: 'Vinyl' },
  tune: { glyph: 'gauge', risk: 'low', mediaType: 'photo', escrowOnly: false, requiresModeration: false, label: 'Tune' },
  nick: { glyph: 'type', risk: 'medium', mediaType: 'photo', escrowOnly: false, requiresModeration: true, label: 'Nick' },
  bodykit: { glyph: 'palette', risk: 'low', mediaType: 'before_after', escrowOnly: false, requiresModeration: false, label: 'Bodykit' },
  wheels: { glyph: 'disc', risk: 'low', mediaType: 'photo', escrowOnly: false, requiresModeration: false, label: 'Wheels' },
  engine: { glyph: 'bolt', risk: 'medium', mediaType: 'video', escrowOnly: false, requiresModeration: true, label: 'Engine Swap' },
  suspension: { glyph: 'tools', risk: 'low', mediaType: 'before_after', escrowOnly: false, requiresModeration: false, label: 'Suspension' },
  plates: { glyph: 'type', risk: 'medium', mediaType: 'plate', escrowOnly: false, requiresModeration: true, label: 'Plates' },
  exhaust: { glyph: 'zap', risk: 'low', mediaType: 'audio', escrowOnly: false, requiresModeration: false, label: 'Exhaust' },
  neon: { glyph: 'star', risk: 'low', mediaType: 'photo', escrowOnly: false, requiresModeration: false, label: 'Neon' },
  garage: { glyph: 'globe', risk: 'high', mediaType: 'photo', escrowOnly: true, requiresModeration: true, label: 'RP Garage' },
  account: { glyph: 'user', risk: 'high', mediaType: 'photo', escrowOnly: true, requiresModeration: true, label: 'Account' },
  service: { glyph: 'shieldcheck', risk: 'low', mediaType: 'photo', escrowOnly: false, requiresModeration: false, label: 'Service liveries' },
  smoke: { glyph: 'smoke', risk: 'low', mediaType: 'photo', escrowOnly: false, requiresModeration: false, label: 'Smoke' },
  character: { glyph: 'person', risk: 'low', mediaType: 'photo', escrowOnly: false, requiresModeration: false, label: 'Character' },
  bundle: { glyph: 'gift', risk: 'low', mediaType: 'photo', escrowOnly: false, requiresModeration: false, label: 'Bundle' },
};

export const RISK_BY_CATEGORY: Record<Category, RiskLevel> = Object.fromEntries(
  Object.entries(CATEGORY_META).map(([c, m]) => [c, m.risk]),
) as Record<Category, RiskLevel>;

export const ALL_CATEGORIES: Category[] = Object.keys(CATEGORY_META) as Category[];
export const SELL_CATEGORIES: SellCategory[] = ALL_CATEGORIES.filter((c) => c !== 'account');

export const PARAM_FIELDS: Record<Category, ParamField[]> = {
  gearbox: [],
  vinyl: [],
  tune: [],
  nick: [],
  bodykit: [
    { key: 'model', type: 'text', required: true, label: 'Car model' },
    { key: 'kitType', type: 'text', required: true, label: 'Kit type' },
    { key: 'author', type: 'text', label: 'Author' },
  ],
  wheels: [
    { key: 'brand', type: 'text', required: true, label: 'Wheel brand' },
    { key: 'models', type: 'list', required: true, label: 'Compatible models' },
    { key: 'offset', type: 'number', label: 'Offset' },
    { key: 'camber', type: 'number', label: 'Camber' },
    { key: 'rim', type: 'number', label: 'Rim size' },
  ],
  engine: [
    { key: 'donorEngine', type: 'text', required: true, label: 'Donor engine' },
    { key: 'targetModel', type: 'text', required: true, label: 'Target car' },
    { key: 'hp', type: 'number', required: true, label: 'HP' },
    { key: 'nm', type: 'number', label: 'Nm' },
    { key: 'zero100', type: 'number', label: '0-100 s' },
  ],
  suspension: [
    { key: 'style', type: 'text', required: true, label: 'Style' },
    { key: 'model', type: 'text', required: true, label: 'Car model' },
    { key: 'camber', type: 'number', label: 'Camber' },
    { key: 'toe', type: 'number', label: 'Toe' },
    { key: 'rideHeight', type: 'number', label: 'Ride height' },
  ],
  plates: [
    { key: 'plateText', type: 'text', required: true, label: 'Plate text' },
    { key: 'region', type: 'text', label: 'Region' },
    { key: 'style', type: 'text', label: 'Plate style' },
  ],
  exhaust: [
    { key: 'soundType', type: 'text', required: true, label: 'Sound type' },
    { key: 'model', type: 'text', label: 'Car model' },
  ],
  neon: [
    { key: 'colorScheme', type: 'text', required: true, label: 'Color scheme' },
    { key: 'zones', type: 'list', label: 'Zones' },
    { key: 'animation', type: 'text', label: 'Animation' },
  ],
  garage: [
    { key: 'location', type: 'text', label: 'Location' },
    { key: 'capacity', type: 'number', label: 'Capacity' },
  ],
  account: [
    { key: 'level', type: 'number', required: true, label: 'Level' },
    { key: 'cars', type: 'list', label: 'Cars' },
  ],
  service: [
    { key: 'model', type: 'text', required: true, label: 'Car model' },
    { key: 'variant', type: 'text', label: 'Service variant' },
  ],
  smoke: [
    { key: 'model', type: 'text', label: 'Car model' },
    { key: 'color', type: 'text', label: 'Smoke color' },
    { key: 'zones', type: 'list', label: 'Zones' },
  ],
  character: [
    { key: 'type', type: 'text', required: true, label: 'Character type' },
    { key: 'model', type: 'text', label: 'Car model' },
  ],
  bundle: [
    { key: 'contents', type: 'list', required: true, label: 'Bundle contents' },
    { key: 'discount', type: 'number', label: 'Discount %' },
  ],
};
