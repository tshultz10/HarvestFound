/**
 * LocalOG — External Data Integrations
 * 
 * 1. USDA Farmers Market Directory API (free, no auth)
 * 2. Google Places API (requires GOOGLE_PLACES_API_KEY)
 * 3. Yelp Fusion API (requires YELP_API_KEY)
 * 4. Facebook Marketplace — deep link search approach (no private API available)
 */

import fetch from "node-fetch";

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export interface ExternalMarket {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  schedule?: string;
  website?: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  source: "usda" | "google" | "yelp" | "community";
  externalUrl?: string;
  products?: string[];
  acceptedPayments?: string[];
  season?: string;
  phone?: string;
}

export interface ExternalBusiness {
  id: string;
  name: string;
  description?: string;
  category: string;
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  phone?: string;
  website?: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  latitude?: number;
  longitude?: number;
  source: "google" | "yelp" | "usda" | "community";
  externalUrl?: string;
  isOpen?: boolean;
}

export interface SearchResult {
  markets: ExternalMarket[];
  businesses: ExternalBusiness[];
  sources: string[];
  errors: string[];
}

// ---------------------------------------------------------------------------
// USDA Farmers Market Directory API
// Endpoint: http://search.ams.usda.gov/farmersmarkets/v1/data.svc/
// ZIP search: /zipSearch?zip=84401
// Details: /mktDetail?id=1000343
// ---------------------------------------------------------------------------

const USDA_BASE = "https://search.ams.usda.gov/farmersmarkets/v1/data.svc";

