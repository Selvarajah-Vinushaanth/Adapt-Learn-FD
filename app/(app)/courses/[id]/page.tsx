"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  ChevronDown, ChevronRight, BookOpen, Loader2, ArrowLeft,
  Play, FileText, Sparkles, Brain, Clock, Layers, CheckCircle2, Lock, AlertCircle,
  Globe, Search, PlayCircle, Award, ShieldCheck, X, Download, Star, Target,
} from "lucide-react";
import {
  courses, quizzes, tasks, resources, dashboard, notes, explain,
  type Course, type AdaptiveLesson, type Quiz, type Task, type ResourceResult,
  type CourseListItem, type LessonNote, type SimplifiedExplanation,
} from "@/lib/api";
import { difficultyColor } from "@/lib/utils";

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const courseId = Number(id);
  const router = useRouter();
  const searchParams = useSearchParams();
  // ?review=1 — opened from daily challenge, suppress certificate popup & claim button
  const reviewMode = searchParams.get("review") === "1";
  // ?lesson=X — auto-open a specific lesson (from quiz/task result navigation)
  const autoLessonId = searchParams.get("lesson") ? Number(searchParams.get("lesson")) : null;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedModule, setExpandedModule] = useState<number | null>(null);
  const [activeLesson, setActiveLesson] = useState<AdaptiveLesson | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [taskLoading, setTaskLoading] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Lesson IDs where the user has taken a quiz (for module unlocking)
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<number>>(new Set());
  // Resources tab
  const [activeTab, setActiveTab] = useState<"content" | "resources" | "notes">("content");
  const [resourceResults, setResourceResults] = useState<ResourceResult[]>([]);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  // Notes
  const [lessonNote, setLessonNote] = useState<LessonNote | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  // Simplification (AI re-explanation)
  const [simplifyLoading, setSimplifyLoading] = useState(false);
  const [simplified, setSimplified] = useState<SimplifiedExplanation | null>(null);
  // Course progress & certificate
  const [courseProgress, setCourseProgress] = useState<CourseListItem | null>(null);
  const [certLoading, setCertLoading] = useState(false);
  // certInfo stores cert data persistently; showCertModal controls visibility
  const [certInfo, setCertInfo] = useState<{
    course_title: string;
    course_difficulty: string;
    user_name: string;
    user_email: string;
    certified_at: string;
  } | null>(null);
  const [showCertModal, setShowCertModal] = useState(false);
  // Quick Complete modal
  const [showQuickCompleteModal, setShowQuickCompleteModal] = useState(false);
  const [quickCompleting, setQuickCompleting] = useState(false);

  useEffect(() => {
    courses
      .get(courseId)
      .then((c) => {
        setCourse(c);
        if (autoLessonId) {
          // Auto-open the lesson specified by the ?lesson= param
          const targetMod = c.modules?.find((m) => m.lessons?.some((l) => l.id === autoLessonId));
          if (targetMod) setExpandedModule(targetMod.id);
          openLesson(autoLessonId);
        } else if (c.modules?.length) {
          setExpandedModule(c.modules[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    quizzes.completedLessons(courseId).then((ids) => {
      setCompletedLessonIds(new Set(ids));
    }).catch(() => {});

    // Load progress info (status, completion_percentage, certified)
    // Also pre-populate certInfo user info from /auth/me for "View Certificate" on reload
    Promise.all([
      courses.list(),
      import("@/lib/api").then((m) => m.auth.me()),
    ]).then(([list, me]) => {
      const match = list.find((c) => c.id === courseId);
      if (match) {
        setCourseProgress(match);
        if (match.certified && match.certified_at && !reviewMode) {
          // Pre-fill certInfo so "View Certificate" button works without re-claiming
          setCertInfo((prev) =>
            prev ? prev : {
              course_title: match.title,
              course_difficulty: match.difficulty,
              user_name: me.full_name || me.username,
              user_email: me.email,
              certified_at: match.certified_at!,
            }
          );
        }
      }
    }).catch(() => {});
  }, [courseId]);

  // Compute effective completion % from actual quiz-based completed lesson IDs
  // (overrides stale DB value caused by a previous flush-ordering bug)
  const effectiveCompletion = (() => {
    if (!course) return courseProgress?.completion_percentage ?? 0;
    // Speed-run: course is always 100% complete
    if (courseProgress?.quick_completed) return 100;
    const allLessonIds = (course.modules || []).flatMap((m) => (m.lessons || []).map((l) => l.id));
    if (allLessonIds.length === 0) return 0;
    const done = allLessonIds.filter((id) => completedLessonIds.has(id)).length;
    return Math.round((done / allLessonIds.length) * 100);
  })();

  const effectiveProgress = courseProgress
    ? { ...courseProgress, completion_percentage: effectiveCompletion }
    : null;

  const isModuleUnlocked = (moduleIndex: number, sortedModules: Course["modules"]): boolean => {
    if (effectiveProgress?.quick_completed) return true;
    if (moduleIndex === 0) return true;
    const prevModule = sortedModules[moduleIndex - 1];
    const prevLessons = prevModule.lessons || [];
    return prevLessons.length > 0 && prevLessons.every((l) => completedLessonIds.has(l.id));
  };

  // A module is fully completed if ALL its lessons have completed quizzes
  const isModuleCompleted = (mod: Course["modules"][number]): boolean => {
    if (effectiveProgress?.quick_completed) return true;
    const lessons = mod.lessons || [];
    return lessons.length > 0 && lessons.every((l) => completedLessonIds.has(l.id));
  };

  const downloadCertificate = async () => {
    const { toPng } = await import("html-to-image");
    const el = document.getElementById("certificate-card");
    if (!el) return;
    const dataUrl = await toPng(el, { pixelRatio: 2, cacheBust: true });
    const link = document.createElement("a");
    link.download = `certificate-${certInfo?.course_title?.replace(/\s+/g, "-").toLowerCase() ?? "course"}.png`;
    link.href = dataUrl;
    link.click();
  };

  const claimCertificate = async () => {
    setCertLoading(true);
    try {
      const result = await courses.certificate(courseId);
      setCertInfo({
        course_title: result.course_title,
        course_difficulty: result.course_difficulty,
        user_name: result.user_name,
        user_email: result.user_email,
        certified_at: result.certified_at,
      });
      setShowCertModal(true);
      // Refresh progress
      const list = await courses.list();
      const match = list.find((c) => c.id === courseId);
      if (match) setCourseProgress(match);
    } catch {}
    setCertLoading(false);
  };

  const quickComplete = async () => {
    setQuickCompleting(true);
    try {
      await courses.quickComplete(courseId);
      const list = await courses.list();
      const match = list.find((c) => c.id === courseId);
      if (match) setCourseProgress(match);
    } catch {}
    setQuickCompleting(false);
    setShowQuickCompleteModal(false);
  };

  const openLesson = async (lessonId: number) => {
    setLessonLoading(true);
    setError(null);
    setActiveTab("content");
    setResourceResults([]);
    setSelectedVideo(null);
    setSimplified(null);
    setNoteSaved(false);
    try {
      const [lesson, note, cached] = await Promise.all([
        courses.getLesson(courseId, lessonId),
        notes.getForLesson(lessonId).catch(() => null),
        explain.getCached(courseId, lessonId).catch(() => null),
      ]);
      setActiveLesson(lesson);
      setLessonNote(note);
      setNoteText(note?.content ?? "");
      if (cached) setSimplified(cached);
    } catch {
      setError("Failed to load lesson. Please try again.");
    }
    setLessonLoading(false);
  };

  const loadResources = async (query: string) => {
    setResourceLoading(true);
    setSelectedVideo(null);
    try {
      const data = await resources.search(query);
      setResourceResults(data);
    } catch {}
    setResourceLoading(false);
  };

  const saveNote = async () => {
    if (!activeLesson) return;
    setNoteSaving(true);
    try {
      const saved = await notes.saveForLesson(activeLesson.id, noteText);
      setLessonNote(saved);
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } catch {}
    setNoteSaving(false);
  };

  const deleteNote = async () => {
    if (!lessonNote) return;
    await notes.deleteNote(lessonNote.id).catch(() => null);
    setLessonNote(null);
    setNoteText("");
  };

  const simplifyLesson = async () => {
    if (!activeLesson) return;
    setSimplifyLoading(true);
    try {
      const result = await explain.generate(courseId, activeLesson.id);
      setSimplified(result);
    } catch {}
    setSimplifyLoading(false);
  };

  const generateQuiz = async (lessonId: number) => {
    setQuizLoading(true);
    setError(null);
    try {
      const quiz = await quizzes.generate(lessonId);
      router.push(`/quiz/${quiz.id}?courseId=${courseId}&lessonId=${lessonId}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Quiz generation failed";
      setError(msg);
      setQuizLoading(false);
    }
  };

  const generateTask = async (lessonId: number) => {
    setTaskLoading(true);
    setError(null);
    try {
      const task = await tasks.generate(lessonId);
      router.push(`/tasks/${task.id}?courseId=${courseId}&lessonId=${lessonId}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Task generation failed";
      setError(msg);
      setTaskLoading(false);
    }
  };

  // Review mode: mark current lesson as read and open the next one
  const markCompleteAndNext = async () => {
    if (!activeLesson || !course) return;
    setMarkingComplete(true);
    try {
      // Find which module this lesson belongs to
      const mod = course.modules?.find((m) =>
        m.lessons?.some((l) => l.id === activeLesson.id)
      );
      if (mod) {
        await dashboard.updateProgress(courseId, mod.id, activeLesson.id, 0);
        // Mark locally so the green tick appears immediately
        setCompletedLessonIds((prev) => new Set([...prev, activeLesson.id]));
      }
      // Find the next lesson in order across all modules
      const sortedMods = [...(course.modules || [])].sort((a, b) => a.order - b.order);
      const allLessons = sortedMods.flatMap((m) =>
        [...(m.lessons || [])].sort((a, b) => a.order - b.order)
      );
      const idx = allLessons.findIndex((l) => l.id === activeLesson.id);
      const next = allLessons[idx + 1];
      if (next) {
        // Expand the module of the next lesson
        const nextMod = sortedMods.find((m) => m.lessons?.some((l) => l.id === next.id));
        if (nextMod) setExpandedModule(nextMod.id);
        await openLesson(next.id);
      }
      // If no next lesson, stay on current (all done)
    } catch {}
    setMarkingComplete(false);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--ring)]" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2">
        <p className="text-[var(--fg-secondary)]">Course not found.</p>
        <Link href="/courses" className="text-sm text-[var(--ring)] hover:underline">
          Back to courses
        </Link>
      </div>
    );
  }

  const dc = difficultyColor(course.difficulty);
  const sortedModules = [...(course.modules || [])].sort((a, b) => a.order - b.order);

  return (
    <div className="w-full px-4 py-4 sm:px-6 lg:flex lg:h-[calc(100vh-4rem)] lg:flex-col lg:overflow-hidden">

      {/* Daily challenge review banner */}
      {reviewMode && (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-orange-400/30 bg-orange-500/5 px-4 py-2.5 lg:shrink-0">
          <div className="flex items-center gap-2 text-sm text-orange-400">
            <Target size={15} className="shrink-0" />
            <span>Reviewing lesson for today&apos;s daily challenge. Pick a lesson from the modules below.</span>
          </div>
          <Link href="/daily-challenge" className="ml-3 shrink-0 text-xs font-semibold text-orange-400 hover:underline">
            ← Back to challenge
          </Link>
        </div>
      )}

      {/* ── Quick Complete Confirmation Modal ─────────────────── */}
      {showQuickCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-orange-400/30 bg-[var(--bg-card)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
                <Sparkles size={20} className="text-orange-400" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--fg)]">Speed Run Mode</h3>
                <p className="text-xs text-[var(--fg-secondary)]">Instantly complete this course</p>
              </div>
            </div>
            <div className="mb-5 space-y-2.5 rounded-xl border border-orange-400/20 bg-orange-500/5 p-4">
              <p className="flex items-start gap-2 text-sm text-[var(--fg-secondary)]">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                Course marked as 100% complete immediately
              </p>
              <p className="flex items-start gap-2 text-sm text-[var(--fg-secondary)]">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                All modules unlocked for free browsing
              </p>
              <p className="flex items-start gap-2 text-sm font-semibold text-orange-300">
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-orange-400" />
                No XP will be earned for this course
              </p>
              <p className="flex items-start gap-2 text-sm font-semibold text-orange-300">
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-orange-400" />
                No achievements will be unlocked from this completion
              </p>
              <p className="flex items-start gap-2 text-sm font-semibold text-orange-300">
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-orange-400" />
                Certificate will NOT be available for this course
              </p>
              <p className="flex items-start gap-2 text-sm font-medium text-[var(--fg-muted)]">
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-[var(--fg-muted)]" />
                This action cannot be undone
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuickCompleteModal(false)}
                className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--fg-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={quickComplete}
                disabled={quickCompleting}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 disabled:opacity-50 transition-all"
              >
                {quickCompleting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {quickCompleting ? "Completing..." : "Complete (No Certificate)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Certificate Modal ─────────────────────────────────── */}
      {certInfo && showCertModal && !reviewMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl">
            {/* Close */}
            <button
              onClick={() => setShowCertModal(false)}
              className="absolute -right-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg)] border border-[var(--border)] shadow-lg hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <X size={16} />
            </button>

            {/* Certificate Card */}
            <div
              id="certificate-card"
              className="relative overflow-hidden rounded-2xl border-2 border-yellow-400/60 bg-gradient-to-br from-[#0f0c1a] via-[#1a1130] to-[#0a1628] p-10 shadow-2xl shadow-yellow-500/10 text-white"
            >
              {/* Decorative corner accents */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-yellow-400/40 rounded-tl-2xl" />
                <div className="absolute top-0 right-0 w-24 h-24 border-t-2 border-r-2 border-yellow-400/40 rounded-tr-2xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 border-b-2 border-l-2 border-yellow-400/40 rounded-bl-2xl" />
                <div className="absolute bottom-0 right-0 w-24 h-24 border-b-2 border-r-2 border-yellow-400/40 rounded-br-2xl" />
                {/* Glow */}
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-40 bg-yellow-500/10 rounded-full blur-3xl" />
              </div>

              {/* Header: Platform branding */}
              <div className="relative mb-8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 shadow-lg">
                    <Brain size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold tracking-widest text-violet-400 uppercase">LearnAI</p>
                    <p className="text-[10px] text-white/40">by vinushaanth</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-500/10 px-3 py-1">
                  <ShieldCheck size={14} className="text-yellow-400" />
                  <span className="text-xs font-semibold text-yellow-400">Verified Certificate</span>
                </div>
              </div>

              {/* Body */}
              <div className="relative text-center">
                <p className="mb-1 text-xs tracking-[0.3em] text-white/50 uppercase">Certificate of Completion</p>
                <p className="mb-4 text-sm text-white/60">This is to certify that</p>

                <h2 className="mb-4 text-4xl font-bold tracking-tight bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-400 bg-clip-text text-transparent">
                  {certInfo.user_name}
                </h2>

                <p className="mb-4 text-sm text-white/60">has successfully completed</p>

                <h3 className="mb-2 text-xl font-bold text-white leading-snug px-4">
                  {certInfo.course_title}
                </h3>

                <div className="mb-8 flex items-center justify-center gap-2">
                  <span className={`rounded-md px-2.5 py-0.5 text-xs font-semibold capitalize ${
                    certInfo.course_difficulty === "advanced"
                      ? "bg-red-500/20 text-red-400"
                      : certInfo.course_difficulty === "intermediate"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-emerald-500/20 text-emerald-400"
                  }`}>
                    {certInfo.course_difficulty}
                  </span>
                  <span className="text-xs text-white/40">·</span>
                  <span className="flex items-center gap-1 text-xs text-white/50">
                    <Star size={11} className="text-yellow-400 fill-yellow-400" />
                    With Distinction
                  </span>
                </div>

                {/* Stars decoration */}
                <div className="mb-6 flex items-center justify-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="relative flex items-end justify-between border-t border-white/10 pt-5">
                <div>
                  <p className="text-xs text-white/40">Issued on</p>
                  <p className="text-sm font-semibold text-white/80">
                    {new Date(certInfo.certified_at).toLocaleDateString("en-US", {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/40">Issued by</p>
                  <p className="text-sm font-semibold text-violet-400">vinushaanth</p>
                  <p className="text-[10px] text-white/30">Platform Owner</p>
                </div>
              </div>
            </div>

            {/* Warning notice */}
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-yellow-400/30 bg-yellow-500/10 px-4 py-3">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-yellow-400" />
              <p className="text-xs text-yellow-200/80 leading-relaxed">
                <span className="font-semibold text-yellow-400">Save your certificate!</span>{" "}
                Download it now or come back anytime via the{" "}
                <span className="font-medium text-yellow-300">&quot;View Certificate&quot;</span> button on this page.
              </p>
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={downloadCertificate}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-yellow-500/20 hover:shadow-xl transition-all"
              >
                <Download size={15} />
                Download Certificate
              </button>
              <button
                onClick={() => setShowCertModal(false)}
                className="rounded-lg border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back */}
      <Link href="/courses" className="mb-3 inline-flex items-center gap-1 text-sm text-[var(--fg-secondary)] hover:text-[var(--fg)] lg:shrink-0">
        <ArrowLeft size={16} />
        All Courses
      </Link>

      {/* Error Banner */}
      {error && (
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 lg:shrink-0">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Course Header */}
      <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 lg:shrink-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${dc}`}>
            {course.difficulty}
          </span>
          {course.tags?.map((t) => (
            <span key={t} className="rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 text-xs text-[var(--fg-muted)]">
              {t}
            </span>
          ))}
        </div>
        <h1 className="mb-2 text-2xl font-bold">{course.title}</h1>
        <p className="mb-3 text-[var(--fg-secondary)]">{course.description}</p>
        <div className="flex flex-wrap gap-4 text-sm text-[var(--fg-muted)]">
          <span className="flex items-center gap-1"><Layers size={14} /> {course.modules?.length || 0} modules</span>
          {course.estimated_hours && (
            <span className="flex items-center gap-1"><Clock size={14} /> ~{course.estimated_hours}h</span>
          )}
        </div>

        {/* Progress Bar */}
        {effectiveProgress && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-[var(--fg-muted)]">
                {effectiveProgress.certified
                  ? "Certified"
                  : effectiveProgress.completion_percentage >= 100
                  ? "Completed"
                  : effectiveProgress.status === "in_progress"
                  ? "In Progress"
                  : "Not Started"}
              </span>
              <span className={`font-semibold ${
                effectiveProgress.certified
                  ? "text-yellow-500"
                  : effectiveProgress.completion_percentage >= 100
                  ? "text-emerald-500"
                  : "text-[var(--ring)]"
              }`}>
                {Math.round(effectiveProgress.completion_percentage)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  effectiveProgress.certified
                    ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                    : effectiveProgress.completion_percentage >= 100
                    ? "bg-emerald-500"
                    : "bg-gradient-to-r from-violet-600 to-cyan-500"
                }`}
                style={{ width: `${effectiveProgress.completion_percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Certificate Section */}
        {effectiveProgress?.certified && !reviewMode && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-yellow-400/30 bg-yellow-500/5 px-4 py-3">
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} className="shrink-0 text-yellow-500" />
              <div>
                <p className="text-sm font-semibold text-yellow-500">Certified!</p>
                <p className="text-xs text-[var(--fg-secondary)]">
                  Certificate claimed on {new Date(effectiveProgress.certified_at!).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCertModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-yellow-400/30 bg-yellow-500/10 px-3 py-1.5 text-xs font-semibold text-yellow-500 hover:bg-yellow-500/20 transition-colors"
            >
              <Award size={13} />
              View Certificate
            </button>
          </div>
        )}
        {effectiveProgress && !effectiveProgress.certified && effectiveProgress.completion_percentage >= 100 && !reviewMode && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
            <div className="flex items-center gap-3">
              <Award size={20} className="text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-emerald-400">
                  {effectiveProgress.quick_completed ? "Completed (Speed Run)" : "Course Completed!"}
                </p>
                <p className="text-xs text-[var(--fg-secondary)]">
                  {effectiveProgress.quick_completed
                    ? "Completed in speed run mode — certificate not available."
                    : "All modules finished. Claim your certificate now."}
                </p>
              </div>
            </div>
            {!effectiveProgress.quick_completed && (
              <button
                onClick={claimCertificate}
                disabled={certLoading}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl disabled:opacity-50"
              >
                {certLoading ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
                Claim Certificate
              </button>
            )}
          </div>
        )}

        {/* Quick Complete button — only shown when course is in progress and not certified/quick-completed */}
        {effectiveProgress && !effectiveProgress.certified && !effectiveProgress.quick_completed
          && effectiveProgress.completion_percentage < 100 && !reviewMode && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => setShowQuickCompleteModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--fg-muted)] hover:border-orange-400/40 hover:text-orange-400 transition-colors"
            >
              <Sparkles size={12} />
              Speed Run (no certificate)
            </button>
          </div>
        )}
      </div>

      <div className="lg:flex-1 lg:min-h-0 lg:grid lg:gap-6 lg:grid-cols-[1fr_1.5fr] lg:overflow-hidden">
        {/* Module sidebar — hidden on mobile when a lesson is active */}
        <div className={`space-y-2 pb-4 ${activeLesson ? "hidden lg:block" : ""} lg:h-full lg:overflow-y-auto lg:pr-1`}>
          <h2 className="mb-2 font-semibold text-[var(--fg-secondary)]">Modules</h2>
          {sortedModules.map((mod, modIndex) => {
            const isOpen = expandedModule === mod.id;
            const unlocked = isModuleUnlocked(modIndex, sortedModules);
            const sortedLessons = [...(mod.lessons || [])].sort((a, b) => a.order - b.order);
            const modCompleted = isModuleCompleted(mod);
            const isCertified = effectiveProgress?.certified ?? false;

            return (
              <div key={mod.id} className={`overflow-hidden rounded-xl border bg-[var(--bg-card)] ${
                modCompleted
                  ? "border-emerald-500/30"
                  : "border-[var(--border)]"
              } ${isCertified ? "opacity-60 pointer-events-none" : ""}`}>
                <button
                  onClick={() => unlocked && !isCertified && setExpandedModule(isOpen ? null : mod.id)}
                  className={`flex w-full items-center gap-3 p-4 text-left transition-colors ${
                    unlocked && !isCertified ? "hover:bg-[var(--bg-elevated)]" : "cursor-not-allowed opacity-60"
                  }`}
                >
                  {modCompleted ? (
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                  ) : unlocked ? (
                    isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                  ) : (
                    <Lock size={16} className="text-[var(--fg-muted)]" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${modCompleted ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                      {mod.title}
                    </p>
                    <p className="text-xs text-[var(--fg-muted)]">
                      {sortedLessons.length} lessons
                      {modCompleted && " · Completed ✓"}
                      {!unlocked && !modCompleted && " · Complete previous module to unlock"}
                    </p>
                  </div>
                </button>
                {isOpen && unlocked && (
                  <div className="border-t border-[var(--border)] bg-[var(--bg-secondary)]">
                    {sortedLessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        onClick={() => openLesson(lesson.id)}
                        className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-[var(--bg-elevated)] ${
                          activeLesson?.id === lesson.id ? "bg-[var(--ring)]/10 font-medium text-[var(--ring)]" : ""
                        }`}
                      >
                        {completedLessonIds.has(lesson.id) ? (
                          <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                        ) : (
                          <BookOpen size={14} className="shrink-0" />
                        )}
                        <span className="line-clamp-1">{lesson.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Lesson Content — hidden on mobile when no lesson selected; back button on mobile */}
        <div className={`rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-6 ${!activeLesson ? "hidden lg:block" : ""} lg:h-full lg:overflow-y-auto`}>
          {/* Mobile: back to modules */}
          {activeLesson && (
            <button
              onClick={() => setActiveLesson(null)}
              className="mb-4 flex items-center gap-1 text-sm text-[var(--fg-secondary)] hover:text-[var(--fg)] lg:hidden"
            >
              <ArrowLeft size={15} />
              Back to modules
            </button>
          )}
          {lessonLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--ring)]" />
            </div>
          ) : activeLesson ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">{activeLesson.title}</h2>
                {activeLesson.content_level && (
                  <span className="rounded-md bg-[var(--ring)]/10 px-2 py-0.5 text-xs font-medium text-[var(--ring)]">
                    {activeLesson.content_level}
                  </span>
                )}
              </div>
              {/* Lesson progress breadcrumb */}
              {(() => {
                const mod = course?.modules
                  ?.sort((a, b) => a.order - b.order)
                  .find((m) => m.id === activeLesson.module_id);
                if (!mod) return null;
                const sortedLessons = [...(mod.lessons || [])].sort((a, b) => a.order - b.order);
                const idx = sortedLessons.findIndex((l) => l.id === activeLesson.id);
                const total = sortedLessons.length;
                const completedInModule = sortedLessons.filter((l) => completedLessonIds.has(l.id)).length;
                return (
                  <div className="mb-4 flex items-center gap-3 text-xs text-[var(--fg-muted)]">
                    <span className="font-medium text-[var(--fg-secondary)]">{mod.title}</span>
                    <span>·</span>
                    <span>Lesson {idx + 1} of {total}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1.5">
                      <span>{completedInModule}/{total} done</span>
                      <span className="inline-block h-1.5 w-16 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                        <span
                          className="block h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${total > 0 ? (completedInModule / total) * 100 : 0}%` }}
                        />
                      </span>
                    </span>
                  </div>
                );
              })()}

              {/* Tabs */}
              <div className="mb-4 flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-1">
                <button
                  onClick={() => setActiveTab("content")}
                  className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${activeTab === "content" ? "bg-[var(--bg-card)] text-[var(--fg)] shadow-sm" : "text-[var(--fg-secondary)] hover:text-[var(--fg)]"}`}
                >
                  Content
                </button>
                <button
                  onClick={() => {
                    setActiveTab("notes");
                  }}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors ${activeTab === "notes" ? "bg-[var(--bg-card)] text-[var(--fg)] shadow-sm" : "text-[var(--fg-secondary)] hover:text-[var(--fg)]"}`}
                >
                  <FileText size={14} />
                  Notes
                  {lessonNote && (
                    <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-[var(--ring)]" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setActiveTab("resources");
                    if (resourceResults.length === 0) {
                      loadResources(activeLesson.title);
                    }
                  }}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors ${activeTab === "resources" ? "bg-[var(--bg-card)] text-[var(--fg)] shadow-sm" : "text-[var(--fg-secondary)] hover:text-[var(--fg)]"}`}
                >
                  <Search size={14} />
                  Resources
                </button>
              </div>

              {activeTab === "content" ? (
                <>
                  {activeLesson.key_concepts?.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-1.5">
                      {activeLesson.key_concepts.map((kc) => (
                        <span key={kc} className="rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 text-xs text-[var(--fg-muted)]">
                          {kc}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="lesson-content mb-6">
                    <ReactMarkdown>{activeLesson.content}</ReactMarkdown>
                  </div>
                  {activeLesson.examples?.length > 0 && (
                    <div className="mb-6 space-y-4">
                      <h3 className="flex items-center gap-2 font-semibold">
                        <Sparkles size={16} className="text-[var(--ring)]" />
                        Examples
                      </h3>
                      {activeLesson.examples.map((ex, i) => (
                        <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
                          <h4 className="mb-1 text-sm font-semibold">{ex.title}</h4>
                          <p className="mb-2 text-sm text-[var(--fg-secondary)]">{ex.description}</p>
                          {ex.code && (
                            <pre className="overflow-x-auto rounded-md bg-[var(--bg)] p-3 text-xs">
                              <code>{ex.code}</code>
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AI Simplification panel */}
                  <div className="mb-6 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-blue-400">Struggling with this lesson?</p>
                        <p className="text-xs text-[var(--fg-secondary)]">
                          {simplified ? "AI explanation saved — refresh anytime." : "Get a simpler AI explanation with analogies and self-check questions."}
                        </p>
                      </div>
                      <button
                        onClick={simplifyLesson}
                        disabled={simplifyLoading}
                        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-500/20 px-3 py-2 text-xs font-semibold text-blue-400 hover:bg-blue-500/30 disabled:opacity-50 transition-colors"
                      >
                        {simplifyLoading ? <Loader2 size={13} className="animate-spin" /> : <Brain size={13} />}
                        {simplifyLoading ? "Generating..." : simplified ? "Regenerate" : "Simplify for me"}
                      </button>
                    </div>
                    {simplified && (
                      <div className="mt-4 space-y-4 border-t border-blue-500/20 pt-4">
                        <div className="lesson-content text-sm">
                          <ReactMarkdown>{simplified.simplified_explanation}</ReactMarkdown>
                        </div>
                        {simplified.analogy && (
                          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
                            <p className="mb-1 text-xs font-semibold text-blue-400">Think of it this way...</p>
                            <p className="text-sm text-[var(--fg-secondary)]">{simplified.analogy}</p>
                          </div>
                        )}
                        {simplified.key_takeaways?.length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-semibold text-[var(--fg-secondary)] uppercase tracking-wide">Key Takeaways</p>
                            <ul className="space-y-1">
                              {simplified.key_takeaways.map((t, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-[var(--fg-secondary)]">
                                  <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-blue-400" />
                                  {t}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {simplified.self_check_questions?.length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-semibold text-[var(--fg-secondary)] uppercase tracking-wide">Quick Self-Check</p>
                            <div className="space-y-2">
                              {simplified.self_check_questions.map((sq, i) => (
                                <details key={i} className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]">
                                  <summary className="cursor-pointer px-3 py-2 text-sm font-medium">{sq.question}</summary>
                                  <p className="border-t border-[var(--border)] px-3 py-2 text-sm text-[var(--fg-secondary)]">{sq.answer}</p>
                                </details>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Actions — hidden in review mode (user should go back to Daily Challenge to take quiz) */}
                  {!reviewMode && (
                    <div className="flex flex-wrap gap-3 border-t border-[var(--border)] pt-4">
                      <button
                        onClick={() => generateQuiz(activeLesson.id)}
                        disabled={quizLoading}
                        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {quizLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                        Take Quiz
                      </button>
                      <button
                        onClick={() => generateTask(activeLesson.id)}
                        disabled={taskLoading}
                        className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--bg-elevated)] disabled:opacity-50"
                      >
                        {taskLoading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                        Practice Task
                      </button>
                    </div>
                  )}
                  {reviewMode && (
                    <div className="flex flex-wrap gap-3 border-t border-[var(--border)] pt-4">
                      {/* Mark as read + open next lesson */}
                      {completedLessonIds.has(activeLesson.id) ? (
                        <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400">
                          <CheckCircle2 size={15} />
                          Lesson read
                        </span>
                      ) : (
                        <button
                          onClick={markCompleteAndNext}
                          disabled={markingComplete}
                          className="flex items-center gap-2 rounded-lg bg-[var(--ring)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:opacity-90 transition-opacity"
                        >
                          {markingComplete ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={15} />
                          )}
                          {markingComplete ? "Saving..." : "Mark as Read & Next →"}
                        </button>
                      )}
                      <Link
                        href="/daily-challenge"
                        className="flex items-center gap-2 rounded-lg bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-400 hover:bg-orange-500/20 transition-colors"
                      >
                        <Target size={15} />
                        Back to challenge
                      </Link>
                    </div>
                  )}
                </>
              ) : activeTab === "notes" ? (
                /* Notes Tab */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--fg-secondary)]">
                      Your notes for this lesson
                    </p>
                    {lessonNote && (
                      <button
                        onClick={deleteNote}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        <X size={12} />
                        Clear note
                      </button>
                    )}
                  </div>
                  <textarea
                    value={noteText}
                    onChange={(e) => { setNoteText(e.target.value); setNoteSaved(false); }}
                    rows={12}
                    placeholder="Write your notes, key takeaways, or questions here…"
                    className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm outline-none focus:border-[var(--ring)] transition-colors"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[var(--fg-muted)]">
                      {lessonNote
                        ? `Last saved: ${new Date(lessonNote.updated_at).toLocaleString()}`
                        : "Not saved yet"}
                    </p>
                    <button
                      onClick={saveNote}
                      disabled={noteSaving || !noteText.trim()}
                      className="flex items-center gap-2 rounded-lg bg-[var(--ring)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                    >
                      {noteSaving ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : noteSaved ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <FileText size={14} />
                      )}
                      {noteSaving ? "Saving…" : noteSaved ? "Saved!" : "Save Note"}
                    </button>
                  </div>
                </div>
              ) : (
                /* Resources Tab */
                <div className="space-y-4">
                  {/* Search bar to refine */}
                  <div className="flex gap-2">
                    <input
                      id="resource-search"
                      type="text"
                      defaultValue={activeLesson.title}
                      className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm outline-none focus:border-[var(--ring)]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          loadResources((e.target as HTMLInputElement).value);
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const el = document.getElementById("resource-search") as HTMLInputElement;
                        if (el) loadResources(el.value);
                      }}
                      disabled={resourceLoading}
                      className="flex items-center gap-1.5 rounded-lg bg-[var(--ring)]/10 px-3 py-2 text-sm font-medium text-[var(--ring)] hover:bg-[var(--ring)]/20 disabled:opacity-50"
                    >
                      {resourceLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                      Search
                    </button>
                  </div>

                  {/* Video player */}
                  {selectedVideo && (
                    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                      <iframe
                        width="100%"
                        height="315"
                        src={`https://www.youtube.com/embed/${selectedVideo}?autoplay=1`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="block"
                      />
                    </div>
                  )}

                  {resourceLoading ? (
                    <div className="flex h-24 items-center justify-center">
                      <Loader2 size={24} className="animate-spin text-[var(--ring)]" />
                    </div>
                  ) : resourceResults.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[var(--fg-secondary)]">No results found. Try a different search.</p>
                  ) : (
                    <div className="space-y-2">
                      {/* YouTube videos */}
                      {resourceResults.filter((r) => r.type === "youtube").length > 0 && (
                        <div>
                          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-500">
                          <PlayCircle size={13} className="text-red-500" /> YouTube Videos
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {resourceResults.filter((r) => r.type === "youtube").map((r, i) => (
                              <button
                                key={i}
                                onClick={() => setSelectedVideo(r.video_id || null)}
                                className={`flex items-start gap-2 rounded-lg border p-2 text-left transition-colors hover:bg-[var(--bg-elevated)] ${selectedVideo === r.video_id ? "border-red-500/40 bg-red-500/5" : "border-[var(--border)]"}`}
                              >
                                {r.thumbnail && (
                                  <img src={r.thumbnail} alt="" className="h-14 w-24 shrink-0 rounded object-cover" />
                                )}
                                <div className="min-w-0">
                                  <p className="line-clamp-2 text-xs font-medium">{r.title}</p>
                                  <p className="mt-1 text-xs text-[var(--fg-muted)]">▶ Click to play</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Web results */}
                      {resourceResults.filter((r) => r.type === "web").length > 0 && (
                        <div>
                          <p className="mb-2 mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-blue-500">
                            <Globe size={13} /> Web Results
                          </p>
                          <div className="space-y-2">
                            {resourceResults.filter((r) => r.type === "web").map((r, i) => (
                              <a
                                key={i}
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-2 rounded-lg border border-[var(--border)] p-3 transition-colors hover:bg-[var(--bg-elevated)]"
                              >
                                <Globe size={14} className="mt-0.5 shrink-0 text-blue-500" />
                                <div className="min-w-0">
                                  <p className="line-clamp-1 text-sm font-medium">{r.title}</p>
                                  {r.description && (
                                    <p className="line-clamp-2 text-xs text-[var(--fg-secondary)]">{r.description}</p>
                                  )}
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions in Resources tab */}
                  <div className="flex flex-wrap gap-3 border-t border-[var(--border)] pt-4">
                    <button
                      onClick={() => generateQuiz(activeLesson.id)}
                      disabled={quizLoading}
                      className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {quizLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                      Take Quiz
                    </button>
                    <button
                      onClick={() => generateTask(activeLesson.id)}
                      disabled={taskLoading}
                      className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--bg-elevated)] disabled:opacity-50"
                    >
                      {taskLoading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                      Practice Task
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-60 flex-col items-center justify-center text-center">
              <Brain size={40} className="mb-3 text-[var(--fg-muted)]" />
              <p className="font-semibold">Select a lesson</p>
              <p className="mt-1 text-sm text-[var(--fg-secondary)]">
                Choose a lesson from the modules panel to start learning.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
