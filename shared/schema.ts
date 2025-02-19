import { Timestamp } from "firebase/firestore";

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

export interface Media {
  type: 'image' | 'video';
  url: string;
}

export interface Yacht {
  id: string;
  name: string;
  description: string;
  capacity: number;
  price: number;
  imageUrl: string;
  location: Location;
  features: string[];
  available: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Booking {
  id: string;
  yachtId: string;
  userId: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: Timestamp;
}

// Keep the UserRole enum as it's used in authentication
export const UserRole = {
  consumer: 'consumer',
  producer: 'producer',
  partner: 'partner'
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];