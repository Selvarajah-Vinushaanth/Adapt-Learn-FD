"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft, Loader2, Send, CheckCircle2, Lightbulb,
  Tag, Zap, TrendingUp, TrendingDown, FileText, ArrowRight, BookOpen,
} from "lucide-react";
import { tasks, courses, type Task, type TaskEvaluation, type Course } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { difficultyColor, scoreColor } from "@/lib/utils";

export default function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const taskId = Number(id);
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId") ? Number(searchParams.get("courseId")) : null;
  const lessonId = searchParams.get("lessonId") ? Number(searchParams.get("lessonId")) : null;

  const { user, updateUser } = useAuthStore();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TaskEvaluation | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [nextLesson, setNextLesson] = useState<{ id: number; title: string; sameModule: boolean } | null>(null);

  useEffect(() => {
    tasks
      .get(taskId)
      .then(setTask)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [taskId]);

  const handleSubmit = async () => {
    if (!submission.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await tasks.evaluate(taskId, submission.trim());
      setResult(res);
      // Update XP in navbar immediately so users see the change here, not on the next page
      updateUser({ xp: (user?.xp ?? 0) + (res.xp_earned ?? 0) });
      // Fetch next lesson if we came from a course
      if (courseId && lessonId) {
        courses.get(courseId).then((course: Course) => {
          const sortedMods = [...(course.modules || [])].sort((a, b) => a.order - b.order);
          const allLessons = sortedMods.flatMap((m) =>
            [...(m.lessons || [])].sort((a, b) => a.order - b.order).map((l) => ({ ...l, moduleId: m.id }))
          );
          const idx = allLessons.findIndex((l) => l.id === lessonId);
          if (idx !== -1 && idx + 1 < allLessons.length) {
            const next = allLessons[idx + 1];
            const sameModule = next.moduleId === allLessons[idx].moduleId;
            setNextLesson({ id: next.id, title: next.title, sameModule });
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

  if (!task) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2">
        <p className="text-[var(--fg-secondary)]">Task not found.</p>
        <Link href="/courses" className="text-sm text-[var(--ring)] hover:underline">Back to courses</Link>
      </div>
    );
  }

  const dc = difficultyColor(task.difficulty);

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6">
      <Link href="/courses" className="inline-flex items-center gap-1 text-sm text-[var(--fg-secondary)] hover:text-[var(--fg)]">
        <ArrowLeft size={16} />
        Back to Courses
      </Link>

      {/* Task Card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="mb-3 flex items-center gap-2">
          <FileText size={20} className="text-[var(--ring)]" />
          <h1 className="text-xl font-bold">{task.title}</h1>
          <span className={`ml-auto rounded-md px-2 py-0.5 text-xs font-semibold ${dc}`}>
            {task.difficulty}
          </span>
        </div>
        <div className="lesson-content mb-4">
          <ReactMarkdown>{task.description}</ReactMarkdown>
        </div>
        {task.instructions && (
          <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
            <h3 className="mb-2 text-sm font-semibold">Instructions</h3>
            <div className="lesson-content text-sm">
              <ReactMarkdown>{task.instructions}</ReactMarkdown>
            </div>
          </div>
        )}
        {task.tags?.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {task.tags.map((t) => (
              <span key={t} className="flex items-center gap-1 rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 text-xs text-[var(--fg-muted)]">
                <Tag size={10} />
                {t}
              </span>
            ))}
          </div>
        )}
        {task.hints?.length > 0 && (
          <div>
            <button
              onClick={() => setShowHints(!showHints)}
              className="flex items-center gap-1 text-sm font-medium text-[var(--ring)] hover:underline"
            >
              <Lightbulb size={14} />
              {showHints ? "Hide Hints" : `Show ${task.hints.length} Hint(s)`}
            </button>
            {showHints && (
              <ul className="mt-2 space-y-1 pl-5 text-sm text-[var(--fg-secondary)]">
                {task.hints.map((h, i) => (
                  <li key={i} className="list-disc">{h}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Submission or Result */}
      {result ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center">
            <CheckCircle2 size={40} className="mx-auto mb-2 text-emerald-500" />
            <h2 className="mb-1 text-xl font-bold">Task Evaluated</h2>
            <div className="flex items-center justify-center gap-6 py-4">
              <div>
                <div className={`text-4xl font-extrabold ${scoreColor(result.score)}`}>
                  {Math.round(result.score)}%
                </div>
                <div className="text-xs text-[var(--fg-muted)]">Score</div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-4xl font-extrabold text-[var(--ring)]">
                  <Zap size={24} />
                  {result.xp_earned}
                </div>
                <div className="text-xs text-[var(--fg-muted)]">XP Earned</div>
              </div>
            </div>
          </div>

          {/* AI Feedback */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <h3 className="mb-3 font-semibold">AI Feedback</h3>
            <div className="lesson-content text-sm">
              <ReactMarkdown>{result.ai_feedback}</ReactMarkdown>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {result.strengths?.length > 0 && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
                <div className="mb-2 flex items-center gap-2 font-semibold text-emerald-500">
                  <TrendingUp size={18} />
                  Strengths
                </div>
                <ul className="space-y-1 text-sm">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.improvements?.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
                <div className="mb-2 flex items-center gap-2 font-semibold text-amber-500">
                  <TrendingDown size={18} />
                  Improvements
                </div>
                <ul className="space-y-1 text-sm">
                  {result.improvements.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Lightbulb size={14} className="mt-0.5 shrink-0 text-amber-500" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Link
              href={courseId ? `/courses/${courseId}` : "/courses"}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--bg-elevated)]"
            >
              <ArrowLeft size={16} />
              Back to Course
            </Link>
            {!courseId && (
              <Link
                href="/dashboard"
                className="rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Dashboard
              </Link>
            )}
          </div>

          {/* Next Lesson CTA */}
          {nextLesson && courseId && nextLesson.sameModule && (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
              <p className="mb-3 text-sm text-[var(--fg-secondary)]">
                Great work! Keep the momentum going.
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
          {/* Cross-module block — must take quiz to unlock next module */}
          {nextLesson && courseId && !nextLesson.sameModule && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="mb-1 text-sm font-semibold text-amber-400">Module quiz required</p>
              <p className="text-sm text-[var(--fg-secondary)]">
                Great job on the practice task! To unlock the next module, complete the
                quiz for each lesson in the current module first.
              </p>
              <Link
                href={`/courses/${courseId}`}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors"
              >
                <BookOpen size={15} />
                Back to Course
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h2 className="mb-3 font-semibold">Your Submission</h2>
          <textarea
            value={submission}
            onChange={(e) => setSubmission(e.target.value)}
            placeholder="Write your solution here... You can use code, explanations, or any format."
            rows={12}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-sm font-mono outline-none transition-colors placeholder:text-[var(--fg-muted)] focus:border-[var(--ring)]"
          />
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-[var(--fg-muted)]">
              {submission.length} characters
            </p>
            <button
              onClick={handleSubmit}
              disabled={!submission.trim() || submitting}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Submit for AI Review
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
