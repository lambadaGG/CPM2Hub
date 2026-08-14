import { api } from './client';
import type { BuyRequest, BuyResponse, Category, CreateProductRequest, MeResponse, ModerationStatus, Params, PatchProductRequest, PayResponse, Product, ProductMedia, Purchase, Trade } from '@gm/shared';

export { api } from './client';
export type {
  BuyRequest,
  BuyResponse,
  Category,
  CreateProductRequest,
  MeResponse,
  ModerationStatus,
  Params,
  PatchProductRequest,
  PayResponse,
  Product,
  ProductMedia,
  Purchase,
  SellCategory,
  SellerInfo,
  Trade,
  TradeStatus,
  User,
} from '@gm/shared';
export { ALL_CATEGORIES, CATEGORY_META, PARAM_FIELDS, RISK_BY_CATEGORY, SELL_CATEGORIES } from '@gm/shared';

export const getMe = () => api<MeResponse>('/me');
export const getProducts = (category?: Category) =>
  api<Product[]>(category ? `/products?category=${category}` : '/products');
export const getMyProducts = () => api<Product[]>('/products/mine');
export const createProduct = (body: CreateProductRequest) =>
  api<Product>('/products', { method: 'POST', body: JSON.stringify(body) });
export const patchProduct = (id: number, body: PatchProductRequest) =>
  api<Product>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
export const deleteProduct = (id: number) =>
  api<{ ok: boolean }>(`/products/${id}`, { method: 'DELETE' });
export const payProduct = (id: number) =>
  api<PayResponse>(`/products/${id}/pay`, { method: 'POST' });
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
