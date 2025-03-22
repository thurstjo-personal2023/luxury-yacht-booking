/**
 * Mock Yacht Repository
 * 
 * This class provides a mock implementation of the IYachtRepository interface
 * for testing use cases and controllers without requiring a real database.
 */

import { BaseMockRepository } from '../base-mock-repository';
import { IYachtRepository } from '../../../../core/application/ports/repositories/yacht-repository';
import { Yacht } from '../../../../core/domain/booking/yacht';
import { YachtQueryOptions, PagedYachts } from '../../../../core/application/ports/repositories/yacht-repository';

export class MockYachtRepository extends BaseMockRepository implements IYachtRepository {
  // In-memory storage for yachts
  private yachts: Map<string, Yacht> = new Map();
  private owners: Map<string, string[]> = new Map(); // Maps producerId to array of yacht IDs
  
  /**
   * Get a yacht by ID
   * @param id Yacht ID
   */
  async getById(id: string): Promise<Yacht | null> {
    return this.executeMethod<Yacht | null>('getById', [id], () => {
      return this.yachts.has(id) ? this.yachts.get(id) || null : null;
    });
  }
  
  /**
   * Create a new yacht
   * @param yacht Yacht to create
   */
  async create(yacht: Yacht): Promise<string> {
    return this.executeMethod<string>('create', [yacht], () => {
      const id = yacht.id || `mock-yacht-${Date.now()}`;
      const newYacht = { ...yacht, id };
      this.yachts.set(id, newYacht);
      
      // Add to owner's list
      if (yacht.producerId) {
        if (!this.owners.has(yacht.producerId)) {
          this.owners.set(yacht.producerId, []);
        }
        this.owners.get(yacht.producerId)?.push(id);
      }
      
      return id;
    });
  }
  
  /**
   * Update an existing yacht
   * @param id Yacht ID
   * @param yacht Updated yacht data
   */
  async update(id: string, yacht: Partial<Yacht>): Promise<boolean> {
    return this.executeMethod<boolean>('update', [id, yacht], () => {
      if (!this.yachts.has(id)) {
        return false;
      }
      
      const existingYacht = this.yachts.get(id);
      if (!existingYacht) return false;
      
      this.yachts.set(id, { ...existingYacht, ...yacht });
      return true;
    });
  }
  
  /**
   * Delete a yacht
   * @param id Yacht ID
   */
  async delete(id: string): Promise<boolean> {
    return this.executeMethod<boolean>('delete', [id], () => {
      if (!this.yachts.has(id)) {
        return false;
      }
      
      // Remove from owner's list
      const yacht = this.yachts.get(id);
      if (yacht && yacht.producerId) {
        const ownerYachts = this.owners.get(yacht.producerId) || [];
        this.owners.set(
          yacht.producerId,
          ownerYachts.filter(yachtId => yachtId !== id)
        );
      }
      
      return this.yachts.delete(id);
    });
  }
  
