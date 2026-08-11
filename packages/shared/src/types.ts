export type Category = 'gearbox' | 'vinyl' | 'tune' | 'nick';

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
  configCode: string;
  active: boolean;
  sortOrder: number;
}

export interface User {
  id: number;
  telegramId: number;
  username: string | null;
  firstName: string;
  creditsStars: number;
  createdAt: number;
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

export interface Trade {
  id: number;
  kind: 'money' | 'car' | 'vinyl';
  offer: string;
  receive: string;
  peer: string;
  status: 'waiting' | 'escrow' | 'completed';
  createdAt: number;
}

export interface MeResponse {
  user: User;
  purchasesCount: number;
  totalSpent: number;
}

export interface BuyResponse {
  link: string;
}

export interface BuyRequest {
  productId: number;
}
