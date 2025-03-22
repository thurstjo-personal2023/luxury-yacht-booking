/**
 * Firestore Yacht Repository
 * 
 * Implementation of the Yacht Repository interface using Firestore
 */

import { Firestore, Timestamp, DocumentData, Query, QuerySnapshot, DocumentSnapshot } from 'firebase/firestore';
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit, startAfter } from 'firebase/firestore';

import { 
  IYachtRepository, 
  YachtInfo, 
  YachtPackageInfo, 
  YachtSearchCriteria, 
  YachtPackageSearchCriteria 
} from '../../../core/domain/repositories/yacht-repository';

/**
 * Firestore implementation of the Yacht Repository
 */
export class FirestoreYachtRepository implements IYachtRepository {
  private readonly yachtsCollection = 'yacht_profiles';
  private readonly experiencesCollection = 'unified_yacht_experiences';
  private readonly bookingsCollection = 'bookings';
  
  constructor(private readonly firestore: Firestore) {}
  
  /**
   * Find yacht by ID
   */
  async findYachtById(id: string): Promise<YachtInfo | null> {
    try {
      const docRef = doc(this.firestore, this.yachtsCollection, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return this.mapDocumentToYachtInfo(docSnap);
    } catch (error) {
      console.error('Error finding yacht by ID:', error);
      throw error;
    }
  }
  
  /**
   * Find yacht package by ID
   */
  async findYachtPackageById(id: string): Promise<YachtPackageInfo | null> {
    try {
      const docRef = doc(this.firestore, this.experiencesCollection, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return this.mapDocumentToYachtPackageInfo(docSnap);
    } catch (error) {
      console.error('Error finding yacht package by ID:', error);
      throw error;
    }
  }
  
  /**
   * Find yachts by producer ID
   */
  async findYachtsByProducerId(producerId: string): Promise<YachtInfo[]> {
    try {
      const q = query(
        collection(this.firestore, this.yachtsCollection),
        where('producerId', '==', producerId)
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => this.mapDocumentToYachtInfo(doc));
    } catch (error) {
      console.error('Error finding yachts by producer ID:', error);
      throw error;
    }
  }
  
  /**
   * Find yacht packages by producer ID
   */
  async findYachtPackagesByProducerId(producerId: string): Promise<YachtPackageInfo[]> {
    try {
      const q = query(
        collection(this.firestore, this.experiencesCollection),
        where('producerId', '==', producerId)
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => this.mapDocumentToYachtPackageInfo(doc));
    } catch (error) {
      console.error('Error finding yacht packages by producer ID:', error);
      throw error;
    }
  }
  
  /**
   * Search yachts by criteria
   */
  async searchYachts(criteria: YachtSearchCriteria): Promise<{
    yachts: YachtInfo[];
    total: number;
  }> {
    try {
      // Build the base query
      let queryBuilder = collection(this.firestore, this.yachtsCollection);
      
      // Apply filters
      if (criteria.producerId) {
        queryBuilder = query(queryBuilder, where('producerId', '==', criteria.producerId));
      }
      
      if (criteria.region) {
        queryBuilder = query(queryBuilder, where('location.region', '==', criteria.region));
      }
      
      if (criteria.portMarina) {
        queryBuilder = query(queryBuilder, where('location.port_marina', '==', criteria.portMarina));
      }
      
      if (criteria.availableOnly) {
        queryBuilder = query(queryBuilder, where('availability_status', '==', true));
      }
      
      // Note: We can't filter by capacity or price range directly in Firestore
      // We'll apply these filters in memory after fetching the data
      
      // Order by name
      queryBuilder = query(queryBuilder, orderBy('name', 'asc'));
      
      // Execute the base query to get total count
      const countSnapshot = await getDocs(queryBuilder);
      const total = countSnapshot.size;
      
      // Apply pagination
      if (criteria.limit) {
        queryBuilder = query(queryBuilder, limit(criteria.limit));
        
        if (criteria.offset && criteria.offset > 0) {
          // Skip to the offset (simplified approach)
          queryBuilder = query(queryBuilder, limit(criteria.offset + criteria.limit));
        }
      }
      
      // Execute the paginated query
      const querySnapshot = await getDocs(queryBuilder);
      
      // Process results and apply in-memory filters
      let yachts = querySnapshot.docs.map(doc => this.mapDocumentToYachtInfo(doc));
      
      // Apply in-memory filters for capacity and price
      if (criteria.minCapacity) {
        yachts = yachts.filter(yacht => yacht.capacity >= criteria.minCapacity!);
      }
      
      if (criteria.maxCapacity) {
        yachts = yachts.filter(yacht => yacht.capacity <= criteria.maxCapacity!);
      }
      
      if (criteria.minPrice) {
        yachts = yachts.filter(yacht => yacht.pricing >= criteria.minPrice!);
      }
      
      if (criteria.maxPrice) {
        yachts = yachts.filter(yacht => yacht.pricing <= criteria.maxPrice!);
      }
      
      // Apply offset (simplified approach)
      if (criteria.offset && criteria.offset > 0 && criteria.limit) {
        yachts = yachts.slice(criteria.offset, criteria.offset + criteria.limit);
      }
      
      return {
        yachts,
        total
      };
    } catch (error) {
      console.error('Error searching yachts:', error);
      throw error;
    }
  }
  
  /**
   * Search yacht packages by criteria
   */
  async searchYachtPackages(criteria: YachtPackageSearchCriteria): Promise<{
    packages: YachtPackageInfo[];
    total: number;
  }> {
    try {
      // Build the base query
      let queryBuilder = collection(this.firestore, this.experiencesCollection);
      
      // Apply filters
      if (criteria.producerId) {
        queryBuilder = query(queryBuilder, where('producerId', '==', criteria.producerId));
      }
      
      if (criteria.region) {
        queryBuilder = query(queryBuilder, where('location.region', '==', criteria.region));
      }
      
      if (criteria.portMarina) {
        queryBuilder = query(queryBuilder, where('location.port_marina', '==', criteria.portMarina));
      }
      
      if (criteria.category) {
        queryBuilder = query(queryBuilder, where('category', '==', criteria.category));
      }
      
      if (criteria.availableOnly) {
        queryBuilder = query(queryBuilder, where('availability_status', '==', true));
      }
      
      if (criteria.featuredOnly) {
        queryBuilder = query(queryBuilder, where('featured', '==', true));
      }
      
      // Note: We can't filter by capacity, price range, or multiple tags directly
      // We'll apply these filters in memory after fetching the data
      
      // Order by title
      queryBuilder = query(queryBuilder, orderBy('title', 'asc'));
      
      // Execute the base query to get total count
      const countSnapshot = await getDocs(queryBuilder);
      const total = countSnapshot.size;
      
      // Apply pagination
      if (criteria.limit) {
        queryBuilder = query(queryBuilder, limit(criteria.limit));
        
        if (criteria.offset && criteria.offset > 0) {
          // Skip to the offset (simplified approach)
          queryBuilder = query(queryBuilder, limit(criteria.offset + criteria.limit));
        }
      }
      
      // Execute the paginated query
      const querySnapshot = await getDocs(queryBuilder);
      
      // Process results and apply in-memory filters
      let packages = querySnapshot.docs.map(doc => this.mapDocumentToYachtPackageInfo(doc));
      
      // Apply in-memory filters for capacity, price, and tags
      if (criteria.minCapacity) {
        packages = packages.filter(pkg => pkg.capacity >= criteria.minCapacity!);
      }
      
      if (criteria.maxCapacity) {
        packages = packages.filter(pkg => pkg.capacity <= criteria.maxCapacity!);
      }
      
      if (criteria.minPrice) {
        packages = packages.filter(pkg => pkg.pricing >= criteria.minPrice!);
      }
      
      if (criteria.maxPrice) {
        packages = packages.filter(pkg => pkg.pricing <= criteria.maxPrice!);
      }
      
      if (criteria.tags && criteria.tags.length > 0) {
        packages = packages.filter(pkg => {
          // Ensure the document has tags
          if (!pkg.tags) return false;
          
          // Check if document has all required tags
          return criteria.tags!.every(tag => typeof pkg.tags === 'object' && pkg.tags.includes(tag));
        });
      }
      
      // Apply offset (simplified approach)
      if (criteria.offset && criteria.offset > 0 && criteria.limit) {
        packages = packages.slice(criteria.offset, criteria.offset + criteria.limit);
      }
      
      return {
        packages,
        total
      };
    } catch (error) {
      console.error('Error searching yacht packages:', error);
      throw error;
    }
  }
  
  /**
   * Check if yacht is available on a date
   */
  async checkYachtAvailability(
    yachtId: string,
    date: Date,
    bookingIds: string[] = []
  ): Promise<boolean> {
    try {
      // First, check if the yacht itself is available
      const yacht = await this.findYachtById(yachtId);
      
      if (!yacht || !yacht.isAvailable) {
        return false;
      }
      
      // Then, check if there are any bookings for this yacht on this date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const q = query(
        collection(this.firestore, this.bookingsCollection),
        where('yachtId', '==', yachtId),
        where('bookingDate', '>=', Timestamp.fromDate(startOfDay)),
        where('bookingDate', '<=', Timestamp.fromDate(endOfDay)),
        where('status', 'not-in', ['cancelled', 'draft'])
      );
      
      const querySnapshot = await getDocs(q);
      
      // Filter out the bookings that are in the exclusion list
      const conflictingBookings = querySnapshot.docs.filter(doc => 
        !bookingIds.includes(doc.id)
      );
      
      // If there are no conflicting bookings, the yacht is available
      return conflictingBookings.length === 0;
    } catch (error) {
      console.error('Error checking yacht availability:', error);
      throw error;
    }
  }
  
  /**
   * Check if yacht package is available on a date
   */
  async checkYachtPackageAvailability(
    packageId: string,
    date: Date,
    bookingIds: string[] = []
  ): Promise<boolean> {
    try {
      // First, check if the package itself is available
      const packageInfo = await this.findYachtPackageById(packageId);
      
      if (!packageInfo || !packageInfo.isAvailable) {
        return false;
      }
      
      // Then, check if there are any bookings for this package on this date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const q = query(
        collection(this.firestore, this.bookingsCollection),
        where('packageId', '==', packageId),
        where('bookingDate', '>=', Timestamp.fromDate(startOfDay)),
        where('bookingDate', '<=', Timestamp.fromDate(endOfDay)),
        where('status', 'not-in', ['cancelled', 'draft'])
      );
      
      const querySnapshot = await getDocs(q);
      
      // Filter out the bookings that are in the exclusion list
      const conflictingBookings = querySnapshot.docs.filter(doc => 
        !bookingIds.includes(doc.id)
      );
      
      // If there are no conflicting bookings, the package is available
      return conflictingBookings.length === 0;
    } catch (error) {
      console.error('Error checking yacht package availability:', error);
      throw error;
    }
  }
  
