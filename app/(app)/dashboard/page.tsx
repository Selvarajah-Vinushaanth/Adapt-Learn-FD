"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap, Trophy, Flame, Clock, BookOpen, Target,
  TrendingUp, TrendingDown, Award, ChevronRight, Loader2,
  CheckCircle2, XCircle, ChevronDown, RotateCcw, GraduationCap,
  PartyPopper, Star, Sparkles, ClipboardList, Activity,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Cell,
  LineChart, Line,
} from "recharts";
import { dashboard, quizzes, tasks, type Dashboard, type LearnerInsights, type QuizAttemptSummary, type QuizAttemptDetail, type TaskSubmissionSummary } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { levelProgress, scoreColor } from "@/lib/utils";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<QuizAttemptSummary[]>([]);
  const [expandedAttempt, setExpandedAttempt] = useState<number | null>(null);
  const [attemptDetail, setAttemptDetail] = useState<Record<number, QuizAttemptDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState<number | null>(null);
  const [submissions, setSubmissions] = useState<TaskSubmissionSummary[]>([]);
  const [practiceExpanded, setPracticeExpanded] = useState(false);
  const [quizExpanded, setQuizExpanded] = useState(false);
  const [practiceLimit, setPracticeLimit] = useState(5);
  const [quizLimit, setQuizLimit] = useState(5);
  const [insights, setInsights] = useState<LearnerInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);

  useEffect(() => {
    dashboard
      .get()
      .then((d) => {
        setData(d);
        updateUser({ streak_days: d.streak_days });
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    dashboard
      .insights()
      .then(setInsights)
      .catch(() => {})
      .finally(() => setInsightsLoading(false));

    quizzes.myAttempts().then(setAttempts).catch(() => {});
    tasks.mySubmissions().then(setSubmissions).catch(() => {});
  }, []);

  const toggleAttempt = async (id: number) => {
    if (expandedAttempt === id) {
      setExpandedAttempt(null);
      return;
    }
    setExpandedAttempt(id);
    if (!attemptDetail[id]) {
      setLoadingDetail(id);
      try {
        const detail = await quizzes.attemptDetail(id);
        setAttemptDetail((prev) => ({ ...prev, [id]: detail }));
      } catch {}
      setLoadingDetail(null);
    }
  };

  const retakeQuiz = async (lessonId: number | null) => {
    if (!lessonId) return;
    try {
      const quiz = await quizzes.generate(lessonId);
      router.push(`/quiz/${quiz.id}`);
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--ring)]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-[var(--fg-secondary)]">Could not load dashboard.</p>
      </div>
    );
  }

  const xpProgress = levelProgress(data.xp).percent;
  const allDone = data.courses_enrolled > 0 && data.courses_completed === data.courses_enrolled;
  const inProgress = data.courses_enrolled - data.courses_completed;
  const certifiedCount = data.courses_certified ?? 0;
  const speedRunCount = data.courses_quick_completed ?? 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const motivationalMsg = allDone
    ? "You've completed all your courses. Outstanding work! 🎉"
    : data.streak_days >= 7
    ? `${data.streak_days}-day streak! You're on fire 🔥 Keep it going.`
    : data.streak_days >= 3
    ? `${data.streak_days}-day streak — great consistency! Don't break it.`
    : data.completion_percentage >= 80
    ? "Almost there! You're crushing your goals."
    : data.completion_percentage >= 50
    ? "Great progress — keep the momentum going!"
    : data.total_quizzes_taken === 0
    ? "Start a lesson and take your first quiz to get started!"
    : "Every lesson brings you one step closer. Keep learning!";

  const completionData = [
    { name: "Progress", value: data.completion_percentage, fill: "#8b5cf6" },
  ];
  const completionColor = data.completion_percentage >= 100
    ? "#10b981"   // green — fully complete
    : data.completion_percentage >= 60
    ? "#8b5cf6"   // violet — good progress
    : data.completion_percentage >= 30
    ? "#f59e0b"   // amber — getting started
    : "#ef4444";  // red — just beginning

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6">
      {/* Welcome & Level */}
      {allDone ? (
        <div className="rounded-2xl border border-yellow-400/30 bg-gradient-to-br from-yellow-500 via-orange-500 to-pink-600 p-5 text-white shadow-xl shadow-orange-500/20 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <PartyPopper size={20} className="text-yellow-200" />
                <span className="text-sm font-medium text-yellow-100">{greeting}</span>
              </div>
              <h1 className="text-xl font-bold sm:text-2xl">{user?.full_name || data.username}</h1>
              <p className="mt-1 text-sm text-yellow-100">{motivationalMsg}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end sm:gap-4">
              <div className="rounded-xl bg-white/20 px-3 py-1.5 sm:px-4 sm:py-2">
                <div className="text-2xl font-extrabold sm:text-3xl">{data.level}</div>
                <div className="text-xs text-yellow-100">Level</div>
              </div>
              <div className="rounded-xl bg-white/20 px-3 py-1.5 sm:px-4 sm:py-2">
                <div className="text-2xl font-extrabold sm:text-3xl">{data.xp.toLocaleString()}</div>
                <div className="text-xs text-yellow-100">Total XP</div>
              </div>
              {certifiedCount > 0 && (
                <div className="rounded-xl bg-white/20 px-3 py-1.5 sm:px-4 sm:py-2">
                  <div className="text-2xl font-extrabold sm:text-3xl">{certifiedCount}</div>
                  <div className="text-xs text-yellow-100">Certified</div>
                </div>
              )}
              {data.streak_days > 0 && (
                <div className="rounded-xl bg-white/20 px-3 py-1.5 sm:px-4 sm:py-2">
                  <div className="flex items-center justify-center gap-1 text-2xl font-extrabold sm:text-3xl">
                    <Flame size={18} className="text-orange-200" />
                    {data.streak_days}
                  </div>
                  <div className="text-xs text-yellow-100">Day Streak</div>
                </div>
              )}
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-xs text-yellow-100">
              <span className="font-medium">Level {data.level}</span>
              <span>{Math.round(xpProgress)}% to Level {data.level + 1}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-yellow-200 transition-all duration-700" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>
          <p className="mt-4 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm text-yellow-100">
            All <strong>{data.courses_completed}</strong> enrolled course{data.courses_completed !== 1 ? "s" : ""} completed!
            {certifiedCount > 0 && <> · <strong>{certifiedCount}</strong> certified 🎓</>}
            {speedRunCount > 0 && <> · <strong>{speedRunCount}</strong> speed run ⚡ (no XP)</>}
            {" "}
            Generate a new course to keep growing.{" "}
            <Link href="/courses" className="ml-1 font-semibold underline underline-offset-2 hover:text-white">
              Explore →
            </Link>
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 p-5 shadow-lg shadow-violet-100 dark:border-slate-700 dark:from-slate-800 dark:via-slate-800 dark:to-indigo-950 dark:shadow-slate-900/40 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                {data.streak_days >= 7 ? (
                  <Flame size={20} className="text-orange-500 dark:text-orange-400" />
                ) : (
                  <Star size={20} className="text-violet-500 dark:text-violet-400" />
                )}
                <span className="text-sm font-medium text-violet-600 dark:text-violet-300">{greeting}</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">{user?.full_name || data.username}</h1>
              <p className="mt-1 text-sm text-violet-600 dark:text-violet-300">{motivationalMsg}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-center sm:gap-4">
              <div className="rounded-xl bg-violet-100 px-3 py-1.5 dark:bg-white/10 sm:px-4 sm:py-2">
                <div className="text-2xl font-extrabold text-gray-900 dark:text-white sm:text-3xl">{data.level}</div>
                <div className="text-xs text-violet-600 dark:text-violet-300">Level</div>
              </div>
              <div className="rounded-xl bg-violet-100 px-3 py-1.5 dark:bg-white/10 sm:px-4 sm:py-2">
                <div className="text-2xl font-extrabold text-gray-900 dark:text-white sm:text-3xl">{data.xp.toLocaleString()}</div>
                <div className="text-xs text-violet-600 dark:text-violet-300">Total XP</div>
              </div>
              {data.streak_days > 0 && (
                <div className="rounded-xl bg-violet-100 px-3 py-1.5 dark:bg-white/10 sm:px-4 sm:py-2">
                  <div className="flex items-center justify-center gap-1 text-2xl font-extrabold text-gray-900 dark:text-white sm:text-3xl">
                    <Flame size={18} className="text-orange-500 dark:text-orange-400" />
                    {data.streak_days}
                  </div>
                  <div className="text-xs text-violet-600 dark:text-violet-300">Day Streak</div>
                </div>
              )}
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-xs text-violet-600 dark:text-violet-300">
              <span className="font-medium">Level {data.level}</span>
              <span>{Math.round(xpProgress)}% to Level {data.level + 1}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-violet-200 dark:bg-white/20">
              <div className="h-full rounded-full bg-violet-500 transition-all duration-700 dark:bg-white" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Flame, label: "Streak", value: `${data.streak_days} days`, color: "text-orange-500", bg: "bg-orange-500/10" },
          { icon: allDone ? Trophy : BookOpen,
            label: allDone ? "All Done!" : inProgress > 0 ? "In Progress" : "Courses",
            value: allDone
              ? `${data.courses_completed} completed`
              : inProgress > 0
              ? `${inProgress} of ${data.courses_enrolled}`
              : `${data.courses_enrolled} enrolled`,
            color: allDone ? "text-yellow-500" : "text-blue-500",
            bg: allDone ? "bg-yellow-500/10" : "bg-blue-500/10",
            sub: certifiedCount > 0 ? `${certifiedCount} certified` : speedRunCount > 0 ? `${speedRunCount} speed run · no XP` : undefined,
          },
          { icon: Target, label: "Avg Score", value: `${Math.round(data.average_quiz_score)}%`, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { icon: Clock, label: "Time", value: `${data.total_time_spent_minutes} min`, color: "text-purple-500", bg: "bg-purple-500/10" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 dark:border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-sm text-[var(--fg-muted)]">{stat.label}</p>
                <p className="text-lg font-bold">{stat.value}</p>
                {"sub" in stat && stat.sub && (
                  <p className="text-xs text-yellow-500 font-medium">{stat.sub}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Middle Row: Completion + AI Insights — horizontal */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Completion Card — donut + bar + trend */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <h3 className="mb-3 font-semibold">Overall Completion</h3>

          {/* Donut */}
          <div className="relative mx-auto h-40 w-40">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="70%"
                outerRadius="100%"
                barSize={14}
                data={completionData}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar
                  dataKey="value"
                  background={{ fill: "var(--bg-elevated)" }}
                  cornerRadius={8}
                >
                  <Cell fill={completionColor} />
                </RadialBar>
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold">{Math.round(data.completion_percentage)}%</span>
              <span className="text-xs text-[var(--fg-muted)]">complete</span>
            </div>
          </div>
          <div className="mt-2 text-center text-sm text-[var(--fg-secondary)]">
            {data.courses_completed} of {data.courses_enrolled} courses finished
            {certifiedCount > 0 && (
              <span className="ml-1.5 font-medium text-yellow-500">· {certifiedCount} certified 🎓</span>
            )}
            {speedRunCount > 0 && (
              <span className="ml-1.5 font-medium text-orange-400" title="Speed Run: completed without XP or certificate">
                · {speedRunCount} speed run ⚡ (no XP)
              </span>
            )}
          </div>

          {/* Bar chart — last quiz scores */}
          {attempts.length > 0 && (() => {
            const recent = [...attempts]
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              .slice(-7)
              .map((a, i) => ({ i: i + 1, score: Math.round(a.score) }));
            return (
              <div className="mt-4">
                <p className="mb-1 text-xs font-medium text-[var(--fg-muted)]">Last {recent.length} quiz scores</p>
                <div className="h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={recent} margin={{ top: 2, right: 2, left: -28, bottom: 0 }}>
                      <XAxis dataKey="i" tick={{ fill: "var(--fg-muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: "var(--fg-muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: "var(--bg-elevated)" }}
                        contentStyle={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "11px" }}
                        formatter={(v: number) => [`${v}%`, "Score"]}
                        labelFormatter={(l) => `Quiz #${l}`}
                      />
                      <Bar dataKey="score" radius={[3, 3, 0, 0]}>
                        {recent.map((entry) => (
                          <Cell
                            key={entry.i}
                            fill={entry.score >= 80 ? "#10b981" : entry.score >= 60 ? "#f59e0b" : "#ef4444"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}

          {/* Score trend line */}
          {attempts.length >= 2 && (() => {
            const sorted = [...attempts]
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            const last10 = sorted.slice(-10);
            const offset = sorted.length - last10.length; // so attempt # is global
            const trendData = last10.map((a, i) => {
              const win = last10.slice(Math.max(0, i - 2), i + 1);
              const avg = Math.round(win.reduce((s, x) => s + x.score, 0) / win.length);
              const date = new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
              const quizTitle = (a as { quiz_title?: string }).quiz_title ?? "";
              return {
                label: `#${offset + i + 1}`,
                date,
                quizTitle,
                score: Math.round(a.score),
                avg,
                winSize: win.length,
              };
            });
            const overallAvg = Math.round(sorted.reduce((s, a) => s + a.score, 0) / sorted.length);
            return (
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs font-medium text-[var(--fg-muted)]">Score trend (last {last10.length})</p>
                  <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-500">overall avg {overallAvg}%</span>
                </div>
                <div className="h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                      <XAxis dataKey="label" tick={{ fill: "var(--fg-muted)", fontSize: 8 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: "var(--fg-muted)", fontSize: 8 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "11px", padding: "6px 10px" }}
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0]?.payload as typeof trendData[0];
                          return (
                            <div style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "11px", padding: "6px 10px" }}>
                              <p className="mb-1 font-semibold">{label} · {d.date}</p>
                              {d.quizTitle && <p className="mb-1 max-w-[180px] truncate text-[10px] text-[var(--fg-muted)]">{d.quizTitle}</p>}
                              <p style={{ color: "#8b5cf6" }}>Score: {d.score}%</p>
                              <p style={{ color: "#06b6d4" }}>Rolling avg ({d.winSize}): {d.avg}%</p>
                            </div>
                          );
                        }}
                      />
                      <Line type="monotone" dataKey="score" name="Score" stroke="#8b5cf6" strokeWidth={1.5} dot={{ r: 2, fill: "#8b5cf6" }} />
                      <Line type="monotone" dataKey="avg" name="Rolling avg" stroke="#06b6d4" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}
        </div>

        {/* AI Learner Insights */}
        <div className="space-y-4 lg:col-span-2">
          {/* Overall AI Summary */}
          <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-violet-400" />
              <span className="text-sm font-semibold text-violet-400">AI Learning Analysis</span>
              {insightsLoading && <Loader2 size={13} className="ml-1 animate-spin text-violet-400" />}
            </div>
            {insightsLoading ? (
              <div className="space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-violet-500/10" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-violet-500/10" />
                <div className="h-3 w-3/5 animate-pulse rounded bg-violet-500/10" />
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-[var(--fg-secondary)]">
                {insights?.overall_summary || "Take some quizzes to unlock your personalized AI analysis."}
              </p>
            )}
          </div>

          {/* Strengths */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="mb-3 flex items-center gap-2 font-semibold text-emerald-500">
              <TrendingUp size={18} />
              Strengths
            </div>
            {insightsLoading ? (
              <div className="space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-emerald-500/10" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-emerald-500/10" />
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-[var(--fg-secondary)]">
                {insights?.strengths_summary || "Complete quizzes to discover what you already excel at."}
              </p>
            )}
          </div>

          {/* Areas to Improve */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
            <div className="mb-3 flex items-center gap-2 font-semibold text-amber-500">
              <TrendingDown size={18} />
              Areas to Improve
            </div>
            {insightsLoading ? (
              <div className="space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-amber-500/10" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-amber-500/10" />
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-[var(--fg-secondary)]">
                {insights?.areas_summary || "No weak areas identified yet. Keep taking quizzes!"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 dark:border-slate-700/50">
        <div className="mb-4 flex items-center gap-2">
          <Trophy size={20} className="text-yellow-500" />
          <h3 className="font-semibold">Achievements</h3>
          <span className="ml-auto rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-bold text-yellow-500">
            {data.achievements?.length || 0} earned
          </span>
        </div>
        {data.achievements?.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.achievements.map((a) => (
              <div key={a.name} className="relative flex items-start gap-3 rounded-xl border border-yellow-400/20 bg-gradient-to-br from-yellow-500/5 to-amber-500/5 p-4 dark:border-yellow-400/25 dark:from-indigo-950/60 dark:to-violet-900/25">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-500/10 text-2xl">
                  {a.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight">{a.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--fg-muted)] leading-snug">{a.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    {a.xp_reward > 0 && (
                      <span className="flex items-center gap-0.5 rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-bold text-violet-500">
                        <Zap size={9} />
                        +{a.xp_reward} XP
                      </span>
                    )}
                    <span className="text-[10px] text-[var(--fg-muted)]">
                      {new Date(a.earned_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <Trophy size={32} className="text-[var(--fg-muted)] opacity-30" />
            <p className="text-sm font-medium text-[var(--fg-secondary)]">No achievements yet</p>
            <p className="text-xs text-[var(--fg-muted)]">Complete courses, maintain streaks, and ace quizzes to unlock achievements!</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/courses"
          className="group flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all hover:border-[var(--ring)]/30"
        >
          <div className="flex items-center gap-3">
            <BookOpen size={20} className="text-[var(--ring)]" />
            <span className="font-semibold">My Courses</span>
          </div>
          <ChevronRight size={18} className="text-[var(--fg-muted)] transition-transform group-hover:translate-x-1" />
        </Link>
        <Link
          href="/chat"
          className="group flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all hover:border-[var(--ring)]/30"
        >
          <div className="flex items-center gap-3">
            <Zap size={20} className="text-[var(--ring)]" />
            <span className="font-semibold">AI Chat</span>
          </div>
          <ChevronRight size={18} className="text-[var(--fg-muted)] transition-transform group-hover:translate-x-1" />
        </Link>
        <Link
          href="/revisions"
          className="group flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all hover:border-[var(--ring)]/30"
        >
          <div className="flex items-center gap-3">
            <Award size={20} className="text-[var(--ring)]" />
            <span className="font-semibold">Revisions Due</span>
          </div>
          <ChevronRight size={18} className="text-[var(--fg-muted)] transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Recent Activity */}
      {data.recent_activity?.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity size={20} className="text-[var(--ring)]" />
            <h3 className="font-semibold">Recent Activity</h3>
            <span className="ml-auto text-xs text-[var(--fg-muted)]">Last {data.recent_activity.length} events</span>
          </div>
          <div className="space-y-2">
            {data.recent_activity.map((item, i) => {
              const isQuiz = item.type === "quiz";
              const scoreClass = item.score >= 80 ? "text-emerald-500" : item.score >= 60 ? "text-amber-500" : "text-red-500";
              const scoreBg = item.score >= 80 ? "bg-emerald-500/10" : item.score >= 60 ? "bg-amber-500/10" : "bg-red-500/10";
              return (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${scoreBg}`}>
                    {isQuiz ? (
                      <span className={`text-xs font-bold ${scoreClass}`}>{Math.round(item.score)}%</span>
                    ) : (
                      <span className={`text-xs font-bold ${scoreClass}`}>{Math.round(item.score)}%</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    {item.occurred_at && (
                      <p className="text-xs text-[var(--fg-muted)]">
                        {new Date(item.occurred_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                  {item.xp_earned > 0 && (
                    <span className="shrink-0 flex items-center gap-0.5 rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-bold text-violet-500">
                      <Zap size={9} />
                      +{item.xp_earned}
                    </span>
                  )}
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${isQuiz ? "bg-blue-500/10 text-blue-400" : "bg-teal-500/10 text-teal-400"}`}>
                    {isQuiz ? "Quiz" : "Task"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Practice Test History */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <button
          onClick={() => setPracticeExpanded(!practiceExpanded)}
          className="flex w-full items-center gap-2"
        >
          <ClipboardList size={20} className="text-cyan-500" />
          <h3 className="font-semibold">Practice Test History</h3>
          <span className="ml-auto text-sm text-[var(--fg-muted)]">{submissions.length} submissions</span>
          <ChevronDown
            size={18}
            className={`text-[var(--fg-muted)] transition-transform ${practiceExpanded ? "rotate-180" : ""}`}
          />
        </button>
        {practiceExpanded && (
          <div className="mt-4">
            {submissions.length === 0 ? (
              <p className="text-sm text-[var(--fg-muted)]">
                No practice tests submitted yet. Open a lesson and click &quot;Practice Test&quot; to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {submissions.slice(0, practiceLimit).map((s) => {
                  const scoreClass = s.score >= 80 ? "text-emerald-500" : s.score >= 60 ? "text-amber-500" : "text-red-500";
                  const scoreBg = s.score >= 80 ? "bg-emerald-500/10" : s.score >= 60 ? "bg-amber-500/10" : "bg-red-500/10";
                  return (
                    <div key={s.id} className="rounded-xl border border-[var(--border)] p-3 hover:bg-[var(--bg-elevated)] sm:p-4">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${scoreBg}`}>
                          <span className={`text-sm font-extrabold ${scoreClass}`}>{Math.round(s.score)}%</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{s.task_title}</p>
                          <p className="truncate text-xs text-[var(--fg-muted)]">{s.lesson_title}</p>
                          <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
                            {new Date(s.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {s.ai_feedback && (
                        <p className="mt-2 rounded-lg bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--fg-secondary)]">
                          {s.ai_feedback}
                        </p>
                      )}
                      {s.strengths?.length > 0 && (
                        <p className="mt-1.5 text-xs text-emerald-500">
                          ✓ {s.strengths[0]}
                        </p>
                      )}
                      {s.improvements?.length > 0 && (
                        <p className="mt-0.5 text-xs text-amber-500">
                          ↑ {s.improvements[0]}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {submissions.length > practiceLimit && (
              <button
                onClick={() => setPracticeLimit((p) => p + 10)}
                className="mt-3 w-full rounded-lg border border-[var(--border)] py-2 text-sm text-[var(--fg-secondary)] transition-colors hover:bg-[var(--bg-elevated)]"
              >
                Load More ({submissions.length - practiceLimit} remaining)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quiz History */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <button
          onClick={() => setQuizExpanded(!quizExpanded)}
          className="flex w-full items-center gap-2"
        >
          <GraduationCap size={20} className="text-violet-500" />
          <h3 className="font-semibold">Quiz History</h3>
          <span className="ml-auto text-sm text-[var(--fg-muted)]">{attempts.length} attempts</span>
          <ChevronDown
            size={18}
            className={`text-[var(--fg-muted)] transition-transform ${quizExpanded ? "rotate-180" : ""}`}
          />
        </button>
        {!quizExpanded ? null : (
          <div className="mt-4">
        {attempts.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">
            No quiz attempts yet. Start a course and take quizzes to see your history here.
          </p>
        ) : (
          <div className="space-y-2">
            {attempts.slice(0, quizLimit).map((a) => {
              const sc = scoreColor(a.score);
              const isExpanded = expandedAttempt === a.id;
              const detail = attemptDetail[a.id];

              return (
                <div key={a.id} className="overflow-hidden rounded-xl border border-[var(--border)]">
                  {/* Summary Row */}
                  <button
                    onClick={() => toggleAttempt(a.id)}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-[var(--bg-elevated)] sm:px-4"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      a.score >= 70 ? "bg-emerald-500/10" : a.score >= 50 ? "bg-amber-500/10" : "bg-red-500/10"
                    }`}>
                      <span className={`text-sm font-extrabold ${sc}`}>{Math.round(a.score)}%</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{a.quiz_title}</p>
                      {a.lesson_title && (
                        <p className="truncate text-xs text-[var(--fg-muted)]">{a.lesson_title}</p>
                      )}
                      <p className="flex flex-wrap gap-x-1.5 text-xs text-[var(--fg-muted)]">
                        <span>{a.correct_answers}/{a.total_questions} correct</span>
                        <span className="text-violet-500">+{a.xp_earned} XP</span>
                        <span>{new Date(a.created_at).toLocaleDateString()}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); retakeQuiz(a.lesson_id); }}
                        className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-0.5 text-xs font-medium transition-colors hover:bg-[var(--bg-card)] sm:px-2.5 sm:py-1"
                        title="Retake quiz"
                      >
                        <RotateCcw size={12} />
                        <span className="hidden sm:inline">Retake</span>
                      </button>
                      <ChevronDown
                        size={16}
                        className={`text-[var(--fg-muted)] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </div>
                  </button>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="border-t border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-3 sm:px-4">
                      {loadingDetail === a.id ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 size={18} className="animate-spin text-[var(--ring)]" />
                        </div>
                      ) : detail ? (
                        <div className="space-y-3">
                          {detail.results.map((r, i) => (
                            <div
                              key={r.question_id ?? i}
                              className={`rounded-lg border p-3 text-sm ${
                                r.is_correct
                                  ? "border-emerald-500/20 bg-emerald-500/5"
                                  : "border-red-500/20 bg-red-500/5"
                              }`}
                            >
                              <div className="mb-1.5 flex items-start gap-2">
                                {r.is_correct ? (
                                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" />
                                ) : (
                                  <XCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
                                )}
                                <p className="font-medium leading-snug">
                                  <span className="text-[var(--fg-muted)]">Q{i + 1}. </span>
                                  {r.question_text}
                                </p>
                              </div>
                              <div className="ml-6 space-y-0.5 text-xs text-[var(--fg-secondary)]">
                                {!r.is_correct && (
                                  <p>Your answer: <span className="font-medium text-red-500">{r.selected}</span></p>
                                )}
                                <p>Correct: <span className="font-medium text-emerald-500">{r.correct_answer}</span></p>
                                {r.explanation && (
                                  <p className="mt-1 text-[var(--fg-muted)]">{r.explanation}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--fg-muted)]">Could not load details.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {quizExpanded && attempts.length > quizLimit && (
          <button
            onClick={() => setQuizLimit((p) => p + 10)}
            className="mt-3 w-full rounded-lg border border-[var(--border)] py-2 text-sm text-[var(--fg-secondary)] transition-colors hover:bg-[var(--bg-elevated)]"
          >
            Load More ({attempts.length - quizLimit} remaining)
          </button>
        )}
          </div>
        )}
      </div>
    </div>
  );
}
