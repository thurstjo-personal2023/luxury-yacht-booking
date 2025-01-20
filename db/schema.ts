import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("firebase_uid").unique().notNull(),
  email: text("email").unique().notNull(),
  role: text("role").notNull(),
  displayName: text("display_name"),
  photoURL: text("photo_url"),
  loyaltyPoints: integer("loyalty_points").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const yachts = pgTable("yachts", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").references(() => users.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  location: text("location").notNull(),
  capacity: integer("capacity").notNull(),
  features: jsonb("features").notNull(),
  images: jsonb("images").notNull(),
  available: boolean("available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  yachtId: integer("yacht_id").references(() => yachts.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalPrice: integer("total_price").notNull(),
  status: text("status").notNull().default("pending"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  yachtId: integer("yacht_id").references(() => yachts.id),
  bookingId: integer("booking_id").references(() => bookings.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
  reviews: many(reviews),
}));

export const yachtRelations = relations(yachts, ({ one, many }) => ({
  owner: one(users, {
    fields: [yachts.ownerId],
    references: [users.id],
  }),
  bookings: many(bookings),
  reviews: many(reviews),
}));

export const bookingRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  yacht: one(yachts, {
    fields: [bookings.yachtId],
    references: [yachts.id],
  }),
  reviews: many(reviews),
}));

export const reviewRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  yacht: one(yachts, {
    fields: [reviews.yachtId],
    references: [yachts.id],
  }),
  booking: one(bookings, {
    fields: [reviews.bookingId],
    references: [bookings.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertYachtSchema = createInsertSchema(yachts);
export const selectYachtSchema = createSelectSchema(yachts);
export const insertBookingSchema = createInsertSchema(bookings);
export const selectBookingSchema = createSelectSchema(bookings);
export const insertReviewSchema = createInsertSchema(reviews);
export const selectReviewSchema = createSelectSchema(reviews);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Yacht = typeof yachts.$inferSelect;
export type NewYacht = typeof yachts.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;