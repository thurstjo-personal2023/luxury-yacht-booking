 Removing unpermitted intrinsics
 [vite] connecting...
 [vite] connected.
 Firebase initialized in PRODUCTION mode
 Setting up auth state listener for Firebase...
 Using PRODUCTION Firebase services - skipping emulator connection
 Using production Firebase services - emulator connection disabled
 Using production Firebase services - emulator connection disabled
 Initializing Firestore collections in production mode...
 Firebase Auth state changed: User signed out
 Auth state change: User signed out
 Auth token removed from localStorage
 Error verifying collection harmonized_users in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection reviews_and_feedback in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection promotions_and_offers in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection products_add_ons in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection user_profiles_tourist in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection unified_yacht_experiences in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection articles_and_guides in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection user_profiles_service_provider in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection event_announcements in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection notifications in production mode: 
overrideMethod @ installHook.js:1
 Error verifying collection support_content in production mode: 
overrideMethod @ installHook.js:1
 All Firestore collections initialized successfully in production mode
 QueryFn: Fetching data from /api/yachts/featured
 No current user in auth - cannot get fresh token
 QueryFn: No authorization header available
overrideMethod @ installHook.js:1
 QueryFn: Sending fetch request...
 QueryFn: Response status: 200 OK
 QueryFn: Successfully parsed JSON response with 3 keys
 QueryFn: Array response with 3 items
/register:1 [DOM] Input elements should have autocomplete attributes (suggested: "current-password"): (More info: https://goo.gl/9p2vKq) 
firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects%2Fetoile-yachts%2Fdatabases%2F(default)&gsessionid=QLRqZqfzw8_w0edyTgoW9UCv6X4f-k8QDX1-CO5wZNQ&SID=09UC4MSDks4aB1KtLE2y2Q&RID=57683&TYPE=terminate&zx=zcoswrutfhf:1  Failed to load resource: the server responded with a status of 400 ()
/register:1 Uncaught (in promise) 
 Registering user with Firebase Auth and creating profile in Production Firestore...
 Registering user with Firebase Auth directly
 Firebase Auth state changed: User msUxc5lUlDYd0OBnO4ax6a97dHu2 signed in
 Auth state change: User authenticated Object
 Requesting fresh token on auth state change...
 User created successfully in Firebase Auth
 Auth token refreshed and stored in localStorage: eyJhbGciOi...Cb7tA
 Refreshing user claims...
 User profile display name updated
 User claims refreshed successfully
 Setting up token refresh interval: 10 minutes
 Token refresh interval set up and stored
 Fresh auth token obtained and stored
 Creating user profile in Firestore via API
/api/user/msUxc5lUlDYd0OBnO4ax6a97dHu2/profile:1  Failed to load resource: the server responded with a status of 404 (Not Found)
 Error fetching user profile: Object
overrideMethod @ installHook.js:1
 User exists in Auth but profile data not found in Firestore
overrideMethod @ installHook.js:1
 User profile created successfully in Firestore
 Successfully updated profile details
 Sending welcome email...
/api/email/welcome:1  Failed to load resource: the server responded with a status of 401 (Unauthorized)
 Error sending welcome email: AxiosError
overrideMethod @ installHook.js:1
 Could not send welcome email, but registration was successful: AxiosError
overrideMethod @ installHook.js:1
Consumer.tsx:107 === Fetching Recommended Yachts via API ===
Consumer.tsx:116 API response: Array(3)
Consumer.tsx:131 Transformed recommended packages: Array(3)
use-geolocation.ts:37 Got coordinates: Object
reverseGeocode.ts:26 Calling reverse geocode proxy with coordinates: Object
reverseGeocode.ts:39 Successfully retrieved address: F9M5+72H - Al Hisn - W3 - Abu Dhabi - United Arab Emirates
use-geolocation.ts:62 Reverse geocode result: Object
hook.js:608 Error fetching yacht details: FirebaseError: Missing or insufficient permissions.
overrideMethod @ hook.js:608
Consumer.tsx:107 === Fetching Recommended Yachts via API ===
use-geolocation.ts:37 Got coordinates: Object
reverseGeocode.ts:26 Calling reverse geocode proxy with coordinates: Object
reverseGeocode.ts:39 Successfully retrieved address: F9M5+72H - Al Hisn - W3 - Abu Dhabi - United Arab Emirates
use-geolocation.ts:62 Reverse geocode result: Object
Consumer.tsx:116 API response: Array(3)
Consumer.tsx:131 Transformed recommended packages: Array(3)
Consumer.tsx:107 === Fetching Recommended Yachts via API ===
Consumer.tsx:116 API response: Array(3)
Consumer.tsx:131 Transformed recommended packages: Array(3)
hook.js:608 Error fetching yacht details: FirebaseError: Missing or insufficient permissions.
overrideMethod @ hook.js:608
