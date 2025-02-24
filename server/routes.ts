import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Experience Packages with Filters
  app.get("/api/experiences", async (req, res) => {
    try {
      const { type, region, port_marina } = req.query;
      console.log('Received filter request:', { type, region, port_marina });

      const filters: any = {};

      // Only add filters if they are provided
      if (type) filters.type = type as string;
      if (region) filters.region = region as string;
      if (port_marina) filters.port_marina = port_marina as string;

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

  const httpServer = createServer(app);
  return httpServer;
}