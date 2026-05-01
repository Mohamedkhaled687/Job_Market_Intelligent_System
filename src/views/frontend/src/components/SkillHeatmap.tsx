import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface SkillHeatmapProps {
  skills: string[];
  heatmapData: number[][];
  title?: string;
  width?: number;
  height?: number;
}

/**
 * Heatmap component for skill co-occurrence visualization
 * Shows which skills are frequently required together
 */
export const SkillHeatmap: React.FC<SkillHeatmapProps> = ({
  skills,
  heatmapData,
  title = 'Skill Co-Occurrence Heatmap',
  width = 800,
  height = 600,
}) => {
  const displaySkills = skills.slice(0, 20);
  const displayHeatmap = heatmapData
    .slice(0, 20)
    .map((row) => row.slice(0, 20));

  const cellSize = useMemo(() => {
    const maxSkills = Math.min(skills.length, 20);
    if (maxSkills === 0) {
      return 0;
    }

    return Math.floor(Math.min(width, height) / maxSkills) - 2;
  }, [skills.length, width, height]);

  const maxValue = useMemo(() => {
    const flattened = heatmapData.flat();
    if (!flattened.length) {
      return 0;
    }

    return Math.max(...flattened);
  }, [heatmapData]);

  const getColor = (value: number): string => {
    if (value === 0) return 'hsl(var(--muted))';
    if (maxValue <= 0) return 'hsl(var(--muted))';
    const intensity = value / maxValue;

    if (intensity < 0.25) return 'hsl(142 55% 85%)';
    if (intensity < 0.5) return 'hsl(142 55% 70%)';
    if (intensity < 0.75) return 'hsl(142 55% 55%)';
    if (intensity < 0.9) return 'hsl(142 60% 42%)';
    return 'hsl(142 65% 32%)';
  };

  const topPadding = 120;
  const leftPadding = 200;

  if (!displaySkills.length || !displayHeatmap.length) {
    return (
      <div className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <h2 className="mb-2 text-xl font-semibold text-[hsl(var(--foreground))]">{title}</h2>
        <p className="mb-6 text-sm text-[hsl(var(--muted-foreground))]">
          Shows skill co-occurrence frequency (darker = more frequently required together)
        </p>
        <div className="w-full rounded-lg border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.4] px-6 py-12 text-center text-[hsl(var(--muted-foreground))]">
          No skill clustering data available for the selected filters.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
      <h2 className="mb-2 text-xl font-semibold text-[hsl(var(--foreground))]">{title}</h2>
      <p className="mb-6 text-sm text-[hsl(var(--muted-foreground))]">
        Shows skill co-occurrence frequency (darker = more frequently required together)
      </p>
      <div className="w-full overflow-x-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.35] p-3">
      <svg width={width + leftPadding} height={height + topPadding}>
        {/* Title */}
        <text
          x={(width + leftPadding) / 2}
          y={30}
          textAnchor="middle"
          className="text-sm font-semibold fill-[hsl(var(--foreground))]"
        >
          Skill Combinations Matrix
        </text>

        {/* Y-axis labels (skills) */}
        {displaySkills.map((skill, i) => (
          <g key={`y-${i}`}>
            <text
              x={leftPadding - 10}
              y={topPadding + i * cellSize + cellSize / 2 + 4}
              textAnchor="end"
              className="text-xs fill-[hsl(var(--muted-foreground))]"
              style={{ fontSize: '11px' }}
            >
              {skill}
            </text>
            {/* Horizontal grid line */}
            <line
              x1={leftPadding}
              y1={topPadding + i * cellSize}
              x2={leftPadding + width - leftPadding}
              y2={topPadding + i * cellSize}
              stroke="hsl(var(--border))"
              strokeWidth="1"
            />
          </g>
        ))}

        {/* X-axis labels (skills) */}
        {displaySkills.map((skill, i) => (
          <g key={`x-${i}`}>
            <text
              x={leftPadding + i * cellSize + cellSize / 2}
              y={topPadding - 10}
              textAnchor="middle"
              className="text-xs fill-[hsl(var(--muted-foreground))]"
              style={{
                fontSize: '11px',
                transform: `rotate(-45deg)`,
                transformOrigin: `${leftPadding + i * cellSize + cellSize / 2}px ${topPadding - 10}px`,
              }}
            >
              {skill}
            </text>
            {/* Vertical grid line */}
            <line
              x1={leftPadding + i * cellSize}
              y1={topPadding}
              x2={leftPadding + i * cellSize}
              y2={topPadding + height - topPadding}
              stroke="hsl(var(--border))"
              strokeWidth="1"
            />
          </g>
        ))}

        {/* Heatmap cells */}
        {displayHeatmap.map((row, i) =>
          row.map((value, j) => (
            <g key={`cell-${i}-${j}`}>
              <rect
                x={leftPadding + j * cellSize}
                y={topPadding + i * cellSize}
                width={cellSize}
                height={cellSize}
                fill={getColor(value)}
                stroke="hsl(var(--border))"
                strokeWidth="0.5"
              />
              {value > 0 && cellSize > 15 && (
                <text
                  x={leftPadding + j * cellSize + cellSize / 2}
                  y={topPadding + i * cellSize + cellSize / 2 + 3}
                  textAnchor="middle"
                  className="text-xs font-semibold fill-[hsl(var(--foreground))]"
                  style={{ fontSize: cellSize < 25 ? '8px' : '10px' }}
                >
                  {value}
                </text>
              )}
            </g>
          ))
        )}
      </svg>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-[hsl(var(--foreground))]">Frequency:</span>
        <div className="flex gap-2">
          {[
            { label: '0', color: 'hsl(var(--muted))' },
            { label: 'Low', color: 'hsl(142 55% 85%)' },
            { label: 'Medium', color: 'hsl(142 55% 70%)' },
            { label: 'High', color: 'hsl(142 55% 55%)' },
            { label: 'Very High', color: 'hsl(142 65% 32%)' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1">
              <div
                className="h-4 w-4 border border-[hsl(var(--border))]"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-[hsl(var(--muted-foreground))]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.35] p-3">
          <p className="text-[hsl(var(--muted-foreground))]">Skills Analyzed</p>
          <p className="text-xl font-bold text-[hsl(var(--foreground))]">{displaySkills.length}</p>
        </div>
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.35] p-3">
          <p className="text-[hsl(var(--muted-foreground))]">Max Co-occurrence</p>
          <p className="text-xl font-bold text-[hsl(var(--foreground))]">{maxValue}</p>
        </div>
      </div>
    </div>
  );
};

interface SkillClusterProps {
  name: string;
  skills: string[];
  strength: number;
}

/**
 * Display skill clusters identified from the heatmap
 */
export const SkillClusterCard: React.FC<SkillClusterProps> = ({
  name,
  skills,
  strength,
}) => {
  return (
    <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-bold text-[hsl(var(--foreground))]">{name}</h3>
        <span className="rounded bg-[hsl(var(--primary))/0.15] px-2 py-1 text-xs text-[hsl(var(--primary))]">
          Strength: {strength}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span
            key={skill}
            className={cn(
              "rounded-full px-3 py-1 text-xs",
              "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
            )}
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
};
