import React from 'react';
import { MessageSquarePlus, Pencil, Trash2 } from 'lucide-react';
import { ChatSession } from '../../services/aiChatHistoryService';
import { formatTime } from './copilotUtils';

interface CopilotSidebarProps {
  sessions: ChatSession[];
  selectedSessionId: string | null;
  editingSessionId: string | null;
  editingTitle: string;
  setEditingTitle: (value: string) => void;
  onNewChat: () => void;
  onExport: () => void;
  onClearAll: () => void;
  onSelectSession: (session: ChatSession) => void;
  onStartRename: (session: ChatSession) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onDeleteSession: (sessionId: string) => void;
}

const CopilotSidebar: React.FC<CopilotSidebarProps> = ({
  sessions,
  selectedSessionId,
  editingSessionId,
  editingTitle,
  setEditingTitle,
  onNewChat,
  onExport,
  onClearAll,
  onSelectSession,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onDeleteSession
}) => {
  return (
    <aside className="w-[232px] border-r border-slate-200 bg-slate-50 flex flex-col">
      <div className="h-12 px-3 border-b border-slate-200 flex items-center justify-between">
        <p className="text-[11px] font-semibold text-slate-700">Copilot Chats</p>
        <button onClick={onNewChat} className="w-7 h-7 rounded-md hover:bg-white flex items-center justify-center text-slate-500" title="New chat">
          <MessageSquarePlus className="w-4 h-4" />
        </button>
      </div>
      <div className="p-2 border-b border-slate-200 flex gap-1.5">
        <button onClick={onExport} className="flex-1 h-8 rounded-md border border-slate-300 bg-white text-[10px] font-medium text-slate-700 hover:bg-slate-50">
          Export
        </button>
        <button onClick={onClearAll} className="flex-1 h-8 rounded-md border border-rose-200 bg-rose-50 text-[10px] font-medium text-rose-700 hover:bg-rose-100">
          Delete all
        </button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
        {sessions.length === 0 ? <p className="text-[10px] text-slate-500 p-2">No chat history yet.</p> : null}
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`w-full text-left rounded-lg border px-2 py-2 transition-colors ${
              selectedSessionId === session.id ? 'border-slate-300 bg-white' : 'border-transparent hover:border-slate-200 hover:bg-white'
            }`}
          >
            {editingSessionId === session.id ? (
              <div className="space-y-1.5">
                <input
                  value={editingTitle}
                  onChange={(event) => setEditingTitle(event.target.value)}
                  className="w-full h-7 rounded-md border border-slate-300 px-2 text-[10px] outline-none"
                />
                <div className="flex gap-1">
                  <button onClick={onSaveRename} className="flex-1 h-6 rounded-md bg-slate-900 text-white text-[9px]">Save</button>
                  <button onClick={onCancelRename} className="flex-1 h-6 rounded-md border border-slate-300 text-[9px]">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <button onClick={() => onSelectSession(session)} className="w-full text-left">
                  <p className="text-[11px] font-medium text-slate-800 truncate">{session.title}</p>
                  <p className="text-[9px] text-slate-500 truncate">{session.contextLabel} • {formatTime(session.updatedAt)}</p>
                </button>
                <div className="mt-1 flex justify-end gap-2">
                  <button onClick={() => onStartRename(session)} className="text-[9px] text-slate-500 hover:text-slate-700 inline-flex items-center gap-1">
                    <Pencil className="w-3 h-3" /> Rename
                  </button>
                  <button onClick={() => onDeleteSession(session.id)} className="text-[9px] text-rose-600 hover:text-rose-700 inline-flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
};

export default CopilotSidebar;
