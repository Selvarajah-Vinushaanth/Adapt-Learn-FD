"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  Send, Loader2, Bot, User, Plus, Trash2, Clock, BookOpen, ChevronLeft, MessageSquare, AlertTriangle,
  Sparkles,
} from "lucide-react";
import { chat, courses, dashboard as dashboardApi, type ChatHistoryItem, type ChatSession, type CourseListItem, type LearnerInsights } from "@/lib/api";

function genSessionId() {
  return "s_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function shortCourseTitle(title: string, max = 36) {
  if (title.length <= max) return title;
  return `${title.slice(0, max - 1)}...`;
}

function DeleteConfirmDialog({
  onConfirm, onCancel,
}: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold">Delete Conversation</h3>
            <p className="text-sm text-[var(--fg-muted)]">This action cannot be undone.</p>
          </div>
        </div>
        <p className="mb-5 text-sm text-[var(--fg-secondary)]">
          Are you sure you want to delete this conversation? All messages will be permanently removed.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-medium transition-colors hover:bg-[var(--bg-elevated)]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const paramCourseId = searchParams.get("course") ? Number(searchParams.get("course")) : undefined;
  const paramPrompt = searchParams.get("prompt") || "";

  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState(paramPrompt);
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState(genSessionId);
  const [courseList, setCourseList] = useState<CourseListItem[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | undefined>(paramCourseId);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [insights, setInsights] = useState<LearnerInsights | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const data = await chat.sessions();
      setSessions(data);
    } catch {
      // ignore
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    courses.list().then(setCourseList).catch(() => {});
    loadSessions();
    dashboardApi.insights().then(setInsights).catch(() => {});
  }, [loadSessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSession = async (session: ChatSession) => {
    try {
      const history = await chat.history(session.session_id);
      setMessages(history.map((h) => ({ role: h.role, content: h.content })));
      setSessionId(session.session_id);
      setSelectedCourse(session.course_id ?? undefined);
      setSidebarOpen(false); // close sidebar/overlay after selecting a chat
    } catch {
      // ignore
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setSending(true);
    try {
      const res = await chat.ask(text, selectedCourse, sessionId);
      if (res.session_id) setSessionId(res.session_id);
      setMessages((m) => [...m, { role: "assistant", content: res.response }]);
      // Refresh sessions list after sending
      loadSessions();
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    }
    setSending(false);
  };

  const newChat = () => {
    setMessages([]);
    setSessionId(genSessionId());
    setSelectedCourse(undefined);
    setSidebarOpen(false);
  };

  const requestDeleteSession = (sid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(sid);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    const sid = confirmDeleteId;
    setConfirmDeleteId(null);
    setDeletingId(sid);
    try {
      await chat.deleteSession(sid);
      setSessions((prev) => prev.filter((s) => s.session_id !== sid));
      if (sid === sessionId) newChat();
    } catch {
      // ignore
    }
    setDeletingId(null);
  };

  const activeSession = sessions.find((s) => s.session_id === sessionId);

  return (
    <>
    {confirmDeleteId && (
      <DeleteConfirmDialog
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    )}
    {/* Mobile backdrop when sidebar open — starts below navbar */}
    {sidebarOpen && (
      <div
        className="fixed inset-x-0 bottom-0 top-16 z-40 bg-black/50 backdrop-blur-sm md:hidden"
        onClick={() => setSidebarOpen(false)}
      />
    )}
    <div className="flex h-[calc(100vh-4rem)] w-full gap-0 overflow-hidden border-0 sm:rounded-2xl sm:border border-[var(--border)]">
      {/* ── Sidebar ── */}
      <aside
        className={[
          "flex flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)] transition-all duration-200",
          sidebarOpen
            ? "fixed top-16 left-0 bottom-0 z-50 flex w-[85vw] max-w-xs shadow-2xl md:relative md:top-auto md:bottom-auto md:left-auto md:z-auto md:w-72 md:max-w-none md:shadow-none"
            : "hidden md:flex md:w-0 md:min-w-0 md:overflow-hidden",
        ].join(" ")}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <span className="text-sm font-semibold">Chat History</span>
          <button
            onClick={newChat}
            className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-2.5 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90"
          >
            <Plus size={13} /> New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingSessions ? (
            <div className="flex items-center justify-center py-8 text-[var(--fg-muted)]">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-[var(--fg-muted)]">
              <MessageSquare size={28} />
              <p className="text-xs">No past conversations</p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {sessions.map((s) => (
                <li
                  key={s.session_id}
                  onClick={() => loadSession(s)}
                  className={`group relative cursor-pointer px-3 py-2.5 transition-colors hover:bg-[var(--bg-elevated)] ${
                    s.session_id === sessionId ? "bg-[var(--bg-elevated)]" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium leading-snug">
                        {s.preview || "Empty chat"}
                      </p>
                      {s.course_title && (
                        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-violet-500">
                          <BookOpen size={10} />
                          {s.course_title}
                        </p>
                      )}
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--fg-muted)]">
                        <Clock size={10} />
                        {formatRelativeTime(s.last_message_at)}
                        <span className="ml-1 rounded-full bg-[var(--border)] px-1.5 py-0.5 text-[10px]">
                          {s.message_count} {s.message_count === 1 ? "question" : "questions"}
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={(e) => requestDeleteSession(s.session_id, e)}
                      className="mt-0.5 shrink-0 rounded p-1 text-[var(--fg-muted)] opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                      title="Delete session"
                    >
                      {deletingId === s.session_id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Trash2 size={12} />
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* ── Main chat ── */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[var(--bg-card)]">
        {/* Header — 3 horizontal items: [toggle+AI Tutor] [course dropdown] [+New Chat] */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5 sm:px-4">
          {/* 1 – Sidebar toggle + AI Tutor identity */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="shrink-0 rounded-lg border border-[var(--border)] p-1.5 transition-colors hover:bg-[var(--bg-elevated)]"
              title={sidebarOpen ? "Hide history" : "Show history"}
            >
              <ChevronLeft
                size={16}
                className={`transition-transform duration-200 ${sidebarOpen ? "" : "rotate-180"}`}
              />
            </button>
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500">
                <Bot size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold leading-tight">AI Tutor</h1>
                <p className="truncate text-[11px] text-[var(--fg-muted)]">
                  {activeSession ? "Continuing conversation" : "New conversation"}
                </p>
              </div>
            </div>
          </div>

          {/* 2 – Course selector */}
          {courseList.length > 0 && (
            <select
              value={selectedCourse ?? ""}
              onChange={(e) =>
                setSelectedCourse(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-32 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-1.5 text-xs outline-none focus:border-[var(--ring)] sm:w-44"
            >
              <option value="">General</option>
              {courseList.map((c) => (
                <option key={c.id} value={c.id}>
                  {shortCourseTitle(c.title)}
                </option>
              ))}
            </select>
          )}

          {/* 3 – New Chat */}
          <button
            onClick={newChat}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--bg-elevated)] sm:gap-1.5 sm:px-3"
          >
            <Plus size={13} />
            <span className="hidden sm:inline">New Chat</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Bot size={48} className="mb-3 text-[var(--fg-muted)]" />
              <p className="mb-1 font-semibold">Start a conversation</p>
              <p className="max-w-sm text-sm text-[var(--fg-secondary)]">
                Ask questions about any topic, get explanations, or discuss course material.
                {selectedCourse ? " I'll use your course context for better answers." : ""}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {(() => {
                  const selectedCourseObj = courseList.find((c) => c.id === selectedCourse);
                  const prompts: string[] = [];
                  if (selectedCourseObj) {
                    prompts.push(`Explain the key concepts of ${selectedCourseObj.title}`);
                    prompts.push(`Give me practice problems for ${selectedCourseObj.title}`);
                    prompts.push(`What are common mistakes in ${selectedCourseObj.topic}?`);
                    prompts.push(`Summarize what I've learned so far`);
                  } else {
                    if (insights?.areas_summary && !insights.areas_summary.includes("No weak areas")) {
                      const area = insights.areas_summary.split(".")[0];
                      if (area.length < 80) prompts.push(`Help me understand: ${area}`);
                    }
                    prompts.push("Explain this concept simply");
                    prompts.push("Give me practice problems");
                    if (prompts.length < 4) prompts.push("What should I learn next?");
                    if (prompts.length < 4) prompts.push("Summarize the key points");
                  }
                  return prompts.slice(0, 4).map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs transition-colors hover:border-[var(--ring)]/30"
                    >
                      {s}
                    </button>
                  ));
                })()}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  m.role === "user"
                    ? "bg-[var(--ring)]/10 text-[var(--ring)]"
                    : "bg-gradient-to-br from-violet-600 to-cyan-500 text-white"
                }`}
              >
                {m.role === "user" ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-[11px] leading-relaxed sm:text-sm ${
                  m.role === "user"
                    ? "bg-[var(--ring)] text-white"
                    : "bg-[var(--bg-elevated)] text-[var(--fg)]"
                }`}
              >
                {m.role === "assistant" ? (
                  <div className="lesson-content">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 text-white">
                <Bot size={16} />
              </div>
              <div className="rounded-2xl bg-[var(--bg-elevated)] px-4 py-3">
                <Loader2 size={18} className="animate-spin text-[var(--ring)]" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[var(--border)] p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Type your message..."
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm outline-none transition-colors placeholder:text-[var(--fg-muted)] focus:border-[var(--ring)]"
              disabled={sending}
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white transition-opacity disabled:opacity-40"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
