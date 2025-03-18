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
 Firebase Auth state changed: User N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2 signed in
 Auth state change: User authenticated Object
 Requesting fresh token on auth state change...
 🔵 Auth state changed: User signed in, ID: N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2
 Auth context: No role available from user object
 User authenticated, verifying Firestore collections
 Initializing Firestore collections in production mode...
 Collection harmonized_users verified in production mode
 Collection unified_yacht_experiences verified in production mode
 Collection user_profiles_tourist verified in production mode
 Collection articles_and_guides verified in production mode
 Collection event_announcements verified in production mode
 Collection notifications verified in production mode
 Collection products_add_ons verified in production mode
 Collection promotions_and_offers verified in production mode
 Collection reviews_and_feedback verified in production mode
 Collection support_content verified in production mode
 Collection user_profiles_service_provider verified in production mode
 All Firestore collections initialized successfully in production mode
firebase.ts:58 Auth token refreshed and stored in localStorage: eyJhbGciOi...wV68A
firebase.ts:62 Refreshing user claims...
use-auth.ts:63 ✅ Auth token refreshed successfully
use-auth.ts:411 Token claims received: {
  "name": "Ally Gee",
  "role": "producer",
  "iss": "https://securetoken.google.com/etoile-yachts",
  "aud": "etoile-yachts",
  "auth_time": 1742284842,
  "user_id": "N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2",
  "sub": "N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2",
  "iat": 1742284883,
  "exp": 1742288483,
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
firebase.ts:64 User claims refreshed successfully
firebase.ts:72 Setting up token refresh interval: 10 minutes
firebase.ts:94 Token refresh interval set up and stored
user-profile-utils.ts:70 Sync claims response: Object
use-auth.ts:81 ✅ Auth state change - claims synchronized successfully: Object
use-auth.ts:88 📋 Auth state change - role remained the same after sync: producer
use-auth.ts:115 ✅ Auth token stored in localStorage
use-auth.ts:120 ✅ Auth state change - setting user with final role: producer
use-auth.ts:365 Auth context using validated role: producer
/api/admin/validate-images:1 
            
            
           Failed to load resource: the server responded with a status of 401 (Unauthorized)
/api/admin/image-validation-reports:1 
            
            
           Failed to load resource: the server responded with a status of 401 (Unauthorized)
/api/admin/image-validation-reports:1 
            
            
           Failed to load resource: the server responded with a status of 401 (Unauthorized)
