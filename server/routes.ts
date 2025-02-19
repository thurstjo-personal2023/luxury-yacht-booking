import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { verifyAuth } from "./firebase-admin";
import type { YachtProfile, TouristProfile, ExperiencePackage } from "@shared/firestore-schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Yacht Profiles
  app.get("/api/yachts", async (_req, res) => {
    try {
      const yachts = await storage.getAllYachtProfiles();
      res.json(yachts);
    } catch (error) {
      console.error("Error fetching yachts:", error);
      res.status(500).json({ error: "Failed to fetch yachts" });
    }
  });

  app.get("/api/yachts/featured", async (_req, res) => {
    try {
      const yachts = await storage.getFeaturedYachtProfiles();
      res.json(yachts);
    } catch (error) {
      console.error("Error fetching featured yachts:", error);
      res.status(500).json({ error: "Failed to fetch featured yachts" });
    }
  });

  // Tourist Profiles
  app.get("/api/tourist-profile", verifyAuth, async (req, res) => {
    try {
      const profile = await storage.getTouristProfileByEmail(req.user.email);
      if (!profile) {
        return res.status(404).json({ error: "Tourist profile not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error fetching tourist profile:", error);
      res.status(500).json({ error: "Failed to fetch tourist profile" });
    }
  });

  // Experience Packages
  app.get("/api/experiences", async (_req, res) => {
    try {
      const experiences = await storage.getAllExperiencePackages();
      res.json(experiences);
    } catch (error) {
      console.error("Error fetching experiences:", error);
      res.status(500).json({ error: "Failed to fetch experiences" });
    }
  });

  app.get("/api/experiences/featured", async (_req, res) => {
    try {
      const experiences = await storage.getFeaturedExperiencePackages();
      res.json(experiences);
    } catch (error) {
      console.error("Error fetching featured experiences:", error);
      res.status(500).json({ error: "Failed to fetch featured experiences" });
    }
  });

  // Service Provider Profiles
  app.get("/api/service-provider", verifyAuth, async (req, res) => {
    try {
      const profile = await storage.getServiceProviderByEmail(req.user.email);
      if (!profile) {
        return res.status(404).json({ error: "Service provider profile not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error fetching service provider profile:", error);
      res.status(500).json({ error: "Failed to fetch service provider profile" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}