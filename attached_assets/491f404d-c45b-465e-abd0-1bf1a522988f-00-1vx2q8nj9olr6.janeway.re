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
 Firebase Auth state changed: User N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2 signed in
 Auth state change: User authenticated Object
 Requesting fresh token on auth state change...
 🔵 Auth state changed: User signed in, ID: N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2
 Auth context: No role available from user object
 User authenticated, verifying Firestore collections
 Initializing Firestore collections in production mode...
 Error verifying collection event_announcements in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection user_profiles_service_provider in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection support_content in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection user_profiles_tourist in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection promotions_and_offers in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection unified_yacht_experiences in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection articles_and_guides in production mode: 
overrideMethod @ installHook.js:1
 Error fetching user data (attempt 1/3): 
overrideMethod @ installHook.js:1
 Error verifying collection reviews_and_feedback in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection products_add_ons in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection harmonized_users in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection notifications in production mode: 
overrideMethod @ installHook.js:1
 All Firestore collections initialized successfully in production mode
 Auth token refreshed and stored in localStorage: eyJhbGciOi...nyh8w
 Refreshing user claims...
 ✅ Auth token refreshed successfully
 Token claims received: {
  "name": "Ally Gee",
  "role": "producer",
  "iss": "https://securetoken.google.com/etoile-yachts",
  "aud": "etoile-yachts",
  "auth_time": 1742231130,
  "user_id": "N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2",
  "sub": "N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2",
  "iat": 1742231131,
  "exp": 1742234731,
  "email": "ally.gee@hotmail.com",
  "email_verified": true,
  "firebase": {
    "identities": {
      "email": [
        "ally.gee@hotmail.com"
      ]
    },
    "sign_in_provider": "password"
  }
}
 Raw role from token claims: producer
 Mapped user with role: producer
 📋 Auth state changed - user mapped with initial role: producer
 🔄 Always attempting to sync claims during auth state change
 Beginning auth claims synchronization...
 Current role from token: "producer"
 Sync claims response: Object
 ✅ Auth state change - claims synchronized successfully: Object
 📋 Auth state change - role remained the same after sync: producer
 ✅ Auth token stored in localStorage
 ✅ Auth state change - setting user with final role: producer
 Auth context using validated role: producer
 User claims refreshed successfully
 Setting up token refresh interval: 10 minutes
 Token refresh interval set up and stored
 Error fetching user data (attempt 2/3): 
overrideMethod @ installHook.js:1
 Error fetching user data (attempt 3/3): 
overrideMethod @ installHook.js:1
 User profile not found in Firestore. Using minimal fallback profile with role from token.
overrideMethod @ installHook.js:1
 Using role from token claims for fallback profile: "producer"
 Successfully retrieved and standardized user profile: Object
 Auth context using validated role: producer
 Verifying role before redirection: producer
 Role verification - Quick check passed for "producer"
 Role verification - Success with token role "producer"
 Role verified (producer), redirecting to appropriate dashboard
 QueryFn: Fetching data from /api/producer/yachts
 QueryFn: Endpoint requires 'producer' role
 QueryFn: Fetching data from /api/producer/bookings
 QueryFn: Endpoint requires 'producer' role
 QueryFn: Fetching data from /api/producer/reviews
 QueryFn: Endpoint requires 'producer' role
 QueryFn: User role from token: producer
 QueryFn: User role from token: producer
 QueryFn: User role from token: producer
 Error fetching producer profile: 
overrideMethod @ installHook.js:1
 Successfully obtained fresh auth token
 QueryFn: Using token: eyJhbGciOi...N7JIw
 QueryFn: Sending fetch request...
 Successfully obtained fresh auth token
 QueryFn: Using token: eyJhbGciOi...N7JIw
 QueryFn: Sending fetch request...
 Auth context using validated role: producer
 Successfully obtained fresh auth token
 QueryFn: Using token: eyJhbGciOi...N7JIw
 QueryFn: Sending fetch request...
 QueryFn: Response status: 200 OK
 QueryFn: Successfully parsed JSON response with 0 keys
 QueryFn: Array response with 0 items
 QueryFn: Response status: 200 OK
 QueryFn: Successfully parsed JSON response with 2 keys
 QueryFn: Response status: 200 OK
 QueryFn: Successfully parsed JSON response with 0 keys
 QueryFn: Array response with 0 items
 QueryFn: Fetching data from /api/producer/yachts
 QueryFn: Endpoint requires 'producer' role
 QueryFn: Fetching data from /api/producer/addons
 QueryFn: Endpoint requires 'producer' role
 QueryFn: User role from token: producer
 QueryFn: User role from token: producer
 QueryFn: Fetching data from /api/producer/yachts
 QueryFn: Endpoint requires 'producer' role
 QueryFn: Fetching data from /api/producer/addons
 QueryFn: Endpoint requires 'producer' role
 QueryFn: User role from token: producer
 QueryFn: User role from token: producer
 Successfully obtained fresh auth token
 QueryFn: Using token: eyJhbGciOi...E6R9g
 QueryFn: Sending fetch request...
 Successfully obtained fresh auth token
 QueryFn: Using token: eyJhbGciOi...E6R9g
 QueryFn: Sending fetch request...
 Refreshed token before fetching producer data
 Fetching producer data for user ID: N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2
 Successfully obtained fresh auth token
 QueryFn: Using token: eyJhbGciOi...E6R9g
 QueryFn: Sending fetch request...
 Successfully obtained fresh auth token
 QueryFn: Using token: eyJhbGciOi...E6R9g
 QueryFn: Sending fetch request...
 Error fetching producer data: 
