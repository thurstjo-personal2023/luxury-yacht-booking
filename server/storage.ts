import { adminDb } from "./firebase-admin";
import { FieldValue, FieldPath } from "firebase-admin/firestore";
import type { ProductAddOn, YachtExperience, TouristProfile } from "@shared/firestore-schema";
import type { Yacht, PaginatedYachtsResponse, YachtSummary } from "@shared/unified-schema";

// Constants for collection names
const UNIFIED_YACHT_COLLECTION = 'unified_yacht_experiences';
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
  
  // Add-on bundling methods
  getAvailableAddOns(producerId: string): Promise<{
    producerAddOns: ProductAddOn[];
    partnerAddOns: ProductAddOn[];
  }>;
  validateAddOnIds(ids: string[]): Promise<{
    validIds: string[];
    invalidIds: string[];
  }>;
  
  // Customer-specific methods for the migration
  getRecommendedYachts(userId: string, limit?: number): Promise<YachtSummary[]>;
  searchYachts(query: string, filters?: {
    type?: string;
    region?: string;
    portMarina?: string;
    minPrice?: number;
    maxPrice?: number;
    capacity?: number;
    tags?: string[];
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedYachtsResponse>;
  getYachtAvailability(yachtId: string, date: Date): Promise<{
    availableDates: Date[];
    timeSlots: {
      id: string;
      startTime: string;
      endTime: string;
      available: boolean;
      label: string;
    }[];
  }>;
  getUserBookings(userId: string): Promise<any[]>; // We'll define a proper Booking type later
  createBooking(bookingData: any): Promise<string>; // We'll define a proper BookingData type later
  getUserWishlist(userId: string): Promise<string[]>;
  updateUserWishlist(userId: string, yachtId: string, action: 'add' | 'remove'): Promise<boolean>;
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
      
      // Get from unified collection
      const docRef = adminDb.collection(UNIFIED_YACHT_COLLECTION).doc(id);
      const doc = await docRef.get();
      
      if (doc.exists) {
        const data = doc.data() as Yacht;
        console.log(`Found yacht in collection`);
        return {
          ...data,
          id
        };
      }
      
      console.log(`Yacht with ID ${id} not found`);
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
      console.log('🔍 Getting producer yachts with filters:', filters);
      
      // Log Firestore connection settings (using our configured values)
      console.log('📡 Firestore emulator connection status:', { 
        host: '127.0.0.1:8080',
        ssl: false, 
        ignoreUndefinedProperties: true
      });
      
      // Use ONLY the unified yacht collection
      const yachtsRef = adminDb.collection(UNIFIED_YACHT_COLLECTION);
      console.log(`📁 Accessing collection: ${UNIFIED_YACHT_COLLECTION}`);
      
      // First, do a simple read test to confirm we can access the collection
      try {
        console.log('🧪 Testing basic collection access...');
        const testQuery = await yachtsRef.limit(1).get();
        console.log(`✅ Collection access test successful, total yacht documents: ${testQuery.size}`);
        
        if (!testQuery.empty) {
          const sampleDoc = testQuery.docs[0];
          console.log('📄 Sample yacht document fields:', Object.keys(sampleDoc.data()));
        }
      } catch (testError: any) {
        console.error('❌ Collection access test failed:', testError.message);
        console.error('💥 Full error:', testError);
      }
      
      // Get yacht documents based on producer ID
      let yachtDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
      
      if (filters?.producerId) {
        console.log(`🔍 Filtering by producer ID: ${filters.producerId}`);
        
        // Try all possible variations of producer ID fields to ensure we catch everything
        try {
          // 1. Query with providerId field
          console.log('🔍 Querying with providerId field...');
          const providerIdSnapshot = await yachtsRef
            .where('providerId', '==', filters.producerId)
            .get();
          
          if (!providerIdSnapshot.empty) {
            console.log(`✅ Found ${providerIdSnapshot.size} yachts with providerId field`);
            yachtDocs = [...yachtDocs, ...providerIdSnapshot.docs];
          } else {
            console.log('ℹ️ No yachts found with matching providerId field');
          }
        } catch (error: any) {
          console.error('❌ Error querying providerId:', error.message);
        }
        
        try {
          // 2. Query with producerId field
          console.log('🔍 Querying with producerId field...');
          const producerIdSnapshot = await yachtsRef
            .where('producerId', '==', filters.producerId)
            .get();
          
          if (!producerIdSnapshot.empty) {
            console.log(`✅ Found ${producerIdSnapshot.size} yachts with producerId field`);
            // Add docs that aren't already in the yachtDocs array (based on ID)
            const existingIds = new Set(yachtDocs.map(doc => doc.id));
            const newDocs = producerIdSnapshot.docs.filter(doc => !existingIds.has(doc.id));
            console.log(`➕ Adding ${newDocs.length} unique documents with producerId field`);
            yachtDocs = [...yachtDocs, ...newDocs];
          } else {
            console.log('ℹ️ No yachts found with matching producerId field');
          }
        } catch (error: any) {
          console.error('❌ Error querying producerId:', error.message);
        }
        
        try {
          // 3. Query with producer_id field (legacy format)
          console.log('🔍 Querying with producer_id field...');
          const producerUnderscoreIdSnapshot = await yachtsRef
            .where('producer_id', '==', filters.producerId)
            .get();
          
          if (!producerUnderscoreIdSnapshot.empty) {
            console.log(`✅ Found ${producerUnderscoreIdSnapshot.size} yachts with producer_id field`);
            // Add docs that aren't already in the yachtDocs array
            const existingIds = new Set(yachtDocs.map(doc => doc.id));
            const newDocs = producerUnderscoreIdSnapshot.docs.filter(doc => !existingIds.has(doc.id));
            console.log(`➕ Adding ${newDocs.length} unique documents with producer_id field`);
            yachtDocs = [...yachtDocs, ...newDocs];
          } else {
            console.log('ℹ️ No yachts found with matching producer_id field');
          }
        } catch (error: any) {
          console.error('❌ Error querying producer_id:', error.message);
        }
        
        console.log(`📊 Total unique yachts found for producer: ${yachtDocs.length}`);
      } else {
        console.log('No producer ID provided, getting all yachts');
        const snapshot = await yachtsRef.get();
        yachtDocs = snapshot.docs;
      }
      
      if (yachtDocs.length === 0 && filters?.producerId) {
        console.log('No yachts found for this producer ID');
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
  
  // Legacy methods - updated to use unified collection
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

      // Use the unified collection
      const experiencesRef = adminDb.collection(UNIFIED_YACHT_COLLECTION);
      const snapshot = await experiencesRef.get();
      
      if (snapshot.empty) {
        console.log(`No experiences found in ${UNIFIED_YACHT_COLLECTION} collection`);
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

      // Get from the unified collection
      const snapshot = await adminDb.collection(UNIFIED_YACHT_COLLECTION).get();

      if (snapshot.empty) {
        console.log('No experiences found in collection');
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
  
  // Customer-specific methods for the migration
  
  /**
   * Get all available add-ons for a producer, divided into their own add-ons and partner add-ons
   * 
   * @param producerId The producer ID to get available add-ons for
   * @returns Promise with object containing producer's own add-ons and partner add-ons
   */
  async getAvailableAddOns(producerId: string): Promise<{
    producerAddOns: ProductAddOn[];
    partnerAddOns: ProductAddOn[];
  }> {
    try {
      console.log(`Getting available add-ons for producer: ${producerId}`);
      
      // Get all add-ons
      const snapshot = await adminDb.collection('products_add-ons').get();
      
      if (snapshot.empty) {
        console.log('No add-ons found');
        return {
          producerAddOns: [],
          partnerAddOns: []
        };
      }
      
      // Map documents to ProductAddOn type and separate by owner
      const producerAddOns: ProductAddOn[] = [];
      const partnerAddOns: ProductAddOn[] = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data() as ProductAddOn;
        const addOn: ProductAddOn = {
          ...data,
          productId: doc.id,
          media: data.media || []
        };
        
        // Only include available add-ons
        if (addOn.availability !== false) {
          // Check if this add-on belongs to the producer or a partner
          if (addOn.partnerId === producerId) {
            producerAddOns.push(addOn);
          } else {
            // This is a partner add-on
            partnerAddOns.push(addOn);
          }
        }
      });
      
      console.log(`Found ${producerAddOns.length} producer add-ons and ${partnerAddOns.length} partner add-ons`);
      
      return {
        producerAddOns,
        partnerAddOns
      };
    } catch (error) {
      console.error('Error getting available add-ons:', error);
      return {
        producerAddOns: [],
        partnerAddOns: []
      };
    }
  }
  
  /**
   * Validate a list of add-on IDs to ensure they exist and are available
   * 
   * @param ids Array of add-on IDs to validate
   * @returns Promise with object containing valid and invalid IDs
   */
  async validateAddOnIds(ids: string[]): Promise<{
    validIds: string[];
    invalidIds: string[];
  }> {
    try {
      console.log(`Validating ${ids.length} add-on IDs`);
      
      if (!ids.length) {
        return {
          validIds: [],
          invalidIds: []
        };
      }
      
      const validIds: string[] = [];
      const invalidIds: string[] = [];
      
      // For each ID, check if it exists in the collection
      for (const id of ids) {
        try {
          const docRef = await adminDb.collection('products_add-ons').doc(id).get();
          
          if (docRef.exists) {
            const data = docRef.data() as ProductAddOn;
            
            // Only consider it valid if it's available
            if (data.availability !== false) {
              validIds.push(id);
            } else {
              // Add-on exists but is not available
              invalidIds.push(id);
              console.log(`Add-on ${id} exists but is not available`);
            }
          } else {
            // Add-on doesn't exist
            invalidIds.push(id);
            console.log(`Add-on ${id} doesn't exist`);
          }
        } catch (error) {
          console.error(`Error checking add-on ${id}:`, error);
          invalidIds.push(id);
        }
      }
      
      console.log(`Validation complete: ${validIds.length} valid, ${invalidIds.length} invalid`);
      
      return {
        validIds,
        invalidIds
      };
    } catch (error) {
      console.error('Error validating add-on IDs:', error);
      return {
        validIds: [],
        invalidIds: ids // Consider all IDs invalid if there's an error
      };
    }
  }

  async getRecommendedYachts(userId: string, limit: number = 4): Promise<YachtSummary[]> {
    try {
      console.log(`Getting recommended yachts for user ${userId}, limit: ${limit}`);
      
      // First, attempt to get user's preferences from their profile
      const userPreferences = await this.getUserPreferences(userId);
      
      // Strategy 1: If user has preferences, use them to find matching yachts
      if (userPreferences && userPreferences.length > 0) {
        console.log(`User has ${userPreferences.length} preferences, finding matches`);
        
        // Query yachts with matching tags
        const preferencesSnapshot = await adminDb.collection(UNIFIED_YACHT_COLLECTION)
          .where('isAvailable', '==', true)
          .where('tags', 'array-contains-any', userPreferences)
          .limit(limit)
          .get();
        
        if (!preferencesSnapshot.empty) {
          console.log(`Found ${preferencesSnapshot.size} matching yachts based on preferences`);
          
          // If we have enough preference-based matches, return them
          if (preferencesSnapshot.size >= limit) {
            return this.extractFeaturedYachts(preferencesSnapshot);
          }
          
          // If we don't have enough, get the ones we found
          const preferenceMatches = this.extractFeaturedYachts(preferencesSnapshot);
          
          // And supplement with featured yachts (avoiding duplicates)
          const existingIds = new Set(preferenceMatches.map(yacht => yacht.id));
          const remainingNeeded = limit - preferenceMatches.length;
          
          console.log(`Need ${remainingNeeded} more recommendations, getting featured yachts`);
          
          const featuredSnapshot = await adminDb.collection(UNIFIED_YACHT_COLLECTION)
            .where('isFeatured', '==', true)
            .limit(limit + 5) // Get extra to account for potential duplicates
            .get();
          
          const featuredYachts = this.extractFeaturedYachts(featuredSnapshot)
            .filter(yacht => !existingIds.has(yacht.id))
            .slice(0, remainingNeeded);
          
          return [...preferenceMatches, ...featuredYachts];
        }
      }
      
      // Strategy 2: Use booking history if available
      const userBookings = await this.getUserBookings(userId);
      if (userBookings && userBookings.length > 0) {
        console.log(`User has ${userBookings.length} previous bookings, finding similar yachts`);
        
        // Extract categories and regions from booking history
        const categories = new Set<string>();
        const regions = new Set<string>();
        
        userBookings.forEach(booking => {
          if (booking.yachtDetails?.category) {
            categories.add(booking.yachtDetails.category);
          }
          if (booking.yachtDetails?.location?.region) {
            regions.add(booking.yachtDetails.location.region);
          }
        });
        
        if (categories.size > 0 || regions.size > 0) {
          // Query similar yachts (we'll prioritize category matches)
          const categoriesArray = Array.from(categories);
          const regionsArray = Array.from(regions);
          
          let historyBasedYachts: YachtSummary[] = [];
          
          // Try to get yachts with matching categories
          if (categoriesArray.length > 0) {
            const categoriesSnapshot = await adminDb.collection(UNIFIED_YACHT_COLLECTION)
              .where('isAvailable', '==', true)
              .where('category', 'in', categoriesArray.slice(0, 10)) // Firestore 'in' allows max 10 values
              .limit(limit)
              .get();
            
            if (!categoriesSnapshot.empty) {
              historyBasedYachts = this.extractFeaturedYachts(categoriesSnapshot);
            }
          }
          
          // If we need more recommendations, try regions
          if (historyBasedYachts.length < limit && regionsArray.length > 0) {
            const existingIds = new Set(historyBasedYachts.map(yacht => yacht.id));
            const remainingNeeded = limit - historyBasedYachts.length;
            
            const regionsSnapshot = await adminDb.collection(UNIFIED_YACHT_COLLECTION)
              .where('isAvailable', '==', true)
              .where('location.region', 'in', regionsArray.slice(0, 10)) // Firestore 'in' allows max 10 values
              .limit(limit + 5) // Get extra to handle duplicates
              .get();
            
            if (!regionsSnapshot.empty) {
              const regionYachts = this.extractFeaturedYachts(regionsSnapshot)
                .filter(yacht => !existingIds.has(yacht.id))
                .slice(0, remainingNeeded);
              
              historyBasedYachts = [...historyBasedYachts, ...regionYachts];
            }
          }
          
          // If we have enough history-based recommendations, return them
          if (historyBasedYachts.length >= limit) {
            return historyBasedYachts.slice(0, limit);
          }
          
          // Otherwise, supplement with featured yachts
          if (historyBasedYachts.length > 0) {
            const existingIds = new Set(historyBasedYachts.map(yacht => yacht.id));
            const remainingNeeded = limit - historyBasedYachts.length;
            
            console.log(`Need ${remainingNeeded} more recommendations, getting featured yachts`);
            
            const featuredSnapshot = await adminDb.collection(UNIFIED_YACHT_COLLECTION)
              .where('isFeatured', '==', true)
              .limit(limit + 5) // Get extra to account for potential duplicates
              .get();
            
            const featuredYachts = this.extractFeaturedYachts(featuredSnapshot)
              .filter(yacht => !existingIds.has(yacht.id))
              .slice(0, remainingNeeded);
            
            return [...historyBasedYachts, ...featuredYachts];
          }
        }
      }
      
      // Strategy 3: Fallback - return featured and popular yachts
      console.log('Using fallback strategy: featured yachts');
      
      // Get featured yachts
      const featuredSnapshot = await adminDb.collection(UNIFIED_YACHT_COLLECTION)
        .where('isFeatured', '==', true)
        .limit(limit)
        .get();
      
      const featured = this.extractFeaturedYachts(featuredSnapshot);
      
      if (featured.length >= limit) {
        return featured.slice(0, limit);
      }
      
      // If we don't have enough featured yachts, supplement with availability-sorted yachts
      const existingIds = new Set(featured.map(yacht => yacht.id));
      const remainingNeeded = limit - featured.length;
      
      console.log(`Need ${remainingNeeded} more recommendations, getting available yachts`);
      
      const availableSnapshot = await adminDb.collection(UNIFIED_YACHT_COLLECTION)
        .where('isAvailable', '==', true)
        .limit(limit + 5) // Get extra to account for potential duplicates
        .get();
      
      const availableYachts = this.extractFeaturedYachts(availableSnapshot)
        .filter(yacht => !existingIds.has(yacht.id))
        .slice(0, remainingNeeded);
      
      return [...featured, ...availableYachts];
    } catch (error) {
      console.error('Error fetching recommended yachts:', error);
      return [];
    }
  }
  
  async searchYachts(query: string, filters?: {
    type?: string;
    region?: string;
    portMarina?: string;
    minPrice?: number;
    maxPrice?: number;
    capacity?: number;
    tags?: string[];
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedYachtsResponse> {
    try {
      console.log(`Searching yachts with query: "${query}" and filters:`, filters);
      
      // Start with a base query for all yachts
      let yachtSnapshot = await adminDb.collection(UNIFIED_YACHT_COLLECTION).get();
      
      if (yachtSnapshot.empty) {
        console.log('No yachts found in collection');
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
      
      // Convert to array of Yacht objects for filtering
      let results = yachtSnapshot.docs.map(doc => {
        const data = doc.data() as Yacht;
        return {
          ...data,
          id: doc.id
        } as Yacht;
      });
      
      // Calculate relevance score for a yacht
      const calculateRelevanceScore = (yacht: Yacht, searchTerms: string[] = [], searchTags: string[] = []): number => {
        let score = 0;
        
        // Base score for all yachts
        score += 1;
        
        // Higher score for featured yachts
        if (yacht.isFeatured || (yacht as any).featured) {
          score += 5;
        }
        
        // Score for availability
        if (yacht.isAvailable || yacht.available || yacht.availability_status) {
          score += 3;
        }
        
        // Tag matches (highest priority)
        if (searchTags.length > 0 && yacht.tags && yacht.tags.length > 0) {
          const matchingTags = yacht.tags.filter(tag => 
            searchTags.some(searchTag => tag.toLowerCase() === searchTag.toLowerCase())
          );
          
          // Significant boost for exact tag matches (15 points per tag)
          score += matchingTags.length * 15;
        }
        
        // Score for search term matches
        if (searchTerms.length > 0) {
          for (const term of searchTerms) {
            // Title match (high importance)
            if (yacht.title?.toLowerCase().includes(term)) {
              score += 10;
            }
            
            // Category match (medium-high importance)
            if (yacht.category?.toLowerCase().includes(term)) {
              score += 8;
            }
            
            // Description match (medium importance)
            if (yacht.description?.toLowerCase().includes(term)) {
              score += 5;
            }
            
            // Location matches (medium importance)
            if (yacht.location?.address?.toLowerCase().includes(term)) {
              score += 7;
            }
            
            if (yacht.location?.region?.toLowerCase().includes(term)) {
              score += 8;
            }
            
            if (yacht.location?.portMarina?.toLowerCase().includes(term)) {
              score += 6;
            }
            
            // Tag matches based on search terms (medium-high importance)
            if (yacht.tags && yacht.tags.some(tag => tag.toLowerCase().includes(term))) {
              score += 8;
            }
          }
        }
        
        // Region-specific match bonus (if searching by region)
        if (filters?.region && yacht.location?.region === filters.region) {
          score += 12;
        }
        
        return score;
      }
      
      // Apply text search if query is provided
      let searchTerms: string[] = [];
      if (query && query.trim() !== '') {
        searchTerms = query.toLowerCase().trim().split(/\s+/);
        
        console.log(`Searching for terms: ${searchTerms.join(', ')}`);
        
        results = results.filter(yacht => {
          // Check each search term against multiple fields
          return searchTerms.some(term => 
            // Title match
            (yacht.title?.toLowerCase().includes(term)) ||
            // Description match
            (yacht.description?.toLowerCase().includes(term)) ||
            // Category match
            (yacht.category?.toLowerCase().includes(term)) ||
            // Location match
            (yacht.location?.address?.toLowerCase().includes(term)) ||
            (yacht.location?.region?.toLowerCase().includes(term)) ||
            (yacht.location?.portMarina?.toLowerCase().includes(term)) ||
            // Tags match (if available)
            (yacht.tags?.some(tag => tag.toLowerCase().includes(term)))
          );
        });
        
        console.log(`Found ${results.length} yachts matching search terms`);
      }
      
      // Extract search tags from filters
      const searchTags = filters?.tags || [];
      
      // Apply additional filters
      if (filters) {
        // Filter by yacht type/category
        if (filters.type) {
          results = results.filter(yacht => 
            yacht.category?.toLowerCase() === filters.type?.toLowerCase()
          );
          console.log(`After type filter: ${results.length} yachts`);
        }
        
        // Filter by region
        if (filters.region) {
          results = results.filter(yacht => 
            yacht.location?.region === filters.region
          );
          console.log(`After region filter: ${results.length} yachts`);
        }
        
        // Filter by marina
        if (filters.portMarina) {
          results = results.filter(yacht => 
            yacht.location?.portMarina === filters.portMarina
          );
          console.log(`After marina filter: ${results.length} yachts`);
        }
        
        // Price range filters
        if (filters.minPrice !== undefined) {
          results = results.filter(yacht => 
            (yacht.pricing || 0) >= filters.minPrice!
          );
          console.log(`After min price filter: ${results.length} yachts`);
        }
        
        if (filters.maxPrice !== undefined) {
          results = results.filter(yacht => 
            (yacht.pricing || 0) <= filters.maxPrice!
          );
          console.log(`After max price filter: ${results.length} yachts`);
        }
        
        // Capacity filter
        if (filters.capacity !== undefined) {
          results = results.filter(yacht => 
            (yacht.capacity || 0) >= filters.capacity!
          );
          console.log(`After capacity filter: ${results.length} yachts`);
        }
        
        // Tags filter
        if (filters.tags && filters.tags.length > 0) {
          results = results.filter(yacht => 
            yacht.tags?.some(tag => filters.tags!.includes(tag))
          );
          console.log(`After tags filter: ${results.length} yachts`);
        }
      }
      
      // Calculate relevance score for each yacht and sort
      results.forEach(yacht => {
        // @ts-ignore: Add relevance score to yacht object
        yacht._relevanceScore = calculateRelevanceScore(yacht, searchTerms, searchTags);
      });
      
      // Sort by relevance score (higher first)
      results.sort((a, b) => {
        // @ts-ignore: Access relevance score
        return (b._relevanceScore || 0) - (a._relevanceScore || 0);
      });
      
      // Transform to YachtSummary objects
      const yachtSummaries = results.map(yacht => {
        // Extract main image URL
        const mainImage = yacht.media && yacht.media.length > 0 ? yacht.media[0].url : undefined;
        
        return {
          id: yacht.id,
          title: yacht.title || "",
          description: yacht.description || "",
          category: yacht.category || "",
          location: yacht.location || {
            address: "",
            latitude: 0,
            longitude: 0,
            region: "dubai",
            portMarina: ""
          },
          pricing: yacht.pricing || 0,
          capacity: yacht.capacity || 0,
          duration: yacht.duration || 0,
          isAvailable: yacht.isAvailable || false,
          isFeatured: yacht.isFeatured || false,
          mainImage
        };
      });
      
      // Apply pagination
      const totalCount = yachtSummaries.length;
      const pageSize = filters?.pageSize || 10;
      const totalPages = Math.ceil(totalCount / pageSize);
      const currentPage = filters?.page || 1;
      
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, yachtSummaries.length);
      const paginatedResults = yachtSummaries.slice(startIndex, endIndex);
      
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
    } catch (error) {
      console.error('Error searching yachts:', error);
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
  
  async getYachtAvailability(yachtId: string, date: Date): Promise<{
    availableDates: Date[];
    timeSlots: {
      id: string;
      startTime: string;
      endTime: string;
      available: boolean;
      label: string;
    }[];
  }> {
    try {
      console.log(`Getting availability for yacht ${yachtId} on ${date.toISOString()}`);
      
      // Check if the yacht exists
      const yachtDoc = await adminDb.collection(UNIFIED_YACHT_COLLECTION).doc(yachtId).get();
      if (!yachtDoc.exists) {
        console.log(`Yacht ${yachtId} not found`);
        return { availableDates: [], timeSlots: [] };
      }
      
      // Get the yacht data
      const yacht = yachtDoc.data() as Yacht;
      if (!yacht.isAvailable) {
        console.log(`Yacht ${yachtId} is marked as unavailable`);
        return { availableDates: [], timeSlots: [] };
      }
      
      // Check for existing bookings on the requested date
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const bookingsSnapshot = await adminDb
        .collection('bookings')
        .where('yachtId', '==', yachtId)
        .where('status', 'in', ['confirmed', 'pending'])
        .get();
      
      // Extract booked time slots
      const bookedTimeSlots = new Set<string>();
      
      if (!bookingsSnapshot.empty) {
        bookingsSnapshot.docs.forEach(doc => {
          const booking = doc.data();
          
          // Check if this booking is for the requested date
          if (booking.startDate && booking.startDate.includes(dateStr)) {
            // If the booking has a time slot, mark it as booked
            if (booking.timeSlot && booking.timeSlot.id) {
              bookedTimeSlots.add(booking.timeSlot.id);
            }
          }
        });
      }
      
      // Generate available time slots based on yacht duration
      const duration = yacht.duration || 4; // Default to 4 hours if not specified
      
      const timeSlots = [
        { 
          id: 'morning', 
          startTime: '09:00', 
          endTime: `${9 + duration}:00`, 
          available: !bookedTimeSlots.has('morning'),
          label: `Morning (9:00 AM - ${9 + duration}:00 ${9 + duration >= 12 ? 'PM' : 'AM'})` 
        },
        { 
          id: 'afternoon', 
          startTime: '14:00', 
          endTime: `${14 + duration}:00`, 
          available: !bookedTimeSlots.has('afternoon'),
          label: `Afternoon (2:00 PM - ${(14 + duration) >= 24 ? 
            `${(14 + duration) - 24}:00 AM` : (14 + duration) >= 12 ? 
            `${(14 + duration) - 12}:00 PM` : `${14 + duration}:00 AM`})` 
        },
        { 
          id: 'evening', 
          startTime: '18:00', 
          endTime: `${18 + Math.min(duration, 6)}:00`, 
          available: !bookedTimeSlots.has('evening'),
          label: `Evening (6:00 PM - ${18 + Math.min(duration, 6) >= 24 ? 
            `${18 + Math.min(duration, 6) - 24}:00 AM` : 
            `${18 + Math.min(duration, 6) - 12}:00 PM`})` 
        }
      ];
      
      // Generate a range of available dates (next 30 days)
      const availableDates: Date[] = [];
      const today = new Date();
      
      for (let i = 0; i < 30; i++) {
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + i);
        availableDates.push(futureDate);
      }
      
      return {
        availableDates,
        timeSlots
      };
    } catch (error) {
      console.error(`Error getting availability for yacht ${yachtId}:`, error);
      return { availableDates: [], timeSlots: [] };
    }
  }
  
  async getUserBookings(userId: string): Promise<any[]> {
    try {
      console.log(`Getting bookings for user ${userId}`);
      
      const bookingsSnapshot = await adminDb
        .collection('bookings')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      
      if (bookingsSnapshot.empty) {
        console.log(`No bookings found for user ${userId}`);
        return [];
      }
      
      // Get all yacht IDs from bookings to fetch yacht details
      const yachtIds = new Set<string>();
      bookingsSnapshot.docs.forEach(doc => {
        const booking = doc.data();
        if (booking.yachtId || booking.packageId) {
          yachtIds.add(booking.yachtId || booking.packageId);
        }
      });
      
      // Fetch yacht details for all bookings
      const yachtDetails: Record<string, Yacht> = {};
      
      if (yachtIds.size > 0) {
        const yachtIdsArray = Array.from(yachtIds);
        
        // Firestore 'in' query supports max 10 values, so we chunk if needed
        const chunkSize = 10;
        const chunks = [];
        
        for (let i = 0; i < yachtIdsArray.length; i += chunkSize) {
          chunks.push(yachtIdsArray.slice(i, i + chunkSize));
        }
        
        for (const chunk of chunks) {
          const yachtSnapshot = await adminDb
            .collection(UNIFIED_YACHT_COLLECTION)
            .where(FieldPath.documentId(), 'in', chunk)
            .get();
          
          yachtSnapshot.docs.forEach(doc => {
            const yacht = doc.data() as Yacht;
            yachtDetails[doc.id] = {
              ...yacht,
              id: doc.id
            };
          });
        }
      }
      
      // Extract booking data with yacht details
      return bookingsSnapshot.docs.map(doc => {
        const booking = doc.data();
        const yachtId = booking.yachtId || booking.packageId;
        
        return {
          id: doc.id,
          ...booking,
          yachtDetails: yachtDetails[yachtId] || null
        };
      });
    } catch (error) {
      console.error(`Error getting bookings for user ${userId}:`, error);
      return [];
    }
  }
  
  async createBooking(bookingData: any): Promise<string> {
    try {
      console.log('Creating new booking with data:', bookingData);
      
      // Validate required fields
      if (!bookingData.userId || !bookingData.yachtId) {
        throw new Error('Missing required booking fields: userId and yachtId');
      }
      
      // Add timestamps
      const now = new Date();
      const bookingWithTimestamps = {
        ...bookingData,
        createdAt: now,
        updatedAt: now,
        status: bookingData.status || 'pending'
      };
      
      // Create the booking
      const docRef = await adminDb.collection('bookings').add(bookingWithTimestamps);
      console.log(`Created booking with ID: ${docRef.id}`);
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }
  
  async getUserWishlist(userId: string): Promise<string[]> {
    try {
      console.log(`Getting wishlist for user ${userId}`);
      
      // Get tourist profile
      const touristProfile = await this.getUserTouristProfile(userId);
      
      // Return wishlist from profile if available
      if (touristProfile && touristProfile.wishlist) {
        return touristProfile.wishlist;
      }
      
      return [];
    } catch (error) {
      console.error(`Error getting wishlist for user ${userId}:`, error);
      return [];
    }
  }
  
  async updateUserWishlist(userId: string, yachtId: string, action: 'add' | 'remove'): Promise<boolean> {
    try {
      console.log(`${action === 'add' ? 'Adding' : 'Removing'} yacht ${yachtId} ${action === 'add' ? 'to' : 'from'} wishlist for user ${userId}`);
      
      // Get the current user profile
      const touristProfile = await this.getUserTouristProfile(userId);
      
      if (!touristProfile) {
        console.log(`Tourist profile not found for user ${userId}`);
        return false;
      }
      
      // Get current wishlist or initialize empty array
      const wishlist = touristProfile.wishlist || [];
      
      if (action === 'add') {
        // Add yacht to wishlist if not already present
        if (!wishlist.includes(yachtId)) {
          wishlist.push(yachtId);
        }
      } else {
        // Remove yacht from wishlist
        const index = wishlist.indexOf(yachtId);
        if (index !== -1) {
          wishlist.splice(index, 1);
        }
      }
      
      // Update the profile with the new wishlist
      await adminDb.collection('user_profiles_tourist').doc(userId).update({
        wishlist,
        lastUpdated: new Date()
      });
      
      console.log(`Successfully ${action === 'add' ? 'added to' : 'removed from'} wishlist`);
      return true;
    } catch (error) {
      console.error(`Error updating wishlist for user ${userId}:`, error);
      return false;
    }
  }
  
  // Helper methods for user data
  
  private async getUserPreferences(userId: string): Promise<string[]> {
    try {
      const touristProfile = await this.getUserTouristProfile(userId);
      
      if (touristProfile && touristProfile.preferences) {
        return touristProfile.preferences;
      }
      
      return [];
    } catch (error) {
      console.error(`Error getting preferences for user ${userId}:`, error);
      return [];
    }
  }
  
  private async getUserTouristProfile(userId: string): Promise<TouristProfile | null> {
    try {
      const profileDoc = await adminDb.collection('user_profiles_tourist').doc(userId).get();
      
      if (profileDoc.exists) {
        return profileDoc.data() as TouristProfile;
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting tourist profile for user ${userId}:`, error);
      return null;
    }
  }
}

// Helper method to add producer IDs to all yachts
export async function addProducerIdToTestYachts(producerId: string = 'test-producer-123') {
  console.log(`Adding producer ID ${producerId} to all yachts...`);
  
  // Get yachts from unified collection
  const yachtsRef = adminDb.collection(UNIFIED_YACHT_COLLECTION);
  const snapshot = await yachtsRef.get(); // Removed limit to get all yachts
  
  if (snapshot.empty) {
    console.log('No yachts found in collection');
    return false;
  }
  
  try {
    // Create a batch for more efficient writes
    let batch = adminDb.batch();
    let batchCount = 0;
    let count = 0;
    const BATCH_SIZE = 500; // Firestore batch limit
    
    // Update each yacht with the producer ID
    for (const doc of snapshot.docs) {
      batch.update(doc.ref, {
        providerId: producerId,
        producerId: producerId
      });
      batchCount++;
      count++;
      
      // If we reach the batch limit, commit and start a new batch
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`Committed batch of ${batchCount} updates`);
        batch = adminDb.batch();
        batchCount = 0;
      }
    }
    
    // Commit any remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${batchCount} updates`);
    }
    
    console.log(`Successfully added producer ID to ${count} yachts`);
    return true;
  } catch (error) {
    console.error('Error adding producer IDs:', error);
    return false;
  }
}

export const storage = new FirestoreStorage();