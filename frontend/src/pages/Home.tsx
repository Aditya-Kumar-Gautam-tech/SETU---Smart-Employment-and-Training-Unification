import logo from "@/assets/logo.svg";
import heroImage from "@/assets/hero-image.jpg";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, BrainCircuit, BriefcaseBusiness, CheckCircle2, Gauge, Sparkles, Target, UploadCloud, WandSparkles } from "lucide-react";
import { Link } from "react-router-dom";

const highlights = [
  {
    title: "Resume-aware job search",
    description: "SETU turns your resume into a verified skill profile, so discovery starts from who you are, not from guesswork.",
    icon: BrainCircuit,
  },
  {
    title: "Human-in-the-loop matching",
    description: "You confirm extracted skills before matching begins, keeping the flow transparent and aligned with your actual strengths.",
    icon: WandSparkles,
  },
  {
    title: "Focused career momentum",
    description: "Upload once, refine your profile, and move directly into curated opportunities built around your confirmed capabilities.",
    icon: BriefcaseBusiness,
  },
];

const steps = [
  {
    title: "Upload your resume",
    description: "Start with the profile you already have. SETU accepts your resume and prepares it for structured analysis.",
    icon: UploadCloud,
  },
  {
    title: "Confirm your real skills",
    description: "Review the extracted skills, remove noise, and add what matters so the system reflects your strongest signal.",
    icon: CheckCircle2,
  },
  {
    title: "Explore sharper matches",
    description: "Your verified skill set drives job discovery, helping you focus on roles that actually fit your profile.",
    icon: Target,
  },
];

const stats = [
  { label: "Unified flow", value: "1 platform" },
  { label: "Core journey", value: "Resume -> Skills -> Jobs" },
  { label: "Experience goal", value: "Faster clarity" },
];

const Home = () => {
  return (
    <div className="brand-shell min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[image:var(--gradient-surface)] px-6 py-12 shadow-[0_28px_90px_-42px_rgba(15,23,42,0.35)] sm:px-10 lg:px-12 lg:py-16">
          <div className="ambient-grid absolute inset-0 opacity-70" />
          <div className="halo-ring left-[-4rem] top-[-5rem] h-56 w-56" />
          <div className="halo-ring bottom-[-8rem] right-[-5rem] h-80 w-80" />

          <div className="relative grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="max-w-3xl space-y-8">
              <Badge className="rounded-full border border-sky-200 bg-white/85 px-4 py-2 text-xs uppercase tracking-[0.3em] text-sky-800 shadow-sm hover:bg-white">
                Smart Employment and Training Unification
              </Badge>

              <div className="space-y-5">
                <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] text-slate-950 sm:text-6xl lg:text-7xl">
                  Job discovery that feels
                  <span className="brand-gradient-text"> built around you.</span>
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                  SETU is a skill-first career platform that turns your resume into a clear opportunity signal. Upload your profile, confirm what matters, and explore roles with better relevance and better momentum.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to="/openings">
                  <Button size="lg" className="button-glow rounded-full bg-slate-950 px-7 text-white hover:bg-slate-800">
                    Explore opportunities
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/auth?mode=signup">
                  <Button size="lg" variant="outline" className="rounded-full border-slate-200 bg-white/80 px-7 text-slate-700 hover:bg-white">
                    Create your SETU account
                  </Button>
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {stats.map((item) => (
                  <div key={item.label} className="section-card px-5 py-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-6 top-8 hidden rounded-full bg-sky-100 px-4 py-2 text-sm font-medium text-sky-900 shadow-lg lg:flex">
                <Gauge className="mr-2 h-4 w-4" />
                Goal-oriented matching
              </div>
              <div className="mesh-panel relative overflow-hidden rounded-[2rem] border border-white/70 p-4 shadow-[0_30px_95px_-45px_rgba(15,23,42,0.45)]">
                <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/55 to-transparent" />
                <img src={heroImage} alt="SETU platform preview" className="h-[28rem] w-full rounded-[1.5rem] object-cover" />
                <div className="absolute left-8 right-8 top-8 rounded-[1.5rem] border border-white/75 bg-white/80 p-5 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.42)] backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-28 overflow-hidden rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                      <img src={logo} alt="SETU logo" className="h-full w-full object-contain object-left" />
                    </div>
                    <Badge className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800 hover:bg-emerald-100">Live profile flow</Badge>
                  </div>
                  <div className="mt-5 grid gap-4">
                    {[
                      "Resume uploaded and parsed",
                      "Skills reviewed and verified",
                      "Opportunity feed tailored to your profile",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-sm text-white">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute bottom-7 left-7 rounded-3xl border border-white/70 bg-white/85 px-5 py-4 shadow-lg backdrop-blur-xl">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Promise</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">Less noise. Better fit. Clearer next move.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 py-16 lg:grid-cols-3">
          {highlights.map((item, index) => (
            <article
              key={item.title}
              className="section-card mesh-panel relative overflow-hidden px-6 py-7 transition-transform duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <div className="mb-5 inline-flex rounded-2xl bg-slate-950 p-3 text-white">
                <item.icon className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-950">{item.title}</h2>
              <p className="mt-3 text-base leading-7 text-slate-600">{item.description}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="section-card p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Why SETU feels different</p>
            <h2 className="mt-4 max-w-lg text-4xl font-semibold text-slate-950">
              Designed like a product, not a portal.
            </h2>
            <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">
              Every interaction is centered around employability momentum: understand your profile, refine your skill signal, and move into better opportunities with less friction.
            </p>
            <div className="mt-8 rounded-[1.75rem] bg-slate-950 p-6 text-white">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-sky-300" />
                <p className="text-sm font-semibold uppercase tracking-[0.26em] text-sky-200">Core product thesis</p>
              </div>
              <p className="mt-4 text-lg leading-8 text-slate-200">
                Candidates should not have to reverse-engineer job portals. SETU gives them a guided flow that starts from their actual skill story.
              </p>
            </div>
          </div>

          <div className="grid gap-5">
            {steps.map((step, index) => (
              <article key={step.title} className="section-card flex gap-5 p-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[image:var(--gradient-primary)] text-white shadow-lg">
                  <step.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Step {index + 1}</span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold text-slate-950">{step.title}</h3>
                  <p className="mt-2 text-base leading-7 text-slate-600">{step.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-[2rem] bg-slate-950 px-6 py-12 text-white shadow-[0_28px_90px_-42px_rgba(15,23,42,0.72)] sm:px-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-300">Ready when you are</p>
              <h2 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
                Build a sharper job search experience with your own verified skill profile.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
                SETU is already wired for authentication, resume parsing, skill confirmation, and backend-driven opportunity discovery. Step in and let the workflow do the heavy lifting.
              </p>
            </div>
            <Link to="/openings">
              <Button size="lg" className="rounded-full bg-white px-8 text-slate-950 hover:bg-slate-100">
                Start with your resume
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;
