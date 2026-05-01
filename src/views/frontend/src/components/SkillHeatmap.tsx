import React, { useMemo } from 'react';

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
    if (value === 0) return '#f3f4f6';
    if (maxValue <= 0) return '#f3f4f6';
    const intensity = value / maxValue;

    if (intensity < 0.25) return '#dcfce7';
    if (intensity < 0.5) return '#86efac';
    if (intensity < 0.75) return '#22c55e';
    if (intensity < 0.9) return '#16a34a';
    return '#15803d';
  };

  const topPadding = 150; // Increased from 120
  const leftPadding = 200;

  if (!displaySkills.length || !displayHeatmap.length) {
    return (
      <div className="w-full flex flex-col items-center p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">{title}</h2>
        <p className="text-sm text-gray-600 mb-6">
          Shows skill co-occurrence frequency (darker = more frequently required together)
        </p>
        <div className="w-full rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-gray-600">
          No skill clustering data available for the selected filters.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">{title}</h2>
      <p className="text-sm text-gray-600 mb-6">
        Shows skill co-occurrence frequency (darker = more frequently required together)
      </p>

      <svg
        width={width + leftPadding}
        height={height + topPadding}
        className="border border-gray-300 bg-gray-50"
      >
        {/* Title */}
        <text
          x={(width + leftPadding) / 2}
          y={30}
          textAnchor="middle"
          className="text-sm font-semibold fill-gray-700"
        >
          Skill Combinations Matrix
        </text>

        {/* Heatmap cells - Rendered first so they are behind labels */}
        {displayHeatmap.map((row, i) =>
          row.map((value, j) => (
            <g key={`cell-${i}-${j}`}>
              <rect
                x={leftPadding + j * cellSize}
                y={topPadding + i * cellSize}
                width={cellSize}
                height={cellSize}
                fill={getColor(value)}
                stroke="#d1d5db"
                strokeWidth="0.5"
              />
              {value > 0 && cellSize > 18 && (
                <text
                  x={leftPadding + j * cellSize + cellSize / 2}
                  y={topPadding + i * cellSize + cellSize / 2 + 3}
                  textAnchor="middle"
                  className="text-xs font-bold fill-gray-800"
                  style={{ fontSize: cellSize < 25 ? '8px' : '10px', pointerEvents: 'none' }}
                >
                  {value}
                </text>
              )}
            </g>
          ))
        )}

        {/* Y-axis labels (skills) - Rendered after cells to stay on top */}
        {displaySkills.map((skill, i) => (
          <g key={`y-${i}`}>
            <text
              x={leftPadding - 10}
              y={topPadding + i * cellSize + cellSize / 2 + 4}
              textAnchor="end"
              className="text-xs fill-gray-600 hover:fill-blue-600 transition-colors font-medium"
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
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          </g>
        ))}

        {/* X-axis labels (skills) - Rendered after cells to stay on top */}
        {displaySkills.map((skill, i) => (
          <g key={`x-${i}`}>
            <text
              x={leftPadding + i * cellSize + cellSize / 2}
              y={topPadding - 15} // Increased offset from -10
              textAnchor="start" // Changed from middle for better rotation alignment
              className="text-xs fill-gray-600 hover:fill-blue-600 transition-colors font-medium"
              style={{
                fontSize: '11px',
                transform: `rotate(-45deg)`,
                transformOrigin: `${leftPadding + i * cellSize + cellSize / 2}px ${topPadding - 15}px`,
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
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="mt-6 flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">Frequency:</span>
        <div className="flex gap-2">
          {[
            { label: '0', color: '#f3f4f6' },
            { label: 'Low', color: '#dcfce7' },
            { label: 'Medium', color: '#86efac' },
            { label: 'High', color: '#22c55e' },
            { label: 'Very High', color: '#15803d' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1">
              <div
                className="w-4 h-4 border border-gray-300"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div className="bg-blue-50 p-3 rounded">
          <p className="text-gray-600">Skills Analyzed</p>
          <p className="text-xl font-bold text-blue-600">{displaySkills.length}</p>
        </div>
        <div className="bg-green-50 p-3 rounded">
          <p className="text-gray-600">Max Co-occurrence</p>
          <p className="text-xl font-bold text-green-600">{maxValue}</p>
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
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-bold text-blue-900">{name}</h3>
        <span className="bg-blue-200 text-blue-900 text-xs px-2 py-1 rounded">
          Strength: {strength}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span
            key={skill}
            className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full"
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
};
