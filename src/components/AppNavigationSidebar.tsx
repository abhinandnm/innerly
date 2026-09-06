import React, { useState, useEffect } from "react";
import { UserProfile, JournalChat } from "../types";
import { logoutUser } from "../lib/firebase";
import { subscribeChats, createChat, deleteChat, updateChatTitle } from "../lib/dataStore";
import { InnerlySparkle } from "./InnerlyLogo";
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  MessageSquareText,
  Network,
  Compass,
  Lightbulb,
  CalendarDays,
  ShieldCheck,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Pin,
  FolderPlus,
  BookOpen,
  LogOut,
  Sparkles,
} from "lucide-react";

export type AppView = "journal" | "lifegraph" | "past-self" | "insights";

interface AppNavigationSidebarProps {
  user: UserProfile;
  currentView: AppView;
  onSelectView: (view: AppView) => void;
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onOpenSettings: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const AppNavigationSidebar: React.FC<AppNavigationSidebarProps> = ({
  user,
  currentView,
  onSelectView,
  activeChatId,
  onSelectChat,
  onOpenSettings,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [chats, setChats] = useState<JournalChat[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [pinnedChatIds, setPinnedChatIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("innerly_pinned_chats") || "[]");
    } catch {
      return [];
    }
  });

  const [notebooks, setNotebooks] = useState<string[]>([
    "Personal Growth & Identity",
    "Projects & Strategic Goals",
  ]);
  const [showNewNotebookInput, setShowNewNotebookInput] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState("");

  useEffect(() => {
    if (!user.uid) return;
    const unsubscribe = subscribeChats(
      user.uid,
      (fetched) => {
        setChats(fetched);
        if (!activeChatId && fetched.length > 0 && currentView === "journal") {
          onSelectChat(fetched[0].id);
        }
      },
      (err) => console.warn("Chats subscription notice:", err)
    );
    return () => unsubscribe();
  }, [user.uid, activeChatId, onSelectChat, currentView]);

  const togglePin = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setPinnedChatIds((prev) => {
      const updated = prev.includes(chatId)
        ? prev.filter((id) => id !== chatId)
        : [...prev, chatId];
      try {
        localStorage.setItem("innerly_pinned_chats", JSON.stringify(updated));
      } catch {
        // ignore storage quota error
      }
      return updated;
    });
  };

  const handleCreateNewChat = async () => {
    if (creating) return;
    try {
      setCreating(true);
      const title = `Reflection ${new Date().toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`;
      const newChatId = await createChat(user.uid, title);
      onSelectChat(newChatId);
      onSelectView("journal");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!confirm("Delete this reflection?")) return;
    try {
      await deleteChat(user.uid, chatId);
      if (activeChatId === chatId) {
        const remaining = chats.filter((c) => c.id !== chatId);
        if (remaining.length > 0) {
          onSelectChat(remaining[0].id);
        } else {
          onSelectChat("");
        }
      }
    } catch (err) {
      console.warn("Delete chat warning:", err);
    }
  };

  const handleStartRename = (e: React.MouseEvent, chat: JournalChat) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  const handleSaveRename = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (editingTitle.trim()) {
      await updateChatTitle(user.uid, chatId, editingTitle.trim());
    }
    setEditingChatId(null);
  };

  const handleAddNotebook = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNotebookName.trim()) {
      setNotebooks((prev) => [...prev, newNotebookName.trim()]);
      setNewNotebookName("");
      setShowNewNotebookInput(false);
    }
  };

  const filteredChats = chats.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedChats = filteredChats.filter((c) => pinnedChatIds.includes(c.id));
  const recentChats = filteredChats.filter((c) => !pinnedChatIds.includes(c.id));

  // Determine user display name initials or fallback
  const displayName = user.displayName || "ABHINAND N.M";

  return (
    <aside
      id="desktop-app-sidebar"
      className={`hidden md:flex flex-col h-full bg-[#18191b] border-r border-[#2d2f31] select-none transition-all duration-300 z-30 shrink-0 ${
        isCollapsed ? "w-[72px]" : "w-[272px]"
      }`}
    >
      {/* 1. TOP HEADER: Innerly brand + collapse icon */}
      <div className="h-16 px-4 flex items-center justify-between shrink-0">
        {!isCollapsed ? (
          <div
            onClick={() => onSelectView("journal")}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <InnerlySparkle className="w-6 h-6 group-hover:scale-105 transition-transform" />
            <span className="text-[19px] font-medium tracking-tight text-[#e3e3e3]">
              Innerly
            </span>
          </div>
        ) : (
          <button
            onClick={() => onSelectView("journal")}
            className="mx-auto cursor-pointer group"
            title="Innerly"
          >
            <InnerlySparkle className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </button>
        )}

        <button
          id="btn-toggle-sidebar"
          onClick={onToggleCollapse}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="p-2 rounded-full text-[#c4c7c5] hover:text-white hover:bg-[#282a2c] transition shrink-0"
        >
          {isCollapsed ? (
            <PanelLeft className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* 2. NEW CHAT PILL BUTTON (Gemini style) */}
      <div className="px-3 pb-2">
        <button
          id="btn-sidebar-new-reflection"
          onClick={handleCreateNewChat}
          disabled={creating}
          title="New reflection"
          className={`w-full flex items-center gap-3 bg-[#1e1f20] hover:bg-[#282a2c] border border-white/5 text-[#e3e3e3] text-xs font-medium py-2.5 rounded-full transition shadow-sm ${
            isCollapsed ? "justify-center px-0 h-10" : "px-4"
          }`}
        >
          <Plus className="w-4 h-4 text-[#c4c7c5] shrink-0" />
          {!isCollapsed && <span className="truncate">New reflection</span>}
        </button>
      </div>

      {/* 3. PRIMARY DESTINATIONS (Journal, LifeGraph, Past Self, Insights) */}
      <div className="px-2 pb-2 space-y-0.5">
        <button
          onClick={() => onSelectView("journal")}
          title="Journal"
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
            currentView === "journal"
              ? "bg-[#282a2c] text-white"
              : "text-[#c4c7c5] hover:text-white hover:bg-[#1e1f20]"
          } ${isCollapsed ? "justify-center px-0" : ""}`}
        >
          <MessageSquareText className="w-4 h-4 text-sky-400 shrink-0" />
          {!isCollapsed && <span className="truncate">Journal</span>}
        </button>

        <button
          onClick={() => onSelectView("lifegraph")}
          title="LifeGraph"
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
            currentView === "lifegraph"
              ? "bg-[#282a2c] text-white"
              : "text-[#c4c7c5] hover:text-white hover:bg-[#1e1f20]"
          } ${isCollapsed ? "justify-center px-0" : ""}`}
        >
          <Network className="w-4 h-4 text-indigo-400 shrink-0" />
          {!isCollapsed && <span className="truncate">LifeGraph</span>}
        </button>

        <button
          onClick={() => onSelectView("past-self")}
          title="Ask Past Self"
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
            currentView === "past-self"
              ? "bg-[#282a2c] text-white"
              : "text-[#c4c7c5] hover:text-white hover:bg-[#1e1f20]"
          } ${isCollapsed ? "justify-center px-0" : ""}`}
        >
          <Compass className="w-4 h-4 text-purple-400 shrink-0" />
          {!isCollapsed && <span className="truncate">Past Self</span>}
        </button>

        <button
          onClick={() => onSelectView("insights")}
          title="Insights"
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
            currentView === "insights"
              ? "bg-[#282a2c] text-white"
              : "text-[#c4c7c5] hover:text-white hover:bg-[#1e1f20]"
          } ${isCollapsed ? "justify-center px-0" : ""}`}
        >
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
          {!isCollapsed && <span className="truncate">Insights</span>}
        </button>
      </div>

      {/* 4. SEARCH CHATS BAR (Gemini style) */}
      {!isCollapsed && (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 text-[#8e918f] absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search reflections"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#1e1f20]/70 hover:bg-[#1e1f20] border border-white/5 rounded-full text-[#e3e3e3] placeholder-[#8e918f] focus:outline-none focus:border-indigo-500/40 transition"
            />
          </div>
        </div>
      )}

      {/* 6. NOTEBOOKS SECTION (Gemini style) */}
      {!isCollapsed && (
        <div className="px-3 pt-2 pb-1 border-t border-[#282a2c]">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#8e918f] uppercase tracking-wider mb-1">
            <span>Notebooks</span>
            <button
              onClick={() => setShowNewNotebookInput(true)}
              title="Add notebook"
              className="p-1 text-[#8e918f] hover:text-white rounded hover:bg-[#282a2c] transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {showNewNotebookInput && (
            <form onSubmit={handleAddNotebook} className="mb-2 flex items-center gap-1">
              <input
                type="text"
                autoFocus
                placeholder="Notebook title..."
                value={newNotebookName}
                onChange={(e) => setNewNotebookName(e.target.value)}
                className="w-full text-xs bg-[#1e1f20] border border-white/10 rounded px-2 py-1 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="p-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-500"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowNewNotebookInput(false)}
                className="p-1 text-xs text-slate-400 hover:text-white rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          <div className="space-y-0.5">
            {notebooks.map((nb, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs text-[#c4c7c5] hover:bg-[#1e1f20] hover:text-white cursor-pointer transition truncate"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#8e918f] shrink-0" />
                <span className="truncate">{nb}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. RECENT CHATS LIST (Gemini style) */}
      {!isCollapsed ? (
        <div className="flex-1 flex flex-col min-h-0 px-3 pt-2 border-t border-[#282a2c]">
          <div className="text-[11px] font-semibold text-[#8e918f] uppercase tracking-wider mb-1 px-1">
            Recent
          </div>

          <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
            {/* Pinned chats first */}
            {pinnedChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => {
                  onSelectChat(chat.id);
                  onSelectView("journal");
                }}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition text-xs ${
                  currentView === "journal" && chat.id === activeChatId
                    ? "bg-[#282a2c] text-white font-medium"
                    : "text-[#c4c7c5] hover:bg-[#1e1f20] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                  <span className="truncate">{chat.title}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => togglePin(e, chat.id)}
                    title="Unpin chat"
                    className="p-1 text-indigo-400 hover:text-indigo-300"
                  >
                    <Pin className="w-3 h-3 fill-indigo-400" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    title="Delete"
                    className="p-1 text-[#8e918f] hover:text-rose-400 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}

            {/* Unpinned recent chats */}
            {recentChats.map((chat) => {
              const isActive = currentView === "journal" && chat.id === activeChatId;
              const isEditing = editingChatId === chat.id;

              return (
                <div
                  key={chat.id}
                  id={`sidebar-chat-${chat.id}`}
                  onClick={() => {
                    onSelectChat(chat.id);
                    onSelectView("journal");
                  }}
                  className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition text-xs ${
                    isActive
                      ? "bg-[#282a2c] text-white font-medium"
                      : "text-[#c4c7c5] hover:bg-[#1e1f20] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename(e as unknown as React.MouseEvent, chat.id);
                          if (e.key === "Escape") setEditingChatId(null);
                        }}
                        autoFocus
                        className="w-full bg-[#131314] text-white px-1.5 py-0.5 rounded border border-indigo-500 text-xs focus:outline-none"
                      />
                    ) : (
                      <span className="truncate">{chat.title}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          onClick={(e) => handleSaveRename(e, chat.id)}
                          className="p-1 text-emerald-400 hover:text-emerald-300"
                          title="Save"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingChatId(null);
                          }}
                          className="p-1 text-[#8e918f] hover:text-white"
                          title="Cancel"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => togglePin(e, chat.id)}
                          title="Pin chat"
                          className="p-1 text-[#8e918f] hover:text-white"
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleStartRename(e, chat)}
                          title="Rename"
                          className="p-1 text-[#8e918f] hover:text-white"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteChat(e, chat.id)}
                          title="Delete"
                          className="p-1 text-[#8e918f] hover:text-rose-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredChats.length === 0 && (
              <div className="py-4 text-center text-xs text-[#8e918f]">
                No chats found
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center pt-2 overflow-y-auto space-y-1">
          {chats.slice(0, 6).map((chat) => (
            <button
              key={chat.id}
              onClick={() => {
                onSelectChat(chat.id);
                onSelectView("journal");
              }}
              title={chat.title}
              className={`p-2.5 rounded-full transition ${
                currentView === "journal" && chat.id === activeChatId
                  ? "bg-[#282a2c] text-white"
                  : "text-[#8e918f] hover:bg-[#1e1f20] hover:text-white"
              }`}
            >
              <MessageSquareText className="w-4 h-4" />
            </button>
          ))}
        </div>
      )}

      {/* 8. BOTTOM USER PROFILE & SETTINGS (Gemini exact matching bottom) */}
      <div className="p-3 border-t border-[#282a2c] bg-[#18191b] shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0 pr-1">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="User Avatar"
                  className="w-8 h-8 rounded-full border border-white/10 shrink-0 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#a35136] text-white flex items-center justify-center font-medium text-xs shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-medium text-[#e3e3e3] truncate">
                  {displayName}
                </div>
                <div className="text-[11px] text-[#8e918f] flex items-center gap-1.5">
                  <span className="text-[10px] font-medium text-indigo-400">Pro</span>
                  <span>•</span>
                  <span className="truncate">Encrypted</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                id="sidebar-btn-settings"
                onClick={onOpenSettings}
                title="Settings"
                className="relative p-2 rounded-full text-[#c4c7c5] hover:text-white hover:bg-[#282a2c] transition"
              >
                <Settings className="w-4 h-4" />
                {/* Blue status indicator dot like Gemini screenshot */}
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 ring-2 ring-[#18191b]" />
              </button>
              <button
                onClick={logoutUser}
                title="Sign out"
                className="p-2 rounded-full text-[#8e918f] hover:text-rose-400 hover:bg-[#282a2c] transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onOpenSettings}
              title={`Settings - ${displayName}`}
              className="relative p-1"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full border border-white/10 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#a35136] text-white flex items-center justify-center font-medium text-xs">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-[#18191b]" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
