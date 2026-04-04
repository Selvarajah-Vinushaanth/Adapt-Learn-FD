"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen, Loader2, CheckCircle2, Clock, RotateCcw,
  Brain, ChevronRight, AlertCircle,
} from "lucide-react";
import { dashboard, type RevisionItem } from "@/lib/api";

export default function RevisionsPage() {
  const [items, setItems] = useState<RevisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [showConcept, setShowConcept] = useState<number | null>(null);

  const load = () => {
    dashboard
      .revisions()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const review = async (id: number, quality: number) => {
    setReviewing(id);
    try {
      const updated = await dashboard.reviewRevision(id, quality);
      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
      setShowConcept(null);
    } catch {}
    setReviewing(null);
  };

  const dueItems = items.filter((it) => new Date(it.next_review_date) <= new Date());
  const upcomingItems = items.filter((it) => new Date(it.next_review_date) > new Date());

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--ring)]" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold">Spaced Repetition</h1>
        <p className="text-sm text-[var(--fg-secondary)]">
          Concepts you struggled with in quizzes appear here automatically.
          Review them at optimal intervals to build long-term retention.
        </p>
      </div>

      {/* How it works (shown when no items) */}
      {items.length === 0 && !loading && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <h3 className="mb-3 font-semibold">How Spaced Repetition Works</h3>
          <div className="space-y-2 text-sm text-[var(--fg-secondary)]">
            <p>1. <strong>Take quizzes</strong> on your enrolled courses.</p>
            <p>2. Concepts you scored below 60% on are <strong>automatically added</strong> here for review.</p>
            <p>3. When a concept appears as &ldquo;Due&rdquo;, rate how well you remember it (Forgot → Perfect).</p>
            <p>4. The <strong>SM-2 algorithm</strong> schedules the next review — well-remembered items appear less often, forgotten ones appear sooner.</p>
            <p>5. Over time, you&rsquo;ll <strong>master</strong> every weak concept through spaced practice.</p>
          </div>
        </div>
      )}

      {/* Due Now */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <AlertCircle size={18} className="text-amber-500" />
          <h2 className="font-semibold">Due Now ({dueItems.length})</h2>
        </div>
        {dueItems.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-card)]">
            <CheckCircle2 size={32} className="mb-2 text-emerald-500" />
            <p className="font-medium">All caught up!</p>
            <p className="text-sm text-[var(--fg-secondary)]">No reviews due right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dueItems.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                      <Brain size={20} />
                    </div>
                    <div>
                      <p className="font-semibold">{item.concept}</p>
                      {(item.lesson_title || item.course_title) && (
                        <p className="text-xs text-[var(--fg-secondary)]">
                          {item.course_title && <span>{item.course_title}</span>}
                          {item.course_title && item.lesson_title && <span> · </span>}
                          {item.lesson_title && <span>{item.lesson_title}</span>}
                        </p>
                      )}
                      <p className="text-xs text-[var(--fg-muted)]">
                        Repetition #{item.repetitions} · Interval: {item.interval_days}d
                      </p>
                      {/* Mastery indicator */}
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                          <div
                            className={`h-full rounded-full transition-all ${
                              item.interval_days >= 30 ? "bg-emerald-500" : item.interval_days >= 7 ? "bg-blue-500" : "bg-amber-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.round((item.interval_days / 30) * 100))}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[var(--fg-muted)]">
                          {item.interval_days >= 30 ? "Mastered" : item.interval_days >= 7 ? "Learning" : "New"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowConcept(showConcept === item.id ? null : item.id)}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--bg-elevated)]"
                  >
                    {showConcept === item.id ? "Hide" : "Review"}
                  </button>
                </div>
                {showConcept === item.id && (
                  <div className="border-t border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                    <p className="mb-1 text-sm font-medium">
                      Think about: <span className="text-[var(--ring)]">{item.concept}</span>
                    </p>
                    <p className="mb-4 text-sm text-[var(--fg-secondary)]">
                      Try to recall the key ideas about this concept from{item.lesson_title ? ` the "${item.lesson_title}" lesson` : " your course"}.
                      Then rate how well you remembered it:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { q: 0, label: "Forgot", color: "bg-red-500/10 text-red-500 border-red-500/30", tip: "Complete blackout — resets interval to 1 day" },
                        { q: 1, label: "Barely", color: "bg-orange-500/10 text-orange-500 border-orange-500/30", tip: "Recognized it but couldn't recall — short interval" },
                        { q: 2, label: "Hard", color: "bg-amber-500/10 text-amber-500 border-amber-500/30", tip: "Recalled with significant effort — slight interval increase" },
                        { q: 3, label: "Okay", color: "bg-blue-500/10 text-blue-500 border-blue-500/30", tip: "Recalled after some thought — moderate interval increase" },
                        { q: 4, label: "Good", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30", tip: "Recalled with minor hesitation — good interval increase" },
                        { q: 5, label: "Perfect", color: "bg-green-500/10 text-green-500 border-green-500/30", tip: "Instant, effortless recall — large interval increase" },
                      ].map((opt) => (
                        <button
                          key={opt.q}
                          onClick={() => review(item.id, opt.q)}
                          disabled={reviewing === item.id}
                          title={opt.tip}
                          className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${opt.color} disabled:opacity-50`}
                        >
                          {reviewing === item.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            opt.label
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming */}
      {upcomingItems.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Clock size={18} className="text-[var(--fg-muted)]" />
            <h2 className="font-semibold">Upcoming ({upcomingItems.length})</h2>
          </div>
          <div className="space-y-2">
            {upcomingItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4"
              >
                <div className="flex items-center gap-3">
                  <BookOpen size={18} className="text-[var(--fg-muted)]" />
                  <div>
                    <p className="text-sm font-medium">{item.concept}</p>
                    {(item.lesson_title || item.course_title) && (
                      <p className="text-xs text-[var(--fg-secondary)]">
                        {item.course_title}{item.course_title && item.lesson_title ? " · " : ""}{item.lesson_title}
                      </p>
                    )}
                    <p className="text-xs text-[var(--fg-muted)]">
                      Next: {new Date(item.next_review_date).toLocaleDateString()} · Rep #{item.repetitions}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                    <div
                      className={`h-full rounded-full ${
                        item.interval_days >= 30 ? "bg-emerald-500" : item.interval_days >= 7 ? "bg-blue-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.round((item.interval_days / 30) * 100))}%` }}
                    />
                  </div>
                  <span className="text-xs text-[var(--fg-muted)]">{item.interval_days}d</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && !loading && (
        <div className="flex h-60 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-card)]">
          <RotateCcw size={40} className="mb-3 text-[var(--fg-muted)]" />
          <p className="font-semibold">No revision items yet</p>
          <p className="mb-4 text-center text-sm text-[var(--fg-secondary)]">
            Concepts you score below 60% on in quizzes will automatically<br />
            appear here for spaced repetition review.
          </p>
          <Link
            href="/courses"
            className="flex items-center gap-1 text-sm font-medium text-[var(--ring)] hover:underline"
          >
            Go to Courses <ChevronRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
