import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertVendorSchema, insertListingSchema } from "@shared/schema";
import { z } from "zod";
import {
  searchUSDAMarketsByZip,
  searchUSDAMarketsByState,
  searchGooglePlaces,
  searchYelp,
  aggregateSearch,
  getFacebookMarketplaceLinks,
  getCraigslistLinks,
} from "./integrations";

// Stripe
let stripe: any = null;
if (process.env.STRIPE_SECRET_KEY) {
  const Stripe = require("stripe");
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
}

const STRIPE_PRICES: Record<string, { amount: number; name: string; interval: string }> = {
  featured: { amount: 999, name: "LocalOG Featured Listing", interval: "month" },
  premium: { amount: 2499, name: "LocalOG Premium Listing", interval: "month" },
};

export function registerRoutes(httpServer: Server, app: Express) {
  // Stats
  app.get("/api/stats", (_req, res) => {
    res.json(storage.getStats());
  });

  // Vendors
  app.get("/api/vendors", (req, res) => {
    const { zipCode, state, category, search } = req.query as Record<string, string>;
    const results = storage.getVendors({ zipCode, state, category, search });
    res.json(results);
  });

  app.get("/api/vendors/:id", (req, res) => {
    const vendor = storage.getVendor(Number(req.params.id));
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    res.json(vendor);
  });

  app.post("/api/vendors", (req, res) => {
    const result = insertVendorSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.flatten() });
    const vendor = storage.createVendor(result.data);
    res.status(201).json(vendor);
  });

  // Listings
  app.get("/api/listings", (req, res) => {
    const { vendorId, category, zipCode, state, search } = req.query as Record<string, string>;
    const results = storage.getListings({
      vendorId: vendorId ? Number(vendorId) : undefined,
      category, zipCode, state, search,
    });
    res.json(results);
  });

  app.get("/api/listings/:id", (req, res) => {
    const listing = storage.getListing(Number(req.params.id));
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    res.json(listing);
  });

  app.post("/api/listings", (req, res) => {
    const result = insertListingSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.flatten() });
    const listing = storage.createListing(result.data);
    res.status(201).json(listing);
  });

  // Markets
  app.get("/api/markets", (req, res) => {
    const { zipCode, state, search } = req.query as Record<string, string>;
    const results = storage.getMarkets({ zipCode, state, search });
    res.json(results);
  });

  app.get("/api/markets/:id", (req, res) => {
    const market = storage.getMarket(Number(req.params.id));
    if (!market) return res.status(404).json({ error: "Market not found" });
    res.json(market);
  });

  // Web search — returns enriched results from local DB
  app.get("/api/search", (req, res) => {
    const { q, zipCode, state, type } = req.query as Record<string, string>;
    const results: Record<string, unknown[]> = {};

    if (!type || type === "listings") {
      results.listings = storage.getListings({ zipCode, state, search: q });
    }
    if (!type || type === "vendors") {
      results.vendors = storage.getVendors({ zipCode, state, search: q });
    }
    if (!type || type === "markets") {
      results.markets = storage.getMarkets({ zipCode, state, search: q });
    }

    res.json(results);
  });

  // -------------------------------------------------------------------------
  // External data routes (USDA, Google Places, Yelp)
  // -------------------------------------------------------------------------

  // USDA Farmers Markets — live search
  app.get("/api/external/markets", async (req, res) => {
    const { zipCode, state } = req.query as Record<string, string>;
    try {
      let results: any[] = [];
      if (zipCode) {
        results = await searchUSDAMarketsByZip(zipCode);
      } else if (state) {
        results = await searchUSDAMarketsByState(state);
      }
      res.json({ markets: results, source: "usda" });
    } catch (e) {
      console.error("External markets route error:", e);
      res.json({ markets: [], source: "usda", error: "USDA unavailable" });
    }
  });

  // Google Places + Yelp — local businesses
  app.get("/api/external/businesses", async (req, res) => {
    const { zipCode, state, search } = req.query as Record<string, string>;
    try {
      const [googleResults, yelpResults] = await Promise.allSettled([
        searchGooglePlaces({ zipCode, state, search }),
        searchYelp({ zipCode, state, search }),
      ]);

      const businesses = [
        ...(googleResults.status === "fulfilled" ? googleResults.value : []),
        ...(yelpResults.status === "fulfilled" ? yelpResults.value : []),
      ];

      const sources = [];
      if (process.env.GOOGLE_PLACES_API_KEY) sources.push("google");
      if (process.env.YELP_API_KEY) sources.push("yelp");

      res.json({ businesses, sources });
    } catch (e) {
      console.error("External businesses route error:", e);
      res.json({ businesses: [], sources: [] });
    }
  });

  // Facebook Marketplace + Craigslist deep links
  app.get("/api/external/marketplace-links", (req, res) => {
    const { zipCode, city, state } = req.query as Record<string, string>;
    const fb = getFacebookMarketplaceLinks({ zipCode, city, state });
    const cl = getCraigslistLinks({ zipCode, city, state });
    res.json({ facebook: fb, craigslist: cl });
  });

  // Aggregate all sources
  app.get("/api/external/aggregate", async (req, res) => {
    const { zipCode, state, search, type } = req.query as Record<string, string>;
    try {
      const result = await aggregateSearch({
        zipCode,
        state,
        search,
        type: type as any,
      });
      res.json(result);
    } catch (e) {
      console.error("Aggregate search error:", e);
      res.json({ markets: [], businesses: [], sources: [], errors: ["Aggregate search failed"] });
    }
  });

  // -------------------------------------------------------------------------
  // Stripe payment routes
  // -------------------------------------------------------------------------

  // Create Stripe Checkout Session for featured/premium listing
  app.post("/api/stripe/create-checkout", async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ error: "Payment processing not configured" });
    }

    const schema = z.object({
      vendorId: z.number(),
      tier: z.enum(["featured", "premium"]),
      successUrl: z.string().url().optional(),
      cancelUrl: z.string().url().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { vendorId, tier, successUrl, cancelUrl } = parsed.data;
    const priceInfo = STRIPE_PRICES[tier];

    try {
      const vendor = storage.getVendor(vendorId);
      if (!vendor) return res.status(404).json({ error: "Vendor not found" });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: priceInfo.name,
                description: `Upgrade ${vendor.name} to ${tier} status on LocalOG`,
                images: vendor.imageUrl ? [vendor.imageUrl] : [],
              },
              unit_amount: priceInfo.amount,
              recurring: { interval: priceInfo.interval as "month" },
            },
            quantity: 1,
          },
        ],
        metadata: {
          vendorId: String(vendorId),
          tier,
        },
        success_url: successUrl ?? `${req.headers.origin ?? "https://localog.com"}/#/vendor-portal?upgraded=true&tier=${tier}`,
        cancel_url: cancelUrl ?? `${req.headers.origin ?? "https://localog.com"}/#/vendor-portal?cancelled=true`,
      });

      // Store pending featured listing record
      storage.createFeaturedListing({
        vendorId,
        tier,
        stripeSessionId: session.id,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (e: any) {
      console.error("Stripe checkout error:", e);
      res.status(500).json({ error: e.message ?? "Failed to create checkout session" });
    }
  });

  // Stripe Webhook
  app.post("/api/stripe/webhook", async (req, res) => {
    if (!stripe) return res.status(503).json({ error: "Not configured" });

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: any;

    try {
      if (webhookSecret) {
        const sig = req.headers["stripe-signature"] as string;
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        event = req.body;
      }
    } catch (e: any) {
      return res.status(400).json({ error: `Webhook error: ${e.message}` });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const { vendorId, tier } = session.metadata ?? {};
      if (vendorId && tier) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
        storage.activateFeaturedListing({
          stripeSessionId: session.id,
          stripePaymentId: session.payment_intent,
          status: "active",
          expiresAt: expiresAt.toISOString(),
        });
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      storage.cancelFeaturedListingByPaymentId(sub.latest_invoice);
    }

    res.json({ received: true });
  });

  // Get featured listing status for a vendor
  app.get("/api/vendors/:id/featured", (req, res) => {
    const featured = storage.getFeaturedListing(Number(req.params.id));
    res.json(featured ?? null);
  });

  return httpServer;
}
