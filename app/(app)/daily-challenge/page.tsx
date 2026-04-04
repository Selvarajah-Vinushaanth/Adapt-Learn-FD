"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Target, Zap, BookOpen, CheckCircle2, Loader2, RefreshCw,
  ChevronRight, Trophy, Star, Flame,
} from "lucide-react";
import {
  dailyChallenge,
  type DailyChallengeStart,
  type QuizResult,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

interface Answer {
  question_id: number;
  selected_answer: string;
}

type Stage = "loading" | "no_enrollment" | "active" | "submitting" | "results" | "completed";

export default function DailyChallengePage() {
  const { user, updateUser } = useAuthStore();
  const [stage, setStage] = useState<Stage>("loading");
  const [data, setData] = useState<DailyChallengeStart | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [startTime, setStartTime] = useState(0);

  const load = useCallback(async () => {
    setStage("loading");
    setResult(null);
    try {
      const d = await dailyChallenge.start();
      setData(d);
      if (d.state === "no_enrollment") {
        setStage("no_enrollment");
      } else if (d.state === "completed") {
        setStage("completed");
      } else {
        setCurrentQ(0);
        setAnswers([]);
        setSelected(null);
        setStartTime(Date.now());
        setStage("active");
      }
    } catch {
      setStage("no_enrollment");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const questions = data?.questions ?? [];
  const question = questions[currentQ];
  const isLast = currentQ === questions.length - 1;
  const answered = selected !== null;

  const selectOption = (label: string) => {
    if (selected) return;
    setSelected(label);
    setAnswers((prev) => [
      ...prev,
      { question_id: question.id, selected_answer: label },
    ]);
  };

  const next = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((n) => n + 1);
      setSelected(null);
    }
  };

  const finish = async () => {
    setStage("submitting");
    const timeSpent = Math.floor((Date.now() - startTime) / 1_000);
    try {
      const res = await dailyChallenge.submit(data!.quiz_id!, answers, timeSpent);
      setResult(res);
      // Update XP in navbar immediately
      const achievementXp = (res.new_achievements ?? []).reduce((sum: number, a: { xp_reward?: number }) => sum + (a.xp_reward ?? 0), 0);
      updateUser({ xp: (user?.xp ?? 0) + (res.xp_earned ?? 0) + achievementXp });
      setStage("results");
    } catch {
      setStage("active");
    }
  };

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const diffBadge = (d?: string) => {
    if (!d) return "text-emerald-400 bg-emerald-400/10";
    if (d.includes("advanced")) return "text-red-400 bg-red-400/10";
    if (d.includes("intermediate")) return "text-amber-400 bg-amber-400/10";
    return "text-emerald-400 bg-emerald-400/10";
  };

  function PageHeader({ showRefresh = true }: { showRefresh?: boolean }) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
          <Target size={22} className="text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Daily Challenge</h1>
          <p className="text-sm text-[var(--fg-secondary)]">{todayStr}</p>
        </div>
        {showRefresh && (
          <button
            onClick={load}
            className="ml-auto rounded-lg p-2 text-[var(--fg-secondary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)]"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        )}
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (stage === "loading") {
    return (
      <div className="w-full space-y-6 px-4 py-6">
        <PageHeader showRefresh={false} />
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <Loader2 size={36} className="animate-spin text-orange-400" />
          <p className="text-sm text-[var(--fg-secondary)]">
            Preparing your challenge…
          </p>
        </div>
      </div>
    );
  }

  // ── No enrollment ─────────────────────────────────────────────────────────
  if (stage === "no_enrollment") {
    return (
      <div className="w-full space-y-6 px-4 py-6">
        <PageHeader />
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10">
            <Target size={32} className="text-orange-400" />
          </div>
          <div>
            <p className="text-lg font-bold">No daily challenge yet!</p>
            <p className="mt-1 text-sm text-[var(--fg-secondary)]">
              {data?.message ?? "Enroll in a course to unlock daily challenges."}
            </p>
          </div>
          <Link
            href="/courses"
            className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <BookOpen size={15} />
            Browse Courses
          </Link>
        </div>
      </div>
    );
  }

  // ── Active quiz ───────────────────────────────────────────────────────────
  if (stage === "active" || stage === "submitting") {
    const progress =
      ((currentQ + (answered ? 1 : 0)) / Math.max(questions.length, 1)) * 100;

    return (
      <div className="w-full space-y-5 px-4 py-6">
        <PageHeader showRefresh={false} />

        {/* Challenge meta */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--fg-secondary)]">
          <BookOpen size={12} />
          <span>{data?.course_title}</span>
          <span className="text-[var(--fg-muted)]">·</span>
          <span className="font-medium text-[var(--fg)]">{data?.lesson_title}</span>
          {data?.is_review && (
            <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-amber-400">
              Review
            </span>
          )}
          {data?.difficulty && (
            <span className={`rounded-full px-2 py-0.5 capitalize ${diffBadge(data.difficulty)}`}>
              {data.difficulty}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[var(--fg-secondary)]">
            <span>Question {currentQ + 1} of {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-400 to-rose-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        {question && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
            <p className="mb-6 text-base font-semibold leading-snug sm:text-lg">
              {question.question_text}
            </p>
            <div className="space-y-3">
              {question.options.map((opt) => {
                const isSelected = selected === opt.label;
                const locked = selected !== null;
                return (
                  <button
                    key={opt.label}
                    onClick={() => selectOption(opt.label)}
                    disabled={locked || stage === "submitting"}
                    className={`w-full rounded-xl border px-5 py-3.5 text-left text-sm font-medium transition-all
                      ${isSelected
                        ? "border-orange-400 bg-orange-400/10 text-[var(--fg)]"
                        : locked
                        ? "cursor-default border-[var(--border)] bg-[var(--bg-elevated)] opacity-40"
                        : "border-[var(--border)] bg-[var(--bg-elevated)] hover:border-orange-400/50 hover:bg-orange-400/5"
                      }`}
                  >
                    <span
                      className={`mr-3 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold
                        ${isSelected ? "border-orange-400 bg-orange-400 text-white" : "border-current"}`}
                    >
                      {opt.label}
                    </span>
                    {opt.text}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Action button */}
        {answered && (
          <button
            onClick={isLast ? finish : next}
            disabled={stage === "submitting"}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {stage === "submitting" ? (
              <><Loader2 size={16} className="animate-spin" /> Submitting…</>
            ) : isLast ? (
              <><Trophy size={16} /> Finish Challenge</>
            ) : (
              <>Next Question <ChevronRight size={16} /></>
            )}
          </button>
        )}
      </div>
    );
  }

  // ── Results ───────────────────────────────────────────────────────────────
  if (stage === "results" && result) {
    const pct = Math.round(result.score);
    const isPerfect = result.score >= 100;
    const isGood = result.score >= 60;
    const gradientBar = isPerfect
      ? "from-yellow-400 to-orange-400"
      : isGood
      ? "from-emerald-400 to-cyan-400"
      : "from-rose-400 to-orange-400";

    return (
      <div className="w-full space-y-5 px-4 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
            <Target size={22} className="text-orange-400" />
          </div>
          <h1 className="text-2xl font-bold">Challenge Complete!</h1>
        </div>

        {/* Score card */}
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-lg">
          <div className={`h-2 bg-gradient-to-r ${gradientBar}`} />
          <div className="p-6 text-center">
            <div className="mb-2 text-6xl font-black">{pct}%</div>
            <p className="text-[var(--fg-secondary)]">
              {result.correct_answers} / {result.total_questions} correct
            </p>
            {result.message && (
              <p className="mt-1 text-sm text-[var(--fg-secondary)]">{result.message}</p>
            )}
          </div>
          <div className="flex items-center justify-center gap-8 border-t border-[var(--border)] p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400/10">
                <Zap size={17} className="text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-[var(--fg-muted)]">XP Earned</p>
                <p className="font-bold text-yellow-400">+{result.xp_earned} XP</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-400/10">
                <Flame size={17} className="text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-[var(--fg-muted)]">Topic</p>
                <p className="max-w-[140px] truncate text-sm font-semibold">
                  {data?.lesson_title}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* New achievements */}
        {result.new_achievements && result.new_achievements.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
              🏆 New Achievements
            </p>
            {result.new_achievements.map((a) => (
              <div
                key={a.name}
                className="flex items-center gap-3 rounded-xl border border-yellow-400/30 bg-yellow-400/5 p-3"
              >
                <span className="text-2xl">{a.icon}</span>
                <div>
                  <p className="font-semibold text-yellow-400">{a.name}</p>
                  <p className="text-xs text-[var(--fg-secondary)]">
                    {a.description} · +{a.xp_reward} XP
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Per-question breakdown */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
            Review Answers
          </p>
          {result.results.map((r) => (
            <div
              key={r.question_id}
              className={`rounded-xl border p-4 ${
                r.is_correct
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-rose-500/30 bg-rose-500/5"
              }`}
            >
              <div className="mb-1 flex items-start gap-2">
                {r.is_correct ? (
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                ) : (
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-400/20 text-xs font-bold text-rose-400">
                    ✕
                  </span>
                )}
                <p className="text-sm font-medium">{r.question_text}</p>
              </div>
              {!r.is_correct && (
                <div className="mt-1 space-y-0.5 pl-6 text-xs text-[var(--fg-secondary)]">
                  <p>Your answer: <span className="text-rose-400">{r.selected}</span></p>
                  <p>Correct: <span className="text-emerald-400">{r.correct_answer}</span></p>
                </div>
              )}
              {r.explanation && (
                <p className="mt-2 pl-6 text-xs leading-relaxed text-[var(--fg-secondary)]">
                  {r.explanation}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStage("completed")}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ── Completed – 24-hour lock ──────────────────────────────────────────────
  if (stage === "completed") {
    const pct = data?.score != null ? Math.round(data.score) : result ? Math.round(result.score) : null;
    const xpEarned = data?.xp_earned ?? result?.xp_earned ?? null;
    // Always compute tomorrow from the local clock — never rely on API field
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextDateStr = tomorrow.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

    return (
      <div className="w-full space-y-6 px-4 py-6">
        <PageHeader showRefresh={false} />

        {/* Done card */}
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-emerald-500/30 bg-[var(--bg-card)] px-6 py-14 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
            <CheckCircle2 size={34} className="text-emerald-400" />
          </div>

          <div>
            <h2 className="text-xl font-bold">Your daily challenge for today is done!</h2>
            <p className="mt-2 text-sm text-[var(--fg-secondary)]">
              Come back on <span className="font-semibold text-[var(--fg)]">{nextDateStr}</span> for a new challenge.
            </p>
          </div>

          {/* Score + XP pills */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {pct !== null && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-400">
                <Star size={14} /> {pct}% score
              </span>
            )}
            {xpEarned != null && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400/10 px-4 py-1.5 text-sm font-semibold text-yellow-400">
                <Zap size={14} /> +{xpEarned} XP earned
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href="/dashboard"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm font-medium text-[var(--fg-secondary)] transition-colors hover:text-[var(--fg)]"
          >
            Dashboard
          </Link>
          <Link
            href="/courses"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--ring)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <BookOpen size={15} />
            Keep Learning
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
