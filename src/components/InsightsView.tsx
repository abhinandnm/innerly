import React, { useState, useEffect, useMemo } from "react";
import { UserProfile, LifeGraphMemory, LifeGraphInsight } from "../types";
import { getEffectiveAuthToken } from "../lib/firebase";
import { subscribeMemories, subscribeInsights, saveInsight } from "../lib/dataStore";
import {
  Lightbulb,
  Sparkles,
  Target,
  AlertOctagon,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Layers,
  Flame,
  Clock,
  ArrowRight,
} from "lucide-react";

interface InsightsViewProps {
  user: UserProfile;
  onNewReflection: () => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({ user, onNewReflection }) => {
  const [memories, setMemories] = useState<LifeGraphMemory[]>([]);
  const [insights, setInsights] = useState<LifeGraphInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to user memories
  useEffect(() => {
    if (!user.uid) return;
    const unsubscribe = subscribeMemories(
      user.uid,
      (items) => {
        setMemories(items);
      },
      (err) => {
        console.warn("Memories subscription warning:", err);
      }
    );

    return () => unsubscribe();
  }, [user.uid]);

  // Subscribe to user insights
  useEffect(() => {
    if (!user.uid) return;
    const unsubscribe = subscribeInsights(
      user.uid,
      (items) => {
        setInsights(items);
      },
      (err) => {
        console.warn("Insights subscription warning:", err);
      }
    );

    return () => unsubscribe();
  }, [user.uid]);

  // Compute stats
  const stats = useMemo(() => {
    const goals = memories.filter((m) => m.type === "goal");
    const activeGoals = goals.filter((g) => g.status === "active").length;
    const blockers = memories.filter((m) => m.type === "challenge").length;
    const progress = memories.filter((m) => m.type === "progress").length;
    return {
      total: memories.length,
      activeGoals,
      blockers,
      progress,
    };
  }, [memories]);

  // Generate / Synthesize insights from authenticated memories
  const handleSynthesizeInsights = async () => {
    if (memories.length === 0 || loading) return;
    setLoading(true);
    setError(null);

    try {
      const idToken = await getEffectiveAuthToken();
      if (!idToken) throw new Error("Auth token unavailable.");

      const memoryPayload = memories.map((m) => ({
        id: m.id,
        type: m.type,
        title: m.title,
        description: m.description,
        status: m.status,
        createdAt: m.createdAt,
      }));

      const res = await fetch("/api/insights/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ memories: memoryPayload }),
      });

      if (!res.ok) {
        throw new Error(`Failed with status ${res.status}`);
      }

      const data = await res.json();
      if (Array.isArray(data.insights)) {
        for (const ins of data.insights) {
          await saveInsight(user.uid, {
            category: ins.category || "repeated_goals",
            title: ins.title,
            summary: ins.summary,
            evidence: ins.evidence || [],
            occurrenceCount: ins.occurrenceCount || 1,
          });
        }
      }
    } catch (err: unknown) {
      console.error("Insight synthesis error:", err);
      const msg = err instanceof Error ? err.message : "Failed to synthesize insights.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-800/90 bg-slate-900/60 backdrop-blur flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-medium text-white tracking-tight flex items-center gap-2">
              <span>Personal Insights</span>
              {insights.length > 0 && (
                <span className="text-xs font-mono text-amber-300 bg-amber-950/60 border border-amber-900 px-2 py-0.5 rounded-full">
                  {insights.length} {insights.length === 1 ? "pattern" : "patterns"}
                </span>
              )}
            </h2>
            <p className="text-xs text-[#8e918f]">
              Patterns, themes, and reflections synthesized across your journal entries.
            </p>
          </div>
        </div>

        <button
          id="btn-synthesize-insights"
          onClick={handleSynthesizeInsights}
          disabled={loading || memories.length === 0}
          className="flex items-center gap-2 bg-[#1e1f20] hover:bg-[#282a2c] border border-white/10 text-[#e3e3e3] text-xs font-medium py-2 px-4 rounded-full transition shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-400" : ""}`} />
          <span>{loading ? "Discovering patterns..." : "Find New Insights"}</span>
        </button>
      </header>

      <div className="max-w-5xl mx-auto w-full p-4 sm:p-6 space-y-6 pb-24 md:pb-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>LifeGraph Entities</span>
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-[10px] text-slate-500">Extracted from journal</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Active Goals</span>
              <Target className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">{stats.activeGoals}</div>
            <div className="text-[10px] text-slate-500">In current focus</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Recorded Challenges</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-rose-400">{stats.blockers}</div>
            <div className="text-[10px] text-slate-500">Blockers identified</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Milestones Hit</span>
              <TrendingUp className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-2xl font-bold text-teal-400">{stats.progress}</div>
            <div className="text-[10px] text-slate-500">Progress recorded</div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="p-4 bg-rose-950/40 border border-rose-900 rounded-2xl text-rose-300 text-xs flex items-center gap-3">
            <span>{error}</span>
          </div>
        )}

        {/* Longitudinal Patterns Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Evidence-Backed Insights</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Factual citations • Zero AI fabrication
            </span>
          </div>

          {insights.length === 0 ? (
            <div className="p-8 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl text-center space-y-3 text-slate-400">
              <Lightbulb className="w-8 h-8 mx-auto text-slate-500" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">No longitudinal patterns synthesized yet</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  As you record reflections and milestones, click &quot;Synthesize Longitudinal Insights&quot; to uncover
                  recurring blockers, priority shifts, and goal momentum.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSynthesizeInsights}
                  disabled={loading || memories.length === 0}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold py-2 px-4 rounded-xl transition shadow"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Synthesize from {memories.length} Memories</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((ins) => (
                <div
                  key={ins.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 hover:border-slate-750 transition flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase bg-amber-950/40 text-amber-300 border border-amber-900/60 px-2 py-0.5 rounded-full">
                        {ins.category.replace("_", " ")}
                      </span>
                      {ins.occurrenceCount > 1 && (
                        <span className="text-[11px] font-mono text-indigo-300 flex items-center gap-1 bg-indigo-950/40 border border-indigo-900/40 px-2 py-0.5 rounded-full">
                          <Flame className="w-3 h-3 text-amber-400" />
                          {ins.occurrenceCount} Occurrences
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-white">{ins.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                      {ins.summary}
                    </p>
                  </div>

                  {ins.evidence.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Cited Evidence Points:
                      </span>
                      <ul className="space-y-1 text-[11px] text-slate-400">
                        {ins.evidence.map((ev, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{ev}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
