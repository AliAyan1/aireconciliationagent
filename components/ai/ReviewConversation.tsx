"use client";

import { useState } from "react";
import type { MatchResult } from "@/lib/types";

interface ReviewConversationProps {
  match: MatchResult;
}

export function ReviewConversation({ match }: ReviewConversationProps) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>(
    []
  );
  const [loading, setLoading] = useState(false);

  async function send() {
    const q = question.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setQuestion("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/review-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match, question: q }),
      });
      const data = (await res.json()) as { reply?: string };
      setMessages((m) => [
        ...m,
        { role: "ai", text: data.reply ?? "No response." },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "ai", text: "Could not reach AI." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-default bg-input/50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-2">
        Ask AI about this match
      </p>
      {messages.length > 0 && (
        <ul className="mb-3 max-h-32 overflow-y-auto space-y-2 text-sm">
          {messages.map((msg, i) => (
            <li
              key={i}
              className={
                msg.role === "user"
                  ? "text-accent text-right"
                  : "text-secondary text-left"
              }
            >
              {msg.text}
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void send()}
          placeholder="Could this be a duplicate?"
          className="input-field flex-1 px-3 py-2 text-xs"
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={loading || !question.trim()}
          className="btn-primary px-3 py-2 text-xs shrink-0"
        >
          {loading ? "…" : "Ask"}
        </button>
      </div>
    </div>
  );
}