overrideMethod @ installHook.js:1
 QueryFn: Response status: 200 OK
 QueryFn: Response status: 200 OK
 QueryFn: Successfully parsed JSON response with 2 keys
 QueryFn: Successfully parsed JSON response with 2 keys
 QueryFn: Response status: 200 OK
 QueryFn: Successfully parsed JSON response with 2 keys
 QueryFn: Response status: 200 OK
 QueryFn: Successfully parsed JSON response with 2 keys
 Status badge for yacht Yas Island Cruse - Abu Dhabi (yacht-IPwWfOoHOkgkJimhvPwABhyZ3Kn1-1742024879802):  Object computed=true, standardized=true, version=1
 Status badge for yacht Yas Marina Romantic Sunset Cruise (yacht-IPwWfOoHOkgkJimhvPwABhyZ3Kn1-1742025160910):  Object computed=true, standardized=true, version=1
 Status badge for yacht All Day Luxury Yacht - Dubai (yacht-N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2-1741988213167):  Object computed=true, standardized=true, version=1
 Status badge for yacht Abu Dhabi Sport Fishing Adventure (yacht-N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2-1742114968912):  Object computed=true, standardized=true, version=1
 Status badge for yacht Abu Dhabi Wreck Diving Expedition (yacht-N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2-1742114969137):  Object computed=true, standardized=true, version=1
 Status badge for yacht Dubai Dinner for International Women's Day (yacht-N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2-1742228076894):  Object computed=true, standardized=true, version=1
AssetManagement.tsx:1210 Status badge for yacht Pearl of Yas (YAC_YAS_001):  Object computed=false, standardized=true, version=1
YachtForm.tsx:189 Fetching producer data for user ID: N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2
YachtForm.tsx:244 Searching for yacht ID yacht-IPwWfOoHOkgkJimhvPwABhyZ3Kn1-1742024879802 in unified_yacht_experiences collection...
hook.js:608 Error fetching producer data: FirebaseError: Missing or insufficient permissions.
overrideMethod @ hook.js:608
hook.js:608 Error fetching yacht details: FirebaseError: Missing or insufficient permissions.
overrideMethod @ hook.js:608
use-auth.ts:365 Auth context using validated role: producer
use-geolocation.ts:37 Got coordinates: Object
reverseGeocode.ts:26 Calling reverse geocode proxy with coordinates: Object
use-geolocation.ts:37 Got coordinates: Object
reverseGeocode.ts:26 Calling reverse geocode proxy with coordinates: Object
reverseGeocode.ts:39 Successfully retrieved address: F9M5+72H - Al Hisn - W3 - Abu Dhabi - United Arab Emirates
use-geolocation.ts:62 Reverse geocode result: Object
use-auth.ts:365 Auth context using validated role: producer
reverseGeocode.ts:39 Successfully retrieved address: F9M5+72H - Al Hisn - W3 - Abu Dhabi - United Arab Emirates
use-geolocation.ts:62 Reverse geocode result: Object
use-auth.ts:365 Auth context using validated role: producer
use-auth.ts:365 Auth context using validated role: producer
use-auth.ts:365 Auth context using validated role: producer
use-auth.ts:365 Auth context using validated role: producer
queryClient.ts:262 QueryFn: Fetching data from /api/producer/available-addons
queryClient.ts:277 QueryFn: Endpoint requires 'producer' role
queryClient.ts:280 QueryFn: User role from token: producer
queryClient.ts:58 Successfully obtained fresh auth token
queryClient.ts:318 QueryFn: Using token: eyJhbGciOi...NUvag
queryClient.ts:325 QueryFn: Sending fetch request...
queryClient.ts:333 QueryFn: Response status: 200 OK
queryClient.ts:428 QueryFn: Successfully parsed JSON response with 2 keys
use-geolocation.ts:37 Got coordinates: Object
reverseGeocode.ts:26 Calling reverse geocode proxy with coordinates: Object
reverseGeocode.ts:39 Successfully retrieved address: F9M5+72H - Al Hisn - W3 - Abu Dhabi - United Arab Emirates
use-geolocation.ts:62 Reverse geocode result: Object
use-auth.ts:365 Auth context using validated role: producer
use-auth.ts:365 Auth context using validated role: producer
