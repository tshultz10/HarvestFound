import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import HomePage from "@/pages/home";
import ExplorePage from "@/pages/explore";
import MarketsPage from "@/pages/markets";
import VendorPage from "@/pages/vendor";
import VendorPortalPage from "@/pages/vendor-portal";
import NotFound from "@/pages/not-found";
import { useState, useEffect } from "react";
import { Sun, Moon, MapPin, Menu, X } from "lucide-react";

function ThemeToggle() {
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return (
    <button
      onClick={() => setDark(d => !d)}
      className="p-2 rounded-full hover:bg-muted transition-colors"
      aria-label="Toggle theme"
      data-testid="button-theme-toggle"
    >
      {dark ? <Sun size={18} className="text-secondary" /> : <Moon size={18} />}
    </button>
  );
}

function NavBar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: "/", label: "Home" },
    { href: "/explore", label: "Shop Local" },
    { href: "/markets", label: "Markets" },
    { href: "/vendor-portal", label: "List Your Business" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border">
      <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/">
          <a className="flex items-center gap-2 font-bold text-lg" data-testid="link-logo">
            <svg viewBox="0 0 40 40" width="34" height="34" aria-label="LocalOG logo" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="19" fill="#2d8a45"/>
              <path d="M20 8 C14 8 10 13 10 18 C10 26 20 32 20 32 C20 32 30 26 30 18 C30 13 26 8 20 8Z" fill="#6dd47e" opacity="0.6"/>
              <text x="20" y="25" textAnchor="middle" fontSize="13" fill="white" fontWeight="700" fontFamily="sans-serif">OG</text>
            </svg>
            <span className="text-primary font-heading" style={{fontFamily:"'Chillax',sans-serif", fontWeight:700}}>LocalOG</span>
          </a>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <Link key={l.href} href={l.href}>
              <a
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${location === l.href ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}
                data-testid={`link-nav-${l.label.toLowerCase().replace(/\s/g,"-")}`}
              >
                {l.label}
              </a>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted"
            onClick={() => setMobileOpen(o => !o)}
            data-testid="button-mobile-menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-3 flex flex-col gap-1">
          {links.map(l => (
            <Link key={l.href} href={l.href}>
              <a
                className={`px-3 py-2 rounded-lg text-sm font-medium ${location === l.href ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </a>
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-muted/40 py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-primary" />
            <span>LocalOG — Your virtual farmers market &amp; craft fair</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/vendor-portal"><a className="hover:text-foreground transition-colors">List Your Business</a></Link>
            <Link href="/markets"><a className="hover:text-foreground transition-colors">Find a Market</a></Link>
          </div>
          <PerplexityAttribution />
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        <Layout>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/explore" component={ExplorePage} />
            <Route path="/markets" component={MarketsPage} />
            <Route path="/vendor/:id" component={VendorPage} />
            <Route path="/vendor-portal" component={VendorPortalPage} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}
