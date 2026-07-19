"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ConversationSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

export default function ChatApp({
  userName,
  initialConversationId,
  initialMessages,
}: {
  userName: string;
  initialConversationId: string | null;
  initialMessages: ChatMessage[];
}) {
  const router = useRouter();
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConversationId(initialConversationId);
    setMessages(initialMessages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversationId]);

  useEffect(() => {
    refreshConversations();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function refreshConversations() {
    const res = await fetch("/api/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations);
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);

    let activeConversationId = conversationId;

    if (!activeConversationId) {
      const res = await fetch("/api/conversations", { method: "POST" });
      const data = await res.json();
      activeConversationId = data.conversation.id;
      setConversationId(activeConversationId);
      router.replace(`/chat/${activeConversationId}`);
    }

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, userMessage, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeConversationId, message: text }),
      });

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m)),
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Sorry — something went wrong. Please try again." }
            : m,
        ),
      );
    } finally {
      setSending(false);
      refreshConversations();
    }
  }

  function startNewChat() {
    setConversationId(null);
    setMessages([]);
    router.push("/chat");
  }

  return (
    <div className="flex h-screen w-full bg-neutral-50">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 p-4">
          <h1 className="text-sm font-semibold text-neutral-900">TaxGuide</h1>
          <p className="text-xs text-neutral-500">Signed in as {userName}</p>
        </div>
        <button
          onClick={startNewChat}
          className="m-3 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          + New conversation
        </button>
        <nav className="flex-1 space-y-1 overflow-y-auto px-2">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push(`/chat/${c.id}`)}
              className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm ${
                c.id === conversationId
                  ? "bg-neutral-200 text-neutral-900"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {c.title}
            </button>
          ))}
        </nav>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="m-3 rounded-lg px-3 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-100"
        >
          Sign out
        </button>
      </aside>

      {/* Main chat area */}
      <main className="flex flex-1 flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
            {messages.length === 0 && (
              <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
                <p className="mb-2 font-medium text-neutral-900">
                  Hi! I&apos;m TaxGuide, here to help you understand and prepare for your small
                  business tax filing.
                </p>
                <p>
                  Tell me about your business — entity type, state, and roughly how much you made
                  this year — and I&apos;ll walk you through the rest.
                </p>
                <p className="mt-3 text-xs text-neutral-400">
                  Educational estimates only — not a substitute for a licensed CPA or EA.
                </p>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-neutral-900 text-white"
                      : "border border-neutral-200 bg-white text-neutral-800"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none prose-neutral prose-table:text-xs">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content || "…"}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        <form onSubmit={handleSend} className="border-t border-neutral-200 bg-white p-4">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Ask about your business taxes…"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
