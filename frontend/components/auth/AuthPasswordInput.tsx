import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface AuthPasswordInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
}

const AuthPasswordInput: React.FC<AuthPasswordInputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  show,
  onToggleShow
}) => (
  <div>
    <label className="mb-1.5 block text-xs text-slate-500">{label}</label>
    <div className="relative">
      <input
        required
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-300 px-3.5 pr-11 outline-none focus:ring-2 focus:ring-slate-300"
      />
      <button
        type="button"
        onClick={onToggleShow}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  </div>
);

export default AuthPasswordInput;
