 injection-tss TSS: hosted page injected
 injection-tss MBTSS: Nonce:  nonce
 Removing unpermitted intrinsics
 CONTENT_SHELL: Page allowed. Skipping shell injection blocks
 TSS: excluded result:  true
 DFP: Breach notification feature flag is enabled. true
 Browsing Topics API removed
 [vite] connecting...
 [vite] connected.
 Creating new Firebase app instance
 Firebase initialized in PRODUCTION mode
 Legacy Firebase auth state listener disabled, using centralized AuthService instead
 Using PRODUCTION Firebase services - skipping emulator connection
 Using production Firebase services - emulator connection disabled
 Using production Firebase services - emulator connection disabled
 AdminAuthProvider: Setting up auth state listener via authService
 useAuthService: Setting up auth state listener
 Initializing Firestore collections in production mode...
 Skipping collection verification during initialization (will verify after authentication)
 [DEBUG-AUTH] App.tsx: Initial setup complete, using consolidated auth providers
 injection-tss TSS: hosted page injected
 injection-tss MBTSS: Nonce:  nonce
 CONTENT_SHELL: Page allowed. Skipping shell injection blocks
 TSS: excluded result:  true
 [DEBUG-AUTH] AuthService.onAuthStateChanged: User signed in
 [DEBUG-AUTH] User signed in details: Object
 AdminAuthProvider: Auth state changed: User signed in
 useAuthService: Auth state changed: User signed in
 [DEBUG-AUTH] AuthService.onIdTokenChanged: Token updated
 [DEBUG-AUTH] ID token updated for user: Object
 [DEBUG-AUTH] Storing new auth token in localStorage, tokenLength: 1014
 [DEBUG-AUTH] Setting adminSessionActive flag
 DFP: Breach notification feature flag is enabled. true
 Browsing Topics API removed
 AuthService: Firebase auth persistence set to LOCAL
 AdminAuthProvider: User is an admin, setting up admin session
