import { auth, db } from "./firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  JournalChat,
  JournalMessage,
  LifeGraphMemory,
  LifeGraphInsight,
  TimelineEvent,
  MemoryStatus,
} from "../types";
import { handleFirestoreError, OperationType } from "./firestoreErrorHandler";

// In-memory event bus for local session changes
type Listener = () => void;
const localListeners: Set<Listener> = new Set();

function notifyLocalChange() {
  localListeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error("[DataStore] Listener notification error:", e);
    }
  });
}

function getLocalData<T>(key: string, defaultVal: T): T {
  if (typeof window === "undefined") return defaultVal;
  const raw = localStorage.getItem(`lifegraph_${key}`);
  if (!raw) return defaultVal;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return defaultVal;
  }
}

function setLocalData<T>(key: string, val: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`lifegraph_${key}`, JSON.stringify(val));
  notifyLocalChange();
}

// Clean state initialization (no predefined values or automated fake chats)
export function ensureLocalSeedData(_userId: string): void {
  if (typeof window === "undefined") return;
  try {
    // Automatically purge legacy prefilled mock chats & messages if present
    const rawChats = localStorage.getItem("lifegraph_chats");
    if (rawChats && rawChats.includes("chat_seed_1")) {
      const chats = JSON.parse(rawChats).filter((c: any) => c.id !== "chat_seed_1");
      localStorage.setItem("lifegraph_chats", JSON.stringify(chats));
    }
    const rawMsgs = localStorage.getItem("lifegraph_messages");
    if (rawMsgs && rawMsgs.includes("chat_seed_1")) {
      const msgs = JSON.parse(rawMsgs);
      delete msgs["chat_seed_1"];
      localStorage.setItem("lifegraph_messages", JSON.stringify(msgs));
    }
    const rawMems = localStorage.getItem("lifegraph_memories");
    if (rawMems && rawMems.includes("mem_1")) {
      const mems = JSON.parse(rawMems).filter((m: any) => !m.id?.startsWith("mem_"));
      localStorage.setItem("lifegraph_memories", JSON.stringify(mems));
    }
    const rawIns = localStorage.getItem("lifegraph_insights");
    if (rawIns && rawIns.includes("ins_1")) {
      const ins = JSON.parse(rawIns).filter((i: any) => !i.id?.startsWith("ins_"));
      localStorage.setItem("lifegraph_insights", JSON.stringify(ins));
    }
    const rawTime = localStorage.getItem("lifegraph_timeline");
    if (rawTime && rawTime.includes("evt_1")) {
      const time = JSON.parse(rawTime).filter((t: any) => !t.id?.startsWith("evt_"));
      localStorage.setItem("lifegraph_timeline", JSON.stringify(time));
    }
    localStorage.removeItem("lifegraph_seeded_v1");
  } catch {
    // ignore
  }
}

/* ================= CHATS ================= */

export function subscribeChats(
  userId: string,
  onData: (chats: JournalChat[]) => void,
  onError?: (err: unknown) => void
): () => void {
  if (!userId) return () => {};

  if (auth.currentUser) {
    const chatsPath = `users/${userId}/chats`;
    const chatsRef = collection(db, "users", userId, "chats");
    const q = query(chatsRef, orderBy("updatedAt", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        const list: JournalChat[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            ownerId: data.ownerId || userId,
            title: data.title || "Untitled Entry",
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          });
        });
        onData(list);
      },
      (err) => {
        if (onError) onError(err);
        else handleFirestoreError(err, OperationType.LIST, chatsPath);
      }
    );
  }

  // Local Session
  ensureLocalSeedData(userId);
  const deliver = () => {
    const chats = getLocalData<JournalChat[]>("chats", []);
    onData(chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
  };
  deliver();
  localListeners.add(deliver);
  return () => {
    localListeners.delete(deliver);
  };
}

