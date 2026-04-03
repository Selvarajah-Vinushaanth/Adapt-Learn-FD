"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthStore } from "@/lib/auth-store";
import {
  Brain, BookOpen, Zap, MessageCircle, Target,
  GitBranch, BarChart3, Trophy, ArrowRight, Sparkles, Loader2,
} from "lucide-react";

const features = [
  { icon: Sparkles, title: "AI Course Generation", desc: "Enter any topic — get a complete structured course with modules, lessons, and examples." },
  { icon: Target, title: "Adaptive Quizzes", desc: "Dynamic MCQ + scenario questions. Difficulty adjusts based on your performance." },
  { icon: MessageCircle, title: "AI Chat Tutor", desc: "Ask anything. Your AI tutor knows your learning context and progress." },
  { icon: Zap, title: "Real-World Tasks", desc: "Hands-on practical tasks with AI evaluation and constructive feedback." },
  { icon: GitBranch, title: "Skill Graph", desc: "Prerequisite mapping per course. Detect knowledge gaps and follow optimal learning paths." },
  { icon: BarChart3, title: "Smart Dashboard", desc: "Track XP, levels, streaks, quiz scores, strengths, weaknesses, and completion." },
  { icon: BookOpen, title: "Spaced Repetition", desc: "SM-2 algorithm automatically resurfaces weak concepts at optimal intervals." },
  { icon: Trophy, title: "Gamification & Leaderboard", desc: "Earn XP, level up, unlock achievements, maintain streaks, and compete on the leaderboard." },
];

export default function HomePage() {
  const { user, loading } = useAuthStore();
  const router = useRouter();

  // Redirect already-logged-in users straight to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  // Show spinner while auth is initialising so buttons don't flicker
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--ring)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500">
              <Brain size={20} className="text-white" />
            </div>
            <span className="text-lg font-bold">
              Adapt<span className="text-[var(--ring)]">Learn</span>
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <Link
                href="/login"
                className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-[var(--fg-secondary)] transition-colors hover:text-[var(--fg)] sm:px-4"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="whitespace-nowrap rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 sm:px-4"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-500/5 via-transparent to-transparent" />
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-24 text-center sm:px-6 sm:pt-32">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-500">
            <Sparkles size={14} />
            Powered by Google Gemini AI
          </div>
          <h1 className="mx-auto mb-5 max-w-4xl text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Learn anything with{" "}
            <span className="bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent">
              AI that adapts
            </span>{" "}
            to you
          </h1>
          <p className="mx-auto mb-7 max-w-2xl text-sm text-[var(--fg-secondary)] sm:mb-10 sm:text-base lg:text-lg">
            Enter any topic. Get a complete course. Take adaptive quizzes.
            Chat with your AI tutor. Build real projects. Track your mastery.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xl shadow-violet-500/25 transition-all hover:shadow-2xl hover:shadow-violet-500/30 sm:px-6 sm:py-3 sm:text-base"
            >
              Start Learning Free
              <ArrowRight size={16} className="sm:size-[18px]" />
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--fg)] transition-colors hover:bg-[var(--bg-elevated)] sm:px-6 sm:py-3 sm:text-base"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <h2 className="mb-4 text-center text-3xl font-bold">
          Everything you need to <span className="text-[var(--ring)]">master</span> any topic
        </h2>
        <p className="mb-12 text-center text-[var(--fg-secondary)]">
          Not just another LMS — an intelligent, adaptive learning companion.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all hover:border-[var(--ring)]/30 hover:shadow-lg hover:shadow-violet-500/5"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--ring)]/10 text-[var(--ring)] transition-colors group-hover:bg-[var(--ring)]/20">
                <f.icon size={20} />
              </div>
              <h3 className="mb-1 font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-[var(--fg-secondary)]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-6 text-center sm:flex-row sm:justify-between sm:text-left sm:px-6">
          <div className="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
            <Brain size={16} className="text-[var(--ring)]" />
            AdaptLearn
          </div>
          <p className="text-sm text-[var(--fg-muted)]">AI-Powered Adaptive Learning</p>
        </div>
      </footer>
    </div>
  );
}
