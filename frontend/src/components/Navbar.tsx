import logo from "@/assets/logo.svg";
import { Button } from "@/components/ui/button";
import { clearStoredJwtToken } from "@/lib/auth";
import { ArrowRight, Compass, Layers3, LogOut, Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStatus } from "@/hooks/use-auth-status";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Opportunities", href: "/openings" },
];

const Navbar = () => {
  const location = useLocation();
  const { isLoggedIn } = useAuthStatus();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 px-3 py-3 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/70 bg-white/75 px-4 py-3 shadow-[0_18px_55px_-32px_rgba(15,23,42,0.42)] backdrop-blur-xl sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="h-11 w-28 overflow-hidden rounded-full bg-white/80 px-3 py-1 shadow-inner ring-1 ring-slate-200/70">
            <img src={logo} alt="SETU" className="h-full w-full object-contain object-left" />
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Smart Employability</p>
            <p className="text-sm font-medium text-slate-700">Career clarity, skill confidence, better matches.</p>
          </div>
        </Link>

        <div className="hidden items-center gap-2 rounded-full bg-slate-900/4 p-1 lg:flex">
          {navItems.map((item, index) => {
            const Icon = index === 0 ? Compass : Layers3;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  isActive(item.href)
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <>
              <Link to="/openings" className="hidden sm:block">
                <Button className="button-glow rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800">
                  Explore matches
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="outline"
                className="rounded-full border-slate-200 bg-white/70 text-slate-700 hover:bg-white"
                onClick={clearStoredJwtToken}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth?mode=login">
                <Button variant="ghost" className="rounded-full text-slate-700 hover:bg-white/70">
                  Login
                </Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button className="button-glow rounded-full bg-[image:var(--gradient-primary)] px-5 text-white hover:opacity-95">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Get started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
