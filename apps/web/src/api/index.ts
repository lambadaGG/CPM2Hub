import { api } from './client';
import type { BuyRequest, BuyResponse, Category, CreateProductRequest, DailyClaimResponse, MeResponse, ModerationStatus, Params, PatchProductRequest, PayResponse, Product, ProductMedia, Purchase, RateResponse, Trade, Build, CreateBuildRequest, PatchBuildRequest, BuildRateResponse, TrackEventRequest, CreatorProfile } from '@gm/shared';

export { api } from './client';
export type {
  BuyRequest,
  BuyResponse,
  Category,
  CreateProductRequest,
  DailyClaimResponse,
  MeResponse,
  ModerationStatus,
  Params,
  PatchProductRequest,
  PayResponse,
  Product,
  ProductMedia,
  Purchase,
  RateResponse,
  SellCategory,
  SellerInfo,
  Trade,
  TradeStatus,
  User,
  Build,
  CreateBuildRequest,
  PatchBuildRequest,
  BuildRateResponse,
  TrackEventRequest,
  CreatorProfile,
} from '@gm/shared';
export { ALL_CATEGORIES, CATEGORY_META, NEW_CATEGORIES, PARAM_FIELDS, RISK_BY_CATEGORY, SELL_CATEGORIES } from '@gm/shared';

export const getMe = () => api<MeResponse>('/me');
export const getReferral = () => api<{ code: string; link: string; count: number; rewardStars: number; totalEarned: number }>('/me/referral');
export const getReferralList = () => api<{ users: ReferralUser[]; totalEarned: number }>('/me/referral/list');
export const getReferralLeaderboard = () => api<{ leaderboard: ReferralLeaderboardEntry[] }>('/me/referral/leaderboard');
export const claimDaily = () => api<{ claim: DailyClaimResponse }>('/me/claim-daily', { method: 'POST' });
export const getProducts = (category?: Category) =>
  api<Product[]>(category ? `/products?category=${category}` : '/products');
export const getMyProducts = () => api<Product[]>('/products/mine');

// Home-page data prefetched during the splash screen so the market renders
// instantly on first open instead of waiting for a spinner.
interface PreloadData {
  me: MeResponse | null;
  products: Product[] | null;
}

let preloadCache: PreloadData = { me: null, products: null };

export async function preloadHome(): Promise<void> {
  try {
    const [me, products] = await Promise.all([getMe(), getProducts()]);
    preloadCache = { me, products };
  } catch {
    /* ignore — Market will fetch normally */
  }
}

export function takePreloaded(): PreloadData {
  const data = preloadCache;
  preloadCache = { me: null, products: null };
  return data;
}
export const createProduct = (body: CreateProductRequest) =>
  api<Product>('/products', { method: 'POST', body: JSON.stringify(body) });
export const patchProduct = (id: number, body: PatchProductRequest) =>
  api<Product>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
export const deleteProduct = (id: number) =>
  api<{ ok: boolean }>(`/products/${id}`, { method: 'DELETE' });
export const payProduct = (id: number) =>
  api<PayResponse>(`/products/${id}/pay`, { method: 'POST' });
export const rateProduct = (id: number, value: number) =>
  api<RateResponse>(`/products/${id}/rate`, { method: 'POST', body: JSON.stringify({ value }) });
export const toggleWishlist = (id: number) =>
  api<{ wishlisted: boolean }>(`/products/${id}/wishlist`, { method: 'POST' });
export const getDownloads = () => api<Purchase[]>('/my/downloads');
export const getTrades = () => api<Trade[]>('/trades');
export const createTrade = (body: { kind: string; offer: string; receive: string; peer: string }) =>
  api<{ id: number; status: string }>('/trades', { method: 'POST', body: JSON.stringify(body) });
export const tradeAction = (id: number, action: 'accept' | 'decline' | 'cancel' | 'complete' | 'dispute') =>
  api<{ id: number; status: string }>(`/trades/${id}/${action}`, { method: 'POST' });
export const buyProduct = (req: BuyRequest) =>
  api<BuyResponse>(`/products/${req.productId}/buy`, { method: 'POST' });
export const topupStars = (amount: number) =>
  api<BuyResponse>('/topup', { method: 'POST', body: JSON.stringify({ amount }) });

export interface AdminStarsStats {
  bot: { balance: number; revenue: number };
  platform: { totalSalesStars: number; pendingBuys: number; pendingTopups: number; liveProducts: number };
}

export interface AdminPurchase {
  id: number;
  amountStars: number;
  status: string;
  refunded: boolean;
  chargeId: string | null;
  createdAt: number;
  productTitle: string;
  buyer: { username: string | null; firstName: string; telegramId: number };
}

export const getAdminStars = () => api<AdminStarsStats>('/admin/stars');
export const getAdminPending = () => api<Product[]>('/admin/pending');
export const adminModerate = (id: number, status: ModerationStatus) =>
  api<{ id: number; moderationStatus: ModerationStatus }>(`/admin/products/${id}/moderate`, { method: 'POST', body: JSON.stringify({ status }) });
export const getAdminPurchases = (limit = 50) =>
  api<AdminPurchase[]>(`/admin/purchases?limit=${limit}`);
export const adminRefund = (purchaseId: number) =>
  api<{ ok: boolean; purchaseId: number }>('/admin/refund', { method: 'POST', body: JSON.stringify({ purchaseId }) });
export const adminGrant = (telegramId: number, credits: { stars?: number; tn?: number }) =>
  api<{ ok: boolean; telegramId: number; creditsStars: number; creditsTn: number }>('/admin/grant', { method: 'POST', body: JSON.stringify({ telegramId, ...credits }) });

export interface ReferralUser {
  id: number;
  firstName: string;
  username: string | null;
  telegramId: number;
  joinedAt: number;
  earned: number;
  purchases: number;
}

export interface ReferralLeaderboardEntry {
  rank: number;
  id: number;
  firstName: string;
  username: string | null;
  telegramId: number;
  totalEarned: number;
  purchases: number;
}

export const getAdminReferral = () => api<{ totalUsers: number; totalReferred: number; totalRewards: number; rewardCount: number; referredPercent: number }>('/admin/referral');

// ── Builds ──

export const getBuilds = (params?: { authorId?: number; featured?: boolean }) => {
  const q = new URLSearchParams();
  if (params?.authorId) q.set('authorId', String(params.authorId));
  if (params?.featured) q.set('featured', '1');
  const qs = q.toString();
  return api<Build[]>(`/builds${qs ? `?${qs}` : ''}`);
};
export const getBuild = (id: number) => api<Build>(`/builds/${id}`);
export const createBuild = (body: CreateBuildRequest) =>
  api<Build>('/builds', { method: 'POST', body: JSON.stringify(body) });
export const patchBuild = (id: number, body: PatchBuildRequest) =>
  api<Build>(`/builds/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
export const deleteBuild = (id: number) =>
  api<{ ok: boolean }>(`/builds/${id}`, { method: 'DELETE' });
export const toggleBuildLike = (id: number) =>
  api<{ liked: boolean; likesCount: number }>(`/builds/${id}/like`, { method: 'POST' });
export const rateBuild = (id: number, value: number) =>
  api<BuildRateResponse>(`/builds/${id}/rate`, { method: 'POST', body: JSON.stringify({ value }) });
export const getCreator = (id: number) => api<CreatorProfile>(`/creators/${id}`);

// ── Events ──

export const trackEvent = (body: TrackEventRequest) =>
  api<{ ok: boolean }>('/events', { method: 'POST', body: JSON.stringify(body) });
