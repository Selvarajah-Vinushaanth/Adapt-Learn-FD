"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, ArrowRight,
  Trophy, Zap, AlertTriangle, Clock, RotateCcw, BookOpen, Lightbulb,
} from "lucide-react";
import { quizzes, courses, type Quiz, type QuizResult } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { scoreColor } from "@/lib/utils";

export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const quizId = Number(id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId") ? Number(searchParams.get("courseId")) : null;
  const lessonId = searchParams.get("lessonId") ? Number(searchParams.get("lessonId")) : null;

  const { user, updateUser } = useAuthStore();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [retakeLoading, setRetakeLoading] = useState(false);
  const [nextLesson, setNextLesson] = useState<{ id: number; title: string; moduleId: number } | null>(null);
  const [hintsUsed, setHintsUsed] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (result) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [result, startTime]);

  useEffect(() => {
    quizzes
      .get(quizId)
      .then(setQuiz)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [quizId]);

  const handleSelect = (questionId: number, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    setSubmitting(true);
    try {
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      const formatted = quiz.questions.map((q) => ({
        question_id: q.id,
        selected_answer: answers[q.id] || "",
      }));
      const res = await quizzes.submit(quizId, formatted, timeSpent);
      setResult(res);
      // Update XP in navbar immediately so users see the change here, not on the next page
      const achievementXp = (res.new_achievements ?? []).reduce((sum: number, a: { xp_reward?: number }) => sum + (a.xp_reward ?? 0), 0);
      updateUser({ xp: (user?.xp ?? 0) + (res.xp_earned ?? 0) + achievementXp });
      // Fetch next lesson if we came from a course
      if (courseId && lessonId) {
        Promise.all([
          courses.get(courseId),
          quizzes.completedLessons(courseId),
        ]).then(([course, completedIds]) => {
          // Include the just-submitted lesson as completed
          const allCompleted = new Set([...completedIds, lessonId]);
          const sortedMods = [...(course.modules || [])].sort((a, b) => a.order - b.order);
          const allLessons = sortedMods.flatMap((m) =>
            [...(m.lessons || [])].sort((a, b) => a.order - b.order).map((l) => ({ ...l, moduleId: m.id }))
          );
          const idx = allLessons.findIndex((l) => l.id === lessonId);
          if (idx !== -1 && idx + 1 < allLessons.length) {
            const next = allLessons[idx + 1];
            const currentModuleId = allLessons[idx].moduleId;
            if (next.moduleId !== currentModuleId) {
              // Cross-module: only show Next Lesson if every lesson in the current module is done
              const currentModLessons = sortedMods
                .find((m) => m.id === currentModuleId)?.lessons || [];
              const currentModDone = currentModLessons.every((l) => allCompleted.has(l.id));
              if (!currentModDone) return; // not yet — user must complete remaining quizzes
            }
            setNextLesson({ id: next.id, title: next.title, moduleId: next.moduleId });
          }
        }).catch(() => {});
      }
    } catch {}
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--ring)]" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2">
        <p className="text-[var(--fg-secondary)]">Quiz not found.</p>
        <Link href="/courses" className="text-sm text-[var(--ring)] hover:underline">Back to courses</Link>
      </div>
    );
  }

  // ─── Results View ──────────────────────────────────────────
  if (result) {
    const sc = scoreColor(result.score);
    return (
      <div className="w-full space-y-6 px-4 py-6 sm:px-6">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center">
          <div className={`mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full ${result.score >= 70 ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
            {result.score >= 70 ? (
              <Trophy size={36} className="text-emerald-500" />
            ) : (
              <AlertTriangle size={36} className="text-amber-500" />
            )}
          </div>
          <h1 className="mb-1 text-2xl font-bold">
            {result.score >= 90 ? "Excellent!" : result.score >= 70 ? "Great Job!" : result.score >= 50 ? "Keep Practicing!" : "Don't Give Up!"}
          </h1>
          <p className="text-[var(--fg-secondary)]">{result.message}</p>
          <div className="mt-4 flex items-center justify-center gap-6">
            <div>
              <div className={`text-4xl font-extrabold ${sc}`}>{Math.round(result.score)}%</div>
              <div className="text-xs text-[var(--fg-muted)]">Score</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold">{result.correct_answers}/{result.total_questions}</div>
              <div className="text-xs text-[var(--fg-muted)]">Correct</div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-4xl font-extrabold text-[var(--ring)]">
                <Zap size={24} />
                {result.xp_earned}
              </div>
              <div className="text-xs text-[var(--fg-muted)]">XP Earned</div>
            </div>
          </div>
          {result.difficulty_adjustment && (
            <p className="mt-3 text-sm text-[var(--fg-secondary)]">
              Difficulty adjustment: <span className="font-semibold text-[var(--ring)]">{result.difficulty_adjustment}</span>
            </p>
          )}
          {result.new_achievements && result.new_achievements.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold text-yellow-500">New Achievements!</p>
              {result.new_achievements.map((a) => (
                <div key={a.name} className="inline-flex items-center gap-2 rounded-lg bg-yellow-500/10 px-3 py-1.5">
                  <span className="text-xl">{a.icon}</span>
                  <span className="text-sm font-semibold">{a.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Question Results */}
        <div className="space-y-4">
          {result.results.map((r, i) => (
            <div
              key={r.question_id}
              className={`rounded-xl border p-5 ${
                r.is_correct
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-red-500/30 bg-red-500/5"
              }`}
            >
              <div className="mb-2 flex items-start gap-2">
                {r.is_correct ? (
                  <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle size={20} className="mt-0.5 shrink-0 text-red-500" />
                )}
                <p className="font-medium">
                  <span className="text-[var(--fg-muted)]">Q{i + 1}.</span> {r.question_text}
                </p>
              </div>
              <div className="ml-7 space-y-1 text-sm">
                {!r.is_correct && (
                  <p>
                    Your answer: <span className="font-medium text-red-500">{r.selected}</span>
                  </p>
                )}
                <p>
                  Correct: <span className="font-medium text-emerald-500">{r.correct_answer}</span>
                </p>
                <p className="mt-2 text-[var(--fg-secondary)]">{r.explanation}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Link
            href="/courses"
            className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--bg-elevated)]"
          >
            <ArrowLeft size={16} />
            Back to Courses
          </Link>
          {quiz && (
            <button
              onClick={async () => {
                setRetakeLoading(true);
                try {
                  const newQuiz = await quizzes.generate(quiz.lesson_id);
                  router.push(`/quiz/${newQuiz.id}`);
                } catch {}
                setRetakeLoading(false);
              }}
              disabled={retakeLoading}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--bg-elevated)] disabled:opacity-50"
            >
              {retakeLoading ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
              Retake Quiz
            </button>
          )}
          {courseId && !nextLesson && (
            <Link
              href={`/courses/${courseId}`}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <BookOpen size={16} />
              Back to Course
            </Link>
          )}
          {!courseId && (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Dashboard
            </Link>
          )}
        </div>

        {/* Next Lesson CTA */}
        {nextLesson && courseId && (
          <div className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
            <p className="mb-3 text-sm text-[var(--fg-secondary)]">
              Ready to continue? Your next lesson is waiting.
            </p>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen size={16} className="shrink-0 text-[var(--ring)]" />
                <span className="truncate text-sm font-semibold">{nextLesson.title}</span>
              </div>
              <Link
                href={`/courses/${courseId}?lesson=${nextLesson.id}`}
                className="flex shrink-0 items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-500/20 hover:opacity-90 transition-opacity"
              >
                Next Lesson
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Quiz Player ───────────────────────────────────────────
  const q = quiz.questions[current];
  const allAnswered = quiz.questions.every((qu) => answers[qu.id]);

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6">
      <Link href="/courses" className="inline-flex items-center gap-1 text-sm text-[var(--fg-secondary)] hover:text-[var(--fg)]">
        <ArrowLeft size={16} />
        Back to Courses
      </Link>

      {/* Quiz Header */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div className="flex items-center justify-between">
          <h1 className="font-bold">{quiz.title}</h1>
          <span className="flex items-center gap-1 text-sm tabular-nums text-[var(--fg-muted)]">
            <Clock size={14} />
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </span>
        </div>
        {/* Question navigator dots */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {quiz.questions.map((q, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                i === current
                  ? "bg-[var(--ring)] text-white shadow-md"
                  : answers[q.id]
                  ? "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30"
                  : "bg-[var(--bg-elevated)] text-[var(--fg-muted)] hover:bg-[var(--border)]"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--fg-muted)]">
          Question {current + 1} of {quiz.questions.length} · {Object.keys(answers).length} answered
        </p>
      </div>

      {/* Question */}
      {q && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <p className="mb-1 text-xs font-medium text-[var(--fg-muted)]">
            {q.question_type?.toUpperCase()} · {q.difficulty}
          </p>
          <h2 className="mb-5 text-lg font-semibold leading-relaxed">{q.question_text}</h2>
          <div className="space-y-2.5">
            {q.options?.map((opt) => {
              const selected = answers[q.id] === opt.label;
              return (
                <button
                  key={opt.label}
                  onClick={() => handleSelect(q.id, opt.label)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                    selected
                      ? "border-[var(--ring)] bg-[var(--ring)]/10"
                      : "border-[var(--border)] hover:border-[var(--ring)]/30 hover:bg-[var(--bg-elevated)]"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                      selected
                        ? "border-[var(--ring)] bg-[var(--ring)] text-white"
                        : "border-[var(--border)]"
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span className="pt-0.5 text-sm">{opt.text}</span>
                </button>
              );
            })}
          </div>
          {/* Hint */}
          {q.hint && (
            <div className="mt-4">
              {hintsUsed.has(q.id) ? (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
                  <Lightbulb size={15} className="mt-0.5 shrink-0 text-amber-500" />
                  <p className="text-sm text-[var(--fg-secondary)]">{q.hint}</p>
                </div>
              ) : (
                <button
                  onClick={() => setHintsUsed((prev) => new Set(prev).add(q.id))}
                  className="flex items-center gap-1.5 text-sm font-medium text-amber-500 hover:underline"
                >
                  <Lightbulb size={14} />
                  Show Hint
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--bg-elevated)] disabled:opacity-30"
        >
          <ArrowLeft size={16} />
          Previous
        </button>
        {current < quiz.questions.length - 1 ? (
          <button
            onClick={() => setCurrent((c) => c + 1)}
            className="flex items-center gap-1 rounded-lg bg-[var(--bg-elevated)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--border)]"
          >
            Next
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Submit Quiz
          </button>
        )}
      </div>
    </div>
  );
}
