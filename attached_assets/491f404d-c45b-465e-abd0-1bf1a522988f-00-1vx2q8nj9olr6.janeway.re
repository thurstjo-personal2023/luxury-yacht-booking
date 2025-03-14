 Removing unpermitted intrinsics
 [vite] connecting...
 [vite] connected.
 Firebase initialized in PRODUCTION mode
 Setting up auth state listener for Firebase...
 Using PRODUCTION Firebase services - skipping emulator connection
 Using production Firebase services - emulator connection disabled
 Connected to external Firestore emulator on port 8080
 Initializing Firestore collections in emulator...
 QueryFn: Fetching data from /api/yachts/featured
 No current user in auth - cannot get fresh token
 QueryFn: Using token: eyJhbGciOi...pbgwg
 QueryFn: Sending fetch request...
 QueryFn: Response status: 200 OK
 QueryFn: Successfully parsed JSON response with 0 keys
 QueryFn: Array response with 0 items
 Firebase Auth state changed: User uQ2jZ2dK5KOCkLbZ0xpZCQiF96M2 signed in
 Auth state change: User authenticated Object
 Requesting fresh token on auth state change...
127.0.0.1:8080/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects%2Fetoile-yachts%2Fdatabases%2F(default)&RID=52640&CVER=22&X-HTTP-Session-Id=gsessionid&zx=nrtu1r2qdhfq&t=1:1  Failed to load resource: net::ERR_CONNECTION_REFUSED
 [2025-03-14T12:18:50.391Z]  @firebase/firestore: Firestore (11.3.1): WebChannelConnection RPC 'Listen' stream 0x49729f94 transport errored: jd
overrideMethod @ installHook.js:1
 [2025-03-14T12:18:50.395Z]  @firebase/firestore: Firestore (11.3.1): Could not reach Cloud Firestore backend. Connection failed 1 times. Most recent error: FirebaseError: [code=unavailable]: The operation could not be completed
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.
overrideMethod @ installHook.js:1
 Collection harmonized_users verified in emulator
 Collection unified_yacht_experiences verified in emulator
 Collection user_profiles_tourist verified in emulator
 Collection articles_and_guides verified in emulator
 Collection event_announcements verified in emulator
 Collection notifications verified in emulator
 Collection products_add_ons verified in emulator
 Collection promotions_and_offers verified in emulator
 Collection reviews_and_feedback verified in emulator
 Collection support_content verified in emulator
 Collection user_profiles_service_provider verified in emulator
 All Firestore collections initialized successfully in emulator
 Auth token refreshed and stored in localStorage: eyJhbGciOi...RYDLg
 Refreshing user claims...
 User claims refreshed successfully
 Setting up token refresh interval: 10 minutes
 Token refresh interval set up and stored
 Firebase Auth state changed: User signed out
 Auth state change: User signed out
 Auth token removed from localStorage
 Token refresh interval cleared
