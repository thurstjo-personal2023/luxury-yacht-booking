import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, addProducerIdToTestYachts } from "./storage";
import { registerStripeRoutes } from "./stripe";
import { adminDb, adminAuth, verifyAuth } from "./firebase-admin";
import { spawn } from "child_process";
import path from "path";
import { FieldValue } from "firebase-admin/firestore";
import { standardizeUser, UserType } from "../shared/user-schema";
import { registerUserProfileRoutes } from "./user-profile-routes";
import { createAllYachtExperiences, fixGrandTourYacht } from './create-yacht-experiences';
import { ServiceProviderProfile } from "../shared/harmonized-user-schema";

import { insertTestYachts } from "./create-test-data";

/**
 * Get the harmonized producer ID for a user
 * This helps ensure consistent producer/provider ID usage across the application
 * 
 * @param authUserId The authenticated user ID from Firebase Auth (or undefined)
 * @returns Object with producerId and partnerId
 */
async function getHarmonizedProducerIds(authUserId: string | undefined): Promise<{
  producerId: string,
  partnerId: string
}> {
  // Default to using auth ID as fallback, or 'unknown-producer' if undefined
  const defaultId = authUserId || 'unknown-producer';
  let producerId = defaultId;
  let partnerId = defaultId;
  
  try {
    // Skip the query if auth ID is undefined
    if (!authUserId) {
      console.log('No auth user ID provided, using default ID');
      return { producerId, partnerId };
    }
    
    // Query the harmonized_users collection
    const userSnapshot = await adminDb.collection('harmonized_users')
      .where('userId', '==', authUserId)
      .limit(1)
      .get();
    
    if (!userSnapshot.empty) {
      const userData = userSnapshot.docs[0].data();
      console.log(`Found harmonized user data for ID ${authUserId}`);
      
      // Use the standardized producer/provider IDs if available
      if (userData.role === 'producer' && userData.producerId) {
        producerId = userData.producerId;
        partnerId = userData.producerId; // Use same ID for both by default
      }
      
      // Use partnerId if explicitly different
      if (userData.role === 'producer' && userData.partnerId) {
        partnerId = userData.partnerId;
      }
    } else {
      console.log(`No harmonized user found for ID ${authUserId}, using auth ID as fallback`);
    }
  } catch (error) {
    console.warn(`Error fetching harmonized user data for ID ${authUserId}:`, error);
    // Continue with auth ID as fallback
  }
  
  return { producerId, partnerId };
}

/**
 * Get a yacht by its ID
 * This endpoint is accessible to both authenticated and unauthenticated users
 * to allow guest browsing of yacht details
 */
