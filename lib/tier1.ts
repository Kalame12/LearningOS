export type DailyTaskRow = {
  id: string;
  topic: string;
  task_type: "learn" | "practice" | "revise";
  status: "pending" | "in_progress" | "completed";
  estimated_minutes: number;
  priority_score: number;
  due_date: string;
  intervention?: "accelerate" | "reinforce" | "revise" | "stabilize";
  whyNow?: string;
};

type MasteryRow = {
  mastery_score: number;
  next_review_date: string | null;
};

export function calculatePriority(params: {
  isRoadmapNext: boolean;
  reviewDue: boolean;
  weaknessScore: number;
}): number {
  const roadmapPart = params.isRoadmapNext ? 1 : 0.2;
  const revisionPart = params.reviewDue ? 1 : 0;
  const weaknessPart = Math.max(0, Math.min(1, params.weaknessScore));

  return Number((0.4 * roadmapPart + 0.35 * revisionPart + 0.25 * weaknessPart).toFixed(3));
}

export function updateMasteryScore(params: {
  current: number;
  correct: number;
  total: number;
  hintsUsed: number;
  skippedCount: number;
  timeSpentMinutes: number;
  estimatedMinutes: number;
}): number {
  const accuracy = params.total > 0 ? params.correct / params.total : 0;
  const hintPenalty = Math.min(0.2, params.hintsUsed * 0.04);
  const skipPenalty = Math.min(0.25, params.skippedCount * 0.08);
  const timePenalty =
    params.estimatedMinutes > 0 && params.timeSpentMinutes > params.estimatedMinutes * 1.4
      ? 0.05
      : 0;

  const positive = accuracy >= 0.8 ? 0.12 : accuracy >= 0.6 ? 0.07 : 0.02;
  const delta = positive - hintPenalty - skipPenalty - timePenalty;
  return clamp01(params.current + delta);
}

export function nextRevisionDate(
  mastery: MasteryRow | null,
  updatedScore: number,
  today = new Date()
): string {
  let days = 1;
  if (updatedScore >= 0.85) days = 7;
  else if (updatedScore >= 0.7) days = 3;
  else if (updatedScore >= 0.55) days = 2;
  else days = 1;

  if (mastery?.next_review_date) {
    const existing = new Date(mastery.next_review_date);
    if (!Number.isNaN(existing.valueOf()) && existing > today) {
      return mastery.next_review_date;
    }
  }

  const next = new Date(today);
  next.setDate(today.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}
