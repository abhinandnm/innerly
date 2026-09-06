import React, { useState, useEffect, useRef } from "react";
import { UserProfile, JournalMessage } from "../types";
import { getEffectiveAuthToken } from "../lib/firebase";
import {
  subscribeMessages,
  addMessage,
  deleteMessage,
  saveExtractedMemories,
  createChat,
} from "../lib/dataStore";
import { EntryMarkdown } from "./EntryMarkdown";
import { InnerlySparkle } from "./InnerlyLogo";
import {
  Plus,
  Mic,
  MicOff,
  ArrowUp,
  Sparkles,
  Check,
  Copy,
  Network,
  RotateCcw,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  ChevronDown,
  AlertCircle,
} from "lucide-react";

interface ChatViewProps {
  user: UserProfile;
  chatId: string | null;
  onSelectChat?: (chatId: string) => void;
  onNavigateToLifeGraph?: () => void;
  onStartNewChat?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  user,
  chatId,
  onSelectChat,
  onNavigateToLifeGraph,
  onStartNewChat,
}) => {
  const [messages, setMessages] = useState<JournalMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [extractedNotice, setExtractedNotice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [likedMessageIds, setLikedMessageIds] = useState<string[]>([]);
  const [dislikedMessageIds, setDislikedMessageIds] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [selectedModel, setSelectedModel] = useState("Flash-Lite");
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const displayName = user.displayName ? user.displayName.split(" ")[0] : "there";

  // Subscribe to messages in active chat
  useEffect(() => {
    if (!user.uid || !chatId) {
      setMessages([]);
      return;
    }

    const unsubscribe = subscribeMessages(
      user.uid,
      chatId,
      (msgs) => {
        setMessages(msgs);
      },
      (err) => {
        console.warn("Messages subscription error:", err);
      }
    );

    return () => unsubscribe();
  }, [user.uid, chatId]);

  // Auto-scroll on new messages or loading
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  // Web Speech API for voice input
  const toggleListening = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const requestReflection = async (prompt: string, targetChatId: string, skipAddingUserMessage = false) => {
    if (!prompt || loading || !targetChatId) return;

    setErrorMessage(null);
    setLoading(true);

    try {
      if (!skipAddingUserMessage) {
        await addMessage(user.uid, targetChatId, "user", prompt);
      }

      const idToken = await getEffectiveAuthToken();
      const historyPayload = messages
        .filter((m) => !skipAddingUserMessage || m.content !== prompt)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch("/api/chat/reflect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          chatId: targetChatId,
          prompt,
          history: historyPayload,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 429) {
          throw new Error(
            errorData.message || "Rate limit reached. Please wait a moment before next entry."
          );
        }
        throw new Error(
          errorData.message || `Reflection failed with server status ${res.status}`
        );
      }

      const data = await res.json();
      await addMessage(user.uid, targetChatId, "model", data.reflection);

      if (Array.isArray(data.extractedMemories) && data.extractedMemories.length > 0) {
        await saveExtractedMemories(user.uid, targetChatId, data.extractedMemories);
        setExtractedNotice(
          `Extracted ${data.extractedMemories.length} item${
            data.extractedMemories.length > 1 ? "s" : ""
          } to your LifeGraph`
        );
        setTimeout(() => setExtractedNotice(null), 5000);
      }

      setLastFailedPrompt(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record reflection.";
      setErrorMessage(msg);
      setLastFailedPrompt(prompt);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPrompt = input.trim();
    if (!cleanPrompt || loading) return;

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    let activeId = chatId;
    if (!activeId) {
      try {
        const title = cleanPrompt.length > 32 ? `${cleanPrompt.slice(0, 32)}...` : cleanPrompt;
        activeId = await createChat(user.uid, title || "Reflection");
        if (onSelectChat) {
          onSelectChat(activeId);
        }
      } catch (err) {
        console.error("Failed to create new reflection chat:", err);
        return;
      }
    }

    await requestReflection(cleanPrompt, activeId);
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!chatId) return;
    try {
      await deleteMessage(user.uid, chatId, msgId);
    } catch (err) {
      console.warn("Delete message failed:", err);
    }
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleApplyStarterPrompt = (promptText: string) => {
    setInput(promptText);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const toggleLike = (id: string) => {
    setLikedMessageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    setDislikedMessageIds((prev) => prev.filter((item) => item !== id));
  };

  const toggleDislike = (id: string) => {
    setDislikedMessageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    setLikedMessageIds((prev) => prev.filter((item) => item !== id));
  };

  const starterSuggestions = [
    {
      label: "Reflect on my day",
      prompt: "Here is what happened today and what's on my mind: ",
    },
    {
      label: "Unpack a decision",
      prompt: "I'm trying to make an important decision and want to think through the tradeoffs: ",
    },
    {
      label: "Work through a challenge",
      prompt: "I've been feeling stuck on a challenge recently: ",
    },
    {
      label: "Brainstorm next steps",
      prompt: "I have a goal or project I'd like to map out: ",
    },
  ];

  const isChatEmpty = !chatId || messages.length === 0;

  return (
    <div className="flex-1 h-full flex flex-col gemini-ambient-bg text-[#e3e3e3] overflow-hidden relative">
      {/* TOP HEADER: Gemini Style */}
      <header className="h-14 px-4 sm:px-6 flex items-center justify-between shrink-0 select-none z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#e3e3e3]">Innerly</span>
            {/* Model Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                className="flex items-center gap-1 text-[11px] text-[#8e918f] hover:text-[#e3e3e3] hover:bg-[#1e1f20] px-2 py-1 rounded-lg transition"
              >
                <span>{selectedModel}</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showModelDropdown && (
                <div className="absolute left-0 mt-1 w-44 bg-[#1e1f20] border border-white/10 rounded-2xl p-1.5 shadow-2xl z-50 text-xs">
                  <button
                    onClick={() => {
                      setSelectedModel("Flash-Lite");
                      setShowModelDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition ${
                      selectedModel === "Flash-Lite" ? "bg-[#282a2c] text-white" : "text-[#c4c7c5] hover:bg-[#282a2c]/50"
                    }`}
                  >
                    <span>Flash-Lite</span>
                    {selectedModel === "Flash-Lite" && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedModel("Innerly-Pro");
                      setShowModelDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition ${
                      selectedModel === "Innerly-Pro" ? "bg-[#282a2c] text-white" : "text-[#c4c7c5] hover:bg-[#282a2c]/50"
                    }`}
                  >
                    <span>Innerly-Pro (Gemini 2.5)</span>
                    {selectedModel === "Innerly-Pro" && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Right Action Icons */}
        <div className="flex items-center gap-2">
          {onNavigateToLifeGraph && (
            <button
              onClick={onNavigateToLifeGraph}
              title="View LifeGraph"
              className="p-2 rounded-full text-[#c4c7c5] hover:text-white hover:bg-[#1e1f20] transition hidden sm:flex items-center gap-1.5 text-xs"
            >
              <Network className="w-4 h-4 text-indigo-400" />
              <span>LifeGraph</span>
            </button>
          )}

          {onStartNewChat && (
            <button
              onClick={onStartNewChat}
              title="New reflection"
              className="p-2 rounded-full text-[#c4c7c5] hover:text-white hover:bg-[#1e1f20] transition flex items-center gap-1.5 text-xs"
            >
              <Edit3 className="w-4 h-4" />
              <span className="hidden sm:inline">New reflection</span>
            </button>
          )}

          {/* User circular avatar in top right */}
          <div className="ml-1">
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
          </div>
        </div>
      </header>

      {/* Extracted notice banner */}
      {extractedNotice && (
        <div className="mx-4 sm:mx-8 mb-2 p-2.5 bg-[#1e1f20]/90 border border-indigo-500/30 rounded-full text-indigo-200 text-xs flex items-center justify-between px-4 shadow-xl animate-in fade-in z-20">
          <div className="flex items-center gap-2">
            <InnerlySparkle className="w-4 h-4" />
            <span>{extractedNotice}</span>
          </div>
          {onNavigateToLifeGraph && (
            <button
              onClick={onNavigateToLifeGraph}
              className="text-xs text-indigo-300 hover:text-white underline font-medium"
            >
              Inspect Graph ➔
            </button>
          )}
        </div>
      )}

      {/* MAIN VIEW AREA */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 flex flex-col justify-between custom-scrollbar pb-32 md:pb-36">
        {/* EMPTY STATE: Hero journal landing */}
        {isChatEmpty ? (
          <div className="my-auto flex flex-col items-center justify-center text-center max-w-2xl mx-auto w-full pt-10 sm:pt-16">
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-normal text-[#e3e3e3] tracking-tight mb-3 font-sans">
              What&apos;s on your mind?
            </h1>
            <p className="text-[#8e918f] text-sm sm:text-base max-w-md mx-auto mb-8 leading-relaxed">
              Talk freely. I&apos;ll help you reflect, remember, and make sense of your journey.
            </p>

            {/* Central Prompt Pill in Empty State */}
            <div className="w-full max-w-2xl mb-8">
              <form
                onSubmit={handleSendMessage}
                className="bg-[#1e1f20] hover:bg-[#232527] focus-within:bg-[#232527] border border-[#3c4043]/60 focus-within:border-white/20 rounded-full px-4 py-2.5 shadow-2xl transition flex items-center gap-3"
              >
                {/* Left Plus icon */}
                <button
                  type="button"
                  onClick={() => handleApplyStarterPrompt("Reflecting on: ")}
                  title="Add context or prompt"
                  className="p-2 rounded-full text-[#c4c7c5] hover:text-white hover:bg-white/5 transition shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>

                {/* Input Field */}
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Message Innerly..."
                  disabled={loading}
                  className="w-full bg-transparent resize-none border-none outline-none text-[#e3e3e3] placeholder-[#8e918f] text-sm focus:ring-0 leading-relaxed max-h-32 py-1"
                />

                {/* Right controls inside pill: Mic, Send */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Voice Microphone */}
                  <button
                    type="button"
                    onClick={toggleListening}
                    title={isListening ? "Stop listening" : "Voice input"}
                    className={`p-2 rounded-full transition ${
                      isListening
                        ? "bg-rose-500/20 text-rose-400 animate-pulse"
                        : "text-[#c4c7c5] hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  {/* Send Button */}
                  {input.trim().length > 0 && (
                    <button
                      type="submit"
                      disabled={loading}
                      title="Send"
                      className="p-2 rounded-full bg-white text-black hover:bg-slate-200 transition shrink-0 shadow-md"
                    >
                      <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="w-full max-w-xl flex flex-wrap items-center justify-center gap-2 text-xs">
              {starterSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplyStarterPrompt(item.prompt)}
                  className="bg-[#1e1f20]/90 hover:bg-[#282a2c] text-[#c4c7c5] hover:text-white border border-white/5 hover:border-white/10 px-4 py-2 rounded-full transition"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* MESSAGE STREAM */
          <div className="max-w-3xl w-full mx-auto space-y-6 pt-4">
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              const isLiked = likedMessageIds.includes(msg.id);
              const isDisliked = dislikedMessageIds.includes(msg.id);

              return (
                <div
                  key={msg.id}
                  id={`message-bubble-${msg.id}`}
                  className={`flex gap-3.5 group ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {/* Model avatar: The Google Gemini sparkle logo */}
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <InnerlySparkle className="w-6 h-6" />
                    </div>
                  )}

                  <div className={`flex flex-col gap-1.5 max-w-2xl ${isUser ? "items-end" : "items-start"}`}>
                    <div
                      className={`p-4 text-sm leading-relaxed ${
                        isUser
                          ? "bg-[#282a2c] text-[#e3e3e3] rounded-3xl rounded-tr-sm border border-white/5"
                          : "text-[#e3e3e3] bg-transparent pl-0"
                      }`}
                    >
                      {isUser ? (
                        <div className="whitespace-pre-wrap font-sans leading-relaxed">{msg.content}</div>
                      ) : (
                        <EntryMarkdown content={msg.content} />
                      )}
                    </div>

                    {/* Action row underneath response (Gemini style) */}
                    {!isUser && (
                      <div className="flex items-center gap-1 text-[#8e918f] pl-0 pt-0.5">
                        <button
                          onClick={() => toggleLike(msg.id)}
                          title="Good response"
                          className={`p-1.5 rounded-full hover:text-white hover:bg-[#1e1f20] transition ${
                            isLiked ? "text-indigo-400" : ""
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => toggleDislike(msg.id)}
                          title="Bad response"
                          className={`p-1.5 rounded-full hover:text-white hover:bg-[#1e1f20] transition ${
                            isDisliked ? "text-rose-400" : ""
                          }`}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          title="Copy text"
                          className="p-1.5 rounded-full hover:text-white hover:bg-[#1e1f20] transition"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={() => chatId && requestReflection(messages[idx - 1]?.content || "", chatId, true)}
                          title="Regenerate reflection"
                          className="p-1.5 rounded-full hover:text-white hover:bg-[#1e1f20] transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          title="Delete message"
                          className="p-1.5 rounded-full hover:text-rose-400 hover:bg-[#1e1f20] transition opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Thinking / Streaming loader (Gemini Sparkle Spinning) */}
            {loading && (
              <div className="flex gap-3.5 justify-start">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <InnerlySparkle className="w-6 h-6 animate-spin" />
                </div>
                <div className="flex items-center gap-2 py-2 text-xs text-[#8e918f]">
                  <div className="flex space-x-1">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                  </div>
                  <span>Innerly is reflecting...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error Toast */}
      {errorMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 max-w-md w-full px-4 z-40">
          <div className="p-3 bg-rose-950/90 border border-rose-800 rounded-2xl text-rose-200 text-xs flex items-center justify-between gap-3 shadow-2xl">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-300 hover:text-white text-xs font-semibold px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* FLOATING PROMPT PILL (Fixed at bottom when in active conversation) */}
      {!isChatEmpty && (
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5 bg-gradient-to-t from-[#131314] via-[#131314]/90 to-transparent z-30">
          <div className="max-w-3xl mx-auto w-full">
            <form
              onSubmit={handleSendMessage}
              className="bg-[#1e1f20] hover:bg-[#232527] focus-within:bg-[#232527] border border-[#3c4043]/60 focus-within:border-white/20 rounded-full px-4 py-2.5 shadow-2xl transition flex items-center gap-3"
            >
              {/* Plus context button */}
              <button
                type="button"
                onClick={() => handleApplyStarterPrompt("Reflecting on: ")}
                title="Add context"
                className="p-2 rounded-full text-[#c4c7c5] hover:text-white hover:bg-white/5 transition shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Text input */}
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask Innerly"
                disabled={loading}
                className="w-full bg-transparent resize-none border-none outline-none text-[#e3e3e3] placeholder-[#8e918f] text-sm focus:ring-0 leading-relaxed max-h-32 py-1"
              />

              {/* Right controls inside pill: Purple dot, Mic, Send */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.9)]" />

                <button
                  type="button"
                  onClick={toggleListening}
                  title={isListening ? "Stop listening" : "Voice input"}
                  className={`p-2 rounded-full transition ${
                    isListening
                      ? "bg-rose-500/20 text-rose-400 animate-pulse"
                      : "text-[#c4c7c5] hover:text-white hover:bg-white/5"
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {input.trim().length > 0 && (
                  <button
                    type="submit"
                    disabled={loading}
                    title="Send"
                    className="p-2 rounded-full bg-white text-black hover:bg-slate-200 transition shrink-0 shadow-md"
                  >
                    <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                  </button>
                )}
              </div>
            </form>

            <div className="flex items-center justify-between text-[11px] text-[#8e918f] px-4 pt-1.5">
              <span>Innerly may display inaccurate info, so double-check its responses.</span>
              <span className="hidden sm:inline">Private &amp; secure</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating right-edge trigger badge (as shown in the user's screenshot) */}
      {onNavigateToLifeGraph && (
        <button
          onClick={onNavigateToLifeGraph}
          title="Open LifeGraph"
          className="fixed right-3 top-1/2 -translate-y-1/2 z-40 p-2.5 rounded-full bg-[#1e1f20] hover:bg-[#282a2c] border border-white/10 shadow-2xl transition hover:scale-105 group"
        >
          <InnerlySparkle className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        </button>
      )}
    </div>
  );
};
