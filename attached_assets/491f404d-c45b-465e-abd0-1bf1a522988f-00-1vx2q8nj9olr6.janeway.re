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
 [DEBUG-AUTH] AuthService.onAuthStateChanged: User signed in
 [DEBUG-AUTH] User signed in details: Object
 AdminAuthProvider: Auth state changed: User signed in
 useAuthService: Auth state changed: User signed in
 [DEBUG-AUTH] AuthService.onIdTokenChanged: Token updated
 [DEBUG-AUTH] ID token updated for user: Object
 [DEBUG-AUTH] Storing new auth token in localStorage, tokenLength: 1014
 [DEBUG-AUTH] Setting adminSessionActive flag
 injection-tss TSS: hosted page injected
 injection-tss MBTSS: Nonce:  nonce
 CONTENT_SHELL: Page allowed. Skipping shell injection blocks
 TSS: excluded result:  true
 DFP: Breach notification feature flag is enabled. true
 AuthService: Firebase auth persistence set to LOCAL
 Browsing Topics API removed
 AdminAuthProvider: User is an admin, setting up admin session
login:1 [DOM] Input elements should have autocomplete attributes (suggested: "current-password"): (More info: https://goo.gl/9p2vKq) null
 AuthService: Roles are in sync: admin
 AuthService: Roles are in sync: admin
 AdminAuthProvider: Attempting to sign in admin user
 [DEBUG-AUTH] AuthService.onIdTokenChanged: Token updated
 [DEBUG-AUTH] ID token updated for user: Object
 [DEBUG-AUTH] Storing new auth token in localStorage, tokenLength: 1014
 [DEBUG-AUTH] Setting adminSessionActive flag
 AuthService: Stored fresh auth token in localStorage after login
 AdminAuthProvider: User signed in, checking admin status
 AdminAuthProvider: Admin sign-in successful
 AuthService: Roles are in sync: admin
 [DEBUG-AUTH] AuthService.onIdTokenChanged: Token updated
 [DEBUG-AUTH] ID token updated for user: Object
 adminApiRequest: Added auth header for /api/admin/login-audit
 [DEBUG-AUTH] Storing new auth token in localStorage, tokenLength: 1014
 [DEBUG-AUTH] Setting adminSessionActive flag
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
 [DEBUG-AUTH] ID token updated for user: Object
 adminApiRequest: Added auth header for /api/admin/media-validation-reports
 [DEBUG-AUTH] Storing new auth token in localStorage, tokenLength: 1014
 [DEBUG-AUTH] Setting adminSessionActive flag
 adminApiRequest: Added auth header for /api/admin/media-validation-status
 AuthService: Roles are in sync: admin
 adminApiRequest: /api/admin/media-validation-status response status: 200
 adminApiRequest: /api/admin/media-validation-reports response status: 200
 AuthService: Roles are in sync: admin
 [DEBUG-AUTH] AuthService.onIdTokenChanged: Token updated
 [DEBUG-AUTH] ID token updated for user: Object
 adminApiRequest: Added auth header for /api/admin/media-validation-reports
 [DEBUG-AUTH] Storing new auth token in localStorage, tokenLength: 1014
 [DEBUG-AUTH] Setting adminSessionActive flag
 adminApiRequest: Added auth header for /api/admin/media-validation-reports
 AuthService: Roles are in sync: admin
 adminApiRequest: /api/admin/media-validation-reports response status: 200
 AuthService: Roles are in sync: admin
 TSS: Counted history being pushed
 TSS: Caught history
 TSS: Checking if repeated 500 times for interval 1000 against data:  Object
 [DEBUG-AUTH] AuthService.onIdTokenChanged: Token updated
 [DEBUG-AUTH] ID token updated for user: Object
 adminApiRequest: Added auth header for /api/admin/media-validation-status
 [DEBUG-AUTH] Storing new auth token in localStorage, tokenLength: 1014
 [DEBUG-AUTH] Setting adminSessionActive flag
 AuthService: Roles are in sync: admin
 adminApiRequest: /api/admin/media-validation-status response status: 200
 adminApiRequest: /api/admin/media-validation-reports response status: 200
 AdminAuthGuard: Verifying admin authentication...
 AdminAuthProvider: Verifying admin session
 AdminAuthGuard: Setting up periodic token refresh
 AdminAuthGuard: Setting up user activity tracking
 AuthService: Roles are in sync: admin
 [DEBUG-AUTH] AuthService.onIdTokenChanged: Token updated
 [DEBUG-AUTH] ID token updated for user: Object
 [DEBUG-AUTH] Storing new auth token in localStorage, tokenLength: 1014
 [DEBUG-AUTH] Setting adminSessionActive flag
use-admin-auth.ts:455 AdminAuthProvider: Admin session verified successfully
AdminAuthGuard.tsx:49 AdminAuthGuard: Admin session valid, refreshing token
auth-service.ts:627 [DEBUG-AUTH] AuthService.onIdTokenChanged: Token updated
auth-service.ts:643 [DEBUG-AUTH] ID token updated for user: Object
auth-service.ts:403 AuthService: Token refreshed and stored with timestamp
use-admin-auth.ts:364 AdminAuthProvider: Refreshing admin session
auth-service.ts:661 [DEBUG-AUTH] Storing new auth token in localStorage, tokenLength: 1014
auth-service.ts:672 [DEBUG-AUTH] Setting adminSessionActive flag
auth-service.ts:521 AuthService: Roles are in sync: admin
adminApiUtils.ts:29 adminApiRequest: Added auth header for /api/admin/activity
auth-service.ts:521 AuthService: Roles are in sync: admin
auth-service.ts:521 AuthService: Roles are in sync: admin
adminApiUtils.ts:46 adminApiRequest: /api/admin/activity response status: 200
use-admin-auth.ts:384 AdminAuthProvider: Session refreshed successfully
AdminAuthGuard.tsx:57 AdminAuthGuard: Authentication verified and refreshed
MediaValidationPanel.tsx:268 Uncaught TypeError: Cannot read properties of undefined (reading 'length')
    at MediaValidationPanel.tsx:268:38
    at Array.map (<anonymous>)
    at renderReportsPanel (MediaValidationPanel.tsx:230:18)
    at MediaValidationPanel (MediaValidationPanel.tsx:389:13)
    at renderWithHooks (chunk-RPCDYKBN.js?v=df54cadb:11548:26)
    at mountIndeterminateComponent (chunk-RPCDYKBN.js?v=df54cadb:14926:21)
    at beginWork (chunk-RPCDYKBN.js?v=df54cadb:15914:22)
    at HTMLUnknownElement.callCallback2 (chunk-RPCDYKBN.js?v=df54cadb:3674:22)
    at Object.invokeGuardedCallbackDev (chunk-RPCDYKBN.js?v=df54cadb:3699:24)
    at invokeGuardedCallback (chunk-RPCDYKBN.js?v=df54cadb:3733:39)
MediaValidationPanel.tsx:268 Uncaught TypeError: Cannot read properties of undefined (reading 'length')
    at MediaValidationPanel.tsx:268:38
    at Array.map (<anonymous>)
    at renderReportsPanel (MediaValidationPanel.tsx:230:18)
    at MediaValidationPanel (MediaValidationPanel.tsx:389:13)
    at renderWithHooks (chunk-RPCDYKBN.js?v=df54cadb:11548:26)
    at mountIndeterminateComponent (chunk-RPCDYKBN.js?v=df54cadb:14926:21)
    at beginWork (chunk-RPCDYKBN.js?v=df54cadb:15914:22)
    at HTMLUnknownElement.callCallback2 (chunk-RPCDYKBN.js?v=df54cadb:3674:22)
    at Object.invokeGuardedCallbackDev (chunk-RPCDYKBN.js?v=df54cadb:3699:24)
    at invokeGuardedCallback (chunk-RPCDYKBN.js?v=df54cadb:3733:39)
hook.js:608 The above error occurred in the <MediaValidationPanel> component:

    at MediaValidationPanel (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/components/admin/MediaValidationPanel.tsx:32:37)
    at div
    at MediaValidation
    at main
    at div
    at div
    at AdminLayout (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/components/layouts/AdminLayout.tsx:44:39)
    at AdminAuthGuard (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/components/admin/AdminAuthGuard.tsx:24:34)
    at withAdminLayout(MediaValidation)
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
    at App (https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/src/App.tsx?v=BlumkUnl2DFeZteZwzNg1:139:3)

Consider adding an error boundary to your tree to customize error handling behavior.
Visit https://reactjs.org/link/error-boundaries to learn more about error boundaries.
overrideMethod @ hook.js:608
chunk-RPCDYKBN.js?v=df54cadb:19413 Uncaught TypeError: Cannot read properties of undefined (reading 'length')
    at MediaValidationPanel.tsx:268:38
    at Array.map (<anonymous>)
    at renderReportsPanel (MediaValidationPanel.tsx:230:18)
    at MediaValidationPanel (MediaValidationPanel.tsx:389:13)
    at renderWithHooks (chunk-RPCDYKBN.js?v=df54cadb:11548:26)
    at mountIndeterminateComponent (chunk-RPCDYKBN.js?v=df54cadb:14926:21)
    at beginWork (chunk-RPCDYKBN.js?v=df54cadb:15914:22)
    at beginWork$1 (chunk-RPCDYKBN.js?v=df54cadb:19753:22)
    at performUnitOfWork (chunk-RPCDYKBN.js?v=df54cadb:19198:20)
    at workLoopSync (chunk-RPCDYKBN.js?v=df54cadb:19137:13)
AdminAuthGuard.tsx:97 AdminAuthGuard: Clearing periodic token refresh
auth-service.ts:521 AuthService: Roles are in sync: admin
