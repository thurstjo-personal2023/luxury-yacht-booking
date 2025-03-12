 Removing unpermitted intrinsics
 [vite] connecting...
 [vite] connected.
 Setting up auth state listener for Firebase...
 Connecting to Firebase emulators...
 Fetching emulator configuration from server...
 Connected to external Firestore emulator on port 8080
 Initializing Firestore collections in emulator...
 Firebase Auth state changed: User signed out
 Auth state change: User signed out
 Auth token removed from localStorage
 Retrieved emulator configuration: Object
 ✓ Auth emulator connected at: http://localhost:9099
 [2025-03-12T18:32:41.187Z]  @firebase/firestore: Firestore (11.3.1): Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used.
overrideMethod @ installHook.js:1
 Failed to connect to Firestore emulator: FirebaseError: [code=failed-precondition]: Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.
overrideMethod @ installHook.js:1
 ✓ Storage emulator connected at: http://localhost:9199
 ✓ Functions emulator connected at: http://localhost:5001
 [2025-03-12T18:32:41.190Z]  @firebase/database: FIREBASE FATAL ERROR: Cannot call useEmulator() after instance has already been initialized. 
overrideMethod @ installHook.js:1
 Failed to connect to RTDB emulator: Error: FIREBASE FATAL ERROR: Cannot call useEmulator() after instance has already been initialized. 
overrideMethod @ installHook.js:1
 Firebase emulators connection attempt completed
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
 QueryFn: Fetching data from /api/yachts/featured
 No current user in auth - cannot get fresh token
 QueryFn: No authorization header available
overrideMethod @ installHook.js:1
 QueryFn: Sending fetch request...
