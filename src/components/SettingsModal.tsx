import React, { useState } from "react";
import { UserProfile } from "../types";
import { clearAllUserData } from "../lib/dataStore";
import { logoutUser, signInWithGoogle, auth } from "../lib/firebase";
import {
  X,
  Trash2,
  LogOut,
  CheckCircle2,
  FileText,
  FileJson,
  AlertTriangle,
  Lock,
  Shield,
  EyeOff,
  Check,
} from "lucide-react";

interface SettingsModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = "account" | "preferences" | "data";

export const SettingsModal: React.FC<SettingsModalProps> = ({
  user,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  // Preference: AI reflection style
  const [reflectionStyle, setReflectionStyle] = useState<string>(() => {
    return localStorage.getItem("innerly_reflection_style") || "empathetic";
  });

  if (!isOpen) return null;

  const displayName = user.displayName || "ABHINAND N.M";

  const isGoogleUser = auth.currentUser !== null;

  const handleSignInGoogle = async () => {
    try {
      setSigningIn(true);
      await signInWithGoogle();
      setFeedback("Successfully signed in with Google.");
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: unknown) {
      console.warn("Google sign-in notice:", err);
      const msg = err instanceof Error ? err.message : "Sign-in failed";
      setFeedback(msg);
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setSigningIn(false);
    }
  };

  const handleSetStyle = (style: string) => {
    setReflectionStyle(style);
    localStorage.setItem("innerly_reflection_style", style);
    setFeedback("Reflection style updated.");
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleExportData = (format: "json" | "markdown") => {
    try {
      setExporting(true);
      const chatsRaw = localStorage.getItem("lifegraph_chats") || "[]";
      const messagesRaw = localStorage.getItem("lifegraph_messages") || "{}";
      const memoriesRaw = localStorage.getItem("lifegraph_memories") || "[]";
      const insightsRaw = localStorage.getItem("lifegraph_insights") || "[]";

      const chats = JSON.parse(chatsRaw);
      const messages = JSON.parse(messagesRaw);
      const memories = JSON.parse(memoriesRaw);
      const insights = JSON.parse(insightsRaw);

      let content: string;
      let filename: string;
      let mimeType: string;

      const dateStr = new Date().toISOString().split("T")[0];

      if (format === "json") {
        const payload = {
          appName: "Innerly Journal",
          user: { uid: user.uid, displayName, email: user.email },
          exportedAt: new Date().toISOString(),
          chats,
          messages,
          memories,
          insights,
        };
        content = JSON.stringify(payload, null, 2);
        filename = `innerly-journal-export-${dateStr}.json`;
        mimeType = "application/json";
      } else {
        // Markdown format
        let md = `# Innerly Personal Journal Archive\n`;
        md += `*Exported on ${new Date().toLocaleDateString()} for ${displayName}*\n\n---\n\n`;

        md += `## Journal Conversations\n\n`;
        if (Array.isArray(chats) && chats.length > 0) {
          chats.forEach((chat: { id: string; title: string; createdAt?: string }) => {
            md += `### ${chat.title}\n\n`;
            const chatMsgs = messages[chat.id] || [];
            chatMsgs.forEach((m: { role: string; content: string; timestamp?: string }) => {
              const roleName = m.role === "user" ? "You" : "Innerly";
              md += `**${roleName}**: ${m.content}\n\n`;
            });
            md += `\n---\n\n`;
          });
        } else {
          md += `*No conversations recorded.*\n\n`;
        }

        md += `## Extracted Memories & Goals\n\n`;
        if (Array.isArray(memories) && memories.length > 0) {
          memories.forEach((mem: { type: string; title: string; description: string; status: string }) => {
            md += `- **[${mem.type.toUpperCase()}] ${mem.title}** (${mem.status}): ${mem.description}\n`;
          });
          md += `\n`;
        }

        content = md;
        filename = `innerly-journal-export-${dateStr}.md`;
        mimeType = "text/markdown";
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setFeedback(`Journal successfully exported (${format.toUpperCase()}).`);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      console.error("Export error:", err);
      setFeedback("Failed to compile export data.");
    } finally {
      setExporting(false);
    }
  };

  const handleClearInsights = () => {
    localStorage.removeItem("lifegraph_insights");
    setFeedback("Derived insights cleared. Your journal entries remain intact.");
    setTimeout(() => {
      setFeedback(null);
      window.location.reload();
    }, 1200);
  };

  const handleConfirmWipe = async () => {
    try {
      setClearing(true);
      await clearAllUserData(user.uid);
      setConfirmDeleteOpen(false);
      onClose();
      window.location.reload();
    } catch (err) {
      console.error("Clear error:", err);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in select-none">
      <div className="bg-[#1e1f20] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <h2 className="text-base font-medium text-[#e3e3e3] tracking-tight">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#c4c7c5] hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Pill Row */}
        <div className="px-6 pt-3 pb-1 border-b border-white/5 flex items-center gap-1.5 text-xs shrink-0">
          <button
            onClick={() => setActiveTab("account")}
            className={`px-3.5 py-1.5 rounded-full transition font-medium ${
              activeTab === "account"
                ? "bg-white text-black"
                : "text-[#c4c7c5] hover:text-white hover:bg-white/5"
            }`}
          >
            Account
          </button>
          <button
            onClick={() => setActiveTab("preferences")}
            className={`px-3.5 py-1.5 rounded-full transition font-medium ${
              activeTab === "preferences"
                ? "bg-white text-black"
                : "text-[#c4c7c5] hover:text-white hover:bg-white/5"
            }`}
          >
            Preferences
          </button>
          <button
            onClick={() => setActiveTab("data")}
            className={`px-3.5 py-1.5 rounded-full transition font-medium ${
              activeTab === "data"
                ? "bg-white text-black"
                : "text-[#c4c7c5] hover:text-white hover:bg-white/5"
            }`}
          >
            Data & Privacy
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar text-xs">
          {/* Feedback banner */}
          {feedback && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* TAB 1: ACCOUNT */}
          {activeTab === "account" && (
            <div className="space-y-5">
              <div className="bg-[#18191b] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Avatar"
                      className="w-12 h-12 rounded-full border border-white/10 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#a35136] text-white flex items-center justify-center font-medium text-base">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium text-[#e3e3e3]">{displayName}</div>
                    <div className="text-[#8e918f]">{user.email || "Private Journal"}</div>
                    <div className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{isGoogleUser ? "Signed in with Google" : "Private Session"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  {!isGoogleUser && (
                    <button
                      onClick={handleSignInGoogle}
                      disabled={signingIn}
                      className="px-3.5 py-2 rounded-full bg-white hover:bg-slate-200 text-black transition flex items-center gap-2 font-medium text-xs disabled:opacity-50"
                    >
                      {signingIn ? (
                        <div className="w-3.5 h-3.5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                      <span>{signingIn ? "Signing in..." : "Sign in with Google"}</span>
                    </button>
                  )}

                  <button
                    onClick={async () => {
                      await logoutUser();
                      onClose();
                    }}
                    className="px-3.5 py-2 rounded-full bg-[#282a2c] hover:bg-[#323538] text-rose-300 hover:text-rose-200 border border-white/5 transition flex items-center gap-1.5 font-medium text-xs cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>

              <div className="text-[#8e918f] leading-relaxed px-1">
                <p>
                  {isGoogleUser
                    ? "Your journal is connected to your Google Account. Your entries, thoughts, and reflections are securely linked to your account."
                    : "You are currently in a private local session. Sign in with Google anytime to back up your journal."}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: PREFERENCES */}
          {activeTab === "preferences" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-medium text-[#e3e3e3] mb-1">Reflection Tone</h3>
                <p className="text-[#8e918f] mb-3">
                  Choose how Innerly responds during your journaling sessions.
                </p>

                <div className="space-y-2">
                  {[
                    {
                      id: "empathetic",
                      title: "Empathetic & Reflective (Default)",
                      desc: "Gentle questioning that helps you explore feelings, boundaries, and emotional clarity.",
                    },
                    {
                      id: "structured",
                      title: "Direct & Structured",
                      desc: "Concise, organized responses focusing on action items, milestones, and blockers.",
                    },
                    {
                      id: "exploratory",
                      title: "Exploratory & Philosophical",
                      desc: "Broader perspective-taking, linking ideas, and examining underlying beliefs.",
                    },
                    {
                      id: "concise",
                      title: "Quiet & Minimalist",
                      desc: "Short responses that keep the focus entirely on your writing.",
                    },
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() => handleSetStyle(style.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition flex items-start justify-between gap-3 ${
                        reflectionStyle === style.id
                          ? "bg-[#282a2c] border-indigo-500/50 text-[#e3e3e3]"
                          : "bg-[#18191b] border-white/5 text-[#c4c7c5] hover:bg-[#202225]"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-medium text-white">{style.title}</div>
                        <div className="text-[11px] text-[#8e918f] leading-relaxed">{style.desc}</div>
                      </div>
                      {reflectionStyle === style.id && (
                        <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-white/5">
                <h3 className="text-sm font-medium text-[#e3e3e3] mb-1">Appearance</h3>
                <div className="p-3 bg-[#18191b] border border-white/5 rounded-xl flex items-center justify-between">
                  <span className="text-white">Dark Obsidian Theme</span>
                  <span className="text-[11px] text-indigo-400 font-medium">Active</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DATA & PRIVACY */}
          {activeTab === "data" && (
            <div className="space-y-5">
              {/* Privacy Promises */}
              <div>
                <h3 className="text-sm font-medium text-[#e3e3e3] mb-2">Privacy & Protection</h3>
                <div className="bg-[#18191b] border border-white/5 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <EyeOff className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-white text-[12px]">Private & Confidential</div>
                      <div className="text-[11px] text-[#8e918f] leading-relaxed">
                        Your journal entries and reflections are strictly yours. We never sell your personal data or use your journal to train public AI models.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-white text-[12px]">Encrypted & Protected</div>
                      <div className="text-[11px] text-[#8e918f] leading-relaxed">
                        All reflections and memory entries are encrypted in transit and at rest, securely linked to your account.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Shield className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-white text-[12px]">Full Data Ownership</div>
                      <div className="text-[11px] text-[#8e918f] leading-relaxed">
                        You can export your complete journal at any time, or permanently wipe all your data whenever you want.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Export Data */}
              <div>
                <h3 className="text-sm font-medium text-[#e3e3e3] mb-1">Export Your Journal</h3>
                <p className="text-[#8e918f] mb-3">
                  Download a full copy of your journal conversations and extracted goals.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleExportData("markdown")}
                    disabled={exporting}
                    className="p-3.5 rounded-xl bg-[#18191b] hover:bg-[#25272a] border border-white/5 text-left transition flex items-center gap-3"
                  >
                    <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                    <div>
                      <div className="font-medium text-white">Markdown File</div>
                      <div className="text-[10px] text-[#8e918f]">Readable document (.md)</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleExportData("json")}
                    disabled={exporting}
                    className="p-3.5 rounded-xl bg-[#18191b] hover:bg-[#25272a] border border-white/5 text-left transition flex items-center gap-3"
                  >
                    <FileJson className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-medium text-white">JSON File</div>
                      <div className="text-[10px] text-[#8e918f]">Structured backup (.json)</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="pt-3 border-t border-white/10 space-y-3">
                <h3 className="text-sm font-medium text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Data Reset</span>
                </h3>

                <div className="p-3 bg-[#18191b] border border-white/5 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-white">Reset Insights</div>
                    <div className="text-[11px] text-[#8e918f]">
                      Clears synthesized patterns while keeping all conversation records intact.
                    </div>
                  </div>
                  <button
                    onClick={handleClearInsights}
                    className="px-3 py-1.5 rounded-full bg-[#282a2c] hover:bg-[#323538] text-[#e3e3e3] border border-white/10 shrink-0 transition"
                  >
                    Reset
                  </button>
                </div>

                <div className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-rose-200">Delete All Journal Records</div>
                    <div className="text-[11px] text-rose-300/70">
                      Permanently delete all reflections, memories, and conversations.
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmDeleteOpen(true)}
                    className="px-3.5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-medium shrink-0 transition flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete data</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {confirmDeleteOpen && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-6 text-center animate-in fade-in">
            <div className="max-w-md space-y-4 bg-[#1e1f20] border border-rose-900/60 p-6 rounded-2xl shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-medium text-white">Permanently delete all journal records?</h3>
              <p className="text-xs text-[#8e918f] leading-relaxed">
                This action cannot be undone. All of your personal reflections, LifeGraph entities, and conversation history will be permanently deleted.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setConfirmDeleteOpen(false)}
                  className="px-4 py-2 rounded-full bg-[#282a2c] hover:bg-[#323538] text-[#c4c7c5] hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmWipe}
                  disabled={clearing}
                  className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-medium transition"
                >
                  {clearing ? "Deleting..." : "Yes, Delete Everything"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
