import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVendorSchema } from "@shared/schema";
import { z } from "zod";
import { CheckCircle, Store, Leaf, ShieldCheck, Globe, Megaphone, Star, Zap, Crown, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { InsertVendor } from "@shared/schema";

const formSchema = insertVendorSchema.extend({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  description: z.string().min(20, "Please write at least 20 characters about your business"),
  email: z.string().email("Please enter a valid email"),
  zipCode: z.string().min(5, "Please enter a valid zip code").max(10),
});

const BENEFITS = [
  { icon: Globe, title: "Free visibility", desc: "Your listing appears in search results for your zip code and state" },
  { icon: ShieldCheck, title: "Verified badge", desc: "Get a verified badge after we review your submission" },
  { icon: Megaphone, title: "Reach local shoppers", desc: "Connect with buyers actively looking for local goods" },
  { icon: Leaf, title: "Support your community", desc: "Grow the local food and craft economy in your area" },
];

const PRICING_TIERS = [
  {
    id: "free",
    name: "Community",
    price: "Free",
    period: "forever",
    icon: Leaf,
    color: "border-border",
    badge: null,
    features: [
      "Basic listing with name & description",
      "Searchable by zip code & state",
      "Category badge",
      "Contact email link",
    ],
  },
  {
    id: "featured",
    name: "Featured",
    price: "$9.99",
    period: "/ month",
    icon: Star,
    color: "border-secondary",
    badge: "Popular",
    features: [
      "Everything in Community",
      "⭐ Featured badge & top placement",
      "Social media links (Instagram)",
      "Priority in search results",
      "Monthly impressions report",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "$24.99",
    period: "/ month",
    icon: Crown,
    color: "border-primary",
    badge: "Best Value",
    features: [
      "Everything in Featured",
      "👑 Premium crown badge",
      "Full product listing (up to 25 items)",
      "Website link on vendor profile",
      "Priority homepage placement",
      "Weekly performance analytics",
    ],
  },
];

export default function VendorPortalPage() {
  const { toast } = useToast();
  const [success, setSuccess] = useState(false);
  const [newVendorId, setNewVendorId] = useState<number | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // Check for Stripe redirect params
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("upgraded=true")) {
      const tier = hash.includes("tier=premium") ? "premium" : "featured";
      toast({ title: "Upgrade successful!", description: `Your listing has been upgraded to ${tier}. Welcome to LocalOG Pro!` });
    } else if (hash.includes("cancelled=true")) {
      toast({ title: "Upgrade cancelled", description: "No charges were made.", variant: "destructive" });
    }
  }, []);

  const form = useForm<InsertVendor>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "", description: "", category: "produce", zipCode: "", state: "", city: "",
      email: "", phone: "", website: "", instagramHandle: "", imageUrl: "", source: "registered",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: InsertVendor) => apiRequest("POST", "/api/vendors", data),
    onSuccess: async (res) => {
      const vendor = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setNewVendorId(vendor.id);
      setSuccess(true);
      toast({ title: "Business listed!", description: "You're now on LocalOG. Welcome to the community." });
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    },
  });

  const handleUpgrade = async (tier: "featured" | "premium") => {
    if (!newVendorId) {
      toast({ title: "Register first", description: "Please complete your business listing before upgrading.", variant: "destructive" });
      return;
    }
    setCheckoutLoading(tier);
    try {
      const res = await apiRequest("POST", "/api/stripe/create-checkout", {
        vendorId: newVendorId,
        tier,
        successUrl: `${window.location.origin}/#/vendor-portal?upgraded=true&tier=${tier}`,
        cancelUrl: `${window.location.origin}/#/vendor-portal?cancelled=true`,
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Stripe not configured", description: "Payment processing requires a Stripe key. Add STRIPE_SECRET_KEY to your environment.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Payment error", description: "Could not initiate checkout. Please try again.", variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const onSubmit = (data: InsertVendor) => mutation.mutate(data);

  // Success screen with upgrade prompt
  if (success) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Success message */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-3" style={{fontFamily:"'Chillax',sans-serif"}}>You're on LocalOG!</h2>
          <p className="text-muted-foreground mb-2">Your business has been submitted. We'll review it and send a confirmation email shortly.</p>
          <p className="text-sm text-muted-foreground">Want more visibility? Upgrade to get featured placement.</p>
        </div>

        {/* Upgrade cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {PRICING_TIERS.map(tier => (
            <Card
              key={tier.id}
              className={`border-2 ${tier.color} relative overflow-visible transition-shadow hover:shadow-lg`}
              data-testid={`card-tier-${tier.id}`}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full shadow ${tier.id === "premium" ? "bg-primary text-white" : "bg-secondary text-white"}`}>
                    {tier.badge}
                  </span>
                </div>
              )}
              <CardContent className="p-5 pt-7">
                <div className="flex items-center gap-2 mb-3">
                  <tier.icon size={18} className={tier.id === "premium" ? "text-primary" : tier.id === "featured" ? "text-secondary" : "text-muted-foreground"} />
                  <h3 className="font-bold text-base">{tier.name}</h3>
                </div>
                <div className="mb-4">
                  <span className="text-2xl font-black">{tier.price}</span>
                  <span className="text-sm text-muted-foreground"> {tier.period}</span>
                </div>
                <ul className="space-y-2 mb-5">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs">
                      <CheckCircle size={12} className="text-primary mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {tier.id === "free" ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={tier.id === "premium" ? "default" : "outline"}
                    onClick={() => handleUpgrade(tier.id as "featured" | "premium")}
                    disabled={!!checkoutLoading}
                    data-testid={`button-upgrade-${tier.id}`}
                  >
                    {checkoutLoading === tier.id ? (
                      <><Loader2 size={14} className="mr-2 animate-spin" /> Redirecting...</>
                    ) : (
                      <><Zap size={14} className="mr-2" /> Upgrade to {tier.name}</>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button onClick={() => { setSuccess(false); setNewVendorId(null); }} variant="ghost">
            ← Add another business
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Payments are processed securely by Stripe. Cancel anytime.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
          <Store size={14} /> Free Vendor Listing
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{fontFamily:"'Chillax',sans-serif"}}>
          List Your Business on LocalOG
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Reach local shoppers looking for fresh food, handcrafted goods, and community-grown products.
        </p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {BENEFITS.map(b => (
          <div key={b.title} className="bg-card border border-border rounded-2xl p-4 text-center">
            <b.icon size={24} className="text-primary mx-auto mb-2" />
            <p className="font-semibold text-sm mb-1">{b.title}</p>
            <p className="text-xs text-muted-foreground">{b.desc}</p>
          </div>
        ))}
      </div>

      {/* Pricing preview */}
      <div className="mb-8 bg-muted/30 border border-border rounded-2xl p-5">
        <h3 className="font-bold text-base mb-4 flex items-center gap-2">
          <Zap size={16} className="text-secondary" /> Listing Plans
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PRICING_TIERS.map(tier => (
            <div key={tier.id} className={`rounded-xl border-2 ${tier.color} p-4 bg-card`}>
              <div className="flex items-center gap-2 mb-1">
                <tier.icon size={15} className={tier.id === "premium" ? "text-primary" : tier.id === "featured" ? "text-secondary" : "text-muted-foreground"} />
                <span className="font-bold text-sm">{tier.name}</span>
                {tier.badge && <Badge className={`text-xs ${tier.id === "premium" ? "bg-primary" : "bg-secondary"} text-white`}>{tier.badge}</Badge>}
              </div>
              <p className="text-xl font-black">{tier.price} <span className="text-xs font-normal text-muted-foreground">{tier.period}</span></p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">After submitting your listing, you'll have the option to upgrade. Payments handled securely by Stripe.</p>
      </div>

      {/* Form */}
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
        <h2 className="text-xl font-bold mb-6" style={{fontFamily:"'Chillax',sans-serif"}}>Business Details</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Name *</FormLabel>
                  <FormControl><Input placeholder="Sunrise Organic Farm" {...field} data-testid="input-vendor-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full h-10 bg-background border border-input rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      data-testid="select-vendor-category"
                    >
                      <option value="produce">Fresh Produce</option>
                      <option value="bakery">Bakery / Bread</option>
                      <option value="dairy">Dairy / Eggs</option>
                      <option value="crafts">Handcrafts / Art</option>
                      <option value="meat">Meat / Poultry / Fish</option>
                      <option value="plants">Plants / Flowers / Seeds</option>
                      <option value="other">Honey / Jams / Other</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Business Description *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell shoppers about your farm, products, and what makes you unique..."
                    className="min-h-24 resize-none"
                    {...field}
                    data-testid="textarea-vendor-description"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel>City *</FormLabel>
                  <FormControl><Input placeholder="Ogden" {...field} data-testid="input-vendor-city" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="state" render={({ field }) => (
                <FormItem>
                  <FormLabel>State *</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full h-10 bg-background border border-input rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      data-testid="select-vendor-state"
                    >
                      <option value="">Select state</option>
                      {["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="zipCode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Zip Code *</FormLabel>
                  <FormControl><Input placeholder="84401" {...field} data-testid="input-vendor-zip" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl><Input type="email" placeholder="you@yourbusiness.com" {...field} data-testid="input-vendor-email" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone (optional)</FormLabel>
                  <FormControl><Input placeholder="801-555-0100" {...field} value={field.value ?? ""} data-testid="input-vendor-phone" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="website" render={({ field }) => (
                <FormItem>
                  <FormLabel>Website (optional)</FormLabel>
                  <FormControl><Input placeholder="https://yourfarm.com" {...field} value={field.value ?? ""} data-testid="input-vendor-website" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="instagramHandle" render={({ field }) => (
                <FormItem>
                  <FormLabel>Instagram (optional)</FormLabel>
                  <FormControl><Input placeholder="@yourhandle" {...field} value={field.value ?? ""} data-testid="input-vendor-instagram" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="imageUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>Business Photo URL (optional)</FormLabel>
                <FormControl><Input placeholder="https://yoursite.com/photo.jpg" {...field} value={field.value ?? ""} data-testid="input-vendor-image" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full py-3 text-base font-bold"
                disabled={mutation.isPending}
                data-testid="button-vendor-submit"
              >
                {mutation.isPending ? "Submitting..." : "🌿 List My Business — Free"}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-3">
                By submitting, you agree to our community guidelines. Listings are reviewed within 1–2 business days.
              </p>
            </div>
          </form>
        </Form>
      </div>

      {/* Source info */}
      <div className="mt-8 bg-muted/30 rounded-2xl p-6">
        <h3 className="font-bold mb-3 text-lg" style={{fontFamily:"'Chillax',sans-serif"}}>How LocalOG finds local vendors</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
          <div className="space-y-1">
            <p className="font-semibold text-foreground">📡 USDA Farmers Market Directory</p>
            <p>We import publicly available market data from the USDA's National Farmers Market Directory.</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground">📍 Google Places + ⭐ Yelp</p>
            <p>We surface highly-rated local farms, bakeries, co-ops, and artisans from Google Maps and Yelp.</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground">🌿 Community Submissions</p>
            <p>Vendors and shoppers can submit businesses directly. Verified listings get a special badge.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
