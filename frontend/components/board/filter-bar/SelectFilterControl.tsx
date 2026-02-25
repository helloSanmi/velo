import React from 'react';
import AppSelect from '../../ui/AppSelect';

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
    <AppSelect value={value} options={options} onChange={onChange} className={className} />
  );
};

export default SelectFilterControl;
