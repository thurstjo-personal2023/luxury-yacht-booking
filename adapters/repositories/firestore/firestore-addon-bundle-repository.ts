/**
 * Firestore Add-on Bundle Repository
 * 
 * This repository implements the IAddonBundleRepository interface using Firestore.
 */

import { Firestore, DocumentData, DocumentSnapshot, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { AddonBundle } from '../../../core/domain/addon/addon-bundle';
import { IAddonBundleRepository, AddonBundleQueryOptions, PagedAddonBundles } from '../../../core/application/ports/repositories/addon-bundle-repository';
import { YachtExperience } from '../../../shared/firestore-schema';

/**
 * Firestore implementation of the Add-on Bundle Repository
 * This repository works with the unified_yacht_experiences collection
 */
export class FirestoreAddonBundleRepository implements IAddonBundleRepository {
  private readonly collectionName = 'unified_yacht_experiences';
  
  constructor(private readonly firestore: Firestore) {}
  
  /**
   * Map a Firestore document to an AddonBundle domain entity
   * @param doc Firestore document
   * @returns AddonBundle domain entity or null if mapping fails
   */
  private mapToEntity(doc: DocumentSnapshot<DocumentData>): AddonBundle | null {
    if (!doc.exists) {
      return null;
    }
    
    try {
      const data = doc.data() as YachtExperience;
      
      // Extract included add-ons
      const includedAddons = data.includedAddOns?.map(addon => ({
        addonId: addon.addOnId,
        partnerId: addon.partnerId,
        required: true,
        pricing: addon.pricing,
        maxQuantity: addon.maxQuantity
      })) || [];
      
      // Extract optional add-ons
      const optionalAddons = data.optionalAddOns?.map(addon => ({
        addonId: addon.addOnId,
        partnerId: addon.partnerId,
        required: false,
        pricing: addon.pricing,
        maxQuantity: addon.maxQuantity
      })) || [];
      
      // Create the AddonBundle entity
      return AddonBundle.create({
        id: doc.id,
        yachtId: data.package_id,
        includedAddons,
        optionalAddons,
        createdAt: data.created_date?.toDate() || new Date(),
        updatedAt: data.last_updated_date?.toDate() || new Date()
      });
    } catch (error) {
      console.error(`Error mapping document ${doc.id} to AddonBundle entity:`, error);
      return null;
    }
  }
  
  /**
   * Map an AddonBundle domain entity to Firestore document updates
   * @param bundle AddonBundle domain entity
   * @returns Partial YachtExperience document for updating
   */
  private mapToDocumentUpdates(bundle: AddonBundle): Partial<YachtExperience> {
    const bundleData = bundle.toObject();
    
    // Map included add-ons to Firestore format
    const includedAddOns = bundleData.includedAddons.map(addon => ({
      addOnId: addon.addonId,
      partnerId: addon.partnerId,
      name: '', // This will be populated by the bundle-addons-use-case
      pricing: addon.pricing,
      isRequired: true,
      commissionRate: 0, // This will be populated by the bundle-addons-use-case
      maxQuantity: addon.maxQuantity
    }));
    
    // Map optional add-ons to Firestore format
    const optionalAddOns = bundleData.optionalAddons.map(addon => ({
      addOnId: addon.addonId,
      partnerId: addon.partnerId,
      name: '', // This will be populated by the bundle-addons-use-case
      pricing: addon.pricing,
      isRequired: false,
      commissionRate: 0, // This will be populated by the bundle-addons-use-case
      maxQuantity: addon.maxQuantity
    }));
    
    // Return only the fields that should be updated
    return {
      includedAddOns,
      optionalAddOns,
      last_updated_date: new Date()
    };
  }
  
  /**
   * Get a bundle by ID
   * @param id Bundle ID
   * @returns AddonBundle entity or null if not found
   */
  async getById(id: string): Promise<AddonBundle | null> {
    try {
      const doc = await this.firestore.collection(this.collectionName).doc(id).get();
      return this.mapToEntity(doc);
    } catch (error) {
      console.error(`Error getting bundle with ID ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Get a bundle by yacht ID
   * @param yachtId Yacht ID
   * @returns AddonBundle entity or null if not found
   */
  async getByYachtId(yachtId: string): Promise<AddonBundle | null> {
    try {
      const snapshot = await this.firestore
        .collection(this.collectionName)
        .where('package_id', '==', yachtId)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      return this.mapToEntity(snapshot.docs[0]);
    } catch (error) {
      console.error(`Error getting bundle by yacht ID ${yachtId}:`, error);
      throw error;
    }
  }
  
  /**
   * Save a bundle
   * @param bundle AddonBundle entity
   * @returns The saved bundle entity
   */
  async save(bundle: AddonBundle): Promise<AddonBundle> {
    try {
      const docRef = this.firestore.collection(this.collectionName).doc(bundle.id);
      
      // Update only the add-on related fields
      await docRef.update(this.mapToDocumentUpdates(bundle));
      
      // Fetch the saved document to return the entity with any updates
      const savedDoc = await docRef.get();
      const savedEntity = this.mapToEntity(savedDoc);
      
      if (!savedEntity) {
        throw new Error(`Failed to retrieve saved bundle with ID ${bundle.id}`);
      }
      
      return savedEntity;
    } catch (error) {
      console.error(`Error saving bundle with ID ${bundle.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a bundle
   * @param id Bundle ID
   * @returns True if the bundle was deleted, false otherwise
   */
  async delete(id: string): Promise<boolean> {
    try {
      // Instead of deleting the yacht experience document, we'll just remove the add-ons
      const doc = await this.firestore.collection(this.collectionName).doc(id).get();
      
      if (!doc.exists) {
        return false;
      }
      
      await doc.ref.update({
        includedAddOns: [],
        optionalAddOns: [],
        last_updated_date: new Date()
      });
      
      return true;
    } catch (error) {
      console.error(`Error deleting bundle with ID ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Find bundles by add-on ID
   * @param addonId Add-on ID
   * @param options Query options
   * @returns Paged bundles
   */
  async findByAddonId(addonId: string, options: Omit<AddonBundleQueryOptions, 'addonId'> = {}): Promise<PagedAddonBundles> {
    try {
      // Firestore doesn't directly support querying for an element within an array of objects
      // So we need to get all documents and filter them in memory
      const snapshot = await this.firestore
        .collection(this.collectionName)
        .get();
      
      // Filter the bundles that contain the add-on
      let filteredDocs = snapshot.docs.filter(doc => {
        const data = doc.data() as YachtExperience;
        const includedAddOns = data.includedAddOns || [];
        const optionalAddOns = data.optionalAddOns || [];
        
        return (
          includedAddOns.some(addon => addon.addOnId === addonId) ||
          optionalAddOns.some(addon => addon.addOnId === addonId)
        );
      });
      
      // Apply sorting
      if (options.sortBy) {
        const direction = options.sortDirection === 'desc' ? -1 : 1;
        filteredDocs = filteredDocs.sort((a, b) => {
          const dataA = a.data() as YachtExperience;
          const dataB = b.data() as YachtExperience;
          
          switch (options.sortBy) {
            case 'createdAt':
              return (
                (dataA.created_date?.toDate().getTime() || 0) -
                (dataB.created_date?.toDate().getTime() || 0)
              ) * direction;
            case 'updatedAt':
              return (
                (dataA.last_updated_date?.toDate().getTime() || 0) -
                (dataB.last_updated_date?.toDate().getTime() || 0)
              ) * direction;
            default:
              return (
                (dataA.last_updated_date?.toDate().getTime() || 0) -
                (dataB.last_updated_date?.toDate().getTime() || 0)
              ) * direction;
          }
        });
      }
      
      // Get the total count
      const totalCount = filteredDocs.length;
      
      // Apply pagination
      if (options.offset) {
        filteredDocs = filteredDocs.slice(options.offset);
      }
      
      if (options.limit) {
        filteredDocs = filteredDocs.slice(0, options.limit);
      }
      
      // Map to entities
      const items = filteredDocs
        .map(doc => this.mapToEntity(doc))
        .filter((bundle): bundle is AddonBundle => bundle !== null);
      
      return {
        items,
        totalCount
      };
    } catch (error) {
      console.error(`Error finding bundles by add-on ID ${addonId}:`, error);
      throw error;
    }
  }
  
  /**
   * Find bundles by query options
   * @param options Query options
   * @returns Paged bundles
   */
  async find(options: AddonBundleQueryOptions = {}): Promise<PagedAddonBundles> {
    try {
      // If filtering by add-on ID, use the dedicated method
      if (options.addonId) {
        return this.findByAddonId(options.addonId, options);
      }
      
      let query = this.firestore.collection(this.collectionName);
      
      // Apply sorting
      if (options.sortBy) {
        const direction = options.sortDirection === 'desc' ? 'desc' : 'asc';
        switch (options.sortBy) {
          case 'createdAt':
            query = query.orderBy('created_date', direction);
            break;
          case 'updatedAt':
            query = query.orderBy('last_updated_date', direction);
            break;
          default:
            query = query.orderBy('last_updated_date', 'desc');
        }
      } else {
        // Default sorting
        query = query.orderBy('last_updated_date', 'desc');
      }
      
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
        .filter((bundle): bundle is AddonBundle => bundle !== null);
      
      return {
        items,
        totalCount: snapshot.size
      };
    } catch (error) {
      console.error('Error finding bundles:', error);
      throw error;
    }
  }
}