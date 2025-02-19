import { adminDb } from "./firebase-admin";
import type {
  YachtProfile,
  TouristProfile,
  ServiceProviderProfile,
  ExperiencePackage,
  Review,
  Product,
  Article,
  Event,
  Notification,
  Promotion,
  SupportContent
} from "@shared/firestore-schema";

export interface IStorage {
  // Yacht Profiles
  getYachtProfile(id: string): Promise<YachtProfile | undefined>;
  getAllYachtProfiles(): Promise<YachtProfile[]>;
  getFeaturedYachtProfiles(): Promise<YachtProfile[]>;

  // Tourist Profiles
  getTouristProfile(id: string): Promise<TouristProfile | undefined>;
  getTouristProfileByEmail(email: string): Promise<TouristProfile | undefined>;

  // Service Provider Profiles
  getServiceProviderProfile(id: string): Promise<ServiceProviderProfile | undefined>;
  getServiceProviderByEmail(email: string): Promise<ServiceProviderProfile | undefined>;

  // Experience Packages
  getExperiencePackage(id: string): Promise<ExperiencePackage | undefined>;
  getAllExperiencePackages(): Promise<ExperiencePackage[]>;
  getFeaturedExperiencePackages(): Promise<ExperiencePackage[]>;
}

export class FirestoreStorage implements IStorage {
  // Yacht Profiles
  async getYachtProfile(id: string): Promise<YachtProfile | undefined> {
    const doc = await adminDb.collection('yacht_experiences').doc(id).get();
    return doc.exists ? doc.data() as YachtProfile : undefined;
  }

  async getAllYachtProfiles(): Promise<YachtProfile[]> {
    const snapshot = await adminDb.collection('yacht_experiences').get();
    return snapshot.docs.map(doc => doc.data() as YachtProfile);
  }

  async getFeaturedYachtProfiles(): Promise<YachtProfile[]> {
    const snapshot = await adminDb.collection('yacht_experiences')
      .limit(6)
      .get();
    return snapshot.docs.map(doc => doc.data() as YachtProfile);
  }

  // Tourist Profiles
  async getTouristProfile(id: string): Promise<TouristProfile | undefined> {
    const doc = await adminDb.collection('user_profiles_tourist').doc(id).get();
    return doc.exists ? doc.data() as TouristProfile : undefined;
  }

  async getTouristProfileByEmail(email: string): Promise<TouristProfile | undefined> {
    const snapshot = await adminDb.collection('user_profiles_tourist')
      .where('email', '==', email)
      .limit(1)
      .get();
    return snapshot.empty ? undefined : snapshot.docs[0].data() as TouristProfile;
  }

  // Service Provider Profiles
  async getServiceProviderProfile(id: string): Promise<ServiceProviderProfile | undefined> {
    const doc = await adminDb.collection('user_profiles_service_provider').doc(id).get();
    return doc.exists ? doc.data() as ServiceProviderProfile : undefined;
  }

  async getServiceProviderByEmail(email: string): Promise<ServiceProviderProfile | undefined> {
    const snapshot = await adminDb.collection('user_profiles_service_provider')
      .where('email', '==', email)
      .limit(1)
      .get();
    return snapshot.empty ? undefined : snapshot.docs[0].data() as ServiceProviderProfile;
  }

  // Experience Packages
  async getExperiencePackage(id: string): Promise<ExperiencePackage | undefined> {
    const doc = await adminDb.collection('experience_packages').doc(id).get();
    return doc.exists ? doc.data() as ExperiencePackage : undefined;
  }

  async getAllExperiencePackages(): Promise<ExperiencePackage[]> {
    const snapshot = await adminDb.collection('experience_packages').get();
    return snapshot.docs.map(doc => doc.data() as ExperiencePackage);
  }

  async getFeaturedExperiencePackages(): Promise<ExperiencePackage[]> {
    const snapshot = await adminDb.collection('experience_packages')
      .limit(6)
      .get();
    return snapshot.docs.map(doc => doc.data() as ExperiencePackage);
  }
}

export const storage = new FirestoreStorage();