/**
 * Add-on Category Value Object
 * 
 * This value object represents the category of an add-on, which helps with
 * classification and filtering. Categories are immutable once created.
 */

/**
 * Pre-defined categories for add-ons
 * These categories help organize and filter add-ons by type
 */
export enum StandardAddonCategory {
  FOOD_BEVERAGE = 'Food & Beverage',
  ENTERTAINMENT = 'Entertainment',
  TRANSPORTATION = 'Transportation',
  WELLNESS = 'Wellness',
  ACTIVITIES = 'Activities',
  PHOTOGRAPHY = 'Photography',
  DECORATION = 'Decoration',
  EQUIPMENT = 'Equipment',
  TOUR = 'Tour',
  OTHER = 'Other'
}

/**
 * Check if a category string is a standard category
 * @param category The category string to check
 * @returns True if the category is a standard category, false otherwise
 */
export function isStandardCategory(category: string): boolean {
  return Object.values(StandardAddonCategory).includes(category as StandardAddonCategory);
}

/**
 * AddonCategory value object
 * Represents a category of add-ons
 */
export class AddonCategory {
  private readonly _value: string;
  
  /**
   * Create a new AddonCategory
   * @param value The category value
   */
  constructor(value: string) {
    // Validate and normalize the category value
    this._value = this.normalizeCategory(value);
  }
  
  /**
   * Get the category value
   */
  get value(): string {
    return this._value;
  }
  
  /**
   * Check if this category is a standard category
   */
  get isStandard(): boolean {
    return isStandardCategory(this._value);
  }
  
  /**
   * Normalize a category string
   * @param category The category string to normalize
   * @returns The normalized category string
   */
  private normalizeCategory(category: string): string {
    if (!category || typeof category !== 'string') {
      return StandardAddonCategory.OTHER;
    }
    
    // Trim whitespace and ensure consistent capitalization
    const trimmed = category.trim();
    
    // If it's a standard category but with different casing, use the standard one
    const standardCategory = Object.values(StandardAddonCategory).find(
      std => std.toLowerCase() === trimmed.toLowerCase()
    );
    
    return standardCategory || trimmed;
  }
  
  /**
   * Check if this category equals another category
   * @param other The other category to compare
   * @returns True if the categories are equal, false otherwise
   */
  equals(other: AddonCategory): boolean {
    return this._value.toLowerCase() === other.value.toLowerCase();
  }
  
  /**
   * Convert the category to string
   * @returns The string representation of the category
   */
  toString(): string {
    return this._value;
  }
}