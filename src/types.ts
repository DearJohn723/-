import { Timestamp } from 'firebase/firestore';

export interface MonthlySale {
  yearMonth: string; // e.g., "2024-03"
  quantity: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'viewer';
  createdAt: Timestamp;
}

export interface Product {
  id: string;
  productCode: string;
  name: string;
  subName?: string;
  category: string;
  description: string;
  tags: string[];
  costPrice: number;
  agentPrice: number;
  domesticPrice: number;
  overseasPrice: number;
  stock: number;
  size: string;
  pieces: number;
  color: string;
  releaseDate: string;
  monthlySales: MonthlySale[];
  photos: string[];
  videos: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
