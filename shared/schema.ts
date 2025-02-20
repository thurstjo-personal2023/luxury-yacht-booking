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

// Updated UserRole enum to use proper TypeScript enum syntax
export enum UserRole {
  CONSUMER = "consumer",
  PRODUCER = "producer",
  PARTNER = "partner"
}

export type UserRoleType = UserRole;