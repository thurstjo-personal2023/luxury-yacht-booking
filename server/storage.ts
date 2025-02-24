import { adminDb } from "./firebase-admin";
import type { YachtExperience } from "@shared/firestore-schema";

export interface IStorage {
  // Experience Packages
  getAllExperiencePackages(filters?: {
    type?: string;
    region?: string;
    port_marina?: string;
  }): Promise<YachtExperience[]>;
  getFeaturedExperiencePackages(): Promise<YachtExperience[]>;
}

export class FirestoreStorage implements IStorage {
  async getAllExperiencePackages(filters?: {
    type?: string;
    region?: string;
    port_marina?: string;
  }): Promise<YachtExperience[]> {
    try {
      console.log('Getting experiences with filters:', filters);

      // Start by getting all experiences
      const snapshot = await adminDb.collection('yacht_experiences').get();
      let results = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as YachtExperience[];

      console.log(`Initial experiences count: ${results.length}`);

      // Apply filters progressively if they exist
      if (filters) {
        // Type filter (yacht-cruise)
        if (filters.type === 'yacht-cruise') {
          results = results.filter(exp => 
            exp.tags && exp.tags.some(tag => 
              ['yacht', 'cruise', 'luxury'].includes(tag.toLowerCase())
            )
          );
          console.log(`After type filter: ${results.length} experiences`);
        }

        // Region filter
        if (filters.region) {
          const regionLower = filters.region.toLowerCase();
          results = results.filter(exp => 
            exp.location.address.toLowerCase().includes(regionLower)
          );
          console.log(`After region filter: ${results.length} experiences`);
        }

        // Port/Marina filter
        if (filters.port_marina) {
          results = results.filter(exp => 
            exp.location.port_marina === filters.port_marina
          );
          console.log(`After marina filter: ${results.length} experiences`);
        }
      }

      return results;
    } catch (error) {
      console.error('Error fetching experience packages:', error);
      return [];
    }
  }

  async getFeaturedExperiencePackages(): Promise<YachtExperience[]> {
    try {
      const snapshot = await adminDb.collection('yacht_experiences')
        .where('featured', '==', true)
        .limit(6)
        .get();
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as YachtExperience[];
    } catch (error) {
      console.error('Error fetching featured experiences:', error);
      return [];
    }
  }
}

export const storage = new FirestoreStorage();