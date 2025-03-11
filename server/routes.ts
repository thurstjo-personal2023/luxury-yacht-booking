import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage, addProducerIdToTestYachts } from "./storage";
import { registerStripeRoutes } from "./stripe";
import { adminDb } from "./firebase-admin";
import { spawn } from "child_process";
import path from "path";
import { FieldValue } from "firebase-admin/firestore";

import { insertTestYachts } from "./create-test-data";

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Legacy API endpoints
  // Export normalized yacht schema
  app.get("/api/export/yacht-schema", async (req, res) => {
    try {
      // Get yacht data from yacht_experiences collection
      const snapshot = await adminDb.collection('yacht_experiences').get();
      
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
  app.get("/api/producer/yachts", async (req, res) => {
    try {
      // Set cache control headers to prevent caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Parse pagination parameters from query string
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const producerId = req.query.producerId as string;
      
      // Force fresh data with a timestamp to prevent 304 responses
      const forceRefresh = Date.now();
      console.log(`Fetching yachts for producer ID: ${producerId || 'all'} (refresh: ${forceRefresh})`);
      
      // In a real implementation, we would get the producer ID from auth
      // For development, we'll either use the provided producerId or get all yachts with a producer ID
      
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
  app.get("/api/producer/addons", async (req, res) => {
    try {
      // Set cache control headers to prevent caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Parse pagination parameters from query string
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const producerId = req.query.producerId as string;
      
      // Force fresh data with a timestamp
      const forceRefresh = Date.now();
      console.log(`Fetching add-ons for producer ID: ${producerId || 'all'} (refresh: ${forceRefresh})`);
      
      // In a real implementation, we would get the producer ID from auth
      // For now, we'll just query all add-ons since we're in development mode
      
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
  
  // Get producer reviews
  app.get("/api/producer/reviews", async (req, res) => {
    try {
      const producerId = req.query.producerId as string;
      console.log(`Fetching reviews for producer ID: ${producerId || 'all'}`);
      
      // In a real implementation, we would get the producer ID from auth and filter reviews
      // For now, we'll just return an empty array
      res.json([]);
    } catch (error) {
      console.error("Error fetching producer reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });
  
  // Get producer bookings
  app.get("/api/producer/bookings", async (req, res) => {
    try {
      const producerId = req.query.producerId as string;
      console.log(`Fetching bookings for producer ID: ${producerId || 'all'}`);
      
      // In a real implementation, we would get the producer ID from auth and filter bookings
      // For now, we'll just return an empty array
      res.json([]);
    } catch (error) {
      console.error("Error fetching producer bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
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
  
  // Register Stripe-related routes
  registerStripeRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}