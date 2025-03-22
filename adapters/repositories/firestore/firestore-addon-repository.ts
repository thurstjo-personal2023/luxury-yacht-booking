/**
 * Firestore Add-on Repository
 * 
 * This repository implements the IAddonRepository interface using Firestore.
 */

import { Firestore, DocumentData, DocumentSnapshot, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { Addon } from '../../../core/domain/addon/addon';
import { AddonType } from '../../../core/domain/addon/addon-type';
import { AddonPricing } from '../../../core/domain/addon/addon-pricing';
import { IAddonRepository, AddonQueryOptions, PagedAddons } from '../../../core/application/ports/repositories/addon-repository';
import { ProductAddOn } from '../../../shared/firestore-schema';

/**
 * Firestore implementation of the Add-on Repository
 */
export class FirestoreAddonRepository implements IAddonRepository {
  private readonly collectionName = 'products_add_ons';
  
  constructor(private readonly firestore: Firestore) {}
  
  /**
   * Map a Firestore document to an Addon domain entity
   * @param doc Firestore document
   * @returns Addon domain entity
   */
  private mapToEntity(doc: DocumentSnapshot<DocumentData>): Addon | null {
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data() as ProductAddOn;
    
    try {
      // Create the pricing value object
      const pricing = new AddonPricing({
        basePrice: data.pricing,
        commissionRate: data.commissionRate || 0,
        maxQuantity: data.maxQuantity
      });
      
      // Map media array
      const media = data.media?.map(m => ({
        type: m.type,
        url: m.url,
        title: m.title
      })) || [];
      
      // Create the Addon entity with appropriate type mapping
      return Addon.create({
        id: doc.id,
        productId: data.productId,
        name: data.name,
        description: data.description,
        type: (data.type || 'service') as AddonType,
        category: data.category,
        pricing,
        media,
        partnerId: data.partnerId,
        tags: data.tags || [],
        isAvailable: data.availability !== undefined ? data.availability : true,
        createdAt: data.createdDate?.toDate() || new Date(),
        updatedAt: data.lastUpdatedDate?.toDate() || new Date()
      });
    } catch (error) {
      console.error(`Error mapping document ${doc.id} to Addon entity:`, error);
      return null;
    }
  }
  
  /**
   * Map an Addon domain entity to a Firestore document
   * @param addon Addon domain entity
   * @returns Firestore document data
   */
  private mapToDocument(addon: Addon): Partial<ProductAddOn> {
    const addonData = addon.toObject();
    
    return {
      productId: addonData.productId,
      name: addonData.name,
      description: addonData.description,
      type: addonData.type,
      category: addonData.category,
      pricing: addonData.pricing.basePrice,
      commissionRate: addonData.pricing.commissionRate,
      maxQuantity: addonData.pricing.maxQuantity,
      media: addonData.media.map(m => ({
        type: m.type,
        url: m.url,
        title: m.title
      })),
      partnerId: addonData.partnerId,
      tags: addonData.tags,
      availability: addonData.isAvailable,
      createdDate: addonData.createdAt ? new Date(addonData.createdAt) : new Date(),
      lastUpdatedDate: new Date()
    };
  }
  
  /**
   * Get an add-on by ID
   * @param id Add-on ID
   * @returns Addon entity or null if not found
   */
  async getById(id: string): Promise<Addon | null> {
    try {
      const doc = await this.firestore.collection(this.collectionName).doc(id).get();
      return this.mapToEntity(doc);
    } catch (error) {
      console.error(`Error getting addon with ID ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Get an add-on by product ID
   * @param productId Product ID
   * @returns Addon entity or null if not found
   */
  async getByProductId(productId: string): Promise<Addon | null> {
    try {
      const snapshot = await this.firestore
        .collection(this.collectionName)
        .where('productId', '==', productId)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      return this.mapToEntity(snapshot.docs[0]);
    } catch (error) {
      console.error(`Error getting addon with product ID ${productId}:`, error);
      throw error;
    }
  }
  
  /**
   * Check if an add-on exists
   * @param id Add-on ID
   * @returns True if the add-on exists, false otherwise
   */
  async exists(id: string): Promise<boolean> {
    try {
      const doc = await this.firestore.collection(this.collectionName).doc(id).get();
      return doc.exists;
    } catch (error) {
      console.error(`Error checking if addon with ID ${id} exists:`, error);
      throw error;
    }
  }
  
  /**
   * Save an add-on
   * @param addon Addon entity
   * @returns The saved addon entity
   */
  async save(addon: Addon): Promise<Addon> {
    try {
      const docRef = this.firestore.collection(this.collectionName).doc(addon.id);
      await docRef.set(this.mapToDocument(addon), { merge: true });
      
      // Fetch the saved document to return the entity with any updates
      const savedDoc = await docRef.get();
      const savedEntity = this.mapToEntity(savedDoc);
      
      if (!savedEntity) {
        throw new Error(`Failed to retrieve saved addon with ID ${addon.id}`);
      }
      
      return savedEntity;
    } catch (error) {
      console.error(`Error saving addon with ID ${addon.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete an add-on
   * @param id Add-on ID
   * @returns True if the add-on was deleted, false otherwise
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.firestore.collection(this.collectionName).doc(id).delete();
      return true;
    } catch (error) {
      console.error(`Error deleting addon with ID ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Find add-ons by multiple IDs
   * @param ids Array of add-on IDs
   * @returns Array of Addon entities
   */
  async findByIds(ids: string[]): Promise<Addon[]> {
    try {
      if (ids.length === 0) {
        return [];
      }
      
      // Firestore can query up to 10 IDs at a time, so we need to chunk the IDs
      const chunkSize = 10;
      const chunks = [];
      
      for (let i = 0; i < ids.length; i += chunkSize) {
        chunks.push(ids.slice(i, i + chunkSize));
      }
      
      const results: Addon[] = [];
      
      for (const chunk of chunks) {
        const snapshot = await this.firestore
          .collection(this.collectionName)
          .where('__name__', 'in', chunk)
          .get();
        
        const addons = snapshot.docs
          .map(doc => this.mapToEntity(doc))
          .filter((addon): addon is Addon => addon !== null);
        
        results.push(...addons);
      }
      
      return results;
    } catch (error) {
      console.error(`Error finding addons by IDs:`, error);
      throw error;
    }
  }
  
  /**
   * Find add-ons by partner ID
   * @param partnerId Partner ID
   * @param options Query options
   * @returns Paged add-ons
   */
  async findByPartnerId(partnerId: string, options: Omit<AddonQueryOptions, 'partnerId'> = {}): Promise<PagedAddons> {
    return this.find({ ...options, partnerId });
  }
  
  /**
   * Find add-ons by query options
   * @param options Query options
   * @returns Paged add-ons
   */
  async find(options: AddonQueryOptions = {}): Promise<PagedAddons> {
    try {
      let query = this.firestore.collection(this.collectionName);
      
      // Apply filters
      if (options.type) {
        query = query.where('type', '==', options.type);
      }
      
      if (options.category) {
        query = query.where('category', '==', options.category);
      }
      
      if (options.partnerId) {
        query = query.where('partnerId', '==', options.partnerId);
      }
      
      if (options.isAvailable !== undefined) {
        query = query.where('availability', '==', options.isAvailable);
      }
      
      // Price range filters
      if (options.minPrice !== undefined) {
        query = query.where('pricing', '>=', options.minPrice);
      }
      
      if (options.maxPrice !== undefined) {
        query = query.where('pricing', '<=', options.maxPrice);
      }
      
      // Tags filter (can only be applied if a single tag is specified due to Firestore limitations)
      if (options.tags && options.tags.length === 1) {
        query = query.where('tags', 'array-contains', options.tags[0]);
      }
      
      // Apply sorting
      if (options.sortBy) {
        const direction = options.sortDirection === 'desc' ? 'desc' : 'asc';
        switch (options.sortBy) {
          case 'name':
            query = query.orderBy('name', direction);
            break;
          case 'price':
            query = query.orderBy('pricing', direction);
            break;
          case 'createdAt':
            query = query.orderBy('createdDate', direction);
            break;
          case 'updatedAt':
            query = query.orderBy('lastUpdatedDate', direction);
            break;
          default:
            query = query.orderBy('lastUpdatedDate', 'desc');
        }
      } else {
        // Default sorting
        query = query.orderBy('lastUpdatedDate', 'desc');
      }
      
      // First get the total count
      const totalCountSnapshot = await query.count().get();
      const totalCount = totalCountSnapshot.data().count;
      
      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.offset(options.offset);
      }
      
      // Execute the query
      const snapshot = await query.get();
      
      // Map the documents to domain entities
      const items = snapshot.docs
        .map(doc => this.mapToEntity(doc))
        .filter((addon): addon is Addon => addon !== null);
      
      // Handle multiple tags filter after fetching
      if (options.tags && options.tags.length > 1) {
        const filteredItems = items.filter(addon => {
          const addonTags = addon.toObject().tags;
          return options.tags!.every(tag => addonTags.includes(tag));
        });
        
        return {
          items: filteredItems,
          totalCount: filteredItems.length // This is not accurate for the total count, but it's the best we can do
        };
      }
      
      // Handle search term filter after fetching
      if (options.searchTerm) {
        const searchTerm = options.searchTerm.toLowerCase();
        const filteredItems = items.filter(addon => {
          const addonData = addon.toObject();
          return (
            addonData.name.toLowerCase().includes(searchTerm) ||
            addonData.description.toLowerCase().includes(searchTerm) ||
            addonData.category.toLowerCase().includes(searchTerm) ||
            addonData.tags.some(tag => tag.toLowerCase().includes(searchTerm))
          );
        });
        
        return {
          items: filteredItems,
          totalCount: filteredItems.length // This is not accurate for the total count, but it's the best we can do
        };
      }
      
      return {
        items,
        totalCount
      };
    } catch (error) {
      console.error('Error finding addons:', error);
      throw error;
    }
  }
}