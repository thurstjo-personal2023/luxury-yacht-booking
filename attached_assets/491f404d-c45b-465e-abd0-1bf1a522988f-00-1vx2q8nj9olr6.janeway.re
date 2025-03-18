 Removing unpermitted intrinsics
 [vite] connecting...
 [vite] connected.
 Firebase initialized in PRODUCTION mode
firebase.ts:35 Setting up auth state listener for Firebase...
firebase.ts:132 Using PRODUCTION Firebase services - skipping emulator connection
firebase.ts:363 Using production Firebase services - emulator connection disabled
firestore-init.ts:31 Using production Firebase services - emulator connection disabled
use-auth.ts:370 Auth context: No role available from user object
firestore-init.ts:71 Initializing Firestore collections in production mode...
firestore-init.ts:75 Skipping collection verification during initialization (will verify after authentication)
firebase.ts:38 Firebase Auth state changed: User N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2 signed in
firebase.ts:42 Auth state change: User authenticated Object
firebase.ts:50 Requesting fresh token on auth state change...
use-auth.ts:58 🔵 Auth state changed: User signed in, ID: N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2
use-auth.ts:370 Auth context: No role available from user object
App.tsx:93 User authenticated, verifying Firestore collections
firestore-init.ts:71 Initializing Firestore collections in production mode...
firebase.ts:58 Auth token refreshed and stored in localStorage: eyJhbGciOi...HsnbA
firebase.ts:62 Refreshing user claims...
use-auth.ts:63 ✅ Auth token refreshed successfully
use-auth.ts:411 Token claims received: {
  "name": "Ally Gee",
  "role": "producer",
  "iss": "https://securetoken.google.com/etoile-yachts",
  "aud": "etoile-yachts",
  "auth_time": 1742294944,
  "user_id": "N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2",
  "sub": "N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2",
  "iat": 1742295021,
  "exp": 1742298621,
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
use-auth.ts:417 Raw role from token claims: producer
use-auth.ts:440 Mapped user with role: producer
use-auth.ts:70 📋 Auth state changed - user mapped with initial role: producer
use-auth.ts:73 🔄 Always attempting to sync claims during auth state change
user-profile-utils.ts:40 Beginning auth claims synchronization...
user-profile-utils.ts:46 Current role from token: "producer"
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
firebase.ts:64 User claims refreshed successfully
firebase.ts:72 Setting up token refresh interval: 10 minutes
firebase.ts:94 Token refresh interval set up and stored
user-profile-utils.ts:70 Sync claims response: Object
use-auth.ts:81 ✅ Auth state change - claims synchronized successfully: Object
use-auth.ts:88 📋 Auth state change - role remained the same after sync: producer
use-auth.ts:115 ✅ Auth token stored in localStorage
use-auth.ts:120 ✅ Auth state change - setting user with final role: producer
use-auth.ts:365 Auth context using validated role: producer
use-auth.ts:365 Auth context using validated role: producer
use-auth.ts:365 Auth context using validated role: producer
use-auth.ts:365 Auth context using validated role: producer
use-auth.ts:365 Auth context using validated role: producer
use-auth.ts:365 Auth context using validated role: producer
use-auth.ts:365 Auth context using validated role: producer
use-auth.ts:365 Auth context using validated role: producer
use-auth.ts:365 Auth context using validated role: producer
use-auth.ts:365 Auth context using validated role: producer
use-auth.ts:365 Auth context using validated role: producer
/api/admin/resolve-blob-urls:1 
            
            
           Failed to load resource: the server responded with a status of 500 (Internal Server Error)
/api/admin/resolve-blob-urls:1 
            
            
           Failed to load resource: the server responded with a status of 500 (Internal Server Error)
use-auth.ts:365 Auth context using validated role: producer
use-auth.ts:365 Auth context using validated role: producer
