import React, { useState, useEffect } from "react";
import { UserProfile, JournalChat } from "../types";
import { logoutUser } from "../lib/firebase";
import { subscribeChats, createChat, deleteChat, updateChatTitle } from "../lib/dataStore";
import { AppView } from "./AppNavigationSidebar";
import { InnerlySparkle } from "./InnerlyLogo";
import {
  Menu,
  X,
  Plus,
  MessageSquareText,
  Network,
  Compass,
  Lightbulb,
  CalendarDays,
  ShieldCheck,
  Settings,
  LogOut,
  Trash2,
  Search,
  Pin,
  Edit2,
  Check,
  BookOpen,
  Sparkles,
} from "lucide-react";

interface MobileNavigationProps {
  user: UserProfile;
  currentView: AppView;
  onSelectView: (view: AppView) => void;
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onOpenSettings: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  user,
  currentView,
  onSelectView,
  activeChatId,
  onSelectChat,
  onOpenSettings,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
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

  const displayName = user.displayName || "ABHINAND N.M";

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
      (err) => console.warn("Mobile chats subscription notice:", err)
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
        // ignore
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
      setDrawerOpen(false);
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

  const filteredChats = chats.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const pinnedChats = filteredChats.filter((c) => pinnedChatIds.includes(c.id));
  const recentChats = filteredChats.filter((c) => !pinnedChatIds.includes(c.id));

