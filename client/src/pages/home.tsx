import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Search, MapPin, ShoppingBasket, Store, Calendar, ArrowRight, Leaf, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Vendor, Market } from "@shared/schema";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

const CATEGORIES = [
  { key: "produce", label: "Fresh Produce", emoji: "🥦", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  { key: "bakery", label: "Bakery", emoji: "🍞", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  { key: "dairy", label: "Dairy", emoji: "🧀", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  { key: "crafts", label: "Handcrafts", emoji: "🏺", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  { key: "meat", label: "Meat & Poultry", emoji: "🥩", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  { key: "plants", label: "Plants & Flowers", emoji: "🌸", color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200" },
  { key: "other", label: "Honey & More", emoji: "🍯", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
];

export default function HomePage() {
  const [, navigate] = useLocation();
  const [searchInput, setSearchInput] = useState("");
  const [searchType, setSearchType] = useState<"zip" | "state">("zip");

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: () => apiRequest("GET", "/api/stats").then(r => r.json()),
  });

  const { data: featuredVendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
    queryFn: () => apiRequest("GET", "/api/vendors?state=UT").then(r => r.json()),
  });

  const { data: featuredMarkets } = useQuery<Market[]>({
    queryKey: ["/api/markets"],
    queryFn: () => apiRequest("GET", "/api/markets?state=UT").then(r => r.json()),
  });

  const handleSearch = () => {
    if (!searchInput.trim()) return;
    const param = searchType === "zip" ? `zipCode=${searchInput}` : `state=${searchInput}`;
    navigate(`/explore?${param}`);
  };

  return (
    <div>
      {/* Hero */}
      <section className="hero-gradient text-white py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Leaf size={14} />
            <span>Farm Fresh · Locally Made · Community Grown</span>
          </div>
          <h1
            className="text-4xl md:text-6xl font-bold mb-4 text-white drop-shadow-lg"
            style={{fontFamily:"'Chillax',sans-serif"}}
          >
            Your Local Market,<br />Always Open
          </h1>
          <p className="text-white/90 text-lg md:text-xl mb-10 max-w-xl mx-auto">
            Discover farmers markets, fresh produce, and handcrafted goods near you — all in one place.
          </p>

          {/* Search bar */}
          <div className="bg-white dark:bg-card rounded-2xl shadow-2xl p-3 max-w-2xl mx-auto search-glow">
            <div className="flex gap-2 mb-3">
              <button
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${searchType === "zip" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}
                onClick={() => setSearchType("zip")}
                data-testid="button-search-zip"
              >
                📍 By Zip Code
              </button>
              <button
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${searchType === "state" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}
                onClick={() => setSearchType("state")}
                data-testid="button-search-state"
              >
                🗺️ By State
              </button>
            </div>

            {searchType === "zip" ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter zip code (e.g. 84401)"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  className="flex-1 border-0 bg-muted/50 text-lg font-medium"
                  data-testid="input-zip-search"
                />
                <Button onClick={handleSearch} size="lg" className="px-6" data-testid="button-search-submit">
                  <Search size={18} className="mr-2" /> Search
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="flex-1 bg-muted/50 border border-border rounded-lg px-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="select-state-search"
                >
                  <option value="">Select a state</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <Button onClick={handleSearch} size="lg" className="px-6" data-testid="button-state-search-submit">
                  <Search size={18} className="mr-2" /> Search
                </Button>
              </div>
            )}
          </div>

          {/* Quick stats */}
          {stats && (
            <div className="flex flex-wrap justify-center gap-6 mt-8 text-white/90 text-sm">
              <span className="flex items-center gap-1"><Store size={14}/> {stats.vendorCount}+ local vendors</span>
              <span className="flex items-center gap-1"><ShoppingBasket size={14}/> {stats.listingCount}+ listings</span>
              <span className="flex items-center gap-1"><Calendar size={14}/> {stats.marketCount} markets</span>
              <span className="flex items-center gap-1"><MapPin size={14}/> {stats.stateCount} {stats.stateCount === 1 ? 'state' : 'states'}</span>
            </div>
          )}
        </div>
      </section>

      {/* Browse by Category */}
      <section className="py-12 bg-background">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-2" style={{fontFamily:"'Chillax',sans-serif"}}>Browse by Category</h2>
          <p className="text-muted-foreground mb-6">Find exactly what you're looking for</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => navigate(`/explore?category=${cat.key}`)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-transparent hover:border-primary transition-all card-hover cursor-pointer ${cat.color}`}
                data-testid={`button-category-${cat.key}`}
              >
                <span className="text-3xl">{cat.emoji}</span>
                <span className="text-xs font-semibold text-center leading-tight">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Vendors */}
      <section className="py-12 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold" style={{fontFamily:"'Chillax',sans-serif"}}>Featured Vendors</h2>
              <p className="text-muted-foreground">Local makers and growers near you</p>
            </div>
            <Button variant="outline" onClick={() => navigate("/explore")} data-testid="button-view-all-vendors">
              View All <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(featuredVendors ?? []).slice(0, 4).map(vendor => (
              <Card key={vendor.id} className="card-hover cursor-pointer overflow-hidden border border-border" onClick={() => navigate(`/vendor/${vendor.id}`)} data-testid={`card-vendor-${vendor.id}`}>
                {vendor.imageUrl && (
                  <div className="h-36 overflow-hidden">
                    <img src={vendor.imageUrl} alt={vendor.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-sm leading-tight">{vendor.name}</h3>
                    {vendor.isVerified && <Star size={13} className="text-secondary flex-shrink-0 mt-0.5" fill="currentColor" />}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium cat-${vendor.category}`}>
                    {vendor.category}
                  </span>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{vendor.description}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <MapPin size={11} /> {vendor.city}, {vendor.state}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Markets */}
      <section className="py-12 bg-background">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold" style={{fontFamily:"'Chillax',sans-serif"}}>Nearby Markets</h2>
              <p className="text-muted-foreground">Upcoming farmers markets &amp; events</p>
            </div>
            <Button variant="outline" onClick={() => navigate("/markets")} data-testid="button-view-all-markets">
              View All <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(featuredMarkets ?? []).slice(0, 3).map(market => (
              <Card key={market.id} className="card-hover overflow-hidden border border-border" data-testid={`card-market-${market.id}`}>
                {market.imageUrl && (
                  <div className="h-44 overflow-hidden">
                    <img src={market.imageUrl} alt={market.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="p-4">
                  <h3 className="font-bold mb-1">{market.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <MapPin size={11} /> {market.city}, {market.state}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <Calendar size={10} className="mr-1" /> {market.schedule}
                    </Badge>
                  </div>
                  {market.seasonStart && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Season: {market.seasonStart}{market.seasonEnd && market.seasonEnd !== market.seasonStart ? ` – ${market.seasonEnd}` : ""}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — List your business */}
      <section className="py-16 bg-primary text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-3" style={{fontFamily:"'Chillax',sans-serif"}}>Are you a local vendor?</h2>
          <p className="text-white/80 text-lg mb-8">List your farm, cottage bakery, or handcraft business for free. Reach shoppers in your community who want to buy local.</p>
          <Button
            onClick={() => navigate("/vendor-portal")}
            className="bg-white text-primary hover:bg-white/90 font-bold px-8 py-3 text-base"
            data-testid="button-cta-list-business"
          >
            List Your Business — It's Free
          </Button>
        </div>
      </section>
    </div>
  );
}
