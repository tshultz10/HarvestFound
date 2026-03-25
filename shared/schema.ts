import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Vendors / Sellers
export const vendors = sqliteTable("vendors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // "produce", "crafts", "bakery", "dairy", "meat", "plants", "other"
  zipCode: text("zip_code").notNull(),
  state: text("state").notNull(),
  city: text("city").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  website: text("website"),
  instagramHandle: text("instagram_handle"),
  imageUrl: text("image_url"),
  isVerified: integer("is_verified", { mode: "boolean" }).default(false),
  source: text("source").default("registered"), // "registered" | "web" | "usda" | "facebook"
});

// Product/Item Listings
export const listings = sqliteTable("listings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vendorId: integer("vendor_id").references(() => vendors.id),
  title: text("title").notNull(),
  description: text("description"),
  price: real("price"),
  priceUnit: text("price_unit"), // "each", "lb", "dozen", "bundle"
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  inSeason: integer("in_season", { mode: "boolean" }).default(true),
  tags: text("tags"), // JSON array stored as text
  externalUrl: text("external_url"), // Link to Facebook Marketplace, Etsy, etc.
  externalSource: text("external_source"), // "facebook", "etsy", "craigslist", "website"
});

// Farmers Markets / Events
export const markets = sqliteTable("markets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  schedule: text("schedule").notNull(), // e.g. "Every Saturday 8am-2pm"
  seasonStart: text("season_start"), // "April"
  seasonEnd: text("season_end"), // "October"
  website: text("website"),
  imageUrl: text("image_url"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  source: text("source").default("usda"), // "usda" | "registered" | "web"
});

// Featured / Premium Listings (Stripe-backed)
export const featuredListings = sqliteTable("featured_listings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  tier: text("tier").notNull(), // "featured" | "premium"
  stripeSessionId: text("stripe_session_id"),
  stripePaymentId: text("stripe_payment_id"),
  status: text("status").default("pending"), // "pending" | "active" | "expired" | "cancelled"
  expiresAt: text("expires_at"), // ISO date string
  createdAt: text("created_at"),
});

// Insert schemas
export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true, isVerified: true });
export const insertListingSchema = createInsertSchema(listings).omit({ id: true });
export const insertMarketSchema = createInsertSchema(markets).omit({ id: true });
export const insertFeaturedListingSchema = createInsertSchema(featuredListings).omit({ id: true });

// Types
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type InsertListing = z.infer<typeof insertListingSchema>;
export type InsertMarket = z.infer<typeof insertMarketSchema>;
export type InsertFeaturedListing = z.infer<typeof insertFeaturedListingSchema>;

export type Vendor = typeof vendors.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type Market = typeof markets.$inferSelect;
export type FeaturedListing = typeof featuredListings.$inferSelect;
