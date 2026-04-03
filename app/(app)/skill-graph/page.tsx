"use client";

import { useEffect, useState } from "react";
import { courses, dashboard, type CourseListItem, type SkillGraph } from "@/lib/api";
import { BookOpen, CheckCircle2, Circle, Loader2, GitBranch, ArrowRight } from "lucide-react";

export default function SkillGraphPage() {
  const [courseList, setCourseList] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [graph, setGraph] = useState<SkillGraph | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);

  useEffect(() => {
    courses
      .list()
      .then((list) => {
        setCourseList(list);
        if (list.length > 0) setSelectedCourse(list[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    setGraph(null);
    setGraphLoading(true);
    dashboard
      .skillGraph(selectedCourse)
      .then(setGraph)
      .catch(() => setGraph(null))
      .finally(() => setGraphLoading(false));
  }, [selectedCourse]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--fg-muted)]" />
      </div>
    );
  }

  if (courseList.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <BookOpen size={40} className="text-[var(--fg-muted)]" />
        <p className="text-[var(--fg-secondary)]">No courses enrolled yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 p-6 shadow-lg shadow-violet-100 dark:border-slate-700 dark:from-slate-800 dark:via-slate-800 dark:to-indigo-950 dark:shadow-slate-900/40">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-100 p-2.5 dark:bg-violet-500/20">
            <GitBranch size={22} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Skill Graph</h1>
            <p className="text-sm text-violet-600 dark:text-violet-300">
              Track your skill progression per module
            </p>
          </div>
        </div>
      </div>

      {/* Course selector */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <p className="mb-3 text-sm font-semibold text-[var(--fg-muted)]">Select a course</p>
        <div className="flex flex-wrap gap-2">
          {courseList.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCourse(c.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedCourse === c.id
                  ? "border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-300"
                  : "border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--fg-secondary)] hover:border-violet-400"
              }`}
            >
              {c.certified ? (
                <CheckCircle2 size={13} className="text-emerald-500" />
              ) : (
                <BookOpen size={13} />
              )}
              {c.title}
            </button>
          ))}
        </div>
      </div>

      {graphLoading && (
        <div className="flex h-48 items-center justify-center">
          <Loader2 size={28} className="animate-spin text-[var(--fg-muted)]" />
        </div>
      )}

      {!graphLoading && graph && (
        <div className="space-y-4">
          {/* Summary card */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Skills Mastered</h3>
                <p className="mt-0.5 text-sm text-[var(--fg-secondary)]">
                  {graph.completed_skills} of {graph.total_skills} modules completed
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-violet-500">
                  {graph.completed_skills}
                </span>
                <span className="text-lg text-[var(--fg-muted)]">/</span>
                <span className="text-3xl font-bold text-[var(--fg-muted)]">
                  {graph.total_skills}
                </span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-700"
                style={{
                  width: `${graph.total_skills > 0 ? (graph.completed_skills / graph.total_skills) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Skill nodes as a vertical timeline */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <h3 className="mb-4 font-semibold">Module Skills</h3>
            <div className="space-y-0">
              {graph.nodes.map((node, i) => (
                <div key={node.id} className="flex gap-4">
                  {/* Timeline line + dot */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                        node.is_completed
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-[var(--border)] bg-[var(--bg-elevated)]"
                      }`}
                    >
                      {node.is_completed ? (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      ) : (
                        <Circle size={16} className="text-[var(--fg-muted)]" />
                      )}
                    </div>
                    {i < graph.nodes.length - 1 && (
                      <div
                        className={`w-0.5 flex-1 ${
                          node.is_completed ? "bg-emerald-500/40" : "bg-[var(--border)]"
                        }`}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{node.name}</span>
                      {node.is_completed && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                          COMPLETED
                        </span>
                      )}
                    </div>
                    {node.module_title && node.module_title !== node.name && (
                      <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
                        Module: {node.module_title}
                      </p>
                    )}
                    {node.description && (
                      <p className="mt-1 text-sm text-[var(--fg-secondary)]">{node.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Skill dependencies */}
          {graph.edges.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
              <h3 className="mb-4 font-semibold">Skill Dependencies</h3>
              <div className="space-y-2">
                {graph.edges.map((edge, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="rounded bg-[var(--bg-elevated)] px-2 py-0.5 text-xs text-[var(--fg-secondary)]">
                      {edge.from_name}
                    </span>
                    <ArrowRight size={13} className="shrink-0 text-[var(--fg-muted)]" />
                    <span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                      {edge.to_name}
                    </span>
                    <span className="ml-auto rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] text-[var(--fg-muted)]">
                      {edge.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!graphLoading && !graph && selectedCourse && (
        <div className="flex h-48 flex-col items-center justify-center gap-3 text-center">
          <GitBranch size={36} className="text-[var(--fg-muted)]" />
          <p className="text-sm text-[var(--fg-secondary)]">No skill data available for this course yet.</p>
          <p className="text-xs text-[var(--fg-muted)]">Complete some lessons and quizzes to build your skill graph.</p>
        </div>
      )}
    </div>
  );
}
