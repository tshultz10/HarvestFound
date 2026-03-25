import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Search, MapPin, SlidersHorizontal, X, ExternalLink, ShoppingBasket, Store, Star, Phone, Globe, Loader2, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CATEGORIES = [
  { key: "", label: "All" },
  { key: "produce", label: "🥦 Produce" },
  { key: "bakery", label: "🍞 Bakery" },
  { key: "dairy", label: "🧀 Dairy" },
  { key: "crafts", label: "🏺 Crafts" },
  { key: "meat", label: "🥩 Meat" },
  { key: "plants", label: "🌸 Plants" },
  { key: "other", label: "🍯 Honey & More" },
];

// Source badge
const SOURCE_CONFIG = {
  usda: { label: "📡 USDA", className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200" },
  google: { label: "📍 Google", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200" },
  yelp: { label: "⭐ Yelp", className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200" },
  community: { label: "🌿 Community", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200" },
  registered: { label: "🌿 Community", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200" },
  web: { label: "🌐 Web", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200" },
};

function SourceBadge({ source }: { source: string }) {
  const cfg = SOURCE_CONFIG[source as keyof typeof SOURCE_CONFIG] ?? SOURCE_CONFIG.community;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

interface ExternalBusiness {
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
  source: string;
  externalUrl?: string;
  isOpen?: boolean;
}

interface MarketplaceLinks {
  facebook: { label: string; url: string; emoji: string }[];
  craigslist: { label: string; url: string; emoji: string }[];
}

export default function ExplorePage() {
  const windowSearch = typeof window !== "undefined" ? window.location.hash.split("?")[1] ?? "" : "";
  const params = new URLSearchParams(windowSearch);
  const initial = {
    zipCode: params.get("zipCode") ?? "",
    state: params.get("state") ?? "",
    category: params.get("category") ?? "",
    search: params.get("q") ?? "",
  };

  const [zipCode, setZipCode] = useState(initial.zipCode);
  const [state, setState] = useState(initial.state);
  const [category, setCategory] = useState(initial.category);
  const [search, setSearch] = useState(initial.search);
  const [activeFilters, setActiveFilters] = useState(initial);
  const [tab, setTab] = useState("listings");

  const applyFilters = () => {
    setActiveFilters({ zipCode, state, category, search });
  };

  const clearFilters = () => {
    setZipCode(""); setState(""); setCategory(""); setSearch("");
    setActiveFilters({ zipCode: "", state: "", category: "", search: "" });
  };

  const queryParams = new URLSearchParams();
  if (activeFilters.zipCode) queryParams.set("zipCode", activeFilters.zipCode);
  if (activeFilters.state) queryParams.set("state", activeFilters.state);
  if (activeFilters.category) queryParams.set("category", activeFilters.category);
  if (activeFilters.search) queryParams.set("search", activeFilters.search);

  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ["/api/listings", activeFilters],
    queryFn: () => apiRequest("GET", `/api/listings?${queryParams}`).then(r => r.json()),
  });

  const { data: vendors, isLoading: vendorsLoading } = useQuery({
    queryKey: ["/api/vendors", activeFilters],
    queryFn: () => apiRequest("GET", `/api/vendors?${queryParams}`).then(r => r.json()),
  });

  // External businesses (Google + Yelp) — fires when zip or state is provided
  const hasLocationFilter = activeFilters.zipCode || activeFilters.state;
  const { data: extData, isLoading: extLoading } = useQuery<{ businesses: ExternalBusiness[]; sources: string[] }>({
    queryKey: ["/api/external/businesses", activeFilters],
    queryFn: () => apiRequest("GET", `/api/external/businesses?${queryParams}`).then(r => r.json()),
    enabled: !!hasLocationFilter,
    staleTime: 5 * 60 * 1000,
  });

  // Facebook + Craigslist marketplace links
  const { data: marketplaceLinks } = useQuery<MarketplaceLinks>({
    queryKey: ["/api/external/marketplace-links", activeFilters],
    queryFn: () => apiRequest("GET", `/api/external/marketplace-links?${queryParams}`).then(r => r.json()),
    staleTime: 10 * 60 * 1000,
  });

  const externalBusinesses: ExternalBusiness[] = extData?.businesses ?? [];
  const hasActiveFilter = activeFilters.zipCode || activeFilters.state || activeFilters.category || activeFilters.search;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1" style={{fontFamily:"'Chillax',sans-serif"}}>Shop Local</h1>
        <p className="text-muted-foreground">Fresh produce, handcrafts, and local goods — all near you</p>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-6 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Zip code (e.g. 84401)"
              value={zipCode}
              onChange={e => setZipCode(e.target.value)}
              className="pl-9"
              data-testid="input-filter-zip"
            />
          </div>
          <div>
            <select
              value={state}
              onChange={e => setState(e.target.value)}
              className="w-full h-10 bg-background border border-input rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="select-filter-state"
            >
              <option value="">All states</option>
              {["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search listings..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && applyFilters()}
              className="pl-9"
              data-testid="input-filter-search"
            />
          </div>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${category === c.key ? "bg-primary text-white border-primary" : "border-border hover:border-primary hover:text-primary"}`}
              data-testid={`button-filter-cat-${c.key || "all"}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={applyFilters} className="flex-1 sm:flex-none" data-testid="button-apply-filters">
            <SlidersHorizontal size={14} className="mr-2" /> Apply Filters
          </Button>
          {hasActiveFilter && (
            <Button variant="ghost" onClick={clearFilters} data-testid="button-clear-filters">
              <X size={14} className="mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      {hasActiveFilter && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeFilters.zipCode && <Badge variant="secondary">📍 {activeFilters.zipCode}</Badge>}
          {activeFilters.state && <Badge variant="secondary">🗺️ {activeFilters.state}</Badge>}
          {activeFilters.category && <Badge variant="secondary">🏷️ {activeFilters.category}</Badge>}
          {activeFilters.search && <Badge variant="secondary">🔍 "{activeFilters.search}"</Badge>}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="listings" data-testid="tab-listings">
            <ShoppingBasket size={14} className="mr-2" /> Listings ({(listings ?? []).length})
          </TabsTrigger>
          <TabsTrigger value="vendors" data-testid="tab-vendors">
            <Store size={14} className="mr-2" /> Vendors ({(vendors ?? []).length})
          </TabsTrigger>
          {hasLocationFilter && (
            <TabsTrigger value="nearby" data-testid="tab-nearby">
              <MapPin size={14} className="mr-2" /> Nearby
              {extLoading && <Loader2 size={12} className="ml-1 animate-spin" />}
              {!extLoading && externalBusinesses.length > 0 && <span className="ml-1">({externalBusinesses.length})</span>}
            </TabsTrigger>
          )}
          <TabsTrigger value="marketplace" data-testid="tab-marketplace">
            <Facebook size={14} className="mr-2" /> Marketplace
          </TabsTrigger>
        </TabsList>

        {/* Listings tab */}
        <TabsContent value="listings">
          {listingsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
            </div>
          ) : (listings ?? []).length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShoppingBasket size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No listings found</p>
              <p className="text-sm">Try adjusting your filters or searching a different area</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(listings ?? []).map((listing: any) => (
                <Card key={listing.id} className="card-hover overflow-hidden border border-border" data-testid={`card-listing-${listing.id}`}>
                  {listing.imageUrl && (
                    <div className="h-40 overflow-hidden">
                      <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium cat-${listing.category} border`}>
                        {listing.category}
                      </span>
                      <SourceBadge source={listing.externalSource ?? "community"} />
                    </div>
                    <h3 className="font-semibold text-sm mt-2 mb-1 leading-tight">{listing.title}</h3>
                    {listing.price && (
                      <p className="text-primary font-bold text-base">
                        ${listing.price.toFixed(2)}
                        {listing.priceUnit && <span className="text-muted-foreground text-xs font-normal"> / {listing.priceUnit}</span>}
                      </p>
                    )}
                    {listing.vendorName && (
                      <Link href={`/vendor/${listing.vendorId}`}>
                        <a className="text-xs text-muted-foreground hover:text-primary mt-1 flex items-center gap-1">
                          <Store size={10} /> {listing.vendorName}
                          {listing.vendorCity && ` · ${listing.vendorCity}`}
                        </a>
                      </Link>
                    )}
                    {listing.externalUrl && (
                      <a
                        href={listing.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        <ExternalLink size={10} /> View on {listing.externalSource ?? "website"}
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Vendors tab */}
        <TabsContent value="vendors">
          {vendorsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
            </div>
          ) : (vendors ?? []).length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Store size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No vendors found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(vendors ?? []).map((vendor: any) => (
                <Link key={vendor.id} href={`/vendor/${vendor.id}`}>
                  <a data-testid={`card-vendor-${vendor.id}`}>
                    <Card className="card-hover overflow-hidden border border-border h-full">
                      {vendor.imageUrl && (
                        <div className="h-36 overflow-hidden">
                          <img src={vendor.imageUrl} alt={vendor.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-bold text-sm leading-tight">{vendor.name}</h3>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium cat-${vendor.category} border flex-shrink-0`}>
                              {vendor.category}
                            </span>
                            <SourceBadge source={vendor.source ?? "community"} />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{vendor.description}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin size={10} /> {vendor.city}, {vendor.state} {vendor.zipCode}
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Nearby tab (Google + Yelp) */}
        {hasLocationFilter && (
          <TabsContent value="nearby">
            {extLoading ? (
              <div>
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-4">
                  <Loader2 size={14} className="animate-spin" />
                  Searching Google Places and Yelp for local businesses near you...
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
                </div>
              </div>
            ) : externalBusinesses.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <MapPin size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">No nearby results</p>
                <p className="text-sm max-w-xs mx-auto">
                  Google Places and Yelp results require API keys. Add <code className="text-xs bg-muted px-1 rounded">GOOGLE_PLACES_API_KEY</code> and <code className="text-xs bg-muted px-1 rounded">YELP_API_KEY</code> to your environment to see live results.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="text-sm text-muted-foreground">{externalBusinesses.length} results from:</span>
                  {(extData?.sources ?? []).map(s => <SourceBadge key={s} source={s} />)}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {externalBusinesses.map(biz => (
                    <ExternalBizCard key={biz.id} biz={biz} />
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        )}

        {/* Facebook Marketplace tab */}
        <TabsContent value="marketplace">
          <div className="max-w-3xl">
            <div className="mb-6 p-5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl">
              <div className="flex items-start gap-3">
                <Facebook size={24} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-base mb-1">Facebook Marketplace &amp; Craigslist</h3>
                  <p className="text-sm text-muted-foreground">
                    Facebook and Craigslist don't offer public read APIs — these links take you directly to pre-filtered searches for local farm &amp; craft items in your area.
                    {activeFilters.zipCode && <span className="font-medium text-foreground"> Searching near: {activeFilters.zipCode}.</span>}
                    {activeFilters.state && !activeFilters.zipCode && <span className="font-medium text-foreground"> Searching in: {activeFilters.state}.</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Facebook links */}
            <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">Facebook Marketplace</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {(marketplaceLinks?.facebook ?? getFallbackFbLinks()).map(link => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-blue-400 hover:shadow-sm transition-all group"
                  data-testid={`link-fb-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <span className="text-2xl">{link.emoji}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm group-hover:text-blue-600 transition-colors">{link.label}</p>
                    <p className="text-xs text-muted-foreground">Search Facebook Marketplace</p>
                  </div>
                  <ExternalLink size={14} className="text-muted-foreground group-hover:text-blue-600 transition-colors" />
                </a>
              ))}
            </div>

            {/* Craigslist links */}
            <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">Craigslist</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(marketplaceLinks?.craigslist ?? getFallbackClLinks()).map(link => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary hover:shadow-sm transition-all group"
                  data-testid={`link-cl-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <span className="text-xl">{link.emoji}</span>
                  <div>
                    <p className="font-semibold text-sm group-hover:text-primary transition-colors">{link.label}</p>
                    <p className="text-xs text-muted-foreground">Craigslist</p>
                  </div>
                </a>
              ))}
            </div>

            <p className="text-xs text-muted-foreground mt-6">
              These links open external websites. LocalOG is not affiliated with Facebook or Craigslist.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExternalBizCard({ biz }: { biz: ExternalBusiness }) {
  return (
    <Card className="card-hover overflow-hidden border border-border" data-testid={`card-external-${biz.id}`}>
      {biz.imageUrl && (
        <div className="h-36 overflow-hidden">
          <img
            src={biz.imageUrl}
            alt={biz.name}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-sm leading-tight">{biz.name}</h3>
          <SourceBadge source={biz.source} />
        </div>
        {biz.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{biz.description}</p>}
        <div className="space-y-1">
          {(biz.rating != null) && (
            <div className="flex items-center gap-1">
              <Star size={11} className="text-amber-500 fill-amber-500" />
              <span className="text-xs font-semibold">{biz.rating.toFixed(1)}</span>
              {biz.reviewCount && <span className="text-xs text-muted-foreground">({biz.reviewCount} reviews)</span>}
              {biz.isOpen != null && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ml-1 ${biz.isOpen ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"}`}>
                  {biz.isOpen ? "Open" : "Closed"}
                </span>
              )}
            </div>
          )}
          <div className="flex items-start gap-1.5 text-muted-foreground">
            <MapPin size={11} className="mt-0.5 flex-shrink-0 text-primary" />
            <span className="text-xs">{biz.address ? `${biz.address}, ` : ""}{biz.city}, {biz.state}</span>
          </div>
          {biz.phone && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Phone size={11} />
              <span className="text-xs">{biz.phone}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-3">
          {biz.externalUrl && (
            <a
              href={biz.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <ExternalLink size={10} /> {biz.source === "yelp" ? "View on Yelp" : biz.source === "google" ? "View on Maps" : "View"}
            </a>
          )}
          {biz.website && (
            <a
              href={biz.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <Globe size={10} /> Website
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getFallbackFbLinks() {
  return [
    { label: "Fresh Produce", url: "https://www.facebook.com/marketplace/category/garden-and-outdoor", emoji: "🥦" },
    { label: "Handmade Crafts", url: "https://www.facebook.com/marketplace/search?query=handmade+crafts", emoji: "🏺" },
    { label: "Local Honey", url: "https://www.facebook.com/marketplace/search?query=local+honey", emoji: "🍯" },
    { label: "Farm Fresh Eggs", url: "https://www.facebook.com/marketplace/search?query=farm+fresh+eggs", emoji: "🥚" },
    { label: "Baked Goods", url: "https://www.facebook.com/marketplace/search?query=homemade+baked+goods", emoji: "🍞" },
    { label: "Flowers & Plants", url: "https://www.facebook.com/marketplace/search?query=local+plants+flowers", emoji: "🌸" },
    { label: "Farm Animals & Feed", url: "https://www.facebook.com/marketplace/search?query=farm", emoji: "🐄" },
  ];
}

function getFallbackClLinks() {
  return [
    { label: "Farm & Garden", url: "https://craigslist.org/search/grd", emoji: "🌱" },
    { label: "Arts & Crafts", url: "https://craigslist.org/search/art", emoji: "🎨" },
    { label: "Free Stuff", url: "https://craigslist.org/search/zip?query=farm+garden", emoji: "🆓" },
  ];
}
