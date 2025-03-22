/**
 * Booking Payment Info
 * 
 * Contains information needed to process a payment for a booking.
 */

export interface BookingPaymentInfo {
  /**
   * Amount to charge
   */
  amount: number;
  
  /**
   * Currency code (e.g., 'usd', 'aed')
   */
  currency: string;
  
  /**
   * Metadata about the booking
   */
  metadata: {
    /**
     * Booking ID
     */
    bookingId: string;
    
    /**
     * Customer ID
     */
    customerId: string;
    
    /**
     * ID of the yacht or package being booked
     */
    yachtId?: string;
    packageId?: string;
    
    /**
     * Any additional metadata
     */
    [key: string]: string | undefined;
  };
  
  /**
   * Optional description for the payment
   */
  description?: string;
}