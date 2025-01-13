import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { yachts, bookings, reviews } from "@db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Yacht routes
  app.get("/api/yachts", async (req, res) => {
    try {
      const allYachts = await db.query.yachts.findMany({
        with: {
          owner: true,
          reviews: true,
        },
      });
      res.json(allYachts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch yachts" });
    }
  });

  app.get("/api/yachts/:id", async (req, res) => {
    try {
      const yacht = await db.query.yachts.findFirst({
        where: eq(yachts.id, parseInt(req.params.id)),
        with: {
          owner: true,
          reviews: {
            with: {
              user: true,
            },
          },
        },
      });
      
      if (!yacht) {
        return res.status(404).json({ message: "Yacht not found" });
      }
      
      res.json(yacht);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch yacht" });
    }
  });

  // Booking routes
  app.post("/api/bookings", async (req, res) => {
    try {
      const { userId, yachtId, startDate, endDate, totalPrice } = req.body;
      
      // Check availability
      const existingBooking = await db.query.bookings.findFirst({
        where: and(
          eq(bookings.yachtId, yachtId),
          gte(bookings.startDate, new Date(startDate)),
          lte(bookings.endDate, new Date(endDate))
        ),
      });

      if (existingBooking) {
        return res.status(400).json({ message: "Yacht not available for these dates" });
      }

      const newBooking = await db.insert(bookings).values({
        userId,
        yachtId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalPrice,
        status: "pending",
        paymentStatus: "pending",
      }).returning();

      res.status(201).json(newBooking[0]);
    } catch (error) {
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.get("/api/bookings/user/:userId", async (req, res) => {
    try {
      const userBookings = await db.query.bookings.findMany({
        where: eq(bookings.userId, parseInt(req.params.userId)),
        with: {
          yacht: true,
        },
      });
      res.json(userBookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Review routes
  app.post("/api/reviews", async (req, res) => {
    try {
      const { userId, yachtId, rating, comment } = req.body;
      
      const newReview = await db.insert(reviews).values({
        userId,
        yachtId,
        rating,
        comment,
      }).returning();

      res.status(201).json(newReview[0]);
    } catch (error) {
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  return httpServer;
}
