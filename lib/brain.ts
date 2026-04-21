import { calculatePriority } from "@/lib/tier1";

export type BrainRoadmapStep = {
  id: string;
  step: string;
  type: "learn" | "practice" | "revise";
  status: string;
  order_index: number;
};

export type BrainMasteryRow = {
  topic: string;
  mastery_score: number;
  next_review_date: string | null;
};

export type BrainAttemptRow = {
  task_id: string;
  correct_count: number;
  total_count: number;
  hints_used: number;
  skipped_count: number;
  time_spent_minutes: number;
};

export type BrainTaskRefRow = {
  id: string;
  topic: string;
  estimated_minutes: number;
};

export type BrainPlannedTask = {
  roadmap_step_id: string;
  topic: string;
  task_type: "learn" | "practice" | "revise";
  priority_score: number;
  estimated_minutes: number;
  intervention: "accelerate" | "reinforce" | "revise" | "stabilize";
  whyNow: string;
};

export function aggregateState(params: {
  steps: BrainRoadmapStep[];
  masteryRows: BrainMasteryRow[];
  yesterdayAttempts: BrainAttemptRow[];
  yesterdayTasks: BrainTaskRefRow[];
  today: string;
}) {
  const masteryMap = new Map(
    (params.masteryRows || []).map((row) => [String(row.topic).toLowerCase(), row])
  );
  const yesterdayTaskMap = new Map((params.yesterdayTasks || []).map((t) => [t.id, t]));
  const yesterdayPerformanceByTopic = new Map<string, number>();

  for (const attempt of params.yesterdayAttempts || []) {
    const task = yesterdayTaskMap.get(attempt.task_id);
    if (!task?.topic) continue;
    const topicKey = String(task.topic).toLowerCase();
    const total = Number(attempt.total_count || 0);
    const accuracy = total > 0 ? Number(attempt.correct_count || 0) / total : 0;
    const hintsPenalty = Math.min(0.2, Number(attempt.hints_used || 0) * 0.04);
    const skipPenalty = Math.min(0.25, Number(attempt.skipped_count || 0) * 0.08);
    const overtime =
      Number(task.estimated_minutes || 30) > 0 &&
      Number(attempt.time_spent_minutes || 0) > Number(task.estimated_minutes || 30) * 1.3
        ? 0.05
        : 0;
    const performance = Math.max(0, Math.min(1, accuracy - hintsPenalty - skipPenalty - overtime));
    const prev = yesterdayPerformanceByTopic.get(topicKey);
    yesterdayPerformanceByTopic.set(topicKey, prev === undefined ? performance : (prev + performance) / 2);
  }

  return { masteryMap, yesterdayPerformanceByTopic, today: params.today };
}

export function buildNextDayPlan(params: {
  userId: string;
  steps: BrainRoadmapStep[];
  state: ReturnType<typeof aggregateState>;
  today: string;
}): BrainPlannedTask[] {
  const { steps, state } = params;
  const firstPendingIndex = steps.findIndex((step) => step.status === "not_started");
  const nextSteps = steps.slice(Math.max(0, firstPendingIndex), Math.max(0, firstPendingIndex) + 4);
  const candidates = nextSteps.length > 0 ? nextSteps : steps.slice(0, 4);

  const taskRows: BrainPlannedTask[] = candidates.map((step, idx) => {
    const mastery = state.masteryMap.get(step.step.toLowerCase());
    const reviewDue = mastery?.next_review_date ? mastery.next_review_date <= state.today : false;
    const weakness = mastery ? 1 - Number(mastery.mastery_score || 0) : 0.5;
    const baseScore = calculatePriority({
      isRoadmapNext: idx < 2,
      reviewDue,
      weaknessScore: weakness,
    });
    const yesterdayPerformance = state.yesterdayPerformanceByTopic.get(step.step.toLowerCase());
    const yesterdayWeakness =
      yesterdayPerformance === undefined ? 0 : Number((1 - yesterdayPerformance).toFixed(3));
    const adjustedScore = Number(
      Math.min(1, baseScore + yesterdayWeakness * 0.2 + (reviewDue ? 0.05 : 0)).toFixed(3)
    );
    const inferredType = reviewDue ? "revise" : step.type || "learn";
    const intervention: BrainPlannedTask["intervention"] = reviewDue
      ? "revise"
      : weakness >= 0.55 || yesterdayWeakness >= 0.45
      ? "reinforce"
      : idx < 2
      ? "accelerate"
      : "stabilize";

    return {
      roadmap_step_id: step.id,
      topic: step.step,
      task_type: inferredType as "learn" | "practice" | "revise",
      priority_score: adjustedScore,
      estimated_minutes: inferredType === "learn" ? 40 : 25,
      intervention,
      whyNow: explainWhyNow({
        isRoadmapNext: idx < 2,
        reviewDue,
        weakness,
        yesterdayWeakness,
        intervention,
      }),
    };
  });

  const prerequisiteRows: BrainPlannedTask[] = [];
  for (const step of candidates) {
    const mastery = state.masteryMap.get(step.step.toLowerCase());
    if (!mastery || Number(mastery.mastery_score ?? 1) >= 0.5) continue;
    const previous = steps.find((s) => s.order_index === step.order_index - 1);
    if (!previous) continue;
    prerequisiteRows.push({
      roadmap_step_id: previous.id,
      topic: `${previous.step} (Prerequisite Review)`,
      task_type: "revise",
      priority_score: 0.98,
      estimated_minutes: 20,
      intervention: "reinforce",
      whyNow: "Your recent mastery on this path is low, so prerequisite reinforcement is scheduled first.",
    });
  }

  const uniqueRows = [...prerequisiteRows, ...taskRows]
    .filter((row, index, arr) => arr.findIndex((x) => x.topic === row.topic) === index)
    .sort((a, b) => b.priority_score - a.priority_score);

  if (uniqueRows.length < 3) {
    const existingStepIds = new Set(uniqueRows.map((row) => row.roadmap_step_id));
    const fallbackRows = steps
      .filter((step) => !existingStepIds.has(step.id))
      .slice(0, 3 - uniqueRows.length)
      .map((step, idx) => ({
        roadmap_step_id: step.id,
        topic: step.step,
        task_type: (step.type || "learn") as "learn" | "practice" | "revise",
        priority_score: Number((0.55 - idx * 0.02).toFixed(3)),
        estimated_minutes: step.type === "learn" ? 40 : 25,
        intervention: "stabilize" as const,
        whyNow: "Added to keep your learning momentum with a complete 3-task minimum daily plan.",
      }));
    uniqueRows.push(...fallbackRows);
  }

  return uniqueRows.slice(0, 5);
}

function explainWhyNow(params: {
  isRoadmapNext: boolean;
  reviewDue: boolean;
  weakness: number;
  yesterdayWeakness: number;
  intervention: BrainPlannedTask["intervention"];
}): string {
  const reasons: string[] = [];
  if (params.reviewDue) reasons.push("spaced-revision is due today");
  if (params.isRoadmapNext) reasons.push("it is the next critical roadmap step");
  if (params.weakness >= 0.45) reasons.push("mastery is currently weak");
  if (params.yesterdayWeakness >= 0.35) reasons.push("yesterday performance dropped");
  if (reasons.length === 0) reasons.push("it keeps balanced forward progress");
  return `${capitalize(params.intervention)} strategy: ${reasons.join(", ")}.`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
