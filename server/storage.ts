import { adminDb } from "./firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { ProductAddOn, YachtExperience } from "@shared/firestore-schema";
import type { Yacht, PaginatedYachtsResponse, YachtSummary } from "@shared/unified-schema";

// Constants for collection names
const UNIFIED_YACHT_COLLECTION = 'unified_yacht_experiences';
const LEGACY_YACHT_EXPERIENCES = 'yacht_experiences';
const LEGACY_EXPERIENCE_PACKAGES = 'experience_packages';
const LEGACY_YACHTS = 'yachts';
const PRODUCTS_ADDONS_COLLECTION = 'products_add_ons';

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
  // Legacy methods (to maintain backward compatibility during transition)
  getAllExperiencePackages(filters?: {
    type?: string;
    region?: string;
    port_marina?: string;
    page?: number;
    pageSize?: number;
    sortByStatus?: boolean;
  }): Promise<PaginatedResponse<YachtExperience>>;
  getFeaturedExperiencePackages(): Promise<YachtExperience[]>;
  
  // New unified methods
  getAllYachts(filters?: {
    type?: string;
    region?: string;
    portMarina?: string;
    page?: number;
    pageSize?: number;
    sortByStatus?: boolean;
  }): Promise<PaginatedYachtsResponse>;
  getYachtById(id: string): Promise<Yacht | null>;
  getFeaturedYachts(): Promise<YachtSummary[]>;
  createYacht(yacht: Yacht): Promise<string>;
  updateYacht(id: string, yacht: Partial<Yacht>): Promise<boolean>;
  deleteYacht(id: string): Promise<boolean>;
  
  // Producer-specific methods
  getProducerYachts(filters?: {
    producerId?: string;
    page?: number;
    pageSize?: number;
    sortByStatus?: boolean;
  }): Promise<PaginatedYachtsResponse>;
  
  // Product add-ons methods
  getAllProductAddOns(filters?: {
    category?: string;
    partnerId?: string;
    page?: number;
    pageSize?: number;
    sortByStatus?: boolean;
  }): Promise<PaginatedResponse<ProductAddOn>>;
}

export class FirestoreStorage implements IStorage {
  // New unified methods
  
  async getAllYachts(filters?: {
    type?: string;
    region?: string;
    portMarina?: string;
    page?: number;
    pageSize?: number;
    sortByStatus?: boolean;
  }): Promise<PaginatedYachtsResponse> {
    try {
      console.log('Getting yachts with filters:', filters);
      
      // Use the unified yacht collection
      const yachtsRef = adminDb.collection(UNIFIED_YACHT_COLLECTION);
      const snapshot = await yachtsRef.get();
      
      if (snapshot.empty) {
        console.log(`No yachts found in ${UNIFIED_YACHT_COLLECTION}`);
        
        // Fall back to legacy collection for migration period
        console.log('Falling back to legacy collection for backwards compatibility');
        const legacyRef = adminDb.collection(LEGACY_YACHTS);
        const legacySnapshot = await legacyRef.get();
        
        if (legacySnapshot.empty) {
          console.log('No yachts found in legacy collection either');
          return {
            yachts: [],
            pagination: {
              currentPage: 1,
              pageSize: filters?.pageSize || 10,
              totalCount: 0,
              totalPages: 0
            }
          };
        }
        
        console.log(`Found ${legacySnapshot.size} yachts in legacy collection, using them instead`);
        // Continue with legacy data
        return this.processYachtResults(legacySnapshot, filters);
      }
      
      return this.processYachtResults(snapshot, filters);
    } catch (error) {
      console.error('Error fetching yachts:', error);
      return {
        yachts: [],
        pagination: {
          currentPage: 1,
          pageSize: filters?.pageSize || 10,
          totalCount: 0,
          totalPages: 0
        }
      };
    }
  }
  
