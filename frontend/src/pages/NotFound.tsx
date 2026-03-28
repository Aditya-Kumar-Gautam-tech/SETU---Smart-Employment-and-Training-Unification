import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="brand-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="section-card mesh-panel w-full max-w-2xl p-10 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-slate-950 text-white shadow-lg">
          <Search className="h-8 w-8" />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">404</p>
        <h1 className="mt-3 text-5xl font-semibold text-slate-950">This page drifted off-route.</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          The page you were looking for is not available right now. Head back to the SETU homepage and continue from there.
        </p>
        <Link to="/" className="mt-8 inline-block">
          <Button className="button-glow rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800">
            <Home className="mr-2 h-4 w-4" />
            Return home
          </Button>
        </Link>
      </div>
    </main>
  );
};

export default NotFound;
