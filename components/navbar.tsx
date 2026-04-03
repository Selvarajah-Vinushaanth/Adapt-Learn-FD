"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { ThemeToggle } from "./theme-toggle";
import { levelProgress, scoreColor, cn } from "@/lib/utils";
import {
  Brain, LayoutDashboard, BookOpen, MessageCircle, LogOut,
  Menu, X, Zap, Flame, RotateCcw, GraduationCap, ClipboardList,
  ChevronRight, Loader2, Target, Users, GitBranch,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { dashboard, quizzes, tasks, type QuizAttemptSummary, type TaskSubmissionSummary } from "@/lib/api";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/skill-graph", label: "Skill Graph", icon: GitBranch },
  { href: "/chat", label: "AI Chat", icon: MessageCircle },
  { href: "/revisions", label: "Revisions", icon: RotateCcw },
  { href: "/leaderboard", label: "Leaderboard", icon: Users },
  { href: "/daily-challenge", label: "Daily Challenge", icon: Target },
];

export function Navbar() {
  const { user, logout, updateUser } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [practiceOpen, setPracticeOpen] = useState(false);
  const [submissions, setSubmissions] = useState<TaskSubmissionSummary[]>([]);
  const [practiceLoaded, setPracticeLoaded] = useState(false);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const practiceRef = useRef<HTMLDivElement>(null);

  const [quizOpen, setQuizOpen] = useState(false);
  const [attempts, setAttempts] = useState<QuizAttemptSummary[]>([]);
  const [quizLoaded, setQuizLoaded] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [retaking, setRetaking] = useState<number | null>(null);
  const quizRef = useRef<HTMLDivElement>(null);

  if (!user) return null;

  const lp = levelProgress(user.xp);

  useEffect(() => {
    dashboard.get().then((d) => {
      updateUser({ streak_days: d.streak_days, xp: d.xp });
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (practiceRef.current && !practiceRef.current.contains(e.target as Node)) {
        setPracticeOpen(false);
      }
      if (quizRef.current && !quizRef.current.contains(e.target as Node)) {
        setQuizOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openPracticeHistory = async () => {
    setQuizOpen(false);
    setPracticeOpen((o) => !o);
    if (!practiceLoaded) {
      setPracticeLoading(true);
      try {
        const data = await tasks.mySubmissions();
        setSubmissions(data.slice(0, 10));
        setPracticeLoaded(true);
      } catch {}
      setPracticeLoading(false);
    }
  };

  const openQuizHistory = async () => {
    setPracticeOpen(false);
    setQuizOpen((o) => !o);
    if (!quizLoaded) {
      setQuizLoading(true);
      try {
        const data = await quizzes.myAttempts();
        setAttempts(data.slice(0, 10));
        setQuizLoaded(true);
      } catch {}
      setQuizLoading(false);
    }
  };

  const retake = async (lessonId: number | null, attemptId: number) => {
    if (!lessonId) return;
    setRetaking(attemptId);
    try {
      const quiz = await quizzes.generate(lessonId);
      setQuizOpen(false);
      router.push(`/quiz/${quiz.id}`);
    } catch {}
    setRetaking(null);
  };

  const scoreCol = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl">
        <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500">
              <Brain size={20} className="text-white" />
            </div>
            <span className="hidden text-lg font-bold sm:block">
              Adapt<span className="text-[var(--ring)]">Learn</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-[var(--ring)]/10 text-[var(--ring)]"
                      : "text-[var(--fg-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)]"
                  )}
                >
                  <link.icon size={18} />
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-500">
                <Flame size={14} />
                {user.streak_days}d
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-400">
                <Zap size={14} />
                {user.xp} XP
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 text-xs font-bold text-white">
                {lp.level}
              </div>
            </div>

            {/* Practice Test History */}
            <div className="relative" ref={practiceRef}>
              <button
                onClick={openPracticeHistory}
                title="Practice Test History"
                className={cn(
                  "relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-elevated)]",
                  practiceOpen ? "bg-[var(--bg-elevated)] text-cyan-400" : "text-[var(--fg-secondary)]"
                )}
              >
                <ClipboardList size={17} />
                {submissions.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[9px] font-bold text-white">
                    {submissions.length > 9 ? "9+" : submissions.length}
                  </span>
                )}
              </button>

              {practiceOpen && (
                <div className="fixed inset-x-3 top-20 z-50 w-auto overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl md:absolute md:inset-x-auto md:right-0 md:top-10 md:w-80">
                  <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ClipboardList size={15} className="text-cyan-400" />
                      <span className="text-sm font-semibold">Practice Test History</span>
                    </div>
                    <button onClick={() => setPracticeOpen(false)}><X size={14} /></button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {practiceLoading ? (
                      <div className="flex h-20 items-center justify-center">
                        <Loader2 size={20} className="animate-spin text-[var(--ring)]" />
                      </div>
                    ) : submissions.length === 0 ? (
                      <div className="flex h-20 items-center justify-center text-sm text-[var(--fg-secondary)]">
                        No practice tests submitted yet
                      </div>
                    ) : (
                      submissions.map((s) => (
                        <div key={s.id} className="border-b border-[var(--border)] px-4 py-3 last:border-0 hover:bg-[var(--bg-elevated)]">
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 text-sm font-bold tabular-nums ${scoreCol(s.score)}`}>
                              {Math.round(s.score)}%
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-1 text-xs font-medium">{s.task_title}</p>
                              <p className="text-xs text-[var(--fg-muted)]">{s.lesson_title}</p>
                              {s.strengths?.length > 0 && (
                                <p className="mt-0.5 line-clamp-1 text-[11px] text-emerald-400">
                                  &#10003; {s.strengths[0]}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="border-t border-[var(--border)] px-4 py-2">
                    <Link
                      href="/dashboard"
                      onClick={() => setPracticeOpen(false)}
                      className="flex items-center justify-between text-xs text-[var(--fg-secondary)] hover:text-[var(--fg)]"
                    >
                      View full history on Dashboard
                      <ChevronRight size={13} />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Quiz History */}
            <div className="relative" ref={quizRef}>
              <button
                onClick={openQuizHistory}
                title="Quiz History"
                className={cn(
                  "relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-elevated)]",
                  quizOpen ? "bg-[var(--bg-elevated)] text-violet-400" : "text-[var(--fg-secondary)]"
                )}
              >
                <GraduationCap size={17} />
                {attempts.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[9px] font-bold text-white">
                    {attempts.length > 9 ? "9+" : attempts.length}
                  </span>
                )}
              </button>

              {quizOpen && (
                <div className="fixed inset-x-3 top-20 z-50 w-auto overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl md:absolute md:inset-x-auto md:right-0 md:top-10 md:w-80">
                  <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap size={15} className="text-violet-400" />
                      <span className="text-sm font-semibold">Quiz History</span>
                    </div>
                    <button onClick={() => setQuizOpen(false)}><X size={14} /></button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {quizLoading ? (
                      <div className="flex h-20 items-center justify-center">
                        <Loader2 size={20} className="animate-spin text-[var(--ring)]" />
                      </div>
                    ) : attempts.length === 0 ? (
                      <div className="flex h-20 items-center justify-center text-sm text-[var(--fg-secondary)]">
                        No quizzes taken yet
                      </div>
                    ) : (
                      attempts.map((a) => {
                        const sc = scoreColor(a.score);
                        return (
                          <div key={a.id} className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3 last:border-0 hover:bg-[var(--bg-elevated)]">
                            <div className={`text-base font-bold tabular-nums ${sc}`}>
                              {Math.round(a.score)}%
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-1 text-xs font-medium">{a.quiz_title}</p>
                              <p className="text-xs text-[var(--fg-muted)]">
                                {a.correct_answers}/{a.total_questions} correct &middot; +{a.xp_earned} XP
                              </p>
                            </div>
                            {a.lesson_id && (
                              <button
                                onClick={() => retake(a.lesson_id, a.id)}
                                disabled={retaking === a.id}
                                className="shrink-0 rounded-md bg-[var(--ring)]/10 px-2 py-1 text-xs font-medium text-[var(--ring)] hover:bg-[var(--ring)]/20 disabled:opacity-50"
                              >
                                {retaking === a.id ? <Loader2 size={12} className="animate-spin" /> : "Retake"}
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="border-t border-[var(--border)] px-4 py-2">
                    <Link
                      href="/dashboard"
                      onClick={() => setQuizOpen(false)}
                      className="flex items-center justify-between text-xs text-[var(--fg-secondary)] hover:text-[var(--fg)]"
                    >
                      View full history on Dashboard
                      <ChevronRight size={13} />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <ThemeToggle />

            <button
              onClick={() => { logout(); window.location.href = "/login"; }}
              className="hidden md:flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--fg-secondary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)]"
              title="Logout"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-xs font-semibold uppercase">
                {user.username[0]}
              </div>
              <LogOut size={16} className="hidden sm:block" />
            </button>

            <button
              className="rounded-lg p-1.5 hover:bg-[var(--bg-elevated)] md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        <div className="h-0.5 w-full bg-[var(--bg-elevated)]">
          <div
            className="h-full bg-gradient-to-r from-violet-600 to-cyan-500 transition-all duration-700"
            style={{ width: `${lp.percent}%` }}
          />
        </div>
      </nav>

      {/* ── Mobile Sidebar ───────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setMobileOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          {/* Panel */}
          <div
            className="absolute right-0 top-0 flex h-full w-[80vw] max-w-xs flex-col border-l border-[var(--border)] bg-[var(--bg)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500">
                  <Brain size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold">{user.username}</p>
                  <p className="text-xs text-[var(--fg-muted)]">Level {lp.level}</p>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-[var(--fg-secondary)] hover:bg-[var(--bg-elevated)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
              <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-500">
                <Flame size={13} />
                {user.streak_days}d streak
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-400">
                <Zap size={13} />
                {user.xp} XP
              </div>
            </div>

            {/* XP Progress */}
            <div className="border-b border-[var(--border)] px-4 py-2">
              <div className="mb-1 flex items-center justify-between text-xs text-[var(--fg-muted)]">
                <span>Lv {lp.level}</span>
                <span>{Math.round(lp.percent)}% to Lv {lp.level + 1}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 transition-all duration-700"
                  style={{ width: `${lp.percent}%` }}
                />
              </div>
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
              {navLinks.map((link) => {
                const active = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-[var(--ring)]/10 text-[var(--ring)]"
                        : "text-[var(--fg-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)]"
                    )}
                  >
                    <link.icon size={18} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Bottom: theme + logout */}
            <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
              <ThemeToggle />
              <button
                onClick={() => { logout(); window.location.href = "/login"; }}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-[var(--fg-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)] transition-colors"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
