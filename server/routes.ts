import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerStripeRoutes } from "./stripe";
import { adminDb } from "./firebase-admin";

export async function registerRoutes(app: Express): Promise<Server> {
  // Experience Packages with Filters
  app.get("/api/experiences", async (req, res) => {
    try {
      const { type, region, port_marina } = req.query;
      console.log('Received filter request:', { type, region, port_marina });

      const filters: any = {};

      // Only add filters if they are provided with non-empty values
      if (type && type !== '') filters.type = type as string;
      if (region && region !== '') filters.region = region as string;
      if (port_marina && port_marina !== '') filters.port_marina = port_marina as string;

      const experiences = await storage.getAllExperiencePackages(
        Object.keys(filters).length > 0 ? filters : undefined
      );

      console.log(`Returning ${experiences.length} experiences`);
      res.json(experiences);
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

  // Get producer yachts
  app.get("/api/yachts/producer", async (req, res) => {
    try {
      // In a real implementation, we would get the producer ID from auth
      // For now, we'll just return all yachts since we're in development mode
      const snapshot = await adminDb.collection('yacht_experiences').get();
      
      if (snapshot.empty) {
        return res.json([]);
      }
      
      const yachts = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        package_id: doc.id // Ensure package_id is set, using doc.id as fallback
      }));
      
      res.json(yachts);
    } catch (error) {
      console.error("Error fetching producer yachts:", error);
      res.status(500).json({ error: "Failed to fetch yachts" });
    }
  });
  
  // Get producer add-ons
  app.get("/api/addons/producer", async (req, res) => {
    try {
      // In a real implementation, we would get the producer ID from auth
      // For now, we'll just return all add-ons or an empty array
      const snapshot = await adminDb.collection('products_add_ons').get();
      
      if (snapshot.empty) {
        return res.json([]);
      }
      
      const addons = snapshot.docs.map(doc => ({
        ...doc.data(),
        productId: doc.id // Ensure productId is set
      }));
      
      res.json(addons);
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