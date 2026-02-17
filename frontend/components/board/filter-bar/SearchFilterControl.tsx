import React from 'react';

interface SearchFilterControlProps {
  value: string;
  onChange: (value: string) => void;
  className: string;
}

const SearchFilterControl: React.FC<SearchFilterControlProps> = ({ value, onChange, className }) => {
  return (
    <div className="w-full">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search tasks"
        className={className}
      />
    </div>
  );
};

export default SearchFilterControl;
