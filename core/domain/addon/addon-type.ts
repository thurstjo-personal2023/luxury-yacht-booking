/**
 * Add-on Type Enum
 * 
 * This enum represents the different types of add-ons that can be associated with
 * yacht experiences. Each add-on type has its own characteristics and handling.
 */

/**
 * Enum representing the types of add-ons available in the system
 */
export enum AddonType {
  /**
   * Service add-ons represent activities or services provided by partners
   * Examples: guided tours, photography sessions, massage services, etc.
   */
  SERVICE = 'service',
  
  /**
   * Product add-ons represent physical items or goods that can be purchased
   * Examples: food packages, beverage packages, souvenirs, etc.
   */
  PRODUCT = 'product',
  
  /**
   * Experience add-ons represent additional experiences that can be included
   * Examples: sunset cruise extensions, diving experiences, etc.
   */
  EXPERIENCE = 'experience'
}

/**
 * Check if a string value is a valid AddonType
 * @param value The string value to check
 * @returns True if the value is a valid AddonType, false otherwise
 */
export function isValidAddonType(value: string): value is AddonType {
  return Object.values(AddonType).includes(value as AddonType);
}

/**
 * Get the default AddonType
 * @returns The default AddonType (SERVICE)
 */
export function getDefaultAddonType(): AddonType {
  return AddonType.SERVICE;
}