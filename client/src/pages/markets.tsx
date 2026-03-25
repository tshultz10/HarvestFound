import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MapPin, Calendar, Clock, Globe, Search, X, Phone, ExternalLink, Loader2, Radio } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Market } from "@shared/schema";

// Source badge config
const SOURCE_CONFIG = {
  usda: { label: "📡 USDA", className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800" },
  google: { label: "📍 Google", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  yelp: { label: "⭐ Yelp", className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800" },
  community: { label: "🌿 Community", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  registered: { label: "🌿 Community", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  web: { label: "🌐 Web", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800" },
};

function SourceBadge({ source }: { source: string }) {
  const cfg = SOURCE_CONFIG[source as keyof typeof SOURCE_CONFIG] ?? SOURCE_CONFIG.community;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

interface ExternalMarket {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  schedule?: string;
  website?: string;
  phone?: string;
  source: string;
  externalUrl?: string;
  products?: string[];
  season?: string;
  latitude?: number;
  longitude?: number;
}

export default function MarketsPage() {
  const [zipCode, setZipCode] = useState("");
  const [state, setState] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState({ zipCode: "", state: "", search: "" });
  const [showLive, setShowLive] = useState(false);

  const qp = new URLSearchParams();
  if (activeFilters.zipCode) qp.set("zipCode", activeFilters.zipCode);
  if (activeFilters.state) qp.set("state", activeFilters.state);
  if (activeFilters.search) qp.set("search", activeFilters.search);

  const { data: markets, isLoading: localLoading } = useQuery<Market[]>({
    queryKey: ["/api/markets", activeFilters],
    queryFn: () => apiRequest("GET", `/api/markets?${qp}`).then(r => r.json()),
  });

  // Live USDA data — only fires when zip or state is set and showLive is on
  const canFetchLive = showLive && (activeFilters.zipCode || activeFilters.state);
  const { data: liveData, isLoading: liveLoading } = useQuery<{ markets: ExternalMarket[]; source: string }>({
    queryKey: ["/api/external/markets", activeFilters],
    queryFn: () => apiRequest("GET", `/api/external/markets?${qp}`).then(r => r.json()),
    enabled: !!canFetchLive,
    staleTime: 5 * 60 * 1000, // cache 5 min
  });

  const apply = () => {
    setActiveFilters({ zipCode, state, search });
    if (zipCode || state) setShowLive(true);
  };
  const clear = () => {
    setZipCode(""); setState(""); setSearch("");
    setActiveFilters({ zipCode: "", state: "", search: "" });
    setShowLive(false);
  };

  const liveMarkets: ExternalMarket[] = liveData?.markets ?? [];
  const hasFilters = activeFilters.zipCode || activeFilters.state || activeFilters.search;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1" style={{fontFamily:"'Chillax',sans-serif"}}>Farmers Markets</h1>
        <p className="text-muted-foreground">Find markets in your area — schedules, locations, and seasonal info</p>
      </div>

      {/* Filter bar */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div className="relative">
            <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Zip code"
              value={zipCode}
              onChange={e => setZipCode(e.target.value)}
              className="pl-9"
              data-testid="input-markets-zip"
            />
          </div>
          <select
            value={state}
            onChange={e => setState(e.target.value)}
            className="w-full h-10 bg-background border border-input rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            data-testid="select-markets-state"
          >
            <option value="">All states</option>
            {["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by city or name"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && apply()}
              className="pl-9"
              data-testid="input-markets-search"
            />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={apply} data-testid="button-markets-apply">
            <Search size={14} className="mr-2" /> Find Markets
          </Button>
          {hasFilters && (
            <Button variant="ghost" onClick={clear} data-testid="button-markets-clear">
              <X size={14} className="mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* USDA Live data banner */}
      {canFetchLive && (
        <div className="mb-5 flex items-center gap-2 text-sm">
          {liveLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              <span>Checking USDA Farmers Market Directory...</span>
            </div>
          ) : liveMarkets.length > 0 ? (
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-1.5">
              <Radio size={13} className="animate-pulse" />
              <span className="font-medium">Found {liveMarkets.length} live market{liveMarkets.length !== 1 ? "s" : ""} from USDA directory</span>
            </div>
          ) : (
            <div className="text-muted-foreground text-xs">No USDA markets found for this location — showing community listings</div>
          )}
        </div>
      )}

      {/* Combined market grid */}
      {localLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* Local / community markets */}
          {(markets ?? []).length > 0 && (
            <section className="mb-8">
              {canFetchLive && liveMarkets.length > 0 && (
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Community & Registered Markets
                </h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {(markets ?? []).map(market => (
                  <MarketCard key={market.id} market={{
                    id: String(market.id),
                    name: market.name,
                    address: market.address,
                    city: market.city,
                    state: market.state,
                    zipCode: market.zipCode,
                    schedule: market.schedule,
                    website: market.website ?? undefined,
                    source: market.source ?? "community",
                    season: market.seasonStart ? `${market.seasonStart}${market.seasonEnd ? `–${market.seasonEnd}` : ""}` : undefined,
                    imageUrl: market.imageUrl ?? undefined,
                  }} />
                ))}
              </div>
            </section>
          )}

          {/* Live USDA markets */}
          {liveMarkets.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Radio size={13} className="text-green-600" /> Live from USDA Directory
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {liveMarkets.map(market => (
                  <MarketCard key={market.id} market={market} />
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {(markets ?? []).length === 0 && liveMarkets.length === 0 && !liveLoading && (
            <div className="text-center py-16 text-muted-foreground">
              <Calendar size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No markets found</p>
              <p className="text-sm">Try a different zip code or state</p>
            </div>
          )}
        </>
      )}

      {/* Data sources callout */}
      <div className="mt-10 bg-muted/40 border border-border rounded-2xl p-6">
        <h3 className="font-bold text-base mb-3">Data sources</h3>
        <div className="flex flex-wrap gap-2">
          <SourceBadge source="usda" />
          <SourceBadge source="community" />
          <SourceBadge source="web" />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Market data is pulled live from the USDA National Farmers Market Directory and community submissions. Enter a zip code or state to fetch real-time results.
        </p>
        <div className="mt-3">
          <Badge className="badge-season px-4 py-1.5 text-sm cursor-default">
            Know a market not listed? List it in the Vendor Portal →
          </Badge>
        </div>
      </div>
    </div>
  );
}

function MarketCard({ market }: {
  market: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    schedule?: string;
    website?: string;
    phone?: string;
    source: string;
    externalUrl?: string;
    products?: string[];
    season?: string;
    imageUrl?: string;
  }
}) {
  return (
    <Card className="card-hover overflow-hidden border border-border" data-testid={`card-market-${market.id}`}>
      {market.imageUrl && (
        <div className="h-40 overflow-hidden relative">
          <img src={market.imageUrl} alt={market.name} className="w-full h-full object-cover" />
          {market.season && (
            <div className="absolute top-3 right-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shadow ${market.season.toLowerCase().includes("year") ? "badge-season" : "bg-white/90 text-foreground"}`}>
                {market.season.toLowerCase().includes("year") ? "🌿 Year-round" : `📅 ${market.season}`}
              </span>
            </div>
          )}
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-sm leading-tight">{market.name}</h3>
          <SourceBadge source={market.source} />
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex items-start gap-2 text-muted-foreground">
            <MapPin size={12} className="mt-0.5 flex-shrink-0 text-primary" />
            <span className="text-xs">{market.address ? `${market.address}, ` : ""}{market.city}, {market.state} {market.zipCode}</span>
          </div>
          {market.schedule && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock size={12} className="flex-shrink-0 text-secondary" />
              <span className="text-xs font-medium">{market.schedule}</span>
            </div>
          )}
          {market.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone size={12} className="flex-shrink-0" />
              <span className="text-xs">{market.phone}</span>
            </div>
          )}
          {market.website && (
            <div className="flex items-center gap-2">
              <Globe size={12} className="flex-shrink-0 text-blue-500" />
              <a href={market.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate max-w-[200px]">
                Visit website
              </a>
            </div>
          )}
          {market.externalUrl && !market.website && (
            <div className="flex items-center gap-2">
              <ExternalLink size={12} className="flex-shrink-0 text-blue-500" />
              <a href={market.externalUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                View on USDA directory
              </a>
            </div>
          )}
        </div>
        {/* Product tags */}
        {market.products && market.products.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {market.products.slice(0, 5).map(p => (
              <span key={p} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{p}</span>
            ))}
            {market.products.length > 5 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">+{market.products.length - 5} more</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
