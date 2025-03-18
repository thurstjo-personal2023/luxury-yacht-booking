 Removing unpermitted intrinsics
 [vite] connecting...
 Firebase initialized in PRODUCTION mode
 Setting up auth state listener for Firebase...
 Using PRODUCTION Firebase services - skipping emulator connection
 Using production Firebase services - emulator connection disabled
 Using production Firebase services - emulator connection disabled
 Auth context: No role available from user object
 Initializing Firestore collections in production mode...
 Skipping collection verification during initialization (will verify after authentication)
 [vite] connected.
 Firebase Auth state changed: User N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2 signed in
 Auth state change: User authenticated Object
 Requesting fresh token on auth state change...
 🔵 Auth state changed: User signed in, ID: N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2
 Auth context: No role available from user object
 ✅ Auth token refreshed successfully
 Token claims received: {
  "name": "Ally Gee",
  "role": "producer",
  "iss": "https://securetoken.google.com/etoile-yachts",
  "aud": "etoile-yachts",
  "auth_time": 1742303585,
  "user_id": "N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2",
  "sub": "N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2",
  "iat": 1742303606,
  "exp": 1742307206,
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
 Auth token refreshed and stored in localStorage: eyJhbGciOi...21VGw
 Refreshing user claims...
 Beginning auth claims synchronization...
 Current role from token: "producer"
 User authenticated, verifying Firestore collections
 Initializing Firestore collections in production mode...
 User claims refreshed successfully
 Setting up token refresh interval: 10 minutes
firebase.ts:94 Token refresh interval set up and stored
firestore-init.ts:60 Collection harmonized_users verified in production mode
firestore-init.ts:60 Collection unified_yacht_experiences verified in production mode
firestore-init.ts:60 Collection user_profiles_tourist verified in production mode
firestore-init.ts:60 Collection articles_and_guides verified in production mode
firestore-init.ts:60 Collection event_announcements verified in production mode
firestore-init.ts:60 Collection notifications verified in production mode
firestore-init.ts:60 Collection products_add_ons verified in production mode
firestore-init.ts:60 Collection promotions_and_offers verified in production mode
firestore-init.ts:60 Collection reviews_and_feedback verified in production mode
firestore-init.ts:60 Collection support_content verified in production mode
firestore-init.ts:60 Collection user_profiles_service_provider verified in production mode
firestore-init.ts:83 All Firestore collections initialized successfully in production mode
user-profile-utils.ts:70 Sync claims response: Object
use-auth.ts:81 ✅ Auth state change - claims synchronized successfully: Object
use-auth.ts:88 📋 Auth state change - role remained the same after sync: producer
use-auth.ts:115 ✅ Auth token stored in localStorage
use-auth.ts:120 ✅ Auth state change - setting user with final role: producer
use-auth.ts:365 Auth context using validated role: producer
/api/admin/resolve-blob-urls:1 
            
            
           Failed to load resource: the server responded with a status of 500 (Internal Server Error)
/api/admin/resolve-blob-urls:1 
            
            
           Failed to load resource: the server responded with a status of 500 (Internal Server Error)
use-auth.ts:365 Auth context using validated role: producer
use-auth.ts:365 Auth context using validated role: producer