/login:1 [DOM] Input elements should have autocomplete attributes (suggested: "current-password"): (More info: https://goo.gl/9p2vKq) 
 Event target tag: INPUT
 Current value: a
 Current shortcuts: Array(0)
 Data received in content script: Array(0)
 Event target tag: INPUT
 Current value: al
 Current shortcuts: Array(0)
 Data received in content script: Array(0)
 Event target tag: INPUT
 Current value: ally.gee@hotmail.com
 Current shortcuts: Array(0)
 Data received in content script: Array(0)
 Event target tag: INPUT
 Current value: R
 Current shortcuts: Array(0)
 Data received in content script: Array(0)
 Event target tag: INPUT
 Current value: Ra
 Current shortcuts: Array(0)
 Data received in content script: Array(0)
 Event target tag: INPUT
 Current value: Rap
 Current shortcuts: Array(0)
 Data received in content script: Array(0)
 Event target tag: INPUT
 Current value: Rap0
 Current shortcuts: Array(0)
 Data received in content script: Array(0)
 Event target tag: INPUT
 Current value: Rap0!
 Current shortcuts: Array(0)
 Data received in content script: Array(0)
 Event target tag: INPUT
 Current value: Rap0!2
 Current shortcuts: Array(0)
 Data received in content script: Array(0)
 Event target tag: INPUT
 Current value: Rap0!23
 Current shortcuts: Array(0)
contentScript.bundle.js:4785 Data received in content script: Array(0)
contentScript.bundle.js:4785 Event target tag: INPUT
contentScript.bundle.js:4785 Current value: Rap0!23r
contentScript.bundle.js:4785 Current shortcuts: Array(0)
contentScript.bundle.js:4785 Data received in content script: Array(0)
contentScript.bundle.js:4785 Event target tag: INPUT
contentScript.bundle.js:4785 Current value: Rap0!23ra
contentScript.bundle.js:4785 Current shortcuts: Array(0)
contentScript.bundle.js:4785 Data received in content script: Array(0)
contentScript.bundle.js:4785 Event target tag: INPUT
contentScript.bundle.js:4785 Current value: Rap0!23rap
contentScript.bundle.js:4785 Current shortcuts: Array(0)
contentScript.bundle.js:4785 Data received in content script: Array(0)
firebase.ts:42 Firebase Auth state changed: User xTbRuemjT5iOajTbuNQVDIQxrfEn signed in
firebase.ts:46 Auth state change: User authenticated Object
firebase.ts:54 Requesting fresh token on auth state change...
firebase.ts:62 Auth token refreshed and stored in localStorage: eyJhbGciOi...4ifQ.
firebase.ts:66 Refreshing user claims...
firebase.ts:68 User claims refreshed successfully
firebase.ts:76 Setting up token refresh interval: 10 minutes
firebase.ts:98 Token refresh interval set up and stored
Login.tsx:75 Successfully retrieved and standardized user profile: Object
queryClient.ts:145 QueryFn: Fetching data from /api/yachts/producer
queryClient.ts:145 QueryFn: Fetching data from /api/bookings/producer
queryClient.ts:145 QueryFn: Fetching data from /api/reviews/producer
queryClient.ts:36 Successfully obtained fresh auth token
queryClient.ts:156 QueryFn: Using token: eyJhbGciOi...4ifQ.
queryClient.ts:163 QueryFn: Sending fetch request...
queryClient.ts:36 Successfully obtained fresh auth token
queryClient.ts:156 QueryFn: Using token: eyJhbGciOi...4ifQ.
queryClient.ts:163 QueryFn: Sending fetch request...
queryClient.ts:36 Successfully obtained fresh auth token
queryClient.ts:156 QueryFn: Using token: eyJhbGciOi...4ifQ.
queryClient.ts:163 QueryFn: Sending fetch request...
queryClient.ts:171 QueryFn: Response status: 200 OK
hook.js:608 QueryFn: Error fetching data: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
overrideMethod @ hook.js:608
queryClient.ts:171 QueryFn: Response status: 200 OK
hook.js:608 QueryFn: Error fetching data: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
overrideMethod @ hook.js:608
firebase_database.js?v=8d546569:1380 WebSocket connection to 'wss://s-usc1a-nss-2060.firebaseio.com/.ws?v=5&s=YHNUuKLUZ3VS7OYVZHcRqlmA9BAI5l8q&p=1:467337842870:web:83cf97fcb504adb19c5617&ns=etoile-yachts-default-rtdb' failed: WebSocket is closed before the connection is established.
shutdown_ @ firebase_database.js?v=8d546569:1380
hook.js:608 [2025-03-12T18:32:59.940Z]  @firebase/database: FIREBASE WARNING: Provided authentication credentials for the app named "[DEFAULT]" are invalid. This usually indicates your app was not initialized correctly. Make sure the "apiKey" and "databaseURL" properties provided to initializeApp() match the values provided for your app at https://console.firebase.google.com/. 
overrideMethod @ hook.js:608
queryClient.ts:145 QueryFn: Fetching data from /api/bookings/producer
queryClient.ts:36 Successfully obtained fresh auth token
queryClient.ts:156 QueryFn: Using token: eyJhbGciOi...4ifQ.
queryClient.ts:163 QueryFn: Sending fetch request...
queryClient.ts:145 QueryFn: Fetching data from /api/reviews/producer
queryClient.ts:36 Successfully obtained fresh auth token
queryClient.ts:156 QueryFn: Using token: eyJhbGciOi...4ifQ.
queryClient.ts:163 QueryFn: Sending fetch request...
queryClient.ts:171 QueryFn: Response status: 200 OK
hook.js:608 QueryFn: Error fetching data: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
overrideMethod @ hook.js:608
queryClient.ts:171 QueryFn: Response status: 200 OK
hook.js:608 QueryFn: Error fetching data: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
overrideMethod @ hook.js:608
firebase_database.js?v=8d546569:1380 WebSocket connection to 'wss://s-usc1a-nss-2060.firebaseio.com/.ws?v=5&s=Bnd0KUx1W9KcLgULvTh6ctbCdQFp1LaR&p=1:467337842870:web:83cf97fcb504adb19c5617&ns=etoile-yachts-default-rtdb' failed: WebSocket is closed before the connection is established.
shutdown_ @ firebase_database.js?v=8d546569:1380
hook.js:608 [2025-03-12T18:33:00.836Z]  @firebase/database: FIREBASE WARNING: Provided authentication credentials for the app named "[DEFAULT]" are invalid. This usually indicates your app was not initialized correctly. Make sure the "apiKey" and "databaseURL" properties provided to initializeApp() match the values provided for your app at https://console.firebase.google.com/. 
overrideMethod @ hook.js:608
queryClient.ts:145 QueryFn: Fetching data from /api/producer/yachts
queryClient.ts:145 QueryFn: Fetching data from /api/producer/addons
queryClient.ts:145 QueryFn: Fetching data from /api/producer/yachts
queryClient.ts:145 QueryFn: Fetching data from /api/producer/addons
queryClient.ts:36 Successfully obtained fresh auth token
queryClient.ts:156 QueryFn: Using token: eyJhbGciOi...4ifQ.
queryClient.ts:163 QueryFn: Sending fetch request...
AssetManagement.tsx:219 Refreshed token before fetching producer data
AssetManagement.tsx:162 Fetching producer data for user ID: xTbRuemjT5iOajTbuNQVDIQxrfEn
queryClient.ts:36 Successfully obtained fresh auth token
queryClient.ts:156 QueryFn: Using token: eyJhbGciOi...4ifQ.
queryClient.ts:163 QueryFn: Sending fetch request...
queryClient.ts:36 Successfully obtained fresh auth token
queryClient.ts:156 QueryFn: Using token: eyJhbGciOi...4ifQ.
queryClient.ts:163 QueryFn: Sending fetch request...
queryClient.ts:36 Successfully obtained fresh auth token
queryClient.ts:156 QueryFn: Using token: eyJhbGciOi...4ifQ.
queryClient.ts:163 QueryFn: Sending fetch request...
AssetManagement.tsx:178 Found producer data: Object
firebase_database.js?v=8d546569:1380 WebSocket connection to 'wss://s-usc1a-nss-2060.firebaseio.com/.ws?v=5&s=hV1DRdcttANY4y7PiQjoAdGVFas2iGkU&p=1:467337842870:web:83cf97fcb504adb19c5617&ns=etoile-yachts-default-rtdb' failed: WebSocket is closed before the connection is established.
shutdown_ @ firebase_database.js?v=8d546569:1380
hook.js:608 [2025-03-12T18:33:06.130Z]  @firebase/database: FIREBASE WARNING: Provided authentication credentials for the app named "[DEFAULT]" are invalid. This usually indicates your app was not initialized correctly. Make sure the "apiKey" and "databaseURL" properties provided to initializeApp() match the values provided for your app at https://console.firebase.google.com/. 
overrideMethod @ hook.js:608
firebase_database.js?v=8d546569:968 [Violation] Avoid using document.write(). https://developers.google.com/web/updates/2016/08/removing-document-write
_FirebaseIFrameScriptHolder @ firebase_database.js?v=8d546569:968
(anonymous) @ firebase_database.js?v=8d546569:762
executeWhenDOMReady @ firebase_database.js?v=8d546569:212
open @ firebase_database.js?v=8d546569:758
(anonymous) @ firebase_database.js?v=8d546569:1553
VM365 .lp:6 [2025-03-12T18:33:22.744Z]  @firebase/database: FIREBASE WARNING: Provided authentication credentials for the app named "[DEFAULT]" are invalid. This usually indicates your app was not initialized correctly. Make sure the "apiKey" and "databaseURL" properties provided to initializeApp() match the values provided for your app at https://console.firebase.google.com/. 
overrideMethod @ hook.js:608
defaultLogHandler @ chunk-RQVQBE7F.js?v=8d546569:1378
warn @ chunk-RQVQBE7F.js?v=8d546569:1442
warn @ firebase_database.js?v=8d546569:199
notifyForInvalidToken @ firebase_database.js?v=8d546569:512
onAuthRevoked_ @ firebase_database.js?v=8d546569:2940
(anonymous) @ firebase_database.js?v=8d546569:2433
onDataMessage_ @ firebase_database.js?v=8d546569:2640
onDataMessage_ @ firebase_database.js?v=8d546569:1676
onPrimaryMessageReceived_ @ firebase_database.js?v=8d546569:1671
(anonymous) @ firebase_database.js?v=8d546569:1593
(anonymous) @ firebase_database.js?v=8d546569:680
exceptionGuard @ firebase_database.js?v=8d546569:397
handleResponse @ firebase_database.js?v=8d546569:679
(anonymous) @ firebase_database.js?v=8d546569:791
pRTLPCB @ VM365 .lp:6
(anonymous) @ VM385 .lp:1
queryClient.ts:171 QueryFn: Response status: 200 OK
queryClient.ts:191 QueryFn: Successfully parsed JSON response with 0 keys
queryClient.ts:193 QueryFn: Array response with 0 items
firebase_database.js?v=8d546569:968 [Violation] Avoid using document.write(). https://developers.google.com/web/updates/2016/08/removing-document-write
_FirebaseIFrameScriptHolder @ firebase_database.js?v=8d546569:968
(anonymous) @ firebase_database.js?v=8d546569:762
executeWhenDOMReady @ firebase_database.js?v=8d546569:212
open @ firebase_database.js?v=8d546569:758
(anonymous) @ firebase_database.js?v=8d546569:1553
producer:1 
            
            
           Failed to load resource: the server responded with a status of 404 (Not Found)
queryClient.ts:171 QueryFn: Response status: 404 Not Found
queryClient.ts:199 QueryFn: Error fetching data: Error: 404: {"message":"Yacht not found"}
    at throwIfResNotOk (queryClient.ts:19:11)
    at async queryClient.ts:185:7
overrideMethod @ hook.js:608
(anonymous) @ queryClient.ts:199
