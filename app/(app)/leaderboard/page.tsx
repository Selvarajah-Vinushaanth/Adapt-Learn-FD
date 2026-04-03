"use client";

import { useEffect, useState } from "react";
import { leaderboard, type LeaderboardEntry } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { levelProgress } from "@/lib/utils";
import { Trophy, Zap, Flame, Crown, Medal, Award, Loader2 } from "lucide-react";

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown size={20} className="text-amber-400" />;
  if (rank === 2) return <Medal size={20} className="text-slate-400" />;
  if (rank === 3) return <Award size={20} className="text-amber-700" />;
  return (
    <span className="w-5 text-center text-sm font-bold text-[var(--fg-muted)]">
      {rank}
    </span>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    leaderboard
      .get(50)
      .then(setEntries)
      .catch(() => setError("Failed to load leaderboard"))
      .finally(() => setLoading(false));
  }, []);

  const currentRank = entries.find((e) => e.is_current_user)?.rank ?? null;

  return (
    <div className="w-full space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
          <Trophy size={22} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Leaderboard</h1>
          <p className="text-sm text-[var(--fg-secondary)]">
            Top learners ranked by XP earned
          </p>
        </div>
        {currentRank && (
          <div className="ml-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-center">
            <p className="text-xs text-[var(--fg-secondary)]">Your rank</p>
            <p className="text-2xl font-bold text-[var(--ring)]">#{currentRank}</p>
          </div>
        )}
      </div>

      {/* Podium top 3 */}
      {!loading && entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {/* 2nd place */}
          <div className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-5 text-center dark:border-slate-500/60 dark:bg-gradient-to-b dark:from-slate-600/40 dark:to-slate-700/20">
            <Medal size={28} className="text-slate-400" />
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-400/10 text-lg font-bold uppercase text-slate-400">
              {entries[1].username[0]}
            </div>
            <p className="line-clamp-1 text-sm font-semibold">{entries[1].username}</p>
            <p className="text-xs font-bold text-violet-400">{entries[1].xp.toLocaleString()} XP</p>
          </div>
          {/* 1st place */}
          <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-amber-400/40 bg-gradient-to-b from-amber-500/10 to-[var(--bg-card)] px-4 py-5 text-center shadow-lg">
            <Crown size={28} className="text-amber-400" />
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/20 text-xl font-bold uppercase text-amber-400">
              {entries[0].username[0]}
            </div>
            <p className="line-clamp-1 text-sm font-semibold">{entries[0].username}</p>
            <p className="text-xs font-bold text-amber-400">{entries[0].xp.toLocaleString()} XP</p>
          </div>
          {/* 3rd place */}
          <div className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-5 text-center dark:border-amber-600/40 dark:bg-gradient-to-b dark:from-amber-800/25 dark:to-amber-900/15">
            <Award size={28} className="text-amber-700" />
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-800/10 text-lg font-bold uppercase text-amber-700">
              {entries[2].username[0]}
            </div>
            <p className="line-clamp-1 text-sm font-semibold">{entries[2].username}</p>
            <p className="text-xs font-bold text-violet-400">{entries[2].xp.toLocaleString()} XP</p>
          </div>
        </div>
      )}

      {/* Full list */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 size={28} className="animate-spin text-[var(--ring)]" />
          </div>
        ) : error ? (
          <div className="flex h-40 items-center justify-center text-sm text-red-400">{error}</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {entries.map((entry) => {
              const lp = levelProgress(entry.xp);
              const isMe = entry.is_current_user;
              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-4 px-5 py-3 transition-colors ${
                    isMe
                      ? "bg-[var(--ring)]/5 ring-1 ring-inset ring-[var(--ring)]/20"
                      : "hover:bg-[var(--bg-elevated)]"
                  }`}
                >
                  <RankIcon rank={entry.rank} />

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 text-sm font-bold text-white">
                    {entry.username[0].toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {entry.username}
                        {isMe && (
                          <span className="ml-1.5 rounded-full bg-[var(--ring)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[var(--ring)]">
                            you
                          </span>
                        )}
                      </span>
                      {entry.full_name && (
                        <span className="text-xs text-[var(--fg-muted)]">{entry.full_name}</span>
                      )}
                    </div>
                    {/* XP bar */}
                    <div className="mt-1 h-1 w-full rounded-full bg-[var(--bg-elevated)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-500"
                        style={{ width: `${lp.percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-4 text-right">
                    <div className="hidden sm:block">
                      <div className="flex items-center gap-1 text-xs text-amber-500">
                        <Flame size={12} />
                        {entry.streak_days}d
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-sm font-bold text-violet-400">
                        <Zap size={13} />
                        {entry.xp.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-[var(--fg-muted)]">Lv {entry.level}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
