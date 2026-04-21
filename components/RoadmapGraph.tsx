"use client";

type Step = {
  id: string;
  step: string;
  type: string;
  domain: string;
  platform: string;
  status: string;
};

type Props = {
  steps: Step[];
  onStepClick: (step: Step) => void;
};

export default function RoadmapGraph({ steps, onStepClick }: Props) {
  const ordered = [...steps];
  const levels: Step[][] = [];
  let cursor = 0;
  let width = 1;
  while (cursor < ordered.length) {
    levels.push(ordered.slice(cursor, cursor + width));
    cursor += width;
    width *= 2;
  }

  const nodeWidth = 180;
  const nodeHeight = 64;
  const colGap = 56;
  const rowGap = 74;
  const padX = 36;
  const padY = 24;

  const maxCols = Math.max(...levels.map((l) => l.length), 1);
  const svgWidth = padX * 2 + maxCols * nodeWidth + (maxCols - 1) * colGap;
  const svgHeight = padY * 2 + levels.length * nodeHeight + (levels.length - 1) * rowGap;

  const positions = new Map<string, { x: number; y: number; index: number }>();
  let absoluteIndex = 0;
  levels.forEach((level, levelIndex) => {
    const totalLevelWidth = level.length * nodeWidth + Math.max(0, level.length - 1) * colGap;
    const startX = (svgWidth - totalLevelWidth) / 2;
    const y = padY + levelIndex * (nodeHeight + rowGap);
    level.forEach((step, i) => {
      const x = startX + i * (nodeWidth + colGap);
      positions.set(step.id, { x, y, index: absoluteIndex });
      absoluteIndex += 1;
    });
  });

  const getStrokePath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const startX = from.x + nodeWidth / 2;
    const startY = from.y + nodeHeight;
    const endX = to.x + nodeWidth / 2;
    const endY = to.y;
    const midY = (startY + endY) / 2;
    return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
  };

  return (
    <div className="card p-4 overflow-x-auto">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-semibold text-zinc-200">Roadmap Tree</span>
        <span className="text-xs text-zinc-500">(NeetCode-style)</span>
      </div>
      <div className="min-w-[860px]">
        <svg width={svgWidth} height={svgHeight} className="mx-auto">
          {ordered.map((step, idx) => {
            if (idx === 0) return null;
            const parentIndex = Math.floor((idx - 1) / 2);
            const parent = ordered[parentIndex];
            if (!parent) return null;
            const from = positions.get(parent.id);
            const to = positions.get(step.id);
            if (!from || !to) return null;
            return (
              <path
                key={`edge-${parent.id}-${step.id}`}
                d={getStrokePath(from, to)}
                fill="none"
                stroke="#d4d4d8"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            );
          })}

          {ordered.map((step) => {
            const pos = positions.get(step.id);
            if (!pos) return null;
            const completed = step.status === "completed";
            const bg = completed ? "#3b82f6" : "#a855f7";
            return (
              <g key={step.id} onClick={() => onStepClick(step)} style={{ cursor: "pointer" }}>
                <rect
                  x={pos.x}
                  y={pos.y}
                  rx={10}
                  ry={10}
                  width={nodeWidth}
                  height={nodeHeight}
                  fill={bg}
                  stroke={completed ? "#93c5fd" : "#d8b4fe"}
                  strokeWidth={1.5}
                />
                <text
                  x={pos.x + nodeWidth / 2}
                  y={pos.y + 25}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={12}
                  fontWeight={700}
                >
                  {truncate(step.step, 26)}
                </text>
                <rect
                  x={pos.x + 16}
                  y={pos.y + 42}
                  rx={4}
                  ry={4}
                  width={nodeWidth - 32}
                  height={7}
                  fill="#93c5fd"
                  opacity={0.95}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}