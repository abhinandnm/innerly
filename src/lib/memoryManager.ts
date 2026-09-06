import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { LifeGraphMemory, TimelineEvent, LifeGraphInsight, MemoryStatus } from "../types";
import { handleFirestoreError, OperationType } from "./firestoreErrorHandler";

export async function saveExtractedMemories(
  uid: string,
  chatId: string,
  extracted: Array<{
    type: LifeGraphMemory["type"];
    title: string;
    description: string;
    status: MemoryStatus;
  }>
): Promise<void> {
  if (!uid || extracted.length === 0) return;

  for (const item of extracted) {
    const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const memoryPath = `users/${uid}/memories/${memoryId}`;
    const memoryRef = doc(db, "users", uid, "memories", memoryId);

    try {
      await setDoc(memoryRef, {
        id: memoryId,
        ownerId: uid,
        type: item.type,
        title: item.title,
        description: item.description,
        status: item.status,
        sourceChatId: chatId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Also create a timeline event for this memory
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const eventRef = doc(db, "users", uid, "timeline", eventId);
      await setDoc(eventRef, {
        id: eventId,
        ownerId: uid,
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
}

export async function updateMemoryStatus(
  uid: string,
  memoryId: string,
  status: MemoryStatus
): Promise<void> {
  const path = `users/${uid}/memories/${memoryId}`;
  try {
    const memoryRef = doc(db, "users", uid, "memories", memoryId);
    await updateDoc(memoryRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteMemory(uid: string, memoryId: string): Promise<void> {
  const path = `users/${uid}/memories/${memoryId}`;
  try {
    await deleteDoc(doc(db, "users", uid, "memories", memoryId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveInsight(
  uid: string,
  insight: Omit<LifeGraphInsight, "id" | "ownerId" | "createdAt">
): Promise<void> {
  const insightId = `ins_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `users/${uid}/insights/${insightId}`;
  try {
    await setDoc(doc(db, "users", uid, "insights", insightId), {
      id: insightId,
      ownerId: uid,
      ...insight,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function clearAllUserMemories(uid: string, memoryIds: string[]): Promise<void> {
  for (const mid of memoryIds) {
    await deleteMemory(uid, mid);
  }
}
