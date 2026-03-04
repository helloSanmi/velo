import React from 'react';

interface GanttDependencyLinesSvgProps {
  dependencyLines: Array<{
    id: string;
    d: string;
    isFocused: boolean;
    health: 'on-track' | 'blocked-risk';
  }>;
  lanePixelWidth: number;
  rowHeight: number;
  rowCount: number;
}

const GanttDependencyLinesSvg: React.FC<GanttDependencyLinesSvgProps> = ({
  dependencyLines,
  lanePixelWidth,
  rowHeight,
  rowCount
}) => {
  if (dependencyLines.length === 0) return null;
  return (
    <svg
      className="pointer-events-none absolute left-[320px] top-0"
      width={lanePixelWidth}
      height={Math.max(rowHeight * rowCount, rowHeight)}
    >
      <defs>
        <marker id="gantt-arrow-on-track-focused" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#047857" />
        </marker>
        <marker id="gantt-arrow-on-track-muted" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
        </marker>
        <marker id="gantt-arrow-risk-focused" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#b91c1c" />
        </marker>
        <marker id="gantt-arrow-risk-muted" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
        </marker>
      </defs>
      {dependencyLines.map((line) => {
        const isRisk = line.health === 'blocked-risk';
        const stroke = isRisk ? (line.isFocused ? '#b91c1c' : '#ef4444') : line.isFocused ? '#047857' : '#10b981';
        const marker = isRisk
          ? line.isFocused
            ? 'url(#gantt-arrow-risk-focused)'
            : 'url(#gantt-arrow-risk-muted)'
          : line.isFocused
            ? 'url(#gantt-arrow-on-track-focused)'
            : 'url(#gantt-arrow-on-track-muted)';
        return (
          <path
            key={line.id}
            d={line.d}
            fill="none"
            stroke={stroke}
            strokeWidth={line.isFocused ? '2' : '1.5'}
            strokeDasharray="4 3"
            markerEnd={marker}
          />
        );
      })}
    </svg>
  );
};

export default GanttDependencyLinesSvg;