  /**
   * List yachts by query options
   * @param options Query options
   */
  async list(options?: YachtQueryOptions): Promise<PagedYachts> {
    return this.executeMethod<PagedYachts>('list', [options], () => {
      const page = options?.page || 1;
      const pageSize = options?.pageSize || 10;
      
      let filteredYachts = Array.from(this.yachts.values());
      
      // Apply filters
      if (options?.producerId) {
        filteredYachts = filteredYachts.filter(yacht => 
          yacht.producerId === options.producerId
        );
      }
      
      if (options?.region) {
        filteredYachts = filteredYachts.filter(yacht => 
          yacht.location?.region === options.region
        );
      }
      
      if (options?.status !== undefined) {
        filteredYachts = filteredYachts.filter(yacht => 
          yacht.status === options.status
        );
      }
      
      if (options?.featured !== undefined) {
        filteredYachts = filteredYachts.filter(yacht => 
          yacht.featured === options.featured
        );
      }
      
      if (options?.search) {
        const searchLower = options.search.toLowerCase();
        filteredYachts = filteredYachts.filter(yacht => 
          yacht.name.toLowerCase().includes(searchLower) ||
          yacht.description.toLowerCase().includes(searchLower)
        );
      }
      
      // Apply sorting
      if (options?.sortBy) {
        const sortField = options.sortBy;
        const sortDir = options?.sortDir || 'asc';
        
        filteredYachts.sort((a: any, b: any) => {
          const aValue = a[sortField];
          const bValue = b[sortField];
          
          if (aValue === bValue) return 0;
          
          if (sortDir === 'asc') {
            return aValue < bValue ? -1 : 1;
          } else {
            return aValue > bValue ? -1 : 1;
          }
        });
      }
      
      const totalCount = filteredYachts.length;
      const startIndex = (page - 1) * pageSize;
      const items = filteredYachts.slice(startIndex, startIndex + pageSize);
      
      return {
        items,
        totalCount,
        hasMore: startIndex + pageSize < totalCount
      };
    });
  }
  
  /**
   * List featured yachts
   */
  async listFeatured(): Promise<Yacht[]> {
    return this.executeMethod<Yacht[]>('listFeatured', [], () => {
      return Array.from(this.yachts.values())
        .filter(yacht => yacht.featured === true);
    });
  }
  
  /**
   * List yachts by producer ID
   * @param producerId Producer ID
   */
  async listByProducer(producerId: string): Promise<Yacht[]> {
    return this.executeMethod<Yacht[]>('listByProducer', [producerId], () => {
      return Array.from(this.yachts.values())
        .filter(yacht => yacht.producerId === producerId);
    });
  }
  
  /**
   * Check if a yacht exists
   * @param id Yacht ID
   */
  async exists(id: string): Promise<boolean> {
    return this.executeMethod<boolean>('exists', [id], () => {
      return this.yachts.has(id);
    });
  }
  
  /**
   * Check if a user is the owner of a yacht
   * @param yachtId Yacht ID
   * @param userId User ID
   */
  async isOwner(yachtId: string, userId: string): Promise<boolean> {
    return this.executeMethod<boolean>('isOwner', [yachtId, userId], () => {
      const yacht = this.yachts.get(yachtId);
      return yacht?.producerId === userId;
    });
  }
  
  /**
   * Count yachts matching criteria
   * @param options Query options
   */
  async count(options?: YachtQueryOptions): Promise<number> {
    return this.executeMethod<number>('count', [options], () => {
      let filteredYachts = Array.from(this.yachts.values());
      
      // Apply filters
      if (options?.producerId) {
        filteredYachts = filteredYachts.filter(yacht => 
          yacht.producerId === options.producerId
        );
      }
      
      if (options?.region) {
        filteredYachts = filteredYachts.filter(yacht => 
          yacht.location?.region === options.region
        );
      }
      
      if (options?.status !== undefined) {
        filteredYachts = filteredYachts.filter(yacht => 
          yacht.status === options.status
        );
      }
      
      if (options?.featured !== undefined) {
        filteredYachts = filteredYachts.filter(yacht => 
          yacht.featured === options.featured
        );
      }
      
      return filteredYachts.length;
    });
  }
  
  /**
   * Set mock yachts for testing
   * @param yachts Array of yachts to use as mock data
   */
  setMockYachts(yachts: Yacht[]): void {
    this.yachts.clear();
    this.owners.clear();
    
    for (const yacht of yachts) {
      this.yachts.set(yacht.id, yacht);
      
      // Update owners mapping
      if (yacht.producerId) {
        if (!this.owners.has(yacht.producerId)) {
          this.owners.set(yacht.producerId, []);
        }
        this.owners.get(yacht.producerId)?.push(yacht.id);
      }
    }
  }
  
  /**
   * Clear all mock yachts
   */
  clearMockYachts(): void {
    this.yachts.clear();
    this.owners.clear();
  }
}