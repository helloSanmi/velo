import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import { Project, User } from '../../types';
import { projectChatService } from '../../services/projectChatService';
import { realtimeService } from '../../services/realtimeService';

interface ProjectOwnerChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  currentUser: User;
  allUsers: User[];
}

const ProjectOwnerChatModal: React.FC<ProjectOwnerChatModalProps> = ({
  isOpen,
  onClose,
  project,
  currentUser,
  allUsers
}) => {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState(() => projectChatService.getThread(project.orgId, project.id));
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const ownerId = project.createdBy || project.members?.[0];
  const owner = allUsers.find((user) => user.id === ownerId);
  const canChat = projectChatService.canAccessProjectChat(currentUser, project);

  const reload = () => {
    setMessages(projectChatService.getThread(project.orgId, project.id));
    projectChatService.markThreadRead(project.orgId, project.id, currentUser.id);
  };

  useEffect(() => {
    if (!isOpen) return;
    reload();
  }, [isOpen, project.id, currentUser.id]);

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = realtimeService.subscribe((event) => {
      if (event.type !== 'PROJECT_CHAT_UPDATED') return;
      if (event.orgId !== project.orgId) return;
      if (event.payload?.projectId !== project.id) return;
      reload();
    });
    return () => unsubscribe();
  }, [isOpen, project.id, project.orgId, currentUser.id]);

  useEffect(() => {
    if (!isOpen) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const title = useMemo(() => {
    const ownerName = owner?.displayName || 'Project owner';
    return `Chat with ${ownerName}`;
  }, [owner?.displayName]);

  const handleSend = () => {
    if (!canChat) return;
    const sent = projectChatService.sendMessage(currentUser, project, text);
    if (sent) {
      setText('');
      reload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[190] bg-slate-900/45 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="w-full max-w-md h-[100dvh] md:h-[78vh] md:max-h-[760px] bg-white border border-slate-200 rounded-none md:rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="h-12 px-4 border-b border-slate-200 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{title}</p>
            <p className="text-[11px] text-slate-500 truncate">{project.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 p-3 space-y-2 overflow-y-auto custom-scrollbar bg-slate-50">
          {messages.length === 0 ? (
            <div className="h-full min-h-[180px] rounded-lg border border-dashed border-slate-200 bg-white text-sm text-slate-500 flex flex-col items-center justify-center gap-2">
              <MessageSquare className="w-5 h-5 text-slate-400" />
              <p>No messages yet. Start a conversation with the owner.</p>
            </div>
          ) : (
            messages.map((item) => {
              const mine = item.senderId === currentUser.id;
              return (
                <div key={item.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 border ${mine ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-800 border-slate-200'}`}>
                    <p className={`text-[11px] ${mine ? 'text-white/80' : 'text-slate-500'}`}>{item.senderName}</p>
                    <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{item.text}</p>
                    <p className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-slate-400'}`}>
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-slate-200 p-3 bg-white">
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                handleSend();
              }}
              disabled={!canChat}
              placeholder={canChat ? 'Type a message...' : 'You do not have access to this chat'}
              className="flex-1 h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60"
            />
            <button
              onClick={handleSend}
              disabled={!canChat || !text.trim()}
              className="h-10 px-3 rounded-lg bg-slate-900 text-white text-sm inline-flex items-center gap-1.5 disabled:opacity-40 whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden min-[361px]:inline">Send</span>
              <span className="min-[361px]:hidden sr-only">Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectOwnerChatModal;
