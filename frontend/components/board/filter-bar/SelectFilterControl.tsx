import React from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SelectFilterControlProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className: string;
}

const SelectFilterControl: React.FC<SelectFilterControlProps> = ({ value, options, onChange, className }) => {
  return (
    <div className="relative w-full">
      <select value={value} onChange={(event) => onChange(event.target.value)} className={`${className} velo-select appearance-none pr-7 cursor-pointer`}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
    </div>
  );
};

export default SelectFilterControl;
