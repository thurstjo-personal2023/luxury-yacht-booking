import { adminDb } from "./firebase-admin";
import type { YachtExperience } from "@shared/firestore-schema";

export interface IStorage {
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

      // Query the yacht_experiences collection
      const experiencesRef = adminDb.collection('yacht_experiences');
      const snapshot = await experiencesRef.get();

      if (snapshot.empty) {
        console.log('No experiences found in collection');
        return [];
      }

      let results = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as YachtExperience[];

      console.log(`Found ${results.length} experiences before filtering`);

      // Apply filters if they exist
      if (filters) {
        if (filters.type === 'yacht-cruise') {
          results = results.filter(exp => 
            exp.tags && exp.tags.some(tag => 
              ['yacht', 'cruise', 'luxury'].includes(tag.toLowerCase())
            )
          );
          console.log(`After yacht-cruise filter: ${results.length} experiences`);
        }

        if (filters.region) {
          results = results.filter(exp => 
            exp.location.address.toLowerCase().includes(filters.region.toLowerCase())
          );
          console.log(`After region filter: ${results.length} experiences`);
        }

        if (filters.port_marina) {
          results = results.filter(exp => 
            exp.location.port_marina === filters.port_marina
          );
          console.log(`After marina filter: ${results.length} experiences`);
        }
      }

      console.log(`Returning ${results.length} experiences`);
      return results;
    } catch (error) {
      console.error('Error fetching experience packages:', error);
      return [];
    }
  }

  async getFeaturedExperiencePackages(): Promise<YachtExperience[]> {
    try {
      console.log('Getting featured experiences');

      const snapshot = await adminDb.collection('yacht_experiences')
        .where('featured', '==', true)
        .limit(6)
        .get();

      if (snapshot.empty) {
        console.log('No featured experiences found');
        return [];
      }

      const results = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as YachtExperience[];

      console.log(`Found ${results.length} featured experiences`);
      return results;
    } catch (error) {
      console.error('Error fetching featured experiences:', error);
      return [];
    }
  }
}

export const storage = new FirestoreStorage();