import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BarChart3, Briefcase, Home, GitCompare, Sun, Moon, Monitor, Brain, DollarSign, Menu, X } from "lucide-react";
import { useThemeStore } from "@/store/themeStore";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/dashboard", label: "Analytics", icon: BarChart3 },
  { to: "/ml", label: "ML Models", icon: Brain },
  { to: "/compare", label: "Compare", icon: GitCompare },
  { to: "/salary", label: "Salary", icon: DollarSign },
];

const THEME_OPTIONS = [
  { value: "light" as const, icon: Sun },
  { value: "dark" as const, icon: Moon },
  { value: "system" as const, icon: Monitor },
];

export function Navbar() {
  const location = useLocation();
  const { theme, setTheme } = useThemeStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <img src="/logo.svg" alt="JobBoard Intel logo" className="h-6 w-6 rounded-md" />
          <span className="hidden sm:inline">JobBoard Intel</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <div className="flex items-center gap-0.5 rounded-lg bg-[hsl(var(--muted))] p-1">
            {THEME_OPTIONS.map(({ value, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  theme === value
                    ? "bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                )}
                title={value}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <nav className="flex flex-col p-2">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                      : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}