admin/login:1 [DOM] Input elements should have autocomplete attributes (suggested: "current-password"): (More info: https://goo.gl/9p2vKq) null
 AuthService: Roles are in sync: admin
 AuthService: Roles are in sync: admin
 AdminAuthProvider: Attempting to sign in admin user
 [DEBUG-AUTH] AuthService.onIdTokenChanged: Token updated
 [DEBUG-AUTH] ID token updated for user: Object
 [DEBUG-AUTH] Storing new auth token in localStorage, tokenLength: 1014
 [DEBUG-AUTH] Setting adminSessionActive flag
 [DEBUG-AUTH] AuthService.onIdTokenChanged: Token updated
 [DEBUG-AUTH] ID token updated for user: Object
 AuthService: Stored fresh auth token in localStorage after login
 AdminAuthProvider: User signed in, checking admin status
 [DEBUG-AUTH] Storing new auth token in localStorage, tokenLength: 1014
 [DEBUG-AUTH] Setting adminSessionActive flag
 AdminAuthProvider: Admin sign-in successful
 AuthService: Roles are in sync: admin
 adminApiRequest: Added auth header for /api/admin/login-audit
 AuthService: Roles are in sync: admin
 adminApiRequest: /api/admin/login-audit response status: 200
 TSS: Counted history being pushed
 TSS: Caught history
 TSS: Checking if repeated 500 times for interval 1000 against data:  Object
 AdminAuthProvider: Verifying MFA code
 AdminAuthProvider: MFA code verified successfully
 TSS: Counted history being pushed
 TSS: Caught history
 TSS: Checking if repeated 500 times for interval 1000 against data:  Object
 useAuthService: Setting up auth state listener
 AuthService: Roles are in sync: admin
 AuthService: Roles are in sync: admin
 [DEBUG-AUTH] AuthService.onIdTokenChanged: Token updated
auth-service.ts:643 [DEBUG-AUTH] ID token updated for user: Object
adminApiUtils.ts:29 adminApiRequest: Added auth header for /api/admin/media-validation-status
auth-service.ts:661 [DEBUG-AUTH] Storing new auth token in localStorage, tokenLength: 1014
auth-service.ts:672 [DEBUG-AUTH] Setting adminSessionActive flag
adminApiUtils.ts:29 adminApiRequest: Added auth header for /api/admin/media-validation-reports
adminApiUtils.ts:46 adminApiRequest: /api/admin/media-validation-status response status: 200
auth-service.ts:521 AuthService: Roles are in sync: admin
adminApiUtils.ts:46 adminApiRequest: /api/admin/media-validation-reports response status: 200
MediaValidationSummary.tsx:31 Uncaught RangeError: Invalid time value
    at formatDate (MediaValidationSummary.tsx:31:8)
    at getTimeAgo (MediaValidationSummary.tsx:54:12)
    at MediaValidationSummary (MediaValidationSummary.tsx:161:44)
    at renderWithHooks (chunk-RPCDYKBN.js?v=df54cadb:11548:26)
    at updateFunctionComponent (chunk-RPCDYKBN.js?v=df54cadb:14582:28)
    at beginWork (chunk-RPCDYKBN.js?v=df54cadb:15924:22)
    at HTMLUnknownElement.callCallback2 (chunk-RPCDYKBN.js?v=df54cadb:3674:22)
    at Object.invokeGuardedCallbackDev (chunk-RPCDYKBN.js?v=df54cadb:3699:24)
    at invokeGuardedCallback (chunk-RPCDYKBN.js?v=df54cadb:3733:39)
    at beginWork$1 (chunk-RPCDYKBN.js?v=df54cadb:19765:15)
MediaValidationSummary.tsx:31 Uncaught RangeError: Invalid time value
    at formatDate (MediaValidationSummary.tsx:31:8)
    at getTimeAgo (MediaValidationSummary.tsx:54:12)
    at MediaValidationSummary (MediaValidationSummary.tsx:161:44)
    at renderWithHooks (chunk-RPCDYKBN.js?v=df54cadb:11548:26)
    at updateFunctionComponent (chunk-RPCDYKBN.js?v=df54cadb:14582:28)
    at beginWork (chunk-RPCDYKBN.js?v=df54cadb:15924:22)
    at HTMLUnknownElement.callCallback2 (chunk-RPCDYKBN.js?v=df54cadb:3674:22)
    at Object.invokeGuardedCallbackDev (chunk-RPCDYKBN.js?v=df54cadb:3699:24)
    at invokeGuardedCallback (chunk-RPCDYKBN.js?v=df54cadb:3733:39)
    at beginWork$1 (chunk-RPCDYKBN.js?v=df54cadb:19765:15)
hook.js:608 The above error occurred in the <MediaValidationSummary> component:

    at MediaValidationSummary (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/components/admin/MediaValidationSummary.tsx:27:28)
    at div
    at div
    at div
    at main
    at div
    at div
    at AdminDashboard (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/pages/admin/AdminDashboard.tsx:67:45)
    at PrivateRoute (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/components/routing/PrivateRoute.tsx:24:3)
    at Route (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/wouter.js?v=df54cadb:323:16)
    at Switch (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/wouter.js?v=df54cadb:379:17)
    at Suspense
    at main
    at div
    at AdminAuthProvider (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/hooks/use-admin-auth.ts:62:3)
    at AdminAuthProvider (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/components/admin/AdminAuthProvider.tsx:19:3)
    at AuthProvider (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/providers/auth-provider.tsx:21:32)
    at QueryClientProvider (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/@tanstack_react-query.js?v=df54cadb:2805:3)
    at App (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/App.tsx?v=aE8QL8aEJHw3HX106GKdu:139:3)

Consider adding an error boundary to your tree to customize error handling behavior.
Visit https://reactjs.org/link/error-boundaries to learn more about error boundaries.
overrideMethod @ hook.js:608
chunk-RPCDYKBN.js?v=df54cadb:9129 Uncaught RangeError: Invalid time value
    at formatDate (MediaValidationSummary.tsx:31:8)
    at getTimeAgo (MediaValidationSummary.tsx:54:12)
    at MediaValidationSummary (MediaValidationSummary.tsx:161:44)
    at renderWithHooks (chunk-RPCDYKBN.js?v=df54cadb:11548:26)
    at updateFunctionComponent (chunk-RPCDYKBN.js?v=df54cadb:14582:28)
    at beginWork (chunk-RPCDYKBN.js?v=df54cadb:15924:22)
    at beginWork$1 (chunk-RPCDYKBN.js?v=df54cadb:19753:22)
    at performUnitOfWork (chunk-RPCDYKBN.js?v=df54cadb:19198:20)
    at workLoopSync (chunk-RPCDYKBN.js?v=df54cadb:19137:13)
    at renderRootSync (chunk-RPCDYKBN.js?v=df54cadb:19116:15)
auth-service.ts:521 AuthService: Roles are in sync: admin
auth-service.ts:627 [DEBUG-AUTH] AuthService.onIdTokenChanged: Token updated
auth-service.ts:643 [DEBUG-AUTH] ID token updated for user: Object
adminApiUtils.ts:29 adminApiRequest: Added auth header for /api/admin/media-validation-reports
auth-service.ts:661 [DEBUG-AUTH] Storing new auth token in localStorage, tokenLength: 1014
auth-service.ts:672 [DEBUG-AUTH] Setting adminSessionActive flag
adminApiUtils.ts:29 adminApiRequest: Added auth header for /api/admin/media-validation-reports
adminApiUtils.ts:46 adminApiRequest: /api/admin/media-validation-reports response status: 200
adminApiUtils.ts:46 adminApiRequest: /api/admin/media-validation-reports response status: 200
