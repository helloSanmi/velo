import React from 'react';
import { TimelineDependencyLine, CELL_WIDTH } from './shared';

interface TimelineDependencyLinesProps {
  lines: TimelineDependencyLine[];
  totalDays: number;
  rowCount: number;
}

const TimelineDependencyLines: React.FC<TimelineDependencyLinesProps> = ({ lines, totalDays, rowCount }) => {
  if (lines.length === 0) return null;
  return (
    <svg
      className="absolute pointer-events-none"
      style={{ left: '300px', top: '40px', width: `${totalDays * CELL_WIDTH}px`, height: `${rowCount * 45}px` }}
      aria-hidden="true"
    >
      {lines.map((line, index) => (
        <path
          key={`${line.fromId}-${line.toId}-${index}`}
          d={line.d}
          stroke="#f59e0b"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="4 3"
        />
      ))}
    </svg>
  );
};

export default TimelineDependencyLines;
