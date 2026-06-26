import { Link, useLocation } from "react-router";
import { useAuth } from "~/modules/authentication/use-authentication";
import { useConfigurables } from "~/modules/configurables";
import { cn } from "~/lib/utils";
import {
  LayoutDashboard,
  Building2,
  ReceiptText,
  TrendingUp,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Properties", href: "/properties", icon: Building2 },
  { label: "Expenses", href: "/expenses", icon: ReceiptText },
  { label: "P&L Report", href: "/pnl", icon: TrendingUp },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const { config, loading } = useConfigurables();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const appName = loading ? "PropLedger" : (config?.appName ?? "PropLedger");
  const logoUrl = config?.logoUrl ?? "";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-sidebar-background border-r border-sidebar-border shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
          {logoUrl ? (
            <img src={logoUrl} alt={appName} className="h-8 w-8 rounded object-cover" />
          ) : (
            <div className="h-8 w-8 rounded bg-sidebar-primary flex items-center justify-center">
              <Building2 className="w-4 h-4 text-sidebar-primary-foreground" />
            </div>
          )}
          <span className="text-sidebar-foreground font-bold text-lg tracking-tight">{appName}</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? location.pathname === "/" : location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
                {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div className="px-3 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
              <span className="text-sidebar-accent-foreground text-xs font-bold uppercase">
                {user?.username?.charAt(0) ?? "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sidebar-foreground text-sm font-medium truncate">{user?.username}</p>
              <p className="text-sidebar-foreground/50 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <form method="post" action="/auth/logout">
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-sidebar-background border-b border-sidebar-border flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt={appName} className="h-7 w-7 rounded object-cover" />
          ) : (
            <div className="h-7 w-7 rounded bg-sidebar-primary flex items-center justify-center">
              <Building2 className="w-4 h-4 text-sidebar-primary-foreground" />
            </div>
          )}
          <span className="text-sidebar-foreground font-bold text-base">{appName}</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative z-10 w-64 bg-sidebar-background flex flex-col pt-16">
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/" ? location.pathname === "/" : location.pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="px-3 py-4 border-t border-sidebar-border">
              <form method="post" action="/auth/logout">
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col lg:pt-0 pt-14">
        {children}
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border bg-card">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="ml-4 shrink-0">{action}</div>}
    </div>
  );
}
