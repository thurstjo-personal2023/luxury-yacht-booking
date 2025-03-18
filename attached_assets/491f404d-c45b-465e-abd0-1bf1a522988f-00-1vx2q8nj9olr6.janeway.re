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
 Auth token refreshed and stored in localStorage: eyJhbGciOi...NcTyw
 Refreshing user claims...
 ✅ Auth token refreshed successfully
 Token claims received: {
  "name": "Ally Gee",
  "role": "producer",
  "iss": "https://securetoken.google.com/etoile-yachts",
  "aud": "etoile-yachts",
  "auth_time": 1742286955,
  "user_id": "N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2",
  "sub": "N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2",
  "iat": 1742286979,
  "exp": 1742290579,
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
 Collection harmonized_users verified in production mode
 Collection unified_yacht_experiences verified in production mode
 Collection user_profiles_tourist verified in production mode
 Collection articles_and_guides verified in production mode
 Collection event_announcements verified in production mode
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
ImageValidationReports.tsx:289 Uncaught TypeError: Cannot read properties of undefined (reading 'invalid')
    at ImageValidationReports (ImageValidationReports.tsx:289:44)
    at renderWithHooks (chunk-RPCDYKBN.js?v=d1a979a9:11548:26)
    at updateFunctionComponent (chunk-RPCDYKBN.js?v=d1a979a9:14582:28)
    at beginWork (chunk-RPCDYKBN.js?v=d1a979a9:15924:22)
    at HTMLUnknownElement.callCallback2 (chunk-RPCDYKBN.js?v=d1a979a9:3674:22)
    at Object.invokeGuardedCallbackDev (chunk-RPCDYKBN.js?v=d1a979a9:3699:24)
    at invokeGuardedCallback (chunk-RPCDYKBN.js?v=d1a979a9:3733:39)
    at beginWork$1 (chunk-RPCDYKBN.js?v=d1a979a9:19765:15)
    at performUnitOfWork (chunk-RPCDYKBN.js?v=d1a979a9:19198:20)
    at workLoopSync (chunk-RPCDYKBN.js?v=d1a979a9:19137:13)
ImageValidationReports.tsx:289 Uncaught TypeError: Cannot read properties of undefined (reading 'invalid')
    at ImageValidationReports (ImageValidationReports.tsx:289:44)
    at renderWithHooks (chunk-RPCDYKBN.js?v=d1a979a9:11548:26)
    at updateFunctionComponent (chunk-RPCDYKBN.js?v=d1a979a9:14582:28)
    at beginWork (chunk-RPCDYKBN.js?v=d1a979a9:15924:22)
    at HTMLUnknownElement.callCallback2 (chunk-RPCDYKBN.js?v=d1a979a9:3674:22)
    at Object.invokeGuardedCallbackDev (chunk-RPCDYKBN.js?v=d1a979a9:3699:24)
    at invokeGuardedCallback (chunk-RPCDYKBN.js?v=d1a979a9:3733:39)
    at beginWork$1 (chunk-RPCDYKBN.js?v=d1a979a9:19765:15)
    at performUnitOfWork (chunk-RPCDYKBN.js?v=d1a979a9:19198:20)
    at workLoopSync (chunk-RPCDYKBN.js?v=d1a979a9:19137:13)
hook.js:608 The above error occurred in the <ImageValidationReports> component:

    at ImageValidationReports (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/components/admin/ImageValidationReports.tsx:31:37)
    at div
    at div
    at ImageValidator (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/pages/admin/ImageValidator.tsx:25:30)
    at PrivateRoute (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/App.tsx?v=tzi8vPOsGWaC-MoJVxpIf:101:36)
    at Route (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/wouter.js?v=d1a979a9:323:16)
    at Switch (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/wouter.js?v=d1a979a9:379:17)
    at Suspense
    at main
    at div
    at AuthProvider (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/hooks/use-auth.ts:11:32)
    at QueryClientProvider (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/@tanstack_react-query.js?v=d1a979a9:2805:3)
    at App (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/App.tsx?v=tzi8vPOsGWaC-MoJVxpIf:127:18)
    at AuthProvider (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/lib/auth-context.tsx?v=tzi8vPOsGWaC-MoJVxpIf:117:32)

Consider adding an error boundary to your tree to customize error handling behavior.
Visit https://reactjs.org/link/error-boundaries to learn more about error boundaries.
overrideMethod @ hook.js:608
chunk-RPCDYKBN.js?v=d1a979a9:9129 Uncaught TypeError: Cannot read properties of undefined (reading 'invalid')
    at ImageValidationReports (ImageValidationReports.tsx:289:44)
    at renderWithHooks (chunk-RPCDYKBN.js?v=d1a979a9:11548:26)
    at updateFunctionComponent (chunk-RPCDYKBN.js?v=d1a979a9:14582:28)
    at beginWork (chunk-RPCDYKBN.js?v=d1a979a9:15924:22)
    at beginWork$1 (chunk-RPCDYKBN.js?v=d1a979a9:19753:22)
    at performUnitOfWork (chunk-RPCDYKBN.js?v=d1a979a9:19198:20)
    at workLoopSync (chunk-RPCDYKBN.js?v=d1a979a9:19137:13)
    at renderRootSync (chunk-RPCDYKBN.js?v=d1a979a9:19116:15)
    at recoverFromConcurrentError (chunk-RPCDYKBN.js?v=d1a979a9:18736:28)
    at performSyncWorkOnRoot (chunk-RPCDYKBN.js?v=d1a979a9:18879:28)
