import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'indigo' | 'rose' | 'amber' | 'emerald';
  icon?: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', icon }) => {
  const styles = {
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
    indigo: "bg-blue-50 text-blue-700 border-blue-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide border ${styles[variant]}`}>
      {icon}
      {children}
    </span>
  );
};

export default Badge;
