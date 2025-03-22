/**
 * Payment Status for CJS Tests
 * 
 * CommonJS version of the payment status enum to use in our tests.
 */

const PaymentStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  
  // Helper method to convert from Stripe status
  fromStripeStatus: function(stripeStatus) {
    const statusMap = {
      'requires_payment_method': this.PENDING,
      'requires_confirmation': this.PENDING,
      'requires_action': this.PENDING,
      'processing': this.PROCESSING,
      'succeeded': this.PAID,
      'canceled': this.FAILED,
      'requires_capture': this.PROCESSING
    };
    
    return statusMap[stripeStatus] || this.PENDING;
  }
};

function isValidPaymentStatus(status) {
  return Object.values(PaymentStatus).includes(status) && 
         typeof status === 'string' &&
         status !== '';
}

module.exports = {
  PaymentStatus,
  isValidPaymentStatus
};