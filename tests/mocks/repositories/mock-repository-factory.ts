/**
 * Mock Repository Factory
 * 
 * This factory creates mock repositories for use in testing.
 * It follows the same pattern as our real repository factory but provides
 * test implementations that can be configured for different test scenarios.
 */

// Import interfaces
import { IRepositoryFactory } from '../../../core/application/ports/repositories/repository-factory';
import { IUserRepository } from '../../../core/application/ports/repositories/user-repository';
import { IAdminRepository } from '../../../core/application/ports/repositories/admin-repository';
import { IAdminCredentialsRepository } from '../../../core/application/ports/repositories/admin-credentials-repository';
import { IAdminInvitationRepository } from '../../../core/application/ports/repositories/admin-invitation-repository';
import { IMediaRepository } from '../../../core/application/ports/repositories/media-repository';
import { IBookingRepository } from '../../../core/application/ports/repositories/booking-repository';
import { IYachtRepository } from '../../../core/application/ports/repositories/yacht-repository';
import { IAddonRepository } from '../../../core/application/ports/repositories/addon-repository';
import { IAddonBundleRepository } from '../../../core/application/ports/repositories/addon-bundle-repository';

// Import mock repositories (to be implemented)
import { MockUserRepository } from './user/mock-user-repository';
import { MockAdminRepository } from './user/mock-admin-repository';
import { MockAdminCredentialsRepository } from './user/mock-admin-credentials-repository';
import { MockAdminInvitationRepository } from './user/mock-admin-invitation-repository';
import { MockMediaRepository } from './media/mock-media-repository';
import { MockBookingRepository } from './booking/mock-booking-repository';
import { MockYachtRepository } from './booking/mock-yacht-repository';
import { MockAddonRepository } from './addon/mock-addon-repository';
import { MockAddonBundleRepository } from './addon/mock-addon-bundle-repository';

/**
 * Factory for creating mock repositories
 */
export class MockRepositoryFactory implements IRepositoryFactory {
  // Singleton instances
  private static userRepository: MockUserRepository;
  private static adminRepository: MockAdminRepository;
  private static adminCredentialsRepository: MockAdminCredentialsRepository;
  private static adminInvitationRepository: MockAdminInvitationRepository;
  private static mediaRepository: MockMediaRepository;
  private static bookingRepository: MockBookingRepository;
  private static yachtRepository: MockYachtRepository;
  private static addonRepository: MockAddonRepository;
  private static addonBundleRepository: MockAddonBundleRepository;
  
  /**
   * Reset all mock repositories to their initial state
   * This is useful between tests to ensure clean state
   */
  public static resetAll(): void {
    // Clear all repositories and their recorded calls
    if (this.userRepository) this.userRepository.clearMethodCalls();
    if (this.adminRepository) this.adminRepository.clearMethodCalls();
    if (this.adminCredentialsRepository) this.adminCredentialsRepository.clearMethodCalls();
    if (this.adminInvitationRepository) this.adminInvitationRepository.clearMethodCalls();
    if (this.mediaRepository) this.mediaRepository.clearMethodCalls();
    if (this.bookingRepository) this.bookingRepository.clearMethodCalls();
    if (this.yachtRepository) this.yachtRepository.clearMethodCalls();
    if (this.addonRepository) this.addonRepository.clearMethodCalls();
    if (this.addonBundleRepository) this.addonBundleRepository.clearMethodCalls();
    
    // Reset all behaviors to defaults
    if (this.userRepository) this.userRepository.resetBehaviors();
    if (this.adminRepository) this.adminRepository.resetBehaviors();
    if (this.adminCredentialsRepository) this.adminCredentialsRepository.resetBehaviors();
    if (this.adminInvitationRepository) this.adminInvitationRepository.resetBehaviors();
    if (this.mediaRepository) this.mediaRepository.resetBehaviors();
    if (this.bookingRepository) this.bookingRepository.resetBehaviors();
    if (this.yachtRepository) this.yachtRepository.resetBehaviors();
    if (this.addonRepository) this.addonRepository.resetBehaviors();
    if (this.addonBundleRepository) this.addonBundleRepository.resetBehaviors();
  }
  
  /**
   * Create a user repository
   */
  createUserRepository(): IUserRepository {
    if (!MockRepositoryFactory.userRepository) {
      MockRepositoryFactory.userRepository = new MockUserRepository();
    }
    return MockRepositoryFactory.userRepository;
  }
  
  /**
   * Create an admin repository
   */
  createAdminRepository(): IAdminRepository {
    if (!MockRepositoryFactory.adminRepository) {
      MockRepositoryFactory.adminRepository = new MockAdminRepository();
    }
    return MockRepositoryFactory.adminRepository;
  }
  
