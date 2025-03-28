# Consumer Dashboard Navigation Test Checklist

This document provides a checklist for validating the navigation behavior in the Consumer Dashboard, particularly focusing on tab state persistence during the booking flow.

## 1. Complete Booking Flow Test

### Initial Navigation and Search
- [ ] Navigate to home page
- [ ] Search for a yacht (e.g., by location "Dubai")
- [ ] Verify search results appear correctly

### Yacht Selection and Booking Initiation
- [ ] Click on a yacht from search results
- [ ] Verify yacht details page loads correctly
- [ ] Select date and time slot
- [ ] Click "Book Now" button
- [ ] Verify redirect to booking summary page
- [ ] Check browser console: `sessionStorage.getItem('returnToTab')` should have a value

### Booking Summary and Payment Initiation
- [ ] Review booking details on summary page
- [ ] Add any add-ons if available
- [ ] Click "Proceed to Payment" button
- [ ] Verify redirect to payment page
- [ ] Check browser console: `sessionStorage.getItem('returnToTab')` should still have the same value

### Payment Completion
- [ ] Enter payment details
- [ ] Submit payment
- [ ] Verify payment confirmation page appears
- [ ] Confirm "Return to Dashboard" button exists
- [ ] Check browser console: `sessionStorage.getItem('returnToTab')` should be set to "bookings"

### Return to Dashboard
- [ ] Click "Return to Dashboard" button
- [ ] Verify redirect to dashboard with correct tab active (bookings tab)
- [ ] Verify the new booking appears in the bookings list

## 2. Tab-Specific Navigation Tests

### Favorites Tab Navigation
- [ ] Go to dashboard and click on "Favorites" tab
- [ ] Check URL contains `?tab=favorites`
- [ ] Navigate to yacht details from favorites
- [ ] Complete booking flow as above
- [ ] After payment, verify return to dashboard with "Favorites" tab active

### Profile Tab Navigation
- [ ] Go to dashboard and click on "Profile" tab
- [ ] Check URL contains `?tab=profile`
- [ ] Navigate to home page
- [ ] Complete booking flow as above
- [ ] After payment, verify return to dashboard preserves "Profile" tab selection

## 3. Edge Cases and Error Recovery

### Cancellation Flow
- [ ] Start booking process up to payment page
- [ ] Cancel payment
- [ ] Verify return to booking summary with tab state preserved
- [ ] Navigate back to dashboard manually
- [ ] Verify correct tab is active based on sessionStorage

### Page Refresh Handling
- [ ] Start booking process
- [ ] At booking summary page, refresh the browser
- [ ] Verify booking data and tab state are preserved
- [ ] Continue booking process
- [ ] Verify the entire flow completes successfully

### Authentication Handling
- [ ] Start booking process
- [ ] In another tab, log out
- [ ] Continue booking process
- [ ] Verify proper re-authentication flow
- [ ] Verify tab state persists after re-authentication
- [ ] Complete booking flow
- [ ] Verify return to dashboard with correct tab

## 4. Browser Navigation Testing

### Back Button Behavior
- [ ] Complete booking flow up to payment page
- [ ] Use browser back button
- [ ] Verify correct navigation to booking summary page
- [ ] Check tab state is preserved

### Direct URL Entry
- [ ] Manually enter dashboard URL with tab parameter (e.g., `/dashboard/consumer?tab=bookings`)
- [ ] Verify correct tab is activated
- [ ] Navigate through the booking flow
- [ ] Verify return to the correct tab

## Notes

- To check sessionStorage values, open browser console and type: `sessionStorage.getItem('returnToTab')`
- During testing, clear browser cache/cookies between different test scenarios for consistent results
- Document any unexpected behavior as issues