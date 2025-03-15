import { Express, Request, Response, NextFunction } from "express";
import multer from "multer";
import { verifyAuth } from "./firebase-admin";
import { adminStorage } from "./firebase-admin";
import path from "path";
import * as crypto from "crypto";

// Configure multer storage
const storage = multer.memoryStorage();

// File size constants
const MB = 1024 * 1024;
const MAX_FILE_SIZE = 50 * MB; // 50MB limit

// Configure multer with increased limits
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

// Custom error handler for multer errors
const handleMulterError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File too large',
        details: `Maximum file size is ${MAX_FILE_SIZE / MB}MB`,
      });
    }
    return res.status(400).json({
      success: false,
      error: 'File upload error',
      details: err.message,
    });
  }
  next(err);
};

/**
 * Register upload-related routes
 */
export function registerUploadRoutes(app: Express) {
  // Media upload endpoint for yacht images and videos
  app.post(
    "/api/upload/media",
    verifyAuth,
    (req: Request, res: Response, next: NextFunction) => {
      upload.single("file")(req, res, (err) => {
        if (err) {
          return handleMulterError(err, req, res, next);
        }
        next();
      });
    },
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: "No file provided",
          });
        }

        if (!req.user || !req.user.uid) {
          return res.status(401).json({
            success: false,
            error: "Unauthorized: User ID not found",
          });
        }

        // Get file details
        const file = req.file;
        const userId = req.user.uid;
        const timestamp = Date.now();
        const originalName = file.originalname;
        
        // Generate a random string as part of filename to avoid collisions
        const randomString = crypto.randomBytes(8).toString("hex");
        
        // Create a unique filename with timestamp and random string
        const filename = `${timestamp}_${randomString}_${originalName}`;
        const storagePath = `yacht_media/${userId}/${filename}`;
        
        // Determine file type
        const fileType = file.mimetype.startsWith("video/") ? "video" : "image";
        
        // Create a file reference
        const fileRef = adminStorage.bucket().file(storagePath);
        
        // Set metadata
        const metadata = {
          contentType: file.mimetype,
          metadata: {
            uploadedBy: userId,
            originalName: originalName,
            timestamp: timestamp.toString(),
          },
        };
        
        // Upload the file
        await fileRef.save(file.buffer, {
          metadata: metadata,
        });
        
        // Make the file publicly accessible
        await fileRef.makePublic();
        
        // Get the public URL
        const downloadURL = `https://storage.googleapis.com/${adminStorage.bucket().name}/${storagePath}`;
        
        // Return success response with the file information
        res.status(200).json({
          success: true,
          file: {
            type: fileType,
            url: downloadURL,
            name: originalName,
            path: storagePath,
          },
        });
      } catch (error: any) {
        console.error("Error uploading file:", error);
        res.status(500).json({
          success: false,
          error: "Failed to upload file",
          details: error.message || "Unknown error",
        });
      }
    }
  );

  // Media deletion endpoint
  app.delete(
    "/api/upload/media",
    verifyAuth,
    async (req: Request, res: Response) => {
      try {
        const { filePath } = req.body;
        
        if (!filePath) {
          return res.status(400).json({
            success: false,
            error: "No file path provided",
          });
        }
        
        if (!req.user || !req.user.uid) {
          return res.status(401).json({
            success: false,
            error: "Unauthorized: User ID not found",
          });
        }
        
        // Verify that the file belongs to the current user
        if (!filePath.includes(`yacht_media/${req.user.uid}/`)) {
          return res.status(403).json({
            success: false,
            error: "Forbidden: Cannot delete files that don't belong to you",
          });
        }
        
        // Delete the file
        await adminStorage.bucket().file(filePath).delete();
        
        res.status(200).json({
          success: true,
          message: "File deleted successfully",
        });
      } catch (error: any) {
        console.error("Error deleting file:", error);
        res.status(500).json({
          success: false,
          error: "Failed to delete file",
          details: error.message || "Unknown error",
        });
      }
    }
  );
}