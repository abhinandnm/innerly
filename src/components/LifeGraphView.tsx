import React, { useState, useEffect, useMemo, useRef } from "react";
import { UserProfile, LifeGraphMemory, MemoryType, MemoryStatus } from "../types";
import { subscribeMemories, updateMemoryStatus, deleteMemory } from "../lib/dataStore";
import {
  Network,
  Target,
  FolderGit2,
  Lightbulb,
  AlertOctagon,
  GitCommit,
  CheckSquare,
  TrendingUp,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  X,
  Plus,
} from "lucide-react";

interface LifeGraphViewProps {
  user: UserProfile;
  onNavigateToChat: (chatId: string) => void;
  onNewReflection: () => void;
}

const TYPE_CONFIG: Record<
  MemoryType,
  { label: string; color: string; bg: string; border: string; dot: string; icon: React.FC<{ className?: string }> }
> = {
  goal: {
    label: "Goal",
    color: "text-emerald-400",
    bg: "bg-emerald-950/60",
    border: "border-emerald-500/50",
    dot: "bg-emerald-400",
    icon: Target,
  },
  project: {
    label: "Project",
    color: "text-sky-400",
    bg: "bg-sky-950/60",
    border: "border-sky-500/50",
    dot: "bg-sky-400",
    icon: FolderGit2,
  },
  idea: {
    label: "Idea",
    color: "text-amber-400",
    bg: "bg-amber-950/60",
    border: "border-amber-500/50",
    dot: "bg-amber-400",
    icon: Lightbulb,
  },
  challenge: {
    label: "Challenge",
    color: "text-rose-400",
    bg: "bg-rose-950/60",
    border: "border-rose-500/50",
    dot: "bg-rose-400",
    icon: AlertOctagon,
  },
  decision: {
    label: "Decision",
    color: "text-purple-400",
    bg: "bg-purple-950/60",
    border: "border-purple-500/50",
    dot: "bg-purple-400",
    icon: GitCommit,
  },
  action: {
    label: "Action",
    color: "text-indigo-400",
    bg: "bg-indigo-950/60",
    border: "border-indigo-500/50",
    dot: "bg-indigo-400",
    icon: CheckSquare,
  },
  progress: {
    label: "Progress",
    color: "text-teal-400",
    bg: "bg-teal-950/60",
    border: "border-teal-500/50",
    dot: "bg-teal-400",
    icon: TrendingUp,
  },
  theme: {
    label: "Theme",
    color: "text-slate-300",
    bg: "bg-slate-900",
    border: "border-slate-600",
    dot: "bg-slate-400",
    icon: Sparkles,
  },
};

const FILTER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "goal", label: "Goals" },
  { id: "project", label: "Projects" },
  { id: "challenge", label: "Challenges" },
  { id: "decision", label: "Decisions" },
  { id: "action", label: "Actions" },
  { id: "progress", label: "Progress" },
  { id: "idea", label: "Ideas" },
];

export const LifeGraphView: React.FC<LifeGraphViewProps> = ({
  user,
  onNavigateToChat,
  onNewReflection,
}) => {
  const [memories, setMemories] = useState<LifeGraphMemory[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Subscribe to user's LifeGraph memories
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

  // Filtered nodes
  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      const matchesType = filterType === "all" || m.type === filterType;
      const matchesSearch =
        searchQuery.trim().length === 0 ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [memories, filterType, searchQuery]);

  // Compute node layout coordinates based on clustered golden-angle spiral
  const layoutNodes = useMemo(() => {
    const nodes = filteredMemories;
    const count = nodes.length;
    if (count === 0) return [];

    const centerX = 500;
    const centerY = 350;
    const radiusBase = Math.min(300, 100 + count * 22);

    return nodes.map((node, index) => {
      const angle = index * (Math.PI * (3 - Math.sqrt(5)));
      const dist = Math.sqrt(index + 1) * (radiusBase / Math.sqrt(count + 1));
      const x = centerX + Math.cos(angle) * dist;
      const y = centerY + Math.sin(angle) * dist;
      return { ...node, x, y };
    });
  }, [filteredMemories]);

  // Generate relationship edges between nodes
  const edges = useMemo(() => {
    const result: Array<{ id: string; from: { x: number; y: number; id: string }; to: { x: number; y: number; id: string } }> = [];

    for (let i = 0; i < layoutNodes.length; i++) {
      const n1 = layoutNodes[i];
      for (let j = i + 1; j < layoutNodes.length; j++) {
        const n2 = layoutNodes[j];
        const sameChat = n1.sourceChatId && n2.sourceChatId && n1.sourceChatId === n2.sourceChatId;
        const sequentialLink =
          (n1.type === "goal" && n2.type === "project") ||
          (n1.type === "project" && n2.type === "challenge") ||
          (n1.type === "challenge" && n2.type === "action") ||
          (n1.type === "action" && n2.type === "progress") ||
          (n1.type === "idea" && n2.type === "decision");

        if (sameChat || sequentialLink) {
          result.push({
            id: `${n1.id}->${n2.id}`,
            from: { x: n1.x, y: n1.y, id: n1.id },
            to: { x: n2.x, y: n2.y, id: n2.id },
          });
        }
      }
    }
    return result;
  }, [layoutNodes]);

  // Selected node details
  const selectedNode = useMemo(() => {
    return memories.find((m) => m.id === selectedNodeId) || null;
  }, [memories, selectedNodeId]);

  // Mouse Pan controls
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName !== "circle" && (e.target as HTMLElement).tagName !== "text") {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Pan controls
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX - pan.x, y: touch.clientY - pan.y };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setPan({
        x: touch.clientX - touchStartRef.current.x,
        y: touch.clientY - touchStartRef.current.y,
      });
    }
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNodeId(null);
  };

  const handleStatusChange = async (newStatus: MemoryStatus) => {
    if (!selectedNode) return;
    await updateMemoryStatus(user.uid, selectedNode.id, newStatus);
  };

  const handleDelete = async () => {
    if (!selectedNode) return;
    if (confirm(`Delete memory "${selectedNode.title}"?`)) {
      await deleteMemory(user.uid, selectedNode.id);
      setSelectedNodeId(null);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden relative select-none">
      {/* Top Toolbar */}
      <header className="px-4 sm:px-6 py-3 border-b border-slate-800/90 bg-slate-900/70 backdrop-blur flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-10 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-white tracking-tight flex items-center gap-2">
                <span>Personal LifeGraph</span>
                <span className="text-xs font-mono text-indigo-300 bg-indigo-950/60 border border-indigo-900 px-2 py-0.5 rounded-full">
                  {memories.length} {memories.length === 1 ? "thought & goal" : "thoughts & goals"}
                </span>
              </h2>
            </div>
          </div>

          {/* Canvas Zoom Controls */}
          <div className="flex sm:hidden items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search LifeGraph..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-44 bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500"
            />
          </div>

          {/* Desktop Zoom Controls */}
          <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              title="Reset Canvas View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Horizontal Filter Chips Bar */}
      <div className="px-4 sm:px-6 py-2 border-b border-slate-800/60 bg-slate-900/40 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0 z-10">
        <Filter className="w-3 h-3 text-slate-500 shrink-0 mr-1" />
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setFilterType(opt.id)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition whitespace-nowrap shrink-0 ${
              filterType === opt.id
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Main Canvas Area */}
      <div
        className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {layoutNodes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl text-indigo-400">
              <Network className="w-10 h-10" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-base font-semibold text-white">No graph entities matching criteria</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                As you converse with Innerly in your journal, entities like goals, projects, challenges, and progress
                are extracted automatically into this graph.
              </p>
            </div>
            <button
              onClick={onNewReflection}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 px-4 rounded-xl transition shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Start a Journal Entry</span>
            </button>
          </div>
        ) : (
          <svg
            className="w-full h-full pointer-events-auto"
            viewBox="0 0 1000 700"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="20"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
              </marker>
              <marker
                id="arrowhead-active"
                markerWidth="10"
                markerHeight="7"
                refX="22"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#818cf8" />
              </marker>
            </defs>

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Relationship Edges */}
              {edges.map((edge) => {
                const isConnectedToSelected =
                  selectedNodeId &&
                  (edge.from.id === selectedNodeId || edge.to.id === selectedNodeId);

                return (
                  <line
                    key={edge.id}
                    x1={edge.from.x}
                    y1={edge.from.y}
                    x2={edge.to.x}
                    y2={edge.to.y}
                    stroke={isConnectedToSelected ? "#818cf8" : "#334155"}
                    strokeWidth={isConnectedToSelected ? "2.5" : "1.2"}
                    strokeDasharray={isConnectedToSelected ? "none" : "3,3"}
                    markerEnd={isConnectedToSelected ? "url(#arrowhead-active)" : "url(#arrowhead)"}
                    className="transition-all duration-300"
                  />
                );
              })}

              {/* Node Circles */}
              {layoutNodes.map((node) => {
                const isSelected = node.id === selectedNodeId;
                const radius = isSelected ? 24 : 18;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(node.id);
                    }}
                    className="cursor-pointer group"
                  >
                    {/* Pulsing ring on selected */}
                    {isSelected && (
                      <circle
                        r={radius + 8}
                        className="fill-none stroke-indigo-500/40 animate-ping"
                        strokeWidth="2"
                      />
                    )}

                    {/* Node Body */}
                    <circle
                      r={radius}
                      className={`transition-all duration-200 ${
                        isSelected
                          ? "fill-indigo-950 stroke-indigo-400 stroke-[3px]"
                          : "fill-slate-900 stroke-slate-700 hover:stroke-indigo-400 stroke-2"
                      }`}
                    />

                    {/* Inner Type Indicator */}
                    <circle
                      r={radius - 8}
                      className={
                        node.type === "goal"
                          ? "fill-emerald-500"
                          : node.type === "challenge"
                          ? "fill-rose-500"
                          : node.type === "project"
                          ? "fill-sky-500"
                          : node.type === "decision"
                          ? "fill-purple-500"
                          : node.type === "progress"
                          ? "fill-teal-400"
                          : "fill-amber-400"
                      }
                    />

                    {/* Node Title Label */}
                    <text
                      y={radius + 16}
                      textAnchor="middle"
                      className={`text-[11px] font-medium tracking-tight pointer-events-none select-none transition-colors ${
                        isSelected
                          ? "fill-white font-bold"
                          : "fill-slate-300 group-hover:fill-white"
                      }`}
                    >
                      {node.title.length > 20 ? `${node.title.slice(0, 18)}...` : node.title}
                    </text>

                    {/* Type pill label */}
                    <text
                      y={radius + 28}
                      textAnchor="middle"
                      className="text-[9px] uppercase tracking-wider fill-slate-500 pointer-events-none select-none font-mono"
                    >
                      {node.type} • {node.status}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        {/* Selected Node Details Drawer (Slide-over on desktop, Bottom-sheet on mobile) */}
        {selectedNode && (
          <div className="absolute inset-x-0 bottom-0 sm:inset-x-auto sm:right-4 sm:top-4 sm:bottom-4 w-full sm:w-96 max-h-[75vh] sm:max-h-none bg-slate-900/95 border-t sm:border border-slate-800 backdrop-blur-md rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl flex flex-col justify-between z-20 animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-right-4">
            <div className="space-y-4 overflow-y-auto pr-1">
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-mono uppercase border ${
                      TYPE_CONFIG[selectedNode.type]?.bg
                    } ${TYPE_CONFIG[selectedNode.type]?.color} ${TYPE_CONFIG[selectedNode.type]?.border}`}
                  >
                    {selectedNode.type}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    ID: {selectedNode.id.slice(0, 8)}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5 sm:w-4 sm:h-4" />
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-white leading-snug">{selectedNode.title}</h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  {selectedNode.description || "No detailed description."}
                </p>
              </div>

              {/* Status Update */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Lifecycle Status
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["active", "delayed", "completed", "abandoned"] as MemoryStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(st)}
                        className={`text-xs py-1.5 px-2 rounded-lg border capitalize font-medium transition min-h-[36px] ${
                          selectedNode.status === st
                            ? "bg-indigo-600 border-indigo-500 text-white"
                            : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="text-[11px] text-slate-400 space-y-1 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                <div className="flex justify-between">
                  <span>Recorded Date:</span>
                  <span className="font-mono text-slate-300">
                    {new Date(selectedNode.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Isolation Path:</span>
                  <span className="font-mono text-indigo-300">/users/{user.uid.slice(0, 6)}.../memories</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
              {selectedNode.sourceChatId ? (
                <button
                  onClick={() => onNavigateToChat(selectedNode.sourceChatId)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2.5 px-3 rounded-xl transition min-h-[44px]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Journal Note</span>
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={handleDelete}
                className="p-2.5 rounded-xl text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/40 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Delete Memory"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <footer className="px-4 sm:px-6 py-2 border-t border-slate-800/80 bg-slate-900/60 backdrop-blur flex items-center justify-between text-[11px] text-slate-400 overflow-x-auto shrink-0 pb-16 md:pb-2">
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <span className="font-semibold text-slate-300">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Goal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            <span>Project</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Challenge</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>Decision</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>Action</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-400" />
            <span>Progress</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 text-slate-500 font-mono">
          <span>Click node to inspect • Drag to pan</span>
        </div>
      </footer>
    </div>
  );
};
