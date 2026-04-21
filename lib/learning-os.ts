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
  const subjectsLine =
    profile.subjects && profile.subjects.length > 0
      ? `Specific topics to cover: ${profile.subjects.join(", ")}`
      : "";

  return `Create a semester roadmap for a university student.

Goal: ${profile.goal}
Interest track: ${profile.interest}
Current level: ${profile.currentLevel}
Semester duration in weeks: ${profile.semesterWeeks}
Daily study minutes: ${profile.dailyMinutes}
${subjectsLine}

Output rules:
- Return ONLY a JSON array with 6 objects.
- Each object must include:
  - step (string) — name it after one of the specific topics listed above when possible
  - type ("learn" | "practice" | "revise")
  - domain (string)
  - platform (string, suggest one source)
  - estimatedMinutes (number)
  - prerequisites (string array, can be empty)
- Order the steps for progressive learning.
- Keep names concise and student-friendly.`;
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
