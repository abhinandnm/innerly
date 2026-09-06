export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface ClientMemoryInput {
  id?: string;
  type: string;
  title: string;
  description: string;
  status: string;
  sourceChatId?: string;
  createdAt?: string;
}

export function sanitizePrompt(text: string): string {
  if (!text || typeof text !== "string") return "";

  let clean = text.slice(0, 4000);

  // Neutralize delimiter injection markers
  clean = clean.replace(/<\/?user_journal_entry>/gi, "[filtered_tag]");
  clean = clean.replace(/<\/?system_instruction>/gi, "[filtered_tag]");
  clean = clean.replace(/<\/?internal_prompt>/gi, "[filtered_tag]");
  clean = clean.replace(/<\/?retrieved_journal_data>/gi, "[filtered_tag]");
  clean = clean.replace(/<\/?security_notice>/gi, "[filtered_tag]");

  return clean.trim();
}

export function validateChatPayload(body: unknown): {
  isValid: boolean;
  message?: string;
  chatId?: string;
  history?: ChatMessage[];
  prompt?: string;
} {
  if (!body || typeof body !== "object") {
    return { isValid: false, message: "Request body must be a JSON object." };
  }

  const { chatId, prompt, history } = body as Record<string, unknown>;

  if (!chatId || typeof chatId !== "string" || chatId.trim().length === 0 || chatId.length > 128) {
    return { isValid: false, message: "Invalid or missing 'chatId' parameter (max 128 chars)." };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(chatId)) {
    return { isValid: false, message: "'chatId' contains illegal characters. Only alphanumeric, hyphens, and underscores are allowed." };
  }

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return { isValid: false, message: "Prompt must be a non-empty string." };
  }

  if (prompt.length > 4000) {
    return { isValid: false, message: "Prompt exceeds maximum allowed length of 4000 characters." };
  }

  const validHistory: ChatMessage[] = [];
  if (Array.isArray(history)) {
    const recentHistory = history.slice(-15);
    for (const item of recentHistory) {
      if (item && typeof item === "object") {
        const role = item.role;
        const content = item.content;
        if ((role === "user" || role === "model") && typeof content === "string") {
          validHistory.push({
            role,
            content: content.slice(0, 4000),
          });
        }
      }
    }
  }

  return {
    isValid: true,
    chatId: chatId.trim(),
    prompt: sanitizePrompt(prompt),
    history: validHistory,
  };
}

export function validatePastSelfPayload(body: unknown): {
  isValid: boolean;
  message?: string;
  question?: string;
  memories?: ClientMemoryInput[];
} {
  if (!body || typeof body !== "object") {
    return { isValid: false, message: "Request body must be a JSON object." };
  }

  const { question, memories } = body as Record<string, unknown>;

  if (!question || typeof question !== "string" || question.trim().length === 0) {
    return { isValid: false, message: "Question must be a non-empty string." };
  }

  if (question.length > 1000) {
    return { isValid: false, message: "Question exceeds maximum limit of 1000 characters." };
  }

  const sanitizedMemories: ClientMemoryInput[] = [];
  if (Array.isArray(memories)) {
    // Limit to 50 memories to keep token limits safe and retrieval bounded
    for (const m of memories.slice(0, 50)) {
      if (m && typeof m === "object") {
        const title = typeof m.title === "string" ? sanitizePrompt(m.title).slice(0, 200) : "";
        const description = typeof m.description === "string" ? sanitizePrompt(m.description).slice(0, 1000) : "";
        const type = typeof m.type === "string" ? sanitizePrompt(m.type).slice(0, 50) : "memory";
        const status = typeof m.status === "string" ? sanitizePrompt(m.status).slice(0, 50) : "active";
        const sourceChatId = typeof m.sourceChatId === "string" ? m.sourceChatId.slice(0, 128) : undefined;
        const createdAt = typeof m.createdAt === "string" ? m.createdAt.slice(0, 50) : undefined;

        if (title.length > 0) {
          sanitizedMemories.push({
            id: typeof m.id === "string" ? m.id.slice(0, 128) : undefined,
            type,
            title,
            description,
            status,
            sourceChatId,
            createdAt,
          });
        }
      }
    }
  }

  return {
    isValid: true,
    question: sanitizePrompt(question),
    memories: sanitizedMemories,
  };
}