export async function searchUSDAMarketsByZip(zip: string): Promise<ExternalMarket[]> {
  try {
    const url = `${USDA_BASE}/zipSearch?zip=${encodeURIComponent(zip)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];

    const data = await res.json() as any;
    const results = data?.results ?? [];

    // Fetch details for up to 8 markets (to keep response fast)
    const detailPromises = results.slice(0, 8).map((m: any) =>
      fetchUSDAMarketDetail(m.id).catch(() => null)
    );
    const details = await Promise.all(detailPromises);

    return details.filter(Boolean) as ExternalMarket[];
  } catch (e) {
    console.error("USDA zip search error:", e);
    return [];
  }
}

export async function searchUSDAMarketsByState(state: string): Promise<ExternalMarket[]> {
  // USDA doesn't have a direct state search, so we use a broad zip search
  // by using a representative zip code per state, or fall back to a keyword approach
  const stateZips: Record<string, string[]> = {
    UT: ["84101", "84401", "84601"], CA: ["90001", "94102", "92101"],
    TX: ["78201", "75201", "77001"], NY: ["10001", "14201", "11201"],
    FL: ["33101", "32202", "34201"], CO: ["80201", "80521", "80901"],
    WA: ["98101", "99201", "98402"], OR: ["97201", "97401", "97701"],
    AZ: ["85001", "85701", "86001"], ID: ["83201", "83401", "83701"],
    MT: ["59601", "59101", "59401"], WY: ["82001", "82601", "82901"],
    NV: ["89101", "89501", "89701"], NM: ["87101", "87501", "87701"],
  };

  const zips = stateZips[state.toUpperCase()] ?? [];
  if (!zips.length) return [];

  const allResults = await Promise.all(zips.map(z => searchUSDAMarketsByZip(z)));
  const seen = new Set<string>();
  return allResults.flat().filter(m => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return m.state?.toUpperCase() === state.toUpperCase();
  });
}

async function fetchUSDAMarketDetail(id: string): Promise<ExternalMarket | null> {
  try {
    const url = `${USDA_BASE}/mktDetail?id=${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;

    const data = await res.json() as any;
    const m = data?.marketdetails?.[0] ?? data?.marketdetails ?? data;

    if (!m?.MarketName) return null;

    // Parse address
    const address = m.Address ?? "";
    const cityStateZip = m.city ?? "";
    const parts = cityStateZip.split(",").map((s: string) => s.trim());
    const city = parts[0] ?? "";
    const stateZip = (parts[1] ?? "").trim().split(" ");
    const state = stateZip[0] ?? "";
    const zip = stateZip[1] ?? "";

    // Parse products from the listing
    const products: string[] = [];
    const productFields = ["Vegetables", "Herbs", "Fruits", "Grains", "Flowers",
      "Nuts", "Eggs", "Seafood", "Honey", "Jams", "Meat", "Plants", "Prepared",
      "Crafts", "Organic", "Soap", "Cheese", "Maple", "Mushrooms", "Beans"];
    for (const field of productFields) {
      if (m[field] === "Y") products.push(field.toLowerCase());
    }

    const schedule = [m.Season1Date, m.Season1Time].filter(Boolean).join(" | ");

    return {
      id: `usda-${id}`,
      name: m.MarketName,
      address,
      city,
      state,
      zipCode: zip,
      schedule: schedule || "See website for schedule",
      website: m.Website ?? undefined,
      phone: m.Phone ?? undefined,
      source: "usda",
      externalUrl: `https://www.ams.usda.gov/local-food-directories/farmersmarkets`,
      products,
      season: m.Season1Date ?? undefined,
      latitude: m.x ? parseFloat(m.x) : undefined,
      longitude: m.y ? parseFloat(m.y) : undefined,
    };
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Google Places API (New) — Nearby Search
// Types used: farmers_market, bakery, grocery_store, farm, florist, art_gallery
// Requires: GOOGLE_PLACES_API_KEY env var
// ---------------------------------------------------------------------------

const GOOGLE_PLACES_BASE = "https://places.googleapis.com/v1/places";
const GOOGLE_LOCAL_TYPES = [
  "farmers_market", "bakery", "grocery_store", "florist",
  "art_gallery", "jewelry_store", "home_goods_store",
];

const GOOGLE_CATEGORY_MAP: Record<string, string> = {
  farmers_market: "produce", bakery: "bakery", grocery_store: "produce",
  florist: "plants", art_gallery: "crafts", jewelry_store: "crafts",
  home_goods_store: "crafts",
};

async function geocodeZip(zip: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${zip}&key=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await res.json() as any;
    const loc = data?.results?.[0]?.geometry?.location;
    return loc ? { lat: loc.lat, lng: loc.lng } : null;
  } catch {
    return null;
  }
}

export async function searchGooglePlaces(
  query: { zipCode?: string; state?: string; search?: string }
): Promise<ExternalBusiness[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return [];

  // Need a lat/lng — geocode the zip or use a state center
  let center: { lat: number; lng: number } | null = null;

  if (query.zipCode) {
    center = await geocodeZip(query.zipCode);
  }

  if (!center && query.state) {
    const stateCenters: Record<string, { lat: number; lng: number }> = {
      UT: { lat: 39.321, lng: -111.093 }, CA: { lat: 36.778, lng: -119.417 },
      TX: { lat: 31.968, lng: -99.901 }, NY: { lat: 42.165, lng: -74.948 },
      CO: { lat: 39.113, lng: -105.358 }, WA: { lat: 47.240, lng: -121.217 },
      OR: { lat: 44.572, lng: -122.070 }, FL: { lat: 27.664, lng: -81.515 },
      AZ: { lat: 34.168, lng: -111.930 }, ID: { lat: 44.068, lng: -114.742 },
    };
    center = stateCenters[query.state?.toUpperCase() ?? ""] ?? null;
  }

  if (!center) return [];

  try {
    const body = {
      includedTypes: GOOGLE_LOCAL_TYPES,
      maxResultCount: 15,
      locationRestriction: {
        circle: {
          center: { latitude: center.lat, longitude: center.lng },
          radius: query.zipCode ? 25000 : 80000,
        },
      },
    };

    const res = await fetch(`${GOOGLE_PLACES_BASE}:searchNearby`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "places.id", "places.displayName", "places.shortFormattedAddress",
          "places.formattedAddress", "places.websiteUri", "places.nationalPhoneNumber",
          "places.rating", "places.userRatingCount", "places.types",
          "places.location", "places.photos", "places.regularOpeningHours",
          "places.primaryType", "places.editorialSummary",
        ].join(","),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];
    const data = await res.json() as any;
    const places = data?.places ?? [];

    return places.map((p: any): ExternalBusiness => {
      const primaryType = p.primaryType ?? p.types?.[0] ?? "other";
      const category = GOOGLE_CATEGORY_MAP[primaryType] ?? "other";
      const addr = p.formattedAddress ?? p.shortFormattedAddress ?? "";
      const addrParts = addr.split(",");
      const city = addrParts.length > 1 ? addrParts[addrParts.length - 3]?.trim() ?? "" : "";
      const stateZip = addrParts[addrParts.length - 2]?.trim() ?? "";
      const stateCode = stateZip.split(" ")[0] ?? "";
      const zipCode = stateZip.split(" ")[1] ?? "";

      // Get best photo if available
      const photoName = p.photos?.[0]?.name;
      const imageUrl = photoName && apiKey
        ? `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${apiKey}`
        : undefined;

      return {
        id: `google-${p.id}`,
        name: p.displayName?.text ?? "Unknown",
        description: p.editorialSummary?.text,
        category,
        address: addrParts[0]?.trim() ?? addr,
        city,
        state: stateCode,
        zipCode,
        phone: p.nationalPhoneNumber,
        website: p.websiteUri,
        imageUrl,
        rating: p.rating,
        reviewCount: p.userRatingCount,
        latitude: p.location?.latitude,
        longitude: p.location?.longitude,
        source: "google",
        externalUrl: `https://maps.google.com/?q=${encodeURIComponent(p.displayName?.text ?? "")}`,
        isOpen: p.regularOpeningHours?.openNow,
      };
    });
  } catch (e) {
    console.error("Google Places error:", e);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Yelp Fusion API — Business Search
// Requires: YELP_API_KEY env var
// ---------------------------------------------------------------------------

const YELP_BASE = "https://api.yelp.com/v3";
const YELP_CATEGORIES = "farmersmarket,farmandgarden,organic_stores,bakeries,pottery,artisan,handmade,flowers,honey";

const YELP_CATEGORY_MAP: Record<string, string> = {
  farmersmarket: "produce", farmandgarden: "produce", organic_stores: "produce",
  bakeries: "bakery", pottery: "crafts", artisan: "crafts", handmade: "crafts",
  flowers: "plants", honey: "other", soap: "other",
};

export async function searchYelp(
  query: { zipCode?: string; state?: string; search?: string; lat?: number; lng?: number }
): Promise<ExternalBusiness[]> {
  const apiKey = process.env.YELP_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    categories: YELP_CATEGORIES,
    limit: "15",
    sort_by: "rating",
  });

  if (query.zipCode) params.set("location", query.zipCode);
  else if (query.state) params.set("location", query.state);
  if (query.search) params.set("term", query.search);
  if (query.lat && query.lng) {
    params.set("latitude", String(query.lat));
    params.set("longitude", String(query.lng));
    params.delete("location");
  }

  try {
    const res = await fetch(`${YELP_BASE}/businesses/search?${params}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];
    const data = await res.json() as any;
    const businesses = data?.businesses ?? [];

    return businesses.map((b: any): ExternalBusiness => {
      const mainCategory = b.categories?.[0]?.alias ?? "other";
      const category = YELP_CATEGORY_MAP[mainCategory] ?? "crafts";
      const addr = b.location ?? {};

      return {
        id: `yelp-${b.id}`,
        name: b.name,
        description: b.categories?.map((c: any) => c.title).join(", "),
        category,
        address: addr.address1 ?? "",
        city: addr.city ?? "",
        state: addr.state ?? "",
        zipCode: addr.zip_code ?? "",
        phone: b.display_phone,
        website: b.url,
        imageUrl: b.image_url,
        rating: b.rating,
        reviewCount: b.review_count,
        latitude: b.coordinates?.latitude,
        longitude: b.coordinates?.longitude,
        source: "yelp",
        externalUrl: b.url,
        isOpen: !b.is_closed,
      };
    });
  } catch (e) {
    console.error("Yelp search error:", e);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Aggregated search — combines all sources
// ---------------------------------------------------------------------------

export async function aggregateSearch(query: {
  zipCode?: string;
  state?: string;
  search?: string;
  type?: "markets" | "businesses" | "all";
}): Promise<SearchResult> {
  const sources: string[] = [];
  const errors: string[] = [];
  const type = query.type ?? "all";

  const promises: Promise<void>[] = [];
  let markets: ExternalMarket[] = [];
  let businesses: ExternalBusiness[] = [];

  // USDA markets
  if (type === "all" || type === "markets") {
    promises.push(
      (async () => {
        try {
          let results: ExternalMarket[] = [];
          if (query.zipCode) {
            results = await searchUSDAMarketsByZip(query.zipCode);
          } else if (query.state) {
            results = await searchUSDAMarketsByState(query.state);
          }
          if (results.length > 0) {
            markets.push(...results);
            sources.push("USDA Farmers Market Directory");
          }
        } catch (e) {
          errors.push("USDA: service unavailable");
        }
      })()
    );
  }

  // Google Places
  if ((type === "all" || type === "businesses") && process.env.GOOGLE_PLACES_API_KEY) {
    promises.push(
      (async () => {
        try {
          const results = await searchGooglePlaces(query);
          if (results.length > 0) {
            businesses.push(...results);
            sources.push("Google Places");
          }
        } catch (e) {
          errors.push("Google Places: service unavailable");
        }
      })()
    );
  }

  // Yelp
  if ((type === "all" || type === "businesses") && process.env.YELP_API_KEY) {
    promises.push(
      (async () => {
        try {
          const results = await searchYelp(query);
          if (results.length > 0) {
            businesses.push(...results);
            sources.push("Yelp");
          }
        } catch (e) {
          errors.push("Yelp: service unavailable");
        }
      })()
    );
  }

  await Promise.allSettled(promises);

  // Deduplicate by name similarity
  const deduplicateByName = <T extends { name: string; id: string }>(arr: T[]): T[] => {
    const seen = new Map<string, boolean>();
    return arr.filter(item => {
      const key = item.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(key)) return false;
      seen.set(key, true);
      return true;
    });
  };

  return {
    markets: deduplicateByName(markets),
    businesses: deduplicateByName(businesses),
    sources,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Facebook Marketplace deep-link helper
// (No public read API — we provide direct search links to FB Marketplace)
// ---------------------------------------------------------------------------

export function getFacebookMarketplaceLinks(query: { zipCode?: string; city?: string; state?: string }) {
  const location = query.city ?? query.zipCode ?? query.state ?? "nearby";
  const categories = [
    { label: "Fresh Produce", url: `https://www.facebook.com/marketplace/category/garden-and-outdoor?location=${encodeURIComponent(location)}`, emoji: "🥦" },
    { label: "Handmade Crafts", url: `https://www.facebook.com/marketplace/search?query=handmade+crafts&location=${encodeURIComponent(location)}`, emoji: "🏺" },
    { label: "Local Honey", url: `https://www.facebook.com/marketplace/search?query=local+honey&location=${encodeURIComponent(location)}`, emoji: "🍯" },
    { label: "Farm Fresh Eggs", url: `https://www.facebook.com/marketplace/search?query=farm+fresh+eggs&location=${encodeURIComponent(location)}`, emoji: "🥚" },
    { label: "Homemade Baked Goods", url: `https://www.facebook.com/marketplace/search?query=homemade+baked+goods&location=${encodeURIComponent(location)}`, emoji: "🍞" },
    { label: "Flowers & Plants", url: `https://www.facebook.com/marketplace/search?query=local+plants+flowers&location=${encodeURIComponent(location)}`, emoji: "🌸" },
    { label: "Farm Animals & Feed", url: `https://www.facebook.com/marketplace/search?query=farm&location=${encodeURIComponent(location)}`, emoji: "🐄" },
  ];
  return categories;
}

export function getCraigslistLinks(query: { zipCode?: string; city?: string; state?: string }) {
  // Map state to Craigslist subdomain
  const stateSubdomains: Record<string, string> = {
    UT: "saltlakecity", CA: "sfbay", TX: "austin", NY: "newyork",
    CO: "denver", WA: "seattle", OR: "portland", FL: "miami", AZ: "phoenix",
    ID: "boise", MT: "montana", WY: "wyoming",
  };
  const subdomain = stateSubdomains[query.state?.toUpperCase() ?? ""] ?? "craigslist";
  const base = `https://${subdomain}.craigslist.org`;
  return [
    { label: "Farm & Garden", url: `${base}/search/grd`, emoji: "🌱" },
    { label: "Arts & Crafts", url: `${base}/search/art`, emoji: "🎨" },
    { label: "Free Stuff", url: `${base}/search/zip?query=farm+garden`, emoji: "🆓" },
  ];
}
