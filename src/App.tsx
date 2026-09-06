/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, testConnection, logoutUser, getLocalSession } from "./lib/firebase";
import { UserProfile } from "./types";
import { AuthModal } from "./components/AuthModal";
import { AppNavigationSidebar, AppView } from "./components/AppNavigationSidebar";
import { MobileNavigation } from "./components/MobileNavigation";
import { ChatView } from "./components/ChatView";
import { LifeGraphView } from "./components/LifeGraphView";
import { AskPastSelfView } from "./components/AskPastSelfView";
import { InsightsView } from "./components/InsightsView";
import { SettingsModal } from "./components/SettingsModal";

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>("journal");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Validate connection to Firestore upon boot
  useEffect(() => {
    testConnection();
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        };
        setUser(userProfile);

        // Ensure user document exists in private Firestore scope
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          await setDoc(
            userDocRef,
            {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName: firebaseUser.displayName || "",
              createdAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (err) {
          console.warn("User profile sync check:", err);
        }
      } else {
        const local = getLocalSession();
        if (local) {
          setUser(local);
        } else {
          setUser(null);
          setActiveChatId(null);
        }
      }
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen for explicit logout events
  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
      setActiveChatId(null);
      setSettingsModalOpen(false);
    };
    window.addEventListener("innerly:logout", handleLogout);
    return () => window.removeEventListener("innerly:logout", handleLogout);
  }, []);

  const handleNavigateToChat = useCallback((chatId: string) => {
    setActiveChatId(chatId);
    setCurrentView("journal");
  }, []);

  const handleNewReflection = useCallback(() => {
    setCurrentView("journal");
  }, []);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#131314] flex flex-col items-center justify-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono tracking-wide text-slate-500">
          Verifying security enclave & credentials...
        </span>
      </div>
    );
  }

  if (!user) {
    return <AuthModal onSuccess={(profile) => setUser(profile)} />;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-[#131314] text-[#e3e3e3] overflow-hidden font-sans">
      {/* Mobile Top Header, Drawer, and Bottom Navigation */}
      <MobileNavigation
        user={user}
        currentView={currentView}
        onSelectView={setCurrentView}
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        onOpenSettings={() => setSettingsModalOpen(true)}
      />

      {/* Desktop Unified Navigation & Chat Management Sidebar */}
      <AppNavigationSidebar
        user={user}
        currentView={currentView}
        onSelectView={setCurrentView}
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        onOpenSettings={() => setSettingsModalOpen(true)}
      />

      {/* Primary Workspace View Area */}
      <main className="flex-1 flex flex-col min-w-0 h-[calc(100vh-3.5rem)] md:h-screen overflow-hidden bg-[#131314] relative">
        {currentView === "journal" && (
          <ChatView
            user={user}
            chatId={activeChatId}
            onNavigateToLifeGraph={() => setCurrentView("lifegraph")}
            onStartNewChat={handleNewReflection}
          />
        )}

        {currentView === "lifegraph" && (
          <LifeGraphView
            user={user}
            onNavigateToChat={handleNavigateToChat}
            onNewReflection={handleNewReflection}
          />
        )}

        {currentView === "past-self" && (
          <AskPastSelfView
            user={user}
            onNavigateToChat={handleNavigateToChat}
            onNewReflection={handleNewReflection}
          />
        )}

        {currentView === "insights" && (
          <InsightsView
            user={user}
            onNewReflection={handleNewReflection}
          />
        )}
      </main>

      {/* Settings Modal (Account, Preferences, Data & Privacy) */}
      <SettingsModal
        user={user}
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
    </div>
  );
}
