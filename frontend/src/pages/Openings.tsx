import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Bot, BrainCircuit, Building2, Loader2, MapPin, Pin, Sparkles, Upload, WandSparkles, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import SkillsConfirmationDialog from "@/components/SkillsConfirmationDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { useRagInsights } from "@/hooks/use-rag-insights";
import { getStoredJwtToken } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/auth-service";
import { getResumeSkills, getScrapedJobs, uploadResume, verifyResumeSkills, type ScrapedJob } from "@/lib/resume-service";

const Openings = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isLoggedIn } = useAuthStatus();
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [jobs, setJobs] = useState<ScrapedJob[]>([]);
  const [skillsUsed, setSkillsUsed] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingSkills, setPendingSkills] = useState<string[]>([]);
  const [parsedResume, setParsedResume] = useState<Record<string, unknown> | null>(null);
  const [isSkillsDialogOpen, setIsSkillsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingSkills, setIsSavingSkills] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isAiCoachEnabled, setIsAiCoachEnabled] = useState(false);

  const getAuthToken = () => {
    const token = getStoredJwtToken();
    if (!token) {
      throw new Error("Please log in before uploading a resume.");
    }

    return token;
  };

  const authToken = isLoggedIn ? getStoredJwtToken() : null;

  const resumeMeta = useMemo(() => {
    const parsedData =
      parsedResume &&
      "parsed_data" in parsedResume &&
      typeof parsedResume.parsed_data === "object" &&
      parsedResume.parsed_data !== null
        ? (parsedResume.parsed_data as Record<string, unknown>)
        : null;

    const parsedName = parsedData && typeof parsedData.name === "string" ? parsedData.name : undefined;
    const parsedSkills = parsedData && Array.isArray(parsedData.skills)
      ? parsedData.skills.filter((skill): skill is string => typeof skill === "string")
      : [];

    return {
      name: parsedName,
      skills: skillsUsed.length > 0 ? skillsUsed : parsedSkills,
    };
  }, [parsedResume, skillsUsed]);

  const {
    activeJobId,
    pinnedJobId,
    loadingJobId,
    cursorPosition,
    insightsByJob,
    errorsByJob,
    handleHover,
    handleLeave,
    togglePinned,
    clearPinned,
    clearCache,
  } = useRagInsights({
    enabled: isAiCoachEnabled && skillsUsed.length > 0,
    token: authToken,
    resumeMeta,
  });

  const loadJobs = async () => {
    const token = getAuthToken();
    setIsLoadingJobs(true);

    try {
      const response = await getScrapedJobs(token);
      setJobs(response.jobs);
      setSkillsUsed(response.skills_used);

      if (response.jobs.length === 0) {
        toast.info("No matching jobs were returned for the current skill set.");
      } else {
        toast.success(`Loaded ${response.jobs.length} job match${response.jobs.length === 1 ? "" : "es"}.`);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to load job matches right now."));
    } finally {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setIsBootstrapping(false);
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      setIsBootstrapping(true);

      try {
        const token = getAuthToken();
        const response = await getResumeSkills(token);

        if (cancelled) {
          return;
        }

        const verifiedSkills = response.verified_skills ?? [];
        setParsedResume(response.parsed_resume ?? null);

        if (verifiedSkills.length > 0) {
          setPendingSkills(verifiedSkills);
          setSkillsUsed(verifiedSkills);
          await loadJobs();
        } else if (response.extracted_skills.length > 0) {
          setPendingSkills(response.extracted_skills);
          setIsSkillsDialogOpen(true);
        }
      } catch (error) {
        const message = getApiErrorMessage(error, "");
        if (message && message !== "No parsed resume found for this user.") {
          toast.error(message);
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const handleUploadClick = () => {
    if (!isLoggedIn) {
      toast.info("Please sign in before uploading your resume.");
      navigate("/auth?mode=login");
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF resume.");
      return;
    }

    setIsUploading(true);
    setUploadedFileName(file.name);

    try {
      const token = getAuthToken();
      const response = await uploadResume(file, token);

      setPendingSkills(response.extracted_skills);
      setSkillsUsed([]);
      setJobs([]);
      setIsSkillsDialogOpen(true);
      toast.success("Resume parsed successfully. Confirm your skills to continue.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to upload and parse your resume right now."));
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmSkills = async (skills: string[]) => {
    setIsSavingSkills(true);

    try {
      const token = getAuthToken();
      await verifyResumeSkills(skills, token);
      const latestResume = await getResumeSkills(token);
      setSkillsUsed(skills);
      setPendingSkills(skills);
      setParsedResume(latestResume.parsed_resume ?? null);
      setIsSkillsDialogOpen(false);
      toast.success("Skills confirmed successfully.");
      await loadJobs();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to save your confirmed skills right now."));
    } finally {
      setIsSavingSkills(false);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const haystack = [job.title, job.company, job.location, job.description, job.matched_skills.join(" ")].join(" ").toLowerCase();
    return haystack.includes(searchQuery.toLowerCase());
  });

  const handleReset = () => {
    setUploadedFileName("");
    setJobs([]);
    setSkillsUsed([]);
    setPendingSkills([]);
    setParsedResume(null);
    setSearchQuery("");
    setIsSkillsDialogOpen(false);
    setIsAiCoachEnabled(false);
    clearCache();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="brand-shell min-h-screen">
      <Navbar />

      <SkillsConfirmationDialog
        open={isSkillsDialogOpen}
        initialSkills={pendingSkills}
        isSaving={isSavingSkills}
        onOpenChange={setIsSkillsDialogOpen}
        onConfirm={handleConfirmSkills}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[image:var(--gradient-surface)] px-6 py-10 shadow-[0_24px_80px_-38px_rgba(15,23,42,0.34)] sm:px-8">
          <div className="ambient-grid absolute inset-0 opacity-65" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Opportunity studio</p>
              <h1 className="text-4xl font-semibold leading-tight text-slate-950 md:text-5xl">
                Skill-confirmed jobs, shaped around your actual profile.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                Upload your resume, refine the extracted skills, and let SETU turn that verified signal into a more focused opportunity feed.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Resume status", value: uploadedFileName || (skillsUsed.length > 0 ? "Ready" : "Pending") },
                { label: "Verified skills", value: `${skillsUsed.length}` },
                { label: "Current matches", value: `${jobs.length}` },
              ].map((item) => (
                <div key={item.label} className="section-card min-w-[10rem] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-10">
        <div className="text-center mb-12 animate-fade-in">
          <p className="mx-auto max-w-2xl text-base text-slate-600">
            This workspace keeps the flow simple: parse once, verify what matters, then explore roles with better context and better signal.
          </p>
        </div>

        {!isLoggedIn ? (
          <Card className="section-card mx-auto max-w-2xl border-white/70">
            <CardHeader>
              <CardTitle>Sign in to continue</CardTitle>
              <CardDescription>The parser, skill verification, and job scraping flow require an authenticated account.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Link to="/auth?mode=login" className="w-full">
                <Button className="w-full">Go to Login</Button>
              </Link>
            </CardFooter>
          </Card>
        ) : (
          <>
            <Card className="section-card mx-auto mb-8 max-w-4xl animate-slide-up border-white/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Resume pipeline
                </CardTitle>
                <CardDescription>
                  Bring in your resume, confirm the extracted skills, and keep your opportunity feed anchored to a profile you trust.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                    <Button onClick={handleUploadClick} variant="outline" className="flex-1 rounded-full border-slate-200 bg-white/80 hover:bg-white" disabled={isUploading}>
                      {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      {uploadedFileName || "Choose Resume PDF"}
                    </Button>
                    <Button
                      onClick={() => setIsSkillsDialogOpen(true)}
                      variant="secondary"
                      className="rounded-full bg-slate-950 text-white hover:bg-slate-800"
                      disabled={pendingSkills.length === 0 || isSavingSkills}
                    >
                      Confirm Skills
                    </Button>
                    <Button onClick={handleReset} variant="ghost" className="rounded-full text-slate-600 hover:bg-slate-900/5" disabled={isUploading || isSavingSkills || isLoadingJobs}>
                      Reset View
                    </Button>
                  </div>

                {(isBootstrapping || isLoadingJobs) && (
                  <p className="text-sm text-muted-foreground">
                    {isBootstrapping ? "Loading your latest parsed resume..." : "Fetching matching jobs..."}
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_2fr]">
              <div className="space-y-6">
                <Card className="section-card border-white/70">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Confirmed Skills
                    </CardTitle>
                    <CardDescription>The verified skills used to fetch your current set of job matches.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {skillsUsed.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {skillsUsed.map((skill) => (
                          <Badge key={skill}>{skill}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Upload a resume and confirm the extracted skills to begin job matching.
                      </p>
                    )}
                    <Button variant="outline" className="w-full rounded-full border-slate-200 bg-white/85 hover:bg-white" onClick={() => setIsSkillsDialogOpen(true)} disabled={pendingSkills.length === 0}>
                      Review Skills
                    </Button>
                  </CardContent>
                </Card>

                <Card className="section-card overflow-hidden border-white/70 bg-gradient-to-br from-secondary/10 via-white/70 to-primary/5 shadow-[0_18px_55px_-32px_hsl(var(--secondary)/0.55)]">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <CardTitle className="flex items-center gap-2 text-xl">
                          <BrainCircuit className="h-5 w-5 text-secondary" />
                          Hover Resume Coach
                        </CardTitle>
                        <CardDescription>
                          Hover any job card to get resume-specific coaching. It uses your latest uploaded resume and stays visually separate from the base matching flow.
                        </CardDescription>
                      </div>
                      <Button
                        type="button"
                        variant={isAiCoachEnabled ? "default" : "outline"}
                        size="sm"
                        className={isAiCoachEnabled ? "bg-secondary text-secondary-foreground hover:bg-secondary/90" : "border-secondary/40 text-secondary hover:bg-secondary/10"}
                        onClick={() => {
                          setIsAiCoachEnabled((current) => {
                            const next = !current;
                            if (!next) {
                              handleLeave();
                              clearPinned();
                            }
                            return next;
                          });
                        }}
                        disabled={skillsUsed.length === 0}
                      >
                        <Bot className="mr-2 h-4 w-4" />
                        {isAiCoachEnabled ? "AI Coach On" : "Enable Coach"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <WandSparkles className="h-4 w-4 text-secondary" />
                        Distinct from job matching
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Matching still comes from confirmed skills. The hover coach adds a second layer of job-specific guidance when you explore each listing.
                      </p>
                    </div>

                    {skillsUsed.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {resumeMeta.skills.map((skill) => (
                          <Badge key={`coach-${skill}`} variant="secondary" className="bg-secondary/15 text-secondary hover:bg-secondary/20">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        The AI coach unlocks after you confirm a skill set.
                      </p>
                    )}

                    {isAiCoachEnabled && (
                      <Button variant="ghost" size="sm" className="px-0 text-secondary hover:bg-transparent hover:text-secondary/80" onClick={clearCache}>
                        Refresh cached insights
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="section-card border-white/70">
                  <CardHeader>
                    <CardTitle>Scraped Job Matches</CardTitle>
                    <CardDescription>Roles returned by the backend after your confirmed skills shape the search context.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Input
                      placeholder="Search by title, company, location, or skill"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      disabled={jobs.length === 0}
                    />
                  </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                  {filteredJobs.map((job, index) => {
                    const hoverJob = {
                      id: `${index}-${job.title}-${job.company ?? "company"}`,
                      title: job.title,
                      company: job.company || "Company not provided",
                      description: job.description || "",
                      tags: job.matched_skills,
                    };
                    const insight = insightsByJob[hoverJob.id];
                    const insightError = errorsByJob[hoverJob.id];
                    const isInsightLoading = loadingJobId === hoverJob.id;
                    const isActive = activeJobId === hoverJob.id;
                    const isPinned = pinnedJobId === hoverJob.id;

                    return (
                    <div key={`${job.title}-${job.link ?? index}`} className="relative">
                    <Card
                      className={`group flex h-full flex-col transition-all duration-300 ${
                        isAiCoachEnabled ? "cursor-crosshair hover:-translate-y-1 hover:border-secondary/40 hover:shadow-[0_18px_40px_-26px_hsl(var(--secondary)/0.55)]" : ""
                      } ${isActive ? "border-secondary/50 shadow-[0_22px_48px_-28px_hsl(var(--secondary)/0.6)]" : ""} section-card border-white/70 bg-white/78`}
                      onMouseEnter={(event) => {
                        if (isAiCoachEnabled) {
                          handleHover(hoverJob, event);
                        }
                      }}
                      onMouseMove={(event) => {
                        if (isAiCoachEnabled) {
                          handleHover(hoverJob, event, true);
                        }
                      }}
                      onMouseLeave={() => {
                        if (isAiCoachEnabled) {
                          handleLeave();
                        }
                      }}
                      onClick={(event) => {
                        if (isAiCoachEnabled) {
                          togglePinned(hoverJob, event);
                        }
                      }}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-xl">{job.title}</CardTitle>
                            <CardDescription>{job.company || "Company not provided"}</CardDescription>
                          </div>
                          <Badge variant="outline" className="border-secondary/35 bg-secondary/10 text-secondary">
                            {job.score}% match
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 space-y-4">
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{job.location || "Location not provided"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <span>{isAiCoachEnabled ? "Hover for AI fit coaching" : "Skill-based scraper match"}</span>
                          </div>
                        </div>

                        <p className="text-sm text-foreground">
                          {job.description || "No job description was provided by the scraper."}
                        </p>

                        {job.matched_skills.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {job.matched_skills.map((skill) => (
                              <Badge key={`${job.title}-${skill}`} variant="secondary" className="bg-secondary/15 text-secondary hover:bg-secondary/20">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {isAiCoachEnabled && (
                          <div className="rounded-xl border border-dashed border-secondary/35 bg-secondary/5 px-3 py-2 text-xs text-secondary">
                            {isPinned ? "Pinned coach window. Click the card again or use close to dismiss." : "Hover to preview, click to pin and scroll the coach window."}
                          </div>
                        )}
                      </CardContent>
                      <CardFooter>
                        {job.link ? (
                          <a href={job.link} target="_blank" rel="noreferrer" className="w-full">
                            <Button className="w-full rounded-full bg-slate-950 text-white hover:bg-slate-800">
                              View Job <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </a>
                        ) : (
                          <Button className="w-full rounded-full" disabled>
                            Job Link Unavailable
                          </Button>
                        )}
                      </CardFooter>
                    </Card>

                    {isAiCoachEnabled && isActive && (
                      <div
                        className={`absolute z-20 w-[18rem] max-w-[calc(100vw-2rem)] max-h-[min(28rem,calc(100vh-8rem))] overflow-y-auto rounded-2xl border border-secondary/35 bg-card/95 p-4 shadow-[0_28px_70px_-28px_hsl(var(--secondary)/0.55)] backdrop-blur supports-[backdrop-filter]:bg-card/90 ${isPinned ? "pointer-events-auto" : "pointer-events-none"}`}
                        style={{
                          left: `${Math.min(cursorPosition.x + 18, 32)}px`,
                          top: `${Math.max(cursorPosition.y - 12, 12)}px`,
                        }}
                        onClick={(event) => {
                          event.stopPropagation();
                        }}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary">
                              Resume Coach
                            </p>
                            <p className="mt-1 text-sm font-semibold text-foreground">{job.title}</p>
                            <p className="text-xs text-muted-foreground">{job.company || "Company not provided"}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isPinned && <Pin className="h-4 w-4 text-secondary" />}
                            {isPinned ? (
                              <button
                                type="button"
                                className="pointer-events-auto rounded-full border border-secondary/20 p-1 text-secondary transition hover:bg-secondary/10"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  clearPinned();
                                }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <WandSparkles className="mt-0.5 h-4 w-4 text-secondary" />
                            )}
                          </div>
                        </div>

                        {isInsightLoading ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin text-secondary" />
                            Analyzing your resume fit...
                          </div>
                        ) : insightError ? (
                          <p className="text-sm text-destructive">{insightError}</p>
                        ) : insight ? (
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                                <span>Match</span>
                                <span className="text-secondary">{insight.match_score}%</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-secondary/10">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-primary via-secondary/80 to-secondary transition-all duration-500"
                                  style={{ width: `${Math.min(Math.max(insight.match_score, 6), 100)}%` }}
                                />
                              </div>
                            </div>

                            <div className="rounded-xl border border-secondary/20 bg-secondary/8 px-3 py-2">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Main Gap</p>
                              <p className="mt-1 text-sm font-medium text-foreground">{insight.gap}</p>
                            </div>

                            <div className="space-y-2">
                              {insight.suggestions.map((suggestion, suggestionIndex) => (
                                <div key={`${hoverJob.id}-${suggestion.type}-${suggestionIndex}`} className="rounded-xl border border-border/70 bg-background/70 px-3 py-2">
                                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    {suggestion.type}
                                  </div>
                                  <p className="mt-1 text-sm text-foreground">{suggestion.action}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">{suggestion.why}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Move over a job card to load tailored guidance.</p>
                        )}
                      </div>
                    )}
                    </div>
                  );})}
                </div>

                {!isLoadingJobs && jobs.length === 0 && skillsUsed.length > 0 && (
                  <Card className="section-card border-white/70">
                    <CardContent className="py-10 text-center text-muted-foreground">
                      No scraped jobs are available yet for the confirmed skills.
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
};

export default Openings;
