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
  async getAllYachts(filters?: {
    type?: string;
    region?: string;
    portMarina?: string;
    page?: number;
    pageSize?: number;
    sortByStatus?: boolean;
  }): Promise<PaginatedYachtsResponse> {
    try {
      console.log('Getting all yachts with filters:', filters);
      
      // Get data from unified collection
      const snapshot = await adminDb.collection(UNIFIED_YACHT_COLLECTION).get();
      
      if (snapshot.empty) {
        console.log('No yachts found in unified collection');
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
  
  async getYachtById(id: string): Promise<Yacht | null> {
    try {
      console.log(`Getting yacht with ID: ${id}`);
      
      // Try to get from unified_yacht_experiences first
      const unifiedDocRef = adminDb.collection(UNIFIED_YACHT_COLLECTION).doc(id);
      const unifiedDoc = await unifiedDocRef.get();
      
      if (unifiedDoc.exists) {
        const data = unifiedDoc.data() as Yacht;
        console.log(`Found yacht in unified collection`);
        return {
          ...data,
          id
        };
      }
      
      // If not found in unified collection, try legacy collections
      console.log(`Yacht not found in unified collection, trying legacy collections`);
      
      // Try yacht_experiences
      const legacyExpRef = adminDb.collection(LEGACY_YACHT_EXPERIENCES).doc(id);
      const legacyExpDoc = await legacyExpRef.get();
      
      if (legacyExpDoc.exists) {
        console.log(`Found yacht in yacht_experiences collection`);
        const data = legacyExpDoc.data() as any;
        // Convert to Yacht format
        return {
          id,
          title: data.title || data.name || '',
          description: data.description || '',
          category: data.category || 'standard',
          yachtType: data.yacht_type || '',
          location: {
            address: data.location?.address || '',
            latitude: data.location?.latitude || 0,
            longitude: data.location?.longitude || 0,
            region: data.location?.region || 'dubai',
            portMarina: data.location?.port_marina || ''
          },
          capacity: data.capacity || data.max_guests || 0,
          duration: data.duration || 0,
          pricing: data.pricing || data.price || 0,
          pricingModel: data.pricing_model || 'Fixed',
          customizationOptions: data.customization_options || [],
          media: data.media || [],
          isAvailable: data.availability_status || data.available || false,
          isFeatured: data.featured || false,
          isPublished: data.published_status || true,
          tags: data.tags || [],
          providerId: data.providerId || data.producerId || data.producer_id || '',
          reviews: data.reviews || [],
          virtualTour: data.virtual_tour ? {
            isEnabled: data.virtual_tour.enabled || false,
            scenes: data.virtual_tour.scenes || []
          } : undefined,
          createdAt: data.created_date || data.createdAt || new Date(),
          updatedAt: data.last_updated_date || data.updatedAt || new Date()
        };
      }
      
      // If still not found, try final legacy collection
      const legacyYachtRef = adminDb.collection(LEGACY_YACHTS).doc(id);
      const legacyYachtDoc = await legacyYachtRef.get();
      
      if (legacyYachtDoc.exists) {
        console.log(`Found yacht in yachts collection`);
        const data = legacyYachtDoc.data() as any;
        // Convert to Yacht format
        return {
          id,
          title: data.name || '',
          description: data.description || '',
          category: 'yacht',
          yachtType: data.model || '',
          location: {
            address: data.location?.address || '',
            latitude: data.location?.latitude || 0,
            longitude: data.location?.longitude || 0,
            region: 'dubai',
            portMarina: ''
          },
          capacity: data.capacity || data.max_guests || 0,
          duration: 4, // Default duration
          pricing: data.price || 0,
          pricingModel: 'Fixed',
          customizationOptions: [],
          media: data.media || [],
          isAvailable: data.available || false,
          isFeatured: false,
          isPublished: true,
          tags: data.features || [],
          reviews: [],
          createdAt: data.createdAt || new Date(),
          updatedAt: data.updatedAt || new Date()
        };
      }
      
      console.log(`Yacht not found in any collection`);
      return null;
    } catch (error) {
      console.error(`Error fetching yacht with ID ${id}:`, error);
      return null;
    }
  }
  
  async getFeaturedYachts(): Promise<YachtSummary[]> {
    try {
      console.log('Getting featured yachts');
      
      // Get featured yachts from unified collection
      const featuredQuery = adminDb.collection(UNIFIED_YACHT_COLLECTION)
        .where('isFeatured', '==', true)
        .limit(6);
      
      const snapshot = await featuredQuery.get();
      
      return this.extractFeaturedYachts(snapshot);
    } catch (error) {
      console.error('Error fetching featured yachts:', error);
      return [];
    }
  }
  
  private extractFeaturedYachts(snapshot: FirebaseFirestore.QuerySnapshot): YachtSummary[] {
    if (snapshot.empty) {
      console.log('No featured yachts found');
      return [];
    }
    
    console.log(`Found ${snapshot.size} featured yachts`);
    
    return snapshot.docs.map(doc => {
      const data = doc.data() as Yacht;
      // Extract main image URL from media array if available
      const mainImage = data.media && data.media.length > 0 ? data.media[0].url : undefined;
      
      return {
        id: doc.id,
        title: data.title || '',
        description: data.description || '',
        category: data.category || '',
        location: data.location || {
          address: '',
          latitude: 0,
          longitude: 0,
          region: 'dubai',
          portMarina: ''
        },
        pricing: data.pricing || 0,
        capacity: data.capacity || 0,
        duration: data.duration || 0,
        isAvailable: data.isAvailable || false,
        isFeatured: data.isFeatured || false,
        mainImage
      };
    });
  }
  
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
    // Map all documents to the Yacht type
    let results = snapshot.docs.map(doc => {
      const data = doc.data() as Yacht;
      // Extract main image URL from media array if available
      const mainImage = data.media && data.media.length > 0 ? data.media[0].url : undefined;
      
      return {
        id: doc.id,
        title: data.title || '',
        description: data.description || '',
        category: data.category || '',
        location: data.location || {
          address: '',
          latitude: 0,
          longitude: 0,
          region: 'dubai',
          portMarina: ''
        },
        pricing: data.pricing || 0,
        capacity: data.capacity || 0,
        duration: data.duration || 0,
        isAvailable: data.isAvailable || false,
        isFeatured: data.isFeatured || false,
        mainImage
      };
    });
    
    // Apply filters progressively if they exist
    if (filters) {
      // Filter by type
      if (filters.type) {
        console.log(`Filtering by type: ${filters.type}`);
        results = results.filter(yacht => 
          yacht.category.toLowerCase() === filters.type?.toLowerCase()
        );
        console.log(`After type filter: ${results.length} yachts`);
      }
      
      // Filter by region
      if (filters.region) {
        console.log(`Filtering by region: ${filters.region}`);
        results = results.filter(yacht => 
          yacht.location.region === filters.region
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
  
  async createYacht(yacht: Yacht): Promise<string> {
    try {
      console.log('Creating new yacht');
      
      // Add timestamps
      const yachtWithTimestamps = {
        ...yacht,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add to unified collection
      const docRef = await adminDb.collection(UNIFIED_YACHT_COLLECTION).add(yachtWithTimestamps);
      console.log(`Created yacht with ID: ${docRef.id}`);
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating yacht:', error);
      throw error;
    }
  }
  
  async updateYacht(id: string, yacht: Partial<Yacht>): Promise<boolean> {
    try {
      console.log(`Updating yacht with ID: ${id}`);
      
      // Add timestamp
      const updates = {
        ...yacht,
        updatedAt: new Date()
      };
      
      // Update in unified collection
      await adminDb.collection(UNIFIED_YACHT_COLLECTION).doc(id).update(updates);
      console.log(`Updated yacht with ID: ${id}`);
      
      return true;
    } catch (error) {
      console.error(`Error updating yacht with ID ${id}:`, error);
      return false;
    }
  }
  
  async deleteYacht(id: string): Promise<boolean> {
    try {
      console.log(`Deleting yacht with ID: ${id}`);
      
      // Delete from unified collection
      await adminDb.collection(UNIFIED_YACHT_COLLECTION).doc(id).delete();
      console.log(`Deleted yacht with ID: ${id}`);
      
      return true;
    } catch (error) {
      console.error(`Error deleting yacht with ID ${id}:`, error);
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
      
      // Build queries based on presence of producerId
      // Since Firestore doesn't support OR queries directly, we'll need to perform multiple queries
      // and combine the results
      let yachtDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
      
      if (filters?.producerId) {
        console.log(`Filtering by producer ID: ${filters.producerId}`);
        
        // Try all possible variations of producer ID fields to ensure we catch everything
        // 1. Query with providerId field
        const providerIdSnapshot = await yachtsRef
          .where('providerId', '==', filters.producerId)
          .get();
        
        if (!providerIdSnapshot.empty) {
          console.log(`Found ${providerIdSnapshot.size} yachts with providerId field`);
          yachtDocs = [...yachtDocs, ...providerIdSnapshot.docs];
        }
        
        // 2. Query with producerId field
        const producerIdSnapshot = await yachtsRef
          .where('producerId', '==', filters.producerId)
          .get();
        
        if (!producerIdSnapshot.empty) {
          console.log(`Found ${producerIdSnapshot.size} yachts with producerId field`);
          // Add docs that aren't already in the yachtDocs array (based on ID)
          const existingIds = new Set(yachtDocs.map(doc => doc.id));
          const newDocs = producerIdSnapshot.docs.filter(doc => !existingIds.has(doc.id));
          yachtDocs = [...yachtDocs, ...newDocs];
        }
        
        // 3. Query with producer_id field (legacy format)
        const producerUnderscoreIdSnapshot = await yachtsRef
          .where('producer_id', '==', filters.producerId)
          .get();
        
        if (!producerUnderscoreIdSnapshot.empty) {
          console.log(`Found ${producerUnderscoreIdSnapshot.size} yachts with producer_id field`);
          // Add docs that aren't already in the yachtDocs array
          const existingIds = new Set(yachtDocs.map(doc => doc.id));
          const newDocs = producerUnderscoreIdSnapshot.docs.filter(doc => !existingIds.has(doc.id));
          yachtDocs = [...yachtDocs, ...newDocs];
        }
        
        console.log(`Total unique yachts found for producer: ${yachtDocs.length}`);
      } else {
        console.log('No producer ID provided, getting all yachts');
        const snapshot = await yachtsRef.get();
        yachtDocs = snapshot.docs;
      }
      
      // If we don't have any results and a producerId is provided, try legacy collections
      if (yachtDocs.length === 0 && filters?.producerId) {
        console.log('No yachts found in unified collection for this producer, trying legacy collection');
        
        // Fall back to legacy collection during migration period
        const legacyRef = adminDb.collection(LEGACY_YACHTS);
        let legacyDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
        
        // Try all possible producer ID field variations in legacy collection
        // 1. First check with producer_id field (commonly used in older documents)
        const legacyProducerSnapshot = await legacyRef
          .where('producer_id', '==', filters.producerId)
          .get();
        
        if (!legacyProducerSnapshot.empty) {
          console.log(`Found ${legacyProducerSnapshot.size} legacy yachts with producer_id`);
          legacyDocs = [...legacyDocs, ...legacyProducerSnapshot.docs];
        }
        
        // 2. Try producerId field
        const legacyProducerIdSnapshot = await legacyRef
          .where('producerId', '==', filters.producerId)
          .get();
        
        if (!legacyProducerIdSnapshot.empty) {
          console.log(`Found ${legacyProducerIdSnapshot.size} legacy yachts with producerId`);
          // Add docs that aren't already in the array
          const existingIds = new Set(legacyDocs.map(doc => doc.id));
          const newDocs = legacyProducerIdSnapshot.docs.filter(doc => !existingIds.has(doc.id));
          legacyDocs = [...legacyDocs, ...newDocs];
        }
        
        // 3. Try providerId field
        const legacyProviderIdSnapshot = await legacyRef
          .where('providerId', '==', filters.producerId)
          .get();
        
        if (!legacyProviderIdSnapshot.empty) {
          console.log(`Found ${legacyProviderIdSnapshot.size} legacy yachts with providerId`);
          // Add docs that aren't already in the array
          const existingIds = new Set(legacyDocs.map(doc => doc.id));
          const newDocs = legacyProviderIdSnapshot.docs.filter(doc => !existingIds.has(doc.id));
          legacyDocs = [...legacyDocs, ...newDocs];
        }
        
        if (legacyDocs.length > 0) {
          console.log(`Found ${legacyDocs.length} total legacy yachts, using them instead`);
          // Create a snapshot-like object to pass to processYachtResults
          const legacySnapshot = {
            docs: legacyDocs,
            empty: legacyDocs.length === 0,
            size: legacyDocs.length
          } as FirebaseFirestore.QuerySnapshot;
          
          return this.processYachtResults(legacySnapshot, filters);
        }
        
        // No yachts found in any collection
        console.log('No producer yachts found in any collection');
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
      
      // Create a snapshot-like object to pass to processYachtResults
      const combinedSnapshot = {
        docs: yachtDocs,
        empty: yachtDocs.length === 0,
        size: yachtDocs.length
      } as FirebaseFirestore.QuerySnapshot;
      
      // Process results with pagination and filters
      return this.processYachtResults(combinedSnapshot, filters);
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

// Add helper method to add producer IDs for testing
export async function addProducerIdToTestYachts(producerId: string = 'test-producer-123') {
  console.log(`Adding producer ID ${producerId} to test yachts...`);
  
  // Get yachts from unified collection
  const yachtsRef = adminDb.collection(UNIFIED_YACHT_COLLECTION);
  const snapshot = await yachtsRef.limit(5).get();
  
  if (snapshot.empty) {
    console.log('No yachts found for testing');
    return false;
  }
  
  try {
    let count = 0;
    // Update each yacht with the test producer ID
    for (const doc of snapshot.docs) {
      await yachtsRef.doc(doc.id).update({
        providerId: producerId,
        producerId: producerId
      });
      count++;
    }
    
    console.log(`Successfully added producer ID to ${count} yachts`);
    return true;
  } catch (error) {
    console.error('Error adding producer IDs:', error);
    return false;
  }
}

export const storage = new FirestoreStorage();