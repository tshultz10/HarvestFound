import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, like, or, and } from "drizzle-orm";
import {
  vendors, listings, markets, featuredListings,
  type Vendor, type Listing, type Market, type FeaturedListing,
  type InsertVendor, type InsertListing, type InsertMarket, type InsertFeaturedListing,
} from "@shared/schema";

const sqlite = new Database("localog.db");
export const db = drizzle(sqlite);

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    state TEXT NOT NULL,
    city TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    website TEXT,
    instagram_handle TEXT,
    image_url TEXT,
    is_verified INTEGER DEFAULT 0,
    source TEXT DEFAULT 'registered'
  );

  CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER REFERENCES vendors(id),
    title TEXT NOT NULL,
    description TEXT,
    price REAL,
    price_unit TEXT,
    category TEXT NOT NULL,
    image_url TEXT,
    in_season INTEGER DEFAULT 1,
    tags TEXT,
    external_url TEXT,
    external_source TEXT
  );

  CREATE TABLE IF NOT EXISTS markets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    schedule TEXT NOT NULL,
    season_start TEXT,
    season_end TEXT,
    website TEXT,
    image_url TEXT,
    latitude REAL,
    longitude REAL,
    source TEXT DEFAULT 'usda'
  );

  CREATE TABLE IF NOT EXISTS featured_listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER REFERENCES vendors(id) NOT NULL,
    tier TEXT NOT NULL,
    stripe_session_id TEXT,
    stripe_payment_id TEXT,
    status TEXT DEFAULT 'pending',
    expires_at TEXT,
    created_at TEXT
  );
