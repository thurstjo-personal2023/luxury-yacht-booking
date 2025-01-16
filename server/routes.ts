import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { sql } from "drizzle-orm";

// Define component types
interface BaseComponent {
  name: string;
  status: "operational" | "failing" | "degraded";
  type: "core" | "optional";
}

interface HealthComponent extends BaseComponent {
  lastChecked?: string;
  error?: string;
}

export function registerRoutes(app: Express): Server {
  // Enhanced health check endpoint
  app.get("/api/health", async (_req, res) => {
    try {
      // Get system metrics first since they're always available
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();

      // Basic health response
      const healthResponse = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(uptime / 60)} minutes ${Math.floor(uptime % 60)} seconds`,
        memory: {
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`
        }
      };

      // Try database check but don't fail the health check if it's not ready
      try {
        await db.execute(sql`SELECT 1`);
        Object.assign(healthResponse, { database: "connected" });
      } catch (dbError) {
        Object.assign(healthResponse, { database: "disconnected" });
      }

      res.json(healthResponse);
    } catch (error) {
      // If something else fails, return unhealthy status
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  // Detailed component health status
  app.get("/api/health/details", async (_req, res) => {
    try {
      // Initialize components with guaranteed services
      const components: HealthComponent[] = [
        {
          name: "web_server",
          status: "operational",
          type: "core"
        },
        {
          name: "static_assets",
          status: "operational",
          type: "core"
        }
      ];

      // Check database status
      try {
        await db.execute(sql`SELECT 1`);
        components.push({
          name: "database",
          status: "operational",
          type: "core",
          lastChecked: new Date().toISOString()
        });
      } catch (dbError) {
        components.push({
          name: "database",
          status: "failing",
          type: "core",
          lastChecked: new Date().toISOString(),
          error: dbError instanceof Error ? dbError.message : "Database connection failed"
        });
      }

      const overallStatus = components.every(c => c.status === "operational") 
        ? "operational" 
        : "degraded";

      res.json({
        status: overallStatus,
        components,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Failed to check component status"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}