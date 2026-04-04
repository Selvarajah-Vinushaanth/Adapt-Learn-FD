const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(body.detail || "Request failed", res.status);
  }

  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────
export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
  xp: number;
  level: number;
  streak_days: number;
  total_time_spent_minutes: number;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const auth = {
  register: (data: {
    email: string;
    username: string;
    password: string;
    full_name?: string;
  }) => request<TokenResponse>("/auth/register", { method: "POST", body: JSON.stringify(data) }),

  login: (email: string, password: string) =>
    request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<User>("/auth/me"),
};

// ─── Courses ─────────────────────────────────────────────────
export interface Lesson {
  id: number;
  module_id: number;
  title: string;
  content: string;
  content_simplified?: string;
  content_advanced?: string;
  order: number;
  examples: { title: string; description: string; code?: string }[];
  key_concepts: string[];
  estimated_minutes?: number;
  created_at: string;
}

export interface Module {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  difficulty: string;
  order: number;
  estimated_minutes?: number;
  lessons: Lesson[];
  created_at: string;
}

export interface Course {
  id: number;
  title: string;
  topic: string;
  description: string | null;
  difficulty: string;
  estimated_hours?: number;
  tags: string[];
  modules: Module[];
  created_at: string;
}

export interface CourseListItem {
  id: number;
  title: string;
  topic: string;
  description: string | null;
  difficulty: string;
  estimated_hours?: number;
  tags: string[];
  module_count: number;
  created_at: string;
  status: "not_started" | "in_progress" | "completed";
  completion_percentage: number;
  completed_at: string | null;
  certified: boolean;
  certified_at: string | null;
  quick_completed: boolean;
  last_lesson_id: number | null;
}

export interface AdaptiveLesson {
  id: number;
  module_id: number;
  title: string;
  content: string;
  content_level: string;
  examples: { title: string; description: string; code?: string }[];
  key_concepts: string[];
  estimated_minutes?: number;
  order: number;
}

export const courses = {
  generate: (topic: string, difficulty?: string, depth?: string) =>
    request<Course>("/courses/generate", {
      method: "POST",
      body: JSON.stringify({ topic, difficulty: difficulty || "beginner", depth: depth || "standard" }),
    }),

  get: (id: number) => request<Course>(`/courses/${id}`),

  list: () => request<CourseListItem[]>("/courses/"),

  getLesson: (courseId: number, lessonId: number) =>
    request<AdaptiveLesson>(`/courses/${courseId}/lessons/${lessonId}`),

  certificate: (courseId: number) =>
    request<{
      message: string;
      course_id: number;
      certified_at: string;
      course_title: string;
      course_difficulty: string;
      user_name: string;
      user_email: string;
    }>(
      `/courses/${courseId}/certificate`,
      { method: "POST" },
    ),

  quickComplete: (courseId: number) =>
    request<{ message: string }>(`/courses/${courseId}/quick-complete`, { method: "POST" }),
};

// ─── Quizzes ─────────────────────────────────────────────────
export interface QuizQuestion {
  id: number;
  question_type: string;
  question_text: string;
  options: { label: string; text: string }[];
  difficulty: string;
  order: number;
}

export interface Quiz {
  id: number;
  lesson_id: number;
  title: string;
  difficulty: string;
  questions: QuizQuestion[];
  created_at: string;
}

export interface QuizResult {
  attempt_id: number;
  quiz_id: number;
  score: number;
  total_questions: number;
  correct_answers: number;
  results: {
    question_id: number;
    question_text: string;
    selected: string;
    correct_answer: string;
    is_correct: boolean;
    explanation: string;
  }[];
  xp_earned: number;
  difficulty_adjustment: string | null;
  message: string;
  new_achievements?: { name: string; description: string; icon: string; xp_reward: number }[];
}

export interface QuizAttemptSummary {
  id: number;
  quiz_id: number;
  lesson_id: number | null;
  quiz_title: string;
  lesson_title: string | null;
  score: number;
  total_questions: number;
  correct_answers: number;
  time_spent_seconds: number | null;
  xp_earned: number;
  created_at: string;
}

export interface QuizAttemptDetail extends QuizAttemptSummary {
  results: {
    question_id: number;
    question_text: string;
    selected: string;
    correct_answer: string;
    is_correct: boolean;
    explanation: string;
  }[];
}

export const quizzes = {
  generate: (lessonId: number, difficulty?: string) =>
    request<Quiz>("/quizzes/generate", {
      method: "POST",
      body: JSON.stringify({ lesson_id: lessonId, difficulty }),
    }),

  get: (id: number) => request<Quiz>(`/quizzes/${id}`),

  forLesson: (lessonId: number) => request<Quiz[]>(`/quizzes/lesson/${lessonId}`),

  submit: (quizId: number, answers: { question_id: number; selected_answer: string }[], timeSpent?: number) =>
    request<QuizResult>("/quizzes/submit", {
      method: "POST",
      body: JSON.stringify({ quiz_id: quizId, answers, time_spent_seconds: timeSpent }),
    }),

  myAttempts: () => request<QuizAttemptSummary[]>("/quizzes/my-attempts"),

  attemptDetail: (attemptId: number) => request<QuizAttemptDetail>(`/quizzes/attempts/${attemptId}`),

  completedLessons: (courseId: number) => request<number[]>(`/quizzes/completed-lessons/${courseId}`),
};

// ─── Resource Search ──────────────────────────────────────────
export interface ResourceResult {
  type: "youtube" | "web";
  title: string;
  url: string;
  description?: string;
  thumbnail?: string;
  video_id?: string;
}

export const resources = {
  search: (query: string) => request<ResourceResult[]>(`/resources/search?query=${encodeURIComponent(query)}`),
};
export interface Task {
  id: number;
  lesson_id: number;
  title: string;
  description: string;
  difficulty: string;
  instructions: string | null;
  hints: string[];
  tags: string[];
  created_at: string;
}

export interface TaskEvaluation {
  submission_id: number;
  task_id: number;
  score: number;
  ai_feedback: string;
  strengths: string[];
  improvements: string[];
  xp_earned: number;
}

export interface TaskSubmissionSummary {
  id: number;
  task_id: number;
  task_title: string;
  lesson_id: number;
  lesson_title: string;
  score: number;
  ai_feedback: string | null;
  strengths: string[];
  improvements: string[];
  submitted_at: string;
}

export const tasks = {
  generate: (lessonId: number, difficulty?: string) =>
    request<Task>("/tasks/generate", {
      method: "POST",
      body: JSON.stringify({ lesson_id: lessonId, difficulty }),
    }),

  get: (id: number) => request<Task>(`/tasks/${id}`),

  evaluate: (taskId: number, submissionText: string) =>
    request<TaskEvaluation>("/tasks/evaluate", {
      method: "POST",
      body: JSON.stringify({ task_id: taskId, submission_text: submissionText }),
    }),

  mySubmissions: () => request<TaskSubmissionSummary[]>("/tasks/my-submissions"),
};

// ─── Leaderboard ─────────────────────────────────────────────
export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  full_name: string | null;
  xp: number;
  level: number;
  streak_days: number;
  is_current_user: boolean;
}

export const leaderboard = {
  get: (limit?: number) => request<LeaderboardEntry[]>(`/leaderboard/${limit ? `?limit=${limit}` : ""}`),
};

// ─── Daily Challenge ──────────────────────────────────────────
export interface DailyChallenge {
  has_challenge: boolean;
  is_review?: boolean;
  message: string;
  lesson_id?: number;
  lesson_title?: string;
  course_id?: number;
  course_title?: string;
  module_title?: string;
  difficulty?: string;
}

export interface DailyChallengeStatus {
  lesson_id: number;
  quiz_done: boolean;
  task_done: boolean;
  both_done: boolean;
}

export interface DailyChallengeQuestion {
  id: number;
  question_text: string;
  options: { label: string; text: string }[];
  order: number;
}

export interface DailyChallengeStart {
  state: "no_enrollment" | "active" | "completed";
  message?: string;
  // active
  quiz_id?: number;
  lesson_id?: number;
  lesson_title?: string;
  course_title?: string;
  module_title?: string;
  difficulty?: string;
  is_review?: boolean;
  questions?: DailyChallengeQuestion[];
  // completed
  next_reset_at?: string;
  score?: number;
  xp_earned?: number;
}

export const dailyChallenge = {
  today: () => request<DailyChallenge>("/daily-challenge/today"),
  status: (lessonId: number) =>
    request<DailyChallengeStatus>(`/daily-challenge/status?lesson_id=${lessonId}`),
  generateReview: (lessonId: number) =>
    request<Course>(`/daily-challenge/generate-review?lesson_id=${lessonId}`, { method: "POST" }),
  start: () => request<DailyChallengeStart>("/daily-challenge/start"),
  submit: (
    quizId: number,
    answers: { question_id: number; selected_answer: string }[],
    timeSpent?: number,
  ) =>
    request<QuizResult>("/daily-challenge/submit", {
      method: "POST",
      body: JSON.stringify({
        quiz_id: quizId,
        answers,
        time_spent_seconds: timeSpent,
      }),
    }),
};

// ─── Chat ────────────────────────────────────────────────────
export interface ChatResponse {
  response: string;
  session_id: string;
  course_context: string | null;
}

export interface ChatHistoryItem {
  id: number;
  role: string;
  content: string;
  created_at: string;
}

export interface ChatSession {
  session_id: string;
  course_id: number | null;
  course_title: string | null;
  message_count: number;
  last_message_at: string;
  preview: string;
}

export const chat = {
  ask: (message: string, courseId?: number, sessionId?: string) =>
    request<ChatResponse>("/chat/ask", {
      method: "POST",
      body: JSON.stringify({ message, course_id: courseId, session_id: sessionId }),
    }),

  sessions: () => request<ChatSession[]>("/chat/sessions"),

  history: (sessionId: string) => request<ChatHistoryItem[]>(`/chat/history/${sessionId}`),

  deleteSession: (sessionId: string) =>
    request<void>(`/chat/sessions/${sessionId}`, { method: "DELETE" }),
};

// ─── Dashboard ───────────────────────────────────────────────
export interface Dashboard {
  user_id: number;
  username: string;
  xp: number;
  level: number;
  streak_days: number;
  total_time_spent_minutes: number;
  courses_enrolled: number;
  courses_completed: number;
  courses_certified: number;
  courses_quick_completed: number;
  total_quizzes_taken: number;
  average_quiz_score: number;
  completion_percentage: number;
  strengths: string[];
  weaknesses: string[];
  achievements: { name: string; description: string; icon: string; xp_reward: number; earned_at: string }[];
  recent_activity: { type: string; title: string; score: number; xp_earned: number; occurred_at: string | null }[];
  skill_summary: Record<string, unknown>[];
}

export interface LearnerInsights {
  strengths_summary: string;
  areas_summary: string;
  overall_summary: string;
}

export interface SkillGraph {
  course_id: number;
  nodes: {
    id: number;
    name: string;
    description: string | null;
    level: number;
    module_id: number | null;
    module_title: string | null;
    is_completed: boolean;
  }[];
  edges: { from_id: number; to_id: number; from_name: string; to_name: string; type: string }[];
  total_skills: number;
  completed_skills: number;
}

export interface RevisionItem {
  id: number;
  lesson_id: number;
  concept: string;
  status: string;
  next_review_date: string;
  interval_days: number;
  repetitions: number;
  lesson_title?: string;
  course_title?: string;
}

export const dashboard = {
  get: () => request<Dashboard>("/dashboard/"),

  insights: () => request<LearnerInsights>("/dashboard/insights"),

  updateProgress: (courseId: number, moduleId?: number, lessonId?: number, timeSpent?: number) =>
    request<{ status: string; new_achievements: unknown[] }>("/dashboard/progress", {
      method: "POST",
      body: JSON.stringify({
        course_id: courseId,
        module_id: moduleId,
        lesson_id: lessonId,
        time_spent_minutes: timeSpent || 0,
      }),
    }),

  skillGraph: (courseId: number) => request<SkillGraph>(`/dashboard/skill-graph/${courseId}`),

  revisions: () => request<RevisionItem[]>("/dashboard/revisions"),

  reviewRevision: (revisionItemId: number, quality: number) =>
    request<RevisionItem>("/dashboard/revisions/review", {
      method: "POST",
      body: JSON.stringify({ revision_item_id: revisionItemId, quality }),
    }),
};

export { ApiError };

// ─── Notes ───────────────────────────────────────────────────
export interface LessonNote {
  id: number;
  lesson_id: number;
  course_id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface SimplifiedExplanation {
  lesson_id: number;
  lesson_title?: string;
  score_context: number;
  simplified_explanation: string;
  key_takeaways: string[];
  analogy: string;
  self_check_questions: { question: string; answer: string }[];
  cached?: boolean;
}

export const notes = {
  getForLesson: (lessonId: number) =>
    request<LessonNote | null>(`/notes/lesson/${lessonId}`),

  saveForLesson: (lessonId: number, content: string) =>
    request<LessonNote>(`/notes/lesson/${lessonId}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    }),

  deleteNote: (noteId: number) =>
    request<void>(`/notes/${noteId}`, { method: "DELETE" }),

  getCourseNotes: (courseId: number) =>
    request<LessonNote[]>(`/notes/course/${courseId}`),
};

export const explain = {
  getCached: (courseId: number, lessonId: number) =>
    request<SimplifiedExplanation | null>(`/courses/${courseId}/lessons/${lessonId}/explain`),

  generate: (courseId: number, lessonId: number) =>
    request<SimplifiedExplanation>(`/courses/${courseId}/lessons/${lessonId}/explain`, {
      method: "POST",
    }),
};
