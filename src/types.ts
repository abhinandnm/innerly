export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface JournalChat {
  id: string;
  ownerId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalMessage {
  id: string;
  ownerId: string;
  role: "user" | "model";
  content: string;
  createdAt: string;
}

export type MemoryType =
  | "goal"
  | "project"
  | "idea"
  | "challenge"
  | "decision"
  | "action"
  | "progress"
  | "theme";

export type MemoryStatus = "active" | "delayed" | "completed" | "abandoned" | "recurring";

export interface LifeGraphMemory {
  id: string;
  ownerId: string;
  type: MemoryType;
  title: string;
  description: string;
  status: MemoryStatus;
  sourceChatId: string;
  sourceMessageIds?: string[];
  relatedEntityIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LifeGraphInsight {
  id: string;
  ownerId: string;
  category: "repeated_goals" | "recurring_blockers" | "progress_shifts" | "commitments" | "themes";
  title: string;
  summary: string;
  evidence: string[];
  occurrenceCount: number;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  ownerId: string;
  title: string;
  category: MemoryType | "journal";
  description: string;
  sourceChatId?: string;
  timestamp: string;
}

export interface PastSelfEvidence {
  title: string;
  date?: string;
  snippet: string;
  sourceChatId?: string;
}

export interface PastSelfResponse {
  answer: string;
  evidence: PastSelfEvidence[];
  hasSufficientEvidence: boolean;
  secretSource: string;
  retrievedCount: number;
}

export interface SecurityDiagnostics {
  status: string;
  authenticatedUid: string;
  email: string | null;
  emailVerified: boolean;
  secretManager: {
    source: string;
    isCachedInMemory: boolean;
    hasValidKey: boolean;
    lastFetchedAt: string | null;
  };
  dataIsolation: {
    enforcedSchema: string;
    scopedToVerifiedUid: string;
    crossUserAccessBlocked: boolean;
  };
  rateLimit: {
    limit: number;
    remaining: number;
    resetInSeconds: number;
  } | null;
}
