import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Loader2, Lock, Mail, User } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getApiErrorMessage, getCurrentUser, login, loginWithGoogle, signupAndLogin } from "@/lib/auth-service";
import { setStoredAuthSession } from "@/lib/auth";

type AuthMode = "login" | "signup";

interface AuthModalProps {
  initialMode?: AuthMode;
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Field = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode; label: string }
>(({ className, icon, label, ...props }, ref) => (
  <label className="block space-y-2">
    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</span>
    <div className="group relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors duration-300 group-focus-within:text-primary">
        {icon}
      </div>
      <input
        ref={ref}
        className={cn(
          "glass-input h-14 w-full rounded-2xl px-4 pl-12 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      />
    </div>
  </label>
));
Field.displayName = "Field";

const surfaceMotion = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut" as const,
      staggerChildren: 0.06,
    },
  },
  exit: {
    opacity: 0,
    y: -18,
    scale: 0.98,
    transition: { duration: 0.24, ease: "easeIn" as const },
  },
};

const itemMotion = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.36, ease: "easeOut" as const } },
};

const AuthModal = ({ initialMode = "login" }: AuthModalProps) => {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? "";
  const navigate = useNavigate();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const isLogin = mode === "login";

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (!googleClientId) {
      return;
    }

    let cancelled = false;

    const initializeGoogle = () => {
      if (cancelled || !window.google?.accounts.id) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response.credential) {
            toast.error("Google sign-in did not return a valid token.");
            return;
          }

          setIsSubmitting(true);

          try {
            const authSession = await loginWithGoogle({ id_token: response.credential });

            setStoredAuthSession({
              accessToken: authSession.access,
              refreshToken: authSession.refresh,
              user: authSession.user,
              persist: rememberMe,
            });

            toast.success("Signed in with Google");
            navigate("/openings", { replace: true });
          } catch (error) {
            toast.error(getApiErrorMessage(error, "Unable to complete Google sign-in right now."));
          } finally {
            setIsSubmitting(false);
          }
        },
      });

      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: isLogin ? "signin_with" : "signup_with",
          width: 360,
        });
      }

      setIsGoogleReady(true);
    };

    if (window.google?.accounts.id) {
      initializeGoogle();
      return () => {
        cancelled = true;
      };
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]');

    const handleLoad = () => {
      initializeGoogle();
    };

    if (existingScript) {
      existingScript.addEventListener("load", handleLoad);
      return () => {
        cancelled = true;
        existingScript.removeEventListener("load", handleLoad);
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.addEventListener("load", handleLoad);
    script.addEventListener("error", () => {
      if (!cancelled) {
        toast.error("Failed to load Google sign-in.");
      }
    });
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      script.removeEventListener("load", handleLoad);
    };
  }, [googleClientId, isLogin, navigate, rememberMe]);

  const finalizeSession = async (accessToken: string, refreshToken: string) => {
    const user = await getCurrentUser(accessToken);

    setStoredAuthSession({
      accessToken,
      refreshToken,
      user,
      persist: rememberMe,
    });
  };

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const tokens = await login(loginForm);
      await finalizeSession(tokens.access, tokens.refresh);
      toast.success("Signed in successfully");
      navigate("/openings", { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to sign in right now."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const authSession = await signupAndLogin(signupForm);

      setStoredAuthSession({
        accessToken: authSession.access,
        refreshToken: authSession.refresh,
        user: authSession.user,
        persist: rememberMe,
      });

      toast.success("Account created successfully");
      navigate("/openings", { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to create your account right now."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const header = isLogin
    ? {
        eyebrow: "Welcome back",
        title: "Continue from your verified profile.",
        description: "Sign in to return to your skill-confirmed workspace and refreshed opportunity feed.",
        cta: "Sign in",
        switchLabel: "Need an account?",
        switchAction: "Create one",
      }
    : {
        eyebrow: "Create account",
        title: "Start a sharper career workflow.",
        description: "Set up your account and move from resume upload to job discovery in one clean flow.",
        cta: "Create account",
        switchLabel: "Already have an account?",
        switchAction: "Sign in",
      };

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/72 p-4 shadow-[0_26px_95px_-44px_rgba(15,23,42,0.42)] backdrop-blur-xl sm:p-5">
      <div className="mesh-panel absolute inset-0" />
      <div className="absolute left-0 top-0 h-44 w-44 rounded-full bg-sky-200/30 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-52 w-52 rounded-full bg-orange-200/30 blur-3xl" />

      <div className="relative rounded-[1.6rem] border border-white/75 bg-white/76 p-6 sm:p-8">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="rounded-full border border-slate-200 bg-white px-1.5 py-1 shadow-sm">
            <div className="grid grid-cols-2 gap-1">
              {(["login", "signup"] as AuthMode[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setMode(tab)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    mode === tab
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {tab === "login" ? "Login" : "Sign up"}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-full bg-slate-950/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            {isLogin ? "Secure return" : "New profile"}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            variants={surfaceMotion}
            initial="hidden"
            animate="visible"
            exit="exit"
            onSubmit={isLogin ? handleLoginSubmit : handleSignupSubmit}
            className="space-y-6"
          >
            <div className="space-y-3">
              <motion.p variants={itemMotion} className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
                {header.eyebrow}
              </motion.p>
              <motion.h2 variants={itemMotion} className="max-w-lg text-4xl font-semibold leading-tight text-slate-950 sm:text-[2.8rem]">
                {header.title}
              </motion.h2>
              <motion.p variants={itemMotion} className="max-w-xl text-base leading-7 text-slate-600">
                {header.description}
              </motion.p>
            </div>

            <motion.div variants={itemMotion} className="grid gap-4">
              {!isLogin && (
                <Field
                  name="name"
                  type="text"
                  label="Full name"
                  placeholder="Your name"
                  icon={<User size={18} />}
                  value={signupForm.name}
                  onChange={(event) => setSignupForm((current) => ({ ...current, name: event.target.value }))}
                  autoComplete="name"
                  required
                />
              )}
              <Field
                name="email"
                type="email"
                label="Email"
                placeholder="name@example.com"
                icon={<Mail size={18} />}
                value={isLogin ? loginForm.email : signupForm.email}
                onChange={(event) => {
                  const value = event.target.value;
                  if (isLogin) {
                    setLoginForm((current) => ({ ...current, email: value }));
                  } else {
                    setSignupForm((current) => ({ ...current, email: value }));
                  }
                }}
                autoComplete="email"
                required
              />
              <Field
                name="password"
                type="password"
                label="Password"
                placeholder={isLogin ? "Enter your password" : "Create a strong password"}
                icon={<Lock size={18} />}
                value={isLogin ? loginForm.password : signupForm.password}
                onChange={(event) => {
                  const value = event.target.value;
                  if (isLogin) {
                    setLoginForm((current) => ({ ...current, password: value }));
                  } else {
                    setSignupForm((current) => ({ ...current, password: value }));
                  }
                }}
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
              />
            </motion.div>

            <motion.div variants={itemMotion} className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <label className="inline-flex cursor-pointer items-center gap-3 text-slate-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                Keep me signed in on this device
              </label>
              {isLogin && (
                <button type="button" className="font-medium text-primary transition hover:text-primary/80">
                  Need help?
                </button>
              )}
            </motion.div>

            <motion.button
              type="submit"
              variants={itemMotion}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.99 }}
              disabled={isSubmitting}
              className="button-glow flex h-14 w-full items-center justify-center rounded-2xl bg-[image:var(--gradient-primary)] px-5 text-base font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  {header.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </motion.button>

            <motion.div variants={itemMotion} className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Or continue with</span>
              </div>
            </motion.div>

            <motion.div variants={itemMotion} className="space-y-3">
              <div
                ref={googleButtonRef}
                className={cn(
                  "min-h-[44px] w-full flex items-center justify-center",
                  !googleClientId || !isGoogleReady ? "opacity-0" : "opacity-100",
                )}
              />
              {!googleClientId && (
                <p className="text-center text-xs text-slate-500">
                  Add `VITE_GOOGLE_CLIENT_ID` in the frontend environment to enable Google OAuth.
                </p>
              )}
            </motion.div>

            <motion.div variants={itemMotion} className="rounded-[1.4rem] bg-slate-950 px-5 py-4 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">{header.switchLabel}</p>
              <div className="mt-2 flex items-center justify-between gap-4">
                <p className="text-sm text-slate-300">
                  {isLogin ? "New to SETU? Create your space and start from your resume." : "Already building momentum here? Jump back into your workspace."}
                </p>
                <button
                  type="button"
                  onClick={() => setMode(isLogin ? "signup" : "login")}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  {header.switchAction}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </motion.form>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AuthModal;
