import React, { useState } from "react";
import { signInWithGoogle, createLocalSession } from "../lib/firebase";
import { UserProfile } from "../types";
import { InnerlySparkle } from "./InnerlyLogo";
import {
  ShieldCheck,
  Lock,
  Sparkles,
  AlertCircle,
  ArrowRight,
  UserCheck,
  KeyRound,
  EyeOff,
  Database,
  CheckCircle2,
} from "lucide-react";

interface AuthModalProps {
  onSuccess?: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartLocalSession = () => {
    const profile = createLocalSession();
    if (onSuccess) {
      onSuccess(profile);
    } else {
      window.location.reload();
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (err: unknown) {
      console.warn("Google popup authentication notice:", err);
      const msg = err instanceof Error ? err.message : "Authentication notice";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const isInternalError =
    error &&
    (error.includes("auth/internal-error") ||
      error.includes("auth/unauthorized-domain") ||
      error.includes("auth/popup-blocked") ||
      error.includes("auth/network-request-failed"));

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

        {/* Notice if Google popup had an error in iframe */}
        {error && (
          <div className="space-y-3">
            <div className="p-3 bg-amber-950/40 border border-amber-900/50 rounded-xl flex items-start gap-2.5 text-amber-300 text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div className="space-y-1">
                <div className="font-semibold text-amber-200">
                  {isInternalError ? "Notice" : "Sign In Notice"}
                </div>
                <p className="text-slate-300 text-[11px]">
                  {isInternalError
                    ? "In this preview environment, you can start journaling immediately with your private local session."
                    : error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-1">
          {/* Primary CTA: Start Journaling */}
          <button
            id="btn-start-local-session"
            type="button"
            onClick={handleStartLocalSession}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 bg-white hover:bg-slate-200 text-black rounded-xl font-medium text-sm shadow-lg transition transform active:scale-[0.98] cursor-pointer"
          >
            <span>Start Journaling</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Secondary CTA: Sign in with Google */}
          <button
            id="btn-google-sign-in"
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-[#282a2c] hover:bg-[#323538] text-[#e3e3e3] hover:text-white rounded-xl font-medium text-sm border border-white/10 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            ) : (
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
            )}
            <span>{loading ? "Signing in..." : "Sign in with Google"}</span>
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