  /**
   * Get yacht capacity
   */
  async getYachtCapacity(yachtId: string): Promise<number> {
    try {
      const yacht = await this.findYachtById(yachtId);
      
      if (!yacht) {
        throw new Error(`Yacht with ID ${yachtId} not found`);
      }
      
      return yacht.capacity;
    } catch (error) {
      console.error('Error getting yacht capacity:', error);
      throw error;
    }
  }
  
  /**
   * Get yacht package capacity
   */
  async getYachtPackageCapacity(packageId: string): Promise<number> {
    try {
      const packageInfo = await this.findYachtPackageById(packageId);
      
      if (!packageInfo) {
        throw new Error(`Yacht package with ID ${packageId} not found`);
      }
      
      return packageInfo.capacity;
    } catch (error) {
      console.error('Error getting yacht package capacity:', error);
      throw error;
    }
  }
  
  /**
   * Map Firestore document to YachtInfo
   */
  private mapDocumentToYachtInfo(doc: DocumentSnapshot): YachtInfo {
    const data = doc.data();
    
    if (!data) {
      throw new Error(`Yacht with ID ${doc.id} has no data`);
    }
    
    return {
      id: doc.id,
      name: data.name || '',
      capacity: data.max_guests || data.capacity || 0,
      pricing: data.price || data.pricing || 0,
      isAvailable: data.available || data.availability_status || false,
      producerId: data.producerId || '',
      locationAddress: data.location?.address || '',
      region: data.location?.region || '',
      portMarina: data.location?.port_marina || ''
    };
  }
  
  /**
   * Map Firestore document to YachtPackageInfo
   */
  private mapDocumentToYachtPackageInfo(doc: DocumentSnapshot): YachtPackageInfo {
    const data = doc.data();
    
    if (!data) {
      throw new Error(`Yacht package with ID ${doc.id} has no data`);
    }
    
    return {
      id: doc.id,
      title: data.title || '',
      description: data.description || '',
      pricing: data.pricing || 0,
      capacity: data.capacity || 0,
      duration: data.duration || 0,
      isAvailable: data.availability_status || false,
      producerId: data.producerId || '',
      yachtId: data.yachtId || '',
      locationAddress: data.location?.address || '',
      region: data.location?.region || '',
      portMarina: data.location?.port_marina || '',
      tags: data.tags || []
    };
  }
}