import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { registerUserProfileRoutes } from "./user-profile-routes";
import { registerUploadRoutes } from "./upload-routes";
import { registerEmailRoutes } from "./email-routes";
import { registerAdminRoutes } from "./admin-routes";
import { registerAdminProfileRoutes } from "./admin-profile-routes";
import { registerAdminAuthRoutes } from "./admin-auth-routes";
import { registerAdminUserRoutes } from "./admin-user-routes";
import { testProductionStorage, runStorageTest } from "./test-storage";
import { USE_FIREBASE_EMULATORS } from "./env-config";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    log("Starting server initialization...");
    const server = await registerRoutes(app);
    
    // Register user profile routes
    registerUserProfileRoutes(app);
    
    // Register file upload routes
    registerUploadRoutes(app);
    
    // Register email notification routes
    registerEmailRoutes(app);
    
    // Register admin routes
    registerAdminRoutes(app);
    
    // Register admin profile routes
    registerAdminProfileRoutes(app);
    
    // Register admin authentication routes
    registerAdminAuthRoutes(app);
    
    // Register admin user management routes
    registerAdminUserRoutes(app);
    
    // Test Firebase Storage in production
    if (!USE_FIREBASE_EMULATORS) {
      log("Testing Firebase Storage in production...");
      setTimeout(async () => {
        try {
          await runStorageTest();
        } catch (error) {
          console.error("Error testing storage:", error);
        }
      }, 5000);
    } else {
      log("Using Firebase emulators - skipping production storage test");
    }

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("Server error:", err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // Setup Vite or static serving based on environment
    if (app.get("env") === "development") {
      log("Setting up Vite development server...");
      await setupVite(app, server);
    } else {
      log("Setting up static file serving...");
      serveStatic(app);
    }

    // Try different ports if the default port is in use
    const tryPorts = [5000, 3000, 8080, 4000];
    const HOST = '0.0.0.0';

    const startServer = async (ports: number[]): Promise<void> => {
      for (const PORT of ports) {
        try {
          await new Promise<void>((resolve, reject) => {
            server.listen(PORT, HOST, () => {
              log(`Server started successfully on ${HOST}:${PORT}`);
              resolve();
            }).on('error', (err: any) => {
              if (err.code === 'EADDRINUSE') {
                log(`Port ${PORT} is in use, trying next port...`);
              } else {
                reject(err);
              }
            });
          });
          return; // If successful, exit the function
        } catch (error) {
          if (PORT === ports[ports.length - 1]) {
            throw new Error("All ports are in use. Please free up a port and try again.");
          }
          // Continue to next port if current one fails
          continue;
        }
      }
    };

    await startServer(tryPorts);

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      console.error("Server error:", error);
      process.exit(1);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();