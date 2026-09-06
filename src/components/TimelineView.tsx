import React, { useState, useEffect, useMemo } from "react";
import { UserProfile, TimelineEvent, MemoryType } from "../types";
import { subscribeTimeline } from "../lib/dataStore";
import {
  Calendar,
  Clock,
  Target,
  AlertOctagon,
  TrendingUp,
  GitCommit,
  FolderGit2,
  ExternalLink,
  Filter,
  Sparkles,
  Plus,
} from "lucide-react";

interface TimelineViewProps {
  user: UserProfile;
  onNavigateToChat: (chatId: string) => void;
  onNewReflection: () => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  user,
  onNavigateToChat,
  onNewReflection,
}) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    if (!user.uid) return;

    const unsubscribe = subscribeTimeline(
      user.uid,
      (items) => {
        setEvents(items);
      },
      (err) => {
        console.warn("Timeline subscription warning:", err);
      }
    );

    return () => unsubscribe();
  }, [user.uid]);

  const filteredEvents = useMemo(() => {
    if (categoryFilter === "all") return events;
    return events.filter((e) => e.category === categoryFilter);
  }, [events, categoryFilter]);

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "goal":
        return { label: "Goal", bg: "bg-emerald-950/60 text-emerald-300 border-emerald-800/60" };
      case "challenge":
        return { label: "Challenge", bg: "bg-rose-950/60 text-rose-300 border-rose-800/60" };
      case "progress":
        return { label: "Progress", bg: "bg-teal-950/60 text-teal-300 border-teal-800/60" };
      case "decision":
        return { label: "Decision", bg: "bg-purple-950/60 text-purple-300 border-purple-800/60" };
      case "project":
        return { label: "Project", bg: "bg-sky-950/60 text-sky-300 border-sky-800/60" };
      default:
        return { label: "Journal", bg: "bg-slate-900 text-slate-300 border-slate-750" };
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-800/90 bg-slate-900/60 backdrop-blur flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-600/20 text-teal-400 border border-teal-500/30">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <span>Personal Timeline</span>
              <span className="text-xs font-mono text-teal-300 bg-teal-950/60 border border-teal-900 px-2 py-0.5 rounded-full">
                {filteredEvents.length} Milestones
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Chronological evolution of goals, decisions, breakthroughs, and challenges
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
            {["all", "goal", "challenge", "decision", "progress"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`py-1 px-2.5 rounded-lg capitalize transition font-medium ${
                  categoryFilter === cat
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto w-full p-4 sm:p-6 pb-24 md:pb-8">
        {filteredEvents.length === 0 ? (
          <div className="p-10 border border-dashed border-slate-800 rounded-2xl text-center space-y-3 text-slate-400">
            <Clock className="w-8 h-8 mx-auto text-slate-500" />
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-white">No timeline milestones yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                As you converse with Innerly, goals, decisions, and progress will populate your personal timeline
                automatically.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={onNewReflection}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 px-4 rounded-xl transition shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Write First Reflection</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-6">
            {filteredEvents.map((evt) => {
              const badge = getCategoryBadge(evt.category);
              return (
                <div key={evt.id} className="relative group">
                  {/* Timeline Dot */}
                  <span className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-indigo-500 group-hover:bg-indigo-500 transition" />

                  {/* Event Card */}
                  <div className="bg-slate-900/80 border border-slate-800 group-hover:border-slate-700/80 rounded-2xl p-4 shadow-xl transition space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${badge.bg}`}
                        >
                          {badge.label}
                        </span>
                        <h4 className="text-sm font-bold text-white">{evt.title}</h4>
                      </div>

                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {new Date(evt.timestamp).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                      {evt.description}
                    </p>

                    {evt.sourceChatId && (
                      <div className="pt-1 flex justify-end">
                        <button
                          onClick={() => onNavigateToChat(evt.sourceChatId!)}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View Journal Conversation</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
