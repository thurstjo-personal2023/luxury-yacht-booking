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
 Auth token refreshed and stored in localStorage: eyJhbGciOi...eBz9A
 Refreshing user claims...
 ✅ Auth token refreshed successfully
use-auth.ts:411 Token claims received: {
  "name": "Ally Gee",
  "role": "producer",
  "iss": "https://securetoken.google.com/etoile-yachts",
  "aud": "etoile-yachts",
  "auth_time": 1742290328,
  "user_id": "N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2",
  "sub": "N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2",
  "iat": 1742290383,
  "exp": 1742293983,
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
use-auth.ts:365 Auth context using validated role: producer
MediaValidationReports.tsx:205 Uncaught TypeError: Cannot read properties of undefined (reading 'slice')
    at MediaValidationReports (MediaValidationReports.tsx:205:42)
    at renderWithHooks (chunk-RPCDYKBN.js?v=455fefc7:11548:26)
    at updateFunctionComponent (chunk-RPCDYKBN.js?v=455fefc7:14582:28)
    at beginWork (chunk-RPCDYKBN.js?v=455fefc7:15924:22)
    at HTMLUnknownElement.callCallback2 (chunk-RPCDYKBN.js?v=455fefc7:3674:22)
    at Object.invokeGuardedCallbackDev (chunk-RPCDYKBN.js?v=455fefc7:3699:24)
    at invokeGuardedCallback (chunk-RPCDYKBN.js?v=455fefc7:3733:39)
    at beginWork$1 (chunk-RPCDYKBN.js?v=455fefc7:19765:15)
    at performUnitOfWork (chunk-RPCDYKBN.js?v=455fefc7:19198:20)
    at workLoopSync (chunk-RPCDYKBN.js?v=455fefc7:19137:13)
MediaValidationReports.tsx:205 Uncaught TypeError: Cannot read properties of undefined (reading 'slice')
    at MediaValidationReports (MediaValidationReports.tsx:205:42)
    at renderWithHooks (chunk-RPCDYKBN.js?v=455fefc7:11548:26)
    at updateFunctionComponent (chunk-RPCDYKBN.js?v=455fefc7:14582:28)
    at beginWork (chunk-RPCDYKBN.js?v=455fefc7:15924:22)
    at HTMLUnknownElement.callCallback2 (chunk-RPCDYKBN.js?v=455fefc7:3674:22)
    at Object.invokeGuardedCallbackDev (chunk-RPCDYKBN.js?v=455fefc7:3699:24)
    at invokeGuardedCallback (chunk-RPCDYKBN.js?v=455fefc7:3733:39)
    at beginWork$1 (chunk-RPCDYKBN.js?v=455fefc7:19765:15)
    at performUnitOfWork (chunk-RPCDYKBN.js?v=455fefc7:19198:20)
    at workLoopSync (chunk-RPCDYKBN.js?v=455fefc7:19137:13)
hook.js:608 The above error occurred in the <MediaValidationReports> component:

    at MediaValidationReports (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/components/admin/MediaValidationReports.tsx:38:20)
    at div
    at https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/@radix-ui_react-tabs.js?v=455fefc7:251:13
    at Presence (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/@radix-ui_react-tabs.js?v=455fefc7:481:11)
    at https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/@radix-ui_react-tabs.js?v=455fefc7:731:13
    at _c5 (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/components/ui/tabs.tsx:68:12)
    at div
    at https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/@radix-ui_react-tabs.js?v=455fefc7:251:13
    at Provider (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/chunk-JJS7DLG7.js?v=455fefc7:38:15)
    at https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/@radix-ui_react-tabs.js?v=455fefc7:609:7
    at div
    at main
    at div
    at div
    at AdminLayout (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/components/layouts/AdminLayout.tsx:42:39)
    at MediaManagement (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/pages/admin/MediaManagement.tsx:31:20)
    at PrivateRoute (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/App.tsx?v=Ny8BlXVd4MzFb8XLs1NAg:103:36)
    at Route (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/wouter.js?v=455fefc7:323:16)
    at Switch (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/wouter.js?v=455fefc7:379:17)
    at Suspense
    at main
    at div
    at AuthProvider (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/hooks/use-auth.ts:11:32)
    at QueryClientProvider (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/@tanstack_react-query.js?v=455fefc7:2805:3)
    at App (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/App.tsx?v=Ny8BlXVd4MzFb8XLs1NAg:129:18)
    at AuthProvider (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/lib/auth-context.tsx?v=Ny8BlXVd4MzFb8XLs1NAg:117:32)

Consider adding an error boundary to your tree to customize error handling behavior.
Visit https://reactjs.org/link/error-boundaries to learn more about error boundaries.
overrideMethod @ hook.js:608
chunk-RPCDYKBN.js?v=455fefc7:9129 Uncaught TypeError: Cannot read properties of undefined (reading 'slice')
    at MediaValidationReports (MediaValidationReports.tsx:205:42)
    at renderWithHooks (chunk-RPCDYKBN.js?v=455fefc7:11548:26)
    at updateFunctionComponent (chunk-RPCDYKBN.js?v=455fefc7:14582:28)
    at beginWork (chunk-RPCDYKBN.js?v=455fefc7:15924:22)
    at beginWork$1 (chunk-RPCDYKBN.js?v=455fefc7:19753:22)
    at performUnitOfWork (chunk-RPCDYKBN.js?v=455fefc7:19198:20)
    at workLoopSync (chunk-RPCDYKBN.js?v=455fefc7:19137:13)
    at renderRootSync (chunk-RPCDYKBN.js?v=455fefc7:19116:15)
    at recoverFromConcurrentError (chunk-RPCDYKBN.js?v=455fefc7:18736:28)
    at performSyncWorkOnRoot (chunk-RPCDYKBN.js?v=455fefc7:18879:28)