  // Helper method to process yacht query results
  private processYachtResults(
    snapshot: FirebaseFirestore.QuerySnapshot,
    filters?: {
      type?: string;
      region?: string;
      portMarina?: string;
      page?: number;
      pageSize?: number;
      sortByStatus?: boolean;
    }
  ): PaginatedYachtsResponse {
    // Map all yachts to the unified schema
    let results = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || data.name || '',
        description: data.description || '',
        category: data.category || '',
        location: {
          address: data.location?.address || '',
          latitude: data.location?.latitude || 0,
          longitude: data.location?.longitude || 0,
          region: data.location?.region || 'dubai',
          portMarina: data.location?.portMarina || data.location?.port_marina || ''
        },
        pricing: data.pricing || data.price || 0,
        capacity: data.capacity || data.max_guests || 0,
        duration: data.duration || 0,
        isAvailable: 
          data.isAvailable !== undefined ? data.isAvailable :
          data.availability_status !== undefined ? data.availability_status :
          data.available !== undefined ? data.available : false,
        isFeatured: 
          data.isFeatured !== undefined ? data.isFeatured :
          data.featured !== undefined ? data.featured : false,
        mainImage: data.media?.length > 0 ? data.media[0].url : undefined
      } as YachtSummary;
    });
    
    console.log(`Found ${results.length} total yachts`);
    
    // Apply filters progressively if they exist
    if (filters) {
      // Filter by type (yacht cruise)
      if (filters.type === 'yacht-cruise') {
        console.log('Filtering by yacht cruise...');
        results = results.filter(yacht => 
          yacht.category.toLowerCase().includes('cruise') ||
          yacht.category.toLowerCase().includes('yacht')
        );
        console.log(`After yacht filter: ${results.length} yachts`);
      }
      
      // Filter by region
      if (filters.region) {
        console.log(`Filtering by region: ${filters.region}`);
        results = results.filter(yacht => 
          yacht.location.region === filters.region ||
          yacht.location.address.toLowerCase().includes((filters.region as string).toLowerCase())
        );
        console.log(`After region filter: ${results.length} yachts`);
      }
      
      // Filter by port/marina
      if (filters.portMarina) {
        console.log(`Filtering by marina: ${filters.portMarina}`);
        results = results.filter(yacht => 
          yacht.location.portMarina === filters.portMarina
        );
        console.log(`After marina filter: ${results.length} yachts`);
      }
      
      // Sort by availability status if requested (active first)
      if (filters.sortByStatus) {
        console.log('Sorting by availability status (active first)');
        results.sort((a, b) => {
          if (a.isAvailable !== b.isAvailable) {
            return a.isAvailable ? -1 : 1; // Active items first
          }
          return 0;
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
    
    console.log(`Returning ${paginatedResults.length} yachts (page ${currentPage} of ${totalPages})`);
    
    return {
      yachts: paginatedResults,
      pagination: {
        currentPage,
        pageSize,
        totalCount,
        totalPages
      }
    };
  }
  
  async getYachtById(id: string): Promise<Yacht | null> {
    try {
      console.log(`Getting yacht with ID: ${id}`);
      
      // Try to get from unified collection
      const yachtRef = adminDb.collection(UNIFIED_YACHT_COLLECTION).doc(id);
      const yachtDoc = await yachtRef.get();
      
      if (yachtDoc.exists) {
        console.log(`Found yacht in ${UNIFIED_YACHT_COLLECTION}`);
        const data = yachtDoc.data() as Yacht;
        return {
          ...data,
          id: yachtDoc.id
        };
      }
      
      // Fallback to legacy collection during migration
      console.log(`Yacht not found in ${UNIFIED_YACHT_COLLECTION}, trying legacy collection`);
      const legacyRef = adminDb.collection(LEGACY_YACHTS).doc(id);
      const legacyDoc = await legacyRef.get();
      
      if (legacyDoc.exists) {
        console.log('Found yacht in legacy collection');
        const data = legacyDoc.data() as Yacht;
        return {
          ...data,
          id: legacyDoc.id
        };
      }
      
      console.log('Yacht not found in any collection');
      return null;
    } catch (error) {
      console.error(`Error fetching yacht with ID ${id}:`, error);
      return null;
    }
  }
  
  async getFeaturedYachts(): Promise<YachtSummary[]> {
    try {
      console.log('Getting featured yachts');
      
      // Use the unified collection
      const snapshot = await adminDb.collection(UNIFIED_YACHT_COLLECTION).get();
      
      if (snapshot.empty) {
        console.log(`No yachts found in ${UNIFIED_YACHT_COLLECTION}`);
        
        // Fall back to legacy collection
        console.log('Falling back to legacy collection for backwards compatibility');
        const legacySnapshot = await adminDb.collection(LEGACY_YACHTS).get();
        
        if (legacySnapshot.empty) {
          console.log('No yachts found in legacy collection either');
          return [];
        }
        
        return this.extractFeaturedYachts(legacySnapshot);
      }
      
      return this.extractFeaturedYachts(snapshot);
    } catch (error) {
      console.error('Error fetching featured yachts:', error);
      return [];
    }
  }
  
  // Helper method to extract featured yachts from query results
  private extractFeaturedYachts(snapshot: FirebaseFirestore.QuerySnapshot): YachtSummary[] {
    // Map all yachts
    const allYachts = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || data.name || '',
        description: data.description || '',
        category: data.category || '',
        location: {
          address: data.location?.address || '',
          latitude: data.location?.latitude || 0,
          longitude: data.location?.longitude || 0,
          region: data.location?.region || 'dubai',
          portMarina: data.location?.portMarina || data.location?.port_marina || ''
        },
        pricing: data.pricing || data.price || 0,
        capacity: data.capacity || data.max_guests || 0,
        duration: data.duration || 0,
        isAvailable: 
          data.isAvailable !== undefined ? data.isAvailable :
          data.availability_status !== undefined ? data.availability_status :
          data.available !== undefined ? data.available : false,
        isFeatured: 
          data.isFeatured !== undefined ? data.isFeatured :
          data.featured !== undefined ? data.featured : false,
        mainImage: data.media?.length > 0 ? data.media[0].url : undefined
      } as YachtSummary;
    });
    
    // Get featured yachts
    const featuredYachts = allYachts
      .filter(yacht => yacht.isFeatured && yacht.isAvailable)
      .slice(0, 6); // Limit to 6 featured yachts
    
    console.log(`Found ${featuredYachts.length} featured yachts`);
    return featuredYachts;
  }
  
  // Implement CRUD operations for the unified collection
  async createYacht(yacht: Yacht): Promise<string> {
    try {
      console.log('Creating new yacht');
      
      // Ensure yachtId and other compatibility fields are set
      const yachtWithLegacyFields = {
        ...yacht,
        // Set legacy fields for backward compatibility
        package_id: yacht.id,
        yachtId: yacht.id,
        name: yacht.title,
        availability_status: yacht.isAvailable,
        available: yacht.isAvailable,
        yacht_type: yacht.yachtType,
        features: yacht.tags,
        max_guests: yacht.capacity,
        price: yacht.pricing,
        // Ensure timestamps are set
        createdAt: yacht.createdAt || FieldValue.serverTimestamp(),
        updatedAt: yacht.updatedAt || FieldValue.serverTimestamp(),
        created_date: yacht.createdAt || FieldValue.serverTimestamp(),
        last_updated_date: yacht.updatedAt || FieldValue.serverTimestamp(),
      };
      
      // Use the unified collection
      const docRef = yacht.id 
        ? adminDb.collection(UNIFIED_YACHT_COLLECTION).doc(yacht.id)
        : adminDb.collection(UNIFIED_YACHT_COLLECTION).doc();
      
      await docRef.set(yachtWithLegacyFields);
      
      console.log(`Yacht created with ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error('Error creating yacht:', error);
      throw error;
    }
  }
  
  async updateYacht(id: string, yacht: Partial<Yacht>): Promise<boolean> {
    try {
      console.log(`Updating yacht with ID: ${id}`);
      
      // Prepare update data with legacy fields
      const updateData: Record<string, any> = {
        ...yacht,
        updatedAt: FieldValue.serverTimestamp(),
        last_updated_date: FieldValue.serverTimestamp(),
      };
      
      // Set legacy fields for backward compatibility if present in update
      if (yacht.title !== undefined) updateData.name = yacht.title;
      if (yacht.isAvailable !== undefined) {
        updateData.availability_status = yacht.isAvailable;
        updateData.available = yacht.isAvailable;
      }
      if (yacht.yachtType !== undefined) updateData.yacht_type = yacht.yachtType;
      if (yacht.tags !== undefined) updateData.features = yacht.tags;
      if (yacht.capacity !== undefined) updateData.max_guests = yacht.capacity;
      if (yacht.pricing !== undefined) updateData.price = yacht.pricing;
      
      // Update in unified collection
      const docRef = adminDb.collection(UNIFIED_YACHT_COLLECTION).doc(id);
      await docRef.update(updateData);
      
      console.log(`Yacht ${id} updated successfully`);
      return true;
    } catch (error) {
      console.error(`Error updating yacht ${id}:`, error);
      return false;
    }
  }
  
  async deleteYacht(id: string): Promise<boolean> {
    try {
      console.log(`Deleting yacht with ID: ${id}`);
      
      // Delete from unified collection
      const docRef = adminDb.collection(UNIFIED_YACHT_COLLECTION).doc(id);
      await docRef.delete();
      
      console.log(`Yacht ${id} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`Error deleting yacht ${id}:`, error);
      return false;
    }
  }
  
  // Producer-specific methods
  async getProducerYachts(filters?: {
    producerId?: string;
    page?: number;
    pageSize?: number;
    sortByStatus?: boolean;
  }): Promise<PaginatedYachtsResponse> {
    try {
      console.log('Getting producer yachts with filters:', filters);
      
      // Use the unified yacht collection
      const yachtsRef = adminDb.collection(UNIFIED_YACHT_COLLECTION);
      
      // Build query based on presence of producerId
      let query;
      if (filters?.producerId) {
        console.log(`Filtering by producer ID: ${filters.producerId}`);
        // We need to do two separate queries because Firestore doesn't support OR queries
        // First try providerId field
        const producerSnapshot = await yachtsRef
          .where('providerId', '==', filters.producerId)
          .get();
          
        if (producerSnapshot.empty) {
          console.log('No yachts found with providerId, trying producerId field');
          // If no results with providerId, try producerId field
          query = yachtsRef.where('producerId', '==', filters.producerId);
        } else {
          console.log(`Found ${producerSnapshot.size} yachts with providerId`);
          // If we found yachts with providerId, use that query
          query = yachtsRef.where('providerId', '==', filters.producerId);
        }
      } else {
        console.log('No producer ID provided, getting all yachts');
        query = yachtsRef;
      }
      
      const snapshot = await query.get();
      
      if (snapshot.empty) {
        console.log(`No producer yachts found in ${UNIFIED_YACHT_COLLECTION}`);
        
        // Fall back to legacy collection during migration period
        console.log('Falling back to legacy collection for backwards compatibility');
        const legacyRef = adminDb.collection(LEGACY_YACHTS);
        
        // Try producer query on legacy collection
        let legacyQuery;
        if (filters?.producerId) {
          // First check with producer_id field (commonly used in older documents)
          const legacyProducerSnapshot = await legacyRef
            .where('producer_id', '==', filters.producerId)
            .get();
          
          if (legacyProducerSnapshot.empty) {
            console.log('No yachts found with producer_id, trying producerId field');
            legacyQuery = legacyRef.where('producerId', '==', filters.producerId);
          } else {
            console.log(`Found ${legacyProducerSnapshot.size} yachts with producer_id`);
            legacyQuery = legacyRef.where('producer_id', '==', filters.producerId);
          }
        } else {
          legacyQuery = legacyRef;
        }
        
        const legacySnapshot = await legacyQuery.get();
        
        if (legacySnapshot.empty) {
          console.log('No producer yachts found in legacy collection either');
          return {
            yachts: [],
            pagination: {
              currentPage: 1,
              pageSize: filters?.pageSize || 10,
              totalCount: 0,
              totalPages: 0
            }
          };
        }
        
        console.log(`Found ${legacySnapshot.size} producer yachts in legacy collection, using them instead`);
        // Continue with legacy data
        return this.processYachtResults(legacySnapshot, filters);
      }
      
      return this.processYachtResults(snapshot, filters);
    } catch (error) {
      console.error('Error fetching producer yachts:', error);
      return {
        yachts: [],
        pagination: {
          currentPage: 1,
          pageSize: filters?.pageSize || 10,
          totalCount: 0,
          totalPages: 0
        }
      };
    }
  }
  
  // Legacy methods - updated to use unified collection where possible
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

      // Try the unified collection first
      let experiencesRef = adminDb.collection(UNIFIED_YACHT_COLLECTION);
      let snapshot = await experiencesRef.get();
      
      // If no data in unified collection, fall back to the yacht_experiences collection
      if (snapshot.empty) {
        console.log(`No experiences found in ${UNIFIED_YACHT_COLLECTION} collection, trying yacht_experiences`);
        experiencesRef = adminDb.collection(LEGACY_YACHT_EXPERIENCES);
        snapshot = await experiencesRef.get();
        
        // If still no data, try experience_packages collection
        if (snapshot.empty) {
          console.log('No experiences found in yacht_experiences collection, trying experience_packages');
          experiencesRef = adminDb.collection(LEGACY_EXPERIENCE_PACKAGES);
          snapshot = await experiencesRef.get();
        }
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

      // Map all experiences first and normalize field names
      let results = snapshot.docs.map(doc => {
        const data = doc.data();
        // Spread the original data first to keep all properties
        const normalized = {
          ...data,
          // Ensure consistent field names by mapping between different formats
          package_id: doc.id, // Ensure package_id is set
          id: doc.id, // Keep id for backwards compatibility
          yachtId: data.yachtId || doc.id,
          // Map between name and title fields
          name: data.name || data.title || '',
          title: data.title || data.name || '',
          // Map between available and availability_status
          available: data.available !== undefined ? data.available : data.availability_status,
          availability_status: data.availability_status !== undefined ? data.availability_status : (data.available || false),
        };
        
        console.log(`Normalized yacht data for ${doc.id}:`, JSON.stringify(normalized).substring(0, 100) + '...');
        return normalized as unknown as YachtExperience;
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
            // First, sort by availability_status (active first)
            if (a.availability_status !== b.availability_status) {
              return a.availability_status ? -1 : 1; // Active items first
            }
            
            // If availability status is the same, sort by creation date (newest first)
            if (a.created_date && b.created_date) {
              return b.created_date.seconds - a.created_date.seconds;
            }
            
            return 0;
          });
          
          console.log(`After sorting: First 3 items availability status: ${
            results.slice(0, 3).map(item => item.availability_status ? 'active' : 'inactive').join(', ')
          }`);
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

      // Try the unified collection first
      let snapshot = await adminDb.collection(UNIFIED_YACHT_COLLECTION).get();

      // If no data in unified collection, fall back to the yacht_experiences collection
      if (snapshot.empty) {
        console.log(`No experiences found in ${UNIFIED_YACHT_COLLECTION} collection, trying yacht_experiences`);
        snapshot = await adminDb.collection(LEGACY_YACHT_EXPERIENCES).get();
        
        // If still no data, try experience_packages collection
        if (snapshot.empty) {
          console.log('No experiences found in yacht_experiences collection, trying experience_packages');
          snapshot = await adminDb.collection(LEGACY_EXPERIENCE_PACKAGES).get();
        }
      }

      if (snapshot.empty) {
        console.log('No experiences found in any collection');
        return [];
      }

      const allExperiences = snapshot.docs.map(doc => {
        const data = doc.data();
        const normalized = {
          ...data,
          // Ensure consistent field names by mapping between different formats
          package_id: doc.id, // Ensure package_id is set
          id: doc.id, // Keep id for backwards compatibility
          yachtId: data.yachtId || doc.id,
          // Map between name and title fields
          name: data.name || data.title || '',
          title: data.title || data.name || '',
          // Map between available and availability_status
          available: data.available !== undefined ? data.available : data.availability_status,
          availability_status: data.availability_status !== undefined ? data.availability_status : (data.available || false),
        };
        
        return normalized as unknown as YachtExperience;
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
      let addOnsRef = adminDb.collection(PRODUCTS_ADDONS_COLLECTION);
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
        // Cast FirebaseFirestore.DocumentData to unknown first, then to ProductAddOn
        const data = doc.data();
        const addon = {
          ...data,
          productId: doc.id,
          id: doc.id, // Keep id for backwards compatibility
        };
        // Type assertion after merging with required fields
        return addon as unknown as ProductAddOn;
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