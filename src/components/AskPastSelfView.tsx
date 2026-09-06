import React, { useState, useEffect } from "react";
import { UserProfile, LifeGraphMemory, PastSelfResponse } from "../types";
import { getEffectiveAuthToken } from "../lib/firebase";
import { subscribeMemories } from "../lib/dataStore";
import { EntryMarkdown } from "./EntryMarkdown";
import {
  Hourglass,
  Sparkles,
  Send,
  HelpCircle,
  Calendar,
  AlertTriangle,
  Quote,
  ShieldCheck,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Clock,
} from "lucide-react";

interface AskPastSelfViewProps {
  user: UserProfile;
  onNavigateToChat: (chatId: string) => void;
  onNewReflection: () => void;
}

const CURATED_QUESTIONS = [
  "What goals have I set recently?",
  "Which goals or projects have I repeatedly postponed?",
  "What are my biggest recurring blockers?",
  "How has my thinking about my projects changed?",
  "What commitments have I made but not completed?",
  "Have I struggled with time management or overwhelm before?",
  "What progress have I celebrated recently?",
];

export const AskPastSelfView: React.FC<AskPastSelfViewProps> = ({
  user,
  onNavigateToChat,
  onNewReflection,
}) => {
  const [memories, setMemories] = useState<LifeGraphMemory[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<PastSelfResponse | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to user memories
  useEffect(() => {
    if (!user.uid) return;

    const unsubscribe = subscribeMemories(
      user.uid,
      (list) => {
        setMemories(list);
      },
      (err) => {
        console.warn("Memories subscription warning:", err);
      }
    );

    return () => unsubscribe();
  }, [user.uid]);

  const handleAskQuestion = async (selectedQuestion?: string) => {
    const q = (selectedQuestion || question).trim();
    if (!q || loading) return;

    setError(null);
    setLoading(true);
    setLastQuestion(q);
    if (!selectedQuestion) setQuestion("");

    try {
      const idToken = await getEffectiveAuthToken();
      if (!idToken) throw new Error("Authentication token unavailable.");

      const memoryPayload = memories.map((m) => ({
        id: m.id,
        type: m.type,
        title: m.title,
        description: m.description,
        status: m.status,
        sourceChatId: m.sourceChatId,
        createdAt: m.createdAt,
      }));

      const res = await fetch("/api/ask-past-self", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          question: q,
          memories: memoryPayload,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Query failed with status ${res.status}`);
      }

      const data: PastSelfResponse = await res.json();
      setResponse(data);
    } catch (err: unknown) {
      console.error("Past Self error:", err);
      const msg = err instanceof Error ? err.message : "Failed to query past memories.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-slate-800/90 bg-slate-900/60 backdrop-blur flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Hourglass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-medium text-white tracking-tight flex items-center gap-2">
              <span>Ask Your Past Self</span>
            </h2>
            <p className="text-xs text-[#8e918f]">
              Rediscover your past thoughts, goals, recurring challenges, and decisions.
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 pb-24 md:pb-8">
        {/* Search / Ask Box */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskQuestion();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <input
                id="input-ask-past-self"
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask anything about your past thoughts, goals, recurring blockers..."
                disabled={loading}
                className="w-full bg-slate-950 border border-slate-750 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
              />
            </div>

            <button
              id="btn-submit-past-self"
              type="submit"
              disabled={loading || question.trim().length === 0}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-3 rounded-xl transition flex items-center gap-2 shadow-lg shadow-indigo-600/25"
            >
              {loading ? (
                <Sparkles className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Ask Past Self</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Prompts */}
          <div className="space-y-2 pt-1 border-t border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              Suggested Introspection Questions
            </span>

            <div className="flex flex-wrap gap-2">
              {CURATED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAskQuestion(q)}
                  disabled={loading}
                  className="text-xs bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-indigo-500/50 rounded-xl px-3 py-1.5 transition text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="p-4 bg-rose-950/40 border border-rose-900 rounded-2xl text-rose-300 text-xs flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-2xl text-center space-y-3 animate-pulse">
            <Sparkles className="w-7 h-7 text-indigo-400 mx-auto animate-spin" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">Scanning Your Private Journal History...</p>
              <p className="text-xs text-slate-400">
                Evaluating {memories.length} authenticated memories for factual citations and patterns.
              </p>
            </div>
          </div>
        )}

        {/* Answer Display */}
        {response && !loading && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3">
            {/* Question Echo & Evidence Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium">
                  <Clock className="w-4 h-4" />
                  <span>Historical Analysis for: &quot;{lastQuestion}&quot;</span>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="text-slate-400">Source:</span>
                  <span className="text-amber-300 bg-amber-950/30 border border-amber-900/40 px-2 py-0.5 rounded">
                    {response.secretSource}
                  </span>
                </div>
              </div>

              {/* Insufficient Evidence Warning Banner */}
              {!response.hasSufficientEvidence && (
                <div className="p-3.5 bg-amber-950/30 border border-amber-900/60 rounded-xl flex items-start gap-3 text-amber-200 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-amber-100">Limited Historical Records Found</div>
                    <p className="text-amber-300/80 mt-0.5">
                      Innerly did not find sufficient diary entries to make a definitive factual claim.
                      To preserve zero fabrication, only direct evidence from your records is presented.
                    </p>
                  </div>
                </div>
              )}

              {/* Markdown Answer */}
              <div className="text-sm leading-relaxed text-slate-200">
                <EntryMarkdown content={response.answer} />
              </div>
            </div>

            {/* Evidence Citations Panel */}
            {response.evidence.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Quote className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Supporting Journal Evidence ({response.evidence.length})</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">Verified Authenticated Data</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {response.evidence.map((ev, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2 hover:border-slate-750 transition"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200 truncate">{ev.title}</span>
                        {ev.date && (
                          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {ev.date}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80 italic">
                        &quot;{ev.snippet}&quot;
                      </p>

                      {ev.sourceChatId && (
                        <button
                          onClick={() => onNavigateToChat(ev.sourceChatId!)}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition pt-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View Original Conversation</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state prompt */}
        {!response && !loading && (
          <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center space-y-3 text-slate-400">
            <BookOpen className="w-8 h-8 mx-auto text-slate-500" />
            <p className="text-sm font-semibold text-slate-300">
              Ask your past self anything about what you&apos;ve written
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Innerly analyzes your isolated journal records to uncover past commitments, recurring hurdles, and
              longitudinal evolution.
            </p>
            {memories.length === 0 && (
              <div className="pt-2">
                <button
                  onClick={onNewReflection}
                  className="inline-flex items-center gap-2 text-xs bg-slate-900 hover:bg-slate-850 text-indigo-300 border border-slate-750 px-4 py-2 rounded-xl transition"
                >
                  <span>Write a Reflection in Journal First</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
