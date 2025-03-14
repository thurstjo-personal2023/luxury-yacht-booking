 Removing unpermitted intrinsics
 [vite] connecting...
 [vite] connected.
 Firebase initialized in PRODUCTION mode
 Setting up auth state listener for Firebase...
 Using PRODUCTION Firebase services - skipping emulator connection
 Using production Firebase services - emulator connection disabled
 Connected to external Firestore emulator on port 8080
 Initializing Firestore collections in emulator...
 Firebase Auth state changed: User TYDN6V22mmMKAS4yDUj8QVW8pPp1 signed in
 Auth state change: User authenticated Object
 Requesting fresh token on auth state change...
127.0.0.1:8080/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects%2Fetoile-yachts%2Fdatabases%2F(default)&RID=15099&CVER=22&X-HTTP-Session-Id=gsessionid&zx=fdoota7u4vn7&t=1:1  Failed to load resource: net::ERR_CONNECTION_REFUSED
 [2025-03-14T15:56:38.141Z]  @firebase/firestore: Firestore (11.3.1): WebChannelConnection RPC 'Listen' stream 0x7b248b0f transport errored: jd
overrideMethod @ installHook.js:1
 [2025-03-14T15:56:38.145Z]  @firebase/firestore: Firestore (11.3.1): Could not reach Cloud Firestore backend. Connection failed 1 times. Most recent error: FirebaseError: [code=unavailable]: The operation could not be completed
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.
overrideMethod @ installHook.js:1
 Collection harmonized_users verified in emulator
 Collection unified_yacht_experiences verified in emulator
 Collection user_profiles_tourist verified in emulator
 Collection articles_and_guides verified in emulator
 Collection event_announcements verified in emulator
 Collection notifications verified in emulator
firestore-init.ts:54 Collection products_add_ons verified in emulator
firestore-init.ts:54 Collection promotions_and_offers verified in emulator
firestore-init.ts:54 Collection reviews_and_feedback verified in emulator
firestore-init.ts:54 Collection support_content verified in emulator
firestore-init.ts:54 Collection user_profiles_service_provider verified in emulator
firestore-init.ts:71 All Firestore collections initialized successfully in emulator
firebase.ts:58 Auth token refreshed and stored in localStorage: eyJhbGciOi...GTqjw
firebase.ts:62 Refreshing user claims...
firebase.ts:64 User claims refreshed successfully
firebase.ts:72 Setting up token refresh interval: 10 minutes
firebase.ts:94 Token refresh interval set up and stored
YachtForm.tsx:185 Fetching producer data for user ID: TYDN6V22mmMKAS4yDUj8QVW8pPp1
127.0.0.1:8080/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects%2Fetoile-yachts%2Fdatabases%2F(default)&RID=66329&CVER=22&X-HTTP-Session-Id=gsessionid&zx=rixyiwi9xkqw&t=1:1 
            
            
           Failed to load resource: net::ERR_CONNECTION_REFUSED
hook.js:608 [2025-03-14T15:56:56.580Z]  @firebase/firestore: Firestore (11.3.1): WebChannelConnection RPC 'Listen' stream 0x7b248b11 transport errored: jd
overrideMethod @ hook.js:608
hook.js:608 No user found in harmonized_users with ID: TYDN6V22mmMKAS4yDUj8QVW8pPp1
overrideMethod @ hook.js:608
use-geolocation.ts:37 Got coordinates: Object
reverseGeocode.ts:26 Calling reverse geocode proxy with coordinates: Object
reverseGeocode.ts:39 Successfully retrieved address: F9M5+72H - Al Hisn - W3 - Abu Dhabi - United Arab Emirates
use-geolocation.ts:62 Reverse geocode result: Object
new-yacht:1 Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/v0/b/etoile-yachts.appspot.com/o?name=yacht_media%2FTYDN6V22mmMKAS4yDUj8QVW8pPp1%2F1741967977035_luxury-yachts-in-the-harbour-of-monaco-SBI-350754027-preview.jpg' from origin 'https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: It does not have HTTP ok status.
firebasestorage.googleapis.com/v0/b/etoile-yachts.appspot.com/o?name=yacht_media%2FTYDN6V22mmMKAS4yDUj8QVW8pPp1%2F1741967977035_luxury-yachts-in-the-harbour-of-monaco-SBI-350754027-preview.jpg:1 
            
            
           Failed to load resource: net::ERR_FAILED
new-yacht:1 Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/v0/b/etoile-yachts.appspot.com/o?name=yacht_media%2FTYDN6V22mmMKAS4yDUj8QVW8pPp1%2F1741967977035_luxury-yachts-in-the-harbour-of-monaco-SBI-350754027-preview.jpg' from origin 'https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: It does not have HTTP ok status.
firebasestorage.googleapis.com/v0/b/etoile-yachts.appspot.com/o?name=yacht_media%2FTYDN6V22mmMKAS4yDUj8QVW8pPp1%2F1741967977035_luxury-yachts-in-the-harbour-of-monaco-SBI-350754027-preview.jpg:1 
            
            
           Failed to load resource: net::ERR_FAILED
new-yacht:1 Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/v0/b/etoile-yachts.appspot.com/o?name=yacht_media%2FTYDN6V22mmMKAS4yDUj8QVW8pPp1%2F1741967977035_luxury-yachts-in-the-harbour-of-monaco-SBI-350754027-preview.jpg' from origin 'https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: It does not have HTTP ok status.
firebasestorage.googleapis.com/v0/b/etoile-yachts.appspot.com/o?name=yacht_media%2FTYDN6V22mmMKAS4yDUj8QVW8pPp1%2F1741967977035_luxury-yachts-in-the-harbour-of-monaco-SBI-350754027-preview.jpg:1 
            
            
           Failed to load resource: net::ERR_FAILED
new-yacht:1 Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/v0/b/etoile-yachts.appspot.com/o?name=yacht_media%2FTYDN6V22mmMKAS4yDUj8QVW8pPp1%2F1741967977035_luxury-yachts-in-the-harbour-of-monaco-SBI-350754027-preview.jpg' from origin 'https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: It does not have HTTP ok status.
firebasestorage.googleapis.com/v0/b/etoile-yachts.appspot.com/o?name=yacht_media%2FTYDN6V22mmMKAS4yDUj8QVW8pPp1%2F1741967977035_luxury-yachts-in-the-harbour-of-monaco-SBI-350754027-preview.jpg:1 
            
            
           Failed to load resource: net::ERR_FAILED

                
          
          
          
         Chrome is moving towards a new experience that allows users to choose to browse without third-party cookies.
new-yacht:1 Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/v0/b/etoile-yachts.appspot.com/o?name=yacht_media%2FTYDN6V22mmMKAS4yDUj8QVW8pPp1%2F1741967977035_luxury-yachts-in-the-harbour-of-monaco-SBI-350754027-preview.jpg' from origin 'https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: It does not have HTTP ok status.
firebase_storage.js?v=44d9b7a9:1491 
            
            
           POST https://firebasestorage.googleapis.com/v0/b/etoile-yachts.appspot.com/o?name=yacht_media%2FTYDN6V22mmMKAS4yDUj8QVW8pPp1%2F1741967977035_luxury-yachts-in-the-harbour-of-monaco-SBI-350754027-preview.jpg net::ERR_FAILED
send @ firebase_storage.js?v=44d9b7a9:1491
doTheRequest @ firebase_storage.js?v=44d9b7a9:452
(anonymous) @ firebase_storage.js?v=44d9b7a9:276
