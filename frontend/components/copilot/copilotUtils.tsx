import React from 'react';
import { Task, TaskPriority } from '../../types';

export type SpeechRecognitionCtor = new () => SpeechRecognition;

export const getSpeechRecognition = (): SpeechRecognitionCtor | null => {
  const win = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
};

export const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

export const renderAssistantText = (text: string) => {
  const rawLines = text.split('\n').map((line) => line.trim());
  const lines = rawLines.filter((line, idx) => {
    if (!line) return false;
    if (idx === 0) return true;
    const prev = rawLines[idx - 1]?.trim() || '';
    if (!prev) return true;
    const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').trim();
    return normalize(line) !== normalize(prev);
  });
  const nonEmpty = lines.filter((line) => line.length > 0);
  const isSectionHeading = (line: string) => /^[A-Za-z][A-Za-z\s]{2,}:\s*$/.test(line);
  const looksLikeTitle = (line: string) => line.length <= 64 && !line.includes('.') && !line.includes('?') && !line.includes('!');
  const topTitle =
    nonEmpty[0] && !nonEmpty[0].startsWith('- ') && !isSectionHeading(nonEmpty[0]) && looksLikeTitle(nonEmpty[0]) ? nonEmpty[0] : null;

  type Section = { title: string; items: string[] };
  const sections: Section[] = [];
  let current: Section = { title: 'Details', items: [] };
  const getSectionStyle = (title: string) => {
    const key = title.toLowerCase();
    if (key.includes('risk') || key.includes('blocker')) {
      return {
        frame: 'border-rose-200 bg-rose-50/60',
        heading: 'text-rose-700',
        dot: 'bg-rose-400'
      };
    }
    if (key.includes('action') || key.includes('next move') || key.includes('plan')) {
      return {
        frame: 'border-emerald-200 bg-emerald-50/60',
        heading: 'text-emerald-700',
        dot: 'bg-emerald-500'
      };
    }
    if (key.includes('snapshot') || key.includes('summary') || key.includes('status') || key.includes('evidence')) {
      return {
        frame: 'border-indigo-200 bg-indigo-50/50',
        heading: 'text-indigo-700',
        dot: 'bg-indigo-400'
      };
    }
    return {
      frame: 'border-slate-200 bg-slate-50/60',
      heading: 'text-slate-500',
      dot: 'bg-slate-400'
    };
  };

  const pushCurrent = () => {
    if (current.items.length === 0) return;
    sections.push(current);
  };

  lines.forEach((line) => {
    if (!line) return;
    if (topTitle && line === topTitle) return;
    if (isSectionHeading(line)) {
      pushCurrent();
      current = { title: line.replace(/:\s*$/, ''), items: [] };
      return;
    }
    current.items.push(line.startsWith('- ') ? line.slice(2) : line);
  });
  pushCurrent();

  return (
    <div className="space-y-2">
      {topTitle ? <h4 className="text-[14px] font-semibold text-slate-900">{topTitle}</h4> : null}
      {sections.length > 0
        ? sections.map((section, idx) => {
            const style = getSectionStyle(section.title);
            return (
              <div key={`${section.title}-${idx}`} className={`rounded-lg border p-2.5 ${style.frame}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-wide ${style.heading}`}>{section.title}</p>
              <div className="mt-1.5 space-y-1.5">
                {section.items.map((item, itemIdx) => (
                  <div key={`${section.title}-item-${itemIdx}`} className="flex items-start gap-2 text-[13px] leading-relaxed text-slate-800">
                    <span className={`mt-[7px] h-1.5 w-1.5 rounded-full shrink-0 ${style.dot}`} />
                    <span className="whitespace-pre-wrap">{item}</span>
                  </div>
                ))}
              </div>
              </div>
            );
          })
        : nonEmpty.map((line, idx) => (
            <p key={idx} className="text-[13px] leading-relaxed text-slate-800 whitespace-pre-wrap">
              {line}
            </p>
          ))}
    </div>
  );
};

export const buildRiskSummary = (scopedTasks: Task[], projectName: string) => {
  const total = scopedTasks.length;
  const open = scopedTasks.filter((task) => task.status !== 'done').length;
  const high = scopedTasks.filter((task) => task.priority === TaskPriority.HIGH && task.status !== 'done');
  const overdue = scopedTasks.filter((task) => Boolean(task.dueDate && task.dueDate < Date.now() && task.status !== 'done'));
  const unassigned = scopedTasks.filter((task) => (!task.assigneeIds || task.assigneeIds.length === 0) && !task.assigneeId);
  const riskLevel = overdue.length > 0 || high.length >= 3 ? 'High' : high.length > 0 || unassigned.length > 0 ? 'Medium' : 'Low';

  return [
    `Risk level: ${riskLevel}`,
    '',
    'Evidence:',
    `- Open tasks: ${open}/${total}`,
    `- High-priority open tasks: ${high.length}`,
    `- Overdue tasks: ${overdue.length}`,
    `- Unassigned tasks: ${unassigned.length}`,
    '',
    'Impact:',
    `- Main delivery risk in ${projectName} is concentration of high-priority or overdue tasks without clear ownership.`,
    '',
    'Actions:',
    '- Reassign high-priority tasks with explicit owner today.',
    '- Resolve overdue tasks first, then rebalance in-progress load.',
    '- Add due dates for open tasks missing deadlines.'
  ].join('\n');
};
