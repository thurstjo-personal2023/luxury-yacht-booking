import { Timestamp } from "firebase/firestore";

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  region: "dubai" | "abu-dhabi";
  port_marina: string;
}

export interface Media {
  type: 'image' | 'video';
  url: string;
}

export interface CustomizationOption {
  name: string;
  price: number;
}

export interface YachtExperience {
  package_id: string;
  title: string;
  description: string;
  category: string;
  location: Location;
  duration: number;
  capacity: number;
  pricing: number;
  pricing_model: "Fixed" | "Variable";
  customization_options: CustomizationOption[];
  media: Media[];
  availability_status: boolean;
  tags: string[];
  created_date: Timestamp;
  last_updated_date: Timestamp;
  published_status: boolean;
}

export interface YachtProfile {
  yacht_id: string;
  name: string;
  model: string;
  year: number;
  length: number;
  beam: number;
  description: string;
  features: string[];
  media: Media[];
  max_guests: number;
  crew_size: number;
  location: Location;
  availability_status: boolean;
  created_date: Timestamp;
  last_updated_date: Timestamp;
}

export interface Notification {
  notificationId: string;
  title: string;
  message: string;
  type: string;
  recipientId: string;
  sentDate: Timestamp;
  readStatus: boolean;
}

export interface ProductAddOn {
  productId: string;
  name: string;
  description: string;
  category: string;
  pricing: number;
  media: Media[];
  availability: boolean;
  tags: string[];
  partnerId: string;
  createdDate: Timestamp;
  lastUpdatedDate: Timestamp;
}

export interface Promotion {
  promotionId: string;
  title: string;
  description: string;
  startDate: Timestamp;
  endDate: Timestamp;
  applicablePackages: string[];
  discountType: 'Percentage' | 'Fixed';
  discountValue: number;
  termsAndConditions: string;
  tags: string[];
  createdDate: Timestamp;
  lastUpdatedDate: Timestamp;
}

export interface Review {
  reviewId: string;
  reviewerId: string;
  relatedContentId: string;
  rating: number;
  reviewText: string;
  photos: string[];
  createdDate: Timestamp;
}

export interface SupportContent {
  supportId: string;
  question: string;
  answer: string;
  relatedTopics: string[];
  createdDate: Timestamp;
  lastUpdatedDate: Timestamp;
}

export interface ServiceProviderProfile {
  providerId: string;
  businessName: string;
  contactInformation: {
    email: string;
    phone: string;
    address: string;
  };
  profilePhoto: string;
  servicesOffered: string[];
  certifications: string[];
  ratings: number;
  tags: string[];
  createdDate: Timestamp;
  lastUpdatedDate: Timestamp;
}

export interface TouristProfile {
  userId: string;
  name: string;
  email: string;
  phoneNumber: string;
  profilePhoto: string;
  loyaltyTier: string;
  preferences: string[];
  wishlist: string[];
  bookingHistory: string[];
  reviewsProvided: string[];
  createdDate: Timestamp;
}

export interface Article {
  articleId: string;
  title: string;
  author: string;
  publishDate: Timestamp;
  content: string;
  media: Media[];
  tags: string[];
  relatedExperiences: string[];
  createdDate: Timestamp;
  lastUpdatedDate: Timestamp;
}

export interface Event {
  eventId: string;
  title: string;
  description: string;
  dateTime: Timestamp;
  location: Location;
  registrationLink: string;
  media: Media[];
  tags: string[];
  createdDate: Timestamp;
  lastUpdatedDate: Timestamp;
}