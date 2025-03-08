import { adminDb } from "./firebase-admin";
import type { ProductAddOn, YachtExperience } from "@shared/firestore-schema";

interface PaginationData {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationData;
}

export interface IStorage {
  getAllExperiencePackages(filters?: {
    type?: string;
    region?: string;
    port_marina?: string;
    page?: number;
    pageSize?: number;
    sortByStatus?: boolean;
  }): Promise<PaginatedResponse<YachtExperience>>;
  getFeaturedExperiencePackages(): Promise<YachtExperience[]>;
  getAllProductAddOns(filters?: {
    category?: string;
    partnerId?: string;
    page?: number;
    pageSize?: number;
    sortByStatus?: boolean;
  }): Promise<PaginatedResponse<ProductAddOn>>;
}

export class FirestoreStorage implements IStorage {
  async getAllExperiencePackages(filters?: {
    type?: string;
    region?: string;
    port_marina?: string;
    page?: number;
    pageSize?: number;
    sortByStatus?: boolean;
  }): Promise<PaginatedResponse<YachtExperience>> {
    try {
      console.log('Getting experiences with filters:', filters);

      // Try the new consolidated collection first
      let experiencesRef = adminDb.collection('yacht_experiences');
      let snapshot = await experiencesRef.get();

      // If no data in consolidated collection, fall back to the old collection
      if (snapshot.empty) {
        console.log('No experiences found in yacht_experiences collection, trying experience_packages');
        experiencesRef = adminDb.collection('experience_packages');
        snapshot = await experiencesRef.get();
      }

      if (snapshot.empty) {
        console.log('No experiences found in any collection');
        return {
          data: [],
          pagination: {
            currentPage: 1,
            pageSize: filters?.pageSize || 10,
            totalCount: 0,
            totalPages: 0
          }
        };
      }

      // Map all experiences first
      let results = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          package_id: doc.id, // Ensure package_id is set
          id: doc.id, // Keep id for backwards compatibility
        } as YachtExperience;
      });

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
            exp.location.address.toLowerCase().includes((filters.region as string).toLowerCase())
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
        
        // Sort by availability status if requested (active first)
        if (filters.sortByStatus) {
          console.log('Sorting by availability status (active first)');
          results.sort((a, b) => {
            if (a.availability_status === b.availability_status) return 0;
            return a.availability_status ? -1 : 1; // Active items first
          });
        }
      }

      // Calculate pagination
      const totalCount = results.length;
      const pageSize = filters?.pageSize || 10;
      const totalPages = Math.ceil(totalCount / pageSize);
      const currentPage = filters?.page || 1;
      
      // Apply pagination
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedResults = results.slice(startIndex, endIndex);
      
      console.log(`Returning ${paginatedResults.length} experiences (page ${currentPage} of ${totalPages})`);
      
      return {
        data: paginatedResults,
        pagination: {
          currentPage,
          pageSize,
          totalCount,
          totalPages
        }
      };
    } catch (error) {
      console.error('Error fetching experience packages:', error);
      return {
        data: [],
        pagination: {
          currentPage: 1,
          pageSize: filters?.pageSize || 10,
          totalCount: 0,
          totalPages: 0
        }
      };
    }
  }

  async getFeaturedExperiencePackages(): Promise<YachtExperience[]> {
    try {
      console.log('Getting featured experiences');

      // Try the new consolidated collection first
      let snapshot = await adminDb.collection('yacht_experiences').get();

      // If no data in consolidated collection, fall back to the old collection
      if (snapshot.empty) {
        console.log('No experiences found in yacht_experiences collection, trying experience_packages');
        snapshot = await adminDb.collection('experience_packages').get();
      }

      if (snapshot.empty) {
        console.log('No experiences found in any collection');
        return [];
      }

      const allExperiences = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          package_id: doc.id, // Ensure package_id is set
          id: doc.id, // Keep id for backwards compatibility
        } as YachtExperience;
      });

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
  
  async getAllProductAddOns(filters?: {
    category?: string;
    partnerId?: string;
    page?: number;
    pageSize?: number;
    sortByStatus?: boolean;
  }): Promise<PaginatedResponse<ProductAddOn>> {
    try {
      console.log('Getting add-ons with filters:', filters);

      // Try to get from products_add_ons collection (note the underscore)
      let addOnsRef = adminDb.collection('products_add_ons');
      let snapshot = await addOnsRef.get();

      if (snapshot.empty) {
        console.log('No add-ons found in collection');
        return {
          data: [],
          pagination: {
            currentPage: 1,
            pageSize: filters?.pageSize || 10,
            totalCount: 0,
            totalPages: 0
          }
        };
      }

      // Map all add-ons
      let results = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          productId: doc.id,
          id: doc.id, // Keep id for backwards compatibility
        } as ProductAddOn;
      });

      console.log(`Found ${results.length} total add-ons`);

      // Apply filters if they exist
      if (filters) {
        // Filter by category
        if (filters.category) {
          console.log(`Filtering by category: ${filters.category}`);
          results = results.filter(addon => 
            addon.category === filters.category
          );
          console.log(`After category filter: ${results.length} add-ons`);
        }

        // Filter by partnerId
        if (filters.partnerId) {
          console.log(`Filtering by partnerId: ${filters.partnerId}`);
          results = results.filter(addon => 
            addon.partnerId === filters.partnerId
          );
          console.log(`After partnerId filter: ${results.length} add-ons`);
        }
        
        // Sort by availability status if requested (active first)
        if (filters.sortByStatus) {
          console.log('Sorting by availability status (active first)');
          results.sort((a, b) => {
            if (a.availability === b.availability) return 0;
            return a.availability ? -1 : 1; // Active items first
          });
        }
      }

      // Calculate pagination
      const totalCount = results.length;
      const pageSize = filters?.pageSize || 10;
      const totalPages = Math.ceil(totalCount / pageSize);
      const currentPage = filters?.page || 1;
      
      // Apply pagination
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedResults = results.slice(startIndex, endIndex);
      
      console.log(`Returning ${paginatedResults.length} add-ons (page ${currentPage} of ${totalPages})`);
      
      return {
        data: paginatedResults,
        pagination: {
          currentPage,
          pageSize,
          totalCount,
          totalPages
        }
      };
    } catch (error) {
      console.error('Error fetching add-ons:', error);
      return {
        data: [],
        pagination: {
          currentPage: 1,
          pageSize: filters?.pageSize || 10,
          totalCount: 0,
          totalPages: 0
        }
      };
    }
  }
}

export const storage = new FirestoreStorage();