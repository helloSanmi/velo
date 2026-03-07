import React from 'react';
import { X, Settings } from 'lucide-react';
import { User as UserType, Project, Task } from '../types';
import SettingsModalContent from './settings/SettingsModalContent';
import { useSettingsModalController } from './settings/useSettingsModalController';
import { SettingsTabType } from './settings/settingsModal.types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTabType;
  user?: UserType;
  projects?: Project[];
  projectTasks?: Task[];
  onRenameProject?: (id: string, name: string) => void;
  onCompleteProject?: (id: string) => void;
  onReopenProject?: (id: string) => void;
  onArchiveProject?: (id: string) => void;
  onRestoreProject?: (id: string) => void;
  onDeleteProject?: (id: string) => void;
  onPurgeProject?: (id: string) => void;
  onUpdateProject?: (id: string, updates: Partial<Project>) => void;
  onChangeProjectOwner?: (id: string, ownerId: string) => void;
  onDeleteOrganization?: () => void;
  onUserUpdated?: (user: UserType) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'general',
  user,
  projects = [],
  projectTasks = [],
  onRenameProject,
  onCompleteProject,
  onReopenProject,
  onArchiveProject,
  onRestoreProject,
  onDeleteProject,
  onPurgeProject,
  onUpdateProject,
  onChangeProjectOwner,
  onDeleteOrganization,
  onUserUpdated
}) => {
  const { activeTab, setActiveTab, navItems, contentProps } = useSettingsModalController({
    isOpen,
    initialTab,
    user,
    projects,
    projectTasks,
    onRenameProject,
    onCompleteProject,
    onReopenProject,
    onArchiveProject,
    onRestoreProject,
    onDeleteProject,
    onPurgeProject,
    onUpdateProject,
    onChangeProjectOwner,
    onDeleteOrganization,
    onUserUpdated,
    onClose
  });

  if (!isOpen || !user) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/45 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white w-full max-w-[60rem] rounded-none md:rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 md:zoom-in-95 duration-200 h-[100dvh] md:h-[80vh] flex flex-col md:flex-row border-0 md:border border-slate-200">
        <button
          onClick={onClose}
          aria-label="Close settings"
          className="absolute right-3 top-3 md:right-4 md:top-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex-shrink-0 flex flex-col">
          <div className="p-3 md:p-4 md:pb-3">
            <h2 className="text-lg md:text-2xl font-black text-slate-900 flex items-center gap-2.5 md:gap-4 tracking-tighter">
              <div className="p-1.5 md:p-2.5 bg-indigo-600 rounded-xl md:rounded-2xl shadow-lg shadow-indigo-200">
                <Settings className="w-4 h-4 md:w-6 md:h-6 text-white" />
              </div>
              Settings
            </h2>
          </div>

          <nav className="p-2.5 md:p-4 space-y-1.5 overflow-x-auto no-scrollbar md:overflow-y-auto md:flex-1">
            <div className="flex md:flex-col gap-2">
              {navItems.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingsTabType)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-xs transition-colors whitespace-nowrap min-w-max md:w-full ${
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                  }`}
                >
                  <span className={activeTab === tab.id ? 'text-indigo-400' : 'text-slate-400'}>{tab.icon}</span>
                  {tab.label}
                  {tab.badge ? (
                    <span className={`ml-auto rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${activeTab === tab.id ? 'bg-white/15 text-white' : 'bg-[#f7edf1] text-[#76003f]'}`}>
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </nav>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto p-3 md:p-6 custom-scrollbar scroll-smooth">
            <SettingsModalContent {...(contentProps as any)} />
          </div>
          <div className="hidden md:flex px-4 py-3 md:px-6 md:py-4 border-t border-slate-200 bg-white flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
            <div className="flex flex-col text-center sm:text-left">
              <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide">Version</p>
              <p className="text-[11px] font-medium text-slate-900 mt-0.5">Velo 1.0.1</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