export async function createChat(userId: string, title?: string): Promise<string> {
  const newChatId = `chat_${Date.now()}`;
  const nowStr = new Date().toISOString();

  if (auth.currentUser) {
    const path = `users/${userId}/chats/${newChatId}`;
    try {
      await setDoc(doc(db, "users", userId, "chats", newChatId), {
        id: newChatId,
        ownerId: userId,
        title: title || "New Reflection Entry",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return newChatId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  }

  // Local Session
  const chats = getLocalData<JournalChat[]>("chats", []);
  chats.unshift({
    id: newChatId,
    ownerId: userId,
    title: title || "New Reflection Entry",
    createdAt: nowStr,
    updatedAt: nowStr,
  });
  setLocalData("chats", chats);
  return newChatId;
}

export async function deleteChat(userId: string, chatId: string): Promise<void> {
  if (auth.currentUser) {
    const path = `users/${userId}/chats/${chatId}`;
    try {
      await deleteDoc(doc(db, "users", userId, "chats", chatId));
      return;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }

  // Local Session
  const chats = getLocalData<JournalChat[]>("chats", []);
  setLocalData(
    "chats",
    chats.filter((c) => c.id !== chatId)
  );

  const messagesMap = getLocalData<Record<string, JournalMessage[]>>("messages", {});
  delete messagesMap[chatId];
  setLocalData("messages", messagesMap);
}

export async function updateChatTitle(
  userId: string,
  chatId: string,
  newTitle: string
): Promise<void> {
  const cleanTitle = newTitle.trim() || "Untitled Reflection";
  if (auth.currentUser) {
    const path = `users/${userId}/chats/${chatId}`;
    try {
      await updateDoc(doc(db, "users", userId, "chats", chatId), {
        title: cleanTitle,
        updatedAt: serverTimestamp(),
      });
      return;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  }

  // Local Session
  const chats = getLocalData<JournalChat[]>("chats", []);
  const idx = chats.findIndex((c) => c.id === chatId);
  if (idx !== -1) {
    chats[idx].title = cleanTitle;
    chats[idx].updatedAt = new Date().toISOString();
    setLocalData("chats", chats);
  }
}

/* ================= MESSAGES ================= */

export function subscribeMessages(
  userId: string,
  chatId: string | null,
  onData: (messages: JournalMessage[]) => void,
  onError?: (err: unknown) => void
): () => void {
  if (!userId || !chatId) {
    onData([]);
    return () => {};
  }

  if (auth.currentUser) {
    const messagesPath = `users/${userId}/chats/${chatId}/messages`;
    const messagesRef = collection(db, "users", userId, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    return onSnapshot(
      q,
      (snap) => {
        const msgs: JournalMessage[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          msgs.push({
            id: docSnap.id,
            ownerId: data.ownerId || userId,
            role: data.role as "user" | "model",
            content: data.content || "",
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          });
        });
        onData(msgs);
      },
      (err) => {
        if (onError) onError(err);
        else handleFirestoreError(err, OperationType.LIST, messagesPath);
      }
    );
  }

  // Local Session
  const deliver = () => {
    const messagesMap = getLocalData<Record<string, JournalMessage[]>>("messages", {});
    const list = messagesMap[chatId] || [];
    onData([...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
  };
  deliver();
  localListeners.add(deliver);
  return () => {
    localListeners.delete(deliver);
  };
}

export async function addMessage(
  userId: string,
  chatId: string,
  role: "user" | "model",
  content: string
): Promise<string> {
  const msgId = `msg_${role[0]}_${Date.now()}`;
  const nowStr = new Date().toISOString();

  if (auth.currentUser) {
    const path = `users/${userId}/chats/${chatId}/messages/${msgId}`;
    try {
      await setDoc(doc(db, "users", userId, "chats", chatId, "messages", msgId), {
        id: msgId,
        ownerId: userId,
        role,
        content,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "users", userId, "chats", chatId), {
        updatedAt: serverTimestamp(),
      });
      return msgId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  }

  // Local Session
  const messagesMap = getLocalData<Record<string, JournalMessage[]>>("messages", {});
  const list = messagesMap[chatId] || [];
  list.push({
    id: msgId,
    ownerId: userId,
    role,
    content,
    createdAt: nowStr,
  });
  messagesMap[chatId] = list;
  setLocalData("messages", messagesMap);

  // Update chat updatedAt
  const chats = getLocalData<JournalChat[]>("chats", []);
  const chatIdx = chats.findIndex((c) => c.id === chatId);
  if (chatIdx !== -1) {
    chats[chatIdx].updatedAt = nowStr;
    setLocalData("chats", chats);
  }

  return msgId;
}

export async function deleteMessage(
  userId: string,
  chatId: string,
  messageId: string
): Promise<void> {
  if (auth.currentUser) {
    const path = `users/${userId}/chats/${chatId}/messages/${messageId}`;
    try {
      await deleteDoc(doc(db, "users", userId, "chats", chatId, "messages", messageId));
      return;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }

  // Local Session
  const messagesMap = getLocalData<Record<string, JournalMessage[]>>("messages", {});
  if (messagesMap[chatId]) {
    messagesMap[chatId] = messagesMap[chatId].filter((m) => m.id !== messageId);
    setLocalData("messages", messagesMap);
  }
}

/* ================= MEMORIES / LIFEGRAPH ================= */

export function subscribeMemories(
  userId: string,
  onData: (memories: LifeGraphMemory[]) => void,
  onError?: (err: unknown) => void
): () => void {
  if (!userId) return () => {};

  if (auth.currentUser) {
    const memoriesPath = `users/${userId}/memories`;
    const memoriesRef = collection(db, "users", userId, "memories");
    const q = query(memoriesRef, orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        const mems: LifeGraphMemory[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          mems.push({
            id: docSnap.id,
            ownerId: data.ownerId || userId,
            type: data.type || "goal",
            title: data.title || "Untitled Node",
            description: data.description || "",
            status: data.status || "active",
            sourceChatId: data.sourceChatId || "",
            sourceMessageIds: data.sourceMessageIds || [],
            relatedEntityIds: data.relatedEntityIds || [],
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          });
        });
        onData(mems);
      },
      (err) => {
        if (onError) onError(err);
        else handleFirestoreError(err, OperationType.LIST, memoriesPath);
      }
    );
  }

  // Local Session
  ensureLocalSeedData(userId);
  const deliver = () => {
    const mems = getLocalData<LifeGraphMemory[]>("memories", []);
    onData([...mems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };
  deliver();
  localListeners.add(deliver);
  return () => {
    localListeners.delete(deliver);
  };
}

export async function saveExtractedMemories(
  userId: string,
  chatId: string,
  extracted: Array<{
    type: LifeGraphMemory["type"];
    title: string;
    description: string;
    status: MemoryStatus;
  }>
): Promise<void> {
  if (!userId || extracted.length === 0) return;
  const nowStr = new Date().toISOString();

  if (auth.currentUser) {
    for (const item of extracted) {
      const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const memoryPath = `users/${userId}/memories/${memoryId}`;
      try {
        await setDoc(doc(db, "users", userId, "memories", memoryId), {
          id: memoryId,
          ownerId: userId,
          type: item.type,
          title: item.title,
          description: item.description,
          status: item.status,
          sourceChatId: chatId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Associated Timeline event
        const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await setDoc(doc(db, "users", userId, "timeline", eventId), {
          id: eventId,
          ownerId: userId,
          title: item.title,
          category: item.type,
          description: item.description,
          sourceChatId: chatId,
          timestamp: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, memoryPath);
      }
    }
    return;
  }

  // Local Session
  const mems = getLocalData<LifeGraphMemory[]>("memories", []);
  const timeline = getLocalData<TimelineEvent[]>("timeline", []);

  for (const item of extracted) {
    const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    mems.unshift({
      id: memoryId,
      ownerId: userId,
      type: item.type,
      title: item.title,
      description: item.description,
      status: item.status,
      sourceChatId: chatId,
      createdAt: nowStr,
      updatedAt: nowStr,
    });

    timeline.unshift({
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ownerId: userId,
      title: item.title,
      category: item.type,
      description: item.description,
      sourceChatId: chatId,
      timestamp: nowStr,
    });
  }

  setLocalData("memories", mems);
  setLocalData("timeline", timeline);
}

export async function updateMemoryStatus(
  userId: string,
  memoryId: string,
  status: MemoryStatus
): Promise<void> {
  const nowStr = new Date().toISOString();

  if (auth.currentUser) {
    const path = `users/${userId}/memories/${memoryId}`;
    try {
      await updateDoc(doc(db, "users", userId, "memories", memoryId), {
        status,
        updatedAt: serverTimestamp(),
      });
      return;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  }

  // Local Session
  const mems = getLocalData<LifeGraphMemory[]>("memories", []);
  const idx = mems.findIndex((m) => m.id === memoryId);
  if (idx !== -1) {
    mems[idx].status = status;
    mems[idx].updatedAt = nowStr;
    setLocalData("memories", mems);
  }
}

export async function deleteMemory(userId: string, memoryId: string): Promise<void> {
  if (auth.currentUser) {
    const path = `users/${userId}/memories/${memoryId}`;
    try {
      await deleteDoc(doc(db, "users", userId, "memories", memoryId));
      return;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }

  // Local Session
  const mems = getLocalData<LifeGraphMemory[]>("memories", []);
  setLocalData(
    "memories",
    mems.filter((m) => m.id !== memoryId)
  );
}

/* ================= INSIGHTS ================= */

export function subscribeInsights(
  userId: string,
  onData: (insights: LifeGraphInsight[]) => void,
  onError?: (err: unknown) => void
): () => void {
  if (!userId) return () => {};

  if (auth.currentUser) {
    const path = `users/${userId}/insights`;
    const q = query(collection(db, "users", userId, "insights"), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        const list: LifeGraphInsight[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            ownerId: data.ownerId || userId,
            category: data.category || "themes",
            title: data.title || "Synthesized Insight",
            summary: data.summary || "",
            evidence: data.evidence || [],
            occurrenceCount: data.occurrenceCount || 1,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          });
        });
        onData(list);
      },
      (err) => {
        if (onError) onError(err);
        else handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  }

  // Local Session
  ensureLocalSeedData(userId);
  const deliver = () => {
    const list = getLocalData<LifeGraphInsight[]>("insights", []);
    onData([...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };
  deliver();
  localListeners.add(deliver);
  return () => {
    localListeners.delete(deliver);
  };
}

export async function saveInsight(
  userId: string,
  insight: Omit<LifeGraphInsight, "id" | "ownerId" | "createdAt">
): Promise<void> {
  const insightId = `ins_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nowStr = new Date().toISOString();

  if (auth.currentUser) {
    const path = `users/${userId}/insights/${insightId}`;
    try {
      await setDoc(doc(db, "users", userId, "insights", insightId), {
        id: insightId,
        ownerId: userId,
        ...insight,
        createdAt: serverTimestamp(),
      });
      return;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  }

  // Local Session
  const list = getLocalData<LifeGraphInsight[]>("insights", []);
  list.unshift({
    id: insightId,
    ownerId: userId,
    ...insight,
    createdAt: nowStr,
  });
  setLocalData("insights", list);
}

/* ================= TIMELINE ================= */

export function subscribeTimeline(
  userId: string,
  onData: (events: TimelineEvent[]) => void,
  onError?: (err: unknown) => void
): () => void {
  if (!userId) return () => {};

  if (auth.currentUser) {
    const path = `users/${userId}/timeline`;
    const q = query(collection(db, "users", userId, "timeline"), orderBy("timestamp", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        const list: TimelineEvent[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            ownerId: data.ownerId || userId,
            title: data.title || "Timeline Event",
            category: data.category || "journal",
            description: data.description || "",
            sourceChatId: data.sourceChatId || "",
            timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
          });
        });
        onData(list);
      },
      (err) => {
        if (onError) onError(err);
        else handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  }

  // Local Session
  ensureLocalSeedData(userId);
  const deliver = () => {
    const list = getLocalData<TimelineEvent[]>("timeline", []);
    onData([...list].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  };
  deliver();
  localListeners.add(deliver);
  return () => {
    localListeners.delete(deliver);
  };
}

/* ================= USER DATA CLEARING (GDPR / Privacy) ================= */

export async function clearAllUserData(userId: string): Promise<void> {
  if (auth.currentUser) {
    // Note: For cloud accounts, collections are cleared sub-item by sub-item
    // In local session:
  }
  if (typeof window !== "undefined") {
    localStorage.removeItem("lifegraph_chats");
    localStorage.removeItem("lifegraph_messages");
    localStorage.removeItem("lifegraph_memories");
    localStorage.removeItem("lifegraph_insights");
    localStorage.removeItem("lifegraph_timeline");
    localStorage.removeItem("lifegraph_seeded_v1");
    notifyLocalChange();
  }
}