/login:1 [DOM] Input elements should have autocomplete attributes (suggested: "current-password"): (More info: https://goo.gl/9p2vKq) null
 Firebase Auth state changed: User uQ2jZ2dK5KOCkLbZ0xpZCQiF96M2 signed in
 Auth state change: User authenticated Object
 Requesting fresh token on auth state change...
 Auth token refreshed and stored in localStorage: eyJhbGciOi...aNtlA
 Refreshing user claims...
 User claims refreshed successfully
 Setting up token refresh interval: 10 minutes
 Token refresh interval set up and stored
 Firebase Auth state changed: User signed out
 Auth state change: User signed out
 Auth token removed from localStorage
 Token refresh interval cleared
/register:1 [DOM] Input elements should have autocomplete attributes (suggested: "current-password"): (More info: https://goo.gl/9p2vKq) null
 Registering user with Firebase Auth and creating profile in Production Firestore...
 Registering user with Firebase Auth directly
 Firebase Auth state changed: User 0y4fI7hYfOX9MEacwgjhKaREd0l1 signed in
 Auth state change: User authenticated Object
 Requesting fresh token on auth state change...
 User created successfully in Firebase Auth
 Auth token refreshed and stored in localStorage: eyJhbGciOi...mvong
 Refreshing user claims...
/api/user/0y4fI7hYfOX9MEacwgjhKaREd0l1/profile:1  Failed to load resource: the server responded with a status of 404 (Not Found)
 Error fetching user profile: Object
overrideMethod @ installHook.js:1
 User exists in Auth but profile data not found in Firestore
overrideMethod @ installHook.js:1
 User profile display name updated
 User claims refreshed successfully
 Setting up token refresh interval: 10 minutes
 Token refresh interval set up and stored
 Fresh auth token obtained and stored
 Creating user profile in Firestore via API
 User profile created successfully in Firestore
 Successfully updated profile details
 QueryFn: Fetching data from /api/yachts/producer
 QueryFn: Fetching data from /api/bookings/producer
 QueryFn: Fetching data from /api/reviews/producer
127.0.0.1:8080/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects%2Fetoile-yachts%2Fdatabases%2F(default)&RID=53792&CVER=22&X-HTTP-Session-Id=gsessionid&zx=tp53a4naq3ba&t=1:1  Failed to load resource: net::ERR_CONNECTION_REFUSED
 [2025-03-14T12:22:55.906Z]  @firebase/firestore: Firestore (11.3.1): WebChannelConnection RPC 'Listen' stream 0x49729f96 transport errored: jd
overrideMethod @ installHook.js:1
 Error fetching producer profile: 
overrideMethod @ installHook.js:1
 Successfully obtained fresh auth token
 QueryFn: Using token: eyJhbGciOi...gKpFA
 QueryFn: Sending fetch request...
 Successfully obtained fresh auth token
 QueryFn: Using token: eyJhbGciOi...gKpFA
 QueryFn: Sending fetch request...
 Successfully obtained fresh auth token
 QueryFn: Using token: eyJhbGciOi...gKpFA
 QueryFn: Sending fetch request...
 QueryFn: Response status: 200 OK
 QueryFn: Received HTML response instead of JSON
overrideMethod @ installHook.js:1
 QueryFn: HTML error page title: Unknown error
overrideMethod @ installHook.js:1
 QueryFn: First 200 characters of HTML: <!DOCTYPE html>
<html lang="en">
  <head>
    <style data-vite-theme="" data-inject-first="">:root {
      --background: 0 0% 100%;
--foreground: 20 14.3% 4.1%;
--muted: 60 4.8% 95.9%;
--muted-foregro
overrideMethod @ installHook.js:1
 QueryFn: URL path that returned HTML: /api/bookings/producer
overrideMethod @ installHook.js:1
 QueryFn: Error processing HTML response: 
overrideMethod @ installHook.js:1
 QueryFn: Error fetching data: 
overrideMethod @ installHook.js:1
 QueryFn: Response status: 200 OK
 QueryFn: Received HTML response instead of JSON
overrideMethod @ installHook.js:1
 QueryFn: HTML error page title: Unknown error
overrideMethod @ installHook.js:1
 QueryFn: First 200 characters of HTML: <!DOCTYPE html>
<html lang="en">
  <head>
    <style data-vite-theme="" data-inject-first="">:root {
      --background: 0 0% 100%;
--foreground: 20 14.3% 4.1%;
--muted: 60 4.8% 95.9%;
--muted-foregro
overrideMethod @ installHook.js:1
 QueryFn: URL path that returned HTML: /api/reviews/producer
overrideMethod @ installHook.js:1
 QueryFn: Error processing HTML response: 
overrideMethod @ installHook.js:1
 QueryFn: Error fetching data: 
overrideMethod @ installHook.js:1
/api/yachts/producer:1  Failed to load resource: the server responded with a status of 404 (Not Found)
 QueryFn: Response status: 404 Not Found
 QueryFn: Error fetching data: 
overrideMethod @ installHook.js:1
 QueryFn: Fetching data from /api/bookings/producer
 QueryFn: Fetching data from /api/reviews/producer
 QueryFn: Fetching data from /api/yachts/producer
 Successfully obtained fresh auth token
 QueryFn: Using token: eyJhbGciOi...IwOZg
 QueryFn: Sending fetch request...
 Successfully obtained fresh auth token
 QueryFn: Using token: eyJhbGciOi...IwOZg
 QueryFn: Sending fetch request...
 QueryFn: Response status: 200 OK
 QueryFn: Received HTML response instead of JSON
overrideMethod @ installHook.js:1
 QueryFn: HTML error page title: Unknown error
overrideMethod @ installHook.js:1
 QueryFn: First 200 characters of HTML: <!DOCTYPE html>
<html lang="en">
  <head>
    <style data-vite-theme="" data-inject-first="">:root {
      --background: 0 0% 100%;
--foreground: 20 14.3% 4.1%;
--muted: 60 4.8% 95.9%;
--muted-foregro
overrideMethod @ installHook.js:1
 QueryFn: URL path that returned HTML: /api/bookings/producer
overrideMethod @ installHook.js:1
 QueryFn: Error processing HTML response: 
overrideMethod @ installHook.js:1
 QueryFn: Error fetching data: 
overrideMethod @ installHook.js:1
 QueryFn: Response status: 200 OK
 QueryFn: Received HTML response instead of JSON
overrideMethod @ installHook.js:1
 QueryFn: HTML error page title: Unknown error
overrideMethod @ installHook.js:1
 QueryFn: First 200 characters of HTML: <!DOCTYPE html>
<html lang="en">
  <head>
    <style data-vite-theme="" data-inject-first="">:root {
      --background: 0 0% 100%;
--foreground: 20 14.3% 4.1%;
--muted: 60 4.8% 95.9%;
--muted-foregro
overrideMethod @ installHook.js:1
 QueryFn: URL path that returned HTML: /api/reviews/producer
overrideMethod @ installHook.js:1
 QueryFn: Error processing HTML response: 
overrideMethod @ installHook.js:1
 QueryFn: Error fetching data: 
overrideMethod @ installHook.js:1
 Successfully obtained fresh auth token
 QueryFn: Using token: eyJhbGciOi..._-Nkw
 QueryFn: Sending fetch request...
/api/yachts/producer:1  Failed to load resource: the server responded with a status of 404 (Not Found)
 QueryFn: Response status: 404 Not Found
 QueryFn: Error fetching data: 
overrideMethod @ installHook.js:1
 QueryFn: Fetching data from /api/producer/yachts
 QueryFn: Fetching data from /api/producer/addons
 QueryFn: Fetching data from /api/producer/yachts
 QueryFn: Fetching data from /api/producer/addons
 Refreshed token before fetching producer data
 Fetching producer data for user ID: 0y4fI7hYfOX9MEacwgjhKaREd0l1
 Successfully obtained fresh auth token
 QueryFn: Using token: eyJhbGciOi...ipoHQ
 QueryFn: Sending fetch request...
127.0.0.1:8080/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects%2Fetoile-yachts%2Fdatabases%2F(default)&RID=43104&CVER=22&X-HTTP-Session-Id=gsessionid&zx=poub3zcsgpqp&t=1:1  Failed to load resource: net::ERR_CONNECTION_REFUSED
 [2025-03-14T12:23:09.557Z]  @firebase/firestore: Firestore (11.3.1): WebChannelConnection RPC 'Listen' stream 0x49729f98 transport errored: jd
overrideMethod @ installHook.js:1
 No user found in harmonized_users with ID: 0y4fI7hYfOX9MEacwgjhKaREd0l1
overrideMethod @ installHook.js:1
 Successfully obtained fresh auth token
 QueryFn: Using token: eyJhbGciOi...ipoHQ
 QueryFn: Sending fetch request...
 Successfully obtained fresh auth token
 QueryFn: Using token: eyJhbGciOi...ipoHQ
queryClient.ts:163 QueryFn: Sending fetch request...
queryClient.ts:36 Successfully obtained fresh auth token
queryClient.ts:156 QueryFn: Using token: eyJhbGciOi...ipoHQ
queryClient.ts:163 QueryFn: Sending fetch request...
queryClient.ts:171 QueryFn: Response status: 200 OK
queryClient.ts:248 QueryFn: Successfully parsed JSON response with 2 keys
queryClient.ts:171 QueryFn: Response status: 200 OK
queryClient.ts:248 QueryFn: Successfully parsed JSON response with 2 keys
queryClient.ts:171 QueryFn: Response status: 200 OK
queryClient.ts:248 QueryFn: Successfully parsed JSON response with 2 keys
queryClient.ts:171 QueryFn: Response status: 200 OK
queryClient.ts:248 QueryFn: Successfully parsed JSON response with 2 keys
YachtForm.tsx:185 Fetching producer data for user ID: 0y4fI7hYfOX9MEacwgjhKaREd0l1
127.0.0.1:8080/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects%2Fetoile-yachts%2Fdatabases%2F(default)&RID=4392&CVER=22&X-HTTP-Session-Id=gsessionid&zx=q984feai7jge&t=1:1 
            
            
           Failed to load resource: net::ERR_CONNECTION_REFUSED
hook.js:608 [2025-03-14T12:23:15.441Z]  @firebase/firestore: Firestore (11.3.1): WebChannelConnection RPC 'Listen' stream 0x49729f99 transport errored: jd
overrideMethod @ hook.js:608
hook.js:608 No user found in harmonized_users with ID: 0y4fI7hYfOX9MEacwgjhKaREd0l1
overrideMethod @ hook.js:608
use-geolocation.ts:37 Got coordinates: Object
new-yacht:1 Access to fetch at 'https://us-central1-etoile-yachts.cloudfunctions.net/reverseGeocode' from origin 'https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource. If an opaque response serves your needs, set the request's mode to 'no-cors' to fetch the resource with CORS disabled.
us-central1-etoile-yachts.cloudfunctions.net/reverseGeocode:1 
            
            
           Failed to load resource: net::ERR_FAILED
hook.js:608 Error in reverseGeocode: FirebaseError: internal
overrideMethod @ hook.js:608
use-geolocation.ts:62 Reverse geocode result: Object
new-yacht:1 Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/v0/b/etoile-yachts.appspot.com/o?name=yacht_media%2F0y4fI7hYfOX9MEacwgjhKaREd0l1%2F1741955201806_luxury-yachts-in-the-harbour-of-monaco-SBI-350754027-preview.jpg' from origin 'https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: It does not have HTTP ok status.
firebasestorage.googleapis.com/v0/b/etoile-yachts.appspot.com/o?name=yacht_media%2F0y4fI7hYfOX9MEacwgjhKaREd0l1%2F1741955201806_luxury-yachts-in-the-harbour-of-monaco-SBI-350754027-preview.jpg:1 
            
            
           Failed to load resource: net::ERR_FAILED
new-yacht:1 Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/v0/b/etoile-yachts.appspot.com/o?name=yacht_media%2F0y4fI7hYfOX9MEacwgjhKaREd0l1%2F1741955201806_luxury-yachts-in-the-harbour-of-monaco-SBI-350754027-preview.jpg' from origin 'https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: It does not have HTTP ok status.
firebasestorage.googleapis.com/v0/b/etoile-yachts.appspot.com/o?name=yacht_media%2F0y4fI7hYfOX9MEacwgjhKaREd0l1%2F1741955201806_luxury-yachts-in-the-harbour-of-monaco-SBI-350754027-preview.jpg:1 
            
            
           Failed to load resource: net::ERR_FAILED
new-yacht:1 Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/v0/b/etoile-yachts.appspot.com/o?name=yacht_media%2F0y4fI7hYfOX9MEacwgjhKaREd0l1%2F1741955201806_luxury-yachts-in-the-harbour-of-monaco-SBI-350754027-preview.jpg' from origin 'https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: It does not have HTTP ok status.
firebasestorage.googleapis.com/v0/b/etoile-yachts.appspot.com/o?name=yacht_media%2F0y4fI7hYfOX9MEacwgjhKaREd0l1%2F1741955201806_luxury-yachts-in-the-harbour-of-monaco-SBI-350754027-preview.jpg:1 
            
            
           Failed to load resource: net::ERR_FAILED
new-yacht:1 Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/v0/b/etoile-yachts.appspot.com/o?name=yacht_media%2F0y4fI7hYfOX9MEacwgjhKaREd0l1%2F1741955201806_luxury-yachts-in-the-harbour-of-monaco-SBI-350754027-preview.jpg' from origin 'https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: It does not have HTTP ok status.
firebasestorage.googleapis.com/v0/b/etoile-yachts.appspot.com/o?name=yacht_media%2F0y4fI7hYfOX9MEacwgjhKaREd0l1%2F1741955201806_luxury-yachts-in-the-harbour-of-monaco-SBI-350754027-preview.jpg:1 
            
            
           Failed to load resource: net::ERR_FAILED

                
          
          
          
         Chrome is moving towards a new experience that allows users to choose to browse without third-party cookies.
new-yacht:1 Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/v0/b/etoile-yachts.appspot.com/o?name=yacht_media%2F0y4fI7hYfOX9MEacwgjhKaREd0l1%2F1741955201806_luxury-yachts-in-the-harbour-of-monaco-SBI-350754027-preview.jpg' from origin 'https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: It does not have HTTP ok status.
firebase_storage.js?v=8d546569:1491 
            
            
           POST https://firebasestorage.googleapis.com/v0/b/etoile-yachts.appspot.com/o?name=yacht_media%2F0y4fI7hYfOX9MEacwgjhKaREd0l1%2F1741955201806_luxury-yachts-in-the-harbour-of-monaco-SBI-350754027-preview.jpg net::ERR_FAILED
send @ firebase_storage.js?v=8d546569:1491
doTheRequest @ firebase_storage.js?v=8d546569:452
(anonymous) @ firebase_storage.js?v=8d546569:276
