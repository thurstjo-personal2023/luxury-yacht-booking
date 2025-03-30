
import { AddOn } from '@/core/domain/addon/addon-types';
import { IAddOnRepository } from '@/core/domain/interfaces/IAddOnRepository';
import { db } from '@/server/db';

export class AddOnRepository implements IAddOnRepository {
  private collection = 'products_add_ons';

  async create(addon: AddOn): Promise<string> {
    const docRef = await db.collection(this.collection).add(addon);
    return docRef.id;
  }

  async getById(id: string): Promise<AddOn | null> {
    const doc = await db.collection(this.collection).doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } as AddOn : null;
  }
}