  /**
   * Create an admin credentials repository
   */
  createAdminCredentialsRepository(): IAdminCredentialsRepository {
    if (!MockRepositoryFactory.adminCredentialsRepository) {
      MockRepositoryFactory.adminCredentialsRepository = new MockAdminCredentialsRepository();
    }
    return MockRepositoryFactory.adminCredentialsRepository;
  }
  
  /**
   * Create an admin invitation repository
   */
  createAdminInvitationRepository(): IAdminInvitationRepository {
    if (!MockRepositoryFactory.adminInvitationRepository) {
      MockRepositoryFactory.adminInvitationRepository = new MockAdminInvitationRepository();
    }
    return MockRepositoryFactory.adminInvitationRepository;
  }
  
  /**
   * Create a media repository
   */
  createMediaRepository(): IMediaRepository {
    if (!MockRepositoryFactory.mediaRepository) {
      MockRepositoryFactory.mediaRepository = new MockMediaRepository();
    }
    return MockRepositoryFactory.mediaRepository;
  }
  
  /**
   * Create a booking repository
   */
  createBookingRepository(): IBookingRepository {
    if (!MockRepositoryFactory.bookingRepository) {
      MockRepositoryFactory.bookingRepository = new MockBookingRepository();
    }
    return MockRepositoryFactory.bookingRepository;
  }
  
  /**
   * Create a yacht repository
   */
  createYachtRepository(): IYachtRepository {
    if (!MockRepositoryFactory.yachtRepository) {
      MockRepositoryFactory.yachtRepository = new MockYachtRepository();
    }
    return MockRepositoryFactory.yachtRepository;
  }
  
  /**
   * Create an addon repository
   */
  createAddonRepository(): IAddonRepository {
    if (!MockRepositoryFactory.addonRepository) {
      MockRepositoryFactory.addonRepository = new MockAddonRepository();
    }
    return MockRepositoryFactory.addonRepository;
  }
  
  /**
   * Create an addon bundle repository
   */
  createAddonBundleRepository(): IAddonBundleRepository {
    if (!MockRepositoryFactory.addonBundleRepository) {
      MockRepositoryFactory.addonBundleRepository = new MockAddonBundleRepository();
    }
    return MockRepositoryFactory.addonBundleRepository;
  }
  
  // Helper methods to access the mock instances directly for test configuration
  
  /**
   * Get the mock user repository instance
   */
  static getMockUserRepository(): MockUserRepository {
    if (!this.userRepository) {
      this.userRepository = new MockUserRepository();
    }
    return this.userRepository;
  }
  
  /**
   * Get the mock admin repository instance
   */
  static getMockAdminRepository(): MockAdminRepository {
    if (!this.adminRepository) {
      this.adminRepository = new MockAdminRepository();
    }
    return this.adminRepository;
  }
  
  /**
   * Get the mock admin credentials repository instance
   */
  static getMockAdminCredentialsRepository(): MockAdminCredentialsRepository {
    if (!this.adminCredentialsRepository) {
      this.adminCredentialsRepository = new MockAdminCredentialsRepository();
    }
    return this.adminCredentialsRepository;
  }
  
  /**
   * Get the mock admin invitation repository instance
   */
  static getMockAdminInvitationRepository(): MockAdminInvitationRepository {
    if (!this.adminInvitationRepository) {
      this.adminInvitationRepository = new MockAdminInvitationRepository();
    }
    return this.adminInvitationRepository;
  }
  
  /**
   * Get the mock media repository instance
   */
  static getMockMediaRepository(): MockMediaRepository {
    if (!this.mediaRepository) {
      this.mediaRepository = new MockMediaRepository();
    }
    return this.mediaRepository;
  }
  
  /**
   * Get the mock booking repository instance
   */
  static getMockBookingRepository(): MockBookingRepository {
    if (!this.bookingRepository) {
      this.bookingRepository = new MockBookingRepository();
    }
    return this.bookingRepository;
  }
  
  /**
   * Get the mock yacht repository instance
   */
  static getMockYachtRepository(): MockYachtRepository {
    if (!this.yachtRepository) {
      this.yachtRepository = new MockYachtRepository();
    }
    return this.yachtRepository;
  }
  
  /**
   * Get the mock addon repository instance
   */
  static getMockAddonRepository(): MockAddonRepository {
    if (!this.addonRepository) {
      this.addonRepository = new MockAddonRepository();
    }
    return this.addonRepository;
  }
  
  /**
   * Get the mock addon bundle repository instance
   */
  static getMockAddonBundleRepository(): MockAddonBundleRepository {
    if (!this.addonBundleRepository) {
      this.addonBundleRepository = new MockAddonBundleRepository();
    }
    return this.addonBundleRepository;
  }
}