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
 Auth token refreshed and stored in localStorage: eyJhbGciOi...jiYiA
 Refreshing user claims...
 ✅ Auth token refreshed successfully
 Token claims received: {
  "name": "Ally Gee",
  "role": "producer",
  "iss": "https://securetoken.google.com/etoile-yachts",
  "aud": "etoile-yachts",
  "auth_time": 1742235877,
  "user_id": "N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2",
  "sub": "N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2",
  "iat": 1742235878,
  "exp": 1742239478,
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
 User claims refreshed successfully
 Setting up token refresh interval: 10 minutes
 Token refresh interval set up and stored
 Successfully retrieved and standardized user profile: Object
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
 Auth context: No role available from user object
 Verifying role before redirection: producer
 Role verification - Quick check passed for "producer"
 Role verification - Success with token role "producer"
 Role verified (producer), redirecting to appropriate dashboard
 Sync claims response: Object
 ✅ Auth state change - claims synchronized successfully: Object
 📋 Auth state change - role remained the same after sync: producer
 ✅ Auth token stored in localStorage
 ✅ Auth state change - setting user with final role: producer
 Auth context using validated role: producer
 QueryFn: Fetching data from /api/producer/yachts
 QueryFn: Endpoint requires 'producer' role
 QueryFn: Fetching data from /api/producer/bookings
 QueryFn: Endpoint requires 'producer' role
 QueryFn: Fetching data from /api/producer/reviews
 QueryFn: Endpoint requires 'producer' role
 QueryFn: User role from token: producer
 QueryFn: User role from token: producer
 QueryFn: User role from token: producer
 Successfully obtained fresh auth token
 QueryFn: Using token: eyJhbGciOi...5Y60w
 QueryFn: Sending fetch request...
 Successfully obtained fresh auth token
 QueryFn: Using token: eyJhbGciOi...5Y60w
 QueryFn: Sending fetch request...
 Successfully obtained fresh auth token
 QueryFn: Using token: eyJhbGciOi...5Y60w
 QueryFn: Sending fetch request...
 Auth context using validated role: producer
 QueryFn: Response status: 200 OK
 QueryFn: Successfully parsed JSON response with 0 keys
 QueryFn: Array response with 0 items
 QueryFn: Response status: 200 OK
 QueryFn: Response status: 200 OK
 QueryFn: Successfully parsed JSON response with 0 keys
 QueryFn: Array response with 0 items
 QueryFn: Successfully parsed JSON response with 2 keys
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
 Refreshed token before fetching producer data
 Fetching producer data for user ID: N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2
 Successfully obtained fresh auth token
 QueryFn: Using token: eyJhbGciOi...jJQrg
 QueryFn: Sending fetch request...
 Successfully obtained fresh auth token
 QueryFn: Using token: eyJhbGciOi...jJQrg
 QueryFn: Sending fetch request...
 Successfully obtained fresh auth token
 QueryFn: Using token: eyJhbGciOi...jJQrg
 QueryFn: Sending fetch request...
 Successfully obtained fresh auth token
 QueryFn: Using token: eyJhbGciOi...jJQrg
 QueryFn: Sending fetch request...
 Found producer data: Object
 QueryFn: Response status: 200 OK
 QueryFn: Response status: 200 OK
 QueryFn: Successfully parsed JSON response with 2 keys
 QueryFn: Successfully parsed JSON response with 2 keys
 QueryFn: Response status: 200 OK
 QueryFn: Successfully parsed JSON response with 2 keys
 Status badge for yacht Yas Island Cruse - Abu Dhabi (yacht-IPwWfOoHOkgkJimhvPwABhyZ3Kn1-1742024879802):  Object computed=true, standardized=true, version=1
 Status badge for yacht Yas Marina Romantic Sunset Cruise (yacht-IPwWfOoHOkgkJimhvPwABhyZ3Kn1-1742025160910):  Object computed=true, standardized=true, version=1
 Status badge for yacht All Day Luxury Yacht - Dubai (yacht-N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2-1741988213167):  Object computed=true, standardized=true, version=1
 Status badge for yacht Abu Dhabi Sport Fishing Adventure (yacht-N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2-1742114968912):  Object computed=true, standardized=true, version=1
 Status badge for yacht Abu Dhabi Wreck Diving Expedition (yacht-N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2-1742114969137):  Object computed=true, standardized=true, version=1
 Status badge for yacht Dubai Dinner for International Women's Day (yacht-N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2-1742228076894):  Object computed=true, standardized=true, version=1
 Status badge for yacht Pearl of Yas (YAC_YAS_001):  Object computed=false, standardized=true, version=1
 QueryFn: Response status: 200 OK
 QueryFn: Successfully parsed JSON response with 2 keys
 Fetching producer data for user ID: N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2
 Searching for yacht ID yacht-IPwWfOoHOkgkJimhvPwABhyZ3Kn1-1742024879802 in unified_yacht_experiences collection...
 Found producer data: Object
 Found yacht data: Object
 QueryFn: Fetching data from /api/producer/available-addons
queryClient.ts:277 QueryFn: Endpoint requires 'producer' role
queryClient.ts:280 QueryFn: User role from token: producer
queryClient.ts:58 Successfully obtained fresh auth token
queryClient.ts:318 QueryFn: Using token: eyJhbGciOi...K1dgw
queryClient.ts:325 QueryFn: Sending fetch request...
use-geolocation.ts:37 Got coordinates: Object
reverseGeocode.ts:26 Calling reverse geocode proxy with coordinates: Object
use-geolocation.ts:37 Got coordinates: Object
reverseGeocode.ts:26 Calling reverse geocode proxy with coordinates: Object
reverseGeocode.ts:39 Successfully retrieved address: F9M5+72H - Al Hisn - W3 - Abu Dhabi - United Arab Emirates
use-geolocation.ts:62 Reverse geocode result: Object
reverseGeocode.ts:39 Successfully retrieved address: F9M5+72H - Al Hisn - W3 - Abu Dhabi - United Arab Emirates
use-geolocation.ts:62 Reverse geocode result: Object
use-auth.ts:365 Auth context using validated role: producer
queryClient.ts:333 QueryFn: Response status: 200 OK
queryClient.ts:428 QueryFn: Successfully parsed JSON response with 2 keys
AddOnCard.tsx:82 Uncaught TypeError: addOn.tags.slice is not a function
    at AddOnCard (AddOnCard.tsx:82:23)
    at renderWithHooks (chunk-RPCDYKBN.js?v=d4890493:11548:26)
    at mountIndeterminateComponent (chunk-RPCDYKBN.js?v=d4890493:14926:21)
    at beginWork (chunk-RPCDYKBN.js?v=d4890493:15914:22)
    at HTMLUnknownElement.callCallback2 (chunk-RPCDYKBN.js?v=d4890493:3674:22)
    at Object.invokeGuardedCallbackDev (chunk-RPCDYKBN.js?v=d4890493:3699:24)
    at invokeGuardedCallback (chunk-RPCDYKBN.js?v=d4890493:3733:39)
    at beginWork$1 (chunk-RPCDYKBN.js?v=d4890493:19765:15)
    at performUnitOfWork (chunk-RPCDYKBN.js?v=d4890493:19198:20)
    at workLoopSync (chunk-RPCDYKBN.js?v=d4890493:19137:13)
AddOnCard.tsx:82 Uncaught TypeError: addOn.tags.slice is not a function
    at AddOnCard (AddOnCard.tsx:82:23)
    at renderWithHooks (chunk-RPCDYKBN.js?v=d4890493:11548:26)
    at mountIndeterminateComponent (chunk-RPCDYKBN.js?v=d4890493:14926:21)
    at beginWork (chunk-RPCDYKBN.js?v=d4890493:15914:22)
    at HTMLUnknownElement.callCallback2 (chunk-RPCDYKBN.js?v=d4890493:3674:22)
    at Object.invokeGuardedCallbackDev (chunk-RPCDYKBN.js?v=d4890493:3699:24)
    at invokeGuardedCallback (chunk-RPCDYKBN.js?v=d4890493:3733:39)
    at beginWork$1 (chunk-RPCDYKBN.js?v=d4890493:19765:15)
    at performUnitOfWork (chunk-RPCDYKBN.js?v=d4890493:19198:20)
    at workLoopSync (chunk-RPCDYKBN.js?v=d4890493:19137:13)
hook.js:608 The above error occurred in the <AddOnCard> component:

    at AddOnCard (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/components/yacht/AddOnCard.tsx:25:3)
    at div
    at div
    at https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/@radix-ui_react-tabs.js?v=d4890493:251:13
    at Presence (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/@radix-ui_react-tabs.js?v=d4890493:481:11)
    at https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/@radix-ui_react-tabs.js?v=d4890493:731:13
    at _c5 (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/components/ui/tabs.tsx:68:12)
    at div
    at https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/@radix-ui_react-tabs.js?v=d4890493:251:13
    at Provider (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/chunk-JJS7DLG7.js?v=d4890493:38:15)
    at https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/@radix-ui_react-tabs.js?v=d4890493:609:7
    at div
    at AddOnSelector (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/components/yacht/AddOnSelector.tsx:29:3)
    at div
    at _c9 (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/components/ui/card.tsx:106:12)
    at div
    at _c (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/components/ui/card.tsx:20:11)
    at div
    at https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/@radix-ui_react-tabs.js?v=d4890493:251:13
    at Presence (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/@radix-ui_react-tabs.js?v=d4890493:481:11)
    at https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/@radix-ui_react-tabs.js?v=d4890493:731:13
    at _c5 (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/components/ui/tabs.tsx:68:12)
    at div
    at https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/@radix-ui_react-tabs.js?v=d4890493:251:13
    at Provider (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/chunk-JJS7DLG7.js?v=d4890493:38:15)
    at https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/@radix-ui_react-tabs.js?v=d4890493:609:7
    at form
    at FormProvider (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/chunk-YABUFNLM.js?v=d4890493:102:11)
    at div
    at main
    at div
    at DashboardLayout (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/components/layout/DashboardLayout.tsx:41:35)
    at YachtForm (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/pages/dashboard/producer/YachtForm.tsx:92:27)
    at PrivateRoute (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/App.tsx?v=OkBvkPwngjA7vdH_-Lhbt:99:36)
    at Route (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/wouter.js?v=d4890493:323:16)
    at Switch (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/wouter.js?v=d4890493:379:17)
    at Suspense
    at main
    at div
    at AuthProvider (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/hooks/use-auth.ts:11:32)
    at QueryClientProvider (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/@tanstack_react-query.js?v=d4890493:2805:3)
    at App (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/App.tsx?v=OkBvkPwngjA7vdH_-Lhbt:125:18)
    at AuthProvider (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/lib/auth-context.tsx?v=OkBvkPwngjA7vdH_-Lhbt:117:32)

Consider adding an error boundary to your tree to customize error handling behavior.
Visit https://reactjs.org/link/error-boundaries to learn more about error boundaries.
overrideMethod @ hook.js:608
chunk-RPCDYKBN.js?v=d4890493:9129 Uncaught TypeError: addOn.tags.slice is not a function
    at AddOnCard (AddOnCard.tsx:82:23)
    at renderWithHooks (chunk-RPCDYKBN.js?v=d4890493:11548:26)
    at mountIndeterminateComponent (chunk-RPCDYKBN.js?v=d4890493:14926:21)
    at beginWork (chunk-RPCDYKBN.js?v=d4890493:15914:22)
    at beginWork$1 (chunk-RPCDYKBN.js?v=d4890493:19753:22)
    at performUnitOfWork (chunk-RPCDYKBN.js?v=d4890493:19198:20)
    at workLoopSync (chunk-RPCDYKBN.js?v=d4890493:19137:13)
    at renderRootSync (chunk-RPCDYKBN.js?v=d4890493:19116:15)
    at recoverFromConcurrentError (chunk-RPCDYKBN.js?v=d4890493:18736:28)
    at performSyncWorkOnRoot (chunk-RPCDYKBN.js?v=d4890493:18879:28)
