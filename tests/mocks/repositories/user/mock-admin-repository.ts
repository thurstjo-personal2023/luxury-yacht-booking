/**
 * Mock Admin Repository
 * 
 * This class provides a mock implementation of the IAdminRepository interface
 * for testing admin-related use cases and controllers without requiring a real database.
 */

import { BaseMockRepository } from '../base-mock-repository';
import { IAdminRepository } from '../../../../core/application/ports/repositories/admin-repository';
import { AdminUser } from '../../../../core/domain/admin/admin-user';
import { AdminRole } from '../../../../core/domain/admin/admin-role';
import { AdminQueryOptions, PagedAdminUsers } from '../../../../core/application/ports/repositories/admin-repository';

export class MockAdminRepository extends BaseMockRepository implements IAdminRepository {
  // In-memory storage for admin users
  private admins: Map<string, AdminUser> = new Map();
  
  /**
   * Get an admin user by ID
   * @param id Admin user ID
   */
  async getById(id: string): Promise<AdminUser | null> {
    return this.executeMethod<AdminUser | null>('getById', [id], () => {
      return this.admins.has(id) ? this.admins.get(id) || null : null;
    });
  }
  
  /**
   * Get an admin user by email
   * @param email Admin user email
   */
  async getByEmail(email: string): Promise<AdminUser | null> {
    return this.executeMethod<AdminUser | null>('getByEmail', [email], () => {
      return Array.from(this.admins.values())
        .find(admin => admin.email === email) || null;
    });
  }
  
  /**
   * Create a new admin user
   * @param admin Admin user to create
   */
  async create(admin: AdminUser): Promise<string> {
    return this.executeMethod<string>('create', [admin], () => {
      const id = admin.id || `mock-admin-${Date.now()}`;
      const newAdmin = { ...admin, id };
      this.admins.set(id, newAdmin);
      return id;
    });
  }
  
  /**
   * Update an existing admin user
   * @param id Admin user ID
   * @param admin Updated admin user data
   */
  async update(id: string, admin: Partial<AdminUser>): Promise<boolean> {
    return this.executeMethod<boolean>('update', [id, admin], () => {
      if (!this.admins.has(id)) {
        return false;
      }
      
      const existingAdmin = this.admins.get(id);
      if (!existingAdmin) return false;
      
      this.admins.set(id, { ...existingAdmin, ...admin });
      return true;
    });
  }
  
  /**
   * Delete an admin user
   * @param id Admin user ID
   */
  async delete(id: string): Promise<boolean> {
    return this.executeMethod<boolean>('delete', [id], () => {
      return this.admins.delete(id);
    });
  }
  
  /**
   * List admin users by query options
   * @param options Query options
   */
  async list(options?: AdminQueryOptions): Promise<PagedAdminUsers> {
    return this.executeMethod<PagedAdminUsers>('list', [options], () => {
      const page = options?.page || 1;
      const pageSize = options?.pageSize || 10;
      
      let filteredAdmins = Array.from(this.admins.values());
      
      // Apply filters
      if (options?.role) {
        filteredAdmins = filteredAdmins.filter(admin => 
          admin.role === options.role
        );
      }
      
      if (options?.status) {
        filteredAdmins = filteredAdmins.filter(admin => 
          admin.status === options.status
        );
      }
      
      if (options?.approved !== undefined) {
        filteredAdmins = filteredAdmins.filter(admin => 
          admin.approved === options.approved
        );
      }
      
      if (options?.search) {
        const searchLower = options.search.toLowerCase();
        filteredAdmins = filteredAdmins.filter(admin => 
          admin.email.toLowerCase().includes(searchLower) ||
          admin.name.toLowerCase().includes(searchLower) ||
          admin.department?.toLowerCase().includes(searchLower)
        );
      }
      
      // Apply sorting
      if (options?.sortBy) {
        const sortField = options.sortBy;
        const sortDir = options?.sortDir || 'asc';
        
        filteredAdmins.sort((a: any, b: any) => {
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
      
      const totalCount = filteredAdmins.length;
      const startIndex = (page - 1) * pageSize;
      const items = filteredAdmins.slice(startIndex, startIndex + pageSize);
      
      return {
        items,
        totalCount,
        hasMore: startIndex + pageSize < totalCount
      };
    });
  }
  
  /**
   * List admin users by their role
   * @param role Admin role
   */
  async listByRole(role: AdminRole): Promise<AdminUser[]> {
    return this.executeMethod<AdminUser[]>('listByRole', [role], () => {
      return Array.from(this.admins.values())
        .filter(admin => admin.role === role);
    });
  }
  
  /**
   * List admin users pending approval
   */
  async listPendingApprovals(): Promise<AdminUser[]> {
    return this.executeMethod<AdminUser[]>('listPendingApprovals', [], () => {
      return Array.from(this.admins.values())
        .filter(admin => admin.approved === false);
    });
  }
  
  /**
   * Find super administrators
   */
  async findSuperAdmins(): Promise<AdminUser[]> {
    return this.executeMethod<AdminUser[]>('findSuperAdmins', [], () => {
      return Array.from(this.admins.values())
        .filter(admin => admin.role === AdminRole.SUPER_ADMIN);
    });
  }
  
  /**
   * Check if an admin user exists by ID
   * @param id Admin user ID
   */
  async exists(id: string): Promise<boolean> {
    return this.executeMethod<boolean>('exists', [id], () => {
      return this.admins.has(id);
    });
  }
  
  /**
   * Check if an admin user exists by email
   * @param email Admin user email
   */
  async existsByEmail(email: string): Promise<boolean> {
    return this.executeMethod<boolean>('existsByEmail', [email], () => {
      return Array.from(this.admins.values())
        .some(admin => admin.email === email);
    });
  }
  
  /**
   * Count admin users matching criteria
   * @param options Query options
   */
  async count(options?: AdminQueryOptions): Promise<number> {
    return this.executeMethod<number>('count', [options], () => {
      let filteredAdmins = Array.from(this.admins.values());
      
      // Apply filters
      if (options?.role) {
        filteredAdmins = filteredAdmins.filter(admin => 
          admin.role === options.role
        );
      }
      
      if (options?.status) {
        filteredAdmins = filteredAdmins.filter(admin => 
          admin.status === options.status
        );
      }
      
      if (options?.approved !== undefined) {
        filteredAdmins = filteredAdmins.filter(admin => 
          admin.approved === options.approved
        );
      }
      
      return filteredAdmins.length;
    });
  }
  
  /**
   * Count admin users by approval status
   * @param approved Approval status
   */
  async countByApprovalStatus(approved: boolean): Promise<number> {
    return this.executeMethod<number>('countByApprovalStatus', [approved], () => {
      return Array.from(this.admins.values())
        .filter(admin => admin.approved === approved)
        .length;
    });
  }
  
  /**
   * Set mock admin users for testing
   * @param admins Array of admin users to use as mock data
   */
  setMockAdmins(admins: AdminUser[]): void {
    this.admins.clear();
    for (const admin of admins) {
      this.admins.set(admin.id, admin);
    }
  }
  
  /**
   * Clear all mock admin users
   */
  clearMockAdmins(): void {
    this.admins.clear();
  }
}