export type StudentProfileInput = {
  userId: string;
  goal: string;
  interest: string;
  currentLevel: "beginner" | "intermediate" | "advanced";
  semesterWeeks: number;
  dailyMinutes: number;
  subjects?: string[];
};

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
  "Foundations",
  "Core Concepts",
  "Guided Practice",
  "Applied Assignment",
  "Revision Sprint",
  "Mock Assessment",
];

export function buildRoadmapPrompt(profile: StudentProfileInput): string {
  const subject = profile.subjects?.[0] || profile.goal;
  const stepCount = Math.min(12, Math.max(8, Math.round((profile.semesterWeeks || 16) / 2)));

  return `You are an expert curriculum designer. Create a practical, structured learning roadmap for a university student.

Subject: ${subject}
Student level: ${profile.currentLevel}
Semester: ${profile.semesterWeeks} weeks  |  Daily study: ${profile.dailyMinutes} min/day

Design a ${stepCount}-step roadmap that:
1. Starts from ${profile.currentLevel} level — skip redundant basics if intermediate/advanced
2. Each step is a concrete, actionable topic (NOT vague like "Introduction" or "Advanced Concepts")
3. Builds progressively — each step unlocks the next
4. Mixes theory (learn), hands-on coding/projects (practice), and spaced review (revise) in a 50/30/20 ratio
5. Names steps SPECIFICALLY: "Binary Search Trees: Insert & Delete" not "Data Structures"
6. Picks the single best free platform/resource per step

Return ONLY a valid JSON array — no markdown, no explanation, no wrapper:
[
  {
    "step": "Specific topic name",
    "type": "learn",
    "domain": "sub-domain",
    "platform": "Best free resource",
    "estimatedMinutes": 45,
    "prerequisites": []
  }
]

Constraints:
- Exactly ${stepCount} steps
- No step named just "General", "Introduction", "Overview", or "Basics" without a specific qualifier
- estimatedMinutes between 30 and 90
- prerequisites: exact step names from earlier in the array only`;
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
    step: `${topic} for ${profile.goal}`,
    type: index < 2 ? "learn" : index < 4 ? "practice" : "revise",
    domain: profile.interest || "General Learning",
    platform: index % 2 === 0 ? "YouTube" : "Official Docs",
    estimatedMinutes: Math.max(30, Math.floor(profile.dailyMinutes * 0.8)),
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
