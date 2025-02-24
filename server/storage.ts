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

      // Query the experience_packages collection
      const experiencesRef = adminDb.collection('experience_packages');
      const snapshot = await experiencesRef.get();

      if (snapshot.empty) {
        console.log('No experiences found in collection');
        return [];
      }

      // Map all experiences first
      let results = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as YachtExperience[];

      console.log(`Found ${results.length} total experiences`);

      // Apply filters progressively if they exist
      if (filters) {
        // Filter by type (yacht cruise)
        if (filters.type === 'yacht-cruise') {
          console.log('Filtering by yacht cruise...');
          results = results.filter(exp => 
            exp.tags && exp.tags.some(tag => 
              ['yacht', 'cruise', 'luxury'].includes(tag.toLowerCase())
            )
          );
          console.log(`After yacht filter: ${results.length} experiences`);
        }

        // Filter by region
        if (filters.region) {
          console.log(`Filtering by region: ${filters.region}`);
          results = results.filter(exp => 
            exp.location.address.toLowerCase().includes(filters.region.toLowerCase())
          );
          console.log(`After region filter: ${results.length} experiences`);
        }

        // Filter by port/marina
        if (filters.port_marina) {
          console.log(`Filtering by marina: ${filters.port_marina}`);
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

      // Get all experiences from experience_packages collection
      const snapshot = await adminDb.collection('experience_packages').get();

      if (snapshot.empty) {
        console.log('No experiences found');
        return [];
      }

      const allExperiences = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as YachtExperience[];

      // Get featured experiences based on reviews or featured flag
      const featuredExperiences = allExperiences
        .filter(exp => {
          // Check if experience has high rating reviews
          const hasHighRating = exp.reviews?.some(review => review.rating >= 4.5);
          // Check if experience is marked as featured
          const isFeatured = exp.featured === true;
          return hasHighRating || isFeatured;
        })
        .slice(0, 6); // Limit to 6 featured experiences

      console.log(`Found ${featuredExperiences.length} featured experiences`);
      return featuredExperiences;
    } catch (error) {
      console.error('Error fetching featured experiences:', error);
      return [];
    }
  }
}

export const storage = new FirestoreStorage();