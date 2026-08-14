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
