/**
 * Test Admin Finance Access
 * 
 * This script tests if a Super Admin can access finance admin routes.
 * It simulates API calls to the payouts endpoints with Admin authentication.
 */
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Initialize Firebase app
const firebaseConfig = {
  apiKey: "AIzaSyCzMn6SYVaOQzKB3UrJ9_vOhdT0X3qvGpU",
  authDomain: "etoile-yachts.firebaseapp.com",
  projectId: "etoile-yachts",
  storageBucket: "etoile-yachts.appspot.com",
  messagingSenderId: "823218536201",
  appId: "1:823218536201:web:11e1a3fd0b2def97aa41b7",
  measurementId: "G-PXFB5EXGF0"
};

const app = initializeApp(firebaseConfig);

// Test admin credentials - these should be for a Super Admin account
const TEST_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@etoileyachts.com';
const TEST_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'admin123';

/**
 * Main test function
 */
async function testAdminFinanceAccess() {
  try {
    console.log('Starting admin finance access test...');
    console.log(`Testing with email: ${TEST_EMAIL}`);
    
    // Sign in with test admin credentials
    const auth = getAuth(app);
    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
    
    if (!userCredential.user) {
      console.error('Failed to sign in with test credentials');
      process.exit(1);
    }
    
    console.log(`Successfully signed in as: ${userCredential.user.email}`);
    
    // Get auth token
    const idToken = await userCredential.user.getIdToken();
    console.log('Retrieved authentication token');
    
    // Create axios instance with auth headers
    const api = axios.create({
      baseURL: 'http://localhost:5000',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Test route 1: Get payout API info
    console.log('Testing route: GET /api/admin/payouts');
    const infoResponse = await api.get('/api/admin/payouts');
    console.log('Response status:', infoResponse.status);
    console.log('Response data:', infoResponse.data);
    
    // Test route 2: Get payout settings
    console.log('\nTesting route: GET /api/admin/payouts/settings');
    try {
      const settingsResponse = await api.get('/api/admin/payouts/settings');
      console.log('Response status:', settingsResponse.status);
      console.log('Response data:', settingsResponse.data);
    } catch (error) {
      console.error('Settings route error:', error.response?.status, error.response?.data || error.message);
    }
    
    // Test route 3: Get transactions
    console.log('\nTesting route: GET /api/admin/payouts/transactions');
    try {
      const transactionsResponse = await api.get('/api/admin/payouts/transactions');
      console.log('Response status:', transactionsResponse.status);
      console.log('Transaction count:', transactionsResponse.data?.length || 0);
    } catch (error) {
      console.error('Transactions route error:', error.response?.status, error.response?.data || error.message);
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testAdminFinanceAccess()
  .catch(error => {
    console.error('Test execution error:', error);
    process.exit(1);
  });

// Export for potential future imports
export { testAdminFinanceAccess };