  return (
    <>
      {/* 1. MOBILE TOP BAR: EXACT GEMINI THEME */}
      <header className="md:hidden h-14 bg-[#131314] border-b border-[#282a2c] px-3 flex items-center justify-between shrink-0 z-30 select-none">
        {/* Left: Hamburger Menu */}
        <div className="flex items-center gap-2">
          <button
            id="btn-mobile-menu"
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-full text-[#c4c7c5] hover:text-white hover:bg-[#1e1f20] transition active:scale-95"
            aria-label="Open Navigation Drawer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo & Brand */}
          <div
            onClick={() => onSelectView("journal")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <InnerlySparkle className="w-5 h-5" />
            <span className="text-base font-medium tracking-tight text-[#e3e3e3]">
              Innerly
            </span>
          </div>
        </div>

        {/* Right: New Chat + Profile Avatar */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleCreateNewChat}
            title="New Chat"
            className="p-2 rounded-full text-[#c4c7c5] hover:text-white hover:bg-[#1e1f20] transition active:scale-95"
          >
            <Plus className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              onOpenSettings();
            }}
            title="Settings"
            className="p-1"
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="Avatar"
                className="w-7 h-7 rounded-full border border-white/10 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#a35136] text-white flex items-center justify-center font-medium text-xs">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </button>
        </div>
      </header>

      {/* 2. MOBILE SLIDE-OUT DRAWER: EXACT GEMINI THEME */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-[85%] max-w-xs bg-[#18191b] border-r border-[#2d2f31] flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-left duration-250">
            {/* Top Drawer Header: Brand + Close */}
            <div className="h-14 px-4 flex items-center justify-between shrink-0 border-b border-[#282a2c]">
              <div className="flex items-center gap-2.5">
                <InnerlySparkle className="w-6 h-6" />
                <span className="text-lg font-medium text-[#e3e3e3] tracking-tight">
                  Innerly
                </span>
              </div>

              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-full text-[#c4c7c5] hover:text-white hover:bg-[#282a2c] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* + New reflection Pill Button */}
            <div className="px-3 pt-3 pb-2">
              <button
                id="btn-mobile-new-reflection"
                onClick={handleCreateNewChat}
                disabled={creating}
                className="w-full flex items-center gap-3 bg-[#1e1f20] hover:bg-[#282a2c] border border-white/5 text-[#e3e3e3] text-xs font-medium py-2.5 px-4 rounded-full transition shadow-sm"
              >
                <Plus className="w-4 h-4 text-[#c4c7c5] shrink-0" />
                <span>New reflection</span>
              </button>
            </div>

            {/* Search Reflections Input */}
            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="w-4 h-4 text-[#8e918f] absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search reflections"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-[#1e1f20]/70 border border-white/5 rounded-full text-[#e3e3e3] placeholder-[#8e918f] focus:outline-none focus:border-indigo-500/40"
                />
              </div>
            </div>

            {/* Navigation Destinations */}
            <div className="px-2 pb-2 space-y-0.5 border-b border-[#282a2c]">
              {[
                { id: "journal" as const, label: "Journal", icon: MessageSquareText, color: "text-sky-400" },
                { id: "lifegraph" as const, label: "LifeGraph", icon: Network, color: "text-indigo-400" },
                { id: "past-self" as const, label: "Past Self", icon: Compass, color: "text-purple-400" },
                { id: "insights" as const, label: "Insights", icon: Lightbulb, color: "text-amber-400" },
              ].map((dest) => {
                const Icon = dest.icon;
                const isActive = currentView === dest.id;
                return (
                  <button
                    key={dest.id}
                    onClick={() => {
                      onSelectView(dest.id);
                      setDrawerOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? "bg-[#282a2c] text-white"
                        : "text-[#c4c7c5] hover:text-white hover:bg-[#1e1f20]"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${dest.color} shrink-0`} />
                    <span>{dest.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Recent Reflections List */}
            <div className="flex-1 flex flex-col min-h-0 px-3 pt-2">
              <div className="text-[11px] font-semibold text-[#8e918f] uppercase tracking-wider mb-1 px-1">
                Recent
              </div>

              <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
                {/* Pinned Chats */}
                {pinnedChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => {
                      onSelectChat(chat.id);
                      onSelectView("journal");
                      setDrawerOpen(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs ${
                      currentView === "journal" && chat.id === activeChatId
                        ? "bg-[#282a2c] text-white font-medium"
                        : "text-[#c4c7c5] hover:bg-[#1e1f20]"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="truncate">{chat.title}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => togglePin(e, chat.id)}
                        className="p-1 text-indigo-400"
                      >
                        <Pin className="w-3 h-3 fill-indigo-400" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteChat(e, chat.id)}
                        className="p-1 text-[#8e918f] hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Recent Chats */}
                {recentChats.map((chat) => {
                  const isActive = currentView === "journal" && chat.id === activeChatId;
                  return (
                    <div
                      key={chat.id}
                      onClick={() => {
                        onSelectChat(chat.id);
                        onSelectView("journal");
                        setDrawerOpen(false);
                      }}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs ${
                        isActive
                          ? "bg-[#282a2c] text-white font-medium"
                          : "text-[#c4c7c5] hover:bg-[#1e1f20]"
                      }`}
                    >
                      <span className="truncate pr-2">{chat.title}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => togglePin(e, chat.id)}
                          className="p-1 text-[#8e918f]"
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteChat(e, chat.id)}
                          className="p-1 text-[#8e918f] hover:text-rose-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
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

            {/* Bottom User Profile & Settings */}
            <div className="p-3 border-t border-[#282a2c] bg-[#18191b] shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0 pr-1">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full border border-white/10 object-cover shrink-0"
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
                    <div className="text-[11px] text-[#8e918f] flex items-center gap-1">
                      <span className="text-indigo-400 font-medium">Pro</span>
                      <span>•</span>
                      <span className="truncate">Encrypted</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      onOpenSettings();
                      setDrawerOpen(false);
                    }}
                    title="Settings"
                    className="relative p-2 rounded-full text-[#c4c7c5] hover:text-white hover:bg-[#282a2c]"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 ring-2 ring-[#18191b]" />
                  </button>
                  <button
                    onClick={logoutUser}
                    title="Sign Out"
                    className="p-2 rounded-full text-[#8e918f] hover:text-rose-400 hover:bg-[#282a2c]"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
