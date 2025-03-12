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
    try {
      // Set cache control headers to prevent caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Parse pagination parameters from query string
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      
      // Get producerId directly from verified auth token (req.user is set by verifyAuth middleware)
      const producerId = req.user?.uid;
      if (!producerId) {
        return res.status(401).json({ error: "Unauthorized. Valid producer authentication required." });
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
    try {
      // Set cache control headers to prevent caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Parse pagination parameters from query string
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      
      // Get producerId directly from verified auth token (req.user is set by verifyAuth middleware)
      const producerId = req.user?.uid;
      if (!producerId) {
        return res.status(401).json({ error: "Unauthorized. Valid producer authentication required." });
      }
      console.log(`Using authenticated user ID as producer ID: ${producerId}`);
      
      // Force fresh data with a timestamp
      const forceRefresh = Date.now();
      console.log(`Fetching add-ons for producer ID: ${producerId || 'all'} (refresh: ${forceRefresh})`);
      
      // Get add-ons with pagination and sorting
      const addonsResponse = await storage.getAllProductAddOns({
        partnerId: producerId,  // Use partnerId for filtering if provided
        page,
        pageSize,
        sortByStatus: true
      });
      
      // Transform response to match the expected format
      res.json({
        addons: addonsResponse.data,
        pagination: addonsResponse.pagination
      });
    } catch (error) {
      console.error("Error fetching producer add-ons:", error);
      res.status(500).json({ error: "Failed to fetch add-ons" });
    }
  });
  
  // Create a new add-on for a producer
  app.post("/api/producer/addons/create", verifyAuth, async (req: Request, res: Response) => {
    try {
      const addonData = req.body;
      
      // Get the authenticated user ID from the auth token (set by verifyAuth middleware)
      const authUserId = req.user?.uid;
      
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
          message: "Name, producerId, and partnerId are required fields" 
        });
      }
      
      // Ensure consistent field naming
      addonData.productId = addonData.productId || `ADD-${Date.now()}`;
      addonData.availability = addonData.availability !== undefined ? addonData.availability : true;
      addonData.isAvailable = addonData.availability;
      addonData.createdDate = addonData.createdDate || FieldValue.serverTimestamp();
      addonData.lastUpdatedDate = FieldValue.serverTimestamp();
      addonData.updatedAt = FieldValue.serverTimestamp();
      addonData._standardized = true;
      addonData._standardizedVersion = 1;
      
      // Add to Firestore
      const addonRef = adminDb.collection('products_add_ons').doc(addonData.productId);
      await addonRef.set(addonData);
      
      res.json({ 
        success: true, 
        message: "Add-on created successfully",
        productId: addonData.productId
      });
    } catch (error) {
      console.error("Error creating add-on:", error);
      res.status(500).json({ error: "Failed to create add-on", message: String(error) });
    }
  });
  
  // Get producer reviews
  app.get("/api/producer/reviews", verifyAuth, async (req: Request, res: Response) => {
    try {
      // Get auth user ID from verified auth token
      const authUserId = req.user?.uid;
      
      // Use our helper function to get harmonized producer ID
      const { producerId } = await getHarmonizedProducerIds(authUserId);
      
      console.log(`Fetching reviews for producer ID: ${producerId} (auth user: ${authUserId})`);
      
      // Return reviews where the relatedContentId matches any yacht owned by this producer
      // First, get all of this producer's yachts
      const yachtsSnapshot = await adminDb.collection('unified_yacht_experiences')
        .where('producerId', '==', producerId)
        .get();
      
      if (yachtsSnapshot.empty) {
        return res.json([]);
      }
      
      // Get the IDs of all yachts owned by this producer
      const yachtIds = yachtsSnapshot.docs.map(doc => doc.id);
      
      // Now fetch reviews for these yachts
      const reviewsSnapshot = await adminDb.collection('reviews_and_feedback')
        .where('relatedContentId', 'in', yachtIds)
        .get();
      
      const reviews = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching producer reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });
  
  // Get producer bookings
  app.get("/api/producer/bookings", verifyAuth, async (req: Request, res: Response) => {
    try {
      // Get auth user ID from verified auth token
      const authUserId = req.user?.uid;
      
      // Use our helper function to get harmonized producer ID
      const { producerId } = await getHarmonizedProducerIds(authUserId);
      
      console.log(`Fetching bookings for producer ID: ${producerId} (auth user: ${authUserId})`);
      
      // Query bookings related to yachts owned by this producer
      // First, get all yacht IDs owned by this producer
      const yachtsSnapshot = await adminDb.collection('unified_yacht_experiences')
        .where('producerId', '==', producerId)
        .get();
      
      if (yachtsSnapshot.empty) {
        return res.json([]);
      }
      
      // Get the IDs of all yachts owned by this producer
      const yachtIds = yachtsSnapshot.docs.map(doc => doc.id);
      
      // Fetch bookings for these yacht IDs
      // Note: This is a placeholder. In a real implementation, you'd query a bookings collection
      // For now, return an empty array
      res.json([]);
    } catch (error) {
      console.error("Error fetching producer bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });
  
  // Endpoint to add producer ID to all yachts
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
  
  // Register User Profile routes
  registerUserProfileRoutes(app);

  // Register Stripe-related routes
  registerStripeRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}