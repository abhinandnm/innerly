import React, { useState } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { UserProfile } from "../types";
import { InnerlySparkle } from "./InnerlyLogo";
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  User,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface AuthModalProps {
  onSuccess?: (user: UserProfile) => void;
}

type AuthMode = "google" | "email_signin" | "email_signup";

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [authMode, setAuthMode] = useState<AuthMode>("email_signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ title: string; message: string; code?: string } | null>(null);

  const handleStartLocalSession = () => {
    const profile: UserProfile = {
      uid: "local_journal_owner",
      email: "private@journal.local",
      displayName: "Private Journal Owner",
      photoURL: null,
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("life_graph_local_user", JSON.stringify(profile));
    }
    if (onSuccess) {
      onSuccess(profile);
    } else {
      window.location.reload();
    }
  };

  const handleGuestLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInAnonymously(auth);
    } catch (err: unknown) {
      console.error("Guest authentication error:", err);
      const msg = err instanceof Error ? err.message : "Guest authentication failed";
      setError({
        title: "Guest Sign In Notice",
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError({
        title: "Missing Information",
        message: "Please provide both an email address and password.",
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      if (authMode === "email_signup") {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim() && cred.user) {
          await updateProfile(cred.user, { displayName: displayName.trim() });
        }
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err: unknown) {
      console.error("Email auth error:", err);
      const rawMsg = err instanceof Error ? err.message : String(err);
      let title = authMode === "email_signup" ? "Account Creation Notice" : "Sign In Notice";
      let message = rawMsg;

      if (rawMsg.includes("auth/user-not-found") || rawMsg.includes("auth/invalid-credential")) {
        message = "Incorrect email or password. If you don't have an account yet, click 'Create Account' below.";
      } else if (rawMsg.includes("auth/wrong-password")) {
        message = "Incorrect password. Please verify and try again.";
      } else if (rawMsg.includes("auth/email-already-in-use")) {
        message = "An account with this email already exists. Please switch to Sign In.";
      } else if (rawMsg.includes("auth/weak-password")) {
        message = "Password should be at least 6 characters long.";
      } else if (rawMsg.includes("auth/invalid-email")) {
        message = "Please enter a valid email address.";
      }

      setError({
        title,
        message,
        code: rawMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      console.warn("Google popup authentication notice:", err);
      const rawMsg = err instanceof Error ? err.message : String(err);

      let title = "Google Sign In Notice";
      let friendlyMsg = rawMsg;

      if (rawMsg.includes("auth/popup-blocked")) {
        title = "Popup Window Blocked";
        friendlyMsg = "Your browser blocked the Google popup window. Please allow popups, or use Email & Password below.";
      } else if (rawMsg.includes("auth/unauthorized-domain")) {
        title = "Domain Not Whitelisted in Firebase";
        friendlyMsg = `The domain (${typeof window !== "undefined" ? window.location.hostname : "host"}) is not yet in Firebase Console > Authentication > Settings > Authorized domains. Please use Email/Password sign-in below, which works on any domain.`;
      } else if (rawMsg.includes("auth/popup-closed-by-user")) {
        title = "Sign In Cancelled";
        friendlyMsg = "The sign-in window was closed before completing authentication.";
      }

      setError({
        title,
        message: friendlyMsg,
        code: rawMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#131314] flex items-center justify-center p-4 text-[#e3e3e3] selection:bg-indigo-500/30">
      <div className="max-w-md w-full bg-[#1e1f20] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#282a2c] border border-white/10 mb-1 shadow-md">
            <InnerlySparkle className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-normal tracking-tight text-[#e3e3e3]">
            Welcome to Innerly
          </h1>
          <p className="text-[#8e918f] text-sm leading-relaxed max-w-sm mx-auto">
            A quiet, personal space to talk about your life, reflect on your goals, and make sense of your thoughts over time.
          </p>
        </div>

        {/* Error / Status Notice */}
        {error && (
          <div className="p-3.5 bg-amber-950/40 border border-amber-900/50 rounded-xl flex items-start gap-2.5 text-amber-300 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div className="space-y-1">
              <div className="font-semibold text-amber-200">{error.title}</div>
              <p className="text-slate-300 text-[12px]">{error.message}</p>
              {error.code && error.code !== error.message && (
                <p className="text-[10px] font-mono text-amber-400/70 pt-0.5 break-all">
                  {error.code}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Auth Method Tabs */}
        <div className="flex bg-[#131314] p-1 rounded-xl border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => {
              setAuthMode("email_signin");
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg font-medium transition cursor-pointer ${
              authMode === "email_signin"
                ? "bg-[#282a2c] text-white shadow-sm"
                : "text-[#8e918f] hover:text-[#e3e3e3]"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("email_signup");
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg font-medium transition cursor-pointer ${
              authMode === "email_signup"
                ? "bg-[#282a2c] text-white shadow-sm"
                : "text-[#8e918f] hover:text-[#e3e3e3]"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Email / Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          {authMode === "email_signup" && (
            <div>
              <label className="block text-[11px] font-medium text-[#8e918f] mb-1">
                Your Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#8e918f] absolute left-3 top-3" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Maya"
                  className="w-full bg-[#131314] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-[#e3e3e3] placeholder-[#8e918f]/50 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-[#8e918f] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8e918f] absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#131314] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-[#e3e3e3] placeholder-[#8e918f]/50 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#8e918f] mb-1">
              Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#8e918f] absolute left-3 top-3" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#131314] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-[#e3e3e3] placeholder-[#8e918f]/50 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          <button
            id="btn-submit-email-auth"
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-slate-200 text-black rounded-xl font-medium text-sm shadow-md transition transform active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {authMode === "email_signup"
                    ? "Create Account & Start"
                    : "Sign In with Email"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-white/10 w-full" />
          <span className="bg-[#1e1f20] px-3 text-[11px] text-[#8e918f] uppercase tracking-wider font-mono">
            Or continue with
          </span>
          <div className="border-t border-white/10 w-full" />
        </div>

        {/* Other sign in methods */}
        <div className="space-y-2.5">
          {/* Google Sign In */}
          <button
            id="btn-google-sign-in"
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-[#282a2c] hover:bg-[#323538] text-[#e3e3e3] hover:text-white rounded-xl font-medium text-sm border border-white/10 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>

          {/* Instant Cloud Guest Session */}
          <button
            id="btn-cloud-guest-sign-in"
            type="button"
            onClick={handleGuestLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#282a2c]/60 hover:bg-[#282a2c] text-[#8e918f] hover:text-[#e3e3e3] rounded-xl text-xs border border-white/5 transition cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Instant Cloud Guest Session (No account needed)</span>
          </button>

          {/* Tertiary CTA: Start Local Private Session */}
          <button
            id="btn-start-local-session"
            type="button"
            onClick={handleStartLocalSession}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs text-[#8e918f] hover:text-[#e3e3e3] transition cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Use Offline Local Mode</span>
          </button>
        </div>

        {/* Privacy reassurance footer */}
        <div className="pt-2 border-t border-white/5 text-center">
          <p className="text-[12px] text-[#8e918f] leading-relaxed">
            Your entries are private, encrypted, and isolated to your account.
          </p>
        </div>
      </div>
    </div>
  );
};

