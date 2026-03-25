import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MapPin, Phone, Globe, Instagram, ArrowLeft, Star, ShoppingBasket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Vendor, Listing } from "@shared/schema";

export default function VendorPage() {
  const { id } = useParams<{ id: string }>();

  const { data: vendor, isLoading: vLoading } = useQuery<Vendor>({
    queryKey: ["/api/vendors", id],
    queryFn: () => apiRequest("GET", `/api/vendors/${id}`).then(r => r.json()),
  });

  const { data: listings, isLoading: lLoading } = useQuery<Listing[]>({
    queryKey: ["/api/listings", { vendorId: id }],
    queryFn: () => apiRequest("GET", `/api/listings?vendorId=${id}`).then(r => r.json()),
  });

  if (vLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-64 w-full rounded-2xl mb-6" />
        <Skeleton className="h-6 w-48 mb-3" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-muted-foreground">
        <p className="text-xl font-semibold">Vendor not found</p>
        <Link href="/explore"><a className="text-primary mt-4 inline-block">← Back to explore</a></Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/explore">
        <a className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" data-testid="link-back-explore">
          <ArrowLeft size={14} /> Back to explore
        </a>
      </Link>

      {/* Vendor header */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
        {vendor.imageUrl && (
          <div className="h-56 overflow-hidden">
            <img src={vendor.imageUrl} alt={vendor.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold" style={{fontFamily:"'Chillax',sans-serif"}}>{vendor.name}</h1>
                {vendor.isVerified && (
                  <Star size={16} className="text-secondary" fill="currentColor" aria-label="Verified vendor" />
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium cat-${vendor.category} border`}>
                  {vendor.category}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin size={11} /> {vendor.city}, {vendor.state} {vendor.zipCode}
                </span>
              </div>
            </div>
            {(vendor.source === "web" || vendor.source === "facebook") && (
              <Badge variant="outline" className="text-xs">
                📡 Listed from {vendor.source}
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-4">{vendor.description}</p>

          {/* Contact info */}
          <div className="flex flex-wrap gap-4 text-sm">
            {vendor.phone && (
              <a href={`tel:${vendor.phone}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors" data-testid="link-vendor-phone">
                <Phone size={13} /> {vendor.phone}
              </a>
            )}
            {vendor.website && (
              <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors" data-testid="link-vendor-website">
                <Globe size={13} /> Website
              </a>
            )}
            {vendor.instagramHandle && (
              <a
                href={`https://instagram.com/${vendor.instagramHandle.replace("@","")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-muted-foreground hover:text-pink-600 transition-colors"
                data-testid="link-vendor-instagram"
              >
                <Instagram size={13} /> {vendor.instagramHandle}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Listings */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{fontFamily:"'Chillax',sans-serif"}}>
          <ShoppingBasket size={18} className="text-primary" />
          Current Listings
          <span className="text-sm font-normal text-muted-foreground">({(listings ?? []).length})</span>
        </h2>

        {lLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
          </div>
        ) : !listings || listings.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground bg-muted/30 rounded-2xl">
            <ShoppingBasket size={32} className="mx-auto mb-2 opacity-30" />
            <p>No listings yet from this vendor</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {listings.map(listing => (
              <Card key={listing.id} className="overflow-hidden border border-border" data-testid={`card-listing-${listing.id}`}>
                {listing.imageUrl && (
                  <div className="h-40 overflow-hidden">
                    <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium cat-${listing.category} border`}>
                    {listing.category}
                  </span>
                  <h3 className="font-semibold text-sm mt-2 leading-tight">{listing.title}</h3>
                  {listing.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{listing.description}</p>
                  )}
                  {listing.price && (
                    <p className="text-primary font-bold text-base mt-2">
                      ${listing.price.toFixed(2)}
                      {listing.priceUnit && <span className="text-muted-foreground text-xs font-normal"> / {listing.priceUnit}</span>}
                    </p>
                  )}
                  {listing.inSeason && (
                    <span className="badge-season text-xs px-2 py-0.5 rounded-full font-medium mt-2 inline-block">
                      ✓ In Season
                    </span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
