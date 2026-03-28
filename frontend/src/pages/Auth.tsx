import logo from "@/assets/logo.svg";
import AuthModal from "@/components/AuthModal";
import { Badge } from "@/components/ui/badge";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { ArrowRight, CheckCircle2, LockKeyhole, Sparkles, WandSparkles } from "lucide-react";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const { isLoggedIn } = useAuthStatus();
  const mode = searchParams.get("mode") === "signup" ? "signup" : "login";

  if (isLoggedIn) {
    return <Navigate to="/openings" replace />;
  }

  const copy =
    mode === "signup"
      ? {
          title: "Create your SETU workspace",
          subtitle: "Turn your resume into a living opportunity signal and start from a profile that feels true to you.",
        }
      : {
          title: "Pick up your momentum",
          subtitle: "Log back in to continue with verified skills, smarter matches, and a cleaner career workflow.",
        };

  return (
    <main className="brand-shell min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 px-7 py-8 text-white shadow-[0_28px_90px_-40px_rgba(15,23,42,0.8)] sm:px-10 sm:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.24),_transparent_30%),radial-gradient(circle_at_85%_18%,_rgba(249,115,22,0.3),_transparent_22%),radial-gradient(circle_at_50%_88%,_rgba(16,185,129,0.22),_transparent_28%)]" />
          <div className="ambient-grid absolute inset-0 opacity-20" />

          <div className="relative flex h-full flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-4">
                <div className="h-12 w-28 overflow-hidden rounded-full bg-white px-3 py-1 ring-1 ring-white/20">
                  <img src={logo} alt="SETU logo" className="h-full w-full object-contain object-left" />
                </div>
                <Badge className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[11px] uppercase tracking-[0.28em] text-sky-100 hover:bg-white/10">
                  Product-first experience
                </Badge>
              </div>

              <div className="mt-16 max-w-2xl space-y-6">
                <p className="text-sm font-semibold uppercase tracking-[0.32em] text-sky-300">SETU access</p>
                <h1 className="text-5xl font-semibold leading-[0.95] sm:text-6xl">{copy.title}</h1>
                <p className="max-w-xl text-lg leading-8 text-slate-300">{copy.subtitle}</p>
              </div>

              <div className="mt-12 grid gap-4 sm:grid-cols-3">
                {[
                  { icon: LockKeyhole, title: "Secure access", description: "JWT-based auth with Google sign-in support." },
                  { icon: WandSparkles, title: "Verified skills", description: "You refine the extracted skill set before matching." },
                  { icon: ArrowRight, title: "Direct flow", description: "Move from resume to opportunities in one guided path." },
                ].map((item) => (
                  <div key={item.title} className="rounded-[1.5rem] border border-white/12 bg-white/8 p-5 backdrop-blur-sm">
                    <div className="inline-flex rounded-2xl bg-white/12 p-3">
                      <item.icon className="h-5 w-5 text-sky-200" />
                    </div>
                    <h2 className="mt-4 text-xl font-semibold">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 rounded-[1.75rem] border border-white/10 bg-white/8 p-6 backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-emerald-400/12 p-3">
                  <Sparkles className="h-5 w-5 text-emerald-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.26em] text-emerald-200">Why this flow works</p>
                  <p className="mt-3 text-base leading-7 text-slate-200">
                    SETU keeps the experience transparent. Your resume is parsed, your skills are visible, your confirmation matters, and the system moves toward opportunities with a clearer signal.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-200">
                {["Profile-aware", "Skill-confirmed", "Opportunity-driven"].map((item) => (
                  <div key={item} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full">
            <AuthModal initialMode={mode} />
          </div>
        </section>
      </div>
    </main>
  );
};

export default Auth;
