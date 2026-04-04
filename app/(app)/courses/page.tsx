"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen, Plus, Loader2, Sparkles, Clock,
  Layers, Tag, ChevronRight, Search, CheckCircle2, PlayCircle, Circle, ShieldCheck,
} from "lucide-react";
import { courses, type CourseListItem } from "@/lib/api";
import { difficultyColor } from "@/lib/utils";

export default function CoursesPage() {
  const router = useRouter();
  const [list, setList] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [depth, setDepth] = useState("standard");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterDiff, setFilterDiff] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const loadCourses = () => {
    courses
      .list()
      .then(setList)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(loadCourses, []);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setError("");
    try {
      const course = await courses.generate(topic.trim(), difficulty, depth);
      router.push(`/courses/${course.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate course");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Courses</h1>
          <p className="text-sm text-[var(--fg-secondary)]">
            {list.length} course{list.length !== 1 ? "s" : ""} enrolled
            {list.filter((c) => c.certified).length > 0 && (
              <> &nbsp;·&nbsp;
                <span className="text-yellow-500 font-medium">
                  {list.filter((c) => c.certified).length} certified
                </span>
              </>
            )}
            {list.filter((c) => c.status === "completed" && !c.certified).length > 0 && (
              <> &nbsp;·&nbsp;
                <span className="text-emerald-500 font-medium">
                  {list.filter((c) => c.status === "completed" && !c.certified).length} completed
                </span>
              </>
            )}
            {list.filter((c) => c.status === "in_progress").length > 0 && (
              <> &nbsp;·&nbsp;
                <span className="text-[var(--ring)] font-medium">
                  {list.filter((c) => c.status === "in_progress").length} in progress
                </span>
              </>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:shadow-xl"
        >
          <Plus size={18} />
          Generate New Course
        </button>
      </div>

      {/* Generate Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={20} className="text-[var(--ring)]" />
              <h2 className="text-lg font-bold">Generate AI Course</h2>
            </div>
            <p className="mb-4 text-sm text-[var(--fg-secondary)]">
              Enter any topic — the AI will create a structured course with modules and lessons.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="e.g. Machine Learning, React Hooks, Organic Chemistry..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--fg-muted)] focus:border-[var(--ring)]"
                onKeyDown={(e) => e.key === "Enter" && !generating && handleGenerate()}
                autoFocus
              />
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm outline-none focus:border-[var(--ring)]"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              <select
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm outline-none focus:border-[var(--ring)]"
              >
                <option value="quick">Quick (5 modules · 2-3 lessons each)</option>
                <option value="standard">Standard (10 modules · 3-5 lessons each)</option>
                <option value="comprehensive">Comprehensive (15 modules · 4-6 lessons each)</option>
              </select>
              {error && (
                <p className="text-sm text-[var(--error)]">{error}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setShowDialog(false); setError(""); }}
                  disabled={generating}
                  className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--bg-elevated)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating || !topic.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>
            {generating && (
              <p className="mt-3 text-center text-xs text-[var(--fg-muted)]">
                {depth === "comprehensive"
                  ? "Generating a 15-module course — this may take 60-90 seconds…"
                  : depth === "standard"
                  ? "Generating a 10-module course — this may take 45-75 seconds…"
                  : "Generating your course — this may take 30-60 seconds…"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Course Grid */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--ring)]" />
        </div>
      ) : list.length === 0 ? (
        <div className="flex h-60 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-card)]">
          <BookOpen size={40} className="mb-3 text-[var(--fg-muted)]" />
          <p className="mb-1 font-semibold">No courses yet</p>
          <p className="mb-4 text-sm text-[var(--fg-secondary)]">
            Generate your first AI-powered course!
          </p>
          <button
            onClick={() => setShowDialog(true)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus size={16} />
            Generate Course
          </button>
        </div>
      ) : (
        <>
          {/* Search + Filter */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
              <input
                type="text"
                placeholder="Search courses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] py-2 pl-9 pr-4 text-sm outline-none placeholder:text-[var(--fg-muted)] focus:border-[var(--ring)]"
              />
            </div>
            <select
              value={filterDiff}
              onChange={(e) => setFilterDiff(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm outline-none focus:border-[var(--ring)]"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm outline-none focus:border-[var(--ring)]"
            >
              <option value="all">All Status</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="certified">Certified</option>
            </select>
          </div>

          {(() => {
            const q = search.toLowerCase();
            const filtered = list.filter(
              (c) =>
                (filterDiff === "all" || c.difficulty === filterDiff) &&
                (filterStatus === "all" ||
                  (filterStatus === "certified" && c.certified) ||
                  (filterStatus === "completed" && c.status === "completed" && !c.certified) ||
                  (filterStatus === "in_progress" && c.status === "in_progress")) &&
                (!q || c.title.toLowerCase().includes(q) || c.topic?.toLowerCase().includes(q) || c.tags?.some((t) => t.toLowerCase().includes(q)))
            );
            if (filtered.length === 0)
              return (
                <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)]">
                  <p className="text-[var(--fg-secondary)]">No courses match your search.</p>
                  <button onClick={() => { setSearch(""); setFilterDiff("all"); setFilterStatus("all"); }} className="text-sm text-[var(--ring)] hover:underline">Clear filters</button>
                </div>
              );
            return (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((c) => {
                  const dc = difficultyColor(c.difficulty);
                  const isCertified = c.certified;
                  return (
                    <Link
                      key={c.id}
                      href={`/courses/${c.id}`}
                      className={`group relative rounded-xl border bg-[var(--bg-card)] p-5 transition-all ${
                        isCertified
                          ? "border-yellow-400/30 hover:border-yellow-400/50 hover:shadow-lg hover:shadow-yellow-500/5"
                          : c.status === "completed"
                          ? "border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-lg"
                          : c.status === "in_progress"
                          ? "border-[var(--ring)]/20 hover:border-[var(--ring)]/40 hover:shadow-lg"
                          : "border-[var(--border)] hover:border-[var(--ring)]/30 hover:shadow-lg"
                      }`}
                    >
                      {/* Top row: difficulty + status + arrow */}
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${dc}`}>
                          {c.difficulty}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isCertified ? (
                            <span className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-semibold text-yellow-500">
                              <ShieldCheck size={12} />
                              Certified
                            </span>
                          ) : c.status === "completed" ? (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-500">
                              <CheckCircle2 size={12} />
                              Completed
                            </span>
                          ) : c.status === "in_progress" ? (
                            <span className="flex items-center gap-1 rounded-full bg-[var(--ring)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--ring)]">
                              <PlayCircle size={12} />
                              In Progress
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-xs font-medium text-[var(--fg-muted)]">
                              <Circle size={12} />
                              Not Started
                            </span>
                          )}
                          {!isCertified && (
                            <ChevronRight
                              size={18}
                              className="text-[var(--fg-muted)] transition-transform group-hover:translate-x-1"
                            />
                          )}
                          {isCertified && (
                            <ChevronRight
                              size={18}
                              className="text-yellow-500/50 transition-transform group-hover:translate-x-1"
                            />
                          )}
                        </div>
                      </div>

                      <h3 className="mb-1 line-clamp-2 font-semibold leading-snug">{c.title}</h3>
                      <p className="mb-3 line-clamp-2 text-sm text-[var(--fg-secondary)]">
                        {c.description}
                      </p>

                      {/* Progress bar */}
                      {(c.status === "in_progress" || c.status === "completed") && (
                        <div className="mb-3">
                          <div className="mb-1 flex justify-between text-xs text-[var(--fg-muted)]">
                            <span>Progress</span>
                            <span className={c.status === "completed" ? "text-emerald-500 font-semibold" : "text-[var(--ring)] font-medium"}>
                              {Math.round(c.completion_percentage)}%
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                            <div
                              className={`h-full rounded-full transition-all ${
                                c.status === "completed"
                                  ? "bg-emerald-500"
                                  : "bg-gradient-to-r from-violet-600 to-cyan-500"
                              }`}
                              style={{ width: `${c.completion_percentage}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--fg-muted)]">
                        <span className="flex items-center gap-1">
                          <Layers size={13} />
                          {c.module_count} modules
                        </span>
                        {c.estimated_hours && (
                          <span className="flex items-center gap-1">
                            <Clock size={13} />
                            {c.estimated_hours}h
                          </span>
                        )}
                        {c.completed_at && (
                          <span className="flex items-center gap-1 text-emerald-500">
                            <CheckCircle2 size={13} />
                            {new Date(c.completed_at).toLocaleDateString()}
                          </span>
                        )}
                        {c.certified && c.certified_at && (
                          <span className="flex items-center gap-1 text-yellow-500">
                            <ShieldCheck size={13} />
                            Certified
                          </span>
                        )}
                      </div>
                      {c.tags?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {c.tags.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="flex items-center gap-1 rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 text-xs text-[var(--fg-muted)]"
                            >
                              <Tag size={10} />
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
