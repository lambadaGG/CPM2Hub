import type { Category, MediaType, ModerationStatus, SellCategory } from './market';

export * from './market';

export type Params = Record<string, string | number | string[] | null>;

export interface SellerInfo {
  id: number;
  username: string | null;
  firstName: string;
}

export interface ProductMedia {
  type: MediaType;
  previewUrl?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
  beforeUrl?: string | null;
  afterUrl?: string | null;
}

export interface Product {
  id: number;
  slug: string;
  category: Category;
  title: string;
  subtitle: string;
  priceStars: number;
  downloads: number;
  verified: boolean;
  glyph: string;
  configCode?: string;
  active: boolean;
  sortOrder: number;
  sellerId: number | null;
  seller?: SellerInfo | null;
  media?: ProductMedia;
  serverName?: string | null;
  params?: Params;
  moderationStatus: ModerationStatus;
  rating?: { avg: number; count: number };
  wishlisted?: boolean;
  guideUrl?: string | null;
}

export interface CreateProductRequest {
  category: SellCategory;
  title: string;
  subtitle?: string;
  priceStars: number;
  configCode: string;
  media?: ProductMedia;
  serverName?: string;
  params?: Params;
  guideUrl?: string;
}

export interface PatchProductRequest {
  title?: string;
  subtitle?: string;
  priceStars?: number;
  configCode?: string;
  active?: boolean;
  media?: ProductMedia;
  serverName?: string;
  params?: Params;
  guideUrl?: string;
}

export interface PayResponse {
  purchaseId: number;
  productTitle: string;
  configCode: string;
  method?: 'tn' | 'stars' | 'invoice';
  link?: string | null;
}

export interface User {
  id: number;
  telegramId: number;
  username: string | null;
  firstName: string;
  creditsStars: number;
  creditsTn: number;
  createdAt: number;
  referralCode?: string;
  streak?: number;
  dailyClaimed?: boolean;
}

export interface DailyClaimResponse {
  streak: number;
  rewardStars: number;
  bonusStars: number;
  configCode: string;
  configTitle: string;
}

export interface RateResponse {
  rating: { avg: number; count: number };
  value: number;
}

export interface Purchase {
  id: number;
  productId: number;
  chargeId: string | null;
  amountStars: number;
  status: 'pending' | 'paid';
  createdAt: number;
  product?: Product;
}

export type TradeStatus = 'waiting' | 'escrow' | 'completed' | 'cancelled' | 'disputed';

export interface Trade {
  id: number;
  kind: 'money' | 'car' | 'vinyl';
  offer: string;
  receive: string;
  peer: string;
  peerUserId: number | null;
  status: TradeStatus;
  role: 'creator' | 'peer';
  createdAt: number;
  updatedAt: number;
}

export interface MeResponse {
  user: User;
  purchasesCount: number;
  totalSpent: number;
  isAdmin: boolean;
  referralCode: string;
  referralCount: number;
  streak: number;
  dailyClaimed: boolean;
  /** Last 7 days (oldest → today) with per-day claim status for the streak widget. */
  week: Array<{ date: string; claimed: boolean }>;
}

export interface BuyResponse {
  link: string;
}

export interface BuyRequest {
  productId: number;
}
