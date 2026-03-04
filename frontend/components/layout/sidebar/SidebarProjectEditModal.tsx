import React from 'react';
import { X } from 'lucide-react';
import SidebarProjectEditModalBody from './SidebarProjectEditModalBody';
import { SidebarProjectEditModalProps } from './SidebarProjectEditModal.types';

const SidebarProjectEditModal: React.FC<SidebarProjectEditModalProps> = ({ isOpen, project, onClose, onSave, ...bodyProps }) => {
  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-[210] bg-slate-900/45 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="w-full max-w-2xl rounded-none md:rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden h-[100dvh] md:h-auto md:max-h-[88vh] flex flex-col">
        <div className="h-12 px-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Edit Project</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <SidebarProjectEditModalBody {...bodyProps} />

        <div className="h-14 px-4 border-t border-slate-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700">
            Cancel
          </button>
          <button onClick={onSave} className="h-9 px-3 rounded-lg bg-slate-900 text-white text-sm">
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SidebarProjectEditModal;