`);

// Seed demo data if empty
const vendorCount = db.select().from(vendors).all().length;
if (vendorCount === 0) {
  const seedVendors: InsertVendor[] = [
    { name: "Sunrise Organic Farm", description: "Family-run organic produce farm, growing seasonal vegetables and fruits since 1998. No pesticides, no GMO.", category: "produce", zipCode: "84401", state: "UT", city: "Ogden", email: "sunrise@example.com", phone: "801-555-0101", website: "https://sunriseorganics.example.com", instagramHandle: "@sunriseorganics", imageUrl: "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=800", source: "registered" },
    { name: "Mountain Honey Co.", description: "Raw wildflower honey harvested from hives in the Wasatch Mountains. Creamed, infused, and comb honey available.", category: "other", zipCode: "84401", state: "UT", city: "Ogden", email: "honey@example.com", phone: "801-555-0202", instagramHandle: "@mountainhoneyco", imageUrl: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800", source: "registered" },
    { name: "Red Mesa Ceramics", description: "Hand-thrown pottery and functional ceramics inspired by Southwest patterns. Each piece is one-of-a-kind.", category: "crafts", zipCode: "84103", state: "UT", city: "Salt Lake City", email: "redmesa@example.com", phone: "801-555-0303", website: "https://redmesa.example.com", imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800", source: "registered" },
    { name: "Sage & Thyme Bakery", description: "Artisan sourdough, rye breads, pastries and seasonal pies. Baked fresh twice weekly using locally milled flour.", category: "bakery", zipCode: "84601", state: "UT", city: "Provo", email: "sagethyme@example.com", phone: "801-555-0404", imageUrl: "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800", source: "registered" },
    { name: "Beeswax & Bloom", description: "Handcrafted beeswax candles, lip balms, and botanical soaps. All-natural, no synthetic fragrances.", category: "crafts", zipCode: "84401", state: "UT", city: "Ogden", email: "beeswaxbloom@example.com", instagramHandle: "@beeswaxbloom", imageUrl: "https://images.unsplash.com/photo-1603032305898-e4e0c9ab2a6e?w=800", source: "registered" },
    { name: "High Desert Mushrooms", description: "Gourmet mushroom cultivation: oyster, shiitake, lion's mane, and seasonal varieties. Fresh and dried.", category: "produce", zipCode: "84770", state: "UT", city: "St. George", email: "mushrooms@example.com", imageUrl: "https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?w=800", source: "registered" },
    { name: "Canyon Creek Dairy", description: "Small-batch farmstead cheese, butter, and cultured dairy from pasture-raised cows and goats.", category: "dairy", zipCode: "84601", state: "UT", city: "Provo", email: "canyoncreek@example.com", phone: "801-555-0606", imageUrl: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=800", source: "registered" },
    { name: "Woven West Textiles", description: "Hand-woven rugs, wall hangings, and blankets using natural fibers and plant-based dyes.", category: "crafts", zipCode: "84403", state: "UT", city: "Ogden", email: "wovenwest@example.com", website: "https://wovenwest.example.com", imageUrl: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800", source: "web" },
  ];

  const insertedVendors: Vendor[] = [];
  for (const v of seedVendors) {
    const inserted = db.insert(vendors).values(v).returning().get();
    insertedVendors.push(inserted);
  }

  const seedListings: InsertListing[] = [
    { vendorId: insertedVendors[0].id, title: "Heirloom Tomato Mix", description: "Colorful mix of Cherokee Purple, Brandywine, and Green Zebra tomatoes. Sold by the pound.", price: 4.50, priceUnit: "lb", category: "produce", imageUrl: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800", inSeason: true, tags: '["organic","heirloom","summer"]' },
    { vendorId: insertedVendors[0].id, title: "Salad Greens Bundle", description: "Mixed lettuce, arugula, spinach, and herbs. Harvested morning of market day.", price: 6.00, priceUnit: "bundle", category: "produce", imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800", inSeason: true, tags: '["organic","greens","fresh"]' },
    { vendorId: insertedVendors[1].id, title: "Wildflower Raw Honey", description: "Raw unfiltered honey from mixed wildflower forage in the Wasatch foothills.", price: 14.00, priceUnit: "each", category: "other", imageUrl: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800", inSeason: true, tags: '["raw","honey","local"]' },
    { vendorId: insertedVendors[2].id, title: "Geometric Stoneware Mug", description: "Wheel-thrown stoneware mug with geometric carved pattern. Holds 12oz. Microwave and dishwasher safe.", price: 38.00, priceUnit: "each", category: "crafts", imageUrl: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800", inSeason: true, tags: '["pottery","ceramic","handmade"]' },
    { vendorId: insertedVendors[3].id, title: "Country Sourdough Loaf", description: "Large 2lb country sourdough with crispy crust and open crumb. Naturally leavened, 24-hour ferment.", price: 9.00, priceUnit: "each", category: "bakery", imageUrl: "https://images.unsplash.com/photo-1549931319-a545dcf3bc7c?w=800", inSeason: true, tags: '["sourdough","bread","artisan"]' },
    { vendorId: insertedVendors[4].id, title: "Lavender Beeswax Candle", description: "100% beeswax pillar candle scented with real lavender essential oil. 40+ hour burn time.", price: 18.00, priceUnit: "each", category: "crafts", imageUrl: "https://images.unsplash.com/photo-1574181611642-0e02a33b5263?w=800", inSeason: true, tags: '["candle","beeswax","lavender"]' },
    { vendorId: insertedVendors[5].id, title: "Fresh Oyster Mushrooms", description: "Cluster-harvested oyster mushrooms, same-day fresh. Great for stir-fries, soups, and pasta.", price: 8.00, priceUnit: "lb", category: "produce", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800", inSeason: true, tags: '["mushroom","fresh","gourmet"]' },
    { vendorId: insertedVendors[6].id, title: "Cave-Aged Cheddar", description: "6-month aged farmstead cheddar with sharp, complex flavor. Made from raw milk.", price: 12.00, priceUnit: "lb", category: "dairy", imageUrl: "https://images.unsplash.com/photo-1452195100486-9cc805987862?w=800", inSeason: true, tags: '["cheese","cheddar","raw milk"]' },
    { vendorId: insertedVendors[7].id, title: "Natural Dye Throw Blanket", description: "Hand-woven merino wool throw, dyed with walnut, indigo, and madder. 50\" x 70\".", price: 195.00, priceUnit: "each", category: "crafts", imageUrl: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800", inSeason: true, tags: '["wool","weaving","natural dye"]' },
  ];

  for (const l of seedListings) {
    db.insert(listings).values(l).run();
  }

  const seedMarkets: InsertMarket[] = [
    { name: "Ogden Farmers Market", description: "Year-round indoor market featuring 60+ local vendors, live music, and seasonal events.", address: "2380 Washington Blvd", city: "Ogden", state: "UT", zipCode: "84401", schedule: "Saturdays 8am–1pm", seasonStart: "Year-round", seasonEnd: "Year-round", website: "https://ogdenfarmersmarket.example.com", imageUrl: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800", latitude: 41.223, longitude: -111.973, source: "usda" },
    { name: "SLC Downtown Farmers Market", description: "Utah's largest outdoor farmers market in Pioneer Park. Fresh produce, crafts, food trucks and more.", address: "Pioneer Park, 350 W 300 S", city: "Salt Lake City", state: "UT", zipCode: "84101", schedule: "Saturdays 8am–2pm, June–October", seasonStart: "June", seasonEnd: "October", website: "https://slcfarmersmarket.example.com", imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800", latitude: 40.760, longitude: -111.896, source: "usda" },
    { name: "Provo Farmers Market", description: "Family-friendly market in the heart of downtown Provo. Local farms, artisans, and prepared foods.", address: "100 S University Ave", city: "Provo", state: "UT", zipCode: "84601", schedule: "Saturdays 9am–1pm, May–October", seasonStart: "May", seasonEnd: "October", imageUrl: "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=800", latitude: 40.234, longitude: -111.659, source: "usda" },
    { name: "Logan Gardeners Market", description: "Cache Valley's premier market with emphasis on organic growing and sustainable living.", address: "200 N Main St", city: "Logan", state: "UT", zipCode: "84321", schedule: "Saturdays 8am–1pm, May–November", seasonStart: "May", seasonEnd: "November", imageUrl: "https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?w=800", latitude: 41.735, longitude: -111.834, source: "usda" },
    { name: "St. George Farmers Market", description: "Southern Utah's largest market bringing together Dixie region farmers and artisans.", address: "Town Square, 50 S Main St", city: "St. George", state: "UT", zipCode: "84770", schedule: "Saturdays 8am–12pm, October–May", seasonStart: "October", seasonEnd: "May", imageUrl: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800", latitude: 37.104, longitude: -113.584, source: "usda" },
  ];

  for (const m of seedMarkets) {
    db.insert(markets).values(m).run();
  }
}

export interface IStorage {
  // Vendors
  getVendors(filters?: { zipCode?: string; state?: string; category?: string; search?: string }): Vendor[];
  getVendor(id: number): Vendor | undefined;
  createVendor(data: InsertVendor): Vendor;

  // Listings
  getListings(filters?: { vendorId?: number; category?: string; zipCode?: string; state?: string; search?: string }): (Listing & { vendorName?: string; vendorCity?: string })[];
  getListing(id: number): Listing | undefined;
  createListing(data: InsertListing): Listing;

  // Markets
  getMarkets(filters?: { zipCode?: string; state?: string; search?: string }): Market[];
  getMarket(id: number): Market | undefined;
  createMarket(data: InsertMarket): Market;

  // Featured Listings (Stripe)
  getFeaturedListing(vendorId: number): FeaturedListing | undefined;
  createFeaturedListing(data: Omit<InsertFeaturedListing, 'expiresAt'> & { stripeSessionId?: string; status?: string; createdAt?: string }): FeaturedListing;
  activateFeaturedListing(data: { stripeSessionId: string; stripePaymentId: string; status: string; expiresAt: string }): void;
  cancelFeaturedListingByPaymentId(paymentId: string): void;

  // Stats
  getStats(): { vendorCount: number; listingCount: number; marketCount: number; stateCount: number };
}

export const storage: IStorage = {
  getVendors(filters = {}) {
    let query = db.select().from(vendors);
    const conditions = [];
    if (filters.zipCode) conditions.push(eq(vendors.zipCode, filters.zipCode));
    if (filters.state) conditions.push(eq(vendors.state, filters.state.toUpperCase()));
    if (filters.category) conditions.push(eq(vendors.category, filters.category));
    if (filters.search) {
      conditions.push(or(
        like(vendors.name, `%${filters.search}%`),
        like(vendors.description, `%${filters.search}%`),
        like(vendors.city, `%${filters.search}%`)
      ));
    }
    if (conditions.length > 0) {
      return db.select().from(vendors).where(and(...conditions)).all();
    }
    return db.select().from(vendors).all();
  },

  getVendor(id) {
    return db.select().from(vendors).where(eq(vendors.id, id)).get();
  },

  createVendor(data) {
    return db.insert(vendors).values(data).returning().get();
  },

  getListings(filters = {}) {
    const allListings = db.select().from(listings).all();
    const allVendors = db.select().from(vendors).all();
    const vendorMap = new Map(allVendors.map(v => [v.id, v]));

    let result = allListings.map(l => ({
      ...l,
      vendorName: vendorMap.get(l.vendorId ?? 0)?.name,
      vendorCity: vendorMap.get(l.vendorId ?? 0)?.city,
      vendorState: vendorMap.get(l.vendorId ?? 0)?.state,
      vendorZip: vendorMap.get(l.vendorId ?? 0)?.zipCode,
    }));

    if (filters.vendorId) result = result.filter(l => l.vendorId === filters.vendorId);
    if (filters.category) result = result.filter(l => l.category === filters.category);
    if (filters.zipCode) result = result.filter(l => l.vendorZip === filters.zipCode);
    if (filters.state) result = result.filter(l => l.vendorState?.toUpperCase() === filters.state?.toUpperCase());
    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(l =>
        l.title.toLowerCase().includes(s) ||
        (l.description ?? "").toLowerCase().includes(s) ||
        (l.vendorName ?? "").toLowerCase().includes(s)
      );
    }

    return result;
  },

  getListing(id) {
    return db.select().from(listings).where(eq(listings.id, id)).get();
  },

  createListing(data) {
    return db.insert(listings).values(data).returning().get();
  },

  getMarkets(filters = {}) {
    const conditions = [];
    if (filters.zipCode) conditions.push(eq(markets.zipCode, filters.zipCode));
    if (filters.state) conditions.push(eq(markets.state, filters.state.toUpperCase()));
    if (filters.search) {
      conditions.push(or(
        like(markets.name, `%${filters.search}%`),
        like(markets.city, `%${filters.search}%`),
        like(markets.description ?? "", `%${filters.search}%`)
      ));
    }
    if (conditions.length > 0) {
      return db.select().from(markets).where(and(...conditions)).all();
    }
    return db.select().from(markets).all();
  },

  getMarket(id) {
    return db.select().from(markets).where(eq(markets.id, id)).get();
  },

  createMarket(data) {
    return db.insert(markets).values(data).returning().get();
  },

  getFeaturedListing(vendorId) {
    return db.select().from(featuredListings)
      .where(eq(featuredListings.vendorId, vendorId))
      .get();
  },

  createFeaturedListing(data) {
    return db.insert(featuredListings).values({
      vendorId: data.vendorId,
      tier: data.tier,
      stripeSessionId: data.stripeSessionId,
      status: data.status ?? "pending",
      createdAt: data.createdAt ?? new Date().toISOString(),
    }).returning().get();
  },

  activateFeaturedListing({ stripeSessionId, stripePaymentId, status, expiresAt }) {
    const record = db.select().from(featuredListings)
      .where(eq(featuredListings.stripeSessionId, stripeSessionId))
      .get();
    if (record) {
      sqlite.prepare(
        `UPDATE featured_listings SET status = ?, stripe_payment_id = ?, expires_at = ? WHERE stripe_session_id = ?`
      ).run(status, stripePaymentId, expiresAt, stripeSessionId);
    }
  },

  cancelFeaturedListingByPaymentId(paymentId) {
    sqlite.prepare(
      `UPDATE featured_listings SET status = 'cancelled' WHERE stripe_payment_id = ?`
    ).run(paymentId);
  },

  getStats() {
    const vendorCount = db.select().from(vendors).all().length;
    const listingCount = db.select().from(listings).all().length;
    const marketCount = db.select().from(markets).all().length;
    const allVendors = db.select().from(vendors).all();
    const stateCount = new Set(allVendors.map(v => v.state)).size;
    return { vendorCount, listingCount, marketCount, stateCount };
  },
};
