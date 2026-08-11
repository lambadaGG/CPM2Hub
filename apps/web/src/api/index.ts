import { api } from './client';
import type { BuyRequest, BuyResponse, Category, MeResponse, Product, Purchase, Trade } from '@gm/shared';

export { api } from './client';
export type { BuyRequest, BuyResponse, Category, MeResponse, Product, Purchase, Trade, User } from '@gm/shared';

export const getMe = () => api<MeResponse>('/me');
export const getProducts = (category?: Category) =>
  api<Product[]>(category ? `/products?category=${category}` : '/products');
export const getDownloads = () => api<Purchase[]>('/my/downloads');
export const getTrades = () => api<Trade[]>('/trades');
export const createTrade = (body: { kind: string; offer: string; receive: string; peer: string }) =>
  api<{ id: number; status: string }>('/trades', { method: 'POST', body: JSON.stringify(body) });
export const buyProduct = (req: BuyRequest) =>
  api<BuyResponse>(`/products/${req.productId}/buy`, { method: 'POST' });
