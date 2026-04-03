export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function levelProgress(xp: number): { level: number; current: number; needed: number; percent: number } {
  const level = Math.floor(xp / 500) + 1;
  const current = xp % 500;
  return { level, current, needed: 500, percent: (current / 500) * 100 };
}

export function difficultyColor(d: string): string {
  switch (d.toLowerCase()) {
    case "beginner":
    case "easy":
      return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    case "intermediate":
    case "medium":
      return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    case "advanced":
    case "hard":
      return "text-red-500 bg-red-500/10 border-red-500/20";
    default:
      return "text-[var(--fg-secondary)] bg-[var(--bg-elevated)]";
  }
}

export function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
}