export async function getYachtById(yachtId: string): Promise<any> {
  try {
    console.log(`[SERVER] Fetching yacht details for ID: ${yachtId}`);
    
    // Try to fetch from unified_yacht_experiences collection first
    const yachtDoc = await adminDb.collection("unified_yacht_experiences").doc(yachtId).get();
    
    if (yachtDoc.exists) {
      const yachtData = { id: yachtDoc.id, ...yachtDoc.data() };
      console.log(`[SERVER] Successfully found yacht ${yachtId} in unified_yacht_experiences`);
      return yachtData;
    }
    
    // If not found, return null
    console.log(`[SERVER] Yacht ${yachtId} not found in any collection`);
    return null;
  } catch (error) {
    console.error(`[SERVER] Error fetching yacht details for ID ${yachtId}:`, error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Add endpoint to provide emulator host information
  app.get("/api/emulator-config", (req: Request, res: Response) => {
    try {
      // Build a config object with emulator host information
      const config = {
        hosts: {
          firestore: process.env.FIRESTORE_EMULATOR_HOST || "localhost:8080",
          auth: process.env.FIREBASE_AUTH_EMULATOR_HOST || "localhost:9099",
          storage: process.env.FIREBASE_STORAGE_EMULATOR_HOST || "localhost:9199",
          functions: process.env.FUNCTIONS_EMULATOR_HOST || "localhost:5001",
          rtdb: process.env.FIREBASE_DATABASE_EMULATOR_HOST || "localhost:9001",
          pubsub: process.env.PUBSUB_EMULATOR_HOST || "localhost:8085",
          eventarc: process.env.EVENTARC_EMULATOR_HOST || "localhost:9299",
          dataconnect: process.env.DATA_CONNECT_EMULATOR_HOST || "localhost:9399",
          tasks: process.env.CLOUD_TASKS_EMULATOR_HOST || "localhost:9499",
          hub: process.env.FIREBASE_EMULATOR_HUB || "localhost:4400"
        },
        connected: true,
        timestamp: Date.now()
      };
      
      // Test Firestore connection by making a simple query
      try {
        // Quick check to see if we can successfully connect to Firestore
        adminDb.collection('connection_test').doc('status').set({
          lastCheck: FieldValue.serverTimestamp(),
          status: 'ok'
        }, { merge: true }).catch(err => {
          console.warn('Emulator connection test failed:', err.code);
          // Don't throw, just continue - UI will display limited connection status
        });
      } catch (connErr) {
        console.warn('Emulator connection test failed:', connErr);
        // Don't modify the response, let the client handle connection issues
      }
      
      // Return the config as JSON
      res.json(config);
    } catch (error) {
      console.error("Error providing emulator config:", error);
      res.status(500).json({ error: "Failed to provide emulator configuration" });
    }
  });
  // Development route to create test data
  app.post("/api/dev/create-test-data", async (req, res) => {
    try {
      const result = await insertTestYachts();
      res.json(result);
    } catch (error) {
      console.error("Error creating test data:", error);
      res.status(500).json({ error: "Failed to create test data" });
    }
  });
  
  // Development route to add producer IDs to test data
  app.post("/api/dev/add-producer-ids", async (req, res) => {
    try {
      const producerId = req.query.producerId as string || 'test-producer-123';
      const result = await addProducerIdToTestYachts(producerId);
      
      if (result) {
        res.json({ success: true, message: `Added producer ID ${producerId} to test yachts` });
      } else {
        res.status(404).json({ success: false, message: "No yachts found to update" });
      }
    } catch (error) {
      console.error("Error adding producer IDs:", error);
      res.status(500).json({ error: "Failed to add producer IDs" });
    }
  });
  
  // Admin route for standardizing collections (yachts and add-ons)
  app.post("/api/admin/standardize-collection", async (req, res) => {
    try {
      const { collection } = req.body;
      
      if (!collection) {
        return res.status(400).json({ 
          success: false, 
          message: "Collection name is required" 
        });
      }
      
      // Execute the appropriate standardization script based on collection name
      let scriptPath = '';
      if (collection === 'unified_yacht_experiences') {
        scriptPath = path.resolve(__dirname, '../scripts/standardize-unified-collection.js');
      } else if (collection === 'products_add_ons') {
        scriptPath = path.resolve(__dirname, '../scripts/standardize-addons-collection.js');
      } else {
        return res.status(400).json({ 
          success: false, 
          message: `Unsupported collection: ${collection}` 
        });
      }
      
      // Run the standardization script as a separate process
      const standardizeProcess = spawn('node', [scriptPath]);
      
      let dataOutput = '';
      let errorOutput = '';
      
      standardizeProcess.stdout.on('data', (data) => {
        dataOutput += data.toString();
        console.log(`Standardization stdout: ${data}`);
      });
      
      standardizeProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error(`Standardization stderr: ${data}`);
      });
      
      standardizeProcess.on('close', (code) => {
        if (code === 0) {
          const processedCount = (dataOutput.match(/Found (\d+) documents to standardize/)?.[1] || '0');
          const updatedCount = (dataOutput.match(/Successfully standardized (\d+) documents/)?.[1] || '0');
          
          res.json({
            success: true,
            message: `Successfully standardized ${collection} collection`,
            details: {
              processedCount: parseInt(processedCount, 10),
              updatedCount: parseInt(updatedCount, 10),
              errors: []
            }
          });
        } else {
          // Extract error details from stderr output if available
          const errors = errorOutput.split('\n').filter(line => line.includes('Error') || line.includes('error'));
          
          res.status(500).json({
            success: false,
            message: `Failed to standardize ${collection} collection (exit code ${code})`,
            details: {
              processedCount: 0,
              updatedCount: 0,
              errors: errors.length > 0 ? errors : [`Script exited with code ${code}`]
            }
          });
        }
      });
    } catch (error) {
      console.error(`Error standardizing collection:`, error);
      res.status(500).json({ 
        success: false, 
        message: "Error standardizing collection",
        details: {
          processedCount: 0,
          updatedCount: 0,
          errors: [String(error)]
        }
      });
    }
  });
  // New unified API endpoints
  
  // Get featured yachts (specific route needs to be defined before generic routes with params)
  app.get("/api/yachts/featured", async (req, res) => {
    try {
      const featuredYachts = await storage.getFeaturedYachts();
      res.json(featuredYachts);
    } catch (error) {
      console.error("Error fetching featured yachts:", error);
      res.status(500).json({ 
        message: "Error fetching featured yachts", 
        error: String(error)
      });
    }
  });
  
  // Get recommended yachts for a user
  app.get("/api/yachts/recommended", async (req, res) => {
    try {
      // Get user ID from authentication if available, but don't require it
      const userId = req.headers.authorization ? 
        (req as any).user?.uid : // For authenticated users
        null; // For guests
      
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 6;
      
      // Get featured yachts for non-authenticated users
      let recommendedYachts;
      if (userId) {
        // If user is authenticated, get personalized recommendations
        recommendedYachts = await storage.getRecommendedYachts(userId, limit);
      } else {
        // For guests, return featured yachts
        recommendedYachts = await storage.getFeaturedYachts();
      }
      
      res.json(recommendedYachts);
    } catch (error) {
      console.error("Error fetching recommended yachts:", error);
      res.status(500).json({ 
        message: "Error fetching recommended yachts", 
        error: String(error)
      });
    }
  });
  
  // Get all yachts with pagination and filtering
  app.get("/api/yachts", async (req, res) => {
    try {
      const { 
        type, 
        region, 
        port_marina: portMarina, 
        page = '1', 
        pageSize = '10',
        sortByStatus = 'true'
      } = req.query;
      
      const filters = {
        type: type as string | undefined,
        region: region as string | undefined,
        portMarina: portMarina as string | undefined,
        page: parseInt(page as string, 10),
        pageSize: parseInt(pageSize as string, 10),
        sortByStatus: sortByStatus === 'true'
      };
      
      // Get the data from storage
      const result = await storage.getAllYachts(filters);
      res.json(result);
    } catch (error) {
      console.error("Error fetching yachts:", error);
      res.status(500).json({ 
        message: "Error fetching yachts", 
        error: String(error)
      });
    }
  });
  
  // Search yachts with query string and filters
  app.get("/api/yachts/search", async (req, res) => {
    try {
      const { 
        q, 
        type, 
        region, 
        port_marina: portMarina,
        min_price: minPrice,
        max_price: maxPrice,
        capacity,
        tags,
        page = '1', 
        pageSize = '10'
      } = req.query;
      
      // Validate query string is present
      if (!q) {
        return res.status(400).json({ message: "Search query parameter 'q' is required" });
      }
      
      // Parse tags if provided
      let parsedTags: string[] | undefined;
      if (tags) {
        try {
          // If tags is a string, try to parse it as JSON
          if (typeof tags === 'string') {
            parsedTags = JSON.parse(tags as string);
          } else if (Array.isArray(tags)) {
            // If it's already an array, use it directly
            parsedTags = tags as string[];
          }
        } catch (e) {
          console.warn('Could not parse tags parameter:', e);
        }
      }
      
      const filters = {
        type: type as string | undefined,
        region: region as string | undefined,
        portMarina: portMarina as string | undefined,
        minPrice: minPrice ? parseInt(minPrice as string, 10) : undefined,
        maxPrice: maxPrice ? parseInt(maxPrice as string, 10) : undefined,
        capacity: capacity ? parseInt(capacity as string, 10) : undefined,
        tags: parsedTags,
        page: parseInt(page as string, 10),
        pageSize: parseInt(pageSize as string, 10)
      };
      
      console.log('Search query:', q);
      console.log('Search filters:', filters);
      
      // Get the search results from storage
      const result = await storage.searchYachts(q as string, filters);
      res.json(result);
    } catch (error) {
      console.error("Error searching yachts:", error);
      res.status(500).json({ 
        message: "Error searching yachts", 
        error: String(error)
      });
    }
  });
  
  // Get yacht by ID
  app.get("/api/yachts/:id", async (req, res) => {
    try {
      // Set cache control headers to prevent caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const { id } = req.params;
      // Force fresh data with a timestamp
      const forceRefresh = Date.now();
      console.log(`Getting yacht by ID: ${id} (refresh: ${forceRefresh})`);
      
      const yacht = await storage.getYachtById(id);
      
      if (!yacht) {
        return res.status(404).json({ message: "Yacht not found" });
      }
      
      res.json(yacht);
    } catch (error) {
      console.error(`Error fetching yacht with ID ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Error fetching yacht", 
        error: String(error)
      });
    }
  });
  
  // Booking API endpoints
  app.post("/api/bookings", verifyAuth, async (req: Request, res: Response) => {
    try {
      const { user } = req;
      
      if (!user || !user.uid) {
        return res.status(401).json({ error: "Unauthorized", details: "User authentication required" });
      }
      
      const { 
        packageId, 
        startDate, 
        endDate, 
        timeSlot, 
        totalPrice, 
        addOns 
      } = req.body;
      
      if (!packageId || !startDate || !endDate || !timeSlot || totalPrice === undefined) {
        return res.status(400).json({ error: "Bad Request", details: "Missing required booking information" });
      }
      
      console.log(`Creating booking for user ${user.uid} for package ${packageId}`);
      
      // Create booking record
      const bookingRef = await adminDb.collection("bookings").add({
        userId: user.uid,
        packageId,
        startDate,
        endDate,
        timeSlot,
        totalPrice,
        status: "confirmed",
        addOns: addOns || [],
        createdAt: FieldValue.serverTimestamp(),
      });
      
      console.log(`Created booking record: ${bookingRef.id} for user ${user.uid}`);
      
      return res.status(201).json({ 
        success: true, 
        bookingId: bookingRef.id,
        message: "Booking created successfully" 
      });
    } catch (error) {
      console.error("Error creating booking:", error);
      return res.status(500).json({ 
        error: "Internal Server Error", 
        details: String(error) 
      });
    }
  });
  
  // Get user bookings
  app.get("/api/user/bookings", verifyAuth, async (req: Request, res: Response) => {
    try {
      const { user } = req;
      
      if (!user || !user.uid) {
        return res.status(401).json({ error: "Unauthorized", details: "User authentication required" });
      }
      
      console.log(`Fetching bookings for user ${user.uid}`);
      
      // Use storage interface which handles the index issue and has proper error handling
      const bookingsData = await storage.getUserBookings(user.uid);
      
      if (bookingsData.length === 0) {
        console.log(`No bookings found for user ${user.uid}`);
        return res.json({ bookings: [] });
      }
      
      console.log(`Found ${bookingsData.length} bookings for user ${user.uid}`);
      return res.json({ bookings: bookingsData });
    } catch (error) {
      console.error("Error fetching user bookings:", error);
      return res.status(500).json({ 
        error: "Internal Server Error", 
        details: String(error) 
      });
    }
  });
  
  // Legacy bookings endpoint - keeping for compatibility
  app.get("/api/user/bookings-legacy", verifyAuth, async (req: Request, res: Response) => {
    try {
      const { user } = req;
      
      if (!user || !user.uid) {
        return res.status(401).json({ error: "Unauthorized", details: "User authentication required" });
      }
      
      console.log(`Fetching legacy bookings for user ${user.uid}`);
      
      // Get bookings from Firestore
      let bookingsSnapshot;
      try {
        bookingsSnapshot = await adminDb.collection("bookings")
          .where("userId", "==", user.uid)
          .get();
      } catch (error) {
        console.error("Error when querying bookings:", error);
        return res.status(500).json({ 
          error: "Internal Server Error", 
          details: String(error)
        });
      }
      
      if (bookingsSnapshot.empty) {
        console.log(`No bookings found for user ${user.uid}`);
        return res.json({ bookings: [] });
      }
      
      console.log(`Found ${bookingsSnapshot.size} bookings for user ${user.uid}`);
      
      // Extract data from snapshots
      const bookings = bookingsSnapshot.docs.map(doc => {
        return {
          id: doc.id,
          ...doc.data()
        };
      });
      
      return res.json({ bookings });
    } catch (error) {
      console.error("Error fetching user bookings:", error);
      return res.status(500).json({ 
        error: "Internal Server Error", 
        details: String(error) 
      });
    }
  });
  
  // Payment API endpoint
  app.post("/api/payments", verifyAuth, async (req: Request, res: Response) => {
    try {
      const { user } = req;
      
      if (!user || !user.uid) {
        return res.status(401).json({ error: "Unauthorized", details: "User authentication required" });
      }
      
      const { 
        bookingId, 
        amount, 
        currency, 
        paymentMethod, 
        transactionReference 
      } = req.body;
      
      if (!bookingId || amount === undefined || !currency || !paymentMethod) {
        return res.status(400).json({ error: "Bad Request", details: "Missing required payment information" });
      }
      
      console.log(`Creating payment record for booking ${bookingId}`);
      
      // Create payment record
      const paymentRef = await adminDb.collection("payments").add({
        bookingId,
        userId: user.uid,
        amount,
        currency,
        paymentMethod,
        status: "completed",
        transactionReference,
        createdDate: FieldValue.serverTimestamp(),
        lastUpdatedDate: FieldValue.serverTimestamp(),
      });
      
      console.log(`Created payment record: ${paymentRef.id} for booking ${bookingId}`);
      
      return res.status(201).json({ 
        success: true, 
        paymentId: paymentRef.id,
        message: "Payment record created successfully" 
      });
    } catch (error) {
      console.error("Error creating payment record:", error);
      return res.status(500).json({ 
        error: "Internal Server Error", 
        details: String(error) 
      });
    }
  });
  
  // Booking confirmation API endpoint
  app.post("/api/booking-confirmations", verifyAuth, async (req: Request, res: Response) => {
    try {
      const { user } = req;
      
      if (!user || !user.uid) {
        return res.status(401).json({ error: "Unauthorized", details: "User authentication required" });
      }
      
      const { 
        bookingId, 
        packageId, 
        paymentId 
      } = req.body;
      
      if (!bookingId || !packageId || !paymentId) {
        return res.status(400).json({ error: "Bad Request", details: "Missing required confirmation information" });
      }
      
      console.log(`Creating booking confirmation for booking ${bookingId}`);
      
      // Create confirmation record
      const confirmationRef = await adminDb.collection("booking_confirmations").add({
        bookingId,
        userId: user.uid,
        packageId,
        paymentId,
        confirmationDate: FieldValue.serverTimestamp(),
        emailSent: true,
        notificationSent: true,
      });
      
      console.log(`Created booking confirmation: ${confirmationRef.id}`);
      
      // Create a notification for the user
      const yachtSnapshot = await adminDb.collection("unified_yacht_experiences")
        .where("package_id", "==", packageId)
        .limit(1)
        .get();
      
      if (!yachtSnapshot.empty) {
        const yachtData = yachtSnapshot.docs[0].data();
        
        await adminDb.collection("notifications").add({
          title: "Booking Confirmed",
          message: `Your booking for ${yachtData.title || 'yacht experience'} has been confirmed.`,
          type: "Booking Confirmation",
          recipientId: user.uid,
          sentDate: FieldValue.serverTimestamp(),
          readStatus: false,
        });
      }
      
      return res.status(201).json({ 
        success: true, 
        confirmationId: confirmationRef.id,
        message: "Booking confirmation created successfully" 
      });
    } catch (error) {
      console.error("Error creating booking confirmation:", error);
      return res.status(500).json({ 
        error: "Internal Server Error", 
        details: String(error) 
      });
    }
  });
  
  // Activate/deactivate yacht endpoint
  app.post("/api/yachts/:id/activate", async (req, res) => {
    try {
      const { id } = req.params;
      const { active, timestamp } = req.body;
      
      console.log(`Activating/deactivating yacht ${id}: setting active=${active}, timestamp=${timestamp}`);
      
      // Verify we have the required parameters
      if (active === undefined) {
        return res.status(400).json({ message: "Missing 'active' field in request body" });
      }
      
      // Make the update through storage interface
      const updateData: any = { 
        // Cast to boolean to ensure consistent values
        isAvailable: !!active,
        // Include both naming conventions for maximum compatibility
        available: !!active,
        availability_status: !!active,
        // Add timestamp for cache busting
        _lastUpdated: timestamp || Date.now().toString(),
        // Add a mainImage field for yachts missing media
        // We're adding a placeholder to any yacht missing images
        mainImage: active ? 
          "https://images.unsplash.com/photo-1577032229840-33197764440d?w=800" : 
          "https://images.unsplash.com/photo-1577032229840-33197764440d?w=800"
      };
      
      const success = await storage.updateYacht(id, updateData);
      
      if (!success) {
        return res.status(404).json({ message: "Yacht not found or update failed" });
      }
      
      res.json({ 
        message: `Yacht ${active ? 'activated' : 'deactivated'} successfully`,
        id,
        active: active, // Ensure correct status is sent back
        timestamp: timestamp || Date.now().toString()
      });
    } catch (error) {
      console.error(`Error updating activation for yacht ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Error updating yacht activation status", 
        error: String(error)
      });
    }
  });
  
  // Activate/deactivate add-on endpoint
  app.post("/api/addon/:id/activate", async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive, timestamp } = req.body;
      
      console.log(`Activating/deactivating add-on ${id}: setting isActive=${isActive}, timestamp=${timestamp}`);
      
      // Verify we have the required parameters
      if (isActive === undefined) {
        return res.status(400).json({ message: "Missing 'isActive' field in request body" });
      }
      
      // Directly update in Firestore for now (we can add a storage method later)
      const addonRef = adminDb.collection('products_add_ons').doc(id);
      
      // Make the update
      await addonRef.update({
        // Cast to boolean to ensure consistent values
        availability: !!isActive,
        // Add timestamp for cache busting
        lastUpdatedDate: FieldValue.serverTimestamp(),
        _lastUpdated: timestamp || Date.now().toString()
      });
      
      res.json({ 
        success: true, 
        message: `Add-on ${id} activation status updated successfully`,
        timestamp: timestamp || Date.now().toString()
      });
    } catch (error) {
      console.error(`Error updating activation for add-on ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Error updating add-on activation status", 
        error: String(error)
      });
    }
  });

  // User API endpoints
  app.get("/api/users", async (req, res) => {
    try {
      const usersSnapshot = await adminDb.collection('users').get();
      
      if (usersSnapshot.empty) {
        return res.json({
          users: [],
          pagination: {
            currentPage: 1,
            pageSize: 10,
            totalCount: 0,
            totalPages: 0
          }
        });
      }
      
      // Use the standardizeUser function to ensure consistent user schema
      const users = usersSnapshot.docs.map(doc => {
        const rawData = doc.data();
        // Ensure the ID is set correctly
        const userData = { ...rawData, id: doc.id, userId: doc.id };
        return standardizeUser(userData);
      });
      
      res.json({
        users,
        pagination: {
          currentPage: 1,
          pageSize: users.length,
          totalCount: users.length,
          totalPages: 1
        }
      });
    } catch (error) {
      console.error("Error getting users:", error);
      res.status(500).json({ message: "Error fetching users", error: String(error) });
    }
  });
  
  // Get user by ID
  app.get("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const userDoc = await adminDb.collection('users').doc(id).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get raw data and ensure ID is set
      const rawUserData = userDoc.data() || {};
      const userData = { ...rawUserData, id: userDoc.id, userId: userDoc.id };
      
      // Use standardizeUser function to ensure consistent schema
      const standardizedUser = standardizeUser(userData);
      
      // Log for debugging
      console.log(`Retrieved standardized user with ID ${id} and role ${standardizedUser.role}`);
      
      res.json(standardizedUser);
    } catch (error) {
      console.error(`Error getting user ${req.params.id}:`, error);
      res.status(500).json({ message: "Error fetching user", error: String(error) });
    }
  });
  
  // Update user
  app.put("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const userDoc = await adminDb.collection('users').doc(id).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get existing user data
      const existingData = userDoc.data() || {};
      
      // Prepare update data with standardization tracking
      const updateData = {
        ...req.body,
        updatedAt: FieldValue.serverTimestamp(),
        _standardized: true,
        _standardizedVersion: 1
      };
      
      // Make sure IDs are consistent
      updateData.id = id;
      updateData.userId = id;
      
      // Ensure role-specific fields are consistent based on the role
      const role = (updateData.role || existingData.role || 'consumer').toLowerCase();
      
      if (role === 'producer') {
        updateData.producerId = id;
        updateData.providerId = id;
      } else if (role === 'partner') {
        updateData.partnerId = id;
      }
      
      // Log the update for debugging
      console.log(`Updating user ${id} with role ${role}`, updateData);
      
      await adminDb.collection('users').doc(id).update(updateData);
      
      res.json({ 
        success: true, 
        message: "User updated successfully with standardized schema",
        userId: id
      });
    } catch (error) {
      console.error(`Error updating user ${req.params.id}:`, error);
      res.status(500).json({ message: "Error updating user", error: String(error) });
    }
  });
  
  // Get all yachts for a producer
  app.get("/api/users/:id/yachts", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if user exists and is a producer using standardized schema
      const userDoc = await adminDb.collection('users').doc(id).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get raw data and use standardizeUser to ensure consistent schema
      const rawUserData = userDoc.data() || {};
      const userData = standardizeUser({ ...rawUserData, id, userId: id });
      
      // Check if user is a producer (case-insensitive) - using standardized schema
      if (userData.role.toLowerCase() !== 'producer') {
        return res.status(400).json({ message: "User is not a producer" });
      }
      
      // Get all yachts for this producer
      const yachtSnapshot = await adminDb.collection('unified_yacht_experiences')
        .where('producerId', '==', id)
        .get();
      
      if (yachtSnapshot.empty) {
        return res.json({
          yachts: [],
          pagination: {
            currentPage: 1,
            pageSize: 10,
            totalCount: 0,
            totalPages: 0
          }
        });
      }
      
      const yachts = yachtSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || data.name || '',
          description: data.description || '',
          category: data.category || '',
          location: data.location || {},
          pricing: data.pricing || data.price || 0,
          capacity: data.capacity || data.max_guests || 0,
          duration: data.duration || 0,
          isAvailable: data.isAvailable || data.available || data.availability_status || false,
          isFeatured: data.isFeatured || data.featured || false,
          mainImage: data.mainImage || (data.media && data.media.length > 0 ? data.media[0].url : ''),
          producerId: id
        };
      });
      
      res.json({
        yachts,
        pagination: {
          currentPage: 1,
          pageSize: yachts.length,
          totalCount: yachts.length,
          totalPages: 1
        }
      });
    } catch (error) {
      console.error(`Error getting yachts for producer ${req.params.id}:`, error);
      res.status(500).json({ message: "Error fetching producer yachts", error: String(error) });
    }
  });
  
  // Get all add-ons for a producer
  app.get("/api/users/:id/addons", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if user exists and is a producer using standardized schema
      const userDoc = await adminDb.collection('users').doc(id).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get raw data and use standardizeUser to ensure consistent schema
      const rawUserData = userDoc.data() || {};
      const userData = standardizeUser({ ...rawUserData, id, userId: id });
      
      // Check if user is a producer (case-insensitive) - using standardized schema
      if (userData.role.toLowerCase() !== 'producer') {
        return res.status(400).json({ message: "User is not a producer" });
      }
      
      // Get all add-ons for this producer
      const addonsSnapshot = await adminDb.collection('products_add_ons')
        .where('partnerId', '==', id)
        .get();
      
      if (addonsSnapshot.empty) {
        return res.json({
          addons: [],
          pagination: {
            currentPage: 1,
            pageSize: 10,
            totalCount: 0,
            totalPages: 0
          }
        });
      }
      
      const addons = addonsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          productId: doc.id,
          name: data.name || '',
          description: data.description || '',
          category: data.category || '',
          pricing: data.pricing || data.price || 0,
          media: data.media || [],
          mainImage: data.mainImage || (data.media && data.media.length > 0 ? data.media[0].url : ''),
          availability: data.availability || data.isAvailable || false,
          tags: data.tags || [],
          partnerId: id,
          producerId: id,
          createdDate: data.createdDate || data.created_date || null,
          lastUpdatedDate: data.lastUpdatedDate || data.updatedAt || null
        };
      });
      
      res.json({
        addons,
        pagination: {
          currentPage: 1,
          pageSize: addons.length,
          totalCount: addons.length,
          totalPages: 1
        }
      });
    } catch (error) {
      console.error(`Error getting add-ons for producer ${req.params.id}:`, error);
      res.status(500).json({ message: "Error fetching producer add-ons", error: String(error) });
    }
  });

  // Legacy API endpoints
  // Export normalized yacht schema
  app.get("/api/export/yacht-schema", async (req, res) => {
    try {
      // Get yacht data from unified_yacht_experiences collection
      const snapshot = await adminDb.collection('unified_yacht_experiences').get();
      
      if (snapshot.empty) {
        return res.json({ 
          message: "No yacht data found",
          data: [] 
        });
      }
      
      // Normalize data with consistent field names
      const normalizedYachts = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          // Ensure consistent field names
          package_id: doc.id,
          id: doc.id,
          yachtId: data.yachtId || doc.id,
          // Map between name and title fields
          name: data.name || data.title || '',
          title: data.title || data.name || '',
          // Map between available and availability_status
          available: data.available !== undefined ? data.available : data.availability_status,
          availability_status: data.availability_status !== undefined ? 
            data.availability_status : (data.available || false),
        };
      });
      
      res.json({
        message: `Retrieved ${normalizedYachts.length} normalized yacht records`,
        data: normalizedYachts
      });
    } catch (error) {
      console.error("Error exporting yacht schema:", error);
      res.status(500).json({ 
        message: "Error exporting yacht schema", 
        error: String(error)
      });
    }
  });
  // Experience Packages with Filters
  app.get("/api/experiences", async (req, res) => {
    try {
      const { type, region, port_marina, page, pageSize, sortByStatus } = req.query;
      console.log('Received filter request:', { type, region, port_marina, page, pageSize, sortByStatus });

      const filters: any = {};

      // Only add filters if they are provided with non-empty values
      if (type && type !== '') filters.type = type as string;
      if (region && region !== '') filters.region = region as string;
      if (port_marina && port_marina !== '') filters.port_marina = port_marina as string;
      if (page) filters.page = parseInt(page as string);
      if (pageSize) filters.pageSize = parseInt(pageSize as string);
      if (sortByStatus) filters.sortByStatus = sortByStatus === 'true';

      const experiencesResponse = await storage.getAllExperiencePackages(
        Object.keys(filters).length > 0 ? filters : undefined
      );

      console.log(`Returning ${experiencesResponse.data.length} experiences (page ${experiencesResponse.pagination.currentPage} of ${experiencesResponse.pagination.totalPages})`);
      res.json(experiencesResponse);
    } catch (error) {
      console.error("Error fetching experiences:", error);
      res.status(500).json({ error: "Failed to fetch experiences" });
    }
  });

  // Featured Experience Packages
  app.get("/api/experiences/featured", async (_req, res) => {
    try {
      const experiences = await storage.getFeaturedExperiencePackages();
      res.json(experiences);
    } catch (error) {
      console.error("Error fetching featured experiences:", error);
      res.status(500).json({ error: "Failed to fetch featured experiences" });
    }
  });

  // Get producer yachts with pagination and ordering by availability status
  // Move this route before the "Get yacht by ID" route to avoid confusion with the :id parameter
  app.get("/api/producer/yachts", verifyAuth, async (req: Request, res: Response) => {
    // Set content type explicitly to ensure JSON response
    res.setHeader('Content-Type', 'application/json');
    
    try {
      console.log('Producer Yachts API: Request received');
      
      // Set cache control headers to prevent caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Parse pagination parameters from query string
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      console.log(`Producer Yachts API: Pagination params - page: ${page}, pageSize: ${pageSize}`);
      
      // Log user info from auth
      console.log('Producer Yachts API: User info from auth:', {
        uid: req.user?.uid,
        role: req.user?.role,
        email: req.user?.email,
      });
      
      // Get producerId directly from verified auth token (req.user is set by verifyAuth middleware)
      const producerId = req.user?.uid;
      if (!producerId) {
        console.warn('Producer Yachts API: No producer ID found in authenticated user');
        return res.status(401).json({ 
          error: "Unauthorized", 
          message: "Valid producer authentication required",
          details: "No producer ID found in authentication data"
        });
      }
      console.log(`Using authenticated user ID as producer ID: ${producerId}`);
      
      // Force fresh data with a timestamp to prevent 304 responses
      const forceRefresh = Date.now();
      console.log(`Fetching yachts for producer ID: ${producerId || 'all'} (refresh: ${forceRefresh})`);
      
      // Use the storage method to get producer-specific yachts
      const yachtsResponse = await storage.getProducerYachts({
        producerId,
        page,
        pageSize,
        sortByStatus: true
      });
      
      res.json(yachtsResponse);
    } catch (error) {
      console.error("Error fetching producer yachts:", error);
      res.status(500).json({ error: "Failed to fetch yachts" });
    }
  });
  
  // Get producer add-ons with pagination and ordering by availability
  app.get("/api/producer/addons", verifyAuth, async (req: Request, res: Response) => {
    // Set content type explicitly to ensure JSON response
    res.setHeader('Content-Type', 'application/json');
    
    try {
      console.log('Producer Add-ons API: Request received');
      
      // Set cache control headers to prevent caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Parse pagination parameters from query string
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      console.log(`Producer Add-ons API: Pagination params - page: ${page}, pageSize: ${pageSize}`);
      
      // Log user info from auth
      console.log('Producer Add-ons API: User info from auth:', {
        uid: req.user?.uid,
        role: req.user?.role,
        email: req.user?.email,
      });
      
      // Get producerId directly from verified auth token (req.user is set by verifyAuth middleware)
      const producerId = req.user?.uid;
      if (!producerId) {
        console.warn('Producer Add-ons API: No producer ID found in authenticated user');
        return res.status(401).json({ 
          error: "Unauthorized", 
          message: "Valid producer authentication required",
          details: "No producer ID found in authentication data"
        });
      }
      console.log(`Using authenticated user ID as producer ID: ${producerId}`);
      
      // Force fresh data with a timestamp
      const forceRefresh = Date.now();
      console.log(`Fetching add-ons for producer ID: ${producerId || 'all'} (refresh: ${forceRefresh})`);
      
      try {
        // Get add-ons with pagination and sorting
        const addonsResponse = await storage.getAllProductAddOns({
          partnerId: producerId,  // Use partnerId for filtering if provided
          page,
          pageSize,
          sortByStatus: true
        });
        
        console.log(`Producer Add-ons API: Retrieved ${addonsResponse.data.length} add-ons`);
        
        // Transform response to match the expected format
        res.json({
          addons: addonsResponse.data,
          pagination: addonsResponse.pagination
        });
      } catch (storageError) {
        console.error('Producer Add-ons API: Error in storage.getAllProductAddOns:', storageError);
        
        // Return a more detailed error for debugging
        return res.status(500).json({
          error: "Database operation failed",
          message: "Failed to retrieve add-ons from database",
          details: String(storageError),
          code: typeof storageError === 'object' && storageError !== null ? (storageError as any).code : undefined
        });
      }
    } catch (error) {
      console.error("Error fetching producer add-ons:", error);
      res.status(500).json({ 
        error: "Failed to fetch add-ons",
        message: String(error)
      });
    }
  });
  
  // Get available add-ons (both producer's own and partner add-ons) for bundling
  app.get("/api/producer/available-addons", verifyAuth, async (req: Request, res: Response) => {
    // Set content type explicitly to ensure JSON response
    res.setHeader('Content-Type', 'application/json');
    
    try {
      console.log('Available Add-ons API: Request received');
      
      // Set cache control headers to prevent caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Log user info from auth
      console.log('Available Add-ons API: User info from auth:', {
        uid: req.user?.uid,
        role: req.user?.role,
        email: req.user?.email,
      });
      
      // Check if the user is authenticated
      if (!req.user) {
        console.log('Available Add-ons API: Unauthenticated request');
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Check if user is a producer
      if (req.user.role !== 'producer') {
        console.log(`Available Add-ons API: User role ${req.user.role} not authorized`);
        return res.status(403).json({ error: "Only producers can access available add-ons" });
      }
      
      // Get the producer ID from user ID
      const { producerId } = await getHarmonizedProducerIds(req.user.uid);
      console.log(`Available Add-ons API: Using producer ID: ${producerId}`);
      
      // Get the available add-ons
      try {
        const availableAddons = await storage.getAvailableAddOns(producerId);
        
        console.log('Available Add-ons API: Retrieved', {
          producerAddOns: availableAddons.producerAddOns.length,
          partnerAddOns: availableAddons.partnerAddOns.length
        });
        
        // Return the response
        res.json(availableAddons);
      } catch (storageError) {
        console.error('Available Add-ons API: Error in storage.getAvailableAddOns:', storageError);
        
        // Return a more detailed error for debugging
        return res.status(500).json({
          error: "Database operation failed",
          details: String(storageError)
        });
      }
    } catch (error) {
      console.error("Error fetching available add-ons:", error);
      res.status(500).json({ 
        error: "Failed to fetch available add-ons",
        message: String(error)
      });
    }
  });
  
  // Validate add-on IDs to ensure they exist and are available
  app.post("/api/producer/validate-addons", verifyAuth, async (req: Request, res: Response) => {
    // Set content type explicitly to ensure JSON response
    res.setHeader('Content-Type', 'application/json');
    
    try {
      console.log('Validate Add-ons API: Request received');
      
      // Set cache control headers to prevent caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Extract add-on IDs from request body
      const { addonIds } = req.body;
      
      if (!addonIds || !Array.isArray(addonIds)) {
        console.warn('Validate Add-ons API: No add-on IDs provided or invalid format');
        return res.status(400).json({ 
          error: "Invalid request", 
          message: "addonIds must be an array of strings"
        });
      }
      
      console.log(`Validate Add-ons API: Validating ${addonIds.length} add-on IDs`);
      
      // Log user info from auth
      console.log('Validate Add-ons API: User info from auth:', {
        uid: req.user?.uid,
        role: req.user?.role,
        email: req.user?.email,
      });
      
      // Check if the user is authenticated
      if (!req.user) {
        console.log('Validate Add-ons API: Unauthenticated request');
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Check if user is a producer
      if (req.user.role !== 'producer') {
        console.log(`Validate Add-ons API: User role ${req.user.role} not authorized`);
        return res.status(403).json({ error: "Only producers can validate add-ons" });
      }
      
      // Validate the add-on IDs
      try {
        const validationResult = await storage.validateAddOnIds(addonIds);
        
        console.log('Validate Add-ons API: Validation result:', {
          validIds: validationResult.validIds.length,
          invalidIds: validationResult.invalidIds.length
        });
        
        // Return the validation result
        res.json(validationResult);
      } catch (storageError) {
        console.error('Validate Add-ons API: Error in storage.validateAddOnIds:', storageError);
        
        // Return a more detailed error for debugging
        return res.status(500).json({
          error: "Database operation failed",
          details: String(storageError)
        });
      }
    } catch (error) {
      console.error("Error validating add-on IDs:", error);
      res.status(500).json({ 
        error: "Failed to validate add-on IDs",
        message: String(error)
      });
    }
  });
  
  // Create a new add-on for a producer
  app.post("/api/producer/addons/create", verifyAuth, async (req: Request, res: Response) => {
    // Set content type explicitly to ensure JSON response
    res.setHeader('Content-Type', 'application/json');
    
    try {
      console.log('Create Add-on API: Request received');
      
      // Log request body for debugging
      console.log('Create Add-on API: Request body:', req.body);
      
      const addonData = req.body;
      
      // If there's no request body, return an error
      if (!addonData || Object.keys(addonData).length === 0) {
        console.warn('Create Add-on API: Empty request body');
        return res.status(400).json({
          error: "Invalid request",
          message: "Request body is empty",
          details: "Provide add-on data in the request body"
        });
      }
      
      // Get the authenticated user ID from the auth token (set by verifyAuth middleware)
      const authUserId = req.user?.uid;
      
      if (!authUserId) {
        console.warn('Create Add-on API: No user ID in authentication data');
        return res.status(401).json({
          error: "Unauthorized",
          message: "Valid producer authentication required",
          details: "No user ID found in authentication data"
        });
      }
      
      // Use our helper function to get harmonized IDs
      const { producerId, partnerId } = await getHarmonizedProducerIds(authUserId);
      
      console.log(`Using producer ID: ${producerId} and partner ID: ${partnerId} for addon creation`);
      
      // Update the addon data with the producer/partner IDs
      addonData.producerId = producerId;
      addonData.partnerId = partnerId;
      
      console.log("Creating new add-on:", addonData);
      
      // Validate required fields
      if (!addonData.name || !addonData.producerId || !addonData.partnerId) {
        return res.status(400).json({ 
          error: "Missing required fields", 
          message: "Name, producerId, and partnerId are required fields",
          providedFields: Object.keys(addonData)
        });
      }
      
      // Ensure consistent field naming
      addonData.productId = addonData.productId || `ADD-${Date.now()}`;
      addonData.availability = addonData.availability !== undefined ? addonData.availability : true;
      addonData.isAvailable = addonData.availability;
      
      // Set timestamps in multiple formats for compatibility
      const now = new Date();
      addonData.createdDate = addonData.createdDate || FieldValue.serverTimestamp();
      addonData.lastUpdatedDate = FieldValue.serverTimestamp();
      addonData.updatedAt = FieldValue.serverTimestamp();
      addonData.timestamp = FieldValue.serverTimestamp(); // Additional timestamp field
      
      // Handle media field
      if (!addonData.media || !Array.isArray(addonData.media)) {
        addonData.media = [];
      }
      
      // Add standardization tracking
      addonData._standardized = true;
      addonData._standardizedVersion = 1;
      addonData.category = addonData.category || 'Other';
      addonData.pricing = addonData.pricing || addonData.price || 0;
      addonData.tags = addonData.tags || [];
      
      try {
        // Add to Firestore
        console.log(`Create Add-on API: Adding document to 'products_add_ons' collection with ID: ${addonData.productId}`);
        const addonRef = adminDb.collection('products_add_ons').doc(addonData.productId);
        await addonRef.set(addonData);
        
        console.log(`Create Add-on API: Successfully created add-on with ID: ${addonData.productId}`);
        
        // Return success response
        res.json({ 
          success: true, 
          message: "Add-on created successfully",
          productId: addonData.productId,
          addon: {
            id: addonData.productId,
            name: addonData.name,
            pricing: addonData.pricing,
            availability: addonData.availability
          }
        });
      } catch (dbError) {
        console.error("Create Add-on API: Database error:", dbError);
        
        // Return detailed error
        res.status(500).json({ 
          error: "Database operation failed", 
          message: "Failed to save add-on data to database",
          details: String(dbError),
          code: typeof dbError === 'object' && dbError !== null ? (dbError as any).code : undefined
        });
      }
    } catch (error) {
      console.error("Error creating add-on:", error);
      res.status(500).json({ 
        error: "Failed to create add-on", 
        message: String(error),
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      });
    }
  });
  
  // Create a new yacht endpoint
  app.post("/api/producer/yacht/create", verifyAuth, async (req: Request, res: Response) => {
    // Set content type explicitly to ensure JSON response
    res.setHeader('Content-Type', 'application/json');
    
    try {
      console.log('Create Yacht API: Request received');
      
      // Log request body for debugging
      console.log('Create Yacht API: Request body:', req.body);
      
      const yachtData = req.body;
      
      // If there's no request body, return an error
      if (!yachtData || Object.keys(yachtData).length === 0) {
        console.warn('Create Yacht API: Empty request body');
        return res.status(400).json({
          error: "Invalid request",
          message: "Request body is empty",
          details: "Provide yacht data in the request body"
        });
      }
      
      // Get the authenticated user ID from the auth token (set by verifyAuth middleware)
      const authUserId = req.user?.uid;
      
      if (!authUserId) {
        console.warn('Create Yacht API: No user ID in authentication data');
        return res.status(401).json({
          error: "Unauthorized",
          message: "Valid producer authentication required",
          details: "No user ID found in authentication data"
        });
      }
      
      // Verify this user is a producer in Firestore
      try {
        const userDoc = await adminDb.collection('harmonized_users').doc(authUserId).get();
        
        if (!userDoc.exists) {
          console.warn(`Create Yacht API: User ${authUserId} not found in harmonized_users collection`);
          return res.status(403).json({
            error: "Access denied",
            message: "User not found in database"
          });
        }
        
        const userData = userDoc.data();
        const userRole = userData?.role;
        
        console.log(`Create Yacht API: User ${authUserId} has role "${userRole}" in Firestore`);
        
        // Check if the user's Firestore role is producer
        if (userRole !== 'producer') {
          console.warn(`Create Yacht API: User ${authUserId} with role "${userRole}" attempted to create a yacht`);
          return res.status(403).json({
            error: "Access denied",
            message: "User is not registered as a producer",
            details: `Current role: ${userRole}`
          });
        }
      } catch (verifyError) {
        console.error("Create Yacht API: Error verifying user role:", verifyError);
        return res.status(500).json({
          error: "Authentication verification failed",
          message: "Could not verify user role",
          details: String(verifyError)
        });
      }
      
      // Use our helper function to get harmonized IDs
      const { producerId, partnerId } = await getHarmonizedProducerIds(authUserId);
      
      console.log(`Using producer ID: ${producerId} and partner ID: ${partnerId} for yacht creation`);
      
      // Update the yacht data with the producer/partner IDs
      yachtData.producerId = producerId;
      yachtData.providerId = producerId;
      
      console.log("Creating new yacht:", yachtData);
      
      // Validate required fields
      if (!yachtData.title || !yachtData.description) {
        return res.status(400).json({ 
          error: "Missing required fields", 
          message: "Title and description are required fields",
          providedFields: Object.keys(yachtData)
        });
      }
      
      // Ensure consistent field naming
      yachtData.package_id = yachtData.package_id || `yacht-${producerId}-${Date.now()}`;
      yachtData.availability_status = yachtData.availability_status !== undefined ? yachtData.availability_status : true;
      yachtData.isAvailable = yachtData.availability_status;
      
      // Set timestamps in multiple formats for compatibility
      const now = new Date();
      yachtData.created_date = yachtData.created_date || FieldValue.serverTimestamp();
      yachtData.last_updated_date = FieldValue.serverTimestamp();
      yachtData.createdAt = yachtData.createdAt || FieldValue.serverTimestamp();
      yachtData.updatedAt = FieldValue.serverTimestamp();
      
      // Handle media field
      if (!yachtData.media || !Array.isArray(yachtData.media)) {
        yachtData.media = [];
      }
      
      // Define AddOnReference interface for type safety
      interface AddOnRef {
        addOnId: string;
        [key: string]: any;
      }
      
      // Handle add-on bundling fields
      if (yachtData.includedAddOns && Array.isArray(yachtData.includedAddOns)) {
        // Validate the add-on IDs for included add-ons
        const includedAddOnIds = yachtData.includedAddOns.map((addon: AddOnRef) => addon.addOnId);
        if (includedAddOnIds.length > 0) {
          try {
            const validationResult = await storage.validateAddOnIds(includedAddOnIds);
            if (validationResult.invalidIds.length > 0) {
              console.warn(`Create Yacht API: Invalid included add-on IDs: ${validationResult.invalidIds.join(', ')}`);
              // Filter out invalid add-ons (optional, could return an error instead)
              yachtData.includedAddOns = yachtData.includedAddOns.filter((addon: AddOnRef) => 
                validationResult.validIds.includes(addon.addOnId));
            }
          } catch (validationError) {
            console.error("Create Yacht API: Error validating included add-on IDs:", validationError);
            // Continue with creation but log the error
          }
        }
      } else {
        // Initialize as empty array if not provided
        yachtData.includedAddOns = [];
      }
      
      if (yachtData.optionalAddOns && Array.isArray(yachtData.optionalAddOns)) {
        // Validate the add-on IDs for optional add-ons
        const optionalAddOnIds = yachtData.optionalAddOns.map((addon: AddOnRef) => addon.addOnId);
        if (optionalAddOnIds.length > 0) {
          try {
            const validationResult = await storage.validateAddOnIds(optionalAddOnIds);
            if (validationResult.invalidIds.length > 0) {
              console.warn(`Create Yacht API: Invalid optional add-on IDs: ${validationResult.invalidIds.join(', ')}`);
              // Filter out invalid add-ons (optional, could return an error instead)
              yachtData.optionalAddOns = yachtData.optionalAddOns.filter((addon: AddOnRef) => 
                validationResult.validIds.includes(addon.addOnId));
            }
          } catch (validationError) {
            console.error("Create Yacht API: Error validating optional add-on IDs:", validationError);
            // Continue with creation but log the error
          }
        }
      } else {
        // Initialize as empty array if not provided
        yachtData.optionalAddOns = [];
      }
      
      // Add standardization tracking
      yachtData._standardized = true;
      yachtData._standardizedVersion = 1;
      yachtData.category = yachtData.category || 'Standard';
      yachtData.pricing = yachtData.pricing || yachtData.price || 0;
      yachtData.tags = yachtData.tags || [];
      
      try {
        // Add to Firestore
        console.log(`Create Yacht API: Adding document to 'unified_yacht_experiences' collection with ID: ${yachtData.package_id}`);
        const yachtRef = adminDb.collection('unified_yacht_experiences').doc(yachtData.package_id);
        await yachtRef.set(yachtData);
        
        console.log(`Create Yacht API: Successfully created yacht with ID: ${yachtData.package_id}`);
        
        // Return success response
        res.status(201).json({ 
          success: true, 
          message: "Yacht created successfully",
          id: yachtData.package_id,
          yacht: {
            id: yachtData.package_id,
            title: yachtData.title,
            pricing: yachtData.pricing,
            isAvailable: yachtData.isAvailable
          }
        });
      } catch (dbError) {
        console.error("Create Yacht API: Database error:", dbError);
        
        // Return detailed error
        res.status(500).json({ 
          error: "Database operation failed", 
          message: "Failed to save yacht data to database",
          details: String(dbError),
          code: typeof dbError === 'object' && dbError !== null ? (dbError as any).code : undefined
        });
      }
    } catch (error) {
      console.error("Error creating yacht:", error);
      res.status(500).json({ 
        error: "Failed to create yacht", 
        message: String(error),
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      });
    }
  });
  
  // Update an existing yacht endpoint
  app.post("/api/producer/yacht/update/:id", verifyAuth, async (req: Request, res: Response) => {
    // Set content type explicitly to ensure JSON response
    res.setHeader('Content-Type', 'application/json');
    
    try {
      const yachtId = req.params.id;
      console.log(`Update Yacht API: Request received for yacht ID: ${yachtId}`);
      
      // Log request body for debugging
      console.log('Update Yacht API: Request body:', req.body);
      
      const updateData = req.body;
      
      // If there's no request body, return an error
      if (!updateData || Object.keys(updateData).length === 0) {
        console.warn('Update Yacht API: Empty request body');
        return res.status(400).json({
          error: "Invalid request",
          message: "Request body is empty",
          details: "Provide yacht data to update"
        });
      }
      
      // Get the authenticated user ID from the auth token (set by verifyAuth middleware)
      const authUserId = req.user?.uid;
      
      if (!authUserId) {
        console.warn('Update Yacht API: No user ID in authentication data');
        return res.status(401).json({
          error: "Unauthorized",
          message: "Valid producer authentication required",
          details: "No user ID found in authentication data"
        });
      }
      
      // Verify this user is a producer in Firestore
      try {
        const userDoc = await adminDb.collection('harmonized_users').doc(authUserId).get();
        
        if (!userDoc.exists) {
          console.warn(`Update Yacht API: User ${authUserId} not found in harmonized_users collection`);
          return res.status(403).json({
            error: "Access denied",
            message: "User not found in database"
          });
        }
        
        const userData = userDoc.data();
        const userRole = userData?.role;
        
        console.log(`Update Yacht API: User ${authUserId} has role "${userRole}" in Firestore`);
        
        // Check if the user's Firestore role is producer
        if (userRole !== 'producer') {
          console.warn(`Update Yacht API: User ${authUserId} with role "${userRole}" attempted to update a yacht`);
          return res.status(403).json({
            error: "Access denied",
            message: "User is not registered as a producer",
            details: `Current role: ${userRole}`
          });
        }
      } catch (verifyError) {
        console.error("Update Yacht API: Error verifying user role:", verifyError);
        return res.status(500).json({
          error: "Authentication verification failed",
          message: "Could not verify user role",
          details: String(verifyError)
        });
      }
      
      // Use our helper function to get harmonized IDs
      const { producerId } = await getHarmonizedProducerIds(authUserId);
      
      console.log(`Update Yacht API: Verifying yacht ownership for producer ID: ${producerId}`);
      
      // First, check if the yacht exists and belongs to this producer
      try {
        const yachtDoc = await adminDb.collection('unified_yacht_experiences').doc(yachtId).get();
        
        if (!yachtDoc.exists) {
          console.warn(`Update Yacht API: Yacht with ID ${yachtId} not found`);
          return res.status(404).json({
            error: "Yacht not found",
            message: `No yacht exists with ID: ${yachtId}`
          });
        }
        
        const yachtData = yachtDoc.data();
        const yachtProducerId = yachtData?.producerId || yachtData?.providerId;
        
        // Verify the yacht belongs to this producer
        if (yachtProducerId !== producerId) {
          console.warn(`Update Yacht API: Yacht ${yachtId} belongs to producer ${yachtProducerId}, not ${producerId}`);
          return res.status(403).json({
            error: "Access denied",
            message: "You do not have permission to update this yacht",
            details: "Yacht belongs to a different producer"
          });
        }
        
        console.log(`Update Yacht API: Yacht ${yachtId} ownership verified for producer ${producerId}`);
        
        // Update timestamp fields
        updateData.last_updated_date = FieldValue.serverTimestamp();
        updateData.updatedAt = FieldValue.serverTimestamp();
        
        // Define AddOnReference interface for type safety
        interface AddOnRef {
          addOnId: string;
          [key: string]: any;
        }
        
        // Handle add-on bundling fields for updates
        if (updateData.includedAddOns && Array.isArray(updateData.includedAddOns)) {
          // Validate the add-on IDs for included add-ons
          const includedAddOnIds = updateData.includedAddOns.map((addon: AddOnRef) => addon.addOnId);
          if (includedAddOnIds.length > 0) {
            try {
              const validationResult = await storage.validateAddOnIds(includedAddOnIds);
              if (validationResult.invalidIds.length > 0) {
                console.warn(`Update Yacht API: Invalid included add-on IDs: ${validationResult.invalidIds.join(', ')}`);
                // Filter out invalid add-ons
                updateData.includedAddOns = updateData.includedAddOns.filter((addon: AddOnRef) => 
                  validationResult.validIds.includes(addon.addOnId));
              }
            } catch (validationError) {
              console.error("Update Yacht API: Error validating included add-on IDs:", validationError);
              // Continue with update but log the error
            }
          }
        }
        
        if (updateData.optionalAddOns && Array.isArray(updateData.optionalAddOns)) {
          // Validate the add-on IDs for optional add-ons
          const optionalAddOnIds = updateData.optionalAddOns.map((addon: AddOnRef) => addon.addOnId);
          if (optionalAddOnIds.length > 0) {
            try {
              const validationResult = await storage.validateAddOnIds(optionalAddOnIds);
              if (validationResult.invalidIds.length > 0) {
                console.warn(`Update Yacht API: Invalid optional add-on IDs: ${validationResult.invalidIds.join(', ')}`);
                // Filter out invalid add-ons
                updateData.optionalAddOns = updateData.optionalAddOns.filter((addon: AddOnRef) => 
                  validationResult.validIds.includes(addon.addOnId));
              }
            } catch (validationError) {
              console.error("Update Yacht API: Error validating optional add-on IDs:", validationError);
              // Continue with update but log the error
            }
          }
        }
        
        // Update the yacht document
        console.log(`Update Yacht API: Updating yacht ${yachtId} with data:`, updateData);
        await adminDb.collection('unified_yacht_experiences').doc(yachtId).update(updateData);
        
        console.log(`Update Yacht API: Successfully updated yacht with ID: ${yachtId}`);
        
        // Return success response
        return res.json({ 
          success: true, 
          message: "Yacht updated successfully",
          id: yachtId
        });
      } catch (dbError) {
        console.error("Update Yacht API: Database error:", dbError);
        
        // Return detailed error
        return res.status(500).json({ 
          error: "Database operation failed", 
          message: "Failed to update yacht data in database",
          details: String(dbError),
          code: typeof dbError === 'object' && dbError !== null ? (dbError as any).code : undefined
        });
      }
    } catch (error) {
      console.error("Error updating yacht:", error);
      res.status(500).json({ 
        error: "Failed to update yacht", 
        message: String(error),
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      });
    }
  });
  
  // Delete a yacht endpoint
  app.delete("/api/producer/yacht/:id", verifyAuth, async (req: Request, res: Response) => {
    // Set content type explicitly to ensure JSON response
    res.setHeader('Content-Type', 'application/json');
    
    try {
      const yachtId = req.params.id;
      console.log(`Delete Yacht API: Request received for yacht ID: ${yachtId}`);
      
      // Get the authenticated user ID from the auth token (set by verifyAuth middleware)
      const authUserId = req.user?.uid;
      
      if (!authUserId) {
        console.warn('Delete Yacht API: No user ID in authentication data');
        return res.status(401).json({
          error: "Unauthorized",
          message: "Valid producer authentication required",
          details: "No user ID found in authentication data"
        });
      }
      
      // Verify this user is a producer in Firestore
      try {
        const userDoc = await adminDb.collection('harmonized_users').doc(authUserId).get();
        
        if (!userDoc.exists) {
          console.warn(`Delete Yacht API: User ${authUserId} not found in harmonized_users collection`);
          return res.status(403).json({
            error: "Access denied",
            message: "User not found in database"
          });
        }
        
        const userData = userDoc.data();
        const userRole = userData?.role;
        
        console.log(`Delete Yacht API: User ${authUserId} has role "${userRole}" in Firestore`);
        
        // Check if the user's Firestore role is producer
        if (userRole !== 'producer') {
          console.warn(`Delete Yacht API: User ${authUserId} with role "${userRole}" attempted to delete a yacht`);
          return res.status(403).json({
            error: "Access denied",
            message: "User is not registered as a producer",
            details: `Current role: ${userRole}`
          });
        }
      } catch (verifyError) {
        console.error("Delete Yacht API: Error verifying user role:", verifyError);
        return res.status(500).json({
          error: "Authentication verification failed",
          message: "Could not verify user role",
          details: String(verifyError)
        });
      }
      
      // Use our helper function to get harmonized IDs
      const { producerId } = await getHarmonizedProducerIds(authUserId);
      
      console.log(`Delete Yacht API: Verifying yacht ownership for producer ID: ${producerId}`);
      
      // First, check if the yacht exists and belongs to this producer
      try {
        const yachtDoc = await adminDb.collection('unified_yacht_experiences').doc(yachtId).get();
        
        if (!yachtDoc.exists) {
          console.warn(`Delete Yacht API: Yacht with ID ${yachtId} not found`);
          return res.status(404).json({
            error: "Yacht not found",
            message: `No yacht exists with ID: ${yachtId}`
          });
        }
        
        const yachtData = yachtDoc.data();
        const yachtProducerId = yachtData?.producerId || yachtData?.providerId;
        
        // Verify the yacht belongs to this producer
        if (yachtProducerId !== producerId) {
          console.warn(`Delete Yacht API: Yacht ${yachtId} belongs to producer ${yachtProducerId}, not ${producerId}`);
          return res.status(403).json({
            error: "Access denied",
            message: "You do not have permission to delete this yacht",
            details: "Yacht belongs to a different producer"
          });
        }
        
        console.log(`Delete Yacht API: Yacht ${yachtId} ownership verified for producer ${producerId}`);
        
        // Delete the yacht document
        console.log(`Delete Yacht API: Deleting yacht ${yachtId}`);
        await adminDb.collection('unified_yacht_experiences').doc(yachtId).delete();
        
        console.log(`Delete Yacht API: Successfully deleted yacht with ID: ${yachtId}`);
        
        // Return success response
        return res.json({ 
          success: true, 
          message: "Yacht deleted successfully",
          id: yachtId
        });
      } catch (dbError) {
        console.error("Delete Yacht API: Database error:", dbError);
        
        // Return detailed error
        return res.status(500).json({ 
          error: "Database operation failed", 
          message: "Failed to delete yacht from database",
          details: String(dbError),
          code: typeof dbError === 'object' && dbError !== null ? (dbError as any).code : undefined
        });
      }
    } catch (error) {
      console.error("Error deleting yacht:", error);
      res.status(500).json({ 
        error: "Failed to delete yacht", 
        message: String(error),
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      });
    }
  });
  
  // Get producer reviews
  app.get("/api/producer/reviews", verifyAuth, async (req: Request, res: Response) => {
    // Set content type explicitly to ensure JSON response
    res.setHeader('Content-Type', 'application/json');
    
    try {
      console.log('Producer Reviews API: Request received');
      
      // Log user info from auth
      console.log('Producer Reviews API: User info from auth:', {
        uid: req.user?.uid,
        role: req.user?.role,
        email: req.user?.email,
      });
      
      // Get auth user ID from verified auth token
      const authUserId = req.user?.uid;
      
      if (!authUserId) {
        console.warn('Producer Reviews API: No user ID found in authentication data');
        return res.status(401).json({
          error: "Unauthorized",
          message: "Valid producer authentication required",
          details: "No user ID found in authentication data"
        });
      }
      
      try {
        // Use our helper function to get harmonized producer ID
        const { producerId } = await getHarmonizedProducerIds(authUserId);
        
        console.log(`Fetching reviews for producer ID: ${producerId} (auth user: ${authUserId})`);
        
        try {
          // Return reviews where the relatedContentId matches any yacht owned by this producer
          // First, get all of this producer's yachts
          console.log(`Producer Reviews API: Querying yachts owned by producer: ${producerId}`);
          const yachtsSnapshot = await adminDb.collection('unified_yacht_experiences')
            .where('producerId', '==', producerId)
            .get();
          
          console.log(`Producer Reviews API: Found ${yachtsSnapshot.size} yachts for producer`);
          
          if (yachtsSnapshot.empty) {
            console.log('Producer Reviews API: No yachts found for this producer, returning empty array');
            return res.json([]);
          }
          
          // Get the IDs of all yachts owned by this producer
          const yachtIds = yachtsSnapshot.docs.map(doc => doc.id);
          console.log(`Producer Reviews API: Yacht IDs for reviews query: ${yachtIds.join(', ')}`);
          
          // Now fetch reviews for these yachts
          try {
            console.log('Producer Reviews API: Querying reviews for yacht IDs');
            
            if (yachtIds.length > 10) {
              // Firestore 'in' queries are limited to 10 values, so we need to batch
              console.log('Producer Reviews API: More than 10 yacht IDs, using batched queries');
              
              const allReviews = [];
              for (let i = 0; i < yachtIds.length; i += 10) {
                const batchIds = yachtIds.slice(i, i + 10);
                const batchSnapshot = await adminDb.collection('reviews_and_feedback')
                  .where('relatedContentId', 'in', batchIds)
                  .get();
                
                const batchReviews = batchSnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
                }));
                
                allReviews.push(...batchReviews);
              }
              
              console.log(`Producer Reviews API: Found ${allReviews.length} total reviews across batches`);
              res.json(allReviews);
            } else {
              // If 10 or fewer yacht IDs, we can use a single query
              const reviewsSnapshot = await adminDb.collection('reviews_and_feedback')
                .where('relatedContentId', 'in', yachtIds)
                .get();
              
              const reviews = reviewsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              
              console.log(`Producer Reviews API: Found ${reviews.length} reviews`);
              res.json(reviews);
            }
          } catch (reviewsError) {
            console.error('Producer Reviews API: Error querying reviews collection:', reviewsError);
            
            // Fallback to empty array on error rather than failing
            console.log('Producer Reviews API: Returning empty array due to reviews query error');
            return res.json([]);
          }
        } catch (yachtsError) {
          console.error('Producer Reviews API: Error querying yachts collection:', yachtsError);
          return res.status(500).json({
            error: "Database query failed",
            message: "Failed to query yachts collection",
            details: String(yachtsError)
          });
        }
      } catch (producerIdError) {
        console.error('Producer Reviews API: Error getting producer ID:', producerIdError);
        return res.status(500).json({
          error: "Producer ID error",
          message: "Failed to retrieve producer ID",
          details: String(producerIdError)
        });
      }
    } catch (error) {
      console.error("Error fetching producer reviews:", error);
      res.status(500).json({ 
        error: "Failed to fetch reviews",
        message: String(error)
      });
    }
  });
  
  // Get producer bookings
  app.get("/api/producer/bookings", verifyAuth, async (req: Request, res: Response) => {
    // Set content type explicitly to ensure JSON response
    res.setHeader('Content-Type', 'application/json');
    
    try {
      console.log('Producer Bookings API: Request received');
      
      // Log user info from auth
      console.log('Producer Bookings API: User info from auth:', {
        uid: req.user?.uid,
        role: req.user?.role,
        email: req.user?.email,
      });
      
      // Get auth user ID from verified auth token
      const authUserId = req.user?.uid;
      
      if (!authUserId) {
        console.warn('Producer Bookings API: No user ID found in authentication data');
        return res.status(401).json({
          error: "Unauthorized",
          message: "Valid producer authentication required",
          details: "No user ID found in authentication data"
        });
      }
      
      try {
        // Use our helper function to get harmonized producer ID
        const { producerId } = await getHarmonizedProducerIds(authUserId);
        
        console.log(`Producer Bookings API: Fetching bookings for producer ID: ${producerId} (auth user: ${authUserId})`);
        
        try {
          // Query bookings related to yachts owned by this producer
          // First, get all yacht IDs owned by this producer
          console.log(`Producer Bookings API: Querying yachts owned by producer: ${producerId}`);
          const yachtsSnapshot = await adminDb.collection('unified_yacht_experiences')
            .where('producerId', '==', producerId)
            .get();
          
          console.log(`Producer Bookings API: Found ${yachtsSnapshot.size} yachts for producer`);
          
          if (yachtsSnapshot.empty) {
            console.log('Producer Bookings API: No yachts found for this producer, returning empty array');
            return res.json([]);
          }
          
          // Get the IDs of all yachts owned by this producer
          const yachtIds = yachtsSnapshot.docs.map(doc => doc.id);
          console.log(`Producer Bookings API: Yacht IDs for bookings query: ${yachtIds.join(', ')}`);
          
          // Check if we have a bookings collection
          try {
            // First check if bookings collection exists
            console.log('Producer Bookings API: Checking for bookings collection');
            const collections = await adminDb.listCollections();
            const collectionIds = collections.map(col => col.id);
            
            if (collectionIds.includes('bookings')) {
              console.log('Producer Bookings API: Bookings collection found, querying bookings');
              
              // We have a bookings collection, query it
              try {
                // If there are more than 10 yacht IDs, we need to batch queries
                if (yachtIds.length > 10) {
                  console.log('Producer Bookings API: More than 10 yacht IDs, using batched queries');
                  
                  const allBookings = [];
                  for (let i = 0; i < yachtIds.length; i += 10) {
                    const batchIds = yachtIds.slice(i, i + 10);
                    const batchSnapshot = await adminDb.collection('bookings')
                      .where('yachtId', 'in', batchIds)
                      .get();
                    
                    const batchBookings = batchSnapshot.docs.map(doc => ({
                      id: doc.id,
                      ...doc.data()
                    }));
                    
                    allBookings.push(...batchBookings);
                  }
                  
                  console.log(`Producer Bookings API: Found ${allBookings.length} total bookings across batches`);
                  res.json(allBookings);
                } else {
                  // If 10 or fewer yacht IDs, we can use a single query
                  const bookingsSnapshot = await adminDb.collection('bookings')
                    .where('yachtId', 'in', yachtIds)
                    .get();
                  
                  const bookings = bookingsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                  }));
                  
                  console.log(`Producer Bookings API: Found ${bookings.length} bookings`);
                  res.json(bookings);
                }
              } catch (bookingsQueryError) {
                console.error('Producer Bookings API: Error querying bookings collection:', bookingsQueryError);
                
                // Fallback to empty array
                console.log('Producer Bookings API: Returning empty array due to bookings query error');
                return res.json([]);
              }
            } else {
              // No bookings collection, return empty array
              console.log('Producer Bookings API: No bookings collection found, returning empty array');
              return res.json([]);
            }
          } catch (collectionsError) {
            console.error('Producer Bookings API: Error listing collections:', collectionsError);
            
            // Return empty array
            console.log('Producer Bookings API: Returning empty array due to collections error');
            return res.json([]);
          }
        } catch (yachtsError) {
          console.error('Producer Bookings API: Error querying yachts collection:', yachtsError);
          return res.status(500).json({
            error: "Database query failed",
            message: "Failed to query yachts collection",
            details: String(yachtsError)
          });
        }
      } catch (producerIdError) {
        console.error('Producer Bookings API: Error getting producer ID:', producerIdError);
        return res.status(500).json({
          error: "Producer ID error",
          message: "Failed to retrieve producer ID",
          details: String(producerIdError)
        });
      }
    } catch (error) {
      console.error("Error fetching producer bookings:", error);
      res.status(500).json({ 
        error: "Failed to fetch bookings",
        message: String(error)
      });
    }
  });
  
  // Endpoint to add producer ID to all yachts
  // Test endpoint for yacht operations (DEVELOPMENT ONLY)
  app.post("/api/test/yacht-operations", async (req: Request, res: Response) => {
    // Only allow this endpoint in development mode
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: "Forbidden",
        message: "Test endpoints are not available in production mode"
      });
    }
    
    try {
      console.log('Test Yacht Operations API: Request received');
      
      // Extract operation type and data from request
      const { operation, yachtData, yachtId } = req.body;
      
      if (!operation) {
        return res.status(400).json({
          error: "Missing operation",
          message: "Please specify an operation (create, update, delete)"
        });
      }
      
      // Create a test producer ID
      const testProducerId = 'test-producer-123';
      
      // Execute the requested operation
      let result;
      
      switch (operation) {
        case 'create':
          if (!yachtData) {
            return res.status(400).json({
              error: "Missing yacht data",
              message: "Please provide yacht data for creation"
            });
          }
          
          // Set producer ID and timestamps
          yachtData.producerId = testProducerId;
          yachtData.providerId = testProducerId;
          yachtData.package_id = yachtData.package_id || `test-yacht-${Date.now()}`;
          yachtData.availability_status = yachtData.availability_status !== undefined ? yachtData.availability_status : true;
          yachtData.isAvailable = yachtData.availability_status;
          yachtData.created_date = FieldValue.serverTimestamp();
          yachtData.last_updated_date = FieldValue.serverTimestamp();
          yachtData.createdAt = FieldValue.serverTimestamp();
          yachtData.updatedAt = FieldValue.serverTimestamp();
          
          // Add standardization tracking
          yachtData._standardized = true;
          yachtData._standardizedVersion = 1;
          
          // Ensure required fields
          if (!yachtData.title || !yachtData.description) {
            return res.status(400).json({
              error: "Missing required fields",
              message: "Title and description are required"
            });
          }
          
          // Create the yacht
          console.log(`Test API: Creating yacht with ID: ${yachtData.package_id}`);
          await adminDb.collection('unified_yacht_experiences').doc(yachtData.package_id).set(yachtData);
          
          result = {
            success: true,
            operation: 'create',
            message: "Test yacht created successfully",
            id: yachtData.package_id,
            yacht: {
              id: yachtData.package_id,
              title: yachtData.title
            }
          };
          break;
          
        case 'update':
          if (!yachtId) {
            return res.status(400).json({
              error: "Missing yacht ID",
              message: "Please provide a yacht ID to update"
            });
          }
          
          if (!yachtData) {
            return res.status(400).json({
              error: "Missing yacht data",
              message: "Please provide yacht data for update"
            });
          }
          
          // Check if yacht exists
          const yachtDoc = await adminDb.collection('unified_yacht_experiences').doc(yachtId).get();
          
          if (!yachtDoc.exists) {
            return res.status(404).json({
              error: "Yacht not found",
              message: `No yacht exists with ID: ${yachtId}`
            });
          }
          
          // Update timestamp fields
          yachtData.last_updated_date = FieldValue.serverTimestamp();
          yachtData.updatedAt = FieldValue.serverTimestamp();
          
          // Update the yacht
          console.log(`Test API: Updating yacht ${yachtId}`);
          await adminDb.collection('unified_yacht_experiences').doc(yachtId).update(yachtData);
          
          result = {
            success: true,
            operation: 'update',
            message: "Test yacht updated successfully",
            id: yachtId
          };
          break;
          
        case 'delete':
          if (!yachtId) {
            return res.status(400).json({
              error: "Missing yacht ID",
              message: "Please provide a yacht ID to delete"
            });
          }
          
          // Check if yacht exists
          const yachtToDelete = await adminDb.collection('unified_yacht_experiences').doc(yachtId).get();
          
          if (!yachtToDelete.exists) {
            return res.status(404).json({
              error: "Yacht not found",
              message: `No yacht exists with ID: ${yachtId}`
            });
          }
          
          // Delete the yacht
          console.log(`Test API: Deleting yacht ${yachtId}`);
          await adminDb.collection('unified_yacht_experiences').doc(yachtId).delete();
          
          result = {
            success: true,
            operation: 'delete',
            message: "Test yacht deleted successfully",
            id: yachtId
          };
          break;
          
        default:
          return res.status(400).json({
            error: "Invalid operation",
            message: "Operation must be one of: create, update, delete"
          });
      }
      
      return res.json(result);
    } catch (error) {
      console.error("Error in test yacht operations:", error);
      return res.status(500).json({
        error: "Test operation failed",
        message: String(error),
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      });
    }
  });

  app.post("/api/producer/set-producer-id", async (req: Request, res: Response) => {
    try {
      // Get producer ID from request body or use a default
      const producerId = req.body?.producerId || 'V4aiP9ihPbdnWNO6UbiZKEt1GoCZ';
      
      console.log(`Setting producer ID ${producerId} for all yachts in unified_yacht_experiences collection...`);
      
      const result = await addProducerIdToTestYachts(producerId);
      
      if (result) {
        res.json({ 
          success: true, 
          message: "Producer ID added to all yachts successfully", 
          producerId 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to add producer ID to yachts or no yachts found" 
        });
      }
    } catch (error) {
      console.error("Error adding producer ID:", error);
      res.status(500).json({ 
        error: "Failed to add producer ID to yachts", 
        message: String(error) 
      });
    }
  });

  // Remove duplicate standardize-collection route since we already defined it above

  /* 
  // Run the collection standardization script - REMOVED (duplicate route)
  app.post("/api/admin/standardize-collection", async (req, res) => {
    // This route was removed to resolve the duplicate route definition
    // The implementation is moved to line 41
  });
  */
  
  // Test route to list all collections
  app.get("/api/debug/collections", async (req, res) => {
    try {
      const collections = await adminDb.listCollections();
      const collectionIds = collections.map(col => col.id);
      
      // Create a result object for collection data
      const result: {
        collections: string[];
        data: {
          [key: string]: {
            count: number;
            samples: Array<{
              id: string;
              data: any;
            }>;
          }
        }
      } = {
        collections: collectionIds,
        data: {}
      };
      
      // Populate the data for each collection
      for (const colId of collectionIds) {
        const snapshot = await adminDb.collection(colId).limit(5).get();
        const docs = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          data: doc.data(),
        }));
        
        result.data[colId] = {
          count: docs.length,
          samples: docs
        };
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error listing collections:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Reverse geocoding proxy endpoint
  app.get("/api/geocode/reverse", async (req: Request, res: Response) => {
    try {
      const { lat, lng } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ 
          error: "Missing required parameters. Both 'lat' and 'lng' are required." 
        });
      }
      
      // Verify the parameters are valid numbers
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ 
          error: "Invalid coordinates. Latitude and longitude must be valid numbers." 
        });
      }
      
      // Using node-fetch to make the request
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );
      
      if (!response.ok) {
        console.error(`Google Maps API error: ${response.status} ${response.statusText}`);
        return res.status(response.status).json({ 
          error: "Error from Google Maps API", 
          details: response.statusText 
        });
      }
      
      const data = await response.json();
      
      // Return the results to the client
      res.json(data);
    } catch (error) {
      console.error("Error in reverse geocoding proxy:", error);
      res.status(500).json({ 
        error: "Failed to perform reverse geocoding", 
        details: String(error)
      });
    }
  });
  
  // Endpoint to fix the Abu Dhabi Grand Tour Yacht image
  app.post("/api/fix-grand-tour-yacht", async (_req: Request, res: Response) => {
    try {
      const success = await fixGrandTourYacht();
      
      if (success) {
        res.json({ 
          success: true, 
          message: "Successfully updated Abu Dhabi Grand Tour Yacht image"
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to update Abu Dhabi Grand Tour Yacht image"
        });
      }
    } catch (error) {
      console.error("Error fixing Grand Tour Yacht:", error);
      res.status(500).json({ 
        error: "Failed to fix Grand Tour Yacht", 
        message: String(error)
      });
    }
  });
  
  // Endpoint to create all yacht experiences
  app.post("/api/create-yacht-experiences", async (_req: Request, res: Response) => {
    try {
      const success = await createAllYachtExperiences();
      
      if (success) {
        res.json({ 
          success: true, 
          message: "Successfully created all yacht experiences"
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to create all yacht experiences"
        });
      }
    } catch (error) {
      console.error("Error creating all yacht experiences:", error);
      res.status(500).json({ 
        error: "Failed to create yacht experiences", 
        message: String(error)
      });
    }
  });

  // Partner Dashboard API endpoints
  
  /**
   * Get partner profile data
   * This endpoint fetches both core user data and partner-specific profile information
   */
  app.get("/api/partner/profile", verifyAuth, async (req: Request, res: Response) => {
    try {
      // Get authenticated user ID
      const userId = req.user?.uid;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get user data from harmonized_users collection (core data)
      const userDoc = await adminDb.collection('harmonized_users').doc(userId).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const userData = userDoc.data();
      
      // Verify this is a partner
      if (userData?.role !== 'partner') {
        return res.status(403).json({ error: "Access denied. Not a partner account." });
      }
      
      // Get partner profile from user_profiles_service_provider
      const profileDoc = await adminDb.collection('user_profiles_service_provider').doc(userId).get();
      const profileData = profileDoc.exists ? profileDoc.data() : null;
      
      // Return combined data
      res.json({
        core: userData,
        profile: profileData
      });
    } catch (error) {
      console.error("Error fetching partner profile:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  /**
   * Get all bookings where partner's add-ons are used
   */
  app.get("/api/partner/bookings", verifyAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.uid;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Define booking with add-ons interface for type safety
      interface BookingWithAddOns {
        id?: string;
        addOns?: Array<{
          id?: string;
          productId?: string;
          name?: string;
          price?: number;
          quantity?: number;
          [key: string]: any;
        }>;
        status?: string;
        [key: string]: any;
      }
      
      // First, get all add-ons created by this partner
      const addonsSnapshot = await adminDb.collection('products_add_ons')
        .where('partnerId', '==', userId)
        .get();
      
      if (addonsSnapshot.empty) {
        return res.json({ bookings: [] });
      }
      
      // Get the IDs of all add-ons
      const addonIds = addonsSnapshot.docs.map(doc => doc.id);
      
      // Find bookings that include these add-ons
      const bookingsSnapshot = await adminDb.collection('bookings')
        .where('status', 'in', ['pending', 'confirmed', 'completed'])
        .get();
      
      // Filter bookings that include partner's add-ons
      const partnerBookings = bookingsSnapshot.docs
        .filter(doc => {
          const bookingData = doc.data() as BookingWithAddOns;
          // Check if booking has add-ons field and includes any of the partner's add-ons
          return bookingData.addOns && 
                Array.isArray(bookingData.addOns) &&
                bookingData.addOns.some(addon => 
                  addonIds.includes(addon.id || addon.productId || '')
                );
        })
        .map(doc => {
          const bookingData = doc.data() as BookingWithAddOns;
          return {
            id: doc.id,
            ...bookingData,
            // Add details about which add-ons from this partner are included
            partnerAddons: bookingData.addOns?.filter(addon => 
              addonIds.includes(addon.id || addon.productId || '')
            )
          };
        });
      
      res.json({ bookings: partnerBookings });
    } catch (error) {
      console.error("Error fetching partner bookings:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  /**
   * Get earnings data for a partner
   */
  app.get("/api/partner/earnings", verifyAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.uid;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Define booking with add-ons interface for type safety
      interface BookingWithAddOns {
        id?: string;
        addOns?: Array<{
          id?: string;
          productId?: string;
          name?: string;
          price?: number;
          quantity?: number;
          [key: string]: any;
        }>;
        status?: string;
        createdAt?: {
          toDate?: () => Date;
          [key: string]: any;
        };
        [key: string]: any;
      }
      
      // Get the partner's profile to check for commission rate
      const profileDoc = await adminDb.collection('user_profiles_service_provider')
        .doc(userId)
        .get();
      
      if (!profileDoc.exists) {
        return res.json({
          earnings: {
            total: 0,
            currentMonth: 0,
            previousMonth: 0,
            bookingsCount: 0
          }
        });
      }
      
      const profileData = profileDoc.data();
      const commissionRate = profileData?.commissionRate || 0.8; // Default 80% to partner
      
      // Get all add-ons created by this partner
      const addonsSnapshot = await adminDb.collection('products_add_ons')
        .where('partnerId', '==', userId)
        .get();
      
      if (addonsSnapshot.empty) {
        return res.json({
          earnings: {
            total: 0,
            currentMonth: 0,
            previousMonth: 0,
            bookingsCount: 0
          }
        });
      }
      
      // Get the IDs of all add-ons
      const addonIds = addonsSnapshot.docs.map(doc => doc.id);
      
      // Find bookings that include these add-ons
      const bookingsSnapshot = await adminDb.collection('bookings')
        .where('status', 'in', ['confirmed', 'completed'])
        .get();
      
      // Filter bookings that include partner's add-ons
      const partnerBookings = bookingsSnapshot.docs
        .filter(doc => {
          const bookingData = doc.data() as BookingWithAddOns;
          // Check if booking has add-ons field and includes any of the partner's add-ons
          return bookingData.addOns && 
                Array.isArray(bookingData.addOns) &&
                bookingData.addOns.some(addon => 
                  addonIds.includes(addon.id || addon.productId || '')
                );
        })
        .map(doc => {
          const data = doc.data() as BookingWithAddOns;
          return {
            id: doc.id,
            ...data
          };
        });
      
      // Calculate earnings
      let totalEarnings = 0;
      let currentMonthEarnings = 0;
      let previousMonthEarnings = 0;
      
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const previousMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      
      partnerBookings.forEach(booking => {
        // Calculate earnings for this booking's add-ons created by the partner
        if (booking.addOns && Array.isArray(booking.addOns)) {
          const bookingDate = booking.createdAt?.toDate?.() || new Date();
          const bookingMonth = bookingDate.getMonth();
          const bookingYear = bookingDate.getFullYear();
          
          booking.addOns.forEach(addon => {
            // Check if this add-on belongs to the partner
            if (addonIds.includes(addon.id || addon.productId || '')) {
              const addonPrice = addon.price || 0;
              const partnerEarning = addonPrice * commissionRate;
              
              // Add to total
              totalEarnings += partnerEarning;
              
              // Add to current month if applicable
              if (bookingMonth === currentMonth && bookingYear === currentYear) {
                currentMonthEarnings += partnerEarning;
              }
              
              // Add to previous month if applicable
              if (bookingMonth === previousMonth && bookingYear === previousMonthYear) {
                previousMonthEarnings += partnerEarning;
              }
            }
          });
        }
      });
      
      res.json({
        earnings: {
          total: totalEarnings,
          currentMonth: currentMonthEarnings,
          previousMonth: previousMonthEarnings,
          bookingsCount: partnerBookings.length,
          commissionRate
        }
      });
    } catch (error) {
      console.error("Error getting partner earnings:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  /**
   * Get all add-ons created by this partner
   */
  app.get("/api/partner/addons", verifyAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.uid;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Query add-ons created by this partner
      const addonsSnapshot = await adminDb.collection('products_add_ons')
        .where('partnerId', '==', userId)
        .get();
      
      const addons = addonsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      res.json({ addons });
    } catch (error) {
      console.error("Error fetching partner add-ons:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  /**
   * Create a new add-on
   */
  app.post("/api/partner/addons/create", verifyAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.uid;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { name, description, category, pricing, media, availability, tags } = req.body;
      
      // Basic validation
      if (!name || !category || pricing === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Create add-on document
      const addonData = {
        productId: `addon-${userId}-${Date.now()}`,
        name,
        description: description || "",
        category,
        pricing: parseFloat(pricing),
        media: media || [],
        availability: availability !== false,
        tags: tags || [],
        partnerId: userId,
        createdDate: FieldValue.serverTimestamp(),
        lastUpdatedDate: FieldValue.serverTimestamp()
      };
      
      // Save to Firestore
      const addonRef = adminDb.collection('products_add_ons').doc(addonData.productId);
      await addonRef.set(addonData);
      
      res.json({
        success: true,
        addon: {
          id: addonData.productId,
          ...addonData
        }
      });
    } catch (error) {
      console.error("Error creating add-on:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  
  /**
   * Admin endpoint to create partner add-ons
   * This is used for testing and development only
   */
  app.post("/api/test/create-partner-addon", async (req: Request, res: Response) => {
    try {
      const { partnerId, addon } = req.body;
      
      if (!partnerId || !addon) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Basic validation
      if (!addon.name || !addon.category || addon.pricing === undefined) {
        return res.status(400).json({ error: "Missing required add-on fields" });
      }
      
      console.log(`Creating add-on "${addon.name}" for partner ${partnerId}`);
      
      // Create add-on document
      const addonData = {
        productId: `addon-${partnerId}-${Date.now()}`,
        name: addon.name,
        description: addon.description || "",
        category: addon.category,
        pricing: parseFloat(addon.pricing),
        media: addon.media || [],
        availability: addon.availability !== false,
        tags: addon.tags || [],
        partnerId: partnerId,
        createdDate: FieldValue.serverTimestamp(),
        lastUpdatedDate: FieldValue.serverTimestamp()
      };
      
      // Save to Firestore
      const addonRef = adminDb.collection('products_add_ons').doc(addonData.productId);
      await addonRef.set(addonData);
      
      console.log(`Successfully created add-on: ${addon.name} with ID: ${addonData.productId}`);
      
      res.json({
        success: true,
        addon: {
          id: addonData.productId,
          ...addonData
        }
      });
    } catch (error) {
      console.error("Error creating partner add-on:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  
  /**
   * Test endpoint to list partner add-ons without authentication
   * This is used for testing and development only
   */
  app.get("/api/test/partner-addons/:partnerId", async (req: Request, res: Response) => {
    try {
      const { partnerId } = req.params;
      
      if (!partnerId) {
        return res.status(400).json({ error: "Missing partner ID" });
      }
      
      console.log(`Fetching add-ons for partner ${partnerId}`);
      
      // Query Firestore for partner's add-ons
      const addonsSnapshot = await adminDb.collection('products_add_ons')
        .where('partnerId', '==', partnerId)
        .get();
      
      const addons: Array<Record<string, any>> = [];
      
      addonsSnapshot.forEach((doc) => {
        const data = doc.data();
        addons.push({
          id: doc.id,
          ...data
        });
      });
      
      console.log(`Found ${addons.length} add-ons for partner ${partnerId}`);
      
      res.json({
        success: true,
        addons: addons
      });
    } catch (error) {
      console.error("Error fetching partner add-ons:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  
  /**
   * Test endpoint to get yachts for a producer without authentication
   * This is used for testing and development only
   */
  app.get("/api/test/producer-yachts/:producerId", async (req: Request, res: Response) => {
    try {
      const { producerId } = req.params;
      
      if (!producerId) {
        return res.status(400).json({ error: "Missing producer ID" });
      }
      
      console.log(`Fetching yachts for producer ${producerId}`);
      
      // Query Firestore for producer's yachts
      const yachtsSnapshot = await adminDb.collection('unified_yacht_experiences')
        .where('providerId', '==', producerId)
        .limit(10)
        .get();
      
      const yachts: Array<Record<string, any>> = [];
      
      yachtsSnapshot.forEach((doc) => {
        const data = doc.data();
        yachts.push({
          id: doc.id,
          title: data.title || data.name || 'Unnamed Yacht',
          description: data.description || '',
          category: data.category || '',
          location: data.location || {},
          pricing: data.pricing || data.price || 0,
          providerId: data.providerId || data.producerId || producerId,
          createdAt: data.createdAt || data.created_date,
          updatedAt: data.updatedAt || data.last_updated_date,
          media: data.media || []
        });
      });
      
      console.log(`Found ${yachts.length} yachts for producer ${producerId}`);
      
      res.json({
        success: true,
        yachts: yachts
      });
    } catch (error) {
      console.error("Error fetching producer yachts:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  
  /**
   * Test endpoint to update a yacht with partner add-ons
   * This is used for testing and development only
   */
  app.post("/api/test/update-yacht-addons/:yachtId", async (req: Request, res: Response) => {
    try {
      const { yachtId } = req.params;
      const { includedAddOns, optionalAddOns } = req.body;
      
      if (!yachtId) {
        return res.status(400).json({ error: "Missing yacht ID" });
      }
      
      console.log(`Updating yacht ${yachtId} with partner add-ons`);
      console.log(`Included add-ons: ${includedAddOns ? includedAddOns.length : 0}`);
      console.log(`Optional add-ons: ${optionalAddOns ? optionalAddOns.length : 0}`);
      
      // Get the yacht document
      const yachtRef = adminDb.collection('unified_yacht_experiences').doc(yachtId);
      const yachtDoc = await yachtRef.get();
      
      if (!yachtDoc.exists) {
        return res.status(404).json({ error: "Yacht not found" });
      }
      
      // Update the yacht with the add-ons
      const updateData: Record<string, any> = {};
      
      if (includedAddOns) {
        updateData.includedAddOns = includedAddOns;
      }
      
      if (optionalAddOns) {
        updateData.optionalAddOns = optionalAddOns;
      }
      
      // Always update the timestamp
      updateData.updatedAt = FieldValue.serverTimestamp();
      updateData.last_updated_date = FieldValue.serverTimestamp(); // For backward compatibility
      
      // Update the document
      await yachtRef.update(updateData);
      
      console.log(`Successfully updated yacht ${yachtId} with partner add-ons`);
      
      res.json({
        success: true,
        yachtId,
        message: "Successfully bundled partner add-ons with yacht"
      });
    } catch (error) {
      console.error("Error updating yacht with add-ons:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  
  /**
   * Test endpoint to create the bundling endpoint
   * This is just a utility endpoint for testing
   */
  app.post("/api/test/create-bundling-endpoint", async (req: Request, res: Response) => {
    try {
      console.log("Creating bundling endpoint for testing");
      
      res.json({
        success: true,
        message: "Bundling endpoint is available"
      });
    } catch (error) {
      console.error("Error creating bundling endpoint:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  /**
   * Update partner profile
   */
  app.post("/api/partner/profile/update", verifyAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.uid;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { core, profile } = req.body;
      
      // Update core user data in harmonized_users (only specific fields)
      if (core) {
        const allowedCoreFields = ['name', 'phone', 'email'];
        const coreUpdates: Record<string, any> = {};
        
        allowedCoreFields.forEach(field => {
          if (core[field] !== undefined) {
            coreUpdates[field] = core[field];
          }
        });
        
        if (Object.keys(coreUpdates).length > 0) {
          coreUpdates.updatedAt = FieldValue.serverTimestamp();
          
          await adminDb.collection('harmonized_users').doc(userId).update(coreUpdates);
        }
      }
      
      // Update profile data in user_profiles_service_provider
      if (profile) {
        const profileUpdates: Record<string, any> = { ...profile };
        profileUpdates.lastUpdated = FieldValue.serverTimestamp();
        
        // Check if profile exists first
        const profileDoc = await adminDb.collection('user_profiles_service_provider').doc(userId).get();
        
        if (profileDoc.exists) {
          await adminDb.collection('user_profiles_service_provider').doc(userId).update(profileUpdates);
        } else {
          // Create new profile if it doesn't exist
          const newProfile = {
            providerId: userId,
            businessName: profile.businessName || core?.name || "Partner Business",
            contactInformation: {
              address: profile.contactInformation?.address || "",
              ...(profile.contactInformation || {})
            },
            profilePhoto: profile.profilePhoto || "",
            servicesOffered: profile.servicesOffered || [],
            certifications: profile.certifications || [],
            ratings: 0,
            tags: profile.tags || [],
            lastUpdated: FieldValue.serverTimestamp()
          };
          
          await adminDb.collection('user_profiles_service_provider').doc(userId).set(newProfile);
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating partner profile:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Register User Profile routes
  registerUserProfileRoutes(app);

  // Register Stripe-related routes
  registerStripeRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}