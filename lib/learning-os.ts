export type StudentProfileInput = {
  userId: string;
  goal: string;
  interest: string;
  currentLevel: "beginner" | "intermediate" | "advanced";
  semesterWeeks: number;
  dailyMinutes: number;
};

export type LearnerLevel = "beginner" | "intermediate" | "advanced";

export type RoadmapStep = {
  step: string;
  type: "learn" | "practice" | "revise";
  domain: string;
  platform: string;
  estimatedMinutes: number;
  prerequisites: string[];
};

type RawRoadmapStep = Partial<RoadmapStep> & { step?: string };

const fallbackTopics = [
  "Prerequisite checkpoint and setup",
  "Core concept deep dive",
  "Guided coding exercise",
  "Applied mini assignment",
  "Error-fixing and edge-case drills",
  "Timed practice set",
  "Revision and memory consolidation",
  "Final project or assessment submission",
];

export function buildRoadmapPrompt(profile: StudentProfileInput): string {
  const mernHint =
    /mern|mongo|express|react|node/i.test(profile.goal) ||
    /mern|mongo|express|react|node/i.test(profile.interest)
      ? `\nSpecial prerequisite rule for MERN-like goals:
- First 2 steps must explicitly cover HTML, CSS, and JavaScript fundamentals.
- Add one prerequisite step for Git/GitHub basics before backend/API work.\n`
      : "";

  return `You are an academic planner creating a high-quality actionable roadmap for a university student.

Goal: ${profile.goal}
Interest track: ${profile.interest}
Current level: ${profile.currentLevel}
Semester duration in weeks: ${profile.semesterWeeks}
Daily study minutes: ${profile.dailyMinutes}

Output rules:
- Return ONLY a JSON array with 8 objects.
- Each object must include:
  - step (string, clear and specific; no vague titles)
  - type ("learn" | "practice" | "revise")
  - domain (string, one of: Foundation, Core, Implementation, Revision, Assessment)
  - platform (string, realistic source like "Official Docs", "YouTube", "LeetCode", "Kaggle", "GitHub")
  - estimatedMinutes (number)
  - prerequisites (string array, can be empty)
- Order the steps from fundamentals to outcome.
- Include at least:
  - 3 learn steps
  - 3 practice steps
  - 1 revise step
  - 1 assessment/project step
- Keep each step measurable (student should know when it is done).
- estimatedMinutes should be between 45 and 180.
- prerequisites should reference earlier step titles when needed.
- Avoid generic words like "understand topic", "explore concepts", "research".
${mernHint}

Bad examples: "Learn basics", "Practice more", "Revise all".
Good examples: "Build a custom hooks library with useFetch and useDebounce".`;
}

export function parseRoadmap(rawText: string): RoadmapStep[] {
  const normalized = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

  try {
    const parsed = JSON.parse(normalized);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, index) => normalizeRoadmapStep(item as RawRoadmapStep, index))
      .filter((item): item is RoadmapStep => item !== null);
  } catch {
    return [];
  }
}

export function fallbackRoadmap(profile: StudentProfileInput): RoadmapStep[] {
  return fallbackTopics.map((topic, index) => ({
    step: `${topic}: ${profile.goal}`,
    type: index < 3 ? "learn" : index < 6 ? "practice" : "revise",
    domain:
      index < 2 ? "Foundation" : index < 5 ? "Implementation" : index < 7 ? "Revision" : "Assessment",
    platform: index % 2 === 0 ? "YouTube" : "Official Docs",
    estimatedMinutes: Math.max(45, Math.min(180, Math.floor(profile.dailyMinutes * 1.2))),
    prerequisites: index === 0 ? [] : [fallbackTopics[index - 1]],
  }));
}

function normalizeRoadmapStep(
  step: RawRoadmapStep,
  index: number
): RoadmapStep | null {
  if (!step.step || typeof step.step !== "string") return null;

  const type = step.type === "practice" || step.type === "revise" ? step.type : "learn";

  return {
    step: step.step.trim(),
    type,
    domain: typeof step.domain === "string" && step.domain.trim().length > 0
      ? step.domain.trim()
      : "General Learning",
    platform:
      typeof step.platform === "string" && step.platform.trim().length > 0
        ? step.platform.trim()
        : "Web Search",
    estimatedMinutes:
      typeof step.estimatedMinutes === "number" && Number.isFinite(step.estimatedMinutes)
        ? Math.max(20, Math.round(step.estimatedMinutes))
        : 45 + index * 5,
    prerequisites: Array.isArray(step.prerequisites)
      ? step.prerequisites.filter((item): item is string => typeof item === "string")
      : [],
  };
}

// Learning OS v2 prompt contracts
export type LearningTopic = {
  id: string;
  name: string;
  why: string;
  prereqs: string[];
  estimated_hours: number;
  mastery_target: 0.8;
};

export type LearningPhase = {
  phase: number;
  name: string;
  topics: LearningTopic[];
};

export type LearningRoadmap = {
  title: string;
  estimated_weeks: number;
  phases: LearningPhase[];
};

export type SessionUpdateResult = {
  new_mastery_score: number;
  profile_updates: {
    avg_response_time: number;
    struggle_topics: string[];
    strong_topics: string[];
  };
  spaced_repetition: {
    add_to_queue: boolean;
    review_in_days: number;
  };
  burnout_flag: boolean;
  ai_insight: string;
};

export type DailyTask = {
  id: string;
  type: "new_lesson" | "review" | "quiz" | "project";
  topic_id: string;
  topic_name: string;
  why_today: string;
  estimated_minutes: number;
  priority: "high" | "medium" | "low";
};

export type DailyTaskPlan = {
  tasks: DailyTask[];
  motivational_note: string;
};

export type WeeklyReport = {
  headline: string;
  what_you_mastered: string;
  what_needs_work: string;
  next_week_focus: string;
  mastery_change: { topic: string; before: number; after: number };
  streak_days: number;
  weekly_score: number;
  ai_recommendation: string;
};

const jsonOnlyInstruction = "Always respond in valid JSON only. No markdown, no explanation outside the JSON.";

export function buildLearningRoadmapPrompt(input: {
  goal: string;
  level: LearnerLevel;
  daily_minutes: number;
}): string {
  return `SYSTEM:
You are the brain of a Learning OS. You generate structured learning roadmaps.
${jsonOnlyInstruction}

USER:
The learner wants to learn: ${input.goal}

Their current level: ${input.level} (beginner / intermediate / advanced)
Time available per day: ${Math.max(1, Math.floor(input.daily_minutes))} minutes

Return this exact JSON:
{
  "title": "roadmap title",
  "estimated_weeks": number,
  "phases": [
    {
      "phase": 1,
      "name": "phase name",
      "topics": [
        {
          "id": "unique_id",
          "name": "topic name",
          "why": "one sentence why this matters",
          "prereqs": ["topic_id_if_any"],
          "estimated_hours": number,
          "mastery_target": 0.8
        }
      ]
    }
  ]
}`;
}

export function buildSessionUpdatePrompt(input: {
  learner_profile_json: string;
  topic_name: string;
  correct: number;
  total: number;
  time_sec: number;
  hints: number;
  skipped: number;
}): string {
  return `SYSTEM:
You are the brain of a Learning OS. Analyse session data and update the learner profile.
Respond in valid JSON only.

USER:
Learner profile so far:
${input.learner_profile_json}

Session just completed:
- Topic: ${input.topic_name}
- Correct answers: ${Math.max(0, input.correct)} / ${Math.max(0, input.total)}
- Time taken (seconds): ${Math.max(0, Math.floor(input.time_sec))}
- Hints used: ${Math.max(0, input.hints)}
- Questions skipped: ${Math.max(0, input.skipped)}

Return this JSON:
{
  "new_mastery_score": 0.0-1.0,
  "profile_updates": {
    "avg_response_time": number,
    "struggle_topics": ["topic if score < 0.6"],
    "strong_topics": ["topic if score > 0.85"]
  },
  "spaced_repetition": {
    "add_to_queue": true/false,
    "review_in_days": number
  },
  "burnout_flag": true/false,
  "ai_insight": "one sentence the UI will show - e.g. Noticed 3 wrong answers on closures, inserting a prerequisite review."
}`;
}

export function buildTodayTasksPrompt(input: {
  date: string;
  learner_profile_json: string;
  roadmap_progress_json: string;
  sr_queue_json: string;
  yesterday_summary: string;
}): string {
  return `SYSTEM:
You are the brain of a Learning OS. Generate today's personalised learning tasks.
Respond in valid JSON only.

USER:
Today is ${input.date}.

Learner profile:
${input.learner_profile_json}

Roadmap progress (topics with mastery scores):
${input.roadmap_progress_json}

Spaced repetition queue (topics due for review today):
${input.sr_queue_json}

Yesterday's performance summary:
${input.yesterday_summary}

Generate 3-5 tasks for today. Mix new learning with reviews.
Return this JSON:
{
  "tasks": [
    {
      "id": "task_id",
      "type": "new_lesson | review | quiz | project",
      "topic_id": "from roadmap",
      "topic_name": "display name",
      "why_today": "one sentence reason this was chosen",
      "estimated_minutes": number,
      "priority": "high | medium | low"
    }
  ],
  "motivational_note": "one short personalised note based on their progress"
}`;
}

export function buildWeeklyReportPrompt(input: {
  week_range: string;
  sessions_json: string;
  mastered_topics: string;
  struggling_topics: string;
  total_minutes: number;
  completed: number;
  assigned: number;
}): string {
  return `SYSTEM:
You are the brain of a Learning OS. Write a weekly progress report for the learner.
Respond in valid JSON only.

USER:
Week of: ${input.week_range}

All sessions this week:
${input.sessions_json}

Topics mastered (score >= 0.8): ${input.mastered_topics}
Topics struggling (score < 0.6): ${input.struggling_topics}
Total study time (minutes): ${Math.max(0, Math.floor(input.total_minutes))}
Tasks completed vs assigned: ${Math.max(0, input.completed)}/${Math.max(0, input.assigned)}

Return this JSON:
{
  "headline": "one punchy summary sentence",
  "what_you_mastered": "2-3 sentences about wins",
  "what_needs_work": "2-3 sentences, constructive not harsh",
  "next_week_focus": "2-3 sentences on what to prioritise",
  "mastery_change": { "topic": "name", "before": 0.0, "after": 0.0 },
  "streak_days": number,
  "weekly_score": 0-100,
  "ai_recommendation": "one specific actionable tip"
}`;
}

export function buildTutorPrompt(input: {
  current_topic: string;
  mastery_score: number;
  level: LearnerLevel;
  struggle_topics: string;
  learner_question: string;
}): string {
  return `SYSTEM:
You are a personal AI tutor inside a Learning OS.
The learner is currently studying: ${input.current_topic}
Their mastery on this topic: ${Math.max(0, Math.min(1, input.mastery_score))}/1.0
Their level: ${input.level}

Known struggle areas: ${input.struggle_topics}

Rules:
- Explain at their level, not above it
- Use analogies and examples, not definitions
- If they are struggling (mastery < 0.6), simplify further
- Keep answers under 150 words unless they ask to go deeper
- End with one follow-up question to check understanding

USER:
${input.learner_question}`;
}

export function parseStructuredJson<T>(rawText: string): T | null {
  const normalized = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(normalized) as T;
  } catch {
    return null;
  }
}
