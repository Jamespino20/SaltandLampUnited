"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  PaperPlaneRight,
  Sparkle,
  Plus,
  Trash,
  SpinnerGap,
  List,
  X,
} from "@phosphor-icons/react";
import { Markdown } from "@/lib/markdown";
import { getChatSessionId } from "@/lib/chat-session";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  transient?: boolean;
  messages?: Message[];
}

const SUGGESTED = [
  "What is SLU's mission?",
  "How can I join a group?",
  "What events are coming up?",
  "Explain the Trinity simply",
];

export default function ChatPage() {
  const [sessionId, setSessionId] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSessionId(getChatSessionId());
  }, []);

  const fetchList = useCallback(async (sid: string) => {
    try {
      const res = await fetch(
        `/api/chat/conversations?sessionId=${encodeURIComponent(sid)}`
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setConversations(data.data);
      }
    } catch {
      // stay empty — API falls back gracefully
    }
  }, []);

  useEffect(() => {
    if (sessionId) fetchList(sessionId);
  }, [sessionId, fetchList]);

  // Deep-link (?c=id) from the widget handoff, or a sessionStorage QnA
  // handoff when the widget had no persisted conversation.
  useEffect(() => {
    if (!sessionId) return;
    const params = new URLSearchParams(window.location.search);
    const target = params.get("c");
    if (target) {
      selectConversation(target);
      return;
    }
    let handoff: { role: string; content: string }[] | null = null;
    try {
      const raw = sessionStorage.getItem("slu-handoff");
      if (raw) {
        handoff = JSON.parse(raw);
        sessionStorage.removeItem("slu-handoff");
      }
    } catch {
      handoff = null;
    }
    if (handoff && handoff.length > 0) {
      (async () => {
        try {
          const firstUser = handoff.find((m) => m.role === "user");
          const res = await fetch("/api/chat/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              title: firstUser?.content.slice(0, 60) ?? "New chat",
              messages: handoff,
            }),
          });
          const data = await res.json();
          if (data.success && data.data?.id && !data.data.transient) {
            fetchList(sessionId);
            selectConversation(data.data.id as string);
          } else {
            setMessages(
              handoff.map((m, i) => ({
                id: `handoff-${i}`,
                role: m.role === "user" ? "user" : "assistant",
                content: m.content,
              }))
            );
          }
        } catch {
          // stay on empty state — user can still chat
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function selectConversation(id: string) {
    setActiveId(id);
    setSidebarOpen(false);
    if (id.startsWith("local-")) {
      setMessages([]);
      return;
    }
    try {
      const url = sessionId
        ? `/api/chat/conversations/${id}?sessionId=${encodeURIComponent(sessionId)}`
        : `/api/chat/conversations/${id}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.data?.messages) {
        setMessages(
          data.data.messages.map(
            (m: { id: string; role: string; content: string }) => ({
              id: m.id,
              role: m.role === "user" ? "user" : "assistant",
              content: m.content,
            })
          )
        );
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    }
  }

  async function newChat() {
    if (!sessionId) return;
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, title: "New chat" }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const convo: Conversation = data.data;
        if (!convo.transient) {
          setConversations((prev) => [convo, ...prev]);
        }
        setActiveId(convo.id);
        setMessages([]);
      } else {
        setActiveId(`local-${Date.now()}`);
        setMessages([]);
      }
    } catch {
      setActiveId(`local-${Date.now()}`);
      setMessages([]);
    }
    setSidebarOpen(false);
  }

  async function deleteConversation(id: string) {
    try {
      if (!id.startsWith("local-")) {
        await fetch(`/api/chat/conversations/${id}`, { method: "DELETE" });
      }
    } catch {
      // ignore
    }
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    let convoId = activeId;
    if (!convoId) {
      // Auto-create a conversation first (best effort)
      try {
        const res = await fetch("/api/chat/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            title: text.slice(0, 60),
          }),
        });
        const data = await res.json();
        if (data.success && data.data) {
          convoId = data.data.id as string;
          setActiveId(convoId);
          if (!data.data.transient) {
            setConversations((prev) => [data.data, ...prev]);
          }
        }
      } catch {
        convoId = `local-${Date.now()}`;
        setActiveId(convoId);
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };
    const payload = [...messages.slice(-20), userMessage].map(
      ({ role, content }) => ({ role, content })
    );
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payload,
          sessionId,
          conversationId: convoId,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.success
            ? data.data.content
            : data.error ?? "Sorry, something went wrong.",
        },
      ]);
      if (sessionId) fetchList(sessionId);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I couldn't reach the server. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-dvh bg-slu-offwhite text-slu-black">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slu-gray-200 bg-white transition-transform duration-300 md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4">
          <Link href="/" className="text-sm font-bold text-slu-blue">
            ← Salt and Lamp
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-slu-gray-500 hover:bg-slu-gray-100 md:hidden"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-4 pb-2">
          <button
            type="button"
            onClick={newChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slu-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slu-blue-dark"
          >
            <Plus size={16} /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {conversations.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-slu-gray-400">
              No conversations yet.
            </p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={`group mb-1 flex items-center gap-1 rounded-lg px-2 py-2 text-sm ${
                  activeId === c.id
                    ? "bg-slu-blue/10 font-medium text-slu-blue"
                    : "text-slu-gray-600 hover:bg-slu-gray-100"
                }`}
              >
                <button
                  type="button"
                  onClick={() => selectConversation(c.id)}
                  className="flex-1 truncate text-left"
                >
                  {c.title || "Untitled chat"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteConversation(c.id)}
                  className="rounded p-1 text-slu-gray-400 opacity-0 hover:text-red-500 group-hover:opacity-100"
                  aria-label="Delete conversation"
                >
                  <Trash size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slu-gray-200 bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slu-gray-600 hover:bg-slu-gray-100 md:hidden"
            aria-label="Open sidebar"
          >
            <List size={18} />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slu-blue/10 text-slu-blue">
            <Sparkle size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold">Lampy</h1>
            <p className="text-xs text-slu-gray-500">
              Your Salt and Lamp United assistant
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-3xl space-y-5">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center pt-10 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slu-blue/10 text-slu-blue">
                  <Sparkle size={28} />
                </div>
                <h2 className="text-xl font-bold">
                  Salt and Shine! I&apos;m Lampy.
                </h2>
                <p className="mt-1 max-w-md text-sm text-slu-gray-500">
                  Ask me anything about Salt and Lamp United — or try a
                  suggestion below.
                </p>
                <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
                  {SUGGESTED.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setInput(s)}
                      className="rounded-xl border border-slu-gray-200 bg-white px-4 py-3 text-left text-sm text-slu-gray-700 transition-colors hover:border-slu-blue hover:text-slu-blue"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="mr-3 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slu-blue/10 text-slu-blue">
                      <Sparkle size={16} />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%] ${
                      msg.role === "user"
                        ? "rounded-br-sm bg-slu-blue text-white"
                        : "rounded-bl-sm border border-slu-gray-200 bg-white"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <Markdown content={msg.content} />
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slu-gray-200 bg-white px-4 py-3 text-sm text-slu-gray-500">
                  <SpinnerGap size={16} className="animate-spin" />
                  Lampy is thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-slu-gray-200 bg-white px-4 py-3">
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-3xl items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Lampy..."
              className="flex-1 rounded-full border border-slu-gray-200 bg-slu-offwhite px-4 py-2.5 text-sm focus:border-slu-blue focus:outline-none focus:ring-2 focus:ring-slu-blue/20"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slu-blue text-white transition-colors hover:bg-slu-blue-dark disabled:opacity-40"
              aria-label="Send"
            >
              {isLoading ? (
                <SpinnerGap size={16} className="animate-spin" />
              ) : (
                <PaperPlaneRight size={16} />
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
