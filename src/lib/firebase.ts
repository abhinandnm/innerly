import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { UserProfile } from "../types";

// Configure same-origin authDomain in browser if possible, fallback to config
const appConfig = {
  ...firebaseConfig,
  authDomain: typeof window !== "undefined" && window.location.host
    ? window.location.host
    : firebaseConfig.authDomain,
};

const app = initializeApp(appConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const LOCAL_USER_STORAGE_KEY = "life_graph_local_user";

export function getLocalSession(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(LOCAL_USER_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as UserProfile;
  } catch {
    return null;
  }
}

export function createLocalSession(name?: string): UserProfile {
  const profile: UserProfile = {
    uid: "local_journal_owner",
    email: "private@journal.local",
    displayName: name || "Private Journal Owner",
    photoURL: null,
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_USER_STORAGE_KEY, JSON.stringify(profile));
  }
  return profile;
}

export function clearLocalSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(LOCAL_USER_STORAGE_KEY);
  }
}

export async function getEffectiveAuthToken(): Promise<string> {
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    if (token) return token;
  }

  const local = getLocalSession();
  if (local) {
    return "local_session_token_verified";
  }

  throw new Error("No active session found. Please sign in or start a private session.");
}

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return true;
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firebase client is offline or network is restricted.");
    }
    return false;
  }
}

export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await signInWithPopup(auth, provider);
}

export async function logoutUser(): Promise<void> {
  clearLocalSession();
  try {
    if (auth.currentUser) {
      await signOut(auth);
    }
  } catch (err) {
    console.warn("Sign out warning:", err);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("innerly:logout"));
  }
}

