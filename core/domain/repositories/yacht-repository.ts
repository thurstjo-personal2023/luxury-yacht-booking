/**
 * Yacht Repository Interface
 * 
 * This interface defines the contract for yacht data access
 */

/**
 * Basic yacht information needed by the booking system
 */
export interface YachtInfo {
  id: string;
  name: string;
  capacity: number;
  pricing: number;
  isAvailable: boolean;
  producerId: string;
  locationAddress?: string;
  region?: string;
  portMarina?: string;
}

/**
 * Yacht package information needed by the booking system
 */
export interface YachtPackageInfo {
  id: string;
  title: string;
  description: string;
  pricing: number;
  capacity: number;
  duration: number;
  isAvailable: boolean;
  producerId: string;
  yachtId?: string;
  locationAddress?: string;
  region?: string;
  portMarina?: string;
}

/**
 * Yacht search criteria
 */
export interface YachtSearchCriteria {
  producerId?: string;
  region?: string;
  portMarina?: string;
  minCapacity?: number;
  maxCapacity?: number;
  minPrice?: number;
  maxPrice?: number;
  availableOnly?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Yacht package search criteria
 */
export interface YachtPackageSearchCriteria {
  producerId?: string;
  region?: string;
  portMarina?: string;
  category?: string;
  tags?: string[];
  minCapacity?: number;
  maxCapacity?: number;
  minPrice?: number;
  maxPrice?: number;
  availableOnly?: boolean;
  featuredOnly?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Yacht repository interface
 */
export interface IYachtRepository {
  /**
   * Find yacht by ID
   */
  findYachtById(id: string): Promise<YachtInfo | null>;
  
  /**
   * Find yacht package by ID
   */
  findYachtPackageById(id: string): Promise<YachtPackageInfo | null>;
  
  /**
   * Find yachts by producer ID
   */
  findYachtsByProducerId(producerId: string): Promise<YachtInfo[]>;
  
  /**
   * Find yacht packages by producer ID
   */
  findYachtPackagesByProducerId(producerId: string): Promise<YachtPackageInfo[]>;
  
  /**
   * Search yachts by criteria
   */
  searchYachts(criteria: YachtSearchCriteria): Promise<{
    yachts: YachtInfo[];
    total: number;
  }>;
  
  /**
   * Search yacht packages by criteria
   */
  searchYachtPackages(criteria: YachtPackageSearchCriteria): Promise<{
    packages: YachtPackageInfo[];
    total: number;
  }>;
  
  /**
   * Check if yacht is available on a date
   */
  checkYachtAvailability(
    yachtId: string,
    date: Date,
    bookingIds?: string[]
  ): Promise<boolean>;
  
  /**
   * Check if yacht package is available on a date
   */
  checkYachtPackageAvailability(
    packageId: string,
    date: Date,
    bookingIds?: string[]
  ): Promise<boolean>;
  
  /**
   * Get yacht capacity
   */
  getYachtCapacity(yachtId: string): Promise<number>;
  
  /**
   * Get yacht package capacity
   */
  getYachtPackageCapacity(packageId: string): Promise<number>;
}