import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerStripeRoutes } from "./stripe";
import { adminDb } from "./firebase-admin";

export async function registerRoutes(app: Express): Promise<Server> {
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
  app.get("/api/yachts/producer", async (req, res) => {
    try {
      // Parse pagination parameters from query string
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      
      // In a real implementation, we would get the producer ID from auth
      // For now, we'll just query all yachts since we're in development mode
      
      // Get experiences with pagination and sorting
      const experiencesResponse = await storage.getAllExperiencePackages({
        page,
        pageSize,
        sortByStatus: true
      });
      
      // Transform response to match the expected format
      res.json({
        yachts: experiencesResponse.data,
        pagination: experiencesResponse.pagination
      });
    } catch (error) {
      console.error("Error fetching producer yachts:", error);
      res.status(500).json({ error: "Failed to fetch yachts" });
    }
  });
  
  // Get producer add-ons with pagination and ordering by availability
  app.get("/api/addons/producer", async (req, res) => {
    try {
      // Parse pagination parameters from query string
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      
      // In a real implementation, we would get the producer ID from auth
      // For now, we'll just query all add-ons since we're in development mode
      
      // Create a reference to the collection
      const addonsRef = adminDb.collection('products_add_ons');
      
      // Create a query with ordering by availability (descending - so true comes before false)
      // and then by lastUpdatedDate (newest first)
      const addonsQuery = addonsRef.orderBy('availability', 'desc')
                           .orderBy('lastUpdatedDate', 'desc');
      
      // Get the total count first for pagination metadata
      const totalAddons = await adminDb.collection('products_add_ons').count().get();
      const totalCount = totalAddons.data().count;
      
      // Apply pagination
      const offset = (page - 1) * pageSize;
      const paginatedQuery = addonsQuery.offset(offset).limit(pageSize);
      
      // Execute the query
      const snapshot = await paginatedQuery.get();
      
      if (snapshot.empty) {
        return res.json({
          addons: [],
          pagination: {
            currentPage: page,
            pageSize: pageSize,
            totalCount: totalCount,
            totalPages: Math.ceil(totalCount / pageSize)
          }
        });
      }
      
      const addons = snapshot.docs.map(doc => ({
        ...doc.data(),
        productId: doc.id // Ensure productId is set
      }));
      
      // Return the add-ons along with pagination metadata
      res.json({
        addons: addons,
        pagination: {
          currentPage: page,
          pageSize: pageSize,
          totalCount: totalCount,
          totalPages: Math.ceil(totalCount / pageSize)
        }
      });
    } catch (error) {
      console.error("Error fetching producer add-ons:", error);
      res.status(500).json({ error: "Failed to fetch add-ons" });
    }
  });
  
  // Get producer reviews
  app.get("/api/reviews/producer", async (req, res) => {
    try {
      // In a real implementation, we would get the producer ID from auth and filter reviews
      // For now, we'll just return an empty array
      res.json([]);
    } catch (error) {
      console.error("Error fetching producer reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });
  
  // Get producer bookings
  app.get("/api/bookings/producer", async (req, res) => {
    try {
      // In a real implementation, we would get the producer ID from auth and filter bookings
      // For now, we'll just return an empty array
      res.json([]);
    } catch (error) {
      console.error("Error fetching producer bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  // Register Stripe-related routes
  registerStripeRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}