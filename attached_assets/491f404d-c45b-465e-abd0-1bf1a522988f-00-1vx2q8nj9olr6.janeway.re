 Removing unpermitted intrinsics
 [vite] connecting...
 [vite] connected.
 Firebase initialized in PRODUCTION mode
 Setting up auth state listener for Firebase...
 Using PRODUCTION Firebase services - skipping emulator connection
 Using production Firebase services - emulator connection disabled
 Using production Firebase services - emulator connection disabled
 Auth context: No role available from user object
 Initializing Firestore collections in production mode...
 Skipping collection verification during initialization (will verify after authentication)
 Firebase Auth state changed: User signed out
 Auth state change: User signed out
 Auth token removed from localStorage
 🔵 Auth state change: User signed out
 ✅ Auth token removed from localStorage
 Auth context: No role available from user object
 QueryFn: Fetching data from /api/yachts/featured
 No current user in auth - cannot get fresh token
 QueryFn: No authorization header available
overrideMethod @ installHook.js:1
 QueryFn: Sending fetch request...
 QueryFn: Response status: 200 OK
 QueryFn: Successfully parsed JSON response with 6 keys
 QueryFn: Array response with 6 items
/login:1 [DOM] Input elements should have autocomplete attributes (suggested: "current-password"): (More info: https://goo.gl/9p2vKq) 
 Firebase Auth state changed: User p3wafU2xFnNZugiepyC6OOgw3fE2 signed in
 Auth state change: User authenticated Object
 Requesting fresh token on auth state change...
 🔵 Auth state changed: User signed in, ID: p3wafU2xFnNZugiepyC6OOgw3fE2
 Auth context: No role available from user object
 User authenticated, verifying Firestore collections
 Initializing Firestore collections in production mode...
 Error verifying collection notifications in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection user_profiles_service_provider in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection user_profiles_tourist in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection promotions_and_offers in production mode: 
overrideMethod @ installHook.js:1
 Error fetching user data (attempt 1/3): 
overrideMethod @ installHook.js:1
 Error verifying collection unified_yacht_experiences in production mode: 
overrideMethod @ installHook.js:1
 ✅ Auth token refreshed successfully
 Token claims received: {
  "name": "Lisa Webb",
  "role": "partner",
  "iss": "https://securetoken.google.com/etoile-yachts",
  "aud": "etoile-yachts",
  "auth_time": 1742196480,
  "user_id": "p3wafU2xFnNZugiepyC6OOgw3fE2",
  "sub": "p3wafU2xFnNZugiepyC6OOgw3fE2",
  "iat": 1742196481,
  "exp": 1742200081,
  "email": "lisa.webb@hotmail.com",
  "email_verified": true,
  "firebase": {
    "identities": {
      "email": [
        "lisa.webb@hotmail.com"
      ]
    },
    "sign_in_provider": "password"
  }
}
 Raw role from token claims: partner
 Mapped user with role: partner
 📋 Auth state changed - user mapped with initial role: partner
 🔄 Always attempting to sync claims during auth state change
 Auth token refreshed and stored in localStorage: eyJhbGciOi...64XLg
 Refreshing user claims...
 Beginning auth claims synchronization...
 Current role from token: "partner"
 Error verifying collection event_announcements in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection products_add_ons in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection harmonized_users in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection articles_and_guides in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection support_content in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection reviews_and_feedback in production mode: 
overrideMethod @ installHook.js:1
 All Firestore collections initialized successfully in production mode
 User claims refreshed successfully
 Setting up token refresh interval: 10 minutes
 Token refresh interval set up and stored
 Error fetching user data (attempt 2/3): 
overrideMethod @ installHook.js:1
 Sync claims response: Object
 ✅ Auth state change - claims synchronized successfully: Object
 📋 Auth state change - role remained the same after sync: partner
 ✅ Auth token stored in localStorage
 ✅ Auth state change - setting user with final role: partner
 Auth context using validated role: partner
 Error fetching user data (attempt 3/3): 
overrideMethod @ installHook.js:1
 User profile not found in Firestore. Using minimal fallback profile.
overrideMethod @ installHook.js:1
 Successfully retrieved and standardized user profile: Object
use-auth.ts:365 Auth context using validated role: partner
Login.tsx:123 Verifying role before redirection: consumer
role-verification.ts:64 Role verification - Quick check passed for "consumer"
role-verification.ts:101 Role verification - Token role "partner" doesn't match claimed role "consumer"
Login.tsx:128 Role verified (consumer), redirecting to appropriate dashboard
Consumer.tsx:110 === Fetching User Bookings via API ===
Consumer.tsx:143 === Fetching Recommended Yachts via API ===
use-auth.ts:365 Auth context using validated role: partner
Consumer.tsx:152 API response: Array(6)
Consumer.tsx:167 Transformed recommended packages: Array(6)
Consumer.tsx:122 API bookings response: Object
use-geolocation.ts:37 Got coordinates: Object
reverseGeocode.ts:26 Calling reverse geocode proxy with coordinates: Object
reverseGeocode.ts:39 Successfully retrieved address: F9M5+72H - Al Hisn - W3 - Abu Dhabi - United Arab Emirates
use-geolocation.ts:62 Reverse geocode result: Object
use-auth.ts:365 Auth context using validated role: partner
use-auth.ts:365 Auth context using validated role: partner
Consumer.tsx:110 === Fetching User Bookings via API ===
Consumer.tsx:143 === Fetching Recommended Yachts via API ===
Consumer.tsx:152 API response: Array(6)
Consumer.tsx:167 Transformed recommended packages: Array(6)
Consumer.tsx:122 API bookings response: Object
