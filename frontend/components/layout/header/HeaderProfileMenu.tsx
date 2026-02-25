import React from 'react';
import { ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { User as UserType } from '../../../types';
import { SettingsTabType } from '../../SettingsModal';
import { getUserFullName } from '../../../utils/userDisplay';

interface HeaderProfileMenuProps {
  user: UserType;
  isOpen: boolean;
  onToggle: () => void;
  onOpenProfile: () => void;
  onOpenSettings: (tab: SettingsTabType) => void;
  onLogout: () => void;
  onClose: () => void;
}

const HeaderProfileMenu: React.FC<HeaderProfileMenuProps> = ({
  user,
  isOpen,
  onToggle,
  onOpenProfile,
  onOpenSettings,
  onLogout,
  onClose
}) => (
  <div className="relative">
    <button
      onClick={onToggle}
      className="flex items-center gap-2 pl-1.5 sm:pl-2.5 border-l border-slate-300 outline-none group"
    >
      <div className="w-8 h-8 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 transition-transform group-hover:scale-105">
        <img src={user.avatar} className="w-full h-full object-cover" alt={user.username} title={getUserFullName(user)} />
      </div>
      <div className="hidden md:block text-left">
        <p className="text-xs font-semibold text-slate-900 leading-none tracking-tight">{user.displayName}</p>
        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mt-1">{user.role}</p>
      </div>
      <ChevronDown className={`hidden md:block w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>

    {isOpen && (
      <div className="absolute right-0 mt-4 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-4 z-[100]">
        <div className="p-3">
          <button
            onClick={() => {
              onOpenProfile();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
          >
            <User className="w-4 h-4" /> Profile
          </button>
          <button
            onClick={() => {
              onOpenSettings('general');
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
          >
            <Settings className="w-4 h-4" /> Settings
          </button>
          <div className="h-px bg-slate-100 my-2 mx-2" />
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-600 font-bold text-sm hover:bg-rose-50 transition-all">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </div>
    )}
  </div>
);

export default HeaderProfileMenu